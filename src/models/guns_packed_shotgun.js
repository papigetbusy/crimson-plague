/* The four shotguns, made from pack models (see guns_packed.js). Pump = the wooden forend slides (it is the bolt part). */
const GunsPackedShotgun = (function () {
  const P = typeof GunsPacked !== 'undefined' ? GunsPacked : require('./guns_packed.js'), K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C, R = P.R;
  const bands = (zs, y0, y1, col, w) => zs.map((z) => ['plate', y0, y1, z, z + (w || 1), col, 1]);
  const LIST = [
    // pump: banded barrel, a sliding grooved forend, glowing receiver sides
    { id: 'shotgun_pump', make: () => P.make({
      key: 'Shotgun_3', name: 'Pump Shotgun', kind: 'shotgun', skin: 'shock', seed: 301, sight: [74, 4], top: 17, rail: 5,
      bolt: [8, 15, 35, 53], boltPivot: [11, 44],
      paint: [[8, 18, 62, 83, R.PLATE]],
      A: { muzzle: [14, 0], grip: [10, 88], fore: [11, 44], magHand: [11, 74] },
      ops: [...bands([6, 18, 30, 56], 10, 18, 'PLATE', 2), ['inlay', 14, 16, 4, 60, 'GL'], ['top', 17, 18, 0, 60, 'TRIM'], ['inlay', 12, 16, 64, 80, 'GL'], ['plate', 8, 18, 62, 64, 'DARK', 1], ['inlay', 12, 15, 0, 1, 'GH'], ['inlay', 6, 11, 96, 108, 'GH'], ['plate', 4, 14, 100, 112, 'TRIM', 1]],
      detail: (d) => { for (let z = 36; z < 52; z += 3) d.bolt.box(-4, 8, z, 4, 15, z + 1, C.DARK, 0.04); d.mag.box(-2, 6, 70, 2, 10, 76, C.STEEL, 0.05); d.magPivot = [0, 8, 73]; },
    }) },
    // double barrel (sawed-off): a groove splits the two barrels, glowing muzzles, a hinge lever
    { id: 'shotgun_double', make: () => P.make({
      key: 'Shotgun_SawedOff', name: 'Double Barrel', kind: 'shotgun', skin: 'frost', seed: 311, sight: [52, 5], top: 21, rail: 5,
      paint: [[8, 20, 38, 58, R.PLATE]],
      A: { muzzle: [16, 0], grip: [12, 66], fore: [10, 26], magHand: [10, 52] },
      ops: [...bands([6, 18, 30], 13, 22, 'PLATE', 2), ['inlay', 18, 20, 4, 54, 'GL'], ['top', 21, 22, 0, 52, 'TRIM'], ['inlay', 14, 20, 0, 1, 'GH'], ['plate', 6, 20, 56, 58, 'DARK', 1]],
      detail: (d, b) => { b.erase(0, 13, 0, 1, 22, 50); d.bolt.box(3, 18, 52, 5, 23, 58, C.TRIM, 0.05); d.boltPivot = [4, 20, 55]; d.mag.box(-2, 8, 50, 2, 12, 54, C.STEEL, 0.05); d.magPivot = [0, 10, 52]; },
    }) },
    // combat: boxy semi-auto, a box magazine, a heat-shield barrel with glow slits
    { id: 'shotgun_combat', make: () => P.make({
      key: 'Shotgun_1', name: 'Combat Shotgun', kind: 'shotgun', skin: 'radiation', seed: 321, sight: [66, 4], top: 19, rail: 5,
      paint: [[8, 20, 52, 86, R.PLATE]],
      A: { muzzle: [14, 0], grip: [10, 86], fore: [13, 30], magHand: [9, 61] },
      ops: [...bands([4, 12, 20, 28, 36], 10, 20, 'PLATE', 2), ['inlay', 16, 18, 0, 50, 'DARK'], ['inlay', 12, 15, 56, 82, 'GL'], ['top', 19, 20, 0, 52, 'TRIM'], ['inlay', 12, 17, 0, 1, 'GH'], ['plate', 4, 10, 100, 112, 'PLATE2', 1], ['inlay', 4, 8, 98, 108, 'GL']],
      detail: (d) => { d.mag.box(-3, -1, 56, 3, 9, 66, C.IRON, 0.05); d.mag.box(-3, -2, 56, 3, -1, 66, C.PLATE2, 0.05); K.glowSide(d.mag, 3, 4, 6, 58, 64); d.magPivot = [0, 9, 61]; d.bolt.box(4, 14, 58, 6, 18, 70, C.TRIM, 0.05); d.boltPivot = [5, 16, 64]; },
    }) },
    // blunderbuss: a flared bell muzzle with glowing rim, banded barrel, curved stock
    { id: 'shotgun_blunderbuss', make: () => P.make({
      key: 'Shotgun_ShortStock', name: 'Blunderbuss', kind: 'shotgun', skin: 'flame', seed: 331, sight: [56, 4], top: 21, rail: 5,
      bolt: [10, 16, 5, 29], boltPivot: [13, 17],
      paint: [[8, 22, 50, 76, R.PLATE]],
      A: { muzzle: [16, 0], grip: [11, 78], fore: [13, 16], magHand: [12, 62] },
      ops: [['plate', 11, 21, 0, 8, 'STEEL', 3], ['plate', 11, 21, 0, 2, 'PLATE', 1], ['inlay', 12, 20, 0, 1, 'GH'], ...bands([10, 22, 34], 11, 21, 'PLATE', 2), ['inlay', 18, 20, 8, 56, 'GL'], ['top', 21, 22, 6, 54, 'TRIM'], ['plate', 8, 22, 50, 52, 'DARK', 1], ['inlay', 8, 14, 84, 92, 'GH']],
      detail: (d) => { for (let z = 6; z < 28; z += 4) d.bolt.box(-4, 10, z, 4, 16, z + 1, C.DARK, 0.04); d.mag.box(-2, 6, 60, 2, 10, 64, C.STEEL, 0.05); d.magPivot = [0, 8, 62]; },
    }) },
  ];
  return { LIST: LIST.map((g) => ({ id: g.id, build: g.make })) };
})();
if (typeof module !== 'undefined') module.exports = GunsPackedShotgun;
