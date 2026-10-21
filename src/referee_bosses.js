/* Boss moves. The Demon Lord charges and throws fireballs (that lives in referee.js); this file plays the three Crusader Tactics bosses, each with its own fight:
   BAT LORD  circles you in the air, rears up, then dives through the spot where you stood; a hit drains your health into his.
   LICH KING keeps his distance, fires fans of soul bolts and a ring of bolts with gaps, blinks away when you get close, and raises the dead at 60% health.
   ELDER DRAGON stands his ground: a fire cone sweeps across you, and a tail slam shocks everything close; in between he stomps after you.
   Pure and seeded: no browser, clock or random of its own. The referee hands in what it needs (env) and the numbers come from referee_data.js (kind.moves). */
const RefereeBosses = (function () {
  const EX = typeof RefereeBossExtras !== 'undefined' ? RefereeBossExtras : require('./referee_boss_extras.js');   // the extra moves every boss picks from at random
  const ORDER = ['demon', 'bat', 'lich', 'dragon'];
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // which boss waits on boss floor n: a scramble of the map seed and the floor (no dice drawn, so it never shifts the fight), never the same boss twice in a row
  function hashOf(seed, n) {
    let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(n, 0x7f4a7c15)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0; return (h ^ (h >>> 15)) >>> 0;
  }
  function pick(floor, seed, forced) {
    if (forced && ORDER.indexOf(forced) >= 0) return forced;
    let prev = -1, cur = 0;
    for (let f = 1; f <= Math.max(1, floor); f++) {
      cur = hashOf(seed, f) % ORDER.length;
      if (cur === prev) cur = (cur + 1 + (hashOf(seed, f + 977) % (ORDER.length - 1))) % ORDER.length;
      prev = cur;
    }
    return ORDER[cur];
  }

  // env: { player() -> {x, z, eye}, rng(), los(ax, az, bx, bz), hurt(dmg, ownerId), fire(shot), event(e), speed(m), spot(ax, az, bx, bz, min, max) -> [x, z] | null }
  function create(env) {
    const faceTo = (m, dx, dz) => { m.yawT = Math.atan2(dx, -dz); };
    const aim = (m) => { const P = env.player(); return [P.x - m.x, P.z - m.z]; };
    const state = (m) => m.bm || (m.bm = { phase: 'idle', t: 0, wind: 1, cd: {}, dir: 1, turn: 2 });
    const pace = (m, k) => (m.enraged && k.enrage ? 1 / k.enrage.pace : 1) * (m.tempo || 1);      // an enraged boss, and a boss from a deeper floor (tempo), run their clocks faster
    const tick = (B, dt, k, m) => { for (const n in B.cd) B.cd[n] = Math.max(0, B.cd[n] - dt * pace(m, k)); };
    const wait = (B, name, v) => { if (B.cd[name] === undefined) B.cd[name] = v; };
    const begin = (m, B, phase, t) => { t /= (m.tempo || 1); B.phase = phase; B.t = t; B.wind = t; m.state = 'cast'; };
    const end = (m, B) => { B.phase = 'idle'; m.state = 'chase'; };
    const stop = (m) => { m.bmx = m.bmz = 0; };

    /* ---------- the Bat Lord ---------- */
    function bat(m, k, dt, dist, dx, dz, reach) {
      const V = k.moves, B = state(m), sp = env.speed(m);
      wait(B, 'dive', 2.2); tick(B, dt, k, m); stop(m);
      if (B.phase === 'idle') {
        B.stick = dist < reach ? (B.stick || 0) + dt : 0;                                // he never sits on top of you for ever: after a moment of slashing he swoops off
        if (dist < reach && B.stick < 1.2) return false;                                 // right on top of you: a plain wing slash
        if (B.cd.dive <= 0 && (dist > V.dive.min || B.stick >= 1.2) && dist < V.dive.max && env.los(m.x, m.z, env.player().x, env.player().z)) { begin(m, B, 'wind', V.dive.wind); faceTo(m, dx, dz); return true; }
        B.turn -= dt; if (B.turn <= 0) { B.dir = env.rng() < 0.5 ? -1 : 1; B.turn = 2.5 + env.rng() * 1.5; }
        const tx = -dz / dist * B.dir, tz = dx / dist * B.dir, rad = clamp((dist - V.orbit.dist) / 4, -1, 1), l = Math.hypot(tx + dx / dist * rad, tz + dz / dist * rad) || 1;
        m.bmx = (tx + dx / dist * rad) / l * sp * V.orbit.speed; m.bmz = (tz + dz / dist * rad) / l * sp * V.orbit.speed; faceTo(m, dx, dz); m.state = 'chase';
        return true;
      }
      if (B.phase === 'wind') {
        B.t -= dt; faceTo(m, dx, dz);
        if (B.t <= 0) { B.phase = 'dash'; B.t = V.dive.maxT; B.hit = false; B.ux = dx / dist; B.uz = dz / dist; m.state = 'dash'; env.event({ type: 'bossDive', x: m.x, z: m.z }); }
        return true;
      }
      if (B.phase === 'dash') {
        B.t -= dt; m.bmx = B.ux * sp * V.dive.speed; m.bmz = B.uz * sp * V.dive.speed; m.yawT = Math.atan2(B.ux, -B.uz);
        if (!B.hit && dist < reach * 1.4) {
          B.hit = true; const d = m.dmg * V.dive.dmg;
          if (env.hurt(d, m.id)) { m.hp = Math.min(m.maxHp, m.hp + d * V.dive.drain * (m.enraged ? 1.5 : 1)); env.event({ type: 'bossDrain', x: m.x, z: m.z }); }      // a slide through the dive feeds him nothing
        }
        if (B.t <= 0 || B.hit) { B.phase = 'rest'; B.t = V.dive.rest; B.cd.dive = V.dive.cd * (0.55 + env.rng() * 0.9); m.state = 'rest'; stop(m); }
        return true;
      }
      B.t -= dt; faceTo(m, dx, dz);                                                       // 'rest': hanging in the air, open to your shots
      if (B.t <= 0) end(m, B);
      return true;
    }
    /* ---------- the Lich King ---------- */
    function ring(m, V, n, rot) {
      const sc = m.scale;
      for (let i = 0; i < n; i++) {
        const a = rot + i * TAU / n, ux = Math.sin(a), uz = -Math.cos(a);
        env.fire({ proj: 'soul', owner: m.id, x: m.x + ux * 0.8 * sc, y: 1.3, z: m.z + uz * 0.8 * sc, tx: m.x + ux * 12, tz: m.z + uz * 12, ty: 1.3, speed: V.speed, r: V.r, dmg: m.dmg * V.dmg });
      }
    }
    function lich(m, k, dt, dist, dx, dz) {
      const V = k.moves, B = state(m), sp = env.speed(m), P = env.player(), sc = m.scale;
      wait(B, 'volley', 1.2); wait(B, 'nova', 5); wait(B, 'blink', 3); tick(B, dt, k, m); stop(m);
      if (B.again > 0) { B.again -= dt; if (B.again <= 0) ring(m, V.nova, V.nova.n + 6, B.rot + TAU / (V.nova.n + 6) / 2); }   // enraged: a second ring right behind the first, its gaps shifted
      const seen = env.los(m.x, m.z, P.x, P.z);
      if (B.phase === 'idle') {
        if (B.cd.blink <= 0 && dist < V.blink.near) {
          const spot = env.spot(m.x, m.z, P.x, P.z, V.blink.min, V.blink.max);
          if (spot) { env.event({ type: 'bossBlink', x: m.x, z: m.z, x2: spot[0], z2: spot[1] }); m.x = spot[0]; m.z = spot[1]; B.cd.blink = V.blink.cd * (0.55 + env.rng() * 0.9); B.phase = 'rest'; B.t = V.blink.rest; m.state = 'rest'; return true; }
        }
        if (B.cd.nova <= 0 && seen && dist > V.nova.min && dist < V.nova.max) { begin(m, B, 'nova', V.nova.wind); faceTo(m, dx, dz); return true; }
        if (B.cd.volley <= 0 && seen && dist > V.volley.min && dist < V.volley.max) { begin(m, B, 'volley', V.volley.wind); faceTo(m, dx, dz); return true; }
        if (!seen) return false;                                                          // lost sight of you: walk the normal way round
        faceTo(m, dx, dz); m.state = 'chase';
        if (dist < V.keep - 1) { m.bmx = -dx / dist * sp * 0.8; m.bmz = -dz / dist * sp * 0.8; }                // too close: float back
        else if (dist > V.keep + 6) { m.bmx = dx / dist * sp * 0.7; m.bmz = dz / dist * sp * 0.7; }
        else { B.turn -= dt; if (B.turn <= 0) { B.dir = env.rng() < 0.5 ? -1 : 1; B.turn = 2 + env.rng() * 2; } m.bmx = -dz / dist * B.dir * sp * 0.5; m.bmz = dx / dist * B.dir * sp * 0.5; }
        return true;
      }
      if (B.phase === 'volley') {
        B.t -= dt; faceTo(m, dx, dz);
        if (B.t <= 0) {
          const n = m.enraged ? V.volley.n + 2 : V.volley.n, base = Math.atan2(dx, -dz);
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * V.volley.spread, ux = Math.sin(a), uz = -Math.cos(a);
            env.fire({ proj: 'soul', owner: m.id, x: m.x + ux * 0.8 * sc, y: 2.0 * sc, z: m.z + uz * 0.8 * sc, tx: m.x + ux * 20, tz: m.z + uz * 20, ty: P.eye - 0.35 + (dist > 1 ? 0 : 0), speed: V.volley.speed, r: V.volley.r, dmg: m.dmg * V.volley.dmg });
          }
          env.event({ type: 'shoot', proj: 'soul', id: m.id, x: m.x, z: m.z });
          B.cd.volley = V.volley.cd * (0.55 + env.rng() * 0.9); end(m, B);
        }
        return true;
      }
      if (B.phase === 'nova') {
        B.t -= dt; faceTo(m, dx, dz);
        if (B.t <= 0) {
          B.rot = env.rng() * TAU; ring(m, V.nova, V.nova.n, B.rot); if (m.enraged) B.again = 0.55;
          env.event({ type: 'bossNova', x: m.x, z: m.z });
          B.cd.nova = V.nova.cd * (0.55 + env.rng() * 0.9); end(m, B);
        }
        return true;
      }
      B.t -= dt; faceTo(m, dx, dz);                                                       // 'rest': just blinked in, a moment to catch his breath
      if (B.t <= 0) end(m, B);
      return true;
    }
    /* ---------- the Elder Dragon ---------- */
    function dragon(m, k, dt, dist, dx, dz) {
      const V = k.moves, B = state(m), sc = m.scale;
      wait(B, 'breath', 3); wait(B, 'slam', 4); tick(B, dt, k, m); stop(m);
      if (B.phase === 'idle') {
        const seen = env.los(m.x, m.z, env.player().x, env.player().z);
        if (B.cd.slam <= 0 && dist < V.slam.near) { begin(m, B, 'slamWind', V.slam.wind); faceTo(m, dx, dz); return true; }
        if (B.cd.breath <= 0 && seen && dist > V.breath.min && dist < V.breath.max) { begin(m, B, 'breathWind', V.breath.wind); faceTo(m, dx, dz); B.a0 = Math.atan2(dx, -dz); B.sign = env.rng() < 0.5 ? -1 : 1; return true; }
        return false;                                                                    // otherwise he stomps after you and swings like any brute
      }
      if (B.phase === 'breathWind') { B.t -= dt; if (B.t <= 0) { B.phase = 'breath'; B.t = V.breath.dur * (m.enraged ? 1.5 : 1); B.dur = B.t; B.next = 0; m.state = 'cast'; env.event({ type: 'bossBreath', x: m.x, z: m.z }); } return true; }
      if (B.phase === 'breath') {
        B.t -= dt; const u = clamp(1 - B.t / B.dur, 0, 1), a = B.a0 + B.sign * V.breath.arc * (u - 0.5) * 2 * 0.5;
        m.yawT = a; B.angle = a; B.next -= dt;
        while (B.next <= 0) {
          B.next += V.breath.every; const ux = Math.sin(a), uz = -Math.cos(a);
          env.fire({ proj: 'fire', owner: m.id, x: m.x + ux * 1.2 * sc, y: 1.1 * sc, z: m.z + uz * 1.2 * sc, tx: m.x + ux * 20, tz: m.z + uz * 20, ty: 1.1 * sc, speed: V.breath.speed, r: V.breath.r, dmg: m.dmg * V.breath.dmg, life: V.breath.life });
        }
        if (B.t <= 0) { B.cd.breath = V.breath.cd * (0.55 + env.rng() * 0.9); B.phase = 'rest'; B.t = 0.7; m.state = 'rest'; }
        return true;
      }
      if (B.phase === 'slamWind') {
        B.t -= dt; faceTo(m, dx, dz);
        if (B.t <= 0) {
          if (dist < V.slam.radius * Math.max(1, sc * 0.6)) env.hurt(m.dmg * V.slam.dmg, m.id);
          env.event({ type: 'bossSlam', x: m.x, z: m.z, r: V.slam.radius });
          B.cd.slam = V.slam.cd * (0.55 + env.rng() * 0.9); B.phase = 'rest'; B.t = V.slam.rest; m.state = 'rest';
        }
        return true;
      }
      B.t -= dt; if (B.t <= 0) end(m, B);                                                 // 'rest': after a breath or a slam he is slow to turn
      return true;
    }
    const HANDLERS = { bat, lich, dragon };
    const XT = EX.create(env, { state, faceTo, stop, end, pace });
    // true when the boss's own moves are in charge of this frame; they leave their step in m.bmx / m.bmz (the referee moves him)
    function step(m, k, dt, dist, dx, dz, reach) {
      if (XT.run(m, k, dt, dist, dx, dz, reach)) { m.exposed = m.bm.phase === 'xrest'; return true; }
      const r = k.moves && HANDLERS[m.kind] ? HANDLERS[m.kind](m, k, dt, dist, dx, dz, reach) : false;
      m.exposed = !!r && !!m.bm && m.bm.phase === 'rest';                                // after a big move he is open to your shots
      return r;
    }
    // what the screen needs: how far the current wind-up has got (0 to 1) and the floor warnings to draw
    function view(m, k) {
      const B = m.bm; if (!B || !(k.moves || k.extra || m.variant)) return { k: 0, warn: [] };
      if (B.phase === 'xwind') return XT.view(m, k);
      const wk = B.wind > 0 ? clamp(1 - B.t / B.wind, 0, 1) : 0, warn = [], V = k.moves;
      if (m.kind === 'bat' && B.phase === 'wind') { const P = env.player(), a = Math.atan2(P.x - m.x, -(P.z - m.z)); warn.push({ shape: 'lane', x: m.x, z: m.z, ang: a, len: 26, w: 1.6, k: wk }); }
      if (m.kind === 'lich' && B.phase === 'nova') warn.push({ shape: 'ring', x: m.x, z: m.z, r: 2 + 8 * wk, k: wk });
      if (m.kind === 'dragon' && B.phase === 'breathWind') for (const s of [-1, 1]) warn.push({ shape: 'lane', x: m.x, z: m.z, ang: B.a0 + s * V.breath.arc * 0.5, len: 18, w: 0.5, k: wk });
      if (m.kind === 'dragon' && B.phase === 'breath') warn.push({ shape: 'lane', x: m.x, z: m.z, ang: B.angle, len: 18, w: 0.4, k: 1 });
      if (m.kind === 'dragon' && B.phase === 'slamWind') warn.push({ shape: 'ring', x: m.x, z: m.z, r: V.slam.radius * Math.max(1, m.scale * 0.6), k: wk, fill: true });
      return { k: B.phase === 'wind' || B.phase === 'volley' || B.phase === 'nova' || B.phase === 'breathWind' || B.phase === 'slamWind' ? wk : B.phase === 'breath' ? 1 : 0, warn };
    }
    return { step, view };
  }
  return { ORDER, pick, create };
})();
if (typeof module !== 'undefined') module.exports = RefereeBosses;
