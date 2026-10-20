/* Gun status effects: what the colour on a gun does to a monster it hits. Pure rules (no browser, no clock, no random of their own).
   fire = burns, poison = toxin over time, ice = slows then freezes, electric = arcs to nearby monsters, radiation = a pulse that irradiates everything around,
   dark = drains health back to you and makes the target take more damage, light = smites (stuns). A gun carries one, a legendary two, and a better rarity makes each stronger. */
const RefereeGunFx = (function () {
  const FX = {
    power: 0.2,                                    // each rarity step adds this much strength (common 1.0 up to legendary 1.8)
    burnFrac: 0.6, burnDur: 3,                     // a burn deals this share of the hit's damage over this many seconds
    toxinFrac: 0.8, toxinDur: 4,
    chillSlow: 0.5, chillDur: 2.5, freezeAt: 5, freezeDur: 1.4,   // chilled monsters move at half speed; the fifth chill in a row freezes them solid for a moment
    arcFrac: 0.5, arcRange: 4, arcCount: 2,        // lightning jumps to this many other monsters within this range for this share of the damage
    radFrac: 0.35, radRadius: 3, radDot: 0.15, radDur: 3,   // a radiation pulse hurts everything in range, then keeps burning them
    drainFrac: 0.12, witherMul: 0.15, witherDur: 3,  // dark: heal this share of damage dealt; the target takes this much extra damage for a while
    smiteStun: 0.8, shockShow: 0.35, tick: 0.25
  };
  function create(env) {
    const g = (m) => m.gx || (m.gx = { burn: null, toxin: null, rad: null, chill: 0, chillT: 0, freezeT: 0, wither: 0, witherMul: 0, shock: 0, tick: 0 });
    const landed = (m, kind) => env.event({ type: 'status', id: m.id, kind, x: m.x, y: 1.2 * m.scale, z: m.z });
    const dot = (m, key, dps, dur, kind) => { const f = g(m), s = f[key]; if (!s) landed(m, kind); f[key] = { t: dur, dps: Math.max(s ? s.dps : 0, dps) }; };
    // a direct hit from a gun carrying these statuses
    function hit(m, dmg, item) {
      if (!item || !item.status || !item.status.length) return;
      const k = 1 + FX.power * item.rarity + (item.affixes || []).reduce((n, a) => n + (a.stat === 'status' ? a.v : 0), 0), alive = m.hp > 0, f = g(m);
      for (const st of item.status) {
        if (st === 'fire' && alive) dot(m, 'burn', dmg * FX.burnFrac * k / FX.burnDur, FX.burnDur, 'burn');
        else if (st === 'poison' && alive) dot(m, 'toxin', dmg * FX.toxinFrac * k / FX.toxinDur, FX.toxinDur, 'poison');
        else if (st === 'ice' && alive) {
          if (!(f.chillT > 0)) landed(m, 'chill');
          f.chillT = FX.chillDur; f.chill++;
          if (f.chill >= FX.freezeAt) { f.chill = 0; f.freezeT = FX.freezeDur * k; env.event({ type: 'freeze', id: m.id, x: m.x, z: m.z }); }
        } else if (st === 'electric') {
          f.shock = FX.shockShow;
          const near = env.monsters().filter((o) => o !== m && o.hp > 0 && Math.hypot(o.x - m.x, o.z - m.z) < FX.arcRange).sort((a, b) => Math.hypot(a.x - m.x, a.z - m.z) - Math.hypot(b.x - m.x, b.z - m.z)).slice(0, FX.arcCount);
          for (const o of near) { g(o).shock = FX.shockShow; env.event({ type: 'arc', x1: m.x, y1: 1.2 * m.scale, z1: m.z, x2: o.x, y2: 1.2 * o.scale, z2: o.z }); env.damage(o, dmg * FX.arcFrac * k, false, o.x, 1.2 * o.scale, o.z, true, false); }
        } else if (st === 'radiation') {
          env.event({ type: 'radPulse', x: m.x, z: m.z, r: FX.radRadius });
          for (const o of env.monsters()) if (o.hp > 0 && Math.hypot(o.x - m.x, o.z - m.z) < FX.radRadius + 0.5 * o.scale) {
            if (o !== m) env.damage(o, dmg * FX.radFrac * k, false, o.x, 1.2 * o.scale, o.z, true, false);
            if (o.hp > 0) dot(o, 'rad', dmg * FX.radDot * k, FX.radDur, 'rad');
          }
        } else if (st === 'dark') {
          env.heal(dmg * FX.drainFrac * k);
          if (alive) { if (!(f.wither > 0)) landed(m, 'wither'); f.wither = FX.witherDur; f.witherMul = FX.witherMul * k; }
        } else if (st === 'light' && alive) { m.stun = Math.max(m.stun || 0, FX.smiteStun * k); landed(m, 'smite'); }
      }
    }
    const takenMul = (m) => (m.gx && m.gx.wither > 0 ? 1 + m.gx.witherMul : 1);
    const slowOf = (m) => (m.gx ? (m.gx.freezeT > 0 ? 0.05 : m.gx.chillT > 0 ? FX.chillSlow : 1) : 1);
    function update(dt) {
      for (const m of env.monsters()) {
        const f = m.gx; if (!f) continue;
        f.wither -= dt; f.chillT -= dt; f.freezeT -= dt; f.shock -= dt; if (f.chillT <= 0) f.chill = 0;
        f.tick += dt; if (f.tick < FX.tick) continue;
        const step = f.tick; f.tick = 0;
        for (const key of ['burn', 'toxin', 'rad']) {
          const s = f[key]; if (!s) continue;
          s.t -= step; if (s.t <= 0) f[key] = null;
          if (m.hp > 0) env.damage(m, s.dps * step, false, m.x, 1.2 * m.scale, m.z, true, true);
        }
      }
    }
    // for the snapshot: what is on this monster right now
    const view = (m) => { const f = m.gx; return f ? { burning: !!f.burn, toxic: !!f.toxin, chilled: f.chillT > 0 || f.freezeT > 0, frozen: f.freezeT > 0, irradiated: !!f.rad, withered: f.wither > 0, shocked: f.shock > 0, smitten: (m.stun || 0) > 0.3 } : null; };
    return { hit, update, takenMul, slowOf, view };
  }
  return { FX, create };
})();
if (typeof module !== 'undefined') module.exports = RefereeGunFx;
