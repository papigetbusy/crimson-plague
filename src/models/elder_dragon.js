/* Elder Dragon (placeholder, Crusader Tactics boss): a huge crimson-scaled dragon on four pillar legs, a long neck and horned head, glowing furnace eyes and mouth,
   a spiked back, big ribbed wings and a swaying tail. It stands and breathes fire. Model space: its feet are at y = 0, the face points to -Z.
   Parts: body (trunk, legs, neck, head), wingR, wingL, armR and armL (the small front claws), tendrils (the tail). Placeholder until Grok's art is in. */
const ElderDragon = (function () {
  const VOX = 0.1;
  const SCALE = 0x8a2020, SCALE_L = 0xb33a2a, SCALE_D = 0x4a1010, BELLY = 0xd8a060, BELLY_D = 0xb07a44, HORN = 0xe8dcc0, EYE = 0xffc020, EYE_H = 0xfff0a0, MAW = 0x2a0808, FIRE = 0xff7a18, FIRE_H = 0xffd060, MEM = 0x6a1818, MEM_L = 0x982a22, CLAW = 0xe0d8c0;
  const J = { wing: 6, wingY: 22, wingZ: -2, clawX: 5, clawY: 14 };
  function body() {
    const g = new Voxel.Grid(321);
    g.ell(0, 15, 2, 9.5, 8.5, 13, SCALE, 0.07);                                                      // the trunk
    g.ell(0, 12, -1, 7, 5, 11, BELLY, 0.05);                                                         // the pale belly plates
    for (let i = 0; i < 8; i++) g.box(-6, 9.5 + (i % 2) * 0.4, -8 + i * 2.2, 6, 10 + (i % 2) * 0.4, -7 + i * 2.2, BELLY_D, 0.04);
    for (const [x, z] of [[-6.5, -5], [6.5, -5], [-6.5, 10], [6.5, 10]]) {                          // four thick legs
      g.ell(x, 8, z, 3.6, 8, 3.6, SCALE, 0.07); g.ell(x, 1.5, z - 1, 4, 1.8, 4.6, SCALE_D, 0.05);
      for (const dx of [-1.8, 0, 1.8]) g.ell(x + dx, 0.8, z - 4, 0.9, 0.9, 1.4, CLAW, 0.02);
    }
    for (let i = 0; i < 7; i++) g.ell(0, 23.2 - Math.abs(i - 3) * 0.2, -6 + i * 3.4, 1.4, 2.3 - Math.abs(i - 3) * 0.15, 1.6, i % 2 ? SCALE_L : SCALE_D, 0.05);   // spikes down the back
    for (let i = 0; i < 6; i++) g.ell(0, 17 + i * 1.8, -10 - i * 2.4, 4.3 - i * 0.2, 4.2 - i * 0.2, 4.4 - i * 0.2, i % 2 ? SCALE : SCALE_L, 0.06);       // the neck: rising and reaching forward
    g.ell(0, 28.5, -25.4, 4.8, 3.8, 6.4, SCALE_L, 0.06);                                              // the head
    g.ell(0, 27, -30.8, 3.4, 2.4, 3.2, SCALE, 0.05);                                                 // the snout
    g.ell(0, 25.2, -28.6, 3.2, 1.1, 4.8, MAW, 0.02); g.ell(0, 25.6, -29.6, 2.4, 0.6, 3.6, FIRE, 0, 'glow');   // the open maw with fire in its throat
    for (const sd of [-1, 1]) {
      g.ell(sd * 3.6, 30, -25.2, 1.2, 1.1, 1, EYE, 0, 'glow'); g.ell(sd * 3.8, 30.2, -25.8, 0.5, 0.5, 0.4, EYE_H, 0, 'glow');
      for (let i = 0; i < 7; i++) g.ell(sd * (3.2 + i * 0.5), 31.5 + i * 0.7, -22.5 + i * 1.6, 1.3 - i * 0.12, 1.3 - i * 0.12, 1.5, HORN, 0.04);       // swept-back horns
      for (let i = 0; i < 3; i++) g.ell(sd * 2, 25.4, -30 + i * 1.8, 0.55, 1.2, 0.5, HORN, 0.02);                                                      // fangs
      g.ell(sd * 1.4, 28.3, -33.5, 0.5, 0.4, 0.4, MAW, 0.02);                                                                                        // nostrils
    }
    return g;
  }
  function wing(side) {
    const g = new Voxel.Grid(322 + (side > 0 ? 1 : 0)), x0 = side * J.wing;
    for (let i = 0; i < 24; i++) {
      const x = x0 + side * i, top = J.wingY + Math.round(10 * Math.sin(Math.min(1, i / 12) * 1.5) - i * 0.25), bot = J.wingY - 12 + Math.round(i * 0.4 + Math.abs(((i % 7) - 3)) * 0.7);
      for (let y = bot; y <= top; y++) for (let z = 0; z < 2; z++) g.set(side > 0 ? x : x - 1, y, J.wingZ + z, y >= top - 1 || i % 7 === 0 ? SCALE_D : (y + i) % 4 === 0 ? MEM_L : MEM, 0.07);
    }
    for (const [dx, dy] of [[8, -12], [15, -11], [23, -8]]) for (let i = 0; i <= 8; i++) { const t = i / 8; g.set(x0 + side * Math.round(dx * t), Math.round(J.wingY + 8 * (1 - t) + (dy + 4) * t), J.wingZ + 2, SCALE_D, 0.04); }
    g.ell(x0 + side * 24, J.wingY + 3, J.wingZ + 1, 1.3, 1.3, 1.3, CLAW, 0.03);
    return g;
  }
  function claw(side) {
    const g = new Voxel.Grid(324 + (side > 0 ? 1 : 0)), x = side * J.clawX, y = J.clawY;
    for (let i = 0; i < 6; i++) g.ell(x, y - i * 0.5, -9 - i * 1.0, 1.7 - i * 0.1, 1.5, 1.7, SCALE, 0.06);       // a short front arm
    for (const dx of [-1, 0, 1]) g.ell(x + dx, y - 3.5, -15.5, 0.55, 0.55, 1.2, CLAW, 0.02);
    return g;
  }
  function tail() {
    const g = new Voxel.Grid(326);
    for (let i = 0; i < 14; i++) g.ell(Math.sin(i * 0.5) * 1.6, 13 - i * 0.35, 14 + i * 2.4, 4.6 - i * 0.3, 4.2 - i * 0.28, 3, i % 2 ? SCALE : SCALE_L, 0.06);
    g.ell(0, 9, 48, 2.2, 2.2, 2.2, FIRE, 0, 'glow');                                                  // a glowing tail tip
    return g;
  }
  function build() {
    const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
    const G = { body: body(), wingR: wing(1), wingL: wing(-1), armR: claw(1), armL: claw(-1), tendrils: tail() };
    const joints = { wingR: [J.wing, J.wingY, J.wingZ], wingL: [-J.wing, J.wingY, J.wingZ], armR: [J.clawX, J.clawY, -9], armL: [-J.clawX, J.clawY, -9], tendrils: [0, 13, 14] };
    return K.finish(G, joints, VOX, 'floater', 2);
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = ElderDragon;
