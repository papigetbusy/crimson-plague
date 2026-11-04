/* Meta Quest (WebXR) controller input: turns the two Touch controllers into one "standard" gamepad, so the game's existing
   controller code (pad_input.js) drives moving, firing and the rest. Pure logic, no DOM and no clock, so tests can feed it fake controllers.
   The scheme follows common VR shooters (Half-Life: Alyx, HL2VR, Pavlov, Contractors), see docs/vr-design.md.

   Quest Touch (xr-standard mapping)       -> game action
     Left stick                            -> move (toward your head's facing)
     Left stick click / stick fully fwd    -> sprint
     Left trigger                          -> aim down sights
     Left grip (xr_mode)                   -> support hand: steady the gun at the foregrip, take a magazine at the hip / over the shoulder, rack the slide
     X                                     -> swap guns
     Y                                     -> pause / resume          X + Y -> big map
     Right stick left/right (xr_mode)      -> turn (smooth with acceleration, or snap)
     Right stick up                        -> jump
     Right stick down                      -> second action at a gold gate / the boss door puzzle
     Right stick click                     -> Gear menu
     Right trigger                         -> fire (menus: click where the laser points)
     Right grip (xr_mode)                  -> grab: pick up the gun at your feet, open the stash, use a gold gate
     A                                     -> drop the magazine (physical reload); with ?easyreload A just reloads
     B                                     -> slide
   No D-pad on Quest, and menus use the laser pointer, not the sticks. */
