/* Bone Hound v2 (CANDIDATE, not signed off: the game still uses bone_hound.js until the owner says so).
   Same skeletal dog with a spiked collar, rebuilt at twice the detail (one voxel is half the size) and hunched like a predator:
   high shoulders, low head, a real ribcage you can see through with an ember glow inside, deep eye sockets with glowing eyes, fangs, a jointed jaw.
   Model space: paws at y = 0, +Y up, the nose points to -Z. Same parts and joints as v1, so the rig does not change:
   body, head, jaw, legFR, legFL, legBR, legBL. */
const BoneHoundV2 = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.025;
  const BONE = 0xdcd2b8, BONE_D = 0xa89c80, BONE_X = 0x77705c, DARK = 0x1c1714, CLAW = 0x2e2820, STEEL = 0x2c2c34, STEEL_L = 0x6a6a78;
  const EYE = 0xff9a2a, EMBER = 0xff5a14, SINEW = 0x4e1d1d;
  const J = { shoulderY: 30, hipY: 32, hipZ: 24, frontZ: -10, legX: 8, neck: [0, 40, -24], jaw: [0, 33, -34] };
  const spineY = (z) => 44 - 4 * (z + 18) / 44;           // the back slopes down from high shoulders to the hips

  function buildBody() {
    const g = new Voxel.Grid(161);
    // spine: a bone line with a spike on every other vertebra
    K.line(g, [-1, 44, -18], [-1, 40, 26], 3, BONE_D);
    for (let z = -16, i = 0; z <= 24; z += 4, i++) g.box(-1, Math.round(spineY(z)) + 3, z, 1, Math.round(spineY(z)) + (i % 2 ? 6 : 8), z + 2, BONE);
    // ribcage: eight ribs with gaps between them, narrowing at the front and rear
    [[-16, 8], [-12, 10], [-8, 11], [-4, 11.5], [0, 11], [4, 10], [8, 8.5], [12, 6.5]].forEach(([z, rx]) => K.ring(g, z, 0, 27.5, rx, 14, BONE, 2, 0.22));
    K.line(g, [-1, 13, -16], [-1, 13, 13], 2, BONE_D);                       // breastbone
    [[0, 24, -9, 3, 4, 3.5], [1, 28, -2, 3.5, 5, 4], [-1, 25, 5, 3, 4, 4], [0, 30, 9, 2.5, 3, 3]].forEach(([x, y, z, rx, ry, rz]) => g.ell(x, y, z, rx, ry, rz, EMBER, 0, 'glow'));   // coals glowing inside the ribs, seen through the gaps
    // torn sinew hanging from the ribs
    [[11, 17, -10], [11, 18, 2], [-12, 16, -6], [-12, 19, 6]].forEach(([x, y, z]) => g.box(x, y, z, x + 1, y + 7, z + 1, SINEW));
    // shoulder blades and the pelvis
    g.mell(10, 36, -12, 2.5, 8, 6, BONE_D);
    g.ell(0, 36, 26, 6, 4, 6, BONE); g.mell(7, 34, 25, 1.6, 7, 7, BONE_D); g.box(-4, 30, 22, 4, 34, 30, BONE_X);   // sacrum and two hip plates
    // neck bones
    K.line(g, [-1, 40, -19], [-1, 37, -28], 4, BONE_D);
    [[-22, 41], [-25, 40], [-28, 38]].forEach(([z, y]) => g.box(-2, y, z, 2, y + 2, z + 2, BONE));   // neck vertebrae
    // spiked steel collar: a ring round the neck with ten long cone spikes
    K.ring(g, -27, 0, 38, 9, 10.5, STEEL, 4, 0.4);
    for (let a = 0; a < 10; a++) {
      const ang = a * Math.PI / 5, x = Math.round(Math.cos(ang) * 10.5), y = 38 + Math.round(Math.sin(ang) * 11.5);
      g.box(x - 1, y - 1, -27, x + 1, y + 1, -23, STEEL_L);
      g.set(Math.round(Math.cos(ang) * 13), 38 + Math.round(Math.sin(ang) * 14), -25, STEEL_L);
    }
    // tail: a chain of vertebrae that thins out and curls up into a bone blade
    const tail = [[0, 38, 26], [0, 34, 34], [0, 35, 42], [0, 40, 48], [0, 48, 51]];
    for (let i = 0; i + 1 < tail.length; i++) K.line(g, tail[i], tail[i + 1], i < 2 ? 3 : 2, BONE_D);
    tail.forEach((p, i) => g.box(p[0] - 2, p[1], p[2] - 1, p[0] + 2, p[1] + 3, p[2] + 2, i % 2 ? BONE : BONE_D));
    g.box(-1, 49, 50, 1, 59, 52, BONE); g.box(-1, 57, 50, 1, 61, 52, BONE_X);
    return g;
  }

  function buildHead() {
    const g = new Voxel.Grid(162);
    g.ell(0, 42, -40, 9, 8, 9, BONE);                                         // cranium
    g.box(-1, 49, -46, 1, 54, -34, BONE_D);                                    // skull crest
    g.box(-4, 34, -58, 4, 41, -40, BONE_D); g.box(-3, 41, -58, 3, 43, -40, BONE);   // snout and nose bridge
    g.box(-3, 37, -61, 3, 41, -58, DARK);                                      // nose pad
    g.mbox(3, 45, -47, 8, 48, -36, BONE);                                      // brow ridges
    g.mbox(3, 40, -49, 8, 45, -44, DARK);                                      // deep eye sockets
    g.mbox(4, 41, -50, 7, 44, -47, EYE, 0, 'glow');                            // glowing eyes (front layer of the socket so they show)
    g.mbox(7, 36, -45, 10, 42, -34, BONE_D);                                   // cheekbones
    for (const x of [-4, -1, 2]) g.box(x, 29, -60, x + 2, 34, -58, BONE);      // front fangs
    for (let z = -56; z <= -42; z += 3) { g.box(-6, 31, z, -5, 34, z + 1, BONE); g.box(5, 31, z, 6, 34, z + 1, BONE); }   // side teeth
    K.line(g, [-10, 49, -36], [-13, 60, -31], 3, BONE_D); K.line(g, [8, 49, -36], [11, 60, -31], 3, BONE_D);              // ear spikes
    return g;
  }

  function buildJaw() {
    const g = new Voxel.Grid(163);
    g.box(-4, 29, -58, 4, 33, -55, BONE_D);                                    // chin
    g.mbox(4, 29, -57, 6, 33, -34, BONE_D);                                    // jaw bones running back to the hinge
    for (let z = -54; z <= -42; z += 3) { g.box(-4, 33, z, -3, 36, z + 1, BONE); g.box(3, 33, z, 4, 36, z + 1, BONE); }
    g.box(-1, 33, -58, 1, 36, -57, BONE);
    return g;
  }

  // front legs stand straight; hind legs are bent (knee forward, hock back) like a dog's
  function buildLeg(side, z, hind) {
    const g = new Voxel.Grid(164 + (side > 0 ? 1 : 0) + (hind ? 2 : 0)), xc = side * J.legX, xo = xc - 1;
    if (!hind) {
      K.line(g, [xo - 1, 18, z - 1], [xo - 1, 32, z - 1], 4, BONE);                   // upper leg
      g.ell(xc, 18, z, 3.4, 3.4, 3.4, BONE_D);                                         // elbow
      K.line(g, [xo, 6, z], [xo, 18, z], 2, BONE_D);                                   // forearm
    } else {
      K.line(g, [xo - 1, 24, z - 5], [xo - 1, 36, z + 1], 4, BONE);                    // thigh
      g.ell(xc, 24, z - 6, 3.6, 3.6, 3.6, BONE_D);                                     // knee
      K.line(g, [xo, 12, z + 2], [xo, 24, z - 5], 3, BONE);                            // shin, sloping back to the hock
      g.ell(xc, 12, z + 3, 3, 3, 3, BONE_D);                                           // hock
      K.line(g, [xo, 4, z - 1], [xo, 12, z + 2], 2, BONE_D);                           // foot bone
    }
    const pz = hind ? z - 1 : z;
    g.box(xc - 4, 0, pz - 7, xc + 4, 4, pz + 3, BONE_D);                               // paw
    for (let i = 0; i < 3; i++) { g.box(xc - 4 + i * 3, 0, pz - 11, xc - 2 + i * 3, 3, pz - 7, BONE); g.box(xc - 4 + i * 3, 0, pz - 14, xc - 2 + i * 3, 2, pz - 11, CLAW); }   // toes and claws
    return g;
  }

  function build() {
    const names = ['body', 'head', 'jaw', 'legFR', 'legFL', 'legBR', 'legBL'];
    const G = { body: buildBody(), head: buildHead(), jaw: buildJaw(), legFR: buildLeg(1, J.frontZ, false), legFL: buildLeg(-1, J.frontZ, false), legBR: buildLeg(1, J.hipZ, true), legBL: buildLeg(-1, J.hipZ, true) };
    const joints = { head: J.neck, jaw: J.jaw, legFR: [J.legX, J.shoulderY, J.frontZ], legFL: [-J.legX, J.shoulderY, J.frontZ], legBR: [J.legX, J.hipY, J.hipZ], legBL: [-J.legX, J.hipY, J.hipZ] };
    const pose = names.map((n) => { const j = joints[n] || [0, 0, 0]; return { name: n, grid: G[n], pivot: j, off: j.map((v) => v * VOX) }; });
    return { vox: VOX, grids: G, joints, pose };
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = BoneHoundV2;
