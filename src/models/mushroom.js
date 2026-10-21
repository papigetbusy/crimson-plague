/* Mushroom (placeholder, scarier second take): a bloated fungal horror. A blood-red cap with fangs hanging from its rim like a mouth turned upside down, glowing pustules and a cluster of unblinking green eyes,
   a stalk split by a wide mouth of needle teeth, drooping root arms, and a burst spore sac on its back. It rears back and spits poison spores from a distance.
   Model space: feet at y = 0, +Y up, the face points to -Z. Parts: body (stalk and legs), cap (tilts when it spits). Placeholder until Grok's art is in. */
const Mushroom = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.05;
  const STALK = 0xb9a888, STALK_D = 0x7e6e50, VEIN = 0x6a3a3a, CAP = 0x6a1230, CAP_D = 0x3e0a1e, CAP_L = 0x9a2448, SPOT = 0xc8d890, GILL = 0x2a0a18, EYE = 0xb8ff4a, MOUTH = 0x160610, SPORE = 0x8aff4a, FANG = 0xe8e0c0, ROOT = 0x4a3a2a;
  const J = { cap: 22 };
  function body() {
    const g = new Voxel.Grid(221);
    g.ell(0, 11, 0, 8.5, 9.5, 8, STALK, 0.07); g.ell(0, 8, 1, 9, 6, 8.5, STALK_D, 0.06);                                             // fat, mottled stalk
    g.mbox(3, 0, -4, 8, 3, 3, STALK_D, 0.08); g.mbox(3, 0, -6, 8, 1, -4, STALK, 0.05);                                               // stubby feet
    for (const [x, z] of [[-6, -6], [-2, -8], [3, -7], [7, -4]]) g.box(x, 0, z, x + 1, 3, z + 1, ROOT, 0.05);                         // root tendrils crawling over the ground
    g.box(-6, 6, -9, -5, 12, -8, VEIN, 0.04); g.box(5, 5, -9, 6, 10, -8, VEIN, 0.04);                                                // dark veins in the stalk
    // a wide mouth with needle teeth
    g.box(-5, 6, -9, 5, 12, -7, MOUTH, 0.02);
    for (let i = -4; i <= 3; i++) { g.box(i, 10, -10, i + 1, 12 + (i & 1), -9, FANG, 0.03); g.box(i, 6, -10, i + 1, 8 - (i & 1), -9, FANG, 0.03); }
    // a cluster of unblinking eyes
    g.mbox(3, 15, -9, 6, 17, -7, EYE, 0, 'glow'); g.mbox(2, 17, -9, 4, 19, -7, MOUTH, 0.02); g.mbox(3, 17, -9, 4, 18, -8, EYE, 0, 'glow'); g.box(-1, 14, -9, 1, 16, -7, EYE, 0, 'glow');
    // drooping root arms, with a clawed tip
    g.mell(10, 9, -1, 2, 5, 2, STALK_D, 0.06); g.mbox(9, 2, -3, 12, 5, 0, ROOT, 0.05); for (const z of [-3, -1, 1]) g.mbox(10, 0, z, 11, 2, z + 1, FANG, 0.03);
    // a burst spore sac on its back, glowing and oozing
    g.ell(0, 12, 8, 4, 4, 2.5, SPORE, 0, 'glow'); g.box(-1, 7, 8, 1, 10, 9, SPORE, 0, 'glow');
    return g;
  }
  function cap() {
    const g = new Voxel.Grid(222);
    g.ell(0, 26, 0, 15, 8, 14, CAP, 0.07); g.ell(0, 29, 0, 11, 5, 10, CAP_L, 0.06);                                                  // domed cap
    g.erase(-20, 14, -20, 20, 22, 20); g.ell(0, 21, 0, 13, 3, 12, GILL, 0.05);                                                       // dark gills underneath
    // fangs hanging all round the rim
    for (let a = 0; a < 16; a++) {
      const t = a / 16 * Math.PI * 2, x = Math.round(Math.sin(t) * 13), z = Math.round(-Math.cos(t) * 12), len = a % 2 ? 3 : 5;
      g.box(x, 21 - len, z, x + 1, 22, z + 1, FANG, 0.03);
    }
    g.erase(-4, 18, -16, 4, 22, -10);                                                                                                // a gap in the front fangs where the cap yawns
    // glowing pustules and sickly spots
    for (const [x, y, z, r] of [[-6, 31, -4, 2.4], [5, 32, -2, 2.8], [0, 33, 5, 2.2], [-9, 28, 4, 2], [9, 28, -6, 2]]) { g.ell(x, y, z, r, r * 0.6, r, SPOT, 0.04); g.ell(x, y + 0.5, z, r * 0.5, r * 0.4, r * 0.5, SPORE, 0, 'glow'); }
    for (const [x, y, z] of [[-2, 30, -9], [10, 29, 4], [-10, 30, -3]]) g.ell(x, y, z, 1.6, 1, 1.6, CAP_D, 0.04);                       // dark rot patches
    g.mbox(8, 22, -9, 10, 27, -7, CAP_D, 0.05);                                                                                      // a torn flap of cap hanging at the side
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
