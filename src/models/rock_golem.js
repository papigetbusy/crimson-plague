/* Rock Golem: a hulking pile of dark boulders with glowing ember cracks, drawn after the Crusader Tactics sprite (rock-golem.png).
   Model space: feet at y = 0, +Y up, the face points to -Z. Same parts as the horned fiend (body, legs, torso, head, arms). */
const RockGolem = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.048;
  const PAL = [0x1c1c22, 0x2a2a33, 0x3a3a44, 0x4c4c57, 0x5f5f6b], PLATE = [0x4a4a55, 0x5c5c68, 0x6e6e7b], EMBER = 0xff5a1a, EMBER2 = 0xffa030;
  const J = { hip: 22, neck: 50, shoulder: 50, elbow: 34, legX: 9, shoulderX: 24 };
  // lighter rock plates stuck on a surface, so the body reads as a pile of separate slabs like the sprite
  function plates(g, list, seed) { list.forEach((p, i) => K.rock(g, p[0], p[1], p[2], p[3], p[4], p[5], PLATE, seed + i)); }

  function buildLeg(side) {
    const g = new Voxel.Grid(71 + (side > 0 ? 1 : 0)), x = side * J.legX;
    K.rock(g, x, 13, 0, 8.5, 10.5, 8.5, PAL, 11); K.rock(g, x + side, 4, -2, 9.5, 5, 10.5, PAL, 12);   // thigh/shin and a wide front-heavy foot
    plates(g, [[x, 17, -6, 5, 4, 3], [x + side * 3, 5, -9, 4, 3, 3]], 14);
    K.crack(g, [[x - 2, 21], [x, 15], [x - 3, 10]], EMBER);
    return g;
  }
  function buildBody() {
    const g = new Voxel.Grid(73);
    K.rock(g, 0, 26, 0, 15, 5.5, 9.5, PAL, 21);                                // hips
    K.crack(g, [[-6, 28], [-2, 25], [4, 26]], EMBER);
    return g;
  }
  function buildTorso() {
    const g = new Voxel.Grid(74);
    K.rock(g, 0, 33, -1, 12, 6, 8.5, PAL, 31);                                 // belly
    K.rock(g, 0, 45, -1, 20, 12, 11.5, PAL, 32);                               // huge chest, wider than the hips
    K.rock(g, 0, 55, 3, 15, 5, 9, PAL, 33);                                    // hunched upper back
    plates(g, [[-9, 49, -9, 6, 5, 4], [8, 52, -8, 6, 4, 4], [-1, 41, -10, 7, 4, 3.5], [11, 40, -8, 5, 4, 3.5], [-12, 40, -7, 4, 4, 3.5], [0, 55, 5, 9, 4, 5]], 34);
    K.crack(g, [[-7, 52], [-3, 47], [-7, 42], [-1, 38], [-3, 33], [2, 31]], EMBER);
    K.crack(g, [[-3, 47], [3, 45], [9, 48]], EMBER2);
    K.crack(g, [[9, 43], [12, 38], [11, 34]], EMBER);
    return g;
  }
  function buildHead() {
    const g = new Voxel.Grid(75);
    K.rock(g, 0, 56, -5, 8.5, 6.5, 7.5, PAL, 41);                              // head sunk low and forward between the shoulders
    K.rock(g, 0, 60, -9, 7, 2.5, 3.5, PLATE, 42);                              // heavy brow slab
    g.mbox(2, 57, -13, 5, 58, -12, EMBER2, 0, 'glow'); g.mbox(4, 58, -13, 7, 59, -12, EMBER2, 0, 'glow');   // slanted angry eyes
    g.box(-4, 52, -13, 4, 53, -12, EMBER, 0, 'glow'); g.box(-3, 51, -13, 3, 52, -12, EMBER2, 0, 'glow');     // glowing mouth slit
    return g;
  }
  function buildArmU(side) {
    const g = new Voxel.Grid(76 + (side > 0 ? 1 : 0)), x = side * J.shoulderX;
    K.rock(g, x, 51, 0, 11, 8.5, 9.5, PAL, 51);                                // massive shoulder boulder
    K.rock(g, x + side * 2, 41, 0, 7, 9, 7, PAL, 52);                          // upper arm
    plates(g, [[x + side * 2, 58, 0, 7, 3.5, 6], [x + side * 3, 52, -7, 5, 5, 3]], 53);
    K.crack(g, [[x + side * 2, 52], [x + side * 3, 46], [x + side * 3, 40]], EMBER);
    return g;
  }
  function buildArmF(side) {
    const g = new Voxel.Grid(78 + (side > 0 ? 1 : 0)), x = side * (J.shoulderX + 3);
    K.rock(g, x, 24, -1, 8, 10, 8, PAL, 61);                                   // forearm
    K.rock(g, x, 10, -2, 10.5, 9, 10, PAL, 62);                                // huge fist
    plates(g, [[x, 28, -6, 5, 5, 3], [x, 12, -9, 6, 4, 3]], 63);
    K.crack(g, [[x - 2, 28], [x, 22], [x - 1, 15]], EMBER);
    return g;
  }
  function build() {
    const names = ['body', 'legR', 'legL', 'torso', 'head', 'armRU', 'armLU', 'armRF', 'armLF'];
    const G = { body: buildBody(), legR: buildLeg(1), legL: buildLeg(-1), torso: buildTorso(), head: buildHead(), armRU: buildArmU(1), armLU: buildArmU(-1), armRF: buildArmF(1), armLF: buildArmF(-1) };
    const sx = J.shoulderX + 3;
    const joints = { legR: [J.legX, J.hip, 0], legL: [-J.legX, J.hip, 0], torso: [0, 28, 0], head: [0, J.neck, 0], armRU: [J.shoulderX, J.shoulder, 0], armLU: [-J.shoulderX, J.shoulder, 0], armRF: [sx, J.elbow, 0], armLF: [-sx, J.elbow, 0] };
    const pose = names.map((n) => { const j = joints[n] || [0, 0, 0]; return { name: n, grid: G[n], pivot: j, off: j.map((v) => v * VOX) }; });
    return { vox: VOX, grids: G, joints, pose };
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = RockGolem;
