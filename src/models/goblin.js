/* Goblin (placeholder, scarier second take): a starved, hunched, sickly green raider. Sunken red eyes under a heavy brow, a jaw full of jagged teeth, torn notched ears,
   ribs showing through the skin, a spiked shoulder, a skull on its belt and a serrated blood-stained cleaver in a clawed fist. Quick and weak, it comes in swarms.
   Model space: feet at y = 0, +Y up, the face points to -Z. Parts: body (hips), legR, legL, torso, head, armR (holds the cleaver), armL. Placeholder until Grok's art is in. */
const Goblin = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.05;
  const SKIN = 0x4f6c38, SKIN_D = 0x2f4426, SKIN_L = 0x6b8a48, LEATHER = 0x3a2418, LEATHER_L = 0x5a3a22, CLOTH = 0x4a1018, STEEL = 0x7c828a, STEEL_L = 0xaab0b8, RUST = 0x6a3a22, BLOOD = 0x7a0c12,
    EYE = 0xff2a1a, TUSK = 0xe4dcc0, BONE = 0xcfc7a8, MOUTH = 0x1c0608, SCAR = 0x7a3a34, DARK = 0x120a0c;
  const J = { hip: 14, waist: 17, neck: 29, shoulder: 26, legX: 4, shoulderX: 9 };
  function leg(side) {
    const g = new Voxel.Grid(201 + (side > 0 ? 1 : 0)), x = side * J.legX;
    g.ell(x, 9, 0, 2.6, 6, 2.8, SKIN_D, 0.08); g.ell(x, 6, 2, 2.4, 3, 2.4, SKIN, 0.07);                                              // thin thigh, bent hind-leg shin
    g.box(x - 3, 0, -6, x + 3, 2, 3, SKIN, 0.08);                                                                                    // big flat foot
    for (const dx of [-2, 0, 2]) g.box(x + dx - 1, 0, -8, x + dx, 1, -6, TUSK, 0.03);                                                // three long toe claws
    return g;
  }
  function body() {
    const g = new Voxel.Grid(203);
    g.ell(0, 15, 0, 7, 4, 5, LEATHER, 0.08); g.box(-7, 11, -5, 7, 15, -4, CLOTH, 0.06); g.box(-4, 8, -5, 4, 12, -4, CLOTH, 0.06);   // belt and a ragged dark loincloth
    g.box(-5, 8, -5, -4, 10, -4, DARK, 0.04); g.box(1, 7, -5, 2, 9, -4, DARK, 0.04);                                                // torn hem
    g.ell(-6, 12, -5, 2.2, 2.6, 1.8, BONE, 0.04); g.mbox(-7, 12, -7, -6, 13, -6, DARK, 0.02); g.box(-7, 10, -7, -5, 11, -6, TUSK, 0.03);   // a little skull trophy on the belt
    return g;
  }
  function torso() {
    const g = new Voxel.Grid(204);
    g.ell(0, 21, -1, 7.2, 6.6, 5.2, SKIN, 0.07);                                                                                     // starved chest, leaned forward
    for (const y of [19, 21, 23]) g.box(-5, y, -6, 5, y + 1, -5, SKIN_D, 0.04);                                                      // ribs showing
    g.box(-1, 17, -6, 1, 26, -5, SKIN_D, 0.05);                                                                                      // breastbone
    g.box(-8, 24, -6, 8, 26, -4, LEATHER, 0.07); g.box(-7, 17, -6, -5, 25, -5, LEATHER_L, 0.05); g.box(4, 17, -6, 6, 24, -5, LEATHER_L, 0.05);   // ragged straps across the chest
    g.ell(0, 27, 1.5, 8.4, 3.4, 6, SKIN, 0.07);                                                                                      // hunched shoulders
    g.ell(0, 29, 4, 4, 3, 3, SKIN_D, 0.07);                                                                                          // a hump on the back
    for (let i = -2; i <= 2; i++) g.box(i * 2, 21 + (i % 2 ? 0 : 1), -7, i * 2 + 1, 24 + (i % 2 ? 0 : 1), -6, i % 2 ? TUSK : BONE, 0.03);   // a necklace of teeth
    g.ell(10, 29, 0, 3.6, 2.2, 3.6, LEATHER, 0.07);                                                                                  // a spiked leather pauldron on the right shoulder
    for (const [x, z] of [[10, 0], [12, -2], [12, 2]]) g.box(x - 1, 30, z - 1, x + 1, 35, z + 1, STEEL, 0.06);
    return g;
  }
  function head() {
    const g = new Voxel.Grid(205);
    g.ell(0, 33, -2, 7.8, 6, 6.8, SKIN, 0.07); g.ell(0, 36, -1, 6.8, 2.6, 5.8, SKIN_L, 0.05);                                       // narrow skull
    g.box(-8, 35, -9, 8, 37, -6, SKIN_D, 0.05);                                                                                      // a heavy, jutting brow
    // torn, notched ears
    g.mell(11, 34, 0, 4.5, 1.8, 2, SKIN, 0.06); g.mell(14, 36, 0, 3, 1.4, 1.5, SKIN_L, 0.05); g.mell(16.5, 38, 0, 1.8, 1.1, 1.2, SKIN_L, 0.05);
    g.erase(12, 33, -1, 13, 35, 1); g.erase(15, 35, -1, 16, 37, 1);                                                                  // bites torn out of the ears
    // sunken red eyes
    g.mbox(2, 33, -10, 6, 36, -7, DARK, 0.02); g.mbox(3, 34, -10, 5, 35, -9, EYE, 0, 'glow');
    g.box(-1, 31, -11, 1, 34, -8, SKIN_L, 0.05); g.box(0, 32, -11, 2, 33, -10, SKIN_D, 0.05);                                        // a crooked, broken nose
    // jutting jaw full of jagged teeth
    g.box(-5, 28, -10, 5, 31, -6, MOUTH, 0.02); g.box(-4, 27, -9, 4, 29, -6, SKIN_D, 0.05);
    for (let i = -4; i <= 3; i++) { if (i % 2 === 0) g.box(i, 30, -10, i + 1, 32, -9, TUSK, 0.03); else g.box(i, 28, -10, i + 1, 30, -9, TUSK, 0.03); }   // jagged teeth, top and bottom in turn
    g.mbox(5, 29, -10, 6, 33, -9, TUSK, 0.03);                                                                                       // two long tusks
    g.box(2, 32, -9, 3, 36, -8, SCAR, 0.03);                                                                                         // an old scar across the eye
    return g;
  }
  function claws(g, x, y, z) { for (const dx of [-1, 0, 1]) g.box(x + dx, y - 3, z - 3, x + dx + 1, y - 1, z - 2, TUSK, 0.03); }
  function armR() {
    const g = new Voxel.Grid(206), x = J.shoulderX;
    g.ell(x, 20, -1, 2.2, 7.5, 2.2, SKIN, 0.07); g.ell(x, 13, -2, 2.6, 2.6, 2.6, SKIN_L, 0.05); claws(g, x, 12, -2);                  // long thin arm and a clawed fist
    g.box(x - 1, 13, -9, x + 1, 15, -3, RUST, 0.06);                                                                                  // handle
    g.box(x - 3, 5, -15, x + 3, 16, -12, STEEL, 0.1); g.box(x - 2, 14, -13, x + 2, 17, -10, STEEL_L, 0.1);                           // a heavy cleaver blade
    for (const y of [6, 8, 10, 12]) g.box(x - 4, y, -15, x - 3, y + 1, -12, STEEL, 0.06);                                              // serrated notches along the edge
    g.box(x - 1, 6, -15, x + 1, 11, -14, BLOOD, 0.05); g.box(x - 2, 11, -13, x, 13, -12, BLOOD, 0.05);                                // blood on the blade
    return g;
  }
  function armL() {
    const g = new Voxel.Grid(207), x = -J.shoulderX;
    g.ell(x, 20, -1, 2.2, 7.5, 2.2, SKIN, 0.07); g.ell(x, 13, -2, 2.6, 2.6, 2.6, SKIN_L, 0.05); claws(g, x, 12, -2);
    g.box(x - 1, 24, -3, x + 1, 25, 1, LEATHER_L, 0.05); g.box(x - 1, 16, -3, x + 1, 17, 1, LEATHER, 0.05);                            // wrist wraps
    return g;
  }
  function build() {
    const G = { body: body(), legR: leg(1), legL: leg(-1), torso: torso(), head: head(), armR: armR(), armL: armL() };
    const joints = { legR: [J.legX, J.hip, 0], legL: [-J.legX, J.hip, 0], torso: [0, J.waist, 0], head: [0, J.neck, 0], armR: [J.shoulderX, J.shoulder, 0], armL: [-J.shoulderX, J.shoulder, 0] };
    return K.finish(G, joints, VOX, 'biped1', 2);
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = Goblin;
