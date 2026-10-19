/* Crimson Horned Fiend v2 — locked to Grok master front / side / back sheets.
   Hand-built with Voxel.Grid + BestiaryKit helpers to match the approved mockups.
   Model space: feet at y=0, +Y up, face points to -Z. Jointed parts for animation.
   Drop into src/models/ and wire the same way as the existing horned_fiend.js. */
const HornedFiendV2 = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.042;
  const RED = 0x8b1a22, RED_D = 0x651018, RED_L = 0xa82a32;
  const HORN = 0x2a2420, CLAW = 0x1c1c20, GLOW = 0xff4d14;
  const J = { hip: 28, waist: 36, neck: 58, shoulder: 54, elbow: 38, legX: 9, shoulderX: 16 };

  function buildTorso() {
    const g = new Voxel.Grid(101);
    g.ell(0, 42, 0, 14, 12, 8, RED);                       // heavy torso
    g.box(-10, 32, -6, 10, 48, 6, RED_D);                  // core
    // shoulder spikes
    for (const side of [1, -1]) {
      K.line(g, [side * 12, 50, -2], [side * 18, 62, 2], 2, HORN);
      K.line(g, [side * 10, 48, 2], [side * 16, 56, 6], 2, HORN);
    }
    // back spine spikes
    for (let y = 36; y <= 54; y += 4) g.box(-1, y, 6, 1, y + 3, 9, HORN);
    return g;
  }
  function buildHead() {
    const g = new Voxel.Grid(102);
    g.ell(0, 64, -4, 8, 7, 6, RED);                        // skull
    g.box(-3, 58, -8, 3, 62, -5, RED_D);                   // jaw
    g.mbox(2, 62, -7, 4, 64, -5, GLOW, 0, 'glow');         // eyes
    g.box(-2, 59, -9, 2, 61, -8, GLOW, 0, 'glow');         // mouth
    // curved horns
    const horn = [[4, 68, 0], [8, 76, -1], [12, 82, -2], [10, 88, -1]];
    for (const side of [1, -1]) {
      for (let i = 0; i + 1 < horn.length; i++) {
        const a = horn[i], b = horn[i + 1];
        K.line(g, [side * a[0], a[1], a[2]], [side * b[0], b[1], b[2]], 2, HORN);
      }
    }
    return g;
  }
  function buildArmU(side) {
    const g = new Voxel.Grid(103 + (side > 0 ? 1 : 0));
    const x = side * J.shoulderX;
    g.ell(x, 50, 0, 6, 8, 5, RED);                         // upper arm
    g.box(x - 3, 44, -3, x + 3, 52, 3, RED_D);
    return g;
  }
  function buildArmF(side) {
    const g = new Voxel.Grid(105 + (side > 0 ? 1 : 0));
    const x = side * (J.shoulderX + 2);
    g.box(x - 3, 28, -3, x + 3, 40, 3, RED);               // forearm
    // clawed hand
    g.box(x - 4, 22, -5, x + 4, 28, 2, RED_D);
    for (let i = 0; i < 3; i++) g.box(x - 3 + i * 3, 18, -7, x - 1 + i * 3, 22, -4, CLAW);
    return g;
  }
  function buildLeg(side) {
    const g = new Voxel.Grid(107 + (side > 0 ? 1 : 0));
    const x = side * J.legX;
    g.ell(x, 22, 0, 6, 10, 5, RED);                        // thigh
    g.box(x - 3, 8, -2, x + 3, 22, 3, RED_D);              // shin
    // clawed foot
    g.box(x - 4, 0, -6, x + 4, 8, 4, RED);
    for (let i = 0; i < 3; i++) g.box(x - 3 + i * 3, 0, -9, x - 1 + i * 3, 3, -6, CLAW);
    return g;
  }
  function build() {
    const names = ['body', 'legR', 'legL', 'torso', 'head', 'armRU', 'armLU', 'armRF', 'armLF'];
    const G = {
      body: new Voxel.Grid(100),
      legR: buildLeg(1), legL: buildLeg(-1),
      torso: buildTorso(), head: buildHead(),
      armRU: buildArmU(1), armLU: buildArmU(-1),
      armRF: buildArmF(1), armLF: buildArmF(-1)
    };
    // hips
    G.body.ell(0, 30, 0, 12, 6, 6, RED);
    const joints = {
      legR: [J.legX, J.hip, 0], legL: [-J.legX, J.hip, 0],
      torso: [0, J.waist, 0], head: [0, J.neck, 0],
      armRU: [J.shoulderX, J.shoulder, 0], armLU: [-J.shoulderX, J.shoulder, 0],
      armRF: [J.shoulderX + 2, J.elbow, 0], armLF: [-(J.shoulderX + 2), J.elbow, 0]
    };
    const pose = names.map((n) => {
      const j = joints[n] || [0, 0, 0];
      return { name: n, grid: G[n], pivot: j, off: j.map((v) => v * VOX) };
    });
    return { vox: VOX, grids: G, joints, pose };
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = HornedFiendV2;
