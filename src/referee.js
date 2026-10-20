/* ============================================================
   REFEREE
   Owns every rule and number: map, positions, movement, slide,
   aim-down-sights, shooting, hit detection, damage, monster
   behavior, respawns, kill counter.

   No DOM. No 3D library. Plain data in, plain data out, so it
   can be ported to Go later without touching the screen.

   step(dt, input) -> { state, events }
     input:  { mx, mz, lookX, lookY, touchX, touchY, padX, padY,
               fire, ads, sprint, slide, reload }
               (padX / padY: the controller's right stick, -1..1, already past its dead zone)
     state:  everything the screen needs to draw one frame
     events: one-shot things that happened this step
   ============================================================ */
const Referee = (function () {
  'use strict';

  const CELL = 2;       // world units per grid cell
  const WALL_H = 5.5;   // wall height

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const D = typeof RefereeData !== 'undefined' ? RefereeData : require('./referee_data.js');   // monster kinds, skills, wave plan
  const CL = typeof RefereeClass !== 'undefined' ? RefereeClass : require('./referee_class.js');   // the Gunslinger, Assassin and Witch rules
  const SH = typeof RefereeShots !== 'undefined' ? RefereeShots : require('./referee_shots.js');   // monster projectiles
const FG = typeof FloorGen !== 'undefined' ? FloorGen : require('./floorgen.js');              // the floors: rooms and winding corridors from a seed

  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Every tunable number lives here.
  const DEFAULT_CFG = {
    // body
    eyeStand: 1.7,
    eyeSlide: 0.85,
    walkSpeed: 6.2,
    sprintSpeed: 10.0,
    adsSpeedMul: 0.55,
    accel: 60,
    // slide
    slideSpeed: 15,
    slideTime: 0.75,
    slideCooldown: 0.35,
    // camera
    fovBase: 64,
    fovAds: 44,
    sprintFovAdd: 6,
    adsTime: 0.12,
    lookSens: 0.0022,     // radians per mouse pixel
    touchSens: 0.0055,    // radians per touch pixel
    padTurn: 3.4,         // radians per second the right stick turns you at full tilt
    padPitchMul: 0.7,     // looking up and down is slower than turning, so the aim stays easy to hold
    adsLookMul: 0.55,
    // gun
    fireRate: 10,
    damage: 14,
    headMul: 2,
    spread: 0.03,
    spreadAds: 0.004,
    range: 70,
    magSize: 30,
    reloadTime: 2.1,
    reloadEmptyExtra: 0.45,
    recoilKick: 0.012,
    // monsters (base = the horned fiend; every kind multiplies these, see referee_data.js)
    monsterCount: 6,          // how many may be alive in wave 1; one more each wave, up to the cap in referee_data.js
    startWave: 1,
    classId: '',              // '' = no class; the screen picks gunslinger, assassin or witch before a run
    monsterHp: 70,
    monsterSpeed: 3.6,
    monsterDamage: 7,
    monsterAttackRate: 1.0,
    monsterScale: 1.0,
    // player
    playerHp: 100,
    regenDelay: 3,
    regen: 14
  };

  // (hit spheres now live with each monster kind, in referee_data.js)
  const MONSTER_RADIUS = 0.5;

  function create(seed) {
    const seed0 = seed || 1337, rng = makeRng(seed0);
    const cfg = Object.assign({}, DEFAULT_CFG);

    /* ---------- the floor you are on (a new one is generated when you go through the door) ---------- */
    let M0, G, GW, GH, floorNo = 0, mapId = 0, doorOpen = false, floorCells = [], explored = null, exploredCell = -1;
    let flow = null, queue = null, flowCell = -1, flowTimer = 0;
    const solid = (cx, cz) => {
      if (cx < 0 || cz < 0 || cx >= GW || cz >= GH) return true;
      const c = G[cz][cx];
      return c !== '.' && c !== 'c' && c !== 'd';      // 'D' is the locked door, 'd' the same door once it is open
    };
    function loadFloor(n) {
      floorNo = n;
      M0 = FG.generate(n, makeRng((seed0 * 2654435761 + n * 40503) >>> 0));   // its own random stream, so a floor never depends on how the fight went
      M0.WALL_H = WALL_H; M0.id = ++mapId;
      G = M0.rows.map((r) => r.split('')); GW = M0.W; GH = M0.H; doorOpen = false;
      floorCells = [];
      for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) if (!solid(x, z)) floorCells.push([x, z]);
      flow = new Int16Array(GW * GH); queue = new Int16Array(GW * GH); flowCell = -1; flowTimer = 0;
      explored = new Uint8Array(GW * GH); exploredCell = -1;
    }

    function collides(x, z, r) {
      const cx0 = Math.floor((x - r) / CELL), cx1 = Math.floor((x + r) / CELL);
      const cz0 = Math.floor((z - r) / CELL), cz1 = Math.floor((z + r) / CELL);
      for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
        if (!solid(cx, cz)) continue;
        const nx = clamp(x, cx * CELL, (cx + 1) * CELL);
        const nz = clamp(z, cz * CELL, (cz + 1) * CELL);
        const dx = x - nx, dz = z - nz;
        if (dx * dx + dz * dz < r * r) return true;
      }
      return false;
    }
    // Axis-separated move so bodies slide along walls. Returns which axes were blocked.
    function tryMove(o, dx, dz, r) {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.3));
      const sx = dx / n, sz = dz / n;
      let bx = false, bz = false;
      for (let i = 0; i < n; i++) {
        if (sx !== 0) { if (!collides(o.x + sx, o.z, r)) o.x += sx; else bx = true; }
        if (sz !== 0) { if (!collides(o.x, o.z + sz, r)) o.z += sz; else bz = true; }
      }
      return { bx, bz };
    }
    function hasLOS(ax, az, bx, bz) {
      const dx = bx - ax, dz = bz - az;
      const d = Math.hypot(dx, dz);
      const n = Math.ceil(d / 0.4);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        if (solid(Math.floor((ax + dx * t) / CELL), Math.floor((az + dz * t) / CELL))) return false;
      }
      return true;
    }
    function hasWideLOS(ax, az, bx, bz) {
      if (!hasLOS(ax, az, bx, bz)) return false;
      const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz) || 1;
      const px = -dz / d * 0.45, pz = dx / d * 0.45;
      return hasLOS(ax + px, az + pz, bx + px, bz + pz) && hasLOS(ax - px, az - pz, bx - px, bz - pz);
    }

    /* ---------- flow field toward the player ---------- */
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    function buildFlow(px, pz) {
      const pcx = clamp(Math.floor(px / CELL), 0, GW - 1), pcz = clamp(Math.floor(pz / CELL), 0, GH - 1);
      flow.fill(-1);
      let qh = 0, qt = 0;
      flow[pcz * GW + pcx] = 0; queue[qt++] = pcz * GW + pcx;
      while (qh < qt) {
        const cur = queue[qh++], cx = cur % GW, cz = (cur / GW) | 0, cd = flow[cur];
        for (const [ox, oz] of NB) {
          const nx = cx + ox, nz = cz + oz;
          if (solid(nx, nz)) continue;
          if (ox !== 0 && oz !== 0 && (solid(cx + ox, cz) || solid(cx, cz + oz))) continue;
          const ni = nz * GW + nx;
          if (flow[ni] !== -1) continue;
          flow[ni] = cd + 1; queue[qt++] = ni;
        }
      }
      flowCell = pcz * GW + pcx;
    }
    function flowDir(x, z) {
      const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
      let best = flow[cz * GW + cx], bx = -1, bz = -1;
      if (best < 0) return null;
      for (const [ox, oz] of NB) {
        const nx = cx + ox, nz = cz + oz;
        if (solid(nx, nz)) continue;
        if (ox !== 0 && oz !== 0 && (solid(cx + ox, cz) || solid(cx, cz + oz))) continue;
        const v = flow[nz * GW + nx];
        if (v >= 0 && v < best) { best = v; bx = nx; bz = nz; }
      }
      if (bx < 0) return null;
      const tx = (bx + 0.5) * CELL - x, tz = (bz + 0.5) * CELL - z;
      const l = Math.hypot(tx, tz) || 1;
      return [tx / l, tz / l];
    }

    /* ---------------- state ---------------- */
    const L = D.LOOP;
    const floorOf = (w) => Math.floor((w - 1) / L.bossEvery) + 1;   // ten waves to a floor
    const P = {
      x: 0, z: 0, yaw: 0, pitch: 0,                       // set by placePlayer, once the floor exists
      vx: 0, vz: 0, eye: cfg.eyeStand,
      sliding: false, slideT: 0, slideCd: 0, sdx: 0, sdz: 0,
      sprinting: false, sprintK: 0, adsT: 0, kick: 0,
      hp: cfg.playerHp, hurt: 0, sinceHit: 0, invuln: 0, fireCd: 0,
      ammo: cfg.magSize, reloading: false, reloadT: 0, reloadDur: 0, reloadEmpty: false
    };
    let monsters = [], orbs = [], pickups = [], spawnQ = [];
    let nextId = 1, kills = 0, deaths = 0, time = 0, spawnTimer = 0.4, events = [];

    /* ---------------- the run: waves, xp, level-ups, skills ---------------- */
    const R = {};      // wave, phase ('intermission' | 'fight'), timer, level, xp, stacks, choices, frenzy, over
    let M = null;      // the skill bonuses, worked out from the stacks
    const skillOf = (id) => D.SKILLS.find((s) => s.id === id);
    const stackOf = (id) => R.stacks[id] || 0;
    function computeMods() {
      const per = (id) => skillOf(id).per * stackOf(id);
      return {
        dmg: 1 + per('dmg'), rate: 1 + per('rate'), speed: 1 + per('speed'), multi: per('multi'), hp: per('hp'), steal: per('steal'),
        reloadMul: Math.max(0.25, 1 - per('reload')), blast: per('blast'), magnet: 1 + per('magnet'), regen: per('regen'), mag: per('mag')
      };
    }
    const maxHp = () => cfg.playerHp + M.hp;
    const maxMag = () => cfg.magSize + M.mag;

    function newRun() {
      R.wave = cfg.startWave; R.phase = 'intermission'; R.timer = L.firstDelay; R.level = 1; R.xp = 0;
      R.stacks = {}; R.choices = null; R.classChoices = null; R.pending = 0; R.frenzy = 0; R.over = null; R.time = 0; R.hold = null;
      kit.reset(cfg.classId);
      grantStartKit();
      M = computeMods();
    }
    // starting a run on a later wave (the #wave=N test link) hands out the upgrades you would have earned, picked at random, so you are not too weak
    function grantStartKit() {
      const n = Math.floor((cfg.startWave - 1) * L.kitPerWave);
      for (let i = 0; i < n; i++) {
        const open = D.SKILLS.filter((s) => stackOf(s.id) < s.max); if (!open.length) break;
        const s = open[Math.floor(rng() * open.length)]; R.stacks[s.id] = stackOf(s.id) + 1;
      }
      R.level = 1 + n;
      kit.grantKit(n, R.level);
    }
    function placePlayer() {
      P.x = M0.start.x; P.z = M0.start.z; P.yaw = M0.start.yaw; P.pitch = 0;
      P.vx = P.vz = 0; P.sliding = false; P.slideT = 0; P.kick = 0;
      P.hp = maxHp(); P.invuln = 1.5; P.hurt = 0; P.sinceHit = 0;
      P.ammo = maxMag(); P.reloading = false; P.reloadT = 0; P.fireCd = 0;
      if (explored) reveal(P);
    }
    function restartRun() {
      kills = 0; monsters = []; orbs = []; pickups = []; spawnQ = []; spawnTimer = 0.4; mshots.clear();
      newRun(); loadFloor(floorOf(R.wave)); placePlayer();
      events.push({ type: 'restart' });
    }
    function startWave() {
      spawnQ = D.waveKinds(R.wave, rng);
      R.phase = 'fight'; spawnTimer = 0.2;
      events.push({ type: 'waveStart', n: R.wave, boss: spawnQ.some((k) => D.KINDS[k].boss), count: spawnQ.length });
    }
    function endWave() {
      events.push({ type: 'waveClear', n: R.wave });
      const a = P.yaw, hx = P.x + Math.sin(a) * 2, hz = P.z - Math.cos(a) * 2;
      pickups.push({ id: nextId++, kind: 'heal', x: collides(hx, hz, 0.3) ? P.x : hx, z: collides(hx, hz, 0.3) ? P.z : hz, life: L.pickupLife });
      R.wave++; R.phase = 'intermission'; R.timer = L.intermission;
    }
    const aliveMax = () => Math.min(L.aliveCap, cfg.monsterCount + R.wave - 1);
    let forceElite = false;
    const overCap = () => Math.max(0, cfg.monsterCount + R.wave - 1 - L.aliveCap);     // how many waves past the point where the screen is full

    function gainXp(v) {
      R.xp += v;
      while (R.xp >= D.xpNeed(R.level)) { R.xp -= D.xpNeed(R.level); R.level++; R.pending++; events.push({ type: 'levelUp', level: R.level }); }
      if (!R.choices && !R.classChoices && R.pending > 0) rollChoices();
    }
    function rollChoices() {
      const open = D.SKILLS.filter((s) => stackOf(s.id) < s.max);
      R.pending--;
      R.classChoices = kit.choices(R.level);                // a class skill row comes with every level-up
      if (!open.length) { if (!R.classChoices) { P.hp = Math.min(maxHp(), P.hp + 25); if (R.pending > 0) rollChoices(); } return; }
      for (let i = open.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = open[i]; open[i] = open[j]; open[j] = t; }
      R.choices = open.slice(0, 3).map((s) => s.id);
    }
    function pickSkill(i) {
      const id = R.choices && R.choices[i];
      if (!id) return;
      R.stacks[id] = stackOf(id) + 1;
      M = computeMods();
      if (id === 'hp') P.hp = Math.min(maxHp(), P.hp + skillOf('hp').per);
      events.push({ type: 'skill', id });
      R.choices = null;
      if (!R.classChoices && R.pending > 0) rollChoices();
    }
    function pickClass(i) {
      const id = R.classChoices && R.classChoices[i];
      if (!id) return;
      kit.pick(id);
      R.classChoices = null;
      if (!R.choices && R.pending > 0) rollChoices();
    }

    /* ---------------- monsters: stats, spawning, loot ---------------- */
    function statsFor(kind, wave) {
      const k = D.KINDS[kind], w = wave - 1;
      return {
        hp: cfg.monsterHp * k.hpMul * (1 + L.hpPerWave * w) * (1 + L.capHp * overCap()),
        dmg: cfg.monsterDamage * k.dmgMul * (1 + L.dmgPerWave * w) * (1 + L.capDmg * overCap()),
        spd: cfg.monsterSpeed * k.speedMul * Math.min(L.speedMax, 1 + L.speedPerWave * w)
      };
    }
    function angleDiff(a, b) {
      let d = a - b;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }
    function spawnMonster(kind) {
      const k = D.KINDS[kind];
      let best = null, bestScore = -1;
      if (k.boss) {                                         // the boss spawns at the door and guards it
        const d = M0.door;
        best = [d.x + d.nx * 3.2, d.z + d.nz * 3.2];
      } else {
        // on a big floor monsters appear a walk away from you (not across the whole map): cells whose path to you is 8 to 26 cells long, out of sight if possible
        for (let i = 0; i < 70; i++) {
          const c = floorCells[(rng() * floorCells.length) | 0], fd = flow[c[1] * GW + c[0]];
          if (fd < L.spawnPathMin || fd > L.spawnPathMax) continue;
          const x = (c[0] + 0.3 + rng() * 0.4) * CELL, z = (c[1] + 0.3 + rng() * 0.4) * CELL;
          const d = Math.hypot(x - P.x, z - P.z);
          if (d < 10) continue;
          const seen = hasLOS(x, z, P.x, P.z);
          const score = (seen ? 0 : 100) + Math.min(d, 40);
          if (score > bestScore) { bestScore = score; best = [x, z]; }
          if (!seen && d > 14) break;
        }
      }
      if (!best) return false;
      addMonster(kind, best[0], best[1]);
      return true;
    }
    // elites only appear once the waves are past the cap; no random is used before that, so early runs play out exactly as before
    function rollElite() {
      const over = overCap(); if (over <= 0 && !forceElite) return [];
      if (!forceElite && rng() >= Math.min(L.eliteMax, L.eliteBase + L.elitePer * over)) return [];
      const open = D.AFFIXES.filter((a) => over >= a.from), n = Math.min(L.eliteAffixMax, open.length, 1 + Math.floor(over / L.eliteAffixEvery)), pool = open.slice(), got = [];
      while (got.length < n) got.push(pool.splice((rng() * pool.length) | 0, 1)[0]);
      return got;
    }
    function addMonster(kind, x, z) {
      const k = D.KINDS[kind];
      const sv = k.boss ? 1 : 0.92 + rng() * 0.18, st = statsFor(kind, R.wave), elite = k.boss ? [] : rollElite();
      if (elite.length) { st.hp *= L.eliteHp; for (const a of elite) { st.hp *= a.hp || 1; st.dmg *= a.dmg || 1; st.spd *= a.speed || 1; } }
      monsters.push({
        id: nextId++, kind, x, z, hp: st.hp, maxHp: st.hp, dmg: st.dmg, spd0: st.spd,
        elite: elite.map((a) => a.id), sv, scale: cfg.monsterScale * sv * k.size * (elite.length ? L.eliteScale : 1), spd: 0.85 + rng() * 0.3, yaw: k.guard ? Math.atan2(M0.door.nx, -M0.door.nz) : 0, yawT: k.guard ? Math.atan2(M0.door.nx, -M0.door.nz) : 0, phase: rng() * 6, atk: k.wind || 0.4, shT: 0.8 + rng() * 1.6, shW: 0,
        flash: 0, stun: 0, state: k.guard ? 'guard' : 'chase', chT: k.charge ? 1.5 : 0, wT: 0, cT: 0, cdx: 0, cdz: 0, summoned: false
      });
      events.push({ type: 'spawn', kind, boss: !!k.boss });
    }
    function dropLoot(m, k) {
      orbs.push({ id: nextId++, x: m.x, z: m.z, v: k.xp, life: L.orbLife });
      if (orbs.length > 80) { gainXp(orbs.shift().v); }
      const r = rng();
      if (k.boss || r < L.healChance) pickups.push({ id: nextId++, kind: 'heal', x: m.x, z: m.z, life: L.pickupLife });
      else if (r < L.healChance + L.frenzyChance) pickups.push({ id: nextId++, kind: 'frenzy', x: m.x, z: m.z, life: L.pickupLife });
    }
    function killMonster(m) {
      const k = D.KINDS[m.kind];
      kills++; kit.onKill(m);
      events.push({ type: 'kill', id: m.id, kind: m.kind, boss: !!k.boss, x: m.x, z: m.z, scale: m.scale, yaw: m.yaw });
      dropLoot(m, k);
      if (m.elite.length) {
        for (let i = 1; i < L.eliteXp; i++) orbs.push({ id: nextId++, x: m.x + (rng() - 0.5), z: m.z + (rng() - 0.5), v: k.xp, life: L.orbLife });
        if (m.elite.includes('volatile')) {                                 // a volatile elite blows up when it dies
          events.push({ type: 'eliteBlast', x: m.x, z: m.z, r: L.volatileRadius });
          if (Math.hypot(P.x - m.x, P.z - m.z) < L.volatileRadius) hurtPlayer(m.dmg * L.volatileDmg, m.id);
        }
      }
      monsters = monsters.filter((o) => o !== m);
      if (k.boss) openDoor();
    }
    // the boss is down: the door he guarded opens right there, and the next wave waits until you step through
    function openDoor() {
      for (const [x, z] of M0.door.cells) G[z][x] = 'd';
      doorOpen = true; R.hold = 'door'; flowCell = -1;
      events.push({ type: 'doorOpen', x: M0.door.x, z: M0.door.z });
    }
    // through the door: a new, bigger floor; what you carry (health, ammo, level, skills) comes with you
    function nextFloor() {
      for (const o of orbs) gainXp(o.v);
      monsters = []; orbs = []; pickups = []; spawnQ = []; mshots.clear();
      loadFloor(floorNo + 1);
      P.x = M0.start.x; P.z = M0.start.z; P.yaw = M0.start.yaw; P.vx = P.vz = 0; P.sliding = false; P.slideT = 0; P.invuln = 1.5;
      R.hold = null; R.phase = 'intermission'; R.timer = L.intermission; spawnTimer = 0.4;
      reveal(P);
      events.push({ type: 'floorChange', floor: floorNo });
    }
    function damageMonster(m, dmg, crit, x, y, z, splash, quiet) {
      if (m.hp <= 0) return;
      dmg *= kit.takenMul(m);                               // a hexed monster takes extra
      m.hp -= dmg;
      if (!quiet) { m.flash = 0.12; if (!splash) m.stun = 0.08; events.push({ type: 'hit', id: m.id, dmg: Math.round(dmg), crit, x, y, z, splash: !!splash }); }
      if (M.steal > 0) P.hp = Math.min(maxHp(), P.hp + dmg * M.steal);
      if (m.hp <= 0) killMonster(m);
    }

    function hurtPlayer(d, id) {
      if (P.invuln > 0 || R.over || P.sliding) return;   // a slide is untouchable from start to finish
      P.hp -= d; P.hurt = 0.3; P.sinceHit = 0;
      events.push({ type: 'playerHit', dmg: d, id });
      if (P.hp <= 0) {
        P.hp = 0; deaths++;
        R.over = { wave: R.wave, kills, level: R.level, time: R.time };
        events.push({ type: 'dead' });
      }
    }

    const mshots = SH.create({
      nextId: () => nextId++, solidAt: (x, z) => solid(Math.floor(x / CELL), Math.floor(z / CELL)),
      player: () => ({ x: P.x, z: P.z, eye: P.eye, sliding: P.sliding }), hurt: (d, id) => hurtPlayer(d, id), event: (e) => events.push(e)
    });

    const kit = CL.create({
      rng, P, monsters: () => monsters, damage: (m, d, c, x, y, z, sp, q) => damageMonster(m, d, c, x, y, z, sp, q),
      heal: (v) => { P.hp = Math.min(maxHp(), P.hp + v); }, maxHp: () => maxHp(), baseDmg: () => cfg.damage * M.dmg, isBoss: (m) => !!D.KINDS[m.kind].boss,
      event: (e) => events.push(e), tryMove: (o, dx, dz, r) => tryMove(o, dx, dz, r), nextId: () => nextId++
    });

    /* ---------------- reload ---------------- */
    function startReload() {
      if (P.reloading || P.ammo >= maxMag()) return;
      P.reloading = true; P.reloadT = 0; P.reloadEmpty = P.ammo <= 0;
      P.reloadDur = (cfg.reloadTime + (P.reloadEmpty ? cfg.reloadEmptyExtra : 0)) * M.reloadMul * kit.reloadMul(); kit.onReload();
      events.push({ type: 'reloadStart', dur: P.reloadDur, empty: P.reloadEmpty });
    }

    /* ---------------- shooting ---------------- */
    function castWall(ox, oy, oz, dx, dy, dz, maxT) {
      const stepLen = 0.12;
      for (let t = stepLen; t < maxT; t += stepLen) {
        const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
        if (y < 0 || y > WALL_H || solid(Math.floor(x / CELL), Math.floor(z / CELL))) return t;
      }
      return maxT;
    }
    function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
      const lx = cx - ox, ly = cy - oy, lz = cz - oz;
      const tca = lx * dx + ly * dy + lz * dz;
      if (tca < 0) return -1;
      const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
      if (d2 > r * r) return -1;
      return tca - Math.sqrt(r * r - d2);
    }

    function shoot() {
      const pe = clamp(P.pitch + P.kick, -1.5, 1.5);
      const speed = Math.hypot(P.vx, P.vz);
      let s0 = lerp(cfg.spread, cfg.spreadAds, P.adsT) * (1 + speed / cfg.walkSpeed * 0.5);
      if (P.sliding) s0 *= 0.8;
      const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), sp = Math.sin(pe), cp = Math.cos(pe);
      const fx = sy * cp, fy = sp, fz = -cy * cp;
      const rx = cy, rz = sy;                              // right
      const ux = -sy * sp, uy = cp, uz = cy * sp;          // up
      const ex = P.x, ey = P.eye, ez = P.z;
      const vol = kit.beginShot(), bullets = 1 + M.multi + vol.extra, dmgOne = cfg.damage * M.dmg * (R.frenzy > 0 ? L.frenzyDmg : 1);
      for (let b = 0; b < bullets; b++) {
        const s = s0 + (b > 0 ? 0.02 : 0);
        const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * s;
        const ox = Math.cos(a) * rr, oy = Math.sin(a) * rr;
        let dx = fx + rx * ox + ux * oy, dy = fy + uy * oy, dz = fz + rz * ox + uz * oy;
        const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;

        const wallT = castWall(ex, ey, ez, dx, dy, dz, cfg.range);
        let bestT = wallT, bestM = null, bestHead = false;
        for (const m of monsters) {
          const k = D.KINDS[m.kind], sc = m.scale, mfx = Math.sin(m.yaw), mfz = -Math.cos(m.yaw);
          for (const sph of k.spheres) {
            const t = raySphere(ex, ey, ez, dx, dy, dz, m.x + mfx * sph.f * sc, sph.y * sc, m.z + mfz * sph.f * sc, sph.r * sc);
            if (t >= 0 && t < bestT) { bestT = t; bestM = m; bestHead = !!sph.head; }
          }
        }
        const endx = ex + dx * bestT, endy = ey + dy * bestT, endz = ez + dz * bestT;
        events.push({
          type: 'shot', extra: b > 0, ox: ex, oy: ey, oz: ez, dx, dy, dz, t: bestT,
          ex: endx, ey: endy, ez: endz, hit: bestM ? 'monster' : (bestT >= cfg.range - 0.2 ? 'none' : 'wall')
        });
        if (bestM) {
          const crit = kit.rollCrit(vol.force); if (crit) events.push({ type: 'crit' });
          const dmg = dmgOne * (bestHead ? cfg.headMul : 1) * (crit ? kit.critMul() : 1);
          damageMonster(bestM, dmg, bestHead || crit, endx, endy, endz, false);
          kit.onHit(bestM, dmg, crit, endx, endy, endz);
          if (M.blast > 0) {
            events.push({ type: 'blast', x: endx, y: endy, z: endz, r: L.blastRadius });
            for (const o of monsters.slice()) if (o !== bestM && Math.hypot(o.x - endx, o.z - endz) < L.blastRadius + 0.5 * o.scale) damageMonster(o, dmg * M.blast, false, o.x, 1.2 * o.scale, o.z, true);
          }
        }
      }
      P.kick += cfg.recoilKick;
      if (!kit.mods().freeAmmo) P.ammo--;
      if (P.ammo <= 0) startReload();
    }

    /* ---------------- monster behaviour ---------------- */
    // a ranged attacker (mushroom, eyeball, flame spirit, and the Demon Lord's fireball). Returns true when it is busy shooting, so the melee and chase code is skipped.
    // It keeps its distance (backs off when you are inside `keep`), stops while it has a clear shot, rears back for `wind` seconds, then throws; the throw is aimed where you stand
    // at that moment, so moving or sliding dodges it.
    function shooterStep(m, k, dt, dist, dx, dz) {
      const S = k.shoot;
      m.shMx = m.shMz = 0;
      if (m.state === 'cast') {
        m.shW -= dt; m.yawT = Math.atan2(dx, -dz);
        if (m.shW <= 0) {
          const sc = m.scale, ux = dx / (dist || 1), uz = dz / (dist || 1);
          mshots.fire({ proj: S.proj, owner: m.id, x: m.x + ux * 0.6 * sc, y: S.y * sc, z: m.z + uz * 0.6 * sc, tx: P.x, tz: P.z, ty: P.eye - 0.35, speed: S.speed, r: S.r * Math.max(1, sc * 0.8), dmg: m.dmg * S.dmg });
          events.push({ type: 'shoot', proj: S.proj, id: m.id, x: m.x, z: m.z });
          m.state = 'chase'; m.shT = S.cd * (0.8 + rng() * 0.4);
        }
        return true;
      }
      m.shT -= dt;
      const clear = dist < S.range && dist > (S.min || 0) && hasLOS(m.x, m.z, P.x, P.z);
      if (!clear) return false;
      if (m.shT <= 0) { m.state = 'cast'; m.shW = S.wind; return true; }
      if (S.keep && dist < S.keep) {                      // too close: back away while it waits to throw again
        const sp = m.spd0 * m.spd * 0.6; m.shMx = -dx / dist * sp; m.shMz = -dz / dist * sp; m.state = 'chase'; m.yawT = Math.atan2(dx, -dz);
        return true;
      }
      if (S.keep && dist < S.range) { m.state = 'chase'; m.yawT = Math.atan2(dx, -dz); return true; }   // in range with a clear shot: hold still and wait for the throw
      return false;
    }
    function updateMonster(m, dt) {
      const k = D.KINDS[m.kind], sc = m.scale;
      m.flash = Math.max(0, m.flash - dt);
      m.stun = Math.max(0, m.stun - dt);
      const dx = P.x - m.x, dz = P.z - m.z;
      const dist = Math.hypot(dx, dz) || 0.0001;
      const reach = L.meleeReachMul * sc + L.meleeReachAdd;
      let mvx = 0, mvz = 0;
      const was = m.state;
      if (m.state === 'guard') {                          // asleep on his feet at the door until you come into sight or hurt him
        if (m.hp < m.maxHp || (dist < k.guard.wake && hasLOS(m.x, m.z, P.x, P.z))) { m.state = 'chase'; m.shT = 0.4; events.push({ type: 'bossWake' }); }   // he opens the fight with a fireball
        else { m.yaw += clamp(angleDiff(m.yawT, m.yaw), -dt * 9, dt * 9); return; }
      }
      if (k.summonAt && !m.summoned && m.hp <= m.maxHp * k.summonAt) {
        m.summoned = true;
        for (let i = 0; i < k.summonN; i++) spawnQ.unshift(k.summonKind);
        spawnTimer = 0;
        events.push({ type: 'bossSummon', x: m.x, z: m.z });
      }
      if (k.charge) m.chT -= dt;
      if (m.state === 'windup') {                         // the boss rears back where it stands, then lunges
        m.wT -= dt; m.yawT = Math.atan2(dx, -dz);
        if (m.wT <= 0) { m.state = 'charge'; m.cT = k.charge.dur; m.cdx = dx / dist; m.cdz = dz / dist; }
      } else if (m.state === 'charge') {
        m.cT -= dt;
        const sp = m.spd0 * m.spd * k.charge.mult;
        mvx = m.cdx * sp; mvz = m.cdz * sp; m.yawT = Math.atan2(m.cdx, -m.cdz);
        if (dist < reach) { hurtPlayer(m.dmg * k.charge.hit, m.id); m.cT = 0; }
        if (m.cT <= 0) { m.state = 'chase'; m.chT = k.charge.every; }
      } else if (k.charge && m.state !== 'cast' && m.chT <= 0 && dist > 3.5 && dist < 22 && hasLOS(m.x, m.z, P.x, P.z)) {
        m.state = 'windup'; m.wT = k.charge.windup;
      } else if (kit.cloaked() && !k.boss && m.state !== 'cast' && m.state !== 'attack') {
        m.state = 'lost'; m.yawT = m.yaw + Math.sin(time * 1.3 + m.phase) * 0.9;     // an Assassin's cloak: it cannot see you, so it stops and looks around
      } else if (k.shoot && shooterStep(m, k, dt, dist, dx, dz)) {
        // a ranged attacker: it stopped, or is stepping back, or is rearing back to throw (see shooterStep)
        mvx = m.shMx; mvz = m.shMz;
      } else {
        m.state = dist < (was === 'attack' ? reach * 1.2 : reach) ? 'attack' : 'chase';   // a little give, so a monster pushed by its friends keeps swinging
        if (m.state === 'attack') {
          if (was !== 'attack') m.atk = k.wind;                                          // the blow lands this long after it reaches you, no longer
          m.atk -= dt;
          if (m.atk <= 0) { m.atk = 1 / (cfg.monsterAttackRate * k.rate); if (dist < reach * 1.25) hurtPlayer(m.dmg, m.id); }   // you can still step out of reach in the wind-up
          m.yawT = Math.atan2(dx, -dz);
        } else {
          let dirx, dirz;
          const los = hasWideLOS(m.x, m.z, P.x, P.z);
          if (los) { dirx = dx / dist; dirz = dz / dist; }
          else {
            const d = flowDir(m.x, m.z);
            if (d) { dirx = d[0]; dirz = d[1]; } else { dirx = dx / dist; dirz = dz / dist; }
          }
          const sp = m.spd0 * m.spd * (m.stun > 0 ? 0.25 : 1);
          mvx = dirx * sp; mvz = dirz * sp;
          m.yawT = los ? Math.atan2(dx, -dz) : Math.atan2(dirx, -dirz);
        }
      }
      let sx = 0, sz = 0;
      const minD = MONSTER_RADIUS * 2 * Math.max(0.8, sc);
      for (const o of monsters) {
        if (o === m) continue;
        const ox = m.x - o.x, oz = m.z - o.z, dd = Math.hypot(ox, oz);
        if (dd > 0.001 && dd < minD) { const kk = (minD - dd) * 5 / dd; sx += ox * kk; sz += oz * kk; }
      }
      const mv = tryMove(m, (mvx + sx) * dt, (mvz + sz) * dt, MONSTER_RADIUS * Math.min(Math.max(sc, 0.8), 1.4));
      if (m.state === 'charge' && (mv.bx || mv.bz)) { m.cT = 0; m.state = 'chase'; m.chT = k.charge.every; }
      m.yaw += clamp(angleDiff(m.yawT, m.yaw), -dt * 9, dt * 9);
      m.phase += Math.hypot(mvx, mvz) * dt * 2.4 / Math.max(0.7, sc * 0.8);
    }

    /* ---------------- orbs and pickups ---------------- */
    function updateLoot(dt) {
      const reachMag = L.orbMagnet * M.magnet;
      for (const o of orbs) {
        o.life -= dt;
        const dx = P.x - o.x, dz = P.z - o.z, d = Math.hypot(dx, dz) || 0.001;
        if (d < reachMag) { const sp = (6 + (1 - d / reachMag) * 14) * dt; o.x += dx / d * Math.min(sp, d); o.z += dz / d * Math.min(sp, d); }
        if (d < L.orbPickup) { o.life = -1; events.push({ type: 'orb', v: o.v }); gainXp(o.v); }
      }
      orbs = orbs.filter((o) => o.life > 0);
      const reachPick = L.pickupRadius * (1 + (M.magnet - 1) * 0.5);
      for (const p of pickups) {
        p.life -= dt;
        if (Math.hypot(P.x - p.x, P.z - p.z) < reachPick) {
          p.life = -1;
          if (p.kind === 'heal') P.hp = Math.min(maxHp(), P.hp + L.healAmount); else R.frenzy = L.frenzyTime;
          events.push({ type: 'pickup', kind: p.kind });
        }
      }
      pickups = pickups.filter((p) => p.life > 0);
    }

    // what you have seen of this floor, for the minimap: every cell in line of sight within a few cells of you
    function reveal(p) {
      const pcx = clamp(Math.floor(p.x / CELL), 0, GW - 1), pcz = clamp(Math.floor(p.z / CELL), 0, GH - 1), pc = pcz * GW + pcx;
      if (pc === exploredCell) return;
      exploredCell = pc;
      const r = L.exploreRadius;
      for (let z = Math.max(0, pcz - r); z <= Math.min(GH - 1, pcz + r); z++) for (let x = Math.max(0, pcx - r); x <= Math.min(GW - 1, pcx + r); x++) {
        if (explored[z * GW + x] || (x - pcx) * (x - pcx) + (z - pcz) * (z - pcz) > r * r) continue;
        if (hasLOS(p.x, p.z, (x + 0.5) * CELL, (z + 0.5) * CELL)) explored[z * GW + x] = 1;
      }
    }

    /* ---------------- step ---------------- */
    function step(dt, inp) {
      dt = Math.min(Math.max(dt, 0), 0.05);
      events = [];
      inp = inp || {};
      const p = P;
      if (R.over) { if (inp.restart) restartRun(); return { state: snapshot(), events }; }
      if (R.choices || R.classChoices) {                 // the level-up pause: nothing moves until a skill (and a class skill) is picked
        if (Number.isInteger(inp.pick)) pickSkill(inp.pick);
        if (Number.isInteger(inp.pickClass)) pickClass(inp.pickClass);
        return { state: snapshot(), events };
      }
      time += dt; R.time += dt;
      R.frenzy = Math.max(0, R.frenzy - dt);

      // look
      const lookMul = 1 - p.adsT * (1 - cfg.adsLookMul);
      const padX = clamp(inp.padX || 0, -1, 1), padY = clamp(inp.padY || 0, -1, 1);
      p.yaw += ((inp.lookX || 0) * cfg.lookSens + (inp.touchX || 0) * cfg.touchSens + padX * cfg.padTurn * dt) * lookMul;
      p.pitch = clamp(p.pitch - ((inp.lookY || 0) * cfg.lookSens + (inp.touchY || 0) * cfg.touchSens + padY * cfg.padTurn * cfg.padPitchMul * dt) * lookMul, -1.45, 1.45);

      // move
      const fx = Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = Math.sin(p.yaw);
      let mx = clamp(inp.mx || 0, -1, 1), mz = clamp(inp.mz || 0, -1, 1);
      const mag = Math.hypot(mx, mz);
      if (mag > 1) { mx /= mag; mz /= mag; }
      const wx = rx * mx + fx * mz, wz = rz * mx + fz * mz;
      const ads = !!inp.ads && !p.reloading;   // aiming drops while reloading
      p.sprinting = !!inp.sprint && mz > 0.25 && !ads && !p.sliding;
      const CM = kit.mods();                                       // the class bonuses (and a running ultimate)
      let top = (p.sprinting ? cfg.sprintSpeed : cfg.walkSpeed) * M.speed * CM.speed;
      if (ads) top *= cfg.adsSpeedMul;

      p.slideCd -= dt;
      if (inp.slide && !p.sliding && p.slideCd <= 0) {
        const sp = Math.hypot(p.vx, p.vz);
        if (sp > cfg.walkSpeed * 0.5) {
          p.sliding = true; p.slideT = cfg.slideTime;
          p.sdx = p.vx / sp; p.sdz = p.vz / sp;
          p.slideCd = cfg.slideTime + cfg.slideCooldown;
          events.push({ type: 'slide' }); kit.slideStart();
        }
      }
      if (p.sliding) {
        p.slideT -= dt;
        const k = Math.max(p.slideT, 0) / cfg.slideTime;
        const sp = cfg.slideSpeed * (0.25 + 0.75 * k);
        p.vx = p.sdx * sp; p.vz = p.sdz * sp;
        if (p.slideT <= 0) p.sliding = false;
      } else {
        const tvx = wx * top, tvz = wz * top;
        const dvx = tvx - p.vx, dvz = tvz - p.vz, dl = Math.hypot(dvx, dvz), md = cfg.accel * dt;
        if (dl <= md) { p.vx = tvx; p.vz = tvz; } else { p.vx += dvx / dl * md; p.vz += dvz / dl * md; }
      }
      const mv = tryMove(p, p.vx * dt, p.vz * dt, 0.4);
      if (mv.bx) p.vx = 0;
      if (mv.bz) p.vz = 0;
      if (p.sliding && (mv.bx || mv.bz)) p.slideT = Math.min(p.slideT, 0.05);

      p.eye += ((p.sliding ? cfg.eyeSlide : cfg.eyeStand) - p.eye) * Math.min(1, dt * 16);
      const ar = dt / cfg.adsTime;
      p.adsT += clamp((ads ? 1 : 0) - p.adsT, -ar, ar);
      p.sprintK += ((p.sprinting ? 1 : 0) - p.sprintK) * Math.min(1, dt * 7);
      p.kick -= p.kick * Math.min(1, dt * 9);
      p.invuln = Math.max(0, p.invuln - dt);
      p.hurt = Math.max(0, p.hurt - dt);
      p.sinceHit += dt;
      if (p.sinceHit > cfg.regenDelay && p.hp < maxHp()) p.hp = Math.min(maxHp(), p.hp + (cfg.regen + M.regen) * dt);

      // reload, then fire
      if (p.ammo > maxMag()) p.ammo = maxMag();
      if (inp.reload) startReload();
      if (p.reloading) {
        p.reloadT += dt;
        if (p.reloadT >= p.reloadDur) { p.reloading = false; p.ammo = maxMag(); events.push({ type: 'reloadEnd' }); }
      }
      p.fireCd -= dt;
      if (p.fireCd < 0 && !inp.fire) p.fireCd = 0;
      const interval = 1 / (cfg.fireRate * M.rate * CM.rate * (R.frenzy > 0 ? L.frenzyRate : 1));
      let shots = 0;
      if (inp.fire && !p.reloading && p.ammo <= 0) startReload();
      while (inp.fire && !p.reloading && p.ammo > 0 && p.fireCd <= 0 && shots < 3) { shoot(); p.fireCd += interval; shots++; }

      // monsters, waves, loot
      flowTimer -= dt;
      const pc = clamp(Math.floor(p.z / CELL), 0, GH - 1) * GW + clamp(Math.floor(p.x / CELL), 0, GW - 1);
      if (pc !== flowCell || flowTimer <= 0) { buildFlow(p.x, p.z); flowTimer = 0.4; }
      for (const m of monsters.slice()) if (!R.over) updateMonster(m, dt);
      mshots.update(dt); kit.update(dt);
      if (R.phase === 'fight') {
        spawnTimer -= dt;
        if (spawnTimer <= 0 && spawnQ.length && monsters.length < aliveMax()) {
          const heavyN = monsters.filter((m) => D.KINDS[m.kind].heavy).length;
          const shootN = monsters.filter((m) => D.KINDS[m.kind].shoot && !D.KINDS[m.kind].boss).length;
          const i = spawnQ.findIndex((kd) => (!D.KINDS[kd].heavy || D.KINDS[kd].boss || heavyN < L.heavyCap) && (!D.KINDS[kd].shoot || D.KINDS[kd].boss || shootN < L.shooterCap));
          if (i >= 0 && spawnMonster(spawnQ[i])) { spawnQ.splice(i, 1); spawnTimer = L.spawnGap; } else spawnTimer = 0.3;
        }
        if (!spawnQ.length && !monsters.length) endWave();
      } else if (R.hold === 'door') {                     // the boss is down and the door is open: the next wave waits until you step through
        if (G[clamp(Math.floor(p.z / CELL), 0, GH - 1)][clamp(Math.floor(p.x / CELL), 0, GW - 1)] === 'd') nextFloor();
      } else {
        R.timer -= dt;
        if (R.timer <= 0) startWave();
      }
      updateLoot(dt);
      reveal(p);

      return { state: snapshot(), events };
    }

    function snapshot() {
      const p = P;
      const ease = p.adsT * p.adsT * (3 - 2 * p.adsT);
      const boss = monsters.find((m) => D.KINDS[m.kind].boss);
      return {
        t: time, kills, deaths,
        player: {
          x: p.x, z: p.z, yaw: p.yaw, pitch: clamp(p.pitch + p.kick, -1.5, 1.5), eye: p.eye,
          fov: lerp(cfg.fovBase, cfg.fovAds, ease) + cfg.sprintFovAdd * p.sprintK,
          adsT: p.adsT, sprintK: p.sprintK, sprinting: p.sprinting, sliding: p.sliding,
          slideK: p.sliding ? p.slideT / cfg.slideTime : 0,
          vx: p.vx, vz: p.vz, speed: Math.hypot(p.vx, p.vz),
          hp: p.hp, maxHp: maxHp(), hurt: p.hurt, kick: p.kick,
          ammo: p.ammo, magSize: maxMag(), reloading: p.reloading,
          reloadK: p.reloading ? clamp(p.reloadT / p.reloadDur, 0, 1) : 0,
          reloadEmpty: p.reloadEmpty, reloadDur: p.reloadDur
        },
        monsters: monsters.map((m) => ({
          id: m.id, kind: m.kind, x: m.x, z: m.z, yaw: m.yaw, hp: m.hp, maxHp: m.maxHp,
          flash: m.flash, state: m.state, phase: m.phase, scale: m.scale, elite: m.elite,
          poisoned: !!(m.fx && m.fx.poison), bleeding: !!(m.fx && m.fx.bleed), cursed: !!(m.fx && m.fx.hexT > 0),
          atkK: m.state === 'attack' ? clamp(1 - m.atk / D.KINDS[m.kind].wind, 0, 1) : 0,              // 0 to 1 as a melee blow winds up; resets when it lands (the screen raises the weapon with it)
          castK: m.state === 'cast' ? clamp(1 - m.shW / D.KINDS[m.kind].shoot.wind, 0, 1) : 0           // the same for a ranged monster rearing back to throw
        })),
        floor: floorNo, floorId: M0.id,
        door: { x: M0.door.x, z: M0.door.z, open: doorOpen },
        compass: boss && boss.state === 'guard' ? { x: boss.x, z: boss.z } : null,      // points at the boss from the moment he spawns until the fight with him starts
        explored,
        shots: mshots.view(),
        wave: { n: R.wave, phase: R.phase, timer: Math.max(0, R.timer), left: spawnQ.length + monsters.length, boss: R.phase === 'fight' ? !!boss || spawnQ.some((kd) => D.KINDS[kd].boss) : R.wave % L.bossEvery === 0 },
        bossBar: boss ? { name: D.KINDS[boss.kind].name, hp: boss.hp, maxHp: boss.maxHp, state: boss.state } : null,
        level: { n: R.level, xp: R.xp, need: D.xpNeed(R.level) },
        orbs: orbs.map((o) => ({ id: o.id, x: o.x, z: o.z, v: o.v })),
        pickups: pickups.map((q) => ({ id: q.id, kind: q.kind, x: q.x, z: q.z, life: q.life })),
        classChoices: R.classChoices ? R.classChoices.map((id) => kit.card(id, R.level)) : null,
        cls: kit.view(R.level),
        choices: R.choices ? R.choices.map((id) => { const s = skillOf(id); return { id, name: s.name, desc: s.desc, stack: stackOf(id), max: s.max }; }) : null,
        skills: D.SKILLS.filter((s) => stackOf(s.id) > 0).map((s) => ({ id: s.id, name: s.name, n: stackOf(s.id) })),
        frenzy: R.frenzy,
        over: R.over
      };
    }

    // put the player somewhere (tests and tools only: the game never teleports you)
    function place(x, z, yaw) { P.x = x; P.z = z; if (yaw !== undefined) P.yaw = yaw; P.vx = P.vz = 0; flowCell = -1; }
    // put a monster somewhere (tests and tools only)
    function spawnAt(kind, x, z) { addMonster(kind, x, z); }
    function spawnElite(kind, x, z) { forceElite = true; addMonster(kind, x, z); forceElite = false; }   // for tests: an elite right here
    function setCfg(o) { Object.assign(cfg, o); }
    function giveXp(v) { gainXp(v); }                                                  // tests: some experience right now
    function setHp(v) { P.hp = v; }                                                    // tests: set the player's health
    function giveSkill(id) { kit.pick(id); }                                           // tests: hand the player a class skill
    function monsterFx(i) { return monsters[i] && monsters[i].fx; }                     // tests: statuses on a monster
    function reset() { deaths = 0; restartRun(); events = []; }

    newRun(); loadFloor(floorOf(R.wave)); placePlayer();
    // first state, so the screen can draw before the first step
    return { get map() { return M0; }, cfg, setCfg, place, spawnAt, spawnElite, giveSkill, giveXp, setHp, monsterFx, step, snapshot, reset, kinds: D.KINDS, defaults: Object.assign({}, DEFAULT_CFG) };
  }

  return { create };
})();

if (typeof module !== 'undefined') module.exports = Referee;
