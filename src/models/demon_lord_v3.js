/* Crimson Demon Lord v3: built by hand in code (not carved from pictures). A towering demon in black plate with gold trim, a crimson cape and bat wings, a skull-snarling horned helm
   with burning eyes, spiked pauldrons, clawed gauntlets, a glowing ember sigil in the chest and cracks of fire through the armour.
   The same eleven jointed parts as v1 and v2 (body, legs, torso, head, two upper arms, two forearms, two wings), so the walk, attacks and wing flap do not change.
   Model space: feet at y = 0, +Y up, the face points to -Z, 4.2 units tall. Placeholder until Grok's art is in. */
const DemonLordV3 = (function () {
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const VOX = 0.05;
  const IRON = 0x1d1b24, IRON_L = 0x383442, IRON_D = 0x100f15, GOLD = 0xa88436, GOLD_L = 0xdcb455, CRIM = 0x8a1218, CRIM_D = 0x4a0a10, CRIM_L = 0xb02a28,
    EMBER = 0xff5a14, HOT = 0xffb030, HORN = 0x2c2420, HORN_L = 0x6e5c48, TOOTH = 0xdcd2b4, MOUTH = 0x140606, FLESH = 0x5a1816;
  const J = { hip: 31, waist: 42, neck: 66, shoulder: 63, elbow: 48, legX: 6, shoulderX: 10, elbowX: 18, wing: [8, 61, 7] };
  const L = K.line;
  // ---------------- legs ----------------
  function legR() {
    const g = new Voxel.Grid(301), x = J.legX;
    g.ell(x, 25, 0, 4.6, 6.5, 4.8, IRON, 0.06);                                                                                     // thigh plate
    g.box(x - 3, 29, -5, x + 4, 31, -3, GOLD, 0.05);                                                                                // gold hip rim
    g.ell(x, 17, -3.4, 2.4, 2.4, 3, GOLD_L, 0.04); g.box(x - 1, 16, -9, x + 1, 19, -5, GOLD, 0.04);                                   // knee cop with a forward spike
    g.ell(x, 11, 1, 3.8, 6.5, 3.8, IRON_L, 0.06); g.box(x - 3, 8, -4, x + 3, 9, 4, GOLD, 0.04); g.box(x - 3, 13, -4, x + 3, 14, 4, GOLD, 0.04);   // greave with gold bands
    g.box(x - 1, 8, -5, x, 17, -4, EMBER, 0.02, 'glow');                                                                            // a seam of fire down the shin
    g.box(x - 4, 0, -7, x + 4, 4, 4, IRON, 0.06); g.box(x - 4, 3, -7, x + 4, 4, -3, GOLD, 0.04);                                     // boot
    for (const dx of [-2.5, 0, 2.5]) L(g, [x + dx, 1, -7], [x + dx, 0, -12], 1, HORN_L, 'solid', 0.04);                              // three heavy claws
    return g;
  }
  // ---------------- body: pelvis, tassets, tabard, cape ----------------
  function body() {
    const g = new Voxel.Grid(303);
    g.box(-9, 28, -5, 9, 40, 5, IRON, 0.06);                                                                                        // pelvis armour
    g.box(-10, 38, -6, 10, 41, 6, GOLD, 0.05);                                                                                      // gold belt
    g.ell(0, 39.5, -6.5, 3.4, 3, 1.6, GOLD_L, 0.04); g.mbox(1, 39, -8.5, 2, 41, -7.5, MOUTH, 0.02); g.box(-1, 37, -8, 1, 38, -7, TOOTH, 0.03);   // a skull buckle
    for (const sgn of [-1, 1]) for (const [y, w] of [[34, 4], [30, 3.4], [26, 3]]) g.ell(sgn * 9, y, 0, w, 2.6, 5.2, IRON_L, 0.06);       // overlapping hip plates
    g.box(-5, 8, -7, 5, 38, -6, CRIM, 0.06); g.box(-4, 9, -8, 4, 11, -6, GOLD, 0.04);                                                // a crimson tabard hanging to the shins with a gold hem
    g.box(-1, 18, -8, 1, 30, -7, GOLD_L, 0.03); g.box(-3, 24, -8, 3, 25, -7, GOLD_L, 0.03);                                          // a gold cross on the tabard
    g.box(-1, 22, -8, 1, 23, -7, EMBER, 0.02, 'glow');
    // the cape: long, behind the legs, tattered at the bottom
    for (let y = 4; y <= 40; y++) { const w = 9 + (40 - y) * 0.16, ragged = y < 14 ? ((y * 7) % 5) : 0; g.box(-Math.round(w) + ragged % 2, y, 7, Math.round(w) - ragged % 3, y + 1, 9, y % 6 < 3 ? CRIM : CRIM_D, 0.07); }
    for (const x of [-6, -2, 2, 6]) g.box(x, 4, 7, x + 1, 12, 9, CRIM_D, 0.05);
    return g;
  }
  // ---------------- torso ----------------
  function torso() {
    const g = new Voxel.Grid(304);
    g.ell(0, 46, 0, 9, 5.5, 6.5, IRON, 0.06);                                                                                       // waist
    g.ell(0, 55, 0, 12.5, 9, 8, IRON, 0.06);                                                                                        // huge barrel chest
    g.ell(0, 57, -2, 11, 7, 7, IRON_L, 0.05);                                                                                       // lighter breastplate over it
    for (const y of [47, 50, 53]) g.box(-8, y, -8, 8, y + 1, -6, GOLD, 0.04);                                                       // gold ridges across the plate
    g.box(-1, 45, -9, 1, 62, -7, GOLD, 0.04);                                                                                       // a gold ridge down the middle
    g.ell(0, 54, -8, 4, 5, 1.2, FLESH, 0.04);                                                                                       // a window of burning flesh in the plate...
    g.box(-2, 54, -9, 2, 55, -8, EMBER, 0.02, 'glow'); g.box(-1, 52, -9, 1, 57, -8, EMBER, 0.02, 'glow'); g.box(0, 53, -10, 1, 56, -9, HOT, 0, 'glow');   // ...with a burning sigil
    for (const [a, b] of [[[-8, 49], [-5, 52]], [[8, 50], [5, 53]], [[-9, 58], [-6, 61]], [[9, 57], [6, 60]]]) L(g, [a[0], a[1], -8], [b[0], b[1], -8], 1, EMBER, 'glow', 0.02);   // cracks of fire in the armour
    g.ell(0, 63, 0, 10, 3, 6.5, IRON, 0.06); g.ell(0, 66, 2, 6, 3.4, 4.4, IRON_D, 0.06);                                              // a high gorget round the neck
    for (const x of [-4, 0, 4]) L(g, [x, 62, 6], [x, 71 - Math.abs(x) * 0.5, 9], 2, HORN, 'solid', 0.04);                            // spines along the upper back
    for (const y of [50, 56]) g.box(-9, y, 6, 9, y + 1, 8, IRON_L, 0.05);                                                          // back plates under the cape
    // cape top behind the shoulders
    g.box(-10, 44, 7, 10, 64, 9, CRIM_D, 0.06); g.box(-9, 44, 7, 9, 52, 10, CRIM, 0.06);
    return g;
  }
  // ---------------- head ----------------
  function head() {
    const g = new Voxel.Grid(305);
    g.ell(0, 71, -1, 8, 7.4, 8.4, IRON, 0.06); g.ell(0, 74, -1, 7.2, 4, 7.6, IRON_L, 0.05);                                          // helm
    g.box(-8.5, 72, -10, 8.5, 75, -7, IRON_D, 0.04);                                                                                     // heavy brow slab
    for (const sgn of [-1, 1]) {
      for (let k = 0; k < 5; k++) { const x = sgn * (2 + k * 1.2 | 0), y = 70 + Math.floor(k / 2); g.box(Math.min(x, x + sgn), y, -10, Math.max(x, x + sgn), y + 2, -9, k < 3 ? HOT : EMBER, 0, 'glow'); }   // slanted burning eyes
    }
    g.box(-1, 66, -11, 1, 71, -9, IRON_D, 0.03);                                                                                    // nose ridge
    g.box(-7, 63, -10, 7, 67, -5, MOUTH, 0.02); g.box(-6, 64, -10, 6, 65, -9, EMBER, 0.02, 'glow');                                    // a snarling mouth with a glowing throat
    for (let x = -6; x <= 5; x++) { if (x % 2 === 0) g.box(x, 66, -11, x + 1, 68, -10, TOOTH, 0.03); else g.box(x, 62, -11, x + 1, 64, -10, TOOTH, 0.03); }   // teeth
    g.mbox(7, 62, -11, 8, 68, -10, TOOTH, 0.03); g.box(-5, 61, -9, 5, 63, -4, IRON_D, 0.04);                                         // curving tusks and a jutting chin
    // big swept-back horns: out, up, then curling forward at the tips
    L(g, [6, 75, 0], [11, 78, 0], 4, HORN, 'solid', 0.04); L(g, [11, 78, 0], [16, 86, -1], 4, HORN, 'solid', 0.04); L(g, [16, 86, -1], [15, 95, -5], 3, HORN_L, 'solid', 0.04);
    L(g, [-10, 75, 0], [-15, 78, 0], 4, HORN, 'solid', 0.04); L(g, [-15, 78, 0], [-20, 86, -1], 4, HORN, 'solid', 0.04); L(g, [-20, 86, -1], [-19, 95, -5], 3, HORN_L, 'solid', 0.04);
    for (const x of [-4, 0, 4]) L(g, [x, 79, 1], [x, 82 + (x === 0 ? 3 : 0), 1], 1, GOLD, 'solid', 0.04);   // a crown of small spikes
    return g;
  }
  // ---------------- arms: spiked pauldron, upper arm, forearm with a clawed gauntlet ----------------
  function armU() {
    const g = new Voxel.Grid(306), x = J.shoulderX;
    g.ell(x + 4, 63, 0, 6.4, 5, 6, IRON, 0.06); g.ell(x + 4, 65, 0, 5.6, 2.8, 5.2, IRON_L, 0.05); g.box(x - 1, 61, -6, x + 12, 62, 6, GOLD, 0.04);   // a huge round pauldron with a gold rim
    for (const [dx, dz, h] of [[4, 0, 7], [8, -3, 4], [8, 3, 4]]) { L(g, [x + dx, 67, dz], [x + dx, 67 + h, dz], 2, HORN, 'solid', 0.04); L(g, [x + dx, 67 + h, dz], [x + dx, 69 + h, dz], 1, GOLD_L, 'solid', 0.04); }   // gold spikes
    L(g, [x + 2, 60, 0], [x + 9, 50, 0], 5, IRON_L, 'solid', 0.06);                                                                  // upper arm
    g.box(x + 4, 55, -3, x + 9, 56, 3, GOLD, 0.04);
    return g;
  }
  function armF() {
    const g = new Voxel.Grid(307), x = J.elbowX;
    g.ell(x, 48, 0, 4, 4, 4, GOLD, 0.05);                                                                                           // elbow cop
    L(g, [x, 47, 0], [x + 8, 37, -1], 5, IRON, 'solid', 0.06); g.ell(x + 4, 43, -1, 4.6, 4.6, 4.4, IRON_L, 0.05); g.box(x + 3, 42, -4, x + 6, 44, 2, GOLD, 0.04);   // forearm with a gold-banded vambrace
    g.ell(x + 8, 35, -1, 4.6, 4.2, 4.2, IRON, 0.06);                                                                                // the gauntlet fist
    for (const dz of [-3, -0.5, 2]) { L(g, [x + 7, 33, dz], [x + 8, 24, dz - 1], 2, HORN_L, 'solid', 0.04); L(g, [x + 8, 24, dz - 1], [x + 8, 21, dz - 3], 1, TOOTH, 'solid', 0.03); }   // long curved claws
    g.box(x + 6, 40, -5, x + 7, 42, -4, EMBER, 0.02, 'glow');                                                                       // an ember in the gauntlet
    return g;
  }
  // ---------------- wings ----------------
  const inPoly = (px, py, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const zAt = (x, y) => Math.round(Math.max(9, 10 + 0.28 * (x - 8) + 0.14 * (66 - y)));          // the wing sweeps back the further out and down it goes
  function wing() {
    const g = new Voxel.Grid(308);
    const R = [8, 58], W = [24, 84], T = [[44, 94], [47, 76], [42, 60], [33, 46]];                                                      // wrist and the four finger tips
    const poly = [[8, 56], [9, 68], [W[0], W[1]], T[0], [39, 82], T[1], [41, 69], T[2], [36, 55], T[3], [24, 52], [14, 48]];          // the scalloped outline of the membrane
    for (let y = 40; y <= 98; y++) for (let x = 8; x <= 50; x++) if (inPoly(x + 0.5, y + 0.5, poly)) {
      const z = zAt(x, y), vein = (x + y * 2) % 9 === 0;
      g.set(x, y, z, vein ? CRIM_D : (y < 60 ? CRIM_D : CRIM), 0.08); g.set(x, y, z + 1, vein ? CRIM_D : CRIM_L, 0.08);
    }
    const bone = (a, b, r, col) => { const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n, z = zAt(x, y) - 1; for (let dx = 0; dx < r; dx++) for (let dy = 0; dy < r; dy++) g.set(Math.round(x) + dx, Math.round(y) + dy, z, col, 0.05); } };
    bone(R, W, 3, HORN); bone(W, T[0], 2, HORN_L);                                                                                   // the arm bone and its long top finger
    for (let i = 1; i < T.length; i++) bone(W, T[i], 2, HORN);                                                                       // the other fingers
    bone([8, 60], [10, 70], 3, HORN);
    L(g, [W[0], W[1], zAt(W[0], W[1]) - 1], [W[0] + 2, W[1] + 8, zAt(W[0], W[1]) - 1], 2, GOLD_L, 'solid', 0.04);                    // a gold wrist spike
    return g;
  }
  function build() {
    const R = { legR: legR(), armRU: armU(), armRF: armF(), wingR: wing() }, G = { body: body(), torso: torso(), head: head() };
    for (const n in R) { G[n] = R[n]; const m = new Voxel.Grid(R[n].seed + 40); K.mirror(R[n], m); G[n.replace('R', 'L')] = m; }
    // mirror() copies the part to its left-hand twin, but parts built on the right only, so keep the right ones to x >= 0 first
    const joints = { legR: [J.legX, J.hip, 0], legL: [-J.legX, J.hip, 0], torso: [0, J.waist, 0], head: [0, J.neck, 0], armRU: [J.shoulderX, J.shoulder, 0], armLU: [-J.shoulderX, J.shoulder, 0], armRF: [J.elbowX, J.elbow, 0], armLF: [-J.elbowX, J.elbow, 0], wingR: J.wing, wingL: [-J.wing[0], J.wing[1], J.wing[2]] };
    // only the head is cut fine (2 x 2 x 2), so the face has room; the rest stays at the coarse size so a boss is light enough for a phone
    const fine = { head: 2 }, grids = {};
    for (const n in G) grids[n] = fine[n] ? G[n].upsample(fine[n]) : G[n];
    const pose = Object.keys(grids).map((n) => { const j = joints[n] || [0, 0, 0], f = fine[n] || 1; return { name: n, grid: grids[n], pivot: j.map((v) => v * f), off: j.map((v) => v * VOX), vox: VOX / f }; });
    return { vox: VOX, grids, joints, pose, fine, rig: 'demon', smooth: true };
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = DemonLordV3;
