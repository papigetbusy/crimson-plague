/* Ember Rifle: an original voxel gun made in code (not from a picture). A realistic rifle shape: upper and lower receiver, vented handguard,
   slim barrel with a muzzle brake, shaped stock, angled grip, curved box magazine. Glow accents (vents, seams, magazine strip, brake slits)
   brighten when you run and flash when you shoot (see gun_skins.js / gun_look.js).
   Same shape of answer as gothic_rifle.js (parts body/mag/bolt, anchors in world units), so the game can swap guns. Gun space: +Y up, muzzle to -Z.
   Sight rules kept from the rifle: red dot at (0, 27, -4) voxels in an empty window, a thin frame, nothing solid in front of or behind it on the centre line. */
const EmberRifle = (function () {
  const VOX = 0.0065;
  const IRON = 0x2c2c30, DARK = 0x1c1c20, PLATE = 0x8b1a22, PLATE2 = 0x651018, TRIM = 0xa82a32, GL = 0xff4d14, GH = 0xff9a2a, CORE = 0x0b0a0b;
  const DOT = [0, 27, -4], WIN = { y0: 23, y1: 31, halfW: 7, z0: 1, z1: 3 };
  const MAG_PIVOT = [0, -11, -17];

  const sideGlow = (g, x, y0, y1, z0, z1) => { g.box(x, y0, z0, x + 1, y1, z1, GL, 0.04, 'glow'); g.box(-x - 1, y0, z0, -x, y1, z1, GL, 0.04, 'glow'); };
  const P = typeof EmberProfile !== 'undefined' ? EmberProfile : require('./ember_profile.js');   // the original rifle's side silhouette, so this gun keeps its shape

  // half width (in voxels) of the gun at height y and place z: stock, buffer tube, receivers, handguard, barrel, brake, grip
  function halfWidth(z, y, h) {
    if (z >= 56) return 6;
    if (z >= 30) return Math.round(5 - (z - 30) / 26 * 1.5);
    if (y < -12) return z >= 0 ? 4 : (z > -33 ? 1 : 4);        // pistol grip, thin trigger guard, the lump under the handguard
    if (z >= 14) return 3;                                       // buffer tube
    if (z >= -34) return y >= 19 ? 5 : y < 4 ? 7 : 8;            // top rail, lower receiver, upper receiver
    if (z >= -108) return h <= 12 ? 4 : y >= 15 ? 3 : 7;         // slim barrel, or handguard with its top rail
    return 5;                                                    // muzzle brake
  }
  // fills every stretch of a side silhouette with a slightly rounded cross-section
  function fill(g, prof, hwOf, colOf) {
    for (const zs of Object.keys(prof)) {
      const z = +zs;
      for (const [y0, y1] of prof[zs]) for (let y = y0; y < y1; y++) {
        const edge = Math.min(y - y0, y1 - 1 - y), hw = Math.max(1, hwOf(z, y, y1 - y0) - Math.max(0, 2 - edge));
        g.box(-hw, y, z, hw, y + 1, z + 1, colOf(z, y), 0.05);
      }
    }
  }

  function build() {
    const body = new Voxel.Grid(21), mag = new Voxel.Grid(22), bolt = new Voxel.Grid(23);
    const bands = (z) => (z >= -35 && z <= -34) || (z >= -61 && z <= -60) || (z >= -86 && z <= -85);
    fill(body, P.body, halfWidth, (z, y) => z >= 53 ? PLATE : bands(z) ? PLATE : y < -12 && z > 0 && (y + 40) % 7 === 0 ? PLATE : z >= -26 && z <= 6 && y >= 10 && y < 19 ? PLATE2 : IRON);
    for (let z = -32; z < 12; z += 4) body.box(-5, 21, z, 5, 22, z + 1, DARK, 0.04);                // rail slots
    for (let z = -82; z < -38; z += 6) body.box(-3, 20, z, 3, 21, z + 1, DARK, 0.04);               // handguard rail slots
    // glow accents (they react to running and shooting): the seam on the upper receiver, the vents, the stock stripe, the brake slits, the grip tick
    sideGlow(body, 8, 10, 12, -32, 10);
    body.box(8, 12, -26, 9, 17, -12, DARK, 0.04);                                                    // ejection port
    for (let z = -82; z < -38; z += 6) sideGlow(body, 7, 5, 10, z, z + 3);
    sideGlow(body, 5, 3, 5, 34, 46);
    for (const z of [-114, -119]) sideGlow(body, 5, 5, 11, z, z + 2);
    body.box(-5, 3, -124, 5, 13, -123, DARK, 0.04); body.box(-2, 6, -124, 2, 10, -123, CORE, 0.02);  // the bore
    sideGlow(body, 4, -26, -18, 17, 19);
    // the sight: a thin open frame and nothing else. The red dot floats in the middle of the empty window
    const { y0, y1, halfW, z0, z1 } = WIN;
    body.box(-halfW - 1, 22, z0 - 1, halfW + 1, y0, z1 + 1, DARK, 0.04);                       // thin base plate on the rail
    body.box(-halfW - 1, y0, z0, -halfW, y1 + 1, z1, DARK, 0.04); body.box(halfW, y0, z0, halfW + 1, y1 + 1, z1, DARK, 0.04);   // two slim posts
    body.box(-halfW - 1, y1, z0, halfW + 1, y1 + 1, z1, DARK, 0.04);                           // thin top bar
    body.box(-halfW - 1, y1, z0, -halfW + 1, y1 + 1, z1, TRIM, 0.05); body.box(halfW - 1, y1, z0, halfW + 1, y1 + 1, z1, TRIM, 0.05);
    body.erase(-halfW, y0, z0, halfW, y1, z1);
    // magazine, from the original's silhouette, with a glowing strip down each side
    fill(mag, P.mag, () => 5, (z, y) => (y + 40) % 9 === 0 ? PLATE : IRON);
    { const zs = Object.keys(P.mag).map(Number).sort((p, q) => p - q), zm = zs[zs.length >> 1], [m0, m1] = P.mag[zm][0]; mag.box(5, m0 + 4, zm, 6, m1 - 3, zm + 2, GL, 0.04, 'glow'); mag.box(-6, m0 + 4, zm, -5, m1 - 3, zm + 2, GL, 0.04, 'glow'); }
    // charging handle, right side
    bolt.box(7, 0, -6, 16, 3, 3, PLATE, 0.06); bolt.box(16, -1, -4, 18, 4, 1, TRIM, 0.06);

    const u = (v) => v * VOX;
    return {
      vox: VOX,
      parts: { body: { grid: body, pivot: [0, 0, 0], scale: 1 }, mag: { grid: mag, pivot: MAG_PIVOT, scale: 1 }, bolt: { grid: bolt, pivot: [14, 2, 0], scale: 1 } },
      anchors: {
        muzzle: [0, u(8), u(-122)],
        sightDot: [0, u(DOT[1]), u(DOT[2])],
        magPivot: MAG_PIVOT.map(u),
        boltRest: [u(14), u(11.5), u(-28)],
        handGrip: [0, u(-20), u(12)],
        handFore: [0, u(6), u(-62)],
        handMag: [0, u(-26), u(-17)],
        dotWindow: { y0: u(WIN.y0), y1: u(WIN.y1), halfW: u(WIN.halfW) },
      },
    };
  }
  return { build, VOX };
})();
if (typeof module !== 'undefined') module.exports = EmberRifle;
