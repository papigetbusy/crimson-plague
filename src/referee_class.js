/* Class rules: what the Gunslinger, Assassin and Witch skills actually do. A helper of the referee, in the same style as referee_shots.js.
   Pure logic: no browser, no clock, no random of its own (the referee hands in its seeded rng).
   The referee calls the hooks (slideStart, beginShot, onHit, onKill, update ...) at the right moments; the numbers are in referee_classes.js. */
const RefereeClass = (function () {
  const C = (typeof RefereeClasses !== 'undefined') ? RefereeClasses : require('./referee_classes.js');
  const RU = C.RULES;

  // env: { rng, P, monsters(), damage(m, dmg, crit, x, y, z, splash, quiet), heal(v), maxHp(), baseDmg(), isBoss(m), event(e), tryMove(obj, dx, dz, r), nextId() }
  function create(env) {
    let id = '', def = null, owned = {}, use = {}, ult = null;
    let cloakT = 0, shadowT = 0, magBoost = false, shotCount = 0, qdReady = false, qdCd = 0, ultT = 0, charge = 0, cloudTick = 0, thralls = [];

    const fx = (m) => m.fx || (m.fx = { bleed: null, poison: null, hexT: 0, hexMul: 0, tick: 0 });
    const lvl = (sid) => owned[sid] || 0;
    const sdef = (sid) => (def ? def.skills.concat([def.ult]).find((s) => s.id === sid) : null);
    const val = (sid) => sdef(sid).v(lvl(sid));
    const ultOn = () => ultT > 0;

    function reset(classId) {
      id = C.CLASSES[classId] ? classId : ''; def = id ? C.CLASSES[id] : null;
      owned = {}; use = {}; cloakT = shadowT = ultT = qdCd = charge = cloudTick = 0; magBoost = qdReady = false; shotCount = 0; thralls = [];
      ult = def ? def.ult : null;
    }
    // a skill gets better the more it is used (and every time you pick it again)
    function levelUp(sid) {
      if (lvl(sid) >= C.MAX_LEVEL) return false;
      owned[sid]++; use[sid] = 0; env.event({ type: 'skillLevel', id: sid, name: sdef(sid).name, lvl: owned[sid], stat: sdef(sid).stat(val(sid)) });
      return true;
    }
    function used(sid) {
      if (!lvl(sid) || lvl(sid) >= C.MAX_LEVEL) return;
      use[sid] = (use[sid] || 0) + 1;
      if (use[sid] >= sdef(sid).useStep * lvl(sid)) levelUp(sid);
    }

    /* ----- level-up cards ----- */
    // up to three class cards: skills you do not have yet (and the ultimate once you are high enough), filled out with upgrades of ones you have
    function choices(playerLevel) {
      if (!def) return null;
      const fresh = def.skills.filter((s) => !lvl(s.id));
      if (playerLevel >= C.ULT_LEVEL && !lvl(def.ult.id)) fresh.push(def.ult);
      const old = def.skills.concat([def.ult]).filter((s) => lvl(s.id) && lvl(s.id) < C.MAX_LEVEL);
      const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(env.rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
      const row = shuffle(fresh).slice(0, 3);
      if (row.length < 3) row.push(...shuffle(old).slice(0, 3 - row.length));
      return row.length ? row.map((s) => s.id) : null;
    }
    function pick(sid) { if (!sdef(sid)) return; if (lvl(sid)) levelUp(sid); else { owned[sid] = 1; env.event({ type: 'skillNew', id: sid, name: sdef(sid).name }); } }
    // a card says what it changes: "now -> next" for a skill you have, the first-level numbers for a new one
    function card(sid) {
      const s = sdef(sid), n = lvl(sid);
      return { id: sid, name: s.name, desc: s.desc, lvl: n, max: C.MAX_LEVEL, ult: s.id === def.ult.id, now: n ? s.stat(s.v(n)) : '', next: s.stat(s.v(n + 1)) };
    }
    // starting on a later wave: the class skills you would have earned, picked at random
    function grantKit(n, playerLevel) {
      for (let i = 0; i < n; i++) { const c = choices(playerLevel); if (!c) break; pick(c[Math.floor(env.rng() * c.length)]); }
    }

    /* ----- numbers the referee reads ----- */
    // the class's starting bonus grows with every skill level you hold, so it keeps getting stronger as you level
    const training = () => 1 + RU.train * Object.keys(owned).reduce((a, k) => a + owned[k], 0);
    function mods() {
      const m = { rate: 1, speed: 1, freeAmmo: false };
      if (def && def.start.rate) m.rate *= 1 + (def.start.rate - 1) * training();
      if (def && def.start.speed) m.speed *= 1 + (def.start.speed - 1) * training();
      if (ultOn() && id === 'gunslinger') { m.rate *= val('bulletstorm').rate; m.freeAmmo = true; }
      return m;
    }
    const cloaked = () => cloakT > 0;
    function critChance() { return (lvl('deadeye') ? val('deadeye').crit : 0) + (magBoost && lvl('shadowstep') ? val('shadowstep').crit : 0); }

    /* ----- hooks ----- */
    function slideStart() {
      if (lvl('shadowstep')) shadowT = RU.shadowWindow;
      if (lvl('cloak')) { cloakT = val('cloak').dur; env.event({ type: 'cloakStart', dur: cloakT }); used('cloak'); }
    }
    // before the bullets of a shot are fired: how many extra bullets, and whether this shot is a sure crit
    function beginShot() {
      shotCount++;
      let extra = 0, force = false;
      if (lvl('fan') && shotCount % val('fan').every === 0) { extra = val('fan').extra; used('fan'); }
      const wasCloaked = cloakT > 0;
      if (wasCloaked) { cloakT = 0; env.event({ type: 'cloakEnd' }); }
      if (lvl('shadowstep') && (shadowT > 0 || wasCloaked)) { force = true; magBoost = true; shadowT = 0; used('shadowstep'); }
      if (ultOn() && id === 'assassin') force = true;
      return { extra, force };
    }
    const rollCrit = (force) => !!force || (critChance() > 0 && env.rng() < critChance());
    function critMul() { return RU.critMul; }
    function onReload() { magBoost = false; }
    function reloadMul() { if (qdReady) { qdReady = false; return 0.02; } return 1; }
    function takenMul(m) { return m.fx && m.fx.hexT > 0 ? 1 + m.fx.hexMul : 1; }

    // a status newly landing on a monster tells the screen (a puff of colour and a badge); a refresh does not
    const landed = (m, kind) => env.event({ type: 'status', id: m.id, kind, x: m.x, y: 1.2 * m.scale, z: m.z });
    function addPoison(m, dps, dur) {
      const f = fx(m), fresh = !(f.poison && f.poison.t > 0);
      if (!f.poison || f.poison.dps < dps) f.poison = { t: dur, dps }; else f.poison.t = Math.max(f.poison.t, dur);
      if (fresh) landed(m, 'poison');
    }
    // a bullet landed (dmg already dealt)
    function onHit(m, dmg, crit, x, y, z) {
      if (!def) return;
      const f = fx(m);
      if (def.start.poison && env.rng() < Math.min(0.95, def.start.chance * training())) addPoison(m, dmg * def.start.poison * training(), RU.poisonDur);   // a Witch's hit only sometimes infects
      if (lvl('hex')) { if (!(f.hexT > 0)) landed(m, 'hex'); f.hexT = val('hex').dur; f.hexMul = val('hex').mul; used('hex'); }
      if (lvl('bleed')) { const b = val('bleed'); if (!f.bleed) landed(m, 'bleed'); f.bleed = { t: b.dur, dps: Math.max(f.bleed ? f.bleed.dps : 0, dmg * b.frac) }; used('bleed'); }
      if (lvl('ricochet') && m.hp > 0) {
        const v = val('ricochet'); let from = m; const hit = new Set([m.id]);
        for (let b = 0; b < v.bounces; b++) {
          let best = null, bd = v.range;
          for (const o of env.monsters()) { if (hit.has(o.id) || o.hp <= 0) continue; const d = Math.hypot(o.x - from.x, o.z - from.z); if (d < bd) { bd = d; best = o; } }
          if (!best) break;
          hit.add(best.id);
          env.event({ type: 'ricochet', x0: from.x, y0: 1.2 * from.scale, z0: from.z, x1: best.x, y1: 1.2 * best.scale, z1: best.z });
          env.damage(best, dmg * v.frac, false, best.x, 1.2 * best.scale, best.z, true);
          from = best; used('ricochet');
        }
      }
      if (lvl('predator') && m.hp > 0 && !env.isBoss(m) && m.hp < m.maxHp * val('predator').below) { env.damage(m, m.hp + 1, true, x, y, z, true); used('predator'); }
    }
    function onKill(m) {
      if (!def) return;
      if (!ultOn() && lvl(def.ult.id)) {
        charge++;
        if (charge >= def.ult.need) { charge = 0; ultT = val(def.ult.id).dur; env.event({ type: 'ultStart', id: def.ult.id, name: def.ult.name, dur: ultT }); used(def.ult.id); }
      }
      if (lvl('quickdraw') && qdCd <= 0) { qdReady = true; qdCd = val('quickdraw').cd; used('quickdraw'); }
      if (lvl('siphon')) { env.heal(val('siphon').heal); used('siphon'); }
      if (ultOn() && id === 'assassin') env.heal(env.maxHp() * val('deathmark').heal);
      const f = m.fx;
      if (lvl('plague') && f && f.poison && f.poison.t > 0) {
        const v = val('plague'); let n = 0;
        for (const o of env.monsters()) {
          if (o === m || o.hp <= 0 || n >= v.targets || Math.hypot(o.x - m.x, o.z - m.z) > v.radius) continue;
          addPoison(o, f.poison.dps, RU.poisonDur); n++;
        }
        if (n) { env.event({ type: 'plague', x: m.x, z: m.z, r: v.radius }); used('plague'); }
      }
      if (lvl('raise') && thralls.length < RU.thrallCap && env.rng() < val('raise').chance) {
        const v = val('raise');
        thralls.push({ id: env.nextId(), kind: m.kind, x: m.x, z: m.z, yaw: m.yaw, life: v.life, maxLife: v.life, dps: v.dps, scale: m.scale, hitT: 0, mx: 0, mz: 0 });
        env.event({ type: 'raise', x: m.x, z: m.z, kind: m.kind }); used('raise');
      }
    }

    /* ----- every frame ----- */
    function tickStatus(m, dt) {
      const f = m.fx; if (!f) return;
      if (f.hexT > 0) f.hexT -= dt;
      f.tick += dt;
      if (f.tick < RU.bleedTick) return;
      const step = f.tick; f.tick = 0;
      for (const key of ['bleed', 'poison']) {
        const s = f[key]; if (!s) continue;
        s.t -= step; if (s.t <= 0) f[key] = null;
        if (m.hp > 0) env.damage(m, s.dps * step, false, m.x, 1.2 * m.scale, m.z, true, true);
      }
    }
    function update(dt) {
      cloakT = Math.max(0, cloakT - dt); shadowT = Math.max(0, shadowT - dt); qdCd = Math.max(0, qdCd - dt);
      if (ultT > 0) {
        ultT -= dt;
        if (ultT <= 0) { ultT = 0; env.event({ type: 'ultEnd' }); }
        else if (id === 'witch') {                                         // Crimson Plague: the cloud keeps everything inside it poisoned
          cloudTick -= dt;
          if (cloudTick <= 0) {
            cloudTick = 0.5; const v = val('crimsonplague');
            for (const m of env.monsters()) if (Math.hypot(m.x - env.P.x, m.z - env.P.z) < v.radius) addPoison(m, env.baseDmg() * v.dps, 1.5);
          }
        }
      }
      for (const m of env.monsters()) tickStatus(m, dt);
      for (let i = thralls.length - 1; i >= 0; i--) {                      // the raised dead run at the nearest monster and chew on it
        const t = thralls[i]; t.life -= dt; t.hitT -= dt;
        if (t.life <= 0) { thralls.splice(i, 1); continue; }
        let best = null, bd = 30;
        for (const m of env.monsters()) { const d = Math.hypot(m.x - t.x, m.z - t.z); if (m.hp > 0 && d < bd) { bd = d; best = m; } }
        t.mx = t.mz = 0;
        if (!best) { const d = Math.hypot(env.P.x - t.x, env.P.z - t.z); if (d > 4) { t.mx = (env.P.x - t.x) / d; t.mz = (env.P.z - t.z) / d; } }
        else if (bd > RU.thrallReach) { t.mx = (best.x - t.x) / bd; t.mz = (best.z - t.z) / bd; }
        else if (t.hitT <= 0) { t.hitT = 0.5; env.damage(best, env.baseDmg() * t.dps * 0.5, false, best.x, 1.2 * best.scale, best.z, true); }
        if (t.mx || t.mz) { env.tryMove(t, t.mx * RU.thrallSpeed * dt, t.mz * RU.thrallSpeed * dt, 0.4); t.yaw = Math.atan2(t.mx, -t.mz); }
      }
    }

    /* ----- what the screen gets ----- */
    function view(playerLevel) {
      if (!def) return null;
      const owns = def.skills.concat([def.ult]).filter((s) => lvl(s.id)).map((s) => ({ id: s.id, name: s.name, lvl: lvl(s.id), ult: s.id === def.ult.id }));
      return {
        id, name: def.name, skills: owns,
        ult: lvl(def.ult.id) ? { id: def.ult.id, name: def.ult.name, k: ultOn() ? ultT / val(def.ult.id).dur : charge / def.ult.need, active: ultOn() } : null,
        cloak: cloakT > 0 ? { t: cloakT, k: Math.min(1, cloakT) } : null,
        boost: magBoost, cloud: ultOn() && id === 'witch' ? val('crimsonplague').radius : 0,
        thralls: thralls.map((t) => ({ id: t.id, kind: t.kind, x: t.x, z: t.z, yaw: t.yaw, scale: t.scale, k: t.life / t.maxLife }))
      };
    }
    // saving: the skill levels and how used they are (the rest of a class is worked out from these)
    const save = () => ({ owned: Object.assign({}, owned), use: Object.assign({}, use) });
    const load = (d) => { owned = Object.assign({}, d.owned); use = Object.assign({}, d.use); };
    return { save, load, reset, choices, pick, card, grantKit, mods, cloaked, critChance, rollCrit, critMul, slideStart, beginShot, onReload, reloadMul, takenMul, onHit, onKill, update, view, lvl, get id() { return id; }, get def() { return def; } };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = RefereeClass;
