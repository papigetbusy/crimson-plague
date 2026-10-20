/* The four heavy machine guns: big and chunky, a barrel shroud, a carry handle on top, a thick stock and a hanging ammo box or drum; the bulk says heavy at a glance.
   belt = belt-fed MG with ammo box and bipod; minigun = rotary cluster of barrels; drum = LMG with a big drum; chain = shielded chaingun with a huge muzzle.
   Right hand on the rear grip, left hand under the forward grip or shroud. */
const GunsHmg = (function () {
  const K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C;
  const TOP = 14;
  const guard = (b, gz, top) => { b.box(-1, top - 9, gz - 14, 1, top - 8, gz - 2, C.DARK, 0.04); b.box(-1, top - 9, gz - 15, 1, top, gz - 14, C.DARK, 0.04); b.box(-1, top - 9, gz - 3, 1, top, gz - 2, C.DARK, 0.04); };
  const stock = (b, z0, z1, col, accent) => { K.wedge(b, z0, z1, 0, 12, -14, 8, 5, col, 2); K.slab(b, z1 - 2, z1 + 2, -15, 9, 5, accent, 1); };
  const handle = (b, z0, z1, top) => { b.box(-1, top, z0, 1, top + 1, z1, C.DARK, 0.04); b.box(-1, top - 6, z0, 1, top, z0 + 1, C.DARK, 0.04); b.box(-1, top - 6, z1 - 1, 1, top, z1, C.DARK, 0.04); };

  function belt() {
    const d = K.start(501); d.kind = 'hmg'; d.skin = 'poison'; const b = d.body;
    K.run(b, -24, 30, () => ({ y0: -6, y1: TOP, hw: 8, col: C.IRON, cut: 3 }));
    K.run(b, -84, -24, () => ({ y0: -2, y1: 12, hw: 6, col: C.STEEL, cut: 3 })); for (let z = -80; z < -30; z += 7) K.glowSide(b, 6, 3, 8, z, z + 3);   // vented shroud
    K.tube(b, -104, -84, 6, 3, C.DARK); K.slab(b, -110, -102, 0, 12, 4, C.IRON, 2);
    K.slab(b, -70, -64, -18, -2, 2, C.IRON, 1); K.slab(b, -70, -64, -20, -17, 4, C.PLATE, 0);  // bipod leg
    K.slab(b, -54, -48, -18, -2, 2, C.IRON, 1); K.slab(b, -54, -48, -20, -17, 4, C.PLATE, 0);
    K.glowSide(b, 8, 0, 6, -18, 22);
    stock(b, 30, 70, C.IRON, C.PLATE);
    K.grip(b, 12, -6, -26, 9, 3, 4, C.IRON); guard(b, 12, -6);
    d.bolt.box(8, 7, -10, 11, 11, -4, C.PLATE, 0.06); d.boltPivot = [9, 9, -7];
    d.mag.box(-8, -26, -16, 8, -8, 6, C.PLATE2, 0.05); d.mag.box(-7, -25, -15, 7, -9, 5, C.IRON, 0.05); for (let z = -12; z < 4; z += 4) K.glowSide(d.mag, 8, -22, -12, z, z + 2); d.magPivot = [0, -8, -5];   // belt ammo box
    const s = K.sight(b, TOP, 2, 7); handle(b, -16, 18, TOP + 0);
    d.A = { muzzle: [0, 6, -111], grip: [0, -10, 18], fore: [0, -6, -44], magHand: [0, -18, -5], dot: s.dot, win: s.win };
    return K.finish(d, 'Belt MG');
  }
  function minigun() {
    const d = K.start(511); d.kind = 'hmg'; d.skin = 'shock'; const b = d.body;
    K.run(b, -24, 26, () => ({ y0: -6, y1: TOP, hw: 9, col: C.IRON, cut: 4 }));
    K.run(b, -96, -24, () => ({ y0: -1, y1: 13, hw: 8, col: C.STEEL, cut: 4 }));                // the barrel cluster
    for (const [x, y] of [[-4, 3], [4, 3], [-4, 9], [4, 9], [0, 6]]) K.tube(b, -118, -90, y, 1, C.DARK);
    for (const z of [-114, -96, -78, -60, -42]) { K.ring(b, z, 6, 8, C.PLATE, 4); K.glowSide(b, 8, 3, 9, z, z + 2); }
    K.slab(b, -124, -116, -1, 13, 8, C.IRON, 4);
    K.glowTop(b, 12, -94, -30, 3);
    stock(b, 26, 62, C.IRON, C.PLATE);
    K.grip(b, 12, -6, -26, 9, 3, 4, C.IRON); guard(b, 12, -6); K.grip(b, -40, -1, -20, 9, 0, 3, C.IRON);    // a forward grip too
    d.bolt.box(9, 7, -8, 12, 11, -2, C.TRIM, 0.05); d.boltPivot = [10, 9, -5];
    d.mag.box(-6, -24, -12, 6, -8, 4, C.STEEL, 0.05); K.glowSide(d.mag, 6, -22, -10, -8, -4); d.magPivot = [0, -8, -4];
    const s = K.sight(b, TOP, 2, 7); handle(b, -16, 18, TOP);
    d.A = { muzzle: [0, 6, -125], grip: [0, -10, 18], fore: [0, -14, -40], magHand: [0, -16, -4], dot: s.dot, win: s.win };
    return K.finish(d, 'Minigun');
  }
  function drum() {
    const d = K.start(521); d.kind = 'hmg'; d.skin = 'dark'; const b = d.body;
    K.run(b, -22, 28, () => ({ y0: -4, y1: TOP, hw: 6, col: C.IRON, cut: 3 }));
    K.run(b, -78, -22, () => ({ y0: 0, y1: 11, hw: 5, col: C.STEEL, cut: 2 }));
    K.tube(b, -98, -78, 6, 2, C.DARK); for (const z of [-96, -90, -84]) K.ring(b, z, 6, 4, C.PLATE, 2);
    K.slab(b, -60, -54, -14, 0, 2, C.IRON, 1); K.slab(b, -60, -54, -16, -13, 4, C.PLATE, 0);
    K.glowSide(b, 6, 2, 8, -18, 22);
    stock(b, 28, 66, C.IRON, C.PLATE);
    K.grip(b, 10, -4, -24, 9, 3, 3, C.IRON); guard(b, 10, -4);
    d.bolt.box(6, 7, -8, 8, 10, -2, C.PLATE, 0.06); d.boltPivot = [7, 8, -5];
    K.tube(d.mag, -24, -6, -16, 12, C.IRON, 'solid'); K.tube(d.mag, -23, -7, -16, 8, C.PLATE2); K.tube(d.mag, -20, -10, -16, 5, C.GH, 'glow'); d.magPivot = [0, -4, -15];   // a big round drum
    const s = K.sight(b, TOP, 2, 6); handle(b, -14, 16, TOP);
    d.A = { muzzle: [0, 6, -99], grip: [0, -8, 14], fore: [0, -6, -38], magHand: [0, -22, -15], dot: s.dot, win: s.win };
    return K.finish(d, 'Drum LMG');
  }
  function chain() {
    const d = K.start(531); d.kind = 'hmg'; d.skin = 'frost'; const b = d.body;
    K.run(b, -24, 34, () => ({ y0: -8, y1: TOP, hw: 9, col: C.IRON, cut: 4 }));
    K.run(b, -74, -24, () => ({ y0: -3, y1: 12, hw: 7, col: C.STEEL, cut: 3 }));
    K.tube(b, -110, -74, 5, 6, C.DARK); K.ring(b, -108, 5, 8, C.PLATE, 3); K.ring(b, -92, 5, 7, C.PLATE, 3);   // fat barrel
    K.slab(b, -118, -108, -3, 14, 8, C.IRON, 3); K.glowSide(b, 8, 2, 10, -116, -110);
    K.slab(b, -80, -76, -6, 18, 9, C.PLATE, 2); K.glowSide(b, 9, 2, 12, -80, -76);               // a front shield plate
    K.glowSide(b, 9, 0, 8, -18, 26);
    stock(b, 34, 72, C.IRON, C.PLATE);
    K.grip(b, 14, -8, -28, 9, 3, 4, C.IRON); guard(b, 14, -8); K.grip(b, -44, -3, -22, 9, 0, 3, C.IRON);
    d.bolt.box(9, 7, -10, 12, 11, -4, C.TRIM, 0.05); d.boltPivot = [10, 9, -7];
    d.mag.box(-9, -30, -18, 9, -10, 8, C.PLATE2, 0.05); d.mag.box(-8, -29, -17, 8, -11, 7, C.IRON, 0.05); K.glowSide(d.mag, 9, -26, -14, -12, -6); d.magPivot = [0, -10, -5];
    const s = K.sight(b, TOP, 2, 7); handle(b, -16, 20, TOP);
    d.A = { muzzle: [0, 5, -119], grip: [0, -12, 20], fore: [0, -16, -44], magHand: [0, -20, -5], dot: s.dot, win: s.win };
    return K.finish(d, 'Chaingun');
  }
  const LIST = [{ id: 'hmg_belt', build: belt }, { id: 'hmg_minigun', build: minigun }, { id: 'hmg_drum', build: drum }, { id: 'hmg_chain', build: chain }];
  return { LIST };
})();
if (typeof module !== 'undefined') module.exports = GunsHmg;
