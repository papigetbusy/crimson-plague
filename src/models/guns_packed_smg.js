/* The four submachine guns, made from pack models (see guns_packed.js). */
const GunsPackedSmg = (function () {
  const P = typeof GunsPacked !== 'undefined' ? GunsPacked : require('./guns_packed.js'), K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C, R = P.R;
  const vents = (z0, z1, y0, y1, step, col) => { const o = []; for (let z = z0; z < z1; z += step) o.push(['inlay', y0, y1, z, z + 1, col || 'DARK']); return o; };
  const LIST = [
    // compact: boxy shroud over a stubby barrel, a magazine in front of the grip, a glowing spine
    { id: 'smg_compact', make: () => P.make({
      key: 'SubmachineGun_4', name: 'Compact SMG', kind: 'smg', skin: 'radiation', seed: 201, sight: [54, 4],
      mag: [0, 26, 28, 47], magPivot: [26, 37],
      paint: [[9, 30, 54, 71, R.PLATE2]],
      A: { muzzle: [35, 0], grip: [20, 62], fore: [30, 18], magHand: [12, 37] },
      ops: [['inlay', 38, 40, 14, 62, 'GL'], ['plate', 33, 43, 14, 26, 'PLATE', 1], ...vents(15, 26, 34, 42, 3), ['plate', 34, 37, 3, 5, 'TRIM'], ['plate', 34, 37, 8, 9, 'TRIM'], ['inlay', 34, 37, 0, 1, 'GH'], ['top', 43, 44, 12, 66, 'DARK'], ['inlay', 22, 28, 58, 66, 'GH'], ['plate', 32, 36, 36, 52, 'IRON', 1], ['inlay', 28, 30, 36, 52, 'GL']],
      detail: (d) => { d.bolt.box(4, 36, 40, 6, 42, 50, C.TRIM, 0.05); d.boltPivot = [5, 39, 45]; K.glowSide(d.mag, 4, 12, 14, 31, 44); },
    }) },
    // tactical: long suppressor, skeleton stock with a glow wire, a foregrip
    { id: 'smg_tactical', make: () => P.make({
      key: 'SubmachineGun_3', name: 'Tactical SMG', kind: 'smg', skin: 'dark', seed: 211, sight: [40, 3],
      mag: [0, 18, 24, 33], magPivot: [18, 28],
      paint: [[19, 31, 38, 51, R.PLATE2]],
      A: { muzzle: [25, 0], grip: [14, 44], fore: [14, 10], magHand: [9, 28] },
      ops: [['plate', 22, 31, 0, 10, 'DARK', 2], ['plate', 22, 31, 2, 3, 'GL', 1], ['plate', 22, 31, 6, 7, 'GL', 1], ['inlay', 26, 28, 12, 46, 'GL'], ['top', 30, 31, 4, 48, 'TRIM'], ...vents(14, 24, 24, 30, 3), ['plate', 24, 29, 54, 82, 'GL', 1], ['inlay', 17, 22, 38, 50, 'GH']],
      detail: (d) => { d.bolt.box(3, 27, 34, 5, 31, 42, C.TRIM, 0.05); d.boltPivot = [4, 29, 38]; K.glowSide(d.mag, 3, 10, 12, 26, 31); },
    }) },
    // bullpup: magazine behind the grip, long glowing rail, plated shroud
    { id: 'smg_bullpup', make: () => P.make({
      key: 'Bullpup_2', name: 'Bullpup SMG', kind: 'smg', skin: 'poison', seed: 221, sight: [48, 4],
      mag: [0, 19, 76, 91], magPivot: [19, 83],
      paint: [[19, 36, 8, 30, R.PLATE]],
      A: { muzzle: [28, 0], grip: [11, 68], fore: [16, 16], magHand: [10, 83] },
      ops: [['inlay', 30, 32, 14, 82, 'GL'], ['plate', 19, 36, 30, 31, 'TRIM', 1], ['plate', 19, 36, 44, 45, 'TRIM', 1], ['plate', 19, 36, 60, 61, 'TRIM', 1], ['plate', 27, 31, 0, 12, 'DARK', 1], ['inlay', 27, 30, 0, 1, 'GH'], ['top', 36, 37, 8, 66, 'IRON'], ...vents(10, 28, 20, 28, 3), ['plate', 12, 20, 12, 20, 'PLATE2', 1], ['inlay', 21, 25, 76, 88, 'GH']],
      detail: (d) => { d.bolt.box(4, 31, 40, 6, 36, 52, C.TRIM, 0.05); d.boltPivot = [5, 33, 46]; K.glowSide(d.mag, 3, 10, 12, 79, 88); },
    }) },
    // drum: a round drum magazine with a glowing hub, folding stock, heat vents
    { id: 'smg_drum', make: () => P.make({
      key: 'SubmachineGun_5', name: 'Drum SMG', kind: 'smg', skin: 'flame', seed: 231, sight: [52, 4],
      mag: [0, 21, 44, 55], magPivot: [21, 49],
      paint: [[6, 22, 62, 75, R.PLATE2]],
      A: { muzzle: [27, 0], grip: [14, 68], fore: [21, 20], magHand: [10, 49] },
      ops: [['inlay', 28, 30, 12, 70, 'GL'], ...vents(14, 70, 31, 34, 4, 'GH'), ['plate', 22, 35, 12, 14, 'PLATE', 1], ['plate', 22, 35, 24, 26, 'PLATE', 1], ['plate', 22, 35, 36, 38, 'PLATE', 1], ['plate', 26, 29, 78, 100, 'GL', 1], ['inlay', 26, 28, 0, 1, 'GH']],
      detail: (d) => { P.drum(d.mag, 8, 49, 9, 4, C.IRON, C.GH); d.bolt.box(4, 30, 30, 6, 35, 42, C.TRIM, 0.05); d.boltPivot = [5, 32, 36]; },
    }) },
  ];
  return { LIST: LIST.map((g) => ({ id: g.id, build: g.make })) };
})();
if (typeof module !== 'undefined') module.exports = GunsPackedSmg;
