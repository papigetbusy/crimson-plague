/* The four SMGs: short and compact, a boxy receiver, a stubby barrel or shroud, a magazine under the front of the grip, a short stock.
   compact = classic with a handguard and wire stock; tactical = long suppressor and a vertical foregrip; bullpup = magazine behind the grip, no stock;
   drum = a round drum magazine and a ribbed barrel shroud. Right hand on the grip, left on the foregrip or handguard. */
const GunsSmg = (function () {
  const K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C;
  const TOP = 14;
  // the receiver, pistol grip, trigger guard and charging handle every SMG has
  function core(d, z0, z1, gz, col) {
    const b = d.body;
    K.run(b, z0, z1, () => ({ y0: 0, y1: TOP, hw: 4, col: col || C.IRON, cut: 2 }));
    for (let z = z0 + 3; z < z1 - 3; z += 4) b.box(-3, TOP - 1, z, 3, TOP, z + 1, C.DARK, 0.04);                       // top rail slots
    b.box(4, 5, gz - 22, 5, 11, gz - 12, C.DARK, 0.04); b.box(-5, 5, gz - 22, -4, 11, gz - 12, C.DARK, 0.04);          // ejection port
    K.grip(b, gz, 0, -22, 9, 4, 3, C.IRON);
    b.box(-1, -8, gz - 16, 1, -7, gz - 2, C.DARK, 0.04); b.box(-1, -8, gz - 17, 1, 0, gz - 16, C.DARK, 0.04); b.box(-1, -7, gz - 8, 1, 0, gz - 7, C.DARK, 0.04); b.box(-1, -8, gz - 3, 1, 0, gz - 2, C.DARK, 0.04);
    d.bolt.box(4, 7, gz - 14, 6, 10, gz - 8, C.PLATE, 0.06); d.bolt.box(6, 8, gz - 13, 7, 10, gz - 9, C.TRIM, 0.05); d.boltPivot = [5, 8, gz - 12];
    const s = K.sight(b, TOP, gz - 4, 5);
    return s;
  }
  const box = (d, zTop, bottom, depth, lean, hw, glow) => {      // a box magazine hanging under the receiver, top at y 0
    K.grip(d.mag, zTop, 0, bottom, depth, lean, hw, C.STEEL);
    K.grip(d.mag, zTop, 0, bottom, depth, lean, hw, C.STEEL, undefined, bottom + 1);
    d.mag.box(-hw, bottom - 1, zTop + lean - 1, hw, bottom, zTop + lean + depth + 1, C.PLATE2, 0.05);
    if (glow) K.glowSide(d.mag, hw, bottom + 4, -6, zTop + 3 + (lean >> 1), zTop + 5 + (lean >> 1));
    d.magPivot = [0, 0, zTop + (depth >> 1)];
  };

  function compact() {
    const d = K.start(201); d.kind = 'smg'; d.skin = 'radiation';
    const s = core(d, -30, 22, 8);
    K.run(d.body, -56, -30, () => ({ y0: -2, y1: 11, hw: 4, col: C.STEEL, cut: 2 }));
    for (let z = -52; z < -32; z += 6) K.glowSide(d.body, 4, 3, 7, z, z + 3);
    K.tube(d.body, -64, -56, 6, 2, C.DARK);
    K.slab(d.body, 22, 52, 3, 12, 2, C.IRON, 1); d.body.erase(-2, 5, 28, 2, 9, 46); K.slab(d.body, 50, 54, 0, 14, 4, C.PLATE, 1);   // wire stock with an open window and a butt plate
    box(d, -24, -30, 10, -3, 3, true);
    d.A = { muzzle: [0, 6, -65], grip: [0, -11, 12], fore: [0, -5, -42], magHand: [0, -26, -20], dot: s.dot, win: s.win };
    return K.finish(d, 'Compact SMG');
  }
  function tactical() {
    const d = K.start(211); d.kind = 'smg'; d.skin = 'dark';
    const s = core(d, -26, 20, 8, C.IRON);
    K.run(d.body, -44, -26, () => ({ y0: -1, y1: 10, hw: 4, col: C.IRON, cut: 2 }));
    K.tube(d.body, -86, -44, 6, 4, C.DARK); for (const z of [-84, -74, -64, -54]) { K.ring(d.body, z, 6, 5, C.PLATE, 2); }
    K.glowSide(d.body, 4, 5, 8, -82, -46, C.GL);
    K.slab(d.body, -40, -34, -16, -1, 2, C.IRON, 1);                                          // vertical foregrip
    K.slab(d.body, 20, 46, 2, 11, 3, C.IRON, 2); K.slab(d.body, 44, 48, -1, 13, 4, C.PLATE, 1);   // short telescoping stock
    box(d, -22, -22, 10, -2, 3, false);
    d.A = { muzzle: [0, 6, -87], grip: [0, -11, 12], fore: [0, -12, -37], magHand: [0, -18, -18], dot: s.dot, win: s.win };
    return K.finish(d, 'Tactical SMG');
  }
  function bullpup() {
    const d = K.start(221); d.kind = 'smg'; d.skin = 'poison';
    const b = d.body, gz = -6;
    K.run(b, -24, 38, (z) => ({ y0: z > 24 ? -2 : 0, y1: z > 28 ? TOP + 2 : TOP, hw: z > 20 ? 5 : 4, col: z > 34 ? C.PLATE : C.IRON, cut: 2 }));   // the whole gun is one body, the butt is the back of it
    for (let z = -20; z < 14; z += 4) b.box(-3, TOP - 1, z, 3, TOP, z + 1, C.DARK, 0.04);
    K.run(b, -50, -24, () => ({ y0: 1, y1: 11, hw: 3, col: C.STEEL, cut: 2 })); K.tube(b, -58, -50, 6, 2, C.DARK);
    K.glowSide(b, 3, 3, 8, -46, -28); K.glowSide(b, 5, 4, 10, 8, 20);
    K.grip(b, gz, 0, -22, 9, 3, 3, C.IRON);
    b.box(-1, -8, gz - 14, 1, -7, gz - 2, C.DARK, 0.04); b.box(-1, -8, gz - 15, 1, 0, gz - 14, C.DARK, 0.04); b.box(-1, -8, gz - 3, 1, 0, gz - 2, C.DARK, 0.04);
    K.slab(b, -18, -12, -14, 0, 2, C.IRON, 1);                                                // stubby foregrip
    d.bolt.box(4, 8, -16, 6, 11, -10, C.PLATE, 0.06); d.boltPivot = [5, 9, -14];
    K.grip(d.mag, 8, 0, -26, 9, 0, 3, C.STEEL); d.mag.box(-3, -27, 8, 3, -26, 18, C.PLATE2, 0.05); K.glowSide(d.mag, 3, -22, -6, 11, 13); d.magPivot = [0, 0, 13];   // the magazine sits behind the grip
    const s = K.sight(b, TOP, -2, 5);
    d.A = { muzzle: [0, 6, -59], grip: [0, -11, gz + 4], fore: [0, -9, -17], magHand: [0, -22, 13], dot: s.dot, win: s.win };
    return K.finish(d, 'Bullpup SMG');
  }
  function drum() {
    const d = K.start(231); d.kind = 'smg'; d.skin = 'flame';
    const s = core(d, -28, 22, 8, C.IRON);
    K.run(d.body, -52, -28, () => ({ y0: -2, y1: 11, hw: 4, col: C.IRON, cut: 2 }));
    for (let z = -50; z < -30; z += 3) d.body.box(-4, 2, z, 4, 3, z + 1, C.DARK, 0.04);       // cooling ribs
    for (let z = -49; z < -31; z += 6) K.glowSide(d.body, 4, 4, 9, z, z + 2);
    K.tube(d.body, -60, -52, 6, 2, C.DARK);
    K.wedge(d.body, 22, 50, 2, 12, -6, 6, 3, C.PLATE, 2);                                      // a solid stock that drops away
    K.slab(d.body, -46, -40, -16, -2, 2, C.IRON, 1);
    d.mag.ell(0, -14, -14, 4, 13, 13, C.STEEL, 0.05); d.mag.box(-3, -2, -20, 3, 0, -8, C.STEEL, 0.05); d.mag.ell(0, -14, -14, 5, 6, 6, C.PLATE, 0.06);
    K.glowSide(d.mag, 4, -20, -8, -16, -14); d.magPivot = [0, 0, -14];
    d.A = { muzzle: [0, 6, -61], grip: [0, -11, 12], fore: [0, -12, -43], magHand: [0, -16, -14], dot: s.dot, win: s.win };
    return K.finish(d, 'Drum SMG');
  }
  const LIST = [{ id: 'smg_compact', build: compact }, { id: 'smg_tactical', build: tactical }, { id: 'smg_bullpup', build: bullpup }, { id: 'smg_drum', build: drum }];
  return { LIST };
})();
if (typeof module !== 'undefined') module.exports = GunsSmg;
