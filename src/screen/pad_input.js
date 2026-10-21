/* Controller input: turns a standard gamepad (Xbox layout) into the game's input, laid out like Hypershot's console controls.
   Pure logic, no DOM and no clock, so tests can feed it fake pads. The screen owns connecting and disconnecting;
   it calls read(pad) once a frame and merges the result into the input it sends to the referee.

   Layout (Hypershot, Xbox names / PlayStation in brackets):
     Left stick       move                      Right stick     look
     RT (R2)          fire (hold)               LT (L2)         aim down sights (hold)
     L3 (click left)  sprint (stays on until you stop moving or aim)
     B (Circle)       slide the way you are moving
     A (Cross)        jump
     X (Square)       reload
     Y (Triangle)     swap to the gun in your other hand
   Menus: A (Cross) confirms (start, resume, pick a level-up card, rise again), Start (Options) pauses and resumes, Back (View / Share) opens and closes the big map,
          D-pad or left stick left/right moves between level-up cards, up/down between the two rows (class skill row, gift row), and left/right picks the class on the start card.
   RB (Gear) opens and closes the Gear menu. LB uses a gold gate or the boss door puzzle (D-pad down is its second action, e.g. take gold back from the Scale). Not wired yet: abilities, R3 (melee). */
const PadInput = (function () {
  const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  const MOVE_DEAD = 0.15, LOOK_DEAD = 0.18, LOOK_CURVE = 1.7, TRIGGER = 0.35, FLICK = 0.6;

  // radial dead zone, then a curve so small pushes turn gently and a full push turns fast
  function shape(x, y, dead, curve) {
    const mag = Math.hypot(x, y);
    if (mag <= dead) return [0, 0];
    const m = Math.min(1, (mag - dead) / (1 - dead)), k = Math.pow(m, curve) / mag;
    return [x * k, y * k];
  }
  const down = (pad, i) => { const b = pad.buttons && pad.buttons[i]; return !!b && (b.pressed || b.value > TRIGGER); };
  const axis = (pad, i) => (pad.axes && typeof pad.axes[i] === 'number' ? pad.axes[i] : 0);

  function create() {
    let prev = {}, sprintOn = false, flick = 0, flickY = 0;
    const edge = (name, now) => { const e = now && !prev[name]; prev[name] = now; return e; };
    function reset() { prev = {}; sprintOn = false; flick = 0; flickY = 0; }

    // pad: a Gamepad (or anything shaped like one). Returns the play input plus one-shot menu presses.
    function read(pad) {
      if (!pad) return null;
      const [mx, mzUp] = shape(axis(pad, 0), axis(pad, 1), MOVE_DEAD, 1);
      const [padX, padY] = shape(axis(pad, 2), axis(pad, 3), LOOK_DEAD, LOOK_CURVE);
      const fire = down(pad, BTN.RT), ads = down(pad, BTN.LT);
      const moving = Math.hypot(mx, mzUp) > 0.2;
      if (edge('L3', down(pad, BTN.L3))) sprintOn = !sprintOn;
      if (!moving || ads) sprintOn = false;
      const sprinting = sprintOn;
      const bEdge = edge('B', down(pad, BTN.B));
      const slide = bEdge && (sprinting || moving), reload = edge('X', down(pad, BTN.X)), swap = edge('Y', down(pad, BTN.Y)), gear = edge('RB', down(pad, BTN.RB));
      // menus: D-pad or a flick of the left stick moves between cards
      const stickDir = mx > FLICK ? 1 : mx < -FLICK ? -1 : 0;
      const padDir = (down(pad, BTN.RIGHT) ? 1 : 0) - (down(pad, BTN.LEFT) ? 1 : 0);
      const dir = padDir || stickDir;
      const nav = dir !== 0 && dir !== flick ? dir : 0; flick = dir;
      const stickY = mzUp < -FLICK ? -1 : mzUp > FLICK ? 1 : 0, padY2 = (down(pad, BTN.DOWN) ? 1 : 0) - (down(pad, BTN.UP) ? 1 : 0);
      const dirY = padY2 || stickY, navY = dirY !== 0 && dirY !== flickY ? dirY : 0; flickY = dirY;       // up and down move between the two rows of level-up cards
      const confirm = edge('A', down(pad, BTN.A));
      const lb = edge('LB', down(pad, BTN.LB)), dd = edge('lockDown', down(pad, BTN.DOWN)), lockUse = lb ? 0 : dd ? 1 : undefined;     // at a gold gate or the boss door puzzle: LB is the first action, D-pad down the second
      const start = edge('START', down(pad, BTN.START)), map = edge('BACK', down(pad, BTN.BACK));
      return { mx, mz: -mzUp, padX, padY, fire, ads, sprint: sprinting, slide, jump: confirm, reload, swap, gear, reloadHeld: down(pad, BTN.X), nav, confirm, start, map, navY, lockUse };
    }
    return { read, reset };
  }
  // the first connected pad that looks like a real controller (two sticks and a full set of buttons)
  function pick(pads) {
    for (const p of pads || []) if (p && p.connected && p.axes && p.axes.length >= 4 && p.buttons && p.buttons.length >= 10) return p;
    return null;
  }
  return { create, pick, shape, BTN };
})();
if (typeof module !== 'undefined') module.exports = PadInput;
