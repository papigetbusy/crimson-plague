/* Eyeball (placeholder, Crusader Tactics monster): a floating bloodshot eye with a glowing yellow iris, small bat wings and trailing nerve-tendrils; sparks crackle round it.
   It hovers and throws bolts of lightning. Model space: the eye's centre is at y = 0 (the screen lifts it off the floor), the face points to -Z.
   Parts: body (eye), wingR, wingL, tendrils. Placeholder until Grok's art is in. */
const Eyeball = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.05;
  const WHITE = 0xe8dcd0, VEIN = 0xa83038, IRIS = 0xffd830, IRIS_H = 0xfff2a0, PUPIL = 0x120a10, WING = 0x3a1a30, WING_L = 0x5a2848, TEND = 0x8a2a3a, SPARK = 0x8fe8ff;
  const J = { wing: 11 };
  function body() {
    const g = new Voxel.Grid(231);
    g.ell(0, 0, 0, 11, 11, 11, WHITE, 0.06);                                                                                         // the eyeball
    for (const [x, y, z, x2, y2, z2] of [[-8, 5, -6, -3, 1, -10], [7, -4, -7, 3, 1, -10], [-4, -8, -8, -6, -2, -9], [2, 9, -6, 6, 5, -8], [-10, -2, -3, -9, 3, -6], [9, 4, -5, 5, 8, -7]])   // red veins on the front
      for (let i = 0; i <= 6; i++) { const t = i / 6; g.ell(x + (x2 - x) * t, y + (y2 - y) * t, z + (z2 - z) * t, 1.1, 1.1, 1.1, VEIN, 0.05); }
    g.ell(0, 0, -8.5, 6.2, 6.2, 3.4, IRIS, 0, 'glow'); g.ell(0, 0, -10, 3.4, 3.4, 2, PUPIL, 0.02); g.ell(-2, 2, -11.2, 1.1, 1.1, 0.8, IRIS_H, 0, 'glow');   // iris, slit pupil and a gleam
    for (const sd of [-1, 1]) for (let i = 0; i < 8; i++) g.ell(sd * (2 + i * 1.3), 8 + (sd * -1 === -1 ? 0 : 0) + i * 0.35 - 2, -8.5 + i * 0.35, 2.2, 1.7, 2.6, VEIN, 0.07);   // a heavy angry brow of red flesh slanting over the eye
    for (const [x, y, z] of [[-13, 6, 2], [13, 7, -2], [0, 14, 4], [-11, -9, 5]]) g.ell(x, y, z, 1.2, 1.2, 1.2, SPARK, 0, 'glow');   // crackling sparks
    return g;
  }
  function wing(side) {
    const g = new Voxel.Grid(232 + (side > 0 ? 1 : 0)), x0 = side * J.wing;
    for (let i = 0; i < 12; i++) { const x = x0 + side * i, y = 1 + Math.floor(i * 0.5) - Math.floor(i * i / 30); g.box(Math.min(x, x + side), y - 1, 0, Math.max(x, x + side) + 1, y + 4 - Math.floor(i / 3), 2, i % 4 === 0 ? WING_L : WING, 0.07); }   // a small bat wing: thin stepped fan
    return g;
  }
  function tendrils() {
    const g = new Voxel.Grid(234);
    for (const [x, z] of [[-4, 2], [0, 4], [4, 2], [-2, -2], [2, -2]]) for (let i = 0; i < 12; i++) g.ell(x * 0.7 + Math.sin(i * 0.7 + x) * 1.8, -10 - i, z + Math.cos(i * 0.6 + x) * 1.2, 1.2 - i * 0.05, 0.9, 1.2 - i * 0.05, i % 5 === 4 ? IRIS : TEND, 0.08, i % 5 === 4 ? 'glow' : 'solid');   // dangling nerves
    return g;
  }
  function build() {
    const G = { body: body(), wingR: wing(1), wingL: wing(-1), tendrils: tendrils() };
    const joints = { wingR: [J.wing, 0, 0], wingL: [-J.wing, 0, 0], tendrils: [0, -9, 0] };
    return K.finish(G, joints, VOX, 'floater', 2);
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = Eyeball;
