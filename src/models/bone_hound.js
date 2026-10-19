/* Bone Hound: a skeletal dog with a spiked collar, drawn after the Crusader Tactics sprite (bone-hound.png).
   Model space: paws at y = 0, +Y up, the nose points to -Z. Parts: body (spine, ribs, pelvis, tail, collar), head, jaw, four legs. */
const BoneHound = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.05;
  const BONE = 0xd8cfb6, BONE_D = 0xa79c82, DARK = 0x2a2420, STEEL = 0x2c2c34, STEEL_L = 0x6a6a78, EYE = 0xff9a2a;
  const J = { shoulder: 14, hipZ: 12, frontZ: -5, legX: 4, neck: [0, 19, -12], jaw: [0, 19, -15] };

  function buildBody() {
    const g = new Voxel.Grid(61);
    K.line(g, [-2, 19, -9], [-2, 20, 13], 3, BONE_D);                      // spine
    for (let z = -8; z <= 12; z += 3) g.box(-1, 22, z, 1, z % 2 ? 25 : 24, z + 2, BONE);   // spine spikes
    [[-8, 5.2], [-4, 6.2], [0, 6.4], [4, 5.6], [8, 4.4]].forEach(([z, rx]) => K.ring(g, z, 0, 13, rx + 0.5, 7, BONE, 2, 0.42));   // ribs
    K.line(g, [-1, 6, -8], [-1, 6, 9], 2, BONE_D);                           // breastbone
    g.ell(0, 15, 13, 5.5, 4.5, 4.5, BONE_D); g.ell(0, 17, 14, 3.5, 2.5, 2.5, BONE);   // pelvis
    g.mell(5, 16, -5, 2, 4.5, 3.5, BONE_D);                                 // shoulder blades
    K.line(g, [-1, 18, -8], [-1, 21, -12], 2, BONE_D);                       // neck bones
    // spiked steel collar with long cone spikes
    K.ring(g, -12, 0, 20, 5, 5.4, STEEL, 3, 0.5);
    for (let a = 0; a < 10; a++) { const ang = a * Math.PI / 5, x = Math.round(Math.cos(ang) * 6), y = 20 + Math.round(Math.sin(ang) * 6.4); g.box(x - 1, y - 1, -12, x + 1, y + 1, -10, STEEL_L); g.set(Math.round(Math.cos(ang) * 8) - 0, 20 + Math.round(Math.sin(ang) * 8.4), -11, STEEL_L); }
    // tail: thin vertebrae, curling up at the end
    const tail = [[0, 17, 14], [0, 16, 18], [0, 17, 22], [0, 20, 25], [0, 24, 26]];
    for (let i = 0; i + 1 < tail.length; i++) K.line(g, tail[i], tail[i + 1], 2, BONE_D);
    tail.forEach((p, i) => g.box(p[0] - 1, p[1], p[2], p[0] + 1, p[1] + 2, p[2] + 2, i % 2 ? BONE : BONE_D));
    return g;
  }
  function buildHead() {
    const g = new Voxel.Grid(62);
    g.ell(0, 23, -17, 6, 5.2, 5.6, BONE);                                    // skull
    g.box(-3, 19, -27, 3, 23, -17, BONE_D); g.box(-2, 23, -27, 2, 24, -17, BONE);   // snout and nose bridge
    g.box(-2, 21, -28, 2, 23, -27, DARK);                                     // nose
    g.mbox(2, 25, -23, 5, 27, -17, BONE);                                    // brow ridge
    g.mbox(2, 22, -23, 5, 26, -21, DARK); g.mbox(3, 23, -23, 5, 25, -22, EYE, 0, 'glow');  // eye sockets with red glow
    for (let x = -3; x < 3; x += 2) g.box(x, 16, -27, x + 1, 19, -26, BONE);   // upper fangs at the front
    for (let z = -26; z <= -19; z += 2) { g.box(-3, 17, z, -2, 19, z + 1, BONE); g.box(2, 17, z, 3, 19, z + 1, BONE); }
    K.line(g, [-5, 27, -15], [-6, 32, -13], 2, BONE_D); K.line(g, [4, 27, -15], [5, 32, -13], 2, BONE_D);   // ear spikes
    return g;
  }
  function buildJaw() {
    const g = new Voxel.Grid(63);
    g.mbox(2, 16, -26, 4, 19, -15, BONE_D);
    g.box(-2, 16, -27, 2, 19, -25, BONE_D);
    for (let z = -26; z <= -17; z += 2) { g.box(-3, 19, z, -2, 21, z + 1, BONE); g.box(2, 19, z, 3, 21, z + 1, BONE); }
    g.box(-1, 19, -27, 1, 21, -26, BONE);
    return g;
  }
  function buildLeg(side, z, hind) {
    const g = new Voxel.Grid(64 + (side > 0 ? 1 : 0) + (hind ? 2 : 0)), xo = side > 0 ? J.legX - 1 : -J.legX - 1;
    const kz = hind ? z + 2 : z, bz = hind ? z - 1 : z;
    K.line(g, [xo - 1, 8, kz], [xo - 1, 14, z], 3, BONE);                              // upper leg
    g.ell(xo + 1, 8, kz + 1, 2.6, 2.6, 2.6, BONE_D);                           // knee
    K.line(g, [xo, 3, bz], [xo, 8, kz], 2, BONE);                              // lower leg
    g.box(xo - 2, 0, bz - 5, xo + 4, 3, bz + 2, BONE_D);                       // paw
    for (let i = 0; i < 3; i++) g.box(xo - 1 + i * 2, 0, bz - 8, xo + i * 2, 2, bz - 5, 0x3a3228);   // claws
    return g;
  }
  function build() {
    const names = ['body', 'head', 'jaw', 'legFR', 'legFL', 'legBR', 'legBL'];
    const G = { body: buildBody(), head: buildHead(), jaw: buildJaw(), legFR: buildLeg(1, J.frontZ, false), legFL: buildLeg(-1, J.frontZ, false), legBR: buildLeg(1, J.hipZ, true), legBL: buildLeg(-1, J.hipZ, true) };
    const joints = { head: J.neck, jaw: J.jaw, legFR: [J.legX, J.shoulder, J.frontZ], legFL: [-J.legX, J.shoulder, J.frontZ], legBR: [J.legX, J.shoulder, J.hipZ], legBL: [-J.legX, J.shoulder, J.hipZ] };
    const pose = names.map((n) => { const j = joints[n] || [0, 0, 0]; return { name: n, grid: G[n], pivot: j, off: j.map((v) => v * VOX) }; });
    return { vox: VOX, grids: G, joints, pose };
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = BoneHound;
