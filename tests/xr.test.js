// Meta Quest controller checks: the two Touch controllers become one standard pad for the game's controller code, turning, and aim maths.
const XrInput = require('../src/screen/xr_input.js');
const PadInput = require('../src/screen/pad_input.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
// a fake Touch controller in xr-standard layout: buttons 0 trigger, 1 grip, 3 stick click, 4 A/X, 5 B/Y; axes 2/3 the stick
const touch = (hand, held, sx, sy) => ({ handedness: hand, gamepad: { axes: [0, 0, sx || 0, sy || 0], buttons: Array.from({ length: 6 }, (_, i) => ({ pressed: (held || []).includes(i), value: (held || []).includes(i) ? 1 : 0 })) } });
const read = (l, r) => PadInput.create().read(XrInput.toPad([l, r]));

t('No controllers gives no pad', XrInput.toPad([]) === null);
t('The made-up pad is one the game accepts as a real controller', !!PadInput.pick([XrInput.toPad([touch('left'), touch('right')])]));
t('Left stick forward walks forward', (() => { const r = read(touch('left', [], 0, -1), touch('right')); return Math.abs(r.mz - 1) < 1e-9 && r.mx === 0; })());
t('Right stick does not turn through the pad (the VR rig turns the body instead)', (() => { const r = read(touch('left'), touch('right', [], 1, 0)); return r.padX === 0 && r.padY === 0; })());
t('Right trigger fires, left trigger aims down sights', (() => { const a = read(touch('left'), touch('right', [0])), b = read(touch('left', [0]), touch('right')); return a.fire && !a.ads && b.ads && !b.fire; })());
t('A jumps and confirms, B slides only when moving', (() => { const a = read(touch('left'), touch('right', [4])); const b = read(touch('left', [], 0, -1), touch('right', [5])); return a.jump && a.confirm && b.slide; })());
t('X reloads', read(touch('left', [4]), touch('right')).reload);
t('Y pauses (Start), left grip swaps guns, left grip with Y opens the map', (() => { const y = read(touch('left', [5]), touch('right')), g = read(touch('left', [1]), touch('right')), m = read(touch('left', [1, 5]), touch('right')); return y.start && !y.swap && g.swap && !g.start && m.map && !m.start && !m.swap; })());
t('Right grip is not a pad button (the VR view reads it as grab), right stick click opens Gear, left stick click sprints', (() => { const a = read(touch('left'), touch('right', [1])), b = read(touch('left'), touch('right', [3])), c = read(touch('left', [3], 0, -1), touch('right')); return a.lockUse === undefined && !a.swap && b.gear && c.sprint; })());
t('Pushing the left stick fully forward sprints; a half push or a sideways push does not', XrInput.autoSprint(0.95, 0.1) && !XrInput.autoSprint(0.6, 0) && !XrInput.autoSprint(0.9, 0.8));
t('Right stick up/down moves between menu rows', (() => { const u = read(touch('left'), touch('right', [], 0, -1)), d = read(touch('left'), touch('right', [], 0, 1)); return u.navY === -1 && d.navY === 1; })());
t('Smooth turn: no turn in the dead zone, full speed at full tilt', (() => { const s = XrInput.createTurn(false); return s.step({ axes: [0, 0, 0.1, 0] }, 0.1, 3) === 0 && Math.abs(s.step({ axes: [0, 0, 1, 0] }, 0.1, 3) - 0.3) < 1e-9; })());
t('Snap turn: one step per flick, re-arms after the stick returns', (() => { const s = XrInput.createTurn(true), f = { axes: [0, 0, 1, 0] }, z = { axes: [0, 0, 0, 0] }; const a = s.step(f, 0.016), b = s.step(f, 0.016); s.step(z, 0.016); const c = s.step({ axes: [0, 0, -1, 0] }, 0.016); return a === XrInput.SNAP_ANGLE && b === 0 && c === -XrInput.SNAP_ANGLE; })());
t('Aim maths: straight ahead is yaw 0, right is +90 degrees, up is positive pitch', (() => { const f = XrInput.dirToAngles(0, 0, -1), r = XrInput.dirToAngles(1, 0, 0), u = XrInput.dirToAngles(0, 1, -1); return Math.abs(f.yaw) < 1e-9 && Math.abs(r.yaw - Math.PI / 2) < 1e-9 && u.pitch > 0.7; })());
t('Look toward: the look input moves the referee aim exactly onto the target (taking the short way round)', (() => {
  const cur = { yaw: 3.0, pitch: 0.1 }, tgt = { yaw: -3.0, pitch: -0.2 }, k = 0.0022;
  const l = XrInput.lookToward(cur, tgt, k, 1), ny = cur.yaw + l.lookX * k, np = cur.pitch - l.lookY * k;
  return Math.abs(XrInput.wrap(ny - tgt.yaw)) < 1e-9 && Math.abs(np - tgt.pitch) < 1e-9 && Math.abs(l.lookX * k) < 0.3;
})());
t('Head-relative walking: with your head turned 90 degrees right of the gun, stick forward walks right (strafe), and no turn changes nothing', (() => { const a = XrInput.headMove(0, 1, Math.PI / 2), b = XrInput.headMove(0.3, 0.7, 0); return Math.abs(a.mx - 1) < 1e-9 && Math.abs(a.mz) < 1e-9 && b.mx === 0.3 && b.mz === 0.7; })());
console.log(bad ? bad + ' failed' : 'all xr checks passed');
process.exit(bad ? 1 : 0);
