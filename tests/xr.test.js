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
t('Right stick up jumps; A does not jump (A drops the magazine)', (() => { const a = read(touch('left'), touch('right', [], 0, -1)), b = read(touch('left'), touch('right', [4])); return a.jump && !b.jump && !b.reload; })());
t('With ?easyreload, A reloads', read(touch('left'), touch('right', [4]), { easyReload: true }).reload);
t('B slides while moving', read(touch('left', [], 0, -1), touch('right', [5])).slide);
t('X swaps guns, Y pauses, X with Y opens the map', (() => { const x = read(touch('left', [4]), touch('right')), y = read(touch('left', [5]), touch('right')), m = read(touch('left', [4, 5]), touch('right')); return x.swap && !x.start && y.start && !y.swap && m.map && !m.start && !m.swap; })());
t('Grips are not pad buttons (the VR view uses them as hands)', (() => { const a = read(touch('left', [1]), touch('right', [1])); return !a.swap && !a.fire && a.lockUse === undefined && !a.start; })());
t('Right stick click opens Gear, left stick click sprints, right stick down is the second gate action', (() => { const b = read(touch('left'), touch('right', [3])), c = read(touch('left', [3], 0, -1), touch('right')), d = read(touch('left'), touch('right', [], 0, 1)); return b.gear && c.sprint && d.lockUse === 1; })());
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
const F = (o) => Object.assign({ eject: false, gripDown: false, gripHeld: false, hand: [9, 9, 9], hip: false, magwell: [0, 0, 0], rack: [0, 0.2, 0], back: [0, 0, 1], ammo: 0, mag: 12 }, o);
t('Hand reload, empty gun: A drops the mag (starts the game reload), grip at hip takes one, magwell inserts, pulling the slide back finishes', (() => {
  const r = XrInput.createReload(); const s = [];
  s.push(r.step(F({ eject: true })));                                  // ejected
  s.push(r.step(F({ gripDown: true, gripHeld: true, hip: true })));    // mag in hand
  s.push(r.step(F({ gripHeld: true, hand: [0, 0.05, 0] })));           // into the magwell -> rack (gun was empty)
  s.push(r.step(F({ gripDown: true, gripHeld: true, hand: [0, 0.2, 0] })));   // grab the slide
  s.push(r.step(F({ gripHeld: true, hand: [0, 0.2, 0.09] })));         // pull it back 9cm
  return s[0].reload && s[0].step === 'ejected' && !s[0].fire && s[1].step === 'mag' && s[2].step === 'rack' && !s[3].fire && s[4].step === 'ready' && s[4].fire && s.every((x, i) => (i === 0) === x.reload);
})());
t('Hand reload with a round still in: no rack needed after the new mag goes in', (() => { const r = XrInput.createReload(); r.step(F({ eject: true, ammo: 4 })); r.step(F({ gripDown: true, gripHeld: true, hip: true })); return r.step(F({ gripHeld: true, hand: [0, 0, 0.05] })).step === 'ready'; })());
t('Letting go of the new mag before the gun drops it (take another); A on a full gun does nothing', (() => { const r = XrInput.createReload(); r.step(F({ eject: true })); r.step(F({ gripDown: true, gripHeld: true, hip: true })); const d = r.step(F({ gripHeld: false })); const r2 = XrInput.createReload(); const full = r2.step(F({ eject: true, ammo: 12 })); return d.step === 'ejected' && full.step === 'ready' && !full.reload; })());
t('Grabbing away from the hip does not give a magazine', (() => { const r = XrInput.createReload(); r.step(F({ eject: true })); return r.step(F({ gripDown: true, gripHeld: true, hip: false })).step === 'ejected'; })());
t('When the game reloads by itself after the last round, the hand steps are still needed (mag already dropped, slide must be racked)', (() => { const r = XrInput.createReload(); const a = r.autoEject(); r.step(F({ gripDown: true, gripHeld: true, hip: true })); return a && r.step(F({ gripHeld: true, hand: [0, 0, 0] })).step === 'rack'; })());
console.log(bad ? bad + ' failed' : 'all xr checks passed');
process.exit(bad ? 1 : 0);
