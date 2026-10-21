/* Co-op rules (pure numbers and small functions; the referee does the playing).
   The host's game is the world: waves, monsters, boss, doors. Each guest's game keeps everything personal (gun, gear, level, gold, drops, shop).
   Monsters get tougher and more numerous with the number of players, a downed friend is revived by a teammate standing close, and the run ends when everyone is down. */
const RefereeCoop = (function () {
  const RULES = {
    maxPlayers: 5,
    hpPerExtra: 0.7,         // each extra player adds this much to every monster's health (x1, x1.7, x2.4)
    countPerExtra: 0.5,      // and this much to how many monsters come (x1, x1.5, x2)
    reviveTime: 4,           // seconds a teammate must stand next to you to bring you back up
    reviveRange: 2.6,        // how close that is
    reviveHp: 0.4,           // you come back with this share of your health
    reviveInvuln: 2.0,       // and can not be hit for this long
    stateEvery: 0.05         // how often a guest tells the host where it is (seconds)
  };
  const hpMul = (n) => 1 + RULES.hpPerExtra * (Math.max(1, n) - 1);
  const countMul = (n) => 1 + RULES.countPerExtra * (Math.max(1, n) - 1);
  // the nearest standing target to a point (targets: { x, z, down }); if everyone is down the nearest one anyway
  function nearest(targets, x, z) {
    let best = null, bd = Infinity;
    for (const pass of [true, false]) {
      for (const t of targets) { if (pass && t.down) continue; const d = (t.x - x) * (t.x - x) + (t.z - z) * (t.z - z); if (d < bd) { bd = d; best = t; } }
      if (best) return best;
    }
    return best;
  }
  // how many standing friends are within reach of a downed player at (x, z)
  const helpers = (friends, x, z) => friends.filter((f) => !f.down && Math.hypot(f.x - x, f.z - z) < RULES.reviveRange).length;
  // a wave for several players: extra monsters of the ordinary kinds (never a second boss), picked with the referee's dice
  function scaleQueue(queue, n, rng, isBoss) {
    const extra = Math.round(queue.filter((k) => !isBoss(k)).length * (countMul(n) - 1)), plain = queue.filter((k) => !isBoss(k));
    const out = queue.slice();
    for (let i = 0; i < extra && plain.length; i++) out.push(plain[(rng() * plain.length) | 0]);
    return out;
  }
  // the events a friend's game needs to hear about (everything else is that player's own business)
  const WORLD_EVENTS = ['kill', 'spawn', 'shoot', 'projHit', 'bossWake', 'bossEnrage', 'bossSummon', 'bossDive', 'bossDrain', 'bossBlink', 'bossNova', 'bossBreath', 'bossSlam', 'waveStart', 'waveClear', 'eliteBlast', 'remoteHurt', 'dead'];
  const worldEvents = (events) => events.filter((e) => WORLD_EVENTS.indexOf(e.type) >= 0);
  const r2 = (v) => Math.round(v * 100) / 100;
  // one monster as it travels over the net: just what a friend's screen and aim need
  const compact = (m, atkK, castK) => ({ id: m.id, kind: m.kind, x: r2(m.x), z: r2(m.z), yaw: r2(m.yaw), hp: Math.round(m.hp), mhp: Math.round(m.maxHp), st: m.state, ph: r2(m.phase), sc: r2(m.scale), el: m.elite, en: !!m.enraged, ak: r2(atkK), ck: r2(castK) });
  // a friend's copy of a monster: it keeps its own status effects (fire, ice ...) and is pulled towards the host's position
  function puppet(c) {
    return { id: c.id, kind: c.kind, x: c.x, z: c.z, yaw: c.yaw, hp: c.hp, maxHp: c.mhp, state: c.st, phase: c.ph, scale: c.sc, elite: c.el || [], enraged: c.en, flash: 0, stun: 0, spd0: 1, spd: 1, dmg: 0, sv: 1, atk: 0, shW: 0, net: true, tx: c.x, tz: c.z, tyaw: c.yaw, atkKv: c.ak, castKv: c.ck };
  }
  function merge(old, list) {
    const byId = new Map(old.map((m) => [m.id, m]));
    return list.map((c) => {
      const m = byId.get(c.id);
      if (!m) return puppet(c);
      m.tx = c.x; m.tz = c.z; m.tyaw = c.yaw; m.hp = c.hp; m.maxHp = c.mhp; m.state = c.st; m.phase = c.ph; m.scale = c.sc; m.enraged = c.en; m.atkKv = c.ak; m.castKv = c.ck; m.elite = c.el || [];
      return m;
    });
  }
  return { RULES, hpMul, countMul, nearest, helpers, scaleQueue, WORLD_EVENTS, worldEvents, compact, puppet, merge };
})();
if (typeof module !== 'undefined') module.exports = RefereeCoop;
