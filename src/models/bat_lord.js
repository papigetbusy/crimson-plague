/* Bat Lord (placeholder, Crusader Tactics boss): a big dark-purple bat with a fanged snarling face, glowing red eyes, huge ribbed wings and hanging talons.
   It hovers and dives. Model space: its centre is at y = 0 (the screen lifts it off the floor), the face points to -Z.
   Parts: body (with the head), wingR, wingL, armR and armL (the talons, which reach forward as it dives). Placeholder until Grok's art is in. */
const BatLord = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.1;
  const FUR = 0x3a1a4a, FUR_L = 0x5a2a6e, BELLY = 0x7a4a86, EAR = 0x6a2a50, EYE = 0xff3030, EYE_H = 0xffc0a0, FANG = 0xece4d0, MAW = 0x1a0610, BONE = 0x2a1030, MEM = 0x55223e, MEM_L = 0x7a3358, CLAW = 0xd8d0c0;
  const J = { wing: 7, wingY: 3, talonX: 4, talonY: -7 };
  function body() {
    const g = new Voxel.Grid(301);
    g.ell(0, 0, 0, 7.5, 9.5, 6.5, FUR, 0.07);                                                      // chest and belly
    g.ell(0, -1.5, -2.5, 5, 7, 3.5, BELLY, 0.05);                                                  // a paler belly on the front
    g.ell(0, 11, -1, 5.6, 5, 5.2, FUR_L, 0.06);                                                    // the head
    g.ell(0, 9.2, -5.8, 3.2, 2.6, 2.6, FUR, 0.05);                                                 // the snout
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 7; i++) g.ell(sd * (3.4 + i * 0.35), 15 + i * 1.05, -1 + i * 0.1, 1.9 - i * 0.2, 1.2, 1.2, i < 5 ? EAR : FUR, 0.06);            // tall pointed ears
      g.ell(sd * 3.1, 12.3, -5.9, 1.7, 1.2, 0.9, EYE, 0, 'glow'); g.ell(sd * 3.4, 12.7, -6.5, 0.7, 0.6, 0.4, EYE_H, 0, 'glow');                          // burning eyes
      g.box(sd * 4.4 - 1, 13.8, -6.2, sd * 4.4 + 1, 14.4, -5.4, BONE, 0.04);                                                                                // a heavy brow
      g.mbox(sd * 1.7 - 0.5, 6.2, -8.2, sd * 1.7 + 0.5, 8.6, -7.4, FANG, 0.03);                                                                           // fangs
    }
    g.box(-2, 8.2, -8.2, 2, 9.4, -6.8, MAW, 0.03);                                                 // the snarling mouth
    g.ell(0, 10, -8, 1, 0.8, 0.6, BONE, 0.03);                                                     // the nose
    for (let i = 0; i < 5; i++) g.box(-5 + i * 2 - 1, 2 - i % 2 * 2 - 6, -6.6, -5 + i * 2 + 1, 4 - i % 2 * 2 - 6, -5.8, BELLY, 0.04);     // ribbing on the belly
    g.ell(0, -9, 3.5, 2, 3, 2, FUR, 0.06);                                                         // a short tail
    return g;
  }
  function wing(side) {
    const g = new Voxel.Grid(302 + (side > 0 ? 1 : 0)), x0 = side * J.wing;
    for (let i = 0; i < 26; i++) {                                                                  // the membrane: scalloped between five finger bones
      const x = x0 + side * i, top = 4 + Math.round(8 * Math.sin(Math.min(1, i / 9) * 1.2) - i * 0.18), scallop = Math.abs(((i % 6) - 3)) * 0.8;
      const bot = -9 + Math.round(i * 0.35 + scallop);
      for (let y = bot; y <= top; y++) g.set(side > 0 ? x : x - 1, y, 0, y > top - 2 || i % 6 === 0 ? BONE : (y + i) % 5 === 0 ? MEM_L : MEM, 0.07);
      g.set(side > 0 ? x : x - 1, top + 1, 0, BONE, 0.05);
    }
    for (const [dx, dy] of [[6, -9], [13, -12], [19, -9], [25, -5]]) for (let i = 0; i <= 8; i++) { const t = i / 8; g.set(x0 + side * Math.round(dx * t), Math.round(10 * (1 - t) + dy * t), 0, BONE, 0.04); g.set(x0 + side * Math.round(dx * t), Math.round(10 * (1 - t) + dy * t), 1, BONE, 0.04); }   // finger bones
    g.ell(x0 + side * 26, 1.5, 0, 1.3, 1.3, 1.3, CLAW, 0.03);                                       // the thumb claw on the wing tip
    return g;
  }
  function talon(side) {
    const g = new Voxel.Grid(304 + (side > 0 ? 1 : 0)), x = side * J.talonX, y = J.talonY;
    for (let i = 0; i < 6; i++) g.ell(x, y - i * 0.9, -i * 0.3, 1.7 - i * 0.12, 1, 1.7 - i * 0.12, FUR, 0.06);      // a hanging leg
    for (const dz of [-1.4, 0, 1.4]) for (let i = 0; i < 4; i++) g.ell(x + (dz) * 0.3, y - 5.5 - i * 0.5, -1.5 - i * 0.7 + dz * 0.3, 0.6, 0.6, 0.9, CLAW, 0.02);   // three hooked talons
    return g;
  }
  function build() {
    const G = { body: body(), wingR: wing(1), wingL: wing(-1), armR: talon(1), armL: talon(-1) };
    const joints = { wingR: [J.wing, J.wingY, 0], wingL: [-J.wing, J.wingY, 0], armR: [J.talonX, J.talonY + 3, 0], armL: [-J.talonX, J.talonY + 3, 0] };
    return K.finish(G, joints, VOX, 'floater', 2);
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = BatLord;
