// Meta Quest controller checks: the Touch controllers as one standard pad (VR shooter layout), turning, aim maths, and the hand-reload steps.
const XrInput = require('../src/screen/xr_input.js');
const PadInput = require('../src/screen/pad_input.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
// a fake Touch controller in xr-standard layout: buttons 0 trigger, 1 grip, 3 stick click, 4 A/X, 5 B/Y; axes 2/3 the stick
const touch = (hand, held, sx, sy) => ({ handedness: hand, gamepad: { axes: [0, 0, sx || 0, sy || 0], buttons: Array.from({ length: 6 }, (_, i) => ({ pressed: (held || []).includes(i), value: (held || []).includes(i) ? 1 : 0 })) } });
const read = (l, r, o) => PadInput.create().read(XrInput.toPad([l, r], o));

t('No controllers gives no pad', XrInput.toPad([]) === null);
t('The made-up pad is one the game accepts as a real controller', !!PadInput.pick([XrInput.toPad([touch('left'), touch('right')])]));
t('Left stick forward walks forward', (() => { const r = read(touch('left', [], 0, -1), touch('right')); return Math.abs(r.mz - 1) < 1e-9 && r.mx === 0; })());
t('Right stick left/right does not turn through the pad (the VR rig turns the body)', (() => { const r = read(touch('left'), touch('right', [], 1, 0)); return r.padX === 0 && r.padY === 0; })());
t('Right trigger fires, left trigger aims down sights', (() => { const a = read(touch('left'), touch('right', [0])), b = read(touch('left', [0]), touch('right')); return a.fire && !a.ads && b.ads && !b.fire; })());
t('Right stick up jumps; A does not jump or reload (A drops the magazine)', (() => { const a = read(touch('left'), touch('right', [], 0, -1)), b = read(touch('left'), touch('right', [4])); return a.jump && !b.jump && !b.reload; })());
t('X is the instant reload, always', read(touch('left', [4]), touch('right')).reload && read(touch('left', [4]), touch('right'), { easyReload: true }).reload);
t('B slides while moving', read(touch('left', [], 0, -1), touch('right', [5])).slide);
t('Y pauses, right stick click swaps guns, X + Y opens Gear (and does not reload or pause)', (() => { const y = read(touch('left', [5]), touch('right')), s = read(touch('left'), touch('right', [3])), g = read(touch('left', [4, 5]), touch('right')); return y.start && !y.swap && s.swap && g.gear && !g.reload && !g.start; })());
t('Grips are not pad buttons (the VR view uses them as hands)', (() => { const a = read(touch('left', [1]), touch('right', [1])); return !a.swap && !a.fire && a.lockUse === undefined && !a.start; })());
t('Left stick click sprints, right stick down is the second gate action', (() => { const c = read(touch('left', [3], 0, -1), touch('right')), d = read(touch('left'), touch('right', [], 0, 1)); return c.sprint && d.lockUse === 1; })());
t('Pushing the left stick fully forward sprints; a half push or a sideways push does not', XrInput.autoSprint(0.95, 0.1) && !XrInput.autoSprint(0.6, 0) && !XrInput.autoSprint(0.9, 0.8));
t('Smooth turn: nothing in the dead zone, a gentle half push, full speed at full tilt', (() => { const s = XrInput.createTurn(false); const z = s.step({ axes: [0, 0, 0.1, 0] }, 0.1, 4.5), h = s.step({ axes: [0, 0, 0.55, 0] }, 0.1, 4.5), f = s.step({ axes: [0, 0, 1, 0] }, 0.1, 4.5); return z === 0 && h > 0 && h < 0.45 * 0.45 && Math.abs(f - 0.45) < 1e-9; })());
t('Snap turn: 45 degrees by default, one step per flick, re-arms after the stick returns', (() => { const s = XrInput.createTurn(true), f = { axes: [0, 0, 1, 0] }, z = { axes: [0, 0, 0, 0] }; const a = s.step(f, 0.016), b = s.step(f, 0.016); s.step(z, 0.016); const c = s.step({ axes: [0, 0, -1, 0] }, 0.016); return Math.abs(a - Math.PI / 4) < 1e-9 && b === 0 && Math.abs(c + Math.PI / 4) < 1e-9; })());
t('Snap turn angle can be changed (?snap=30)', Math.abs(XrInput.createTurn(true, Math.PI / 6).step({ axes: [0, 0, 1, 0] }, 0.016) - Math.PI / 6) < 1e-9);
t('Aim maths: straight ahead is yaw 0, right is +90 degrees, up is positive pitch', (() => { const f = XrInput.dirToAngles(0, 0, -1), r = XrInput.dirToAngles(1, 0, 0), u = XrInput.dirToAngles(0, 1, -1); return Math.abs(f.yaw) < 1e-9 && Math.abs(r.yaw - Math.PI / 2) < 1e-9 && u.pitch > 0.7; })());
t('Look toward: the look input moves the referee aim exactly onto the target (taking the short way round)', (() => {
  const cur = { yaw: 3.0, pitch: 0.1 }, tgt = { yaw: -3.0, pitch: -0.2 }, k = 0.0022;
  const l = XrInput.lookToward(cur, tgt, k, 1), ny = cur.yaw + l.lookX * k, np = cur.pitch - l.lookY * k;
  return Math.abs(XrInput.wrap(ny - tgt.yaw)) < 1e-9 && Math.abs(np - tgt.pitch) < 1e-9 && Math.abs(l.lookX * k) < 0.3;
})());
t('Head-relative walking: head 90 degrees right of the gun turns stick-forward into a right strafe', (() => { const a = XrInput.headMove(0, 1, Math.PI / 2), b = XrInput.headMove(0.3, 0.7, 0); return Math.abs(a.mx - 1) < 1e-9 && Math.abs(a.mz) < 1e-9 && b.mx === 0.3 && b.mz === 0.7; })());
// hand reload
const F = (o) => Object.assign({ kind: 'mag', eject: false, gripDown: false, gripHeld: false, hand: [9, 9, 9], hip: false, port: [0, 0, 0], rack: [0, 0.2, 0], back: [0, 0, 1], ammo: 0, mag: 12 }, o);
t('Magazine gun: A drops the mag (starts the game reload), grip at the belt takes one, near the magwell it snaps in and the gun chambers itself', (() => {
  const r = XrInput.createReload(); const a = r.step(F({ eject: true })), b = r.step(F({ gripDown: true, gripHeld: true, hip: true })), c = r.step(F({ gripHeld: true, hand: [0.1, -0.1, 0.1] }));
  return a.reload && !a.fire && b.step === 'mag' && c.seated && c.step === 'ready' && c.fire && !b.reload && !c.reload;
})());
t('Rack mode (?rack): an empty gun needs the slide pulled back after the mag goes in', (() => {
  const r = XrInput.createReload({ rack: true }); r.step(F({ eject: true })); r.step(F({ gripDown: true, gripHeld: true, hip: true }));
  const s1 = r.step(F({ gripHeld: true, hand: [0, 0.05, 0] })), s2 = r.step(F({ gripDown: true, gripHeld: true, hand: [0, 0.2, 0] })), s3 = r.step(F({ gripHeld: true, hand: [0, 0.2, 0.03] })), s4 = r.step(F({ gripHeld: true, hand: [0, 0.2, 0.07] }));
  return s1.step === 'rack' && !s2.fire && s3.pull > 0.3 && s3.pull < 1 && s4.step === 'ready';
})());
t('Rack mode with a round still in: no rack needed', (() => { const r = XrInput.createReload({ rack: true }); r.step(F({ eject: true, ammo: 4 })); r.step(F({ gripDown: true, gripHeld: true, hip: true })); return r.step(F({ gripHeld: true, hand: [0, 0, 0.05] })).step === 'ready'; })());
t('Letting go of the new mag drops it (grab another); A on a full gun does nothing; grabbing away from the belt gives nothing', (() => { const r = XrInput.createReload(); r.step(F({ eject: true })); r.step(F({ gripDown: true, gripHeld: true, hip: true })); const d = r.step(F({ gripHeld: false })); const full = XrInput.createReload().step(F({ eject: true, ammo: 12 })); const r3 = XrInput.createReload(); r3.step(F({ eject: true })); const away = r3.step(F({ gripDown: true, gripHeld: true })); return d.step === 'ejected' && full.step === 'ready' && !full.reload && away.step === 'ejected'; })());
t('Shotgun: shells one at a time from the belt into the port (up to 4), each one counted, then ready', (() => {
  const r = XrInput.createReload(), S = (o) => F(Object.assign({ kind: 'shell', ammo: 2, mag: 8 }, o)); const out = [];
  out.push(r.step(S({ gripDown: true, gripHeld: true, hip: true })));
  for (let i = 0; i < 4; i++) { if (i) out.push(r.step(S({ gripDown: true, gripHeld: true, hip: true }))); out.push(r.step(S({ gripHeld: true, hand: [0, 0, 0] }))); out.push(r.step(S({}))); }
  const shells = out.filter((x) => x.shell).length, last = out[out.length - 1];
  return out[0].reload && out[0].step === 'shell' && out[0].need === 4 && shells === 4 && last.step === 'ready' && out.filter((x) => x.reload).length === 1;
})());
t('Shotgun with rack mode pumps after the last shell', (() => { const r = XrInput.createReload({ rack: true }), S = (o) => F(Object.assign({ kind: 'shell', ammo: 7, mag: 8 }, o)); r.step(S({ gripDown: true, gripHeld: true, hip: true })); return r.step(S({ gripHeld: true, hand: [0, 0, 0] })).step === 'rack'; })());
t('After the game reloads by itself (last round), the hand steps still apply: magazine already out, or shells needed', (() => { const r = XrInput.createReload(), s = XrInput.createReload(); return r.autoEject('mag') && r.state === 'ejected' && s.autoEject('shell', 8) && s.state === 'loading'; })());
console.log(bad ? bad + ' failed' : 'all xr checks passed');
process.exit(bad ? 1 : 0);
