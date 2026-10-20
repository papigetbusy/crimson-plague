// Controller checks: Hypershot's console layout, dead zones, one-shot presses, and the referee's right-stick turn.
const PadInput = require('../src/screen/pad_input.js');
const Referee = require('../src/referee.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const B = PadInput.BTN;
// a fake standard pad: axes = [leftX, leftY, rightX, rightY], held = list of button indexes
const pad = (axes, held) => ({ connected: true, axes: axes || [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: (held || []).includes(i), value: (held || []).includes(i) ? 1 : 0 })) });

t('A resting stick does nothing: drift inside the dead zone gives no move and no turn', (() => { const r = PadInput.create().read(pad([0.1, -0.08, 0.12, 0.1])); return r.mx === 0 && r.mz === 0 && r.padX === 0 && r.padY === 0; })());
t('Pushing the left stick up walks forward at full speed, and left or right strafes', (() => { const c = PadInput.create(); const f = c.read(pad([0, -1, 0, 0])), s = c.read(pad([1, 0, 0, 0])); return Math.abs(f.mz - 1) < 1e-9 && f.mx === 0 && Math.abs(s.mx - 1) < 1e-9 && s.mz === 0; })());
t('The right stick turns gently for a small push and fast for a full push', (() => { const c = PadInput.create(); const small = c.read(pad([0, 0, 0.4, 0])).padX, full = c.read(pad([0, 0, 1, 0])).padX; return small > 0 && small < 0.25 && Math.abs(full - 1) < 1e-9; })());
t('Right trigger fires and left trigger aims, only while held', (() => { const c = PadInput.create(); const a = c.read(pad(null, [B.RT])), b = c.read(pad(null, [B.LT])), n = c.read(pad()); return a.fire && !a.ads && b.ads && !b.fire && !n.fire && !n.ads; })());
t('A trigger that only reports a pressed amount (not a button) still counts', (() => { const p = pad(); p.buttons[B.RT] = { pressed: false, value: 0.8 }; return PadInput.create().read(p).fire; })());
t('Clicking the left stick starts a sprint that holds until you stop moving', (() => {
  const c = PadInput.create();
  c.read(pad([0, -1, 0, 0], [B.L3]));
  const hold = c.read(pad([0, -1, 0, 0]));
  const stop = c.read(pad([0, 0, 0, 0]));
  const again = c.read(pad([0, -1, 0, 0]));
  return hold.sprint && !stop.sprint && !again.sprint;
})());
t('Aiming cancels the sprint', (() => { const c = PadInput.create(); c.read(pad([0, -1, 0, 0], [B.L3])); return !c.read(pad([0, -1, 0, 0], [B.LT])).sprint; })());
t('B slides only while sprinting, once per press (standing still, B does nothing)', (() => {
  const c = PadInput.create();
  const stand = c.read(pad(null, [B.B]));
  c.read(pad());
  c.read(pad([0, -1, 0, 0], [B.L3]));
  c.read(pad([0, -1, 0, 0]));
  const run = c.read(pad([0, -1, 0, 0], [B.B])), held = c.read(pad([0, -1, 0, 0], [B.B]));
  return !stand.slide && !stand.reload && run.slide && !run.reload && !held.slide;
})());
t('X reloads (Square on PlayStation), once per press, whether standing or running', (() => {
  const c = PadInput.create();
  const a = c.read(pad(null, [B.X])), held = c.read(pad(null, [B.X]));
  c.read(pad());
  const run = c.read(pad([0, -1, 0, 0], [B.X]));
  return a.reload && !a.slide && !held.reload && run.reload;
})());
t('A confirms and Start pauses, once per press', (() => { const c = PadInput.create(); const a = c.read(pad(null, [B.A, B.START])), h = c.read(pad(null, [B.A, B.START])); return a.confirm && a.start && !h.confirm && !h.start; })());
t('D-pad left and right move between level-up cards one step per press', (() => { const c = PadInput.create(); const r = c.read(pad(null, [B.RIGHT])), held = c.read(pad(null, [B.RIGHT])), l = c.read(pad(null, [B.LEFT])); return r.nav === 1 && held.nav === 0 && l.nav === -1; })());
t('A flick of the left stick moves between cards too', (() => { const c = PadInput.create(); return c.read(pad([0.9, 0, 0, 0])).nav === 1 && c.read(pad([0.9, 0, 0, 0])).nav === 0 && c.read(pad([-0.9, 0, 0, 0])).nav === -1; })());
t('No pad connected gives nothing to read, and a pad with too few controls is not picked', PadInput.create().read(null) === null && PadInput.pick([{ connected: true, axes: [0, 0], buttons: [] }, null]) === null);
t('The first real controller is picked when several are listed', (() => { const a = pad(), b = pad(); return PadInput.pick([null, a, b]) === a; })());
t('Resetting forgets a held sprint (a controller that drops out mid-run does not leave you sprinting)', (() => { const c = PadInput.create(); c.read(pad([0, -1, 0, 0], [B.L3])); c.reset(); return !c.read(pad([0, -1, 0, 0])).sprint; })());

// ---- referee: the right stick turns the player ----
const yawAfter = (inp, secs) => { const ref = Referee.create(5); let out; for (let i = 0; i < secs * 60; i++) out = ref.step(1 / 60, inp); return out.state.player.yaw; };
t('Referee: a full right-stick push turns the player at the pad turn speed (about 3.4 radians a second)', Math.abs(yawAfter({ padX: 1 }, 1) - yawAfter({}, 1) - 3.4) < 0.1);
t('Referee: aiming slows the stick turn', Math.abs(yawAfter({ padX: 1, ads: true }, 1)) < Math.abs(yawAfter({ padX: 1 }, 1)) * 0.8);
t('Referee: pushing the stick left turns the other way and a stick past full tilt is clamped', yawAfter({ padX: -1 }, 1) < -3 && Math.abs(yawAfter({ padX: 5 }, 1) - yawAfter({ padX: 1 }, 1)) < 1e-9);
t('Referee: pushing the right stick up looks up, and the look is clamped', (() => { const ref = Referee.create(5); let out; for (let i = 0; i < 300; i++) out = ref.step(1 / 60, { padY: -1 }); return out.state.player.pitch > 1.4 && out.state.player.pitch <= 1.45 + 1e-9; })());
t('The Back button gives one map press per push, so holding it does not flicker the map open and shut', (() => { const c = PadInput.create(); const a = c.read(pad(null, [B.BACK])), b = c.read(pad(null, [B.BACK])), n = c.read(pad()), d = c.read(pad(null, [B.BACK])); return a.map && !b.map && !n.map && d.map; })());
process.exit(bad ? 1 : 0);
