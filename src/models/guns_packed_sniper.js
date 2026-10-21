/* The four sniper rifles, made from pack models (see guns_packed.js). The pack scopes are cut off: the red-dot window is the sight in this game. */
const GunsPackedSniper = (function () {
  const P = typeof GunsPacked !== 'undefined' ? GunsPacked : require('./guns_packed.js'), K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C, R = P.R;
  const rings = (zs, y0, y1, col, t) => zs.map((z) => ['plate', y0, y1, z, z + 2, col, t || 1]);
  const LIST = [
    // bolt rifle: wooden stock with a glowing inlay, banded barrel with a muzzle brake, a big bolt handle
    { id: 'sniper_bolt', make: () => P.make({
      key: 'SniperRifle_6', name: 'Bolt Rifle', kind: 'sniper', skin: 'light', seed: 401, sight: [100, 4], top: 25,
      A: { muzzle: [22, 0], grip: [13, 122], fore: [18, 56], magHand: [14, 88] },
      ops: [['plate', 21, 25, 0, 9, 'DARK', 2], ['inlay', 22, 24, 0, 1, 'GH'], ...rings([14, 26, 38], 21, 25, 'PLATE'), ['top', 24, 25, 0, 76, 'TRIM'], ['inlay', 12, 15, 62, 100, 'GL'], ['inlay', 9, 12, 128, 148, 'GH'], ['plate', 4, 19, 150, 152, 'TRIM', 1], ['inlay', 18, 20, 108, 122, 'GL']],
      detail: (d) => { d.bolt.box(3, 20, 88, 5, 24, 98, C.TRIM, 0.05); d.bolt.box(5, 21, 96, 8, 25, 99, C.PLATE, 0.05); d.boltPivot = [4, 22, 93]; d.mag.box(-3, 12, 80, 3, 17, 90, C.STEEL, 0.05); d.magPivot = [0, 16, 85]; },
    }) },
    // anti-materiel: huge muzzle brake with glow slits, bipod, ammo box
    { id: 'sniper_antimat', make: () => P.make({
      key: 'SniperRifle_5', name: 'Anti-Materiel Rifle', kind: 'sniper', skin: 'flame', seed: 411, sight: [93, 4], top: 36, rail: 4,
      chop: [[0, 27, 40, 62]], paint: [[27, 37, 52, 112, R.PLATE]],
      A: { muzzle: [34, 0], grip: [21, 115], fore: [29, 66], magHand: [22, 89] },
      ops: [['plate', 32, 38, 0, 14, 'DARK', 3], ['plate', 32, 38, 3, 4, 'GL', 3], ['plate', 32, 38, 8, 9, 'GL', 3], ['inlay', 34, 36, 14, 52, 'GL'], ...rings([20, 32, 44], 32, 38, 'PLATE', 1), ['top', 36, 37, 52, 110, 'TRIM'], ['inlay', 29, 33, 120, 148, 'GH'], ['plate', 22, 34, 118, 120, 'PLATE2', 2]],
      detail: (d) => { for (const sx of [-1, 1]) for (let i = 0; i < 20; i++) d.body.box(sx * (3 + (i >> 1)) - 1, 8 + i, 57, sx * (3 + (i >> 1)) + 1, 9 + i, 59, C.DARK, 0.04);   // bipod legs, splayed
      d.mag.box(-4, 18, 80, 4, 27, 98, C.IRON, 0.05); K.glowSide(d.mag, 4, 22, 24, 84, 94); d.magPivot = [0, 27, 89]; d.bolt.box(3, 31, 76, 6, 35, 88, C.TRIM, 0.05); d.boltPivot = [4, 33, 82]; },
    }) },
    // marksman: thumbhole stock, thick barrel with glowing flutes, green rings
    { id: 'sniper_marksman', make: () => P.make({
      key: 'SniperRifle_3', name: 'Marksman Rifle', kind: 'sniper', skin: 'radiation', seed: 421, sight: [98, 4], top: 19, rail: 5,
      paint: [[0, 19, 50, 112, R.PLATE]],
      A: { muzzle: [17, 0], grip: [11, 119], fore: [14, 52], magHand: [10, 85] },
      ops: [['plate', 14, 20, 0, 6, 'DARK', 2], ...rings([10, 22, 34, 46], 14, 20, 'GL', 1), ['inlay', 17, 18, 8, 60, 'GL'], ['top', 18, 19, 0, 70, 'TRIM'], ['inlay', 6, 10, 130, 150, 'GH'], ['plate', 0, 17, 152, 154, 'TRIM', 1]],
      detail: (d) => { d.mag.box(-3, 7, 80, 3, 14, 92, C.IRON, 0.05); K.glowSide(d.mag, 3, 10, 12, 83, 89); d.magPivot = [0, 14, 86]; d.bolt.box(3, 15, 92, 5, 19, 102, C.TRIM, 0.05); d.boltPivot = [4, 17, 97]; },
    }) },
    // rail rifle: a coil of glowing rings along the barrel, charge cell in the stock
    { id: 'sniper_rail', make: () => P.make({
      key: 'SniperRifle_1', name: 'Rail Rifle', kind: 'sniper', skin: 'shock', seed: 431, sight: [96, 4], top: 25, rail: 4,
      A: { muzzle: [22, 0], grip: [12, 116], fore: [18, 56], magHand: [14, 86] },
      ops: [...rings([2, 8, 14, 20, 26, 32, 38, 44], 21, 24, 'GL', 2), ['plate', 21, 24, 0, 2, 'DARK', 2], ['top', 23, 24, 0, 50, 'DARK'], ['inlay', 18, 21, 52, 108, 'GL'], ['plate', 6, 19, 128, 148, 'PLATE', 1], ['inlay', 8, 16, 130, 146, 'GH'], ['top', 25, 26, 52, 104, 'TRIM']],
      detail: (d) => { d.mag.box(-3, 10, 82, 3, 16, 92, C.STEEL, 0.05); K.glowSide(d.mag, 3, 13, 15, 84, 90); d.magPivot = [0, 16, 87]; d.bolt.box(3, 18, 90, 5, 23, 100, C.TRIM, 0.05); d.boltPivot = [4, 20, 95]; },
    }) },
  ];
  return { LIST: LIST.map((g) => ({ id: g.id, build: g.make })) };
})();
if (typeof module !== 'undefined') module.exports = GunsPackedSniper;
