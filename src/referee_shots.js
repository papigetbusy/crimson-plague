/* Monster projectiles (spit, lightning bolts, fireballs): fly straight, stop at walls, hurt you on touch.
   You can dodge them by moving, and a slide passes right through (the owner's rule: untouchable the whole slide).
   Part of the referee: pure, no browser, clock or random. The referee hands in what it needs (env), so this file knows no rules of its own. */
const RefereeShots = (function () {
  // env: { nextId(), solidAt(x, z), player() -> { x, z, eye, sliding }, players() -> [{ x, z, eye, sliding, key }] (co-op), hurt(dmg, ownerId, key), event(e) }
  function create(env) {
    let list = [];
    // a projectile from (x, y, z) towards a target point, at speed units a second; it drops or climbs so that it reaches the target's height
    function fire(o) {
      const dx = o.tx - o.x, dz = o.tz - o.z, d = Math.hypot(dx, dz) || 0.001, t = d / o.speed;
      list.push({ id: env.nextId(), proj: o.proj, owner: o.owner, x: o.x, y: o.y, z: o.z, vx: dx / d * o.speed, vz: dz / d * o.speed, vy: (o.ty - o.y) / t, r: o.r, dmg: o.dmg, life: o.life || 5 });
    }
    function update(dt) {
      const crowd = env.players ? env.players() : [env.player()];      // co-op: every standing player can be hit
      for (const s of list) {
        s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.life -= dt;
        if (s.y < 0.05 || env.solidAt(s.x, s.z)) { s.life = -1; env.event({ type: 'projHit', proj: s.proj, x: s.x, y: Math.max(s.y, 0.1), z: s.z, onPlayer: false }); continue; }
        const P = crowd.find((q) => !q.sliding && Math.hypot(q.x - s.x, q.z - s.z) < s.r + 0.4 && Math.abs(s.y - (q.eye - 0.35)) < s.r + 0.9);
        if (P) {
          s.life = -1; env.hurt(s.dmg, s.owner, P.key);
          env.event({ type: 'projHit', proj: s.proj, x: s.x, y: s.y, z: s.z, onPlayer: true });
        }
      }
      list = list.filter((s) => s.life > 0);
    }
    const clear = () => { list = []; };
    const view = () => list.map((s) => ({ id: s.id, proj: s.proj, x: s.x, y: s.y, z: s.z, r: s.r }));
    return { fire, update, clear, view };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = RefereeShots;
