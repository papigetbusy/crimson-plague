/* The four heavy machine guns, made from pack models (see guns_packed.js). They are the biggest rifle shapes, fattened with shrouds, drums and belts. */
const GunsPackedHmg = (function () {
  const P = typeof GunsPacked !== 'undefined' ? GunsPacked : require('./guns_packed.js'), K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C, R = P.R;
  const rings = (zs, y0, y1, col, t) => zs.map((z) => ['plate', y0, y1, z, z + 2, col, t || 1]);
  const vents = (z0, z1, y0, y1, step, col) => { const o = []; for (let z = z0; z < z1; z += step) o.push(['inlay', y0, y1, z, z + 1, col || 'DARK']); return o; };
  const LIST = [
    // belt-fed: a heavy vented shroud, an ammo belt hanging from the side box, glowing carry handle
    { id: 'hmg_belt', make: () => P.make({
      key: 'AssaultRifle2_1', name: 'Belt MG', kind: 'hmg', skin: 'poison', seed: 501, sight: [64, 4], top: 38, rail: 3,
      mag: [0, 27, 48, 66], magPivot: [27, 57],
      paint: [[28, 40, 26, 36, R.PLATE]],
      A: { muzzle: [33, 0], grip: [10, 80], fore: [30, 20], magHand: [12, 57] },
      ops: [['plate', 28, 38, 0, 8, 'DARK', 2], ['inlay', 30, 34, 0, 1, 'GH'], ['plate', 28, 40, 28, 30, 'PLATE', 1], ...vents(10, 28, 31, 37, 2), ['inlay', 34, 36, 36, 114, 'GL'], ['top', 38, 39, 36, 114, 'DARK'], ['plate', 29, 38, 36, 38, 'TRIM', 1], ['plate', 29, 38, 70, 72, 'TRIM', 1], ['inlay', 24, 30, 100, 116, 'GH']],
      detail: (d) => { K.glowSide(d.mag, 3, 12, 14, 51, 63); d.bolt.box(4, 34, 40, 6, 38, 52, C.TRIM, 0.05); d.boltPivot = [5, 36, 46]; for (let i = 0; i < 6; i++) d.mag.box(-4, 4 + i * 4, 46 + (i % 2) * 2, -3, 6 + i * 4, 50 + (i % 2) * 2, C.GH, 0.04, 'glow'); },
    }) },
    // minigun: a fat bundle of barrels with glowing rings, a big ammo box behind the grip
    { id: 'hmg_minigun', make: () => P.make({
      key: 'Bullpup_1', name: 'Minigun', kind: 'hmg', skin: 'shock', seed: 511, sight: [48, 4], top: 35, rail: 3,
      mag: [0, 19, 78, 94], magPivot: [19, 86],
      paint: [[19, 35, 8, 30, R.PLATE]],
      A: { muzzle: [30, 0], grip: [10, 62], fore: [18, 14], magHand: [10, 86] },
      ops: [['plate', 27, 33, 0, 20, 'IRON', 3], ...rings([2, 8, 14], 27, 33, 'GL', 4), ['inlay', 28, 32, 0, 1, 'GH'], ['inlay', 29, 31, 4, 60, 'GL'], ['top', 35, 36, 8, 66, 'IRON'], ['plate', 19, 35, 30, 32, 'TRIM', 1], ['plate', 19, 35, 56, 58, 'TRIM', 1], ...vents(34, 50, 22, 30, 3), ['inlay', 22, 30, 78, 92, 'GH']],
      detail: (d) => { d.bolt.box(4, 30, 36, 6, 35, 48, C.TRIM, 0.05); d.boltPivot = [5, 32, 42]; K.glowSide(d.mag, 3, 10, 12, 80, 90); },
    }) },
    // drum LMG: a classic long rifle body with a big round drum and wooden furniture
    { id: 'hmg_drum', make: () => P.make({
      key: 'AssaultRifle_5', name: 'Drum LMG', kind: 'hmg', skin: 'dark', seed: 521, sight: [70, 4], top: 35, rail: 4,
      mag: [0, 24, 50, 76], magPivot: [24, 63],
      A: { muzzle: [29, 0], grip: [17, 85], fore: [24, 28], magHand: [10, 62] },
      ops: [['plate', 28, 31, 4, 12, 'DARK', 2], ['inlay', 28, 30, 0, 1, 'GH'], ...rings([14, 22], 28, 35, 'PLATE', 1), ['plate', 26, 35, 30, 50, 'PLATE', 1], ['inlay', 28, 31, 32, 48, 'GL'], ['top', 35, 36, 55, 90, 'TRIM'], ['inlay', 22, 28, 98, 118, 'GL'], ['plate', 18, 29, 100, 102, 'TRIM', 1]],
      detail: (d) => { P.drum(d.mag, 6, 63, 15, 5, C.IRON, C.GL); d.bolt.box(3, 30, 56, 5, 35, 68, C.TRIM, 0.05); d.boltPivot = [4, 32, 62]; },
    }) },
    // chaingun: a squared heavy frame with a plated shroud, a coil, glowing vents
    { id: 'hmg_chain', make: () => P.make({
      key: 'AssaultRifle2_2', name: 'Chaingun', kind: 'hmg', skin: 'frost', seed: 531, sight: [60, 4], top: 36, rail: 3,
      mag: [0, 28, 50, 68], magPivot: [28, 59],
      A: { muzzle: [32, 0], grip: [16, 78], fore: [28, 30], magHand: [12, 59] },
      ops: [['plate', 29, 35, 0, 12, 'DARK', 2], ...rings([2, 6, 10], 29, 35, 'GL', 3), ['plate', 28, 37, 30, 50, 'PLATE', 1], ...vents(32, 50, 29, 36, 3, 'GL'), ['top', 36, 37, 30, 114, 'TRIM'], ['inlay', 32, 34, 50, 112, 'GL'], ['plate', 25, 36, 96, 98, 'PLATE2', 1]],
      detail: (d) => { K.glowSide(d.mag, 3, 13, 15, 53, 64); d.bolt.box(4, 32, 38, 6, 36, 50, C.TRIM, 0.05); d.boltPivot = [5, 34, 44]; },
    }) },
  ];
  return { LIST: LIST.map((g) => ({ id: g.id, build: g.make })) };
})();
if (typeof module !== 'undefined') module.exports = GunsPackedHmg;
