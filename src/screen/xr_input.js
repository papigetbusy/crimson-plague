/* Meta Quest (WebXR) controller input: turns the two Touch controllers into one "standard" gamepad, so the game's existing
   controller code (pad_input.js) drives moving, firing and the rest. Pure logic, no DOM and no clock, so tests can feed it fake controllers.
   The scheme follows common VR shooters (Half-Life: Alyx, HL2VR, Pavlov, Contractors), see docs/vr-design.md.

   Quest Touch (xr-standard mapping)       -> game action
     Left stick                            -> move (toward your head's facing)
     Left stick click / stick fully fwd    -> sprint
     Left trigger                          -> aim down sights
     Left grip (xr_mode)                   -> support hand: steady the gun at the foregrip, take a magazine / shell at the belt or over the shoulder, rack or pump
     X                                     -> instant reload (always works, whatever the reload mode)
     Y                                     -> pause / resume          X + Y -> Gear menu
     Right stick left/right (xr_mode)      -> turn (smooth with acceleration, or snap)
     Right stick up                        -> jump
     Right stick down                      -> second action at a gold gate / the boss door puzzle
     Right stick click                     -> swap guns
     Right trigger                         -> fire (menus: click where the laser points)
     Right grip (xr_mode)                  -> grab: pick up the gun at your feet, open the stash, use a gold gate
     A                                     -> drop the magazine (hand reload, magazine guns)
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
    b[2] = btn(lLow);                               // pad X = reload: X (the gun plays its reload animation; an empty gun also reloads by itself)
    b[3] = btn(pressed(R, XR.LOW));                 // pad Y = swap guns: A
    b[4] = btn(false);                              // LB: the right grip is read as a grab by the VR view instead (pick up / use)
    b[5] = btn(pressed(R, XR.STICK));               // RB (Gear menu): right stick click
    b[6] = btn(pressed(L, XR.TRIGGER), value(L, XR.TRIGGER));   // LT (aim)
    b[7] = btn(pressed(R, XR.TRIGGER), value(R, XR.TRIGGER));   // RT (fire)
    b[8] = btn(false);                              // Back (big map): in VR you HOLD the left grip and the map shows in your hand (xr_mode.js)
    b[9] = btn(lHigh);                              // Start (pause): Y
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
  return { autoSprint, headMove, toPad, createTurn, dirToAngles, lookToward, wrap, SNAP_ANGLE };
})();
if (typeof module !== 'undefined') module.exports = XrInput;
