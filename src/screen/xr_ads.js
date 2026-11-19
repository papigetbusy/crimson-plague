/* VR aim-down-sights: a small self-contained pose and fire-ray module.
   The gun's sight line (rear/front empties, or the M4 optic centre) blends onto the right
   eye's view axis at a per-gun eye-relief distance, with a critically damped settle of
   about 135 ms. While aiming, the gun is locked to that eye at that relief; rotation
   follows the primary controller with only a light tremor filter (no lag). The fire ray
   stays on the sight line and is zeroed at 25 m. Support-hand steering is unchanged
   (the caller still aims with both hands). The old ADS path is only used with ?oldads.
   Look-only: no rules, no numbers the referee needs. */
const XrAds = (function () {
  const ZERO_M = 25;
  const SETTLE = 0.12;                   // seconds to settle (~120-150 ms, critically damped)
  const EYE_X = 0.032;                   // right (dominant) eye: half a typical IPD
  const AIM_RATE = 28;                   // 1/s: light smoothing, no lag
  const HEAD_NEAR = 0.02;                // metres: close near-plane while aiming so an 8 cm optic is not clipped
  // one table, easy to tune. Per-type defaults; a gun id (rifle_m4) overrides.
  const TABLE = {
    pistol:    { relief: 0.30, aimRate: AIM_RATE, zoom: 0 },
    smg:       { relief: 0.18, aimRate: AIM_RATE, zoom: 0 },
    rifle:     { relief: 0.14, aimRate: AIM_RATE, zoom: 0 },
    rifle_m4:  { relief: 0.08, aimRate: AIM_RATE, zoom: 0 },   // eye on the optic centre
    shotgun:   { relief: 0.26, aimRate: AIM_RATE, zoom: 0 },     // cheek on the stock: the receiver's back face no longer fills the lower view
    sniper:    { relief: 0.10, aimRate: AIM_RATE, zoom: 4 },
    sniper_marksman: { zoom: 3 },                                 // per-scope magnification (the picture inside the lens; the view never zooms)
    sniper_rail:     { zoom: 5 },
    sniper_antimat:  { zoom: 6 },
    hmg:       { relief: 0.24, aimRate: AIM_RATE, zoom: 0 }
  };

  const of = (type, id) => Object.assign({}, TABLE[type] || TABLE.rifle, (id && TABLE[id]) || {});
  const useOld = (q) => /[?&#]oldads\b/.test(q || '');

  // implicit critically damped spring (no overshoot). settle = seconds to rest.
  function dampStep(x, v, xt, dt, settle) {
    const w = 5 / Math.max(0.02, settle || SETTLE);
    const den = 1 + 2 * w * dt + w * w * dt * dt;
    const v1 = (v - w * w * dt * (x - xt)) / den;
    return [x + v1 * dt, v1];
  }

  function norm(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function angleDeg(a, b) {
    const d = Math.max(-1, Math.min(1, dot(norm(a), norm(b))));
    return Math.acos(d) * 180 / Math.PI;
  }

  // rotate unit vector a onto unit vector b, as a quaternion [x,y,z,w]
  function quatFromTo(a, b) {
    a = norm(a); b = norm(b);
    const d = dot(a, b);
    if (d > 0.999999) return [0, 0, 0, 1];
    if (d < -0.999999) {
      const ax = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      const c = norm([a[1] * ax[2] - a[2] * ax[1], a[2] * ax[0] - a[0] * ax[2], a[0] * ax[1] - a[1] * ax[0]]);
      return [c[0], c[1], c[2], 0];
    }
    const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const q = [c[0], c[1], c[2], 1 + d], l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
  }
  function applyQuat(q, v) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
    return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
  }

  // gun-local pose that puts the sight at (0,0,-relief) in the anchor and the sight line along -Z
  function localAdsPose(sight, dir, relief, gs) {
    const k = gs || 1;
    const s = [sight[0] * k, sight[1] * k, sight[2] * k];
    const q = quatFromTo(dir && dir.length ? dir : [0, 0, -1], [0, 0, -1]);
    const r = applyQuat(q, s);
    return { px: -r[0], py: -r[1], pz: -relief - r[2], qx: q[0], qy: q[1], qz: q[2], qw: q[3] };
  }

  // fire ray on the sight line, zeroed at zeroDist (default 25 m).
  // origin is typically the right eye (ADS: it sits on the sight line) or the sight itself.
  // direction is toward the 25 m point, so a muzzle/bore line meets the sight line there.
  function fire(origin, sight, dir, muzzle, zeroDist) {
    const d = norm(dir && dir.length ? dir : [0, 0, -1]);
    const zd = zeroDist == null ? ZERO_M : zeroDist;
    const zero = add(sight, scale(d, zd));
    const fwd = norm(sub(zero, origin));
    const toSight = sub(sight, origin);
    const ang = Math.hypot(toSight[0], toSight[1], toSight[2]) < 1e-6 ? 0 : angleDeg(toSight, fwd);
    const bore = muzzle ? norm(sub(zero, muzzle)) : d;
    return { zero: zero, fwd: fwd, origin: origin, sight: sight, dir: d, bore: bore, angleDeg: ang };
  }

  function create() {
    let k = 0, kv = 0;
    return {
      reset: () => { k = 0; kv = 0; },
      value: () => k,
      step: (dt, aiming, settle) => {
        const r = dampStep(k, kv, aiming ? 1 : 0, Math.max(0, dt), settle || SETTLE);
        k = r[0]; kv = r[1];
        if (!aiming && k < 0.025) { k = 0; kv = 0; }
        if (aiming && k > 0.98) { k = 1; kv = 0; }
        if (k < 0) { k = 0; kv = 0; }
        if (k > 1) { k = 1; kv = 0; }
        return k;
      }
    };
  }

  return { TABLE, ZERO_M, SETTLE, EYE_X, AIM_RATE, HEAD_NEAR, of, useOld, dampStep, fire, localAdsPose, quatFromTo, applyQuat, angleDeg, norm, create };
})();
if (typeof module !== 'undefined') module.exports = XrAds;
