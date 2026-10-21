/* Extra boss moves, so no two fights run the same. Every boss owns a few of these on top of its signature attacks (referee_bosses.js);
   each is picked at random from the ones that are ready, so you cannot learn a fixed order. The numbers sit in referee_data.js (kind.extra).
   Moves:  strikes  marked circles on the floor around you that blast after a moment (jump or slide to dodge)
           fan      a spread of fireballs         ring    a ring of bolts           spiral  spinning arms of bolts
           leap     he jumps on you and lands with a shockwave                     rush    a straight charge
           flick    a very fast close swipe       combo   several quick dives in a row (the Bat Lord)
   After a big move he is left open for a moment (m.exposed): your shots do extra damage then.
   Bosses that are a VARIANT (Ember, Frost, Venom) also rain marked blasts that burn, freeze or poison. Pure and seeded. */
const RefereeBossExtras = (function () {
  const TAU = Math.PI * 2;
  const RAIN = { cd: 7.5, wind: 1.3, n: 6, r: 2.1, dmg: 0.8, spread: 6, rest: 0.8, min: 3, max: 24, kind: 'strikes' };   // what a variant boss adds
  const NAMES = (X, m) => { const l = Object.keys(X || {}).filter((n) => n !== 'rain'); if (m.variant) l.push('rain'); return l; };
  const cfgOf = (X, m, n) => (n === 'rain' ? RAIN : X[n]);

  // env as in referee_bosses.js; u = the shared small helpers from there
  function create(env, u) {
    const tempo = (m) => m.tempo || 1;
    const pl = () => env.player();
    function startCds(B, X, m, k) {
      for (const n of NAMES(X, m)) { const key = 'x_' + n; if (B.cd[key] === undefined) B.cd[key] = cfgOf(X, m, n).cd * (0.25 + env.rng() * 0.5); }
    }
    function spotsAround(m, c) {
      const P = pl(), out = [], lead = 0.45;
      for (let i = 0; i < c.n; i++) {
        const a = env.rng() * TAU, d = i === 0 ? 0 : 1.2 + env.rng() * c.spread;
        out.push({ x: P.x + (P.vx || 0) * lead * (i === 0 ? 1 : 0.3) + Math.sin(a) * d, z: P.z + (P.vz || 0) * lead * (i === 0 ? 1 : 0.3) - Math.cos(a) * d });
      }
      return out;
    }
    function begin(m, B, name, c, dx, dz) {
      B.phase = 'xwind'; B.move = name; B.t = B.wind = c.wind / tempo(m); m.state = 'cast'; u.faceTo(m, dx, dz);
      B.cd['x_' + name] = c.cd * (0.6 + env.rng() * 0.9);
      if (c.kind === 'strikes') B.spots = spotsAround(m, c);
      if (c.kind === 'leap') { const P = pl(); B.tx = P.x; B.tz = P.z; }
    }
    function rest(m, B, t) { B.phase = 'xrest'; B.t = t; m.state = 'rest'; u.stop(m); }
    function hitIfNear(m, x, z, r, dmg, tall) {
      const P = pl();
      if (Math.hypot(P.x - x, P.z - z) < r && (P.jumpH || 0) < (tall || 0.6)) env.hurt(m.dmg * dmg, m.id);
    }
    function fireRing(m, c, n, rot) {
      const sc = m.scale;
      for (let i = 0; i < n; i++) {
        const a = rot + i * TAU / n, ux = Math.sin(a), uz = -Math.cos(a);
        env.fire({ proj: c.proj || 'soul', owner: m.id, x: m.x + ux * 0.8 * sc, y: 1.3, z: m.z + uz * 0.8 * sc, tx: m.x + ux * 12, tz: m.z + uz * 12, ty: 1.3, speed: c.speed, r: c.r || 0.4, dmg: m.dmg * c.dmg });
      }
    }
    function land(m, B, name, c) {
      const P = pl();
      if (c.kind === 'strikes') {
        for (const s of B.spots) { hitIfNear(m, s.x, s.z, c.r, c.dmg); env.event({ type: 'bossStrike', x: s.x, z: s.z, r: c.r, fx: m.variant || m.kind }); }
        return rest(m, B, c.rest);
      }
      if (c.kind === 'fan') {
        const base = Math.atan2(P.x - m.x, -(P.z - m.z)), sc = m.scale, n = c.n + (m.enraged ? 2 : 0);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * c.spread, ux = Math.sin(a), uz = -Math.cos(a);
          env.fire({ proj: c.proj || 'fire', owner: m.id, x: m.x + ux * 1.0 * sc, y: 1.6 * sc, z: m.z + uz * 1.0 * sc, tx: m.x + ux * 20, tz: m.z + uz * 20, ty: P.eye - 0.35, speed: c.speed, r: c.r, dmg: m.dmg * c.dmg });
        }
        env.event({ type: 'shoot', proj: c.proj || 'fire', id: m.id, x: m.x, z: m.z });
        return rest(m, B, c.rest);
      }
      if (c.kind === 'ring') {
        fireRing(m, c, c.n, env.rng() * TAU); env.event({ type: 'bossNova', x: m.x, z: m.z });
        return rest(m, B, c.rest);
      }
      if (c.kind === 'flick') {
        hitIfNear(m, m.x, m.z, c.near * Math.max(1, m.scale * 0.55), c.dmg, 1.0); env.event({ type: 'bossSlam', x: m.x, z: m.z, r: c.near });
        return rest(m, B, c.rest);
      }
      // moving moves: leap, rush, spiral, combo
      B.phase = 'xrun'; B.t = B.dur = c.dur / (name === 'spiral' ? 1 : tempo(m)); B.hit = false; B.next = 0; B.rot = env.rng() * TAU; m.state = name === 'spiral' ? 'cast' : 'dash';
      if (name === 'rush' || name === 'combo') { const d = Math.hypot(P.x - m.x, P.z - m.z) || 1; B.ux = (P.x - m.x) / d; B.uz = (P.z - m.z) / d; if (name === 'combo') env.event({ type: 'bossDive', x: m.x, z: m.z }); }
      if (name === 'leap') { B.sx = m.x; B.sz = m.z; }
    }
    function runMove(m, B, c, name, dt, reach) {
      const sp = env.speed(m);
      B.t -= dt;
      if (name === 'spiral') {
        B.next -= dt; B.rot += dt * c.turn;
        while (B.next <= 0) { B.next += c.every; fireRing(m, c, c.arms, B.rot); }
        if (B.t <= 0) rest(m, B, c.rest);
        return;
      }
      if (name === 'leap') {
        m.bmx = (B.tx - B.sx) / B.dur; m.bmz = (B.tz - B.sz) / B.dur; m.yawT = Math.atan2(B.tx - B.sx, -(B.tz - B.sz));
        if (B.t <= 0) { hitIfNear(m, m.x, m.z, c.radius * Math.max(1, m.scale * 0.5), c.dmg, 0.8); env.event({ type: 'bossSlam', x: m.x, z: m.z, r: c.radius }); rest(m, B, c.rest); }
        return;
      }
      m.bmx = B.ux * sp * c.mult; m.bmz = B.uz * sp * c.mult; m.yawT = Math.atan2(B.ux, -B.uz);
      const P = pl(), dist = Math.hypot(P.x - m.x, P.z - m.z);
      if (!B.hit && dist < reach * 1.4) { B.hit = true; hitIfNear(m, P.x, P.z, 99, c.dmg, 1.0); }
      if (B.t <= 0 || (B.hit && name === 'rush')) {
        if (name === 'combo' && B.left > 0) { B.left--; B.hit = false; B.phase = 'xwind'; B.t = B.wind = c.gap / tempo(m); m.state = 'cast'; u.stop(m); return; }
        rest(m, B, c.rest);
      }
    }
    // true when an extra move is in charge of this frame
    function run(m, k, dt, dist, dx, dz, reach) {
      const X = k.extra; if (!X && !m.variant) return false;
      const B = u.state(m), P = pl();
      startCds(B, X, m, k);
      for (const n of NAMES(X, m)) { const key = 'x_' + n; B.cd[key] = Math.max(0, B.cd[key] - dt * u.pace(m, k)); }
      if (B.phase === 'xwind') {
        B.t -= dt; u.stop(m); u.faceTo(m, dx, dz);
        if (B.t <= 0) land(m, B, B.move, cfgOf(X, m, B.move));
        return true;
      }
      if (B.phase === 'xrun') { u.stop(m); runMove(m, B, cfgOf(X, m, B.move), B.move, dt, reach); return true; }
      if (B.phase === 'xrest') { u.stop(m); B.t -= dt; u.faceTo(m, dx, dz); if (B.t <= 0) { m.exposed = false; u.end(m, B); } return true; }
      if (B.phase !== 'idle' || (m.state !== 'chase' && m.state !== 'rest' && m.state !== 'attack')) return false;     // another move is under way, or he is asleep
      const seen = env.los(m.x, m.z, P.x, P.z), ready = [];
      for (const n of NAMES(X, m)) {
        const c = cfgOf(X, m, n); if (B.cd['x_' + n] > 0) continue;
        if (dist < (c.min || 0) || dist > (c.max || 40)) continue;
        if (c.near && c.kind === 'flick' && dist > c.near) continue;
        if (c.kind !== 'flick' && c.kind !== 'ring' && c.kind !== 'spiral' && !seen) continue;
        ready.push(n);
      }
      if (!ready.length || env.rng() > dt * 1.4 * u.pace(m, k)) return false;     // a ready move is not thrown at once: he waits a random moment, so the gaps between attacks vary
      const name = ready[(env.rng() * ready.length) | 0], c = cfgOf(X, m, name);
      begin(m, B, name, c, dx, dz); if (name === 'combo') B.left = c.n - 1;
      return true;
    }
    function view(m, k) {
      const B = m.bm, out = { k: 0, warn: [] }; if (!B) return out;
      const wk = B.wind > 0 ? Math.max(0, Math.min(1, 1 - B.t / B.wind)) : 0, X = k.extra;
      if (B.phase === 'xwind') {
        out.k = wk; const c = cfgOf(X || {}, m, B.move), P = pl();
        if (!c) return out;
        if (c.kind === 'strikes') for (const s of B.spots) out.warn.push({ shape: 'ring', x: s.x, z: s.z, r: c.r, k: wk, fill: true, fx: m.variant || m.kind });
        else if (c.kind === 'leap') out.warn.push({ shape: 'ring', x: B.tx, z: B.tz, r: c.radius, k: wk, fill: true });
        else if (c.kind === 'rush' || c.kind === 'combo') out.warn.push({ shape: 'lane', x: m.x, z: m.z, ang: Math.atan2(P.x - m.x, -(P.z - m.z)), len: 24, w: 1.4, k: wk });
        else if (c.kind === 'ring') out.warn.push({ shape: 'ring', x: m.x, z: m.z, r: 2 + 7 * wk, k: wk });
        else if (c.kind === 'flick') out.warn.push({ shape: 'ring', x: m.x, z: m.z, r: c.near * Math.max(1, m.scale * 0.55), k: wk, fill: true });
      }
      return out;
    }
    return { run, view };
  }
  return { RAIN, create };
})();
if (typeof module !== 'undefined') module.exports = RefereeBossExtras;
