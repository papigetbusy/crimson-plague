/* Meta Quest (WebXR) controller input: turns the two Touch controllers into one "standard" gamepad, so the game's existing
   controller code (pad_input.js, Hypershot layout) drives everything: moving, firing, menus, level-up cards.
   Pure logic, no DOM and no clock, so tests can feed it fake controllers.

   Quest Touch (xr-standard mapping)            -> standard pad button         -> game action
     Left stick                                 -> left stick                  -> move (flick = move between menu cards)
     Left stick click                           -> L3                          -> sprint
     Right stick left/right                     -> (handled by the XR view)    -> turn (smooth, or snap with ?snap)
     Right stick up/down                        -> D-pad up/down               -> move between card rows in menus
     Right trigger                              -> RT                          -> fire
     Left trigger                               -> LT                          -> aim down sights
     Right grip                                 -> LB                          -> use gold gate / boss door puzzle
     Left grip                                  -> Y                           -> swap guns
     A (right)                                  -> A                           -> jump / confirm / pick up
     B (right)                                  -> B                           -> slide
     X (left)                                   -> X                           -> reload
     Y (left)                                   -> Start                       -> pause / resume
     Right stick click                          -> RB                          -> Gear menu
     Left grip + Y                              -> Back                        -> big map
   Aim comes from the right controller's ray (head gaze if there is no right controller). */
const XrInput = (function () {
  const XR = { TRIGGER: 0, GRIP: 1, STICK: 3, LOW: 4, HIGH: 5 };   // xr-standard button order; LOW = A/X, HIGH = B/Y
  const STICK_X = 2, STICK_Y = 3;                                   // xr-standard axes for the thumbstick
  const TURN_DEAD = 0.2, SNAP_ON = 0.7, SNAP_OFF = 0.35, SNAP_ANGLE = Math.PI / 6, ROW = 0.6;

  const pressed = (gp, i) => { const b = gp && gp.buttons && gp.buttons[i]; return !!b && (b.pressed || b.value > 0.35); };
  const value = (gp, i) => { const b = gp && gp.buttons && gp.buttons[i]; return b ? (b.value || (b.pressed ? 1 : 0)) : 0; };
  const ax = (gp, i) => (gp && gp.axes && typeof gp.axes[i] === 'number' ? gp.axes[i] : 0);
  // Quest reports the stick on axes 2/3; very old runtimes used 0/1
  const stick = (gp, k) => (gp && gp.axes && gp.axes.length >= 4 ? ax(gp, k + 2) : ax(gp, k));

  // sources: list of { handedness: 'left'|'right', gamepad }. Returns a Gamepad-shaped object pad_input.js can read, or null.
  function toPad(sources) {
    let L = null, R = null;
    for (const s of sources || []) { if (!s || !s.gamepad) continue; if (s.handedness === 'left') L = s.gamepad; else if (s.handedness === 'right') R = s.gamepad; }
    if (!L && !R) return null;
    const btn = (on, v) => ({ pressed: !!on, value: v !== undefined ? v : (on ? 1 : 0) });
    const lGrip = pressed(L, XR.GRIP), lHigh = pressed(L, XR.HIGH), ry = stick(R, 1);
    const b = new Array(16);
    b[0] = btn(pressed(R, XR.LOW));                 // A
    b[1] = btn(pressed(R, XR.HIGH));                // B
    b[2] = btn(pressed(L, XR.LOW));                 // X
    b[3] = btn(lGrip && !lHigh);                    // Y  (swap)
    b[4] = btn(pressed(R, XR.GRIP));                // LB (use gate / puzzle)
    b[5] = btn(pressed(R, XR.STICK));               // RB (gear)
    b[6] = btn(pressed(L, XR.TRIGGER), value(L, XR.TRIGGER));   // LT (aim)
    b[7] = btn(pressed(R, XR.TRIGGER), value(R, XR.TRIGGER));   // RT (fire)
    b[8] = btn(lGrip && lHigh);                     // Back (map)
    b[9] = btn(lHigh && !lGrip);                    // Start (pause)
    b[10] = btn(pressed(L, XR.STICK));              // L3 (sprint)
    b[11] = btn(false);                             // R3
    b[12] = btn(ry < -ROW); b[13] = btn(ry > ROW);  // D-pad up / down from the right stick
    b[14] = btn(false); b[15] = btn(false);
    return { id: 'quest-touch', connected: true, mapping: 'standard', axes: [stick(L, 0), stick(L, 1), 0, 0], buttons: b };
  }

  // right-stick turning, done on the XR side so the body turns but your head and hand still aim freely
  function createTurn(snap) {
    let armed = true;
    // returns radians to add to the body yaw this frame
    function step(gpRight, dt, speed) {
      const x = stick(gpRight, 0);
      if (!snap) { const m = Math.abs(x); return m <= TURN_DEAD ? 0 : Math.sign(x) * ((m - TURN_DEAD) / (1 - TURN_DEAD)) * speed * dt; }
      if (armed && Math.abs(x) >= SNAP_ON) { armed = false; return Math.sign(x) * SNAP_ANGLE; }
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
  return { toPad, createTurn, dirToAngles, lookToward, wrap, SNAP_ANGLE };
})();
if (typeof module !== 'undefined') module.exports = XrInput;
