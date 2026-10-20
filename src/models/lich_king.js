/* Lich King (placeholder, Crusader Tactics boss): a floating crowned skeleton in a tattered violet robe, burning green eye sockets, a staff topped with a soul orb.
   It floats. Model space: the hem of the robe is at y = 0 (the screen lifts it off the floor), the face points to -Z.
   Parts: body (robe, ribs, skull, crown), armR (holds the staff), armL, tendrils (the ragged hem ribbons). Placeholder until Grok's art is in. */
const LichKing = (function () {
  const VOX = 0.1;
  const ROBE = 0x3a1f5a, ROBE_L = 0x5a3488, ROBE_D = 0x20103a, BONE = 0xe0d8c0, BONE_D = 0xa8a088, SOCKET = 0x0a0612, EYE = 0x7dff9a, EYE_H = 0xe0ffe8, GOLD = 0xe0b040, ORB = 0xb070ff, ORB_H = 0xf0d8ff, STAFF = 0x2a1a14, SOUL = 0x66ffaa;
  const J = { shoulderX: 6, shoulder: 21 };
  function body() {
    const g = new Voxel.Grid(311);
    for (let y = 0; y < 22; y++) {                                                                  // the robe: narrow at the chest, flaring to a ragged hem
      const rad = 4.2 + Math.pow((22 - y) / 22, 1.6) * 8, ragged = y < 4 ? Math.sin(y * 7) * 0.8 : 0;
      for (let x = -14; x <= 14; x++) for (let z = -14; z <= 14; z++) {
        const d = Math.hypot(x + 0.5, (z + 0.5) * 1.1); if (d > rad + ragged || d < rad - 2.2 - (y > 15 ? 3 : 0)) continue;
        g.set(x, y, z, (x + y) % 6 === 0 ? ROBE_L : y < 6 && d > rad - 1 ? ROBE_D : ROBE, 0.08);
      }
    }
    g.ell(0, 22, 0, 7.5, 2.4, 4.6, ROBE_L, 0.06);                                                    // heavy shoulders
    for (let i = 0; i < 4; i++) g.box(-3, 15 + i * 1.7, -4.4, 3, 16.2 + i * 1.7, -3.2, BONE_D, 0.04);   // ribs showing through the robe
    g.box(-0.6, 15, -4.6, 0.6, 21, -3.4, BONE, 0.03);
    g.ell(0, 28, -0.5, 4.6, 5, 4.4, BONE, 0.05);                                                      // the skull
    g.ell(0, 25.4, -3, 3, 1.8, 2.2, BONE_D, 0.05);                                                    // the jaw
    for (const sd of [-1, 1]) { g.ell(sd * 2.1, 28.6, -4.2, 1.4, 1.5, 1, SOCKET, 0.02); g.ell(sd * 2.1, 28.4, -4.8, 0.8, 0.8, 0.6, EYE, 0, 'glow'); g.ell(sd * 2.1, 28.8, -5.2, 0.35, 0.35, 0.3, EYE_H, 0, 'glow'); }   // burning sockets
    g.box(-0.8, 26.4, -4.8, 0.8, 27.8, -3.8, SOCKET, 0.02);
    for (let i = -2; i <= 2; i++) g.box(i * 1.1 - 0.4, 24.2, -5.1, i * 1.1 + 0.4, 25.2, -4.3, BONE, 0.03);      // teeth
    g.box(-5, 31.4, -3, 5, 33, 3, GOLD, 0.05);                                                         // the crown: a band with five spikes
    for (let i = -2; i <= 2; i++) for (let h = 0; h < 4 - Math.abs(i); h++) g.box(i * 2 - 0.6, 33 + h, -0.6, i * 2 + 0.6, 34 + h, 0.6, GOLD, 0.05);
    g.ell(0, 33.5, -3, 0.7, 0.7, 0.7, SOUL, 0, 'glow');
    for (const [x, y, z] of [[-9, 14, -4], [9, 16, 3], [-8, 6, 5], [8, 4, -5]]) g.ell(x, y, z, 0.8, 0.8, 0.8, SOUL, 0, 'glow');   // drifting souls
    return g;
  }
  function arm(side) {
    const g = new Voxel.Grid(312 + (side > 0 ? 1 : 0)), x = side * J.shoulderX;
    for (let i = 0; i < 10; i++) g.ell(x + side * 0.4 * i, J.shoulder - 0.4 * i, -i * 0.9, 1.9 - i * 0.07, 1.9 - i * 0.07, 1.9 - i * 0.07, i < 4 ? ROBE_L : BONE, 0.05);   // a sleeve, then bone, reaching forward
    g.ell(x + side * 4, J.shoulder - 4, -9.6, 1.5, 1.2, 1.7, BONE, 0.04);                                                       // the hand
    if (side > 0) {                                                                                                               // the staff in the right hand
      for (let y = -2; y < 40; y++) g.box(x + 3.4, y, -10.6, x + 4.8, y + 1, -9.2, STAFF, 0.05);
      g.ell(x + 4.1, 42, -9.9, 2.8, 2.8, 2.8, ORB, 0, 'glow'); g.ell(x + 3.4, 43, -11.2, 1, 1, 1, ORB_H, 0, 'glow');
    }
    return g;
  }
  function tendrils() {
    const g = new Voxel.Grid(314);
    for (const [x, z] of [[-9, 2], [-5, 7], [0, 9], [5, 7], [9, 2], [-6, -6], [6, -6]]) for (let i = 0; i < 9; i++) g.ell(x * (1 + i * 0.03) + Math.sin(i * 0.8 + x) * 0.8, 3 - i, z * (1 + i * 0.03), 1.3 - i * 0.08, 0.7, 1.0, i % 3 ? ROBE_D : ROBE, 0.06);   // ribbons of cloth hanging below the hem
    return g;
  }
  function build() {
    const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
    const G = { body: body(), armR: arm(1), armL: arm(-1), tendrils: tendrils() };
    const joints = { armR: [J.shoulderX, J.shoulder, 0], armL: [-J.shoulderX, J.shoulder, 0], tendrils: [0, 3, 0] };
    return K.finish(G, joints, VOX, 'floater', 2);
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = LichKing;
