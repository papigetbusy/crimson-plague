/* Mushroom (placeholder, Crusader Tactics monster): a fat, waddling toadstool with a spotted purple-red cap and a glowing spore sac.
   It rears back and spits poison spores from a distance. Model space: feet at y = 0, +Y up, the face points to -Z.
   Parts: body (stalk and stubby legs), cap (tilts when it spits). Placeholder until Grok's art is in. */
const Mushroom = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.05;
  const STALK = 0xd8c9a4, STALK_D = 0xa8966c, CAP = 0x7a1f4a, CAP_L = 0xa8326a, SPOT = 0xe8d8a8, GILL = 0x3a1228, EYE = 0xb8ff4a, MOUTH = 0x1c0a14, SPORE = 0x8aff4a;
  const J = { cap: 22 };
  function body() {
    const g = new Voxel.Grid(221);
    g.ell(0, 11, 0, 8.5, 9.5, 8, STALK, 0.07); g.ell(0, 8, 1, 9, 6, 8.5, STALK_D, 0.06);                                             // fat stalk
    g.mbox(3, 0, -4, 8, 3, 3, STALK_D, 0.08); g.mbox(3, 0, -6, 8, 1, -4, STALK, 0.05);                                               // stubby feet
    g.mbox(3, 15, -9, 6, 17, -7, EYE, 0, 'glow'); g.mbox(3, 17, -9, 7, 18, -7, STALK_D, 0.05);                                       // glowing green eyes under a brow ridge
    g.box(-4, 8, -9, 4, 11, -7, MOUTH, 0.03); g.mbox(2, 10, -9, 3, 12, -8, SPOT, 0.03);                                              // a wide mouth with two teeth
    g.ell(0, 12, 8, 4, 4, 2.5, SPORE, 0, 'glow');                                                                                    // a glowing spore sac on its back
    return g;
  }
  function cap() {
    const g = new Voxel.Grid(222);
    g.ell(0, 26, 0, 15, 8, 14, CAP, 0.07); g.ell(0, 29, 0, 11, 5, 10, CAP_L, 0.06);                                                  // domed cap
    g.erase(-20, 14, -20, 20, 22, 20); g.ell(0, 21, 0, 13, 3, 12, GILL, 0.05);                                                       // dark gills underneath
    for (const [x, y, z, r] of [[-6, 31, -4, 2.4], [5, 32, -2, 2.8], [0, 33, 5, 2.2], [-9, 28, 4, 2], [9, 28, -6, 2], [-2, 30, -9, 1.8], [10, 29, 4, 1.8]]) g.ell(x, y, z, r, r * 0.6, r, SPOT, 0.04);   // pale spots
    return g;
  }
  function build() {
    const G = { body: body(), cap: cap() };
    const joints = { cap: [0, J.cap, 0] };
    return K.finish(G, joints, VOX, 'shroom', 2);
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = Mushroom;
