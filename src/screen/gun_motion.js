/* Gun motion: look-only offsets for how the rifle idles, comes up, kicks, cycles its bolt and gets shown off.
   Every function returns small pose offsets { px, py, pz, rx, ry, rz } (metres and radians) that the screen adds to the gun's pose.
   Reload timing and rules stay with the referee. Pure maths, no THREE. */
const GunMotion = (function () {
  const Z = () => ({ px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 });
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
  const add = (a, b, k) => { for (const n in a) a[n] += b[n] * (k === undefined ? 1 : k); return a; };

  // slow breathing sway while standing; less when aiming, none when sprinting or sliding
  function idle(t, still, ads) {
    const k = still * (1 - ads * 0.8);
    return { px: Math.sin(t * 1.3) * 0.0035 * k, py: Math.sin(t * 1.9) * 0.004 * k, pz: 0, rx: Math.sin(t * 1.9 + 0.5) * 0.006 * k, ry: Math.sin(t * 1.1) * 0.005 * k, rz: Math.sin(t * 1.3 + 1) * 0.008 * k };
  }
  // the gun comes up from below with a little overshoot (k 0..1 over about 0.7 s)
  function equip(k) {
    if (k >= 1) return Z();
    const rise = 1 - smooth(k), over = Math.sin(clamp01(k) * Math.PI) * (k > 0.55 ? 0.35 : 0);
    return { px: 0.05 * rise, py: -0.38 * rise + 0.02 * over, pz: 0.12 * rise, rx: -0.7 * rise + 0.05 * over, ry: 0.5 * rise, rz: 0.35 * rise };
  }
  // gun inspect, two kinds (k 0..1 over the kind's length in seconds, see LENGTH). The gun is brought to the middle of the screen, a little back
  // so the whole length stays in view when it is turned side-on.
  //  'sides': lift it, turn it to show the right side, hold, turn it to show the left side, hold, bring it back
  //  'mag'  : tilt it away, the left hand pulls the magazine out and lifts it to the eye (see MAG_LOOK in the screen), spins it, slides it back in
  const LENGTH = { sides: 3.6, mag: 4.2 };
  const seg = (k, a, b) => smooth((k - a) / (b - a));
  function inspect(kind, k) {
    if (k <= 0 || k >= 1) return Z();
    if (kind === 'mag') {
      const on = seg(k, 0.0, 0.12) * (1 - seg(k, 0.86, 1));
      return { px: -0.2 * on, py: 0.03 * on, pz: -0.14 * on, rx: 0.12 * on, ry: -0.3 * on, rz: -0.12 * on };
    }
    const on = seg(k, 0, 0.12) * (1 - seg(k, 0.88, 1));
    const toRight = seg(k, 0.12, 0.3), toLeft = seg(k, 0.44, 0.64), home = seg(k, 0.78, 0.9);
    const yaw = -1.2 * toRight + 2.4 * toLeft - 1.2 * home;            // 0 -> -1.2 (right side to the eye) -> +1.2 (left side) -> 0
    const sway = Math.sin(k * 10) * 0.03 * on;                          // a little life while it is held
    return { px: -0.29 * on, py: 0.2 * on, pz: -0.4 * on, rx: 0.08 * on + sway, ry: yaw, rz: (-0.1 * Math.min(1, Math.abs(yaw))) + sway };
  }
  // how far the held magazine has turned (radians): shows its face, then its back, then turns back before it goes in
  function magSpin(k) { return 3 * seg(k, 0.42, 0.52) - 3 * seg(k, 0.6, 0.7); }
  // hold Reload on a full magazine for HOLD_SECS to start an inspect. s = { t, done } kept by the caller; returns true on the frame it should start.
  // Needs a release before it can trigger again, and the hold restarts if the magazine is not full.
  const HOLD_SECS = 2;
  function holdStep(s, dt, held, ok) {
    if (!held) { s.t = 0; s.done = false; return false; }
    if (!ok) { s.t = 0; return false; }
    if (s.done) return false;
    s.t += dt;
    if (s.t >= HOLD_SECS) { s.done = true; s.t = 0; return true; }
    return false;
  }
  // one shot's kick (k = 1 right after firing, falling to 0). dir = a per-shot random pair in -1..1, so the muzzle wanders a little
  function kick(k, ads, dir) {
    const a = 1 - ads * 0.5, d = dir || [0, 0];
    return { px: d[0] * 0.006 * k * a, py: 0.006 * k * a, pz: 0.075 * k * a, rx: 0.05 * k * (1 - ads * 0.4) + d[1] * 0.012 * k, ry: d[0] * 0.015 * k, rz: d[0] * 0.03 * k * a };
  }
  // the charging handle snaps back and forward on each shot (k = 1 right after firing). returns how far back it slides, in metres
  function bolt(k, travel) { return travel * Math.sin(clamp01(1 - k) * Math.PI) * (k > 0 ? 1 : 0); }
  return { idle, equip, inspect, magSpin, LENGTH, HOLD_SECS, holdStep, kick, bolt, add, Z };
})();
if (typeof module !== 'undefined') module.exports = GunMotion;
