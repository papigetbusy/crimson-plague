/* ============================================================
   REFEREE
   Owns every rule and number: map, positions, movement, slide,
   aim-down-sights, shooting, hit detection, damage, monster
   behavior, respawns, kill counter.

   No DOM. No 3D library. Plain data in, plain data out, so it
   can be ported to Go later without touching the screen.

   step(dt, input) -> { state, events }
     input:  { mx, mz, lookX, lookY, touchX, touchY,
               fire, ads, sprint, slide, reload }
     state:  everything the screen needs to draw one frame
     events: one-shot things that happened this step
   ============================================================ */
const Referee = (function () {
  'use strict';

  const CELL = 2;       // world units per grid cell
  const WALL_H = 4.8;   // wall height

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

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
    // monsters
    monsterCount: 6,
    monsterHp: 70,
    monsterSpeed: 3.6,
    monsterDamage: 7,
    monsterAttackRate: 1.0,
    monsterScale: 1.0,
    respawnDelay: 1.0,
    // player
    playerHp: 100,
    regenDelay: 3,
    regen: 14
  };

  // Hit spheres on a monster at scale 1: height of centre and radius.
  const HIT_SPHERES = [
    { y: 0.58, r: 0.55 },
    { y: 1.30, r: 0.62 },
    { y: 1.95, r: 0.38, head: true }
  ];
  const MONSTER_RADIUS = 0.5;

  /* ---------------- map ---------------- */
  function buildMap() {
    const W = 21, H = 32;
    const g = [];
    for (let z = 0; z < H; z++) g.push(new Array(W).fill('#'));
    const carve = (x0, z0, x1, z1, ch) => {
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) g[z][x] = ch;
    };
    carve(1, 1, 19, 11, '.');          // open chamber
    carve(9, 12, 11, 29, '.');         // corridor
    for (const zs of [15, 19, 23]) {   // alcoves between the pillars
      carve(8, zs, 8, zs + 2, '.');
      carve(12, zs, 12, zs + 2, '.');
    }
    for (const zp of [14, 18, 22, 26]) { g[zp][8] = 'P'; g[zp][12] = 'P'; }
    for (const [x, z] of [[5, 3], [15, 3], [5, 8], [15, 8]]) g[z][x] = 'P';
    for (let z = 1; z <= 29; z++) g[z][10] = 'c';   // carpet runner
    // wall flavours: B banner, W window panel, # plain stone
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      if (g[z][x] === '#') { const k = (x + z) % 3; g[z][x] = k === 0 ? 'B' : k === 1 ? 'W' : '#'; }
    }
    // torches (flame centre; nx,nz = direction away from the wall)
    const torches = [];
    for (const zp of [14, 18, 22, 26]) {
      const z = (zp + 0.5) * CELL;
      torches.push({ x: 18 + 0.28, y: 2.5, z, nx: 1, nz: 0, kind: 'sconce' });
      torches.push({ x: 24 - 0.28, y: 2.5, z, nx: -1, nz: 0, kind: 'sconce' });
    }
    for (const cx of [4, 8, 12, 16]) torches.push({ x: (cx + 0.5) * CELL, y: 2.5, z: 2 + 0.28, nx: 0, nz: 1, kind: 'sconce' });
    for (const cz of [4, 8]) {
      torches.push({ x: 2 + 0.28, y: 2.5, z: (cz + 0.5) * CELL, nx: 1, nz: 0, kind: 'sconce' });
      torches.push({ x: 40 - 0.28, y: 2.5, z: (cz + 0.5) * CELL, nx: -1, nz: 0, kind: 'sconce' });
    }
    for (const [cx, cz] of [[2, 2], [18, 2], [2, 10], [18, 10]]) {
      torches.push({ x: (cx + 0.5) * CELL, y: 1.75, z: (cz + 0.5) * CELL, nx: 0, nz: 0, kind: 'brazier' });
    }
    torches.push({ x: 21, y: 2.5, z: 60 - 0.28, nx: 0, nz: -1, kind: 'sconce' });
    return {
      W, H, CELL, WALL_H,
      rows: g.map(r => r.join('')),
      torches,
      start: { x: 21, z: 56.6, yaw: 0 },
      _g: g
    };
  }

  function create(seed) {
    const rng = makeRng(seed || 1337);
    const cfg = Object.assign({}, DEFAULT_CFG);
    const M = buildMap();
    const G = M._g;
    delete M._g;
    const GW = M.W, GH = M.H;

    const solid = (cx, cz) => {
      if (cx < 0 || cz < 0 || cx >= GW || cz >= GH) return true;
      const c = G[cz][cx];
      return c !== '.' && c !== 'c';
    };
    const floorCells = [];
    for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) if (!solid(x, z)) floorCells.push([x, z]);

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
    const flow = new Int16Array(GW * GH);
    const queue = new Int16Array(GW * GH);
    let flowCell = -1, flowTimer = 0;
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
    const P = {
      x: M.start.x, z: M.start.z, yaw: M.start.yaw, pitch: 0,
      vx: 0, vz: 0, eye: cfg.eyeStand,
      sliding: false, slideT: 0, slideCd: 0, sdx: 0, sdz: 0,
      sprinting: false, sprintK: 0, adsT: 0, kick: 0,
      hp: cfg.playerHp, hurt: 0, sinceHit: 0, invuln: 0, fireCd: 0,
      ammo: cfg.magSize, reloading: false, reloadT: 0, reloadDur: 0, reloadEmpty: false
    };
    let monsters = [];
    let nextId = 1, kills = 0, deaths = 0, time = 0, spawnTimer = 0.4, events = [];

    function angleDiff(a, b) {
      let d = a - b;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }

    function spawnMonster() {
      let best = null, bestScore = -1;
      for (let i = 0; i < 40; i++) {
        const c = floorCells[(rng() * floorCells.length) | 0];
        const x = (c[0] + 0.3 + rng() * 0.4) * CELL, z = (c[1] + 0.3 + rng() * 0.4) * CELL;
        const d = Math.hypot(x - P.x, z - P.z);
        if (d < 13) continue;
        const seen = hasLOS(x, z, P.x, P.z);
        const score = (seen ? 0 : 100) + Math.min(d, 40);
        if (score > bestScore) { bestScore = score; best = [x, z]; }
        if (!seen && d > 14) break;
      }
      if (!best) return false;
      const sv = 0.92 + rng() * 0.18;
      monsters.push({
        id: nextId++, x: best[0], z: best[1], hp: cfg.monsterHp, maxHp: cfg.monsterHp,
        sv, spd: 0.85 + rng() * 0.3, yaw: 0, yawT: 0, phase: rng() * 6, atk: 0.4,
        flash: 0, stun: 0, state: 'chase'
      });
      return true;
    }

    function respawnPlayer() {
      P.x = M.start.x; P.z = M.start.z; P.yaw = M.start.yaw; P.pitch = 0;
      P.vx = P.vz = 0; P.sliding = false; P.slideT = 0; P.kick = 0;
      P.hp = cfg.playerHp; P.invuln = 1.5; P.hurt = 0;
      P.ammo = cfg.magSize; P.reloading = false; P.reloadT = 0;
      monsters = [];
      spawnTimer = 1.2;
      flowCell = -1;
    }
    function hurtPlayer(d, id) {
      if (P.invuln > 0) return;
      P.hp -= d; P.hurt = 0.3; P.sinceHit = 0;
      events.push({ type: 'playerHit', dmg: d, id });
      if (P.hp <= 0) { deaths++; events.push({ type: 'dead' }); respawnPlayer(); }
    }

    /* ---------------- reload ---------------- */
    function startReload() {
      if (P.reloading || P.ammo >= cfg.magSize) return;
      P.reloading = true; P.reloadT = 0; P.reloadEmpty = P.ammo <= 0;
      P.reloadDur = cfg.reloadTime + (P.reloadEmpty ? cfg.reloadEmptyExtra : 0);
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
      let s = lerp(cfg.spread, cfg.spreadAds, P.adsT) * (1 + speed / cfg.walkSpeed * 0.5);
      if (P.sliding) s *= 0.8;
      const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), sp = Math.sin(pe), cp = Math.cos(pe);
      const fx = sy * cp, fy = sp, fz = -cy * cp;
      const rx = cy, rz = sy;                              // right
      const ux = -sy * sp, uy = cp, uz = cy * sp;          // up
      const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * s;
      const ox = Math.cos(a) * rr, oy = Math.sin(a) * rr;
      let dx = fx + rx * ox + ux * oy, dy = fy + uy * oy, dz = fz + rz * ox + uz * oy;
      const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
      const ex = P.x, ey = P.eye, ez = P.z;

      const wallT = castWall(ex, ey, ez, dx, dy, dz, cfg.range);
      let bestT = wallT, bestM = null, bestHead = false;
      for (const m of monsters) {
        const sc = cfg.monsterScale * m.sv;
        for (const sph of HIT_SPHERES) {
          const t = raySphere(ex, ey, ez, dx, dy, dz, m.x, sph.y * sc, m.z, sph.r * sc);
          if (t >= 0 && t < bestT) { bestT = t; bestM = m; bestHead = !!sph.head; }
        }
      }
      const endx = ex + dx * bestT, endy = ey + dy * bestT, endz = ez + dz * bestT;
      events.push({
        type: 'shot', ox: ex, oy: ey, oz: ez, dx, dy, dz, t: bestT,
        ex: endx, ey: endy, ez: endz, hit: bestM ? 'monster' : (bestT >= cfg.range - 0.2 ? 'none' : 'wall')
      });
      if (bestM) {
        const dmg = cfg.damage * (bestHead ? cfg.headMul : 1);
        bestM.hp -= dmg; bestM.flash = 0.12; bestM.stun = 0.08;
        events.push({ type: 'hit', id: bestM.id, dmg: Math.round(dmg), crit: bestHead, x: endx, y: endy, z: endz });
        if (bestM.hp <= 0) {
          kills++;
          events.push({ type: 'kill', id: bestM.id, x: bestM.x, z: bestM.z, scale: cfg.monsterScale * bestM.sv, yaw: bestM.yaw });
          monsters = monsters.filter(m => m !== bestM);
        }
      }
      P.kick += cfg.recoilKick;
      P.ammo--;
      if (P.ammo <= 0) startReload();
    }

    /* ---------------- monsters ---------------- */
    function updateMonster(m, dt) {
      m.flash = Math.max(0, m.flash - dt);
      m.stun = Math.max(0, m.stun - dt);
      const sc = cfg.monsterScale * m.sv;
      const dx = P.x - m.x, dz = P.z - m.z;
      const dist = Math.hypot(dx, dz) || 0.0001;
      const reach = 1.25 * sc + 0.45;
      let mvx = 0, mvz = 0;
      const was = m.state;
      m.state = dist < reach ? 'attack' : 'chase';
      if (m.state === 'attack') {
        if (was !== 'attack') m.atk = 0.45;
        m.atk -= dt;
        if (m.atk <= 0) { m.atk = 1 / cfg.monsterAttackRate; hurtPlayer(cfg.monsterDamage, m.id); }
        m.yawT = Math.atan2(dx, -dz);
      } else {
        let dirx, dirz;
        const los = hasWideLOS(m.x, m.z, P.x, P.z);
        if (los) { dirx = dx / dist; dirz = dz / dist; }
        else {
          const d = flowDir(m.x, m.z);
          if (d) { dirx = d[0]; dirz = d[1]; } else { dirx = dx / dist; dirz = dz / dist; }
        }
        const sp = cfg.monsterSpeed * m.spd * (m.stun > 0 ? 0.25 : 1);
        mvx = dirx * sp; mvz = dirz * sp;
        m.yawT = los ? Math.atan2(dx, -dz) : Math.atan2(dirx, -dirz);
      }
      let sx = 0, sz = 0;
      const minD = MONSTER_RADIUS * 2 * Math.max(0.8, sc);
      for (const o of monsters) {
        if (o === m) continue;
        const ox = m.x - o.x, oz = m.z - o.z, dd = Math.hypot(ox, oz);
        if (dd > 0.001 && dd < minD) { const k = (minD - dd) * 5 / dd; sx += ox * k; sz += oz * k; }
      }
      tryMove(m, (mvx + sx) * dt, (mvz + sz) * dt, MONSTER_RADIUS * Math.min(Math.max(sc, 0.8), 1.4));
      m.yaw += clamp(angleDiff(m.yawT, m.yaw), -dt * 9, dt * 9);
      m.phase += Math.hypot(mvx, mvz) * dt * 2.4;
    }

    /* ---------------- step ---------------- */
    function step(dt, inp) {
      dt = Math.min(Math.max(dt, 0), 0.05);
      events = [];
      inp = inp || {};
      time += dt;
      const p = P;

      // look
      const lookMul = 1 - p.adsT * (1 - cfg.adsLookMul);
      p.yaw += ((inp.lookX || 0) * cfg.lookSens + (inp.touchX || 0) * cfg.touchSens) * lookMul;
      p.pitch = clamp(p.pitch - ((inp.lookY || 0) * cfg.lookSens + (inp.touchY || 0) * cfg.touchSens) * lookMul, -1.45, 1.45);

      // move
      const fx = Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = Math.sin(p.yaw);
      let mx = clamp(inp.mx || 0, -1, 1), mz = clamp(inp.mz || 0, -1, 1);
      const mag = Math.hypot(mx, mz);
      if (mag > 1) { mx /= mag; mz /= mag; }
      const wx = rx * mx + fx * mz, wz = rz * mx + fz * mz;
      const ads = !!inp.ads && !p.reloading;   // aiming drops while reloading
      p.sprinting = !!inp.sprint && mz > 0.25 && !ads && !p.sliding;
      let top = p.sprinting ? cfg.sprintSpeed : cfg.walkSpeed;
      if (ads) top *= cfg.adsSpeedMul;

      p.slideCd -= dt;
      if (inp.slide && !p.sliding && p.slideCd <= 0) {
        const sp = Math.hypot(p.vx, p.vz);
        if (sp > cfg.walkSpeed * 0.5) {
          p.sliding = true; p.slideT = cfg.slideTime;
          p.sdx = p.vx / sp; p.sdz = p.vz / sp;
          p.slideCd = cfg.slideTime + cfg.slideCooldown;
          events.push({ type: 'slide' });
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
      if (p.sinceHit > cfg.regenDelay && p.hp < cfg.playerHp) p.hp = Math.min(cfg.playerHp, p.hp + cfg.regen * dt);

      // reload, then fire
      if (p.ammo > cfg.magSize) p.ammo = cfg.magSize;
      if (inp.reload) startReload();
      if (p.reloading) {
        p.reloadT += dt;
        if (p.reloadT >= p.reloadDur) { p.reloading = false; p.ammo = cfg.magSize; events.push({ type: 'reloadEnd' }); }
      }
      p.fireCd -= dt;
      if (p.fireCd < 0 && !inp.fire) p.fireCd = 0;
      const interval = 1 / cfg.fireRate;
      let shots = 0;
      if (inp.fire && !p.reloading && p.ammo <= 0) startReload();
      while (inp.fire && !p.reloading && p.ammo > 0 && p.fireCd <= 0 && shots < 3) { shoot(); p.fireCd += interval; shots++; }

      // monsters
      flowTimer -= dt;
      const pc = clamp(Math.floor(p.z / CELL), 0, GH - 1) * GW + clamp(Math.floor(p.x / CELL), 0, GW - 1);
      if (pc !== flowCell || flowTimer <= 0) { buildFlow(p.x, p.z); flowTimer = 0.4; }
      for (const m of monsters) updateMonster(m, dt);
      if (monsters.length < cfg.monsterCount) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) { if (spawnMonster()) spawnTimer = cfg.respawnDelay; else spawnTimer = 0.3; }
      }

      return { state: snapshot(), events };
    }

    function snapshot() {
      const p = P;
      const ease = p.adsT * p.adsT * (3 - 2 * p.adsT);
      return {
        t: time, kills, deaths,
        player: {
          x: p.x, z: p.z, yaw: p.yaw, pitch: clamp(p.pitch + p.kick, -1.5, 1.5), eye: p.eye,
          fov: lerp(cfg.fovBase, cfg.fovAds, ease) + cfg.sprintFovAdd * p.sprintK,
          adsT: p.adsT, sprintK: p.sprintK, sprinting: p.sprinting, sliding: p.sliding,
          slideK: p.sliding ? p.slideT / cfg.slideTime : 0,
          vx: p.vx, vz: p.vz, speed: Math.hypot(p.vx, p.vz),
          hp: p.hp, maxHp: cfg.playerHp, hurt: p.hurt, kick: p.kick,
          ammo: p.ammo, magSize: cfg.magSize, reloading: p.reloading,
          reloadK: p.reloading ? clamp(p.reloadT / p.reloadDur, 0, 1) : 0,
          reloadEmpty: p.reloadEmpty, reloadDur: p.reloadDur
        },
        monsters: monsters.map(m => ({
          id: m.id, x: m.x, z: m.z, yaw: m.yaw, hp: m.hp, maxHp: m.maxHp,
          flash: m.flash, state: m.state, phase: m.phase, scale: cfg.monsterScale * m.sv
        }))
      };
    }

    function setCfg(o) { Object.assign(cfg, o); }
    function reset() { kills = 0; deaths = 0; respawnPlayer(); }

    // first state, so the screen can draw before the first step
    return { map: M, cfg, setCfg, step, snapshot, reset, defaults: Object.assign({}, DEFAULT_CFG) };
  }

  return { create };
})();

if (typeof module !== 'undefined') module.exports = Referee;
