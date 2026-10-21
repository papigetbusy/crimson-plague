/* The four pistols, made from pack models (see guns_packed.js). Each keeps its catalog id, status colour and class of play; the shape is a real pack gun with this game's details on it. */
const GunsPackedPistol = (function () {
  const P = typeof GunsPacked !== 'undefined' ? GunsPacked : require('./guns_packed.js'), K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C, R = P.R;
  const band = (b, z, y0, y1, hw, col) => b.box(-hw, y0, z, hw, y1, z + 1, col, 0.04);
  const slots = (z0, z1, y0, y1, step) => { const o = []; for (let z = z0; z < z1; z += step || 2) o.push(['inlay', y0, y1, z, z + 1, 'DARK']); return o; };
  const LIST = [
    // plain steel service pistol: serrated slide, a glowing muzzle ring, side strip and a jewel in the grip
    { id: 'pistol_service', make: () => P.make({
      key: 'Pistol_2', name: 'Service Pistol', kind: 'pistol', skin: 'silver', seed: 101, sight: [31, 3],
      mag: [0, 5, 28, 41], magPivot: [5, 33],
      paint: [[22, 25, 2, 40, R.PLATE]],
      A: { muzzle: [21, 0], grip: [8, 34], fore: [2, 31] },
      ops: [...slots(31, 39, 16, 24), ['inlay', 18, 23, 0, 1, 'GH'], ['inlay', 18, 20, 5, 25, 'GL'], ['plate', 15, 17, 3, 5, 'TRIM'], ['top', 24, 25, 3, 27, 'TRIM'], ['inlay', 5, 9, 32, 36, 'GH'], ['plate', 10, 14, 30, 38, 'PLATE']],
      detail: (d) => { d.bolt.box(3, 20, 20, 5, 25, 27, C.TRIM, 0.05); d.boltPivot = [4, 22, 23]; },
    }) },
    // hand cannon: fat barrel with bands, a glowing cylinder drum and flame vents
    { id: 'pistol_cannon', make: () => P.make({
      key: 'Revolver_3', name: 'Hand Cannon', kind: 'pistol', skin: 'flame', seed: 111, sight: [30, 3],
      mag: null, magPivot: [8, 30],
      A: { muzzle: [17, 0], grip: [6, 40], fore: [3, 36] },
      ops: [['plate', 13, 21, 2, 4, 'PLATE', 1], ['plate', 13, 21, 9, 11, 'PLATE', 1], ['plate', 13, 21, 16, 18, 'PLATE', 1], ['inlay', 15, 19, 0, 1, 'GH'], ['top', 20, 21, 0, 24, 'TRIM'], ['inlay', 16, 17, 4, 22, 'GL'], ['plate', 9, 20, 24, 33, 'IRON', 2], ['inlay', 12, 17, 26, 31, 'GL']],
      detail: (d) => { d.bolt.box(3, 18, 33, 5, 22, 38, C.TRIM, 0.05); d.boltPivot = [4, 20, 35]; d.mag.box(-2, 8, 29, 2, 11, 33, C.STEEL, 0.05); },
    }) },
    // machine pistol: big magazine, glowing coil rings on the barrel, a rail with a glow line
    { id: 'pistol_machine', make: () => P.make({
      key: 'Pistol_5', name: 'Machine Pistol', kind: 'pistol', skin: 'shock', seed: 121, sight: [30, 3],
      mag: [0, 9, 27, 42], magPivot: [9, 34],
      A: { muzzle: [21, 0], grip: [11, 35], fore: [3, 30] },
      ops: [['plate', 18, 26, 2, 3, 'GL', 1], ['plate', 18, 26, 6, 7, 'GL', 1], ['plate', 18, 26, 10, 11, 'GL', 1], ['top', 25, 26, 3, 38, 'DARK'], ['inlay', 23, 24, 14, 36, 'GL'], ['plate', 19, 25, 14, 28, 'PLATE', 1], ['inlay', 12, 15, 30, 40, 'GH']],
      detail: (d) => { d.mag.box(-2, -14, 28, 2, 0, 40, C.IRON, 0.05); K.glowSide(d.mag, 2, -7, -5, 31, 37); d.bolt.box(3, 20, 18, 5, 25, 24, C.TRIM, 0.05); d.boltPivot = [4, 22, 21]; },
    }) },
    // duelist: long barrel with ornamental bands and a glowing top line
    { id: 'pistol_duelist', make: () => P.make({
      key: 'Revolver_5', name: 'Duelist', kind: 'pistol', skin: 'frost', seed: 131, sight: [38, 3],
      mag: null, magPivot: [8, 36],
      A: { muzzle: [24, 0], grip: [6, 46], fore: [3, 42] },
      ops: [['plate', 22, 27, 3, 5, 'PLATE', 1], ['plate', 22, 27, 12, 14, 'PLATE', 1], ['plate', 22, 27, 21, 23, 'PLATE', 1], ['inlay', 24, 27, 0, 1, 'GH'], ['top', 26, 27, 0, 32, 'GL'], ['plate', 16, 27, 30, 40, 'TRIM', 1]],
      detail: (d) => { d.bolt.box(3, 21, 38, 5, 26, 42, C.TRIM, 0.05); d.boltPivot = [4, 23, 40]; d.mag.box(-2, 8, 36, 2, 12, 40, C.STEEL, 0.05); },
    }) },
  ];
  return { LIST: LIST.map((g) => ({ id: g.id, build: g.make })) };
})();
if (typeof module !== 'undefined') module.exports = GunsPackedPistol;
