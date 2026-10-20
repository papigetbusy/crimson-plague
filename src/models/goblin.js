/* Goblin (placeholder, Crusader Tactics monster): a small hunched green raider with big ears, yellow eyes, tusks and a chipped cleaver.
   Quick and weak, it comes in swarms. Model space: feet at y = 0, +Y up, the face points to -Z.
   Parts: body (hips), legR, legL, torso, head, armR (holds the cleaver), armL. Placeholder until Grok's art is in. */
const Goblin = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.05;
  const SKIN = 0x5c8a3a, SKIN_D = 0x3f6428, SKIN_L = 0x78a84c, LEATHER = 0x5a3a22, LEATHER_L = 0x7a5232, CLOTH = 0x7a1c22, STEEL = 0x9aa0a8, RUST = 0x7a4a2a, EYE = 0xffd23a, TUSK = 0xe8e0c8, MOUTH = 0x2a0e0e;
  const J = { hip: 14, waist: 17, neck: 29, shoulder: 26, legX: 4, shoulderX: 9 };
  function leg(side) {
    const g = new Voxel.Grid(201 + (side > 0 ? 1 : 0)), x = side * J.legX;
    g.ell(x, 8, 0, 2.6, 7, 2.8, SKIN_D, 0.08); g.box(x - 3, 0, -5, x + 3, 2, 3, SKIN, 0.08); g.box(x - 3, 0, -5, x + 3, 1, -3, TUSK, 0.04);   // thin leg, flat foot with toe claws
    return g;
  }
  function body() {
    const g = new Voxel.Grid(203);
    g.ell(0, 15, 0, 7, 4, 5, LEATHER, 0.08); g.box(-7, 11, -5, 7, 15, -4, CLOTH, 0.06); g.box(-4, 9, -5, 4, 12, -4, CLOTH, 0.06);   // belt and a ragged red loincloth
    return g;
  }
  function torso() {
    const g = new Voxel.Grid(204);
    g.ell(0, 22, 0, 7.5, 6.5, 5.5, SKIN, 0.07); g.ell(0, 21, -1, 7.8, 5, 5, LEATHER, 0.08);                                         // pot belly under a leather vest
    g.box(-1, 17, -6, 1, 27, -5, LEATHER_L, 0.05); g.mbox(3, 18, -6, 5, 26, -5, LEATHER_L, 0.05);                                    // vest straps
    g.ell(0, 27, 1, 8, 3, 5.5, SKIN, 0.07);                                                                                          // hunched shoulders
    return g;
  }
  function head() {
    const g = new Voxel.Grid(205);
    g.ell(0, 33, -2, 8, 6.5, 7, SKIN, 0.07); g.ell(0, 36, -1, 7, 3, 6, SKIN_L, 0.05);                                               // big head
    g.mell(11, 34, 0, 4.5, 2, 2, SKIN, 0.06); g.mell(14, 36, 0, 3, 1.5, 1.5, SKIN_L, 0.05); g.mell(16.5, 38, 0, 1.8, 1.2, 1.2, SKIN_L, 0.05);   // long pointed ears
    g.mbox(3, 34, -10, 6, 36, -8, EYE, 0, 'glow'); g.mbox(4, 36, -10, 7, 37, -9, SKIN_D, 0.05);                                     // yellow eyes under a heavy brow
    g.box(-1, 31, -10, 1, 34, -8, SKIN_L, 0.05);                                                                                     // big nose
    g.box(-4, 29, -9, 4, 31, -7, MOUTH, 0.03); g.mbox(2, 30, -10, 3, 33, -9, TUSK, 0.03); g.box(-1, 30, -10, 0, 31, -9, TUSK, 0.03);   // snarl and tusks
    return g;
  }
  function armR() {
    const g = new Voxel.Grid(206), x = J.shoulderX;
    g.ell(x, 20, 0, 2.4, 7, 2.4, SKIN, 0.07); g.ell(x, 13, -1, 2.4, 2.4, 2.4, SKIN_L, 0.05);                                       // thin arm and fist
    g.box(x - 1, 13, -9, x + 1, 15, -3, RUST, 0.06); g.box(x - 3, 8, -14, x + 3, 15, -12, STEEL, 0.1); g.box(x - 2, 14, -12, x + 2, 16, -10, STEEL, 0.1);   // a cleaver held out front
    return g;
  }
  function armL() {
    const g = new Voxel.Grid(207), x = -J.shoulderX;
    g.ell(x, 20, 0, 2.4, 7, 2.4, SKIN, 0.07); g.ell(x, 13, -1, 2.4, 2.4, 2.4, SKIN_L, 0.05);
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
