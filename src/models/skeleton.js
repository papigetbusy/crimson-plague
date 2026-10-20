/* Skeleton (placeholder, Crusader Tactics monster): a tall grey-white skeleton in rusted mail scraps, red embers in its skull, with a notched sword and a cracked round shield.
   Slow and sturdy, it swings heavy. Model space: feet at y = 0, +Y up, the face points to -Z.
   Parts: body (pelvis), legR, legL, torso (ribs), head, armR (sword), armL (shield). Placeholder until Grok's art is in. */
const Skeleton = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.05;
  const BONE = 0xd9d2bc, BONE_D = 0x9c957f, BONE_L = 0xeee8d4, RUST = 0x6e4630, MAIL = 0x4a4a54, STEEL = 0xa7adb6, WOOD = 0x5a3a22, RED = 0xff3a1c, DARK = 0x16121a;
  const J = { hip: 28, waist: 32, neck: 52, shoulder: 49, legX: 5, shoulderX: 12 };
  function bone(g, x0, y0, z0, x1, y1, z1, c) { g.box(x0, y0, z0, x1, y1, z1, c, 0.06); }
  function leg(side) {
    const g = new Voxel.Grid(211 + (side > 0 ? 1 : 0)), x = side * J.legX;
    bone(g, x - 1, 15, -2, x + 2, 28, 1, BONE); bone(g, x - 1, 3, -2, x + 2, 15, 1, BONE_D);                                         // thigh bone and shin bone
    g.ell(x, 15, 0, 2.4, 1.8, 2.4, BONE_L, 0.05);                                                                                    // knee
    g.box(x - 3, 0, -5, x + 3, 3, 2, BONE, 0.06); g.box(x - 3, 0, -5, x + 3, 1, -3, BONE_L, 0.04);                                  // foot
    return g;
  }
  function body() {
    const g = new Voxel.Grid(213);
    g.mell(4, 29, 0, 3.4, 3, 3, BONE, 0.06); g.box(-2, 26, -1, 2, 33, 2, BONE_D, 0.06);                                              // hip bones and spine stub
    g.box(-8, 28, -4, 8, 32, 4, MAIL, 0.08); g.box(-8, 28, -4, 8, 29, 4, RUST, 0.08);                                                // a rusted mail skirt
    return g;
  }
  function torso() {
    const g = new Voxel.Grid(214);
    g.box(-1, 32, 1, 1, 52, 3, BONE_D, 0.05);                                                                                        // spine
    for (let i = 0; i < 5; i++) { const y = 35 + i * 3; g.ell(0, y, 0, 8 - (i === 0 ? 2 : 0) - (i > 3 ? 1 : 0), 0.9, 5.5, BONE, 0.05); }   // ribs, wider mid-chest
    g.box(-1, 34, -6, 1, 50, -5, BONE_L, 0.05);                                                                                       // breastbone
    g.mell(7, 51, 0, 5, 2.2, 4, BONE, 0.06); g.box(-9, 50, -4, 9, 52, 4, MAIL, 0.08);                                                // collar bones and a mail gorget
    g.mell(11, 51, 0, 4, 2.6, 4, MAIL, 0.1);                                                                                         // a rusted pauldron
    return g;
  }
  function head() {
    const g = new Voxel.Grid(215);
    g.ell(0, 58, -1, 6.5, 6.2, 6.6, BONE, 0.06); g.box(-4, 52, -5, 4, 55, 4, BONE_D, 0.06);                                           // skull and jaw
    g.mbox(2, 57, -8, 5, 60, -6, DARK, 0.03); g.mbox(3, 58, -8, 4, 59, -7, RED, 0, 'glow');                                         // sockets with embers
    g.box(-1, 54, -8, 1, 56, -6, DARK, 0.03);                                                                                        // nose hole
    for (let i = -3; i <= 3; i++) g.box(i, 52, -8, i + 1, 54, -7, BONE_L, 0.03);                                                     // teeth
    g.box(-7, 62, -4, 7, 64, 3, MAIL, 0.1); g.box(-7, 62, -4, 7, 63, -3, RUST, 0.08);                                                // broken helm band
    return g;
  }
  function armR() {
    const g = new Voxel.Grid(216), x = J.shoulderX;
    bone(g, x - 1, 38, -1, x + 1, 49, 1, BONE); bone(g, x - 1, 28, -2, x + 1, 38, 0, BONE_D); g.ell(x, 27, -2, 2.2, 2.2, 2.2, BONE_L, 0.05);   // arm bones and a bony hand
    g.box(x - 1, 27, -16, x + 1, 29, -3, RUST, 0.06); g.box(x - 1, 24, -17, x + 1, 33, -15, STEEL, 0.08);                              // sword grip and crossguard
    g.box(x - 1, 26, -34, x + 1, 31, -16, STEEL, 0.1); g.box(x - 1, 27, -37, x + 1, 30, -34, STEEL, 0.1); g.box(x - 1, 28, -39, x + 1, 29, -37, STEEL, 0.1); g.box(x - 1, 29, -34, x + 1, 30, -18, 0xd8dde4, 0.05);                            // a long chipped blade, held out front
    return g;
  }
  function armL() {
    const g = new Voxel.Grid(217), x = -J.shoulderX;
    bone(g, x - 1, 38, -1, x + 1, 49, 1, BONE); bone(g, x - 1, 30, -2, x + 1, 38, 0, BONE_D);
    g.ell(x - 1, 32, -5, 1.6, 7, 7, WOOD, 0.08); g.ell(x - 1.5, 32, -6, 0.9, 5.5, 5.5, MAIL, 0.1); g.box(x - 3, 31, -6, x - 2, 34, -5, RUST, 0.06);   // a cracked round shield
    return g;
  }
  function build() {
    const G = { body: body(), legR: leg(1), legL: leg(-1), torso: torso(), head: head(), armR: armR(), armL: armL() };
    const joints = { legR: [J.legX, J.hip, 0], legL: [-J.legX, J.hip, 0], torso: [0, J.waist, 0], head: [0, J.neck, 0], armR: [J.shoulderX, J.shoulder, 0], armL: [-J.shoulderX, J.shoulder, 0] };
    return K.finish(G, joints, VOX, 'biped1', 2);
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = Skeleton;
