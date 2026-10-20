/* The four sniper rifles: very long slim barrel, a stock with a cheek rest, a small receiver; the length says sniper at a glance.
   bolt = classic bolt-action with a bolt handle and knob; antimat = thick barrel, big muzzle brake and a folded bipod; marksman = semi-auto with a box magazine and long handguard;
   rail = a futuristic rail gun with coil rings round a floating barrel. Right hand on the grip, left under the forend. */
const GunsSniper = (function () {
  const K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C;
  const TOP = 14;
  const guard = (b, gz, top) => { b.box(-1, top - 9, gz - 14, 1, top - 8, gz - 2, C.DARK, 0.04); b.box(-1, top - 9, gz - 15, 1, top, gz - 14, C.DARK, 0.04); b.box(-1, top - 9, gz - 3, 1, top, gz - 2, C.DARK, 0.04); b.box(-1, top - 7, gz - 8, 1, top, gz - 7, C.DARK, 0.04); };
  const cheekStock = (b, z0, z1, col, accent) => { K.wedge(b, z0, z1, -2, 12, -16, 10, 4, col, 2); K.slab(b, z0 + 4, z0 + 22, 11, 15, 3, col, 1); K.slab(b, z1 - 2, z1 + 2, -17, 11, 4, accent, 1); };   // stock with a raised cheek rest

  function bolt() {
    const d = K.start(401); d.kind = 'sniper'; d.skin = 'light'; const b = d.body;
    K.run(b, -22, 20, () => ({ y0: -2, y1: TOP, hw: 4, col: C.IRON, cut: 2 }));
    K.tube(b, -140, -22, 8, 2, C.STEEL); for (const z of [-136, -110, -84, -58]) K.ring(b, z, 8, 3, C.PLATE, 2);
    K.slab(b, -76, -22, -2, 8, 3, C.IRON, 1);                                              // forend
    K.glowTop(b, 10, -138, -26, 1); K.glowSide(b, 4, 3, 6, -20, 12);
    cheekStock(b, 20, 80, C.IRON, C.PLATE); K.glowSide(b, 4, -2, 2, 30, 56);
    guard(b, 22, -2);
    d.bolt.box(4, 8, -4, 12, 10, -2, C.PLATE, 0.06); d.bolt.box(12, 6, -5, 15, 12, -1, C.TRIM, 0.05); d.boltPivot = [6, 9, -3];   // the bolt handle and its knob
    d.mag.box(-3, -8, -6, 3, -2, 4, C.STEEL, 0.05); d.magPivot = [0, -2, -1];
    const s = K.sight(b, TOP, 8, 6);
    d.A = { muzzle: [0, 8, -141], grip: [0, -6, 28], fore: [0, -6, -48], magHand: [0, -6, -1], dot: s.dot, win: s.win };
    return K.finish(d, 'Bolt Rifle');
  }
  function antimat() {
    const d = K.start(411); d.kind = 'sniper'; d.skin = 'flame'; const b = d.body;
    K.run(b, -26, 24, () => ({ y0: -4, y1: TOP, hw: 6, col: C.IRON, cut: 3 }));
    K.tube(b, -100, -26, 8, 4, C.STEEL); for (const z of [-96, -80, -64, -48]) K.ring(b, z, 8, 5, C.PLATE, 3);
    K.run(b, -122, -100, () => ({ y0: 0, y1: 16, hw: 6, col: C.IRON, cut: 2 })); for (let z = -120; z < -102; z += 4) K.glowSide(b, 6, 3, 13, z, z + 2);   // big slotted muzzle brake
    K.slab(b, -76, -66, -16, 5, 2, C.IRON, 1); K.slab(b, -76, -66, -18, -14, 3, C.PLATE, 0);       // folded bipod leg
    K.glowSide(b, 6, 2, 8, -22, 18);
    cheekStock(b, 24, 78, C.IRON, C.PLATE);
    guard(b, 26, -4);
    d.bolt.box(6, 8, -6, 14, 10, -3, C.PLATE, 0.06); d.bolt.box(14, 6, -7, 17, 12, -2, C.TRIM, 0.05); d.boltPivot = [8, 9, -5];
    K.grip(d.mag, -10, -4, -24, 12, 0, 4, C.STEEL); d.mag.box(-4, -25, -10, 4, -24, 2, C.PLATE2, 0.05); K.glowSide(d.mag, 4, -20, -8, -6, -4); d.magPivot = [0, -4, -4];
    const s = K.sight(b, TOP, 8, 6);
    d.A = { muzzle: [0, 8, -123], grip: [0, -8, 30], fore: [0, -8, -44], magHand: [0, -20, -4], dot: s.dot, win: s.win };
    return K.finish(d, 'Anti-Materiel Rifle');
  }
  function marksman() {
    const d = K.start(421); d.kind = 'sniper'; d.skin = 'radiation'; const b = d.body;
    K.run(b, -26, 24, () => ({ y0: 0, y1: TOP, hw: 4, col: C.IRON, cut: 2 }));
    for (let z = -22; z < 20; z += 4) b.box(-3, TOP - 1, z, 3, TOP, z + 1, C.DARK, 0.04);
    K.run(b, -94, -26, () => ({ y0: 0, y1: 11, hw: 4, col: C.STEEL, cut: 2 })); for (let z = -90; z < -30; z += 8) K.glowSide(b, 4, 3, 8, z, z + 3);
    K.tube(b, -108, -94, 6, 2, C.DARK); K.slab(b, -114, -106, 1, 11, 3, C.IRON, 1);
    cheekStock(b, 24, 66, C.IRON, C.PLATE);
    K.grip(b, 8, 0, -22, 9, 4, 3, C.IRON); guard(b, 8, 0);
    K.grip(d.mag, -20, 0, -26, 10, -3, 3, C.STEEL); d.mag.box(-3, -27, -23, 3, -26, -9, C.PLATE2, 0.05); K.glowSide(d.mag, 3, -22, -6, -17, -15); d.magPivot = [0, 0, -15];
    d.bolt.box(4, 7, -8, 6, 10, -2, C.PLATE, 0.06); d.boltPivot = [5, 8, -5];
    const s = K.sight(b, TOP, 4, 5);
    d.A = { muzzle: [0, 6, -115], grip: [0, -11, 12], fore: [0, -3, -56], magHand: [0, -22, -16], dot: s.dot, win: s.win };
    return K.finish(d, 'Marksman Rifle');
  }
  function rail() {
    const d = K.start(431); d.kind = 'sniper'; d.skin = 'shock'; const b = d.body;
    K.run(b, -20, 30, (z) => ({ y0: -2 + (z > 14 ? (z - 14) >> 2 : 0), y1: TOP, hw: z < -10 ? 3 : 5, col: C.IRON, cut: 3 }));       // angular, tapered receiver
    K.tube(b, -130, -20, 8, 1, C.DARK);                                                          // the thin floating barrel
    for (let z = -126; z < -30; z += 14) { K.tube(b, z, z + 3, 8, 5, C.STEEL); K.tube(b, z + 1, z + 2, 8, 4, C.GH, 'glow'); }   // coil rings, glowing
    K.slab(b, -128, -124, 3, 13, 3, C.PLATE, 1);
    K.glowSide(b, 5, 4, 10, -2, 26); K.glowTop(b, 13, -18, 26, 1);
    K.wedge(b, 30, 68, 2, 12, -12, 4, 3, C.IRON, 2); K.slab(b, 66, 70, -13, 5, 3, C.PLATE, 1);        // a thin, drooping stock
    K.grip(b, 12, -2, -24, 9, 3, 3, C.IRON); guard(b, 12, -2);
    K.run(b, -66, -40, () => ({ y0: -6, y1: 7, hw: 3, col: C.IRON, cut: 2 }));                      // forend under the coils
    d.bolt.box(4, 8, -2, 6, 11, 4, C.TRIM, 0.05); d.boltPivot = [5, 9, 1];
    K.grip(d.mag, -12, -2, -18, 8, 0, 3, C.STEEL); K.glowSide(d.mag, 3, -14, -6, -8, -6); d.magPivot = [0, -2, -8];   // a short power cell
    const s = K.sight(b, TOP, 8, 5);
    d.A = { muzzle: [0, 8, -131], grip: [0, -12, 16], fore: [0, -3, -54], magHand: [0, -12, -8], dot: s.dot, win: s.win };
    return K.finish(d, 'Rail Rifle');
  }
  const LIST = [{ id: 'sniper_bolt', build: bolt }, { id: 'sniper_antimat', build: antimat }, { id: 'sniper_marksman', build: marksman }, { id: 'sniper_rail', build: rail }];
  return { LIST };
})();
if (typeof module !== 'undefined') module.exports = GunsSniper;
