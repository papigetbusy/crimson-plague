/* Skeleton (placeholder, scarier second take): a tall, cracked, grey-yellow skeleton in rusted spiked armour. A horned skull with a gaping jaw and burning red eyes, a ribcage split open
   around a glowing red soul-ember, spiked pauldrons, ragged cloth hanging from the belt, a notched rusted sword and a cracked shield with a skull on it.
   Slow and sturdy, it swings heavy. Model space: feet at y = 0, +Y up, the face points to -Z.
   Parts: body (pelvis), legR, legL, torso (ribs), head, armR (sword), armL (shield). Placeholder until Grok's art is in. */
const Skeleton = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.05;
  const BONE = 0xcfc7a6, BONE_D = 0x8e876e, BONE_L = 0xe8e0c4, RUST = 0x6a3e28, MAIL = 0x3c3c46, STEEL = 0x9aa0a8, WOOD = 0x4a2e1c, RED = 0xff3a1c, EMBER = 0xff7a28, DARK = 0x0e0a10, CLOTH = 0x3a0e16, CRACK = 0x4a4436;
  const J = { hip: 28, waist: 32, neck: 52, shoulder: 49, legX: 5, shoulderX: 12 };
  function bone(g, x0, y0, z0, x1, y1, z1, c) { g.box(x0, y0, z0, x1, y1, z1, c, 0.06); }
  function leg(side) {
    const g = new Voxel.Grid(211 + (side > 0 ? 1 : 0)), x = side * J.legX;
    bone(g, x - 1, 15, -2, x + 2, 28, 1, BONE); bone(g, x - 1, 3, -2, x + 2, 15, 1, BONE_D);                                         // thigh bone and shin bone
    g.ell(x, 15, 0, 2.6, 2, 2.6, BONE_L, 0.05);                                                                                      // knee
    g.box(x - 2, 4, -3, x + 3, 12, 2, MAIL, 0.08); g.box(x - 2, 11, -3, x + 3, 12, 2, RUST, 0.08);                                   // a rusted greave on the shin
    g.box(x - 3, 0, -6, x + 3, 3, 2, BONE, 0.06); for (const dx of [-2, 0, 2]) g.box(x + dx - 1, 0, -8, x + dx, 2, -6, BONE_L, 0.04);   // bony foot with toe claws
    g.box(x, 8, -4, x + 1, 10, -3, DARK, 0.02);                                                                                      // a crack in the greave
    return g;
  }
  function body() {
    const g = new Voxel.Grid(213);
    g.mell(4, 29, 0, 3.4, 3, 3, BONE, 0.06); g.box(-2, 26, -1, 2, 33, 2, BONE_D, 0.06);                                              // hip bones and spine stub
    g.box(-8, 28, -4, 8, 32, 4, MAIL, 0.08); g.box(-8, 28, -4, 8, 29, 4, RUST, 0.08);                                                // a rusted mail skirt
    g.box(-8, 30, -5, 8, 31, -4, 0x6a5a3a, 0.06);                                                                                    // a belt
    for (const [x, len] of [[-6, 9], [-2, 12], [2, 8], [5, 11]]) g.box(x, 28 - len, -5, x + 2, 29, -4, CLOTH, 0.07);                  // ragged cloth strips hanging from the belt
    g.ell(0, 30, -6, 2.4, 2.6, 1.6, BONE_L, 0.04); g.mbox(1, 30, -8, 2, 31, -7, DARK, 0.02);                                         // a small skull belt buckle
    return g;
  }
  function torso() {
    const g = new Voxel.Grid(214);
    g.box(-1, 32, 1, 1, 52, 3, BONE_D, 0.05);                                                                                        // spine
    for (let i = 0; i < 5; i++) { const y = 35 + i * 3; g.ell(0, y, 0, 8 - (i === 0 ? 2 : 0) - (i > 3 ? 1 : 0), 0.9, 5.5, BONE, 0.05); }   // ribs, wider mid-chest
    g.erase(-3, 34, -7, 3, 48, -2);                                                                                                  // the front of the ribcage is split open
    g.ell(0, 41, -1, 2.8, 4, 2.4, EMBER, 0, 'glow'); g.ell(0, 41, -1, 1.4, 2, 1.2, 0xffe08a, 0, 'glow');                          // a glowing soul-ember inside the ribs
    g.box(-5, 38, -6, -3, 40, -5, CRACK, 0.03); g.box(3, 44, -6, 5, 46, -5, CRACK, 0.03);                                            // cracked ribs
    g.mell(7, 51, 0, 5, 2.2, 4, BONE, 0.06); g.box(-9, 50, -4, 9, 52, 4, MAIL, 0.08);                                                // collar bones and a mail gorget
    g.mell(11, 51, 0, 4.6, 2.8, 4.4, MAIL, 0.1);                                                                                     // rusted pauldrons
    for (const [x, z] of [[11, 0], [13, -2], [13, 2]]) g.mbox(x - 1, 52, z - 1, x + 1, 57, z + 1, RUST, 0.06);                      // each with spikes
    g.mbox(8, 44, -3, 10, 50, 3, CLOTH, 0.06);                                                                                       // a tattered cape strip behind each shoulder
    return g;
  }
  function head() {
    const g = new Voxel.Grid(215);
    g.ell(0, 58, -1, 6.6, 6.4, 6.8, BONE, 0.06); g.box(-4, 52, -5, 4, 55, 4, BONE_D, 0.06);                                           // skull and jaw
    g.mbox(2, 57, -9, 6, 61, -6, DARK, 0.03); g.mbox(3, 58, -9, 5, 60, -7, RED, 0, 'glow'); g.mbox(3, 59, -10, 4, 60, -9, 0xffd0a0, 0, 'glow');   // deep sockets with burning eyes
    g.box(-1, 54, -9, 1, 57, -6, DARK, 0.03);                                                                                        // nose hole
    g.box(-4, 49, -8, 4, 53, -4, DARK, 0.02);                                                                                        // the jaw hangs open
    for (let i = -3; i <= 3; i++) { g.box(i, 52, -9, i + 1, 54, -8, BONE_L, 0.03); if (i % 2) g.box(i, 49, -9, i + 1, 51, -8, BONE_L, 0.03); }   // teeth, top and bottom
    g.box(2, 58, -8, 3, 64, -7, CRACK, 0.03);                                                                                        // a crack across the skull
    // horns curling out and up from the temples
    g.mbox(6, 61, -1, 9, 63, 1, BONE_D, 0.05); g.mbox(9, 62, -1, 12, 65, 1, BONE, 0.05); g.mbox(11, 65, -1, 13, 69, 1, BONE_L, 0.04);
    g.box(-7, 62, -4, 7, 64, 3, MAIL, 0.1); g.box(-7, 62, -4, 7, 63, -3, RUST, 0.08);                                                // broken helm band
    return g;
  }
  function armR() {
    const g = new Voxel.Grid(216), x = J.shoulderX;
    bone(g, x - 1, 38, -1, x + 1, 49, 1, BONE); bone(g, x - 1, 28, -2, x + 1, 38, 0, BONE_D); g.ell(x, 27, -2, 2.2, 2.2, 2.2, BONE_L, 0.05);   // arm bones and a bony hand
    g.box(x - 2, 36, -2, x + 2, 40, 2, MAIL, 0.08);                                                                                  // a vambrace
    g.box(x - 1, 27, -16, x + 1, 29, -3, RUST, 0.06); g.box(x - 1, 24, -17, x + 1, 33, -15, STEEL, 0.08);                              // sword grip and crossguard
    g.box(x - 1, 26, -34, x + 1, 31, -16, STEEL, 0.1); g.box(x - 1, 27, -37, x + 1, 30, -34, STEEL, 0.1); g.box(x - 1, 28, -39, x + 1, 29, -37, STEEL, 0.1); g.box(x - 1, 29, -34, x + 1, 30, -18, 0xd8dde4, 0.05);   // a long chipped blade
    for (const z of [-30, -25, -20]) g.box(x - 1, 25, z, x + 1, 26, z + 2, STEEL, 0.06);                                              // notches along the edge
    g.box(x - 1, 27, -32, x + 1, 28, -26, RUST, 0.06); g.box(x - 1, 28, -23, x + 1, 29, -19, 0x6a0c12, 0.05);                         // rust and old blood
    return g;
  }
  function armL() {
    const g = new Voxel.Grid(217), x = -J.shoulderX;
    bone(g, x - 1, 38, -1, x + 1, 49, 1, BONE); bone(g, x - 1, 30, -2, x + 1, 38, 0, BONE_D);
    g.ell(x - 1, 32, -5, 1.6, 7.5, 7.5, WOOD, 0.08); g.ell(x - 1.5, 32, -6, 0.9, 6, 6, MAIL, 0.1); g.box(x - 3, 31, -6, x - 2, 34, -5, RUST, 0.06);   // a cracked round shield
    g.ell(x - 3, 33, -5, 0.9, 2.4, 2.2, BONE_L, 0.04); g.box(x - 4, 32, -6, x - 3, 33, -4, DARK, 0.02); g.box(x - 4, 30, -5, x - 3, 31, -4, DARK, 0.02);   // a skull painted on the shield
    g.box(x - 4, 36, -9, x - 3, 40, -2, DARK, 0.02);                                                                                  // a crack splitting the shield
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
