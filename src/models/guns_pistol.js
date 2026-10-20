/* The four pistols. Each is a handgun that reads as a handgun at a glance: a slide on a frame, a trigger guard, a slanted grip with the magazine in it.
   service = the plain silver starter every run begins with; cannon = big and heavy; machine = extended magazine and a stub grip; duelist = long slim barrel and a hammer.
   Held in two hands: the right on the grip, the left cupping it from below. */
const GunsPistol = (function () {
  const K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C;
  const frame = (d, o) => {          // shared handgun skeleton: slide, frame, trigger guard, grip, magazine
    const { body, mag } = d;
    K.run(body, o.sz0, o.sz1, (z) => ({ y0: 0, y1: o.top, hw: o.hw, col: o.slideCol && o.slideCol(z) || C.IRON, cut: 1 }));
    K.run(body, o.fz0, o.fz1, () => ({ y0: -4, y1: 0, hw: o.hw, col: C.DARK, cut: 1 }));
    for (let z = o.sz0 + 3; z < o.sz1 - 14; z += 3) body.box(-o.hw, o.top - 1, z, o.hw, o.top, z + 1, C.DARK, 0.04);       // top slots
    for (let z = o.sz1 - 12; z < o.sz1 - 3; z += 2) body.box(-o.hw - 1, 1, z, o.hw + 1, o.top - 1, z + 1, C.DARK, 0.04);      // rear serrations
    body.box(o.hw, o.top - 6, o.sz1 - 22, o.hw + 1, o.top - 2, o.sz1 - 12, C.DARK, 0.04); body.box(-o.hw - 1, o.top - 6, o.sz1 - 22, -o.hw, o.top - 2, o.sz1 - 12, C.DARK, 0.04);   // ejection port
    const g0 = o.gz;                                                                                                          // trigger guard and trigger
    body.box(-1, -9, g0 - 14, 1, -8, g0 - 2, C.DARK, 0.04); body.box(-1, -9, g0 - 15, 1, -4, g0 - 14, C.DARK, 0.04); body.box(-1, -9, g0 - 3, 1, -4, g0 - 2, C.DARK, 0.04); body.box(-1, -7, g0 - 8, 1, -4, g0 - 7, C.DARK, 0.04);
    K.grip(body, g0, -4, o.gb, o.gd, o.lean, o.ghw, C.IRON, undefined, o.mt);                                                  // upper grip in the body
    K.grip(mag, g0, -4, o.gb, o.gd, o.lean, o.ghw - (o.magThin || 0), C.STEEL, o.mt, undefined);                                // lower grip is the magazine
    mag.box(-o.ghw, o.gb - 1, g0 + o.lean - 1, o.ghw, o.gb, g0 + o.lean + o.gd + 1, C.PLATE2, 0.05);                            // magazine base plate
    const s = K.sight(body, o.top, o.sz1 - 8, 5);
    d.A = { muzzle: [0, o.top / 2, o.sz0 - 1], grip: [0, -10, g0 + 5], fore: [0, o.gb + 2, g0 + 1], magHand: [0, o.gb + 3, g0 + o.lean], dot: s.dot, win: s.win };
    d.magPivot = [0, o.mt, g0 + Math.round(o.lean * (-4 - o.mt) / (-4 - o.gb)) + (o.gd >> 1)];
    d.bolt.box(-1, o.top - 2, o.sz1 - 2, 2, o.top, o.sz1 + 1, C.TRIM, 0.05); d.boltPivot = [0, o.top - 1, o.sz1 - 2];
  };

  function service() {            // the plain silver starter: slim slide, plain frame, no glow
    const d = K.start(101); d.kind = 'pistol'; d.skin = 'silver';
    frame(d, { sz0: -30, sz1: 14, top: 10, hw: 3, fz0: -26, fz1: 10, gz: 4, gb: -26, gd: 10, lean: 5, ghw: 3, mt: -12 });
    d.body.box(-2, 3, -33, 2, 8, -30, C.DARK, 0.04);                                         // barrel tip
    return K.finish(d, 'Service Pistol');
  }
  function cannon() {             // the hand cannon: tall thick slide, vented top, heavy brake, big glowing vents
    const d = K.start(111); d.kind = 'pistol'; d.skin = 'flame';
    frame(d, { sz0: -38, sz1: 16, top: 13, hw: 4, fz0: -30, fz1: 12, gz: 5, gb: -28, gd: 11, lean: 5, ghw: 4, mt: -12, slideCol: (z) => (z < -32 || (z > -22 && z < -20) ? C.PLATE2 : C.IRON) });
    for (let z = -34; z < -10; z += 6) K.glowSide(d.body, 4, 3, 9, z, z + 3);
    K.glowTop(d.body, 12, -36, -8, 1);
    d.body.box(-3, 4, -41, 3, 10, -38, C.DARK, 0.04); d.body.box(-1, 6, -41, 1, 8, -40, C.CORE, 0.02);
    return K.finish(d, 'Hand Cannon');
  }
  function machine() {            // machine pistol: short slide, compensator, long magazine, little foregrip
    const d = K.start(121); d.kind = 'pistol'; d.skin = 'shock';
    frame(d, { sz0: -22, sz1: 14, top: 10, hw: 3, fz0: -20, fz1: 10, gz: 4, gb: -34, gd: 9, lean: 4, ghw: 3, mt: -12, magThin: 0, slideCol: (z) => (z > 8 ? C.PLATE2 : C.IRON) });
    K.slab(d.body, -30, -22, 1, 10, 3, C.STEEL, 1); for (const z of [-28, -25]) K.glowSide(d.body, 3, 3, 8, z, z + 2);        // compensator with glowing ports
    K.slab(d.body, -16, -10, -14, -4, 2, C.IRON, 1);                                                                          // little foregrip under the front
    K.glowSide(d.mag, 3, -30, -14, 6, 8);                                                                                      // glowing strip on the long magazine
    d.A.fore = [0, -12, -13];
    return K.finish(d, 'Machine Pistol');
  }
  function duelist() {            // duelist: long slim barrel with a rib, a hammer spur, a curved grip, glowing veins
    const d = K.start(131); d.kind = 'pistol'; d.skin = 'frost';
    frame(d, { sz0: -22, sz1: 14, top: 9, hw: 3, fz0: -20, fz1: 10, gz: 4, gb: -26, gd: 9, lean: 7, ghw: 3, mt: -12 });
    K.tube(d.body, -50, -22, 5, 2, C.STEEL); K.slab(d.body, -50, -22, 7, 9, 1, C.DARK, 0);                                    // long barrel with a rib on top
    for (const z of [-46, -36, -28]) K.ring(d.body, z, 5, 3, C.PLATE, 2);
    K.glowTop(d.body, 9, -49, -23, 1); K.glowSide(d.body, 3, 4, 7, -20, 12);
    d.body.box(-1, 7, 12, 1, 10, 16, C.TRIM, 0.05); d.body.box(-1, 9, 14, 1, 11, 17, C.TRIM, 0.05);                       // hammer spur
    d.A.muzzle = [0, 5, -51];
    return K.finish(d, 'Duelist');
  }
  const LIST = [{ id: 'pistol_service', build: service }, { id: 'pistol_cannon', build: cannon }, { id: 'pistol_machine', build: machine }, { id: 'pistol_duelist', build: duelist }];
  return { LIST };
})();
if (typeof module !== 'undefined') module.exports = GunsPistol;
