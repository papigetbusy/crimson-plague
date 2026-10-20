/* Flame Spirit (placeholder, Crusader Tactics monster): a teardrop of living fire with a hollow-eyed face, two flickering arms and a trailing tail of embers.
   It floats and hurls fireballs. All of it glows (it lights itself). Model space: its centre is at y = 0 (the screen lifts it off the floor), the face points to -Z.
   Parts: body (flame), armR, armL. Placeholder until Grok's art is in. */
const FlameSpirit = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.05;
  const CORE = 0xfff0a0, MID = 0xffb030, OUT = 0xff5a14, DEEP = 0xc8260c, HOLLOW = 0x2a0a06;
  const J = { shoulderX: 9, shoulder: 2 };
  const pickC = (d) => d < 0.3 ? CORE : d < 0.55 ? MID : d < 0.8 ? OUT : DEEP;
  function body() {
    const g = new Voxel.Grid(241);
    for (let x = -12; x <= 12; x++) for (let y = -26; y <= 16; y++) for (let z = -10; z <= 10; z++) {
      const t = (y + 26) / 42, rad = y > 0 ? 11 * Math.sqrt(Math.max(0, 1 - (y / 16) ** 2)) : 11 * Math.pow(Math.max(0, 1 + y / 26), 1.4) * (0.9 + 0.1 * Math.sin(y * 0.9));
      const wob = Math.sin(y * 0.55 + x * 0.3) * 1.2, dx = x + 0.5 + wob * 0.3, d = Math.sqrt(dx * dx + (z + 0.5) * (z + 0.5)) / Math.max(1, rad);
      if (d > 1 || rad < 0.8) continue;
      const lick = 1 - d + Math.sin(x * 0.8 + y * 0.5) * 0.06;
      g.set(x, y, z, pickC(Math.min(1, Math.max(0, (1 - lick) * 0.8 + (0.55 - t) * 0.55))), 0.06, 'glow');   // hotter and yellower towards the top and the middle, deep red at the tail
    }
    for (const [x, y, h] of [[-7, 13, 5], [-3, 17, 7], [0, 19, 9], [4, 17, 7], [8, 12, 5], [-10, 4, 4], [10, 3, 4], [-9, -6, 4], [9, -8, 3.5]]) for (let i = 0; i < h; i++) g.ell(x * (1 + i * 0.02) + (x > 0 ? 1 : -1) * i * 0.35, y + i, 0, 2.2 - i * 0.2, 1.1, 2.2 - i * 0.2, i < h * 0.5 ? MID : OUT, 0.06, 'glow');   // licking flames round the head and sides
    g.mbox(3, 4, -11, 7, 8, -8, HOLLOW, 0.03); g.mbox(4, 5, -11, 6, 7, -10, CORE, 0, 'glow');                                         // hollow eyes with a hot pupil
    g.box(-4, -2, -11, 4, 1, -8, HOLLOW, 0.03);                                                                                       // a screaming mouth
    return g;
  }
  function arm(side) {
    const g = new Voxel.Grid(242 + (side > 0 ? 1 : 0)), x = side * J.shoulderX;
    for (let i = 0; i < 9; i++) g.ell(x + side * (i * 0.9), -1 - i * 0.7, -i * 0.6, 3.2 - i * 0.28, 2.8 - i * 0.2, 3.2 - i * 0.28, pickC(i / 9), 0.06, 'glow');   // a flame arm reaching forward
    g.ell(x + side * 8, -8, -6, 2.6, 2.6, 2.6, CORE, 0, 'glow');                                                                     // a ball of fire in the hand
    return g;
  }
  function build() {
    const G = { body: body(), armR: arm(1), armL: arm(-1) };
    const joints = { armR: [J.shoulderX, J.shoulder, 0], armL: [-J.shoulderX, J.shoulder, 0] };
    return K.finish(G, joints, VOX, 'floater', 2);
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = FlameSpirit;