const XrInput = (function () {
  const XR = { TRIGGER: 0, GRIP: 1, STICK: 3, LOW: 4, HIGH: 5 };   // xr-standard button order; LOW = A/X, HIGH = B/Y
  const STICK_X = 2, STICK_Y = 3;                                   // xr-standard axes for the thumbstick
  const TURN_DEAD = 0.15, SNAP_ON = 0.7, SNAP_OFF = 0.35, SNAP_ANGLE = Math.PI / 4, ROW = 0.6;

  const pressed = (gp, i) => { const b = gp && gp.buttons && gp.buttons[i]; return !!b && (b.pressed || b.value > 0.35); };
  const value = (gp, i) => { const b = gp && gp.buttons && gp.buttons[i]; return b ? (b.value || (b.pressed ? 1 : 0)) : 0; };
  const ax = (gp, i) => (gp && gp.axes && typeof gp.axes[i] === 'number' ? gp.axes[i] : 0);
  // Quest reports the stick on axes 2/3; very old runtimes used 0/1
  const stick = (gp, k) => (gp && gp.axes && gp.axes.length >= 4 ? ax(gp, k + 2) : ax(gp, k));

  // sources: list of { handedness: 'left'|'right', gamepad }. Returns a Gamepad-shaped object pad_input.js can read, or null.
  function toPad(sources, o) {
    let L = null, R = null;
    for (const s of sources || []) { if (!s || !s.gamepad) continue; if (s.handedness === 'left') L = s.gamepad; else if (s.handedness === 'right') R = s.gamepad; }
    if (!L && !R) return null;
    const btn = (on, v) => ({ pressed: !!on, value: v !== undefined ? v : (on ? 1 : 0) });
    const lLow = pressed(L, XR.LOW), lHigh = pressed(L, XR.HIGH), ry = stick(R, 1);
    const b = new Array(16);
    b[0] = btn(ry < -ROW);                          // pad A = jump: right stick up
    b[1] = btn(pressed(R, XR.HIGH));                // pad B = slide: B
    b[2] = btn(!!(o && o.easyReload) && pressed(R, XR.LOW));   // pad X = reload: only in easy-reload mode (A); otherwise reloading is done by hand
    b[3] = btn(lLow && !lHigh);                     // pad Y = swap: X
    b[4] = btn(false);                              // LB: the right grip is read as a grab by the VR view instead (pick up / use)
    b[5] = btn(pressed(R, XR.STICK));               // RB (gear)
    b[6] = btn(pressed(L, XR.TRIGGER), value(L, XR.TRIGGER));   // LT (aim)
    b[7] = btn(pressed(R, XR.TRIGGER), value(R, XR.TRIGGER));   // RT (fire)
    b[8] = btn(lLow && lHigh);                      // Back (map): X + Y
    b[9] = btn(lHigh && !lLow);                     // Start (pause): Y
    b[10] = btn(pressed(L, XR.STICK));              // L3 (sprint)
    b[11] = btn(false);                             // R3
    b[12] = btn(false); b[13] = btn(ry > ROW);      // D-pad down = right stick down (gate second action)
    b[14] = btn(false); b[15] = btn(false);
    return { id: 'quest-touch', connected: true, mapping: 'standard', axes: [stick(L, 0), stick(L, 1), 0, 0], buttons: b };
  }

  // right-stick turning, done on the XR side so the body turns but your head and hand still aim freely
  function createTurn(snap, snapAngle) {
    const SNAP = snapAngle || SNAP_ANGLE;
    let armed = true;
    // returns radians to add to the body yaw this frame
    function step(gpRight, dt, speed) {
      const x = stick(gpRight, 0);
      if (!snap) { const m = Math.abs(x); return m <= TURN_DEAD ? 0 : Math.sign(x) * Math.pow((m - TURN_DEAD) / (1 - TURN_DEAD), 1.8) * speed * dt; }   // a curve: gentle near the centre, full speed at full tilt
      if (armed && Math.abs(x) >= SNAP_ON) { armed = false; return Math.sign(x) * SNAP; }
      if (Math.abs(x) <= SNAP_OFF) armed = true;
      return 0;
    }
    return { step, reset: () => { armed = true; } };
  }

  // a world direction -> the game's yaw / pitch (yaw 0 looks down -z, positive yaw turns right; pitch up is positive)
  function dirToAngles(x, y, z) {
    const l = Math.hypot(x, y, z) || 1;
    return { yaw: Math.atan2(x / l, -z / l), pitch: Math.asin(Math.max(-1, Math.min(1, y / l))) };
  }
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  // the mouse-style look input that moves the player's aim from (yaw, pitch) to the target in one referee step
  function lookToward(cur, target, lookSens, lookMul) {
    const k = lookSens * (lookMul || 1);
    return { lookX: wrap(target.yaw - cur.yaw) / k, lookY: (cur.pitch - Math.max(-1.45, Math.min(1.45, target.pitch))) / k };
  }
  // stick movement turned from the aim's frame into the head's frame (dYaw = head yaw - aim yaw), so you walk where you look
  function headMove(mx, mz, dYaw) {
    const c = Math.cos(dYaw), s = Math.sin(dYaw);
    return { mx: mx * c + mz * s, mz: mz * c - mx * s };
  }
  // auto-sprint: the left stick pushed almost all the way forward runs, like most VR shooters
  const autoSprint = (mz, mx) => mz > 0.85 && Math.abs(mx) < 0.5;
  // physical reload, step by step (like Half-Life: Alyx): A drops the magazine, the left grip takes a new one at the hip or over the shoulder,
  // bring it to the magwell, then rack the slide if the gun was empty. The game's own reload timer still decides when the ammo is back;
  // this only holds the trigger until your hands have done the work.
  function createReload() {
    let step = 'ready', empty = false, rackFrom = null;
    const near = (a, b, r) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= r;
    // f: { eject, gripDown, gripHeld, hand:[x,y,z], hip:bool, magwell:[x,y,z], rack:[x,y,z], back:[x,y,z] (unit vector toward the gun's rear), ammo, mag }
    // returns { step, fire (may the trigger fire), reload (send the game's reload once), buzz ('' | 'left' | 'right') }
    function step1(f) {
      const out = { reload: false, buzz: '' };
      if (step === 'ready' && f.eject && f.ammo < f.mag) { step = 'ejected'; empty = f.ammo <= 0; out.reload = true; out.buzz = 'right'; }
      else if (step === 'ejected' && f.gripDown && f.hip) { step = 'mag'; out.buzz = 'left'; }
      else if (step === 'mag' && !f.gripHeld) { step = 'ejected'; }                                          // dropped the new magazine: take another
      else if (step === 'mag' && near(f.hand, f.magwell, 0.13)) { step = empty ? 'rack' : 'ready'; out.buzz = 'right'; }
      else if (step === 'rack') {
        if (f.gripDown && near(f.hand, f.rack, 0.14)) rackFrom = f.hand.slice();
        if (rackFrom && !f.gripHeld) rackFrom = null;
        if (rackFrom) { const d = (f.hand[0] - rackFrom[0]) * f.back[0] + (f.hand[1] - rackFrom[1]) * f.back[1] + (f.hand[2] - rackFrom[2]) * f.back[2]; if (d >= 0.07) { step = 'ready'; rackFrom = null; out.buzz = 'right'; } }
      }
      out.step = step; out.fire = step === 'ready';
      return out;
    }
    // the game reloads by itself when the last round is fired: the empty magazine drops on its own and the slide stays back
    function autoEject() { if (step === 'ready') { step = 'ejected'; empty = true; return true; } return false; }
    return { step: step1, autoEject, reset: () => { step = 'ready'; rackFrom = null; }, get state() { return step; } };
  }
  return { createReload, autoSprint, headMove, toPad, createTurn, dirToAngles, lookToward, wrap, SNAP_ANGLE };
})();
if (typeof module !== 'undefined') module.exports = XrInput;
