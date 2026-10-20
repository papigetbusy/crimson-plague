/* The four shotguns: fat barrels, a big stock, a loading port or a pump. They read as shotguns by the thick barrel (or two barrels) and the chunky stock.
   pump = tube magazine and a sliding pump forend (the pump is the bolt part); double = two barrels side by side; combat = boxy semi-auto with a heat shield and box magazine;
   blunderbuss = short and fat with a flared bell muzzle and no stock. Right hand on the grip or stock wrist, left on the pump or foregrip. */
const GunsShotgun = (function () {
  const K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C;
  const TOP = 14;
  const twin = (g, z0, z1, cy, r, off, col) => { for (const s of [-1, 1]) for (let z = z0; z < z1; z++) for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = -r - 1; x <= r; x++) if ((x + 0.5) * (x + 0.5) + (y + 0.5 - cy) * (y + 0.5 - cy) <= r * r) g.set(s * off + x, y, z, col, 0.05); };
  const guard = (b, gz, top) => { b.box(-1, top - 9, gz - 14, 1, top - 8, gz - 2, C.DARK, 0.04); b.box(-1, top - 9, gz - 15, 1, top, gz - 14, C.DARK, 0.04); b.box(-1, top - 9, gz - 3, 1, top, gz - 2, C.DARK, 0.04); b.box(-1, top - 7, gz - 8, 1, top, gz - 7, C.DARK, 0.04); };

  function pump() {
    const d = K.start(301); d.kind = 'shotgun'; d.skin = 'shock'; const b = d.body;
    K.run(b, -20, 24, () => ({ y0: -2, y1: TOP, hw: 5, col: C.IRON, cut: 2 }));
    b.box(5, 4, -6, 6, 10, 6, C.DARK, 0.04); b.box(-6, 4, -6, -5, 10, 6, C.DARK, 0.04);          // ejection port
    K.tube(b, -82, -20, 9, 3, C.STEEL); K.tube(b, -78, -20, 2, 2, C.IRON);                          // barrel, and the tube magazine under it
    for (const z of [-80, -60, -40]) K.ring(b, z, 9, 4, C.PLATE, 2); K.ring(b, -76, 2, 3, C.PLATE, 2);
    K.glowTop(b, 12, -80, -22, 1); K.glowSide(b, 5, 4, 7, -18, 10);
    K.wedge(b, 24, 66, -2, 12, -16, 8, 4, C.IRON, 2); K.slab(b, 64, 68, -17, 9, 4, C.PLATE, 1);   // stock
    K.glowSide(b, 4, -4, 0, 30, 52);
    K.run(d.bolt, -66, -38, () => ({ y0: -5, y1: 5, hw: 5, col: C.PLATE2, cut: 2 })); for (let z = -64; z < -40; z += 3) d.bolt.box(-6, -4, z, 6, 4, z + 1, C.DARK, 0.04); d.boltPivot = [0, 0, -52];   // the pump forend, grooved
    K.glowSide(d.bolt, 5, -2, 2, -60, -44);
    d.mag.box(-3, -8, -8, 3, -2, 2, C.STEEL, 0.05); d.magPivot = [0, -2, -3];                      // the loading gate
    const s = K.sight(b, TOP, 6, 5); guard(b, 22, -2);
    d.A = { muzzle: [0, 9, -83], grip: [0, -6, 22], fore: [0, -3, -52], magHand: [0, -6, -3], dot: s.dot, win: s.win };
    return K.finish(d, 'Pump Shotgun');
  }
  function double() {
    const d = K.start(311); d.kind = 'shotgun'; d.skin = 'frost'; const b = d.body;
    K.run(b, -14, 10, () => ({ y0: -3, y1: 12, hw: 6, col: C.IRON, cut: 3 }));
    twin(b, -72, -14, 8, 3, 3, C.STEEL); K.slab(b, -72, -14, 10, 12, 1, C.DARK, 0);                // two barrels and a rib between them
    for (const z of [-70, -52, -34]) for (const x of [-3, 3]) { for (let zz = z; zz < z + 2; zz++) for (let y = 4; y <= 12; y++) for (let xx = -4; xx <= 3; xx++) if ((xx + .5) * (xx + .5) + (y + .5 - 8) * (y + .5 - 8) <= 12) b.set(x + xx, y, zz, C.PLATE, 0.05); }
    for (const x of [-3, 3]) b.box(x - 1, 6, -73, x + 1, 10, -72, C.GH, 0.04, 'glow');            // glowing muzzles
    K.glowSide(b, 6, 3, 8, -10, 6);
    K.wedge(b, 10, 56, -3, 12, -14, 8, 4, C.IRON, 2); K.slab(b, 54, 58, -15, 9, 4, C.PLATE, 1);
    K.slab(b, -44, -20, -8, 6, 5, C.IRON, 2); K.glowSide(b, 5, -5, 0, -42, -24);                  // forend
    d.bolt.box(4, 8, 8, 6, 12, 10, C.TRIM, 0.05); d.boltPivot = [5, 9, 9];                       // the break lever
    d.mag.box(-3, -8, -4, 3, -3, 4, C.STEEL, 0.05); d.magPivot = [0, -3, 0];
    const s = K.sight(b, 12, 2, 6); guard(b, 14, -3);
    d.A = { muzzle: [0, 8, -73], grip: [0, -6, 16], fore: [0, -6, -32], magHand: [0, -6, 0], dot: s.dot, win: s.win };
    return K.finish(d, 'Double Barrel');
  }
  function combat() {
    const d = K.start(321); d.kind = 'shotgun'; d.skin = 'radiation'; const b = d.body;
    K.run(b, -24, 26, () => ({ y0: -2, y1: TOP, hw: 5, col: C.IRON, cut: 2 }));
    for (let z = -20; z < 22; z += 4) b.box(-3, TOP - 1, z, 3, TOP, z + 1, C.DARK, 0.04);
    b.box(5, 5, -8, 6, 11, 4, C.DARK, 0.04); b.box(-6, 5, -8, -5, 11, 4, C.DARK, 0.04);
    K.run(b, -62, -24, () => ({ y0: 1, y1: 12, hw: 5, col: C.STEEL, cut: 3 }));                      // heat shield handguard
    for (let z = -58; z < -26; z += 5) K.glowSide(b, 5, 3, 9, z, z + 2);
    K.tube(b, -72, -62, 7, 3, C.DARK); K.slab(b, -76, -68, 1, 13, 4, C.IRON, 1); for (const z of [-75, -72]) K.glowSide(b, 4, 4, 10, z, z + 1);   // muzzle brake
    K.wedge(b, 26, 58, 0, 12, -10, 8, 4, C.IRON, 2); K.slab(b, 56, 60, -11, 9, 4, C.PLATE, 1);
    K.grip(b, 8, -2, -24, 9, 4, 3, C.IRON); guard(b, 8, -2);
    K.grip(d.mag, -22, -2, -30, 12, -4, 3, C.STEEL); d.mag.box(-3, -31, -26, 3, -30, -8, C.PLATE2, 0.05); K.glowSide(d.mag, 3, -26, -8, -18, -16); d.magPivot = [0, -2, -16];
    d.bolt.box(5, 8, -10, 7, 11, -4, C.PLATE, 0.06); d.boltPivot = [6, 9, -7];
    const s = K.sight(b, TOP, 4, 5);
    d.A = { muzzle: [0, 7, -77], grip: [0, -12, 12], fore: [0, -2, -44], magHand: [0, -22, -18], dot: s.dot, win: s.win };
    return K.finish(d, 'Combat Shotgun');
  }
  function blunderbuss() {
    const d = K.start(331); d.kind = 'shotgun'; d.skin = 'flame'; const b = d.body;
    K.run(b, -14, 22, () => ({ y0: -2, y1: TOP, hw: 5, col: C.IRON, cut: 3 }));
    K.tube(b, -44, -14, 8, 5, C.STEEL); for (const z of [-42, -30, -20]) K.ring(b, z, 8, 6, C.PLATE, 2);
    for (let z = -52; z < -44; z++) { const r = 5 + (z + 44) / -2.2 | 0; { const rr = Math.max(5, Math.min(9, 5 + Math.round((-44 - z) / 2))); K.tube(b, z, z + 1, 8 - (rr - 5), rr, C.IRON); } }   // the flared bell
    K.tube(b, -53, -50, 8, 8, C.GH, 'glow'); K.tube(b, -53, -51, 8, 5, C.CORE);
    K.glowSide(b, 5, 3, 9, -12, 14); K.glowTop(b, 13, -42, -14, 1);
    K.wedge(b, 22, 40, -2, 12, -6, 6, 4, C.IRON, 2); K.slab(b, 38, 42, -7, 7, 4, C.PLATE, 1);       // a short fat stock
    K.grip(b, 6, -2, -24, 10, 5, 3, C.IRON); guard(b, 6, -2);
    K.slab(b, -26, -14, -8, 4, 3, C.IRON, 1);
    d.bolt.box(4, 9, 16, 6, 13, 19, C.TRIM, 0.05); d.boltPivot = [5, 10, 17];
    d.mag.box(-3, -8, -6, 3, -2, 2, C.STEEL, 0.05); d.magPivot = [0, -2, -2];
    const s = K.sight(b, TOP, 0, 5);
    d.A = { muzzle: [0, 8, -54], grip: [0, -12, 10], fore: [0, -6, -22], magHand: [0, -6, -2], dot: s.dot, win: s.win };
    return K.finish(d, 'Blunderbuss');
  }
  const LIST = [{ id: 'shotgun_pump', build: pump }, { id: 'shotgun_double', build: double }, { id: 'shotgun_combat', build: combat }, { id: 'shotgun_blunderbuss', build: blunderbuss }];
  return { LIST };
})();
if (typeof module !== 'undefined') module.exports = GunsShotgun;
