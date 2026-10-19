/* Crimson Horned Fiend (Grok's model sheets, art-drop/monsters). A chunky voxel demon.
   Built in jointed parts so the screen can swing the legs, arms and head.
   Model space: feet at y = 0, +Y up, the face points to -Z, 1 voxel = VOX world units. */
const HornedFiend = (function () {
  const VOX = 0.06;
  const R = 0x8b1e1e, R3 = 0xa32828, R2 = 0x631414, DARK = 0x3a1c26, HORN = 0x4a1618, TOOTH = 0xcbbfa6;
  const EYE = 0xff4500, EYEHOT = 0xff9a1c, MOUTH = 0xd2300a;
  const V = 0.12;   // colour noise, as on the sheet (+/- 12%)

  function legGrid() {
    const g = new Voxel.Grid(21);
    g.ell(0, -5.5, 0, 5.4, 7.2, 5.4, R, V);          // thigh
    g.ell(0, -12.5, -1, 4.2, 3, 4.2, R3, V);      // knee
    g.box(0, -14, -5, 1, -11, -3, DARK, 0.05);      // knee spike
    g.ell(0, -18, 0.8, 4, 6.2, 4, R, V);        // calf
    g.ell(0, -24, 0.5, 3.4, 2, 3.4, R2, V);             // ankle
    g.box(-4, -28, -8, 4, -25, 2, R2, V);           // foot
    for (let x = -4; x < 4; x += 2) { g.box(x, -28, -11, x + 2, -26, -8, R, V); g.box(x, -28, -13, x + 2, -27, -11, DARK, 0.05); }
    return g;
  }
  function bodyGrid() {            // pelvis and tail, in model coordinates
    const g = new Voxel.Grid(22);
    g.ell(0, 28, 0, 8, 4.6, 5.2, R2, V);
    for (let i = 0; i < 11; i++) {
      const t = i / 10, r = 3.8 * (1 - 0.78 * t) + 0.7, z = 4 + i * 2.5, y = 26.5 - 4 * t * t;
      g.ell(0, y, z, r, r * 0.9, 2.4, R, V);
      if (i % 2 === 1) g.box(0, Math.round(y + r * 0.9), z - 1, 1, Math.round(y + r * 0.9) + 2, z + 1, R2, V);
    }
    g.box(0, 22, 31, 1, 24, 33, DARK, 0.05);        // tail tip
    return g;
  }
  function torsoGrid() {           // origin: the waist
    const g = new Voxel.Grid(23);
    g.ell(0, 3, -0.3, 7.2, 5, 4.6, R, V);           // belly
    g.ell(0, 10.5, -0.8, 10.4, 7, 6, R, V);       // chest
    g.mell(4.6, 11, -4.2, 4.4, 3.3, 2.2, R3, V);     // chest muscles
    g.box(0, 1, -5, 1, 9, -4, R2, 0.05);             // centre line
    g.ell(0, 17.5, -0.5, 3.6, 2.8, 3.4, R, V);       // neck
    g.mell(9.4, 15, 0, 5, 3.6, 5, R3, V);        // shoulders
    for (let s = -1; s <= 1; s += 2) {               // shoulder spikes
      const bx = (x0, x1, y0, y1, c) => g.box(s > 0 ? x0 : -x1, y0, -1, s > 0 ? x1 : -x0, y1, 1, c, 0.08);
      bx(10, 14, 17, 19, R2); bx(11, 14, 19, 21, R2); bx(12, 14, 21, 23, DARK);
    }
    for (let y = 5; y < 18; y += 3) { g.box(-1, y, 5, 1, y + 2, 8, R2, V); g.box(-1, y, 8, 1, y + 1, 9, DARK, 0.05); }   // back spines
    return g;
  }
  function headGrid() {            // origin: base of the neck
    const g = new Voxel.Grid(24);
    g.ell(0, 5.5, 0.5, 6.2, 5.4, 5.8, R, V);             // skull
    g.ell(0, 3.4, -5.6, 4, 2.8, 3.6, R, V);            // snout
    g.mell(3.3, 8.4, -4.6, 3.2, 1.3, 1.9, R2, V);      // brow
    g.ell(0, -0.3, -4, 4.4, 1.6, 4, R2, V);      // jaw
    g.box(-2, 0, -7, 2, 1, -6, MOUTH, 0.05, 'glow'); // mouth glow, seen between the teeth
    for (const x of [-3, -1, 1, 2]) g.box(x, 1, -8, x + 1, 3, -7, TOOTH, 0.08);     // upper fangs
    for (const x of [-2, 0, 2]) g.box(x, -1, -8, x + 1, 1, -7, TOOTH, 0.08);        // lower teeth
    g.mbox(2, 6, -7, 5, 8, -6, EYE, 0.05, 'glow');   // eyes
    g.mbox(2, 6, -7, 3, 8, -6, EYEHOT, 0.05, 'glow');
    for (let i = 0; i <= 11; i++) {                  // horns sweep up, out, then forward
      const t = i / 11, r = 2.3 * (1 - t) + 0.7;
      const col = t < 0.35 ? HORN : t < 0.7 ? R2 : R3;
      g.mell(4.6 + 3.6 * Math.sin(t * 2.6), 9.4 + 10 * t, 1 - 6 * t * t, r, r, r, col, V);
    }
    g.mbox(6, 5, 0, 8, 9, 2, R2, V); g.mbox(8, 8, 0, 9, 10, 1, R2, V);       // ears
    return g;
  }
  function armGrid() {             // origin: the shoulder
    const g = new Voxel.Grid(25);
    g.ell(0, 0, 0, 4.6, 3.4, 4.4, R3, V);
    g.ell(0, -4.5, 0, 4.4, 5.8, 4.2, R, V);
    return g;
  }
  function foreGrid() {            // origin: the elbow
    const g = new Voxel.Grid(26);
    g.ell(0, -5, -0.3, 3.9, 5.8, 3.8, R, V);
    g.ell(0, -11.5, -0.5, 3.4, 2.6, 3.6, R2, V);
    for (let x = -2; x < 2; x++) { g.box(x, -14, -2, x + 1, -12, -1, R, V); g.box(x, -17, -2, x + 1, -14, -1, DARK, 0.05); }
    g.box(2, -13, -2, 3, -11, 0, R, V); g.box(2, -15, -2, 3, -13, -1, DARK, 0.05);
    return g;
  }

  function build() {
    const u = (v) => v * VOX;
    const leg = legGrid(), body = bodyGrid(), torso = torsoGrid(), head = headGrid(), arm = armGrid(), fore = foreGrid();
    const at = {   // where each joint sits, in its parent's space (voxels)
      legR: [5.5, 28, 0], legL: [-5.5, 28, 0], torso: [0, 29, 0], head: [0, 17, -1], shoulderR: [13.5, 15.5, 0], shoulderL: [-13.5, 15.5, 0], elbow: [0, -10.5, 0],
    };
    const abs = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const tor = at.torso, hd = abs(tor, at.head), shR = abs(tor, at.shoulderR), shL = abs(tor, at.shoulderL);
    // flat list with absolute positions (units), used by the preview tool
    const pose = [
      { grid: body, pivot: [0, 0, 0], off: [0, 0, 0] },
      { grid: leg, pivot: [0, 0, 0], off: at.legR.map(u) }, { grid: leg, pivot: [0, 0, 0], off: at.legL.map(u) },
      { grid: torso, pivot: [0, 0, 0], off: tor.map(u) },
      { grid: head, pivot: [0, 0, 0], off: hd.map(u) },
      { grid: arm, pivot: [0, 0, 0], off: shR.map(u) }, { grid: arm, pivot: [0, 0, 0], off: shL.map(u) },
      { grid: fore, pivot: [0, 0, 0], off: abs(shR, at.elbow).map(u) }, { grid: fore, pivot: [0, 0, 0], off: abs(shL, at.elbow).map(u) },
    ];
    return { vox: VOX, grids: { leg, body, torso, head, arm, fore }, at: Object.fromEntries(Object.entries(at).map(([k, v]) => [k, v.map(u)])), pose };
  }
  return { build, VOX };
})();
if (typeof module !== 'undefined') module.exports = HornedFiend;
