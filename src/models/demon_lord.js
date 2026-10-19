/* Demon Lord (boss): tall black-armoured horned demon with gold trim, crimson bat wings and a glowing chest sigil,
   drawn after the Crusader Tactics boss sprite (demon-lord.png).
   Model space: feet at y = 0, +Y up, the face points to -Z. Same parts as the horned fiend, plus two wings. */
const DemonLord = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.04;
  const ARM = 0x201c22, ARM2 = 0x332c33, GOLD = 0xc9a23a, GOLD_D = 0x8a6d22, CLOTH = 0x8a1c24, SIGIL = 0xff6a1a, EYE = 0xff8a20, HORN = 0x6a5748;
  const MEM = [0x2a1620, 0x3a1a26, 0x4c1f2c];
  const J = { hip: 38, waist: 46, neck: 74, shoulder: 68, elbow: 52, legX: 9, shoulderX: 14, wing: [12, 64, 7] };

  function buildLeg(side) {
    const g = new Voxel.Grid(81 + (side > 0 ? 1 : 0)), s = (a, b) => (side > 0 ? [a, b] : [-b, -a]);
    let [x0, x1] = s(5, 13); g.box(x0 + (side > 0 ? -1 : 1), 26, -6, x1 + (side > 0 ? 1 : -1), 38, 5, ARM);                                     // thigh
    [x0, x1] = s(4, 14); g.box(x0, 24, -7, x1, 29, 5, GOLD_D); g.box(x0, 25, -7, x1, 27, -6, GOLD);   // knee guard
    [x0, x1] = s(6, 12); g.box(x0, 9, -4, x1, 24, 3, ARM2); g.box(x0, 10, -5, x1, 12, 4, GOLD_D);   // greave and cuff
    [x0, x1] = s(5, 14); g.box(x0, 0, -10, x1, 9, 5, ARM); g.box(x0, 0, -11, x1, 4, -9, GOLD);       // boot and gold toe cap
    for (let i = 0; i < 3; i++) { const a = s(6 + i * 3, 7 + i * 3)[0]; g.box(a, 0, -14, a + 1, 2, -11, 0x14121a); }   // claws
    return g;
  }
  function buildBody() {
    const g = new Voxel.Grid(83);
    g.box(-10, 36, -6, 10, 47, 6, ARM); g.box(-11, 43, -7, 11, 46, 7, GOLD_D); g.box(-2, 42, -8, 2, 47, -7, GOLD);   // pelvis, belt, buckle
    g.box(-6, 22, -7, 6, 43, -6, CLOTH); g.box(-6, 22, -7, 6, 24, -6, GOLD_D);                                          // front loincloth
    g.box(-5, 28, 5, 5, 43, 6, CLOTH);                                                                                  // back cloth
    K.line(g, [-1, 38, 6], [-1, 30, 13], 2, CLOTH); K.line(g, [-1, 30, 13], [-1, 22, 18], 2, CLOTH); g.box(-2, 19, 17, 1, 23, 20, GOLD);   // tail
    return g;
  }
  function buildTorso() {
    const g = new Voxel.Grid(84);
    g.box(-16, 50, -8, 16, 70, 8, ARM); g.box(-13, 46, -7, 13, 50, 7, ARM);          // broad chest tapering to the waist
    g.box(-14, 52, -9, 14, 68, -8, ARM2);                                       // front plate
    for (const y of [52, 60, 67]) g.box(-14, y, -10, 14, y + 1, -9, GOLD);       // gold bands
    for (const x of [-14, 13]) g.box(x, 52, -10, x + 1, 68, -9, GOLD);           // plate edges
    for (const [x, y] of [[0, 62], [-1, 60], [1, 60], [0, 58], [-2, 56], [2, 56], [0, 55], [-3, 62], [3, 62]]) g.box(x, y, -10, x + 1, y + 1, -9, SIGIL, 0, 'glow');   // small glowing sigil, a V with a core
    for (const [x, y] of [[-9, 56], [8, 64], [-6, 64], [10, 55], [-11, 61]]) g.box(x, y, -10, x + 1, y + 1, -9, GOLD);   // gold flecks like the sprite
    g.box(-9, 68, -7, 9, 72, 7, GOLD_D); g.box(-9, 71, -8, 9, 72, -7, GOLD);     // gorget
    g.box(-15, 49, 7, 15, 69, 9, ARM2);                                          // wing mount on the back
    return g;
  }
  function buildHead() {
    const g = new Voxel.Grid(85);
    g.ell(0, 80, -3, 7.4, 7.4, 7, ARM); g.box(-4, 73, -6, 4, 77, 3, ARM);       // helm and jaw
    g.box(-3, 76, -7, 3, 77, -6, 0xcfc6b0); for (let x = -3; x < 3; x += 2) g.box(x, 74, -7, x + 1, 76, -6, 0xcfc6b0);   // teeth
    g.mbox(1, 79, -8, 4, 81, -6, 0x0a0910); g.mbox(2, 79, -8, 4, 80, -7, EYE, 0, 'glow');   // slit eyes
    g.box(-1, 84, -7, 1, 88, -5, GOLD);                                          // brow crest
    // horns sweeping out and up
    const horn = [[5, 83, 0, 4], [10, 85, -1, 4], [14, 90, -2, 3], [14, 97, -3, 2]];
    for (const side of [1, -1]) {
      for (let i = 0; i + 1 < horn.length; i++) {
        const a = horn[i], b = horn[i + 1], r = a[3], n = 6;
        for (let k = 0; k <= n; k++) { const x = Math.round(a[0] + (b[0] - a[0]) * k / n), y = Math.round(a[1] + (b[1] - a[1]) * k / n), z = Math.round(a[2] + (b[2] - a[2]) * k / n); g.box(side > 0 ? x : -x - r, y, z, side > 0 ? x + r : -x, y + r, z + r, HORN); }
      }
      const tx = side > 0 ? 13 : -16; g.box(tx, 97, -4, tx + 3, 101, -1, GOLD);   // gold-capped tips
    }
    return g;
  }
  function buildArmU(side) {
    const g = new Voxel.Grid(86 + (side > 0 ? 1 : 0)), o = side > 0 ? 0 : -1, f = (a) => (side > 0 ? a : -a);
    g.ell(f(19) + 0, 69, 0, 7.5, 5.5, 7.5, ARM2); K.line(g, [side > 0 ? 18 : -20, 72, 0], [side > 0 ? 19 : -21, 80, 0], 2, GOLD);   // pauldron and spike
    g.box(side > 0 ? 13 : -22, 66, -8, side > 0 ? 22 : -13, 67, 8, GOLD_D);
    g.box(side > 0 ? 14 : -23, 53, -4, side > 0 ? 23 : -14, 66, 4, ARM);       // upper arm
    return g;
  }
  function buildArmF(side) {
    const g = new Voxel.Grid(88 + (side > 0 ? 1 : 0)), a = side > 0 ? [15, 21] : [-21, -15], b = side > 0 ? [14, 22] : [-22, -14];
    g.box(a[0] - (side > 0 ? 1 : -1), 36, -4, a[1] + (side > 0 ? 2 : -2), 53, 4, ARM); g.box(b[0], 38, -4, b[1], 47, 4, GOLD_D); g.box(b[0], 46, -4, b[1], 47, 4, GOLD);   // forearm and vambrace
    g.box(a[0], 31, -3, a[1], 36, 3, ARM2);                                     // hand
    for (let i = 0; i < 3; i++) { const x = a[0] + i * 2; g.box(x, 26, -2, x + 1, 31, 0, 0xcfc6b0); }   // claws
    return g;
  }
  function buildWing(side) {
    const g = new Voxel.Grid(90 + (side > 0 ? 1 : 0));
    const P = [[12, 62], [34, 86], [52, 100], [58, 84], [49, 79], [56, 62], [44, 60], [41, 48], [27, 55], [13, 48]];
    K.poly(g, P, 8, 10, MEM, 7);
    for (const [a, b, r] of [[[12, 62], [34, 86], 2], [[34, 86], [52, 100], 2], [[34, 86], [58, 84], 1], [[34, 86], [56, 62], 1], [[34, 86], [41, 48], 1]]) K.line(g, [a[0], a[1], 7], [b[0], b[1], 7], r + 1, r > 1 ? 0x3a2f2c : 0x2a1a20);
    g.box(50, 98, 6, 53, 102, 10, GOLD);                                         // wing tip claw
    if (side < 0) { const m = new Voxel.Grid(91); K.mirror(g, m); return m; }
    return g;
  }
  function build() {
    const names = ['body', 'legR', 'legL', 'torso', 'head', 'armRU', 'armLU', 'armRF', 'armLF', 'wingR', 'wingL'];
    const G = { body: buildBody(), legR: buildLeg(1), legL: buildLeg(-1), torso: buildTorso(), head: buildHead(), armRU: buildArmU(1), armLU: buildArmU(-1), armRF: buildArmF(1), armLF: buildArmF(-1), wingR: buildWing(1), wingL: buildWing(-1) };
    const joints = { legR: [J.legX, J.hip, 0], legL: [-J.legX, J.hip, 0], torso: [0, J.waist, 0], head: [0, J.neck, 0], armRU: [J.shoulderX, J.shoulder, 0], armLU: [-J.shoulderX, J.shoulder, 0], armRF: [J.shoulderX, J.elbow, 0], armLF: [-J.shoulderX, J.elbow, 0], wingR: J.wing, wingL: [-J.wing[0], J.wing[1], J.wing[2]] };
    const pose = names.map((n) => { const j = joints[n] || [0, 0, 0]; return { name: n, grid: G[n], pivot: j, off: j.map((v) => v * VOX) }; });
    return { vox: VOX, grids: G, joints, pose };
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = DemonLord;
