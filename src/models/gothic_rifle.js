/* Gothic Assault Rifle (Grok's model sheet, art-drop/gun). Built from the sheet's side view.
   Parts are placed by picture coordinates (pixels of the side view), converted to voxels.
   Gun space: origin near the receiver, +Y up, the muzzle points to -Z. */
const GothicRifle = (function () {
  const VOX = 0.013;            // world size of one voxel
  const S = 0.0885;             // voxels per picture pixel
  const OX = 430, OY = 395;     // picture pixel that becomes the gun's (z = 0, y = 0)
  const Zv = (px) => -(px - OX) * S;
  const Yv = (py) => (OY - py) * S;
  const C1 = 0x2c2c30, C2 = 0x1c1c20, R1 = 0x8b1a22, R2 = 0x651018, R3 = 0xa82a32, G = 0xff4d14, GH = 0xff9a2a;

  function build() {
    const body = new Voxel.Grid(11), mag = new Voxel.Grid(12), bolt = new Voxel.Grid(13);
    // picture-coordinate helpers. hw = half width in voxels
    const zr = (xa, xb) => { const a = Math.round(Zv(xb)), b = Math.round(Zv(xa)); return [a, Math.max(b, a + 1)]; };
    const yr = (ya, yb) => { const a = Math.round(Yv(yb)), b = Math.round(Yv(ya)); return [a, Math.max(b, a + 1)]; };
    const bx = (g, xa, xb, ya, yb, hw, col, v) => { const z = zr(xa, xb), y = yr(ya, yb); g.box(-hw, y[0], z[0], hw, y[1], z[1], col, v); };
    // a one-voxel skin on both sides of the gun at half width hw (sits on top of a core of hw - 1)
    const plate = (g, xa, xb, ya, yb, hw, col, v, kind) => { const z = zr(xa, xb), y = yr(ya, yb); g.box(hw - 1, y[0], z[0], hw, y[1], z[1], col, v, kind); g.box(-hw, y[0], z[0], -hw + 1, y[1], z[1], col, v, kind); };
    const glow = (g, xa, xb, ya, yb, hw, col) => plate(g, xa, xb, ya, yb, hw, col, 0.05, 'glow');
    // a round panel on both sides, centred on a picture pixel (used for the runes)
    const disc = (g, cx, cy, r, hw, col, v, kind) => {
      for (let z = Math.round(Zv(cx + r)); z <= Math.round(Zv(cx - r)); z++) for (let y = Math.round(Yv(cy + r)); y <= Math.round(Yv(cy - r)); y++) {
        const dz = (z - Zv(cx)) / (r * S), dy = (y - Yv(cy)) / (r * S);
        if (dz * dz + dy * dy <= 1) { g.set(hw - 1, y, z, col, v, kind); g.set(-hw, y, z, col, v, kind); }
      }
    };
    const B = body;

    /* stock */
    bx(B, 45, 110, 298, 475, 4, R1);
    plate(B, 58, 100, 328, 448, 4, C2);
    bx(B, 110, 240, 332, 440, 3, C1);
    bx(B, 110, 240, 298, 336, 4, R1);
    bx(B, 110, 205, 436, 470, 4, R1);
    plate(B, 120, 225, 350, 426, 4, C2);
    glow(B, 118, 140, 342, 356, 4, G);
    bx(B, 240, 325, 322, 374, 2, C1);
    glow(B, 255, 278, 350, 364, 2, G);
    /* receiver */
    bx(B, 300, 640, 290, 455, 5, C1);
    bx(B, 385, 540, 288, 300, 5, R1);
    plate(B, 385, 540, 296, 352, 6, R1);
    plate(B, 300, 400, 330, 452, 6, R1);
    plate(B, 440, 620, 304, 420, 6, R2);
    plate(B, 455, 600, 318, 406, 6, C2);
    glow(B, 482, 494, 336, 384, 6, G);                       // glowing rune cross
    glow(B, 460, 516, 354, 366, 6, G);
    glow(B, 546, 612, 324, 336, 6, G);
    bx(B, 380, 472, 440, 466, 4, C1);                        // trigger housing
    bx(B, 396, 472, 458, 470, 1, C2);                        // trigger guard
    bx(B, 462, 474, 440, 470, 1, C2);
    /* grip */
    bx(B, 332, 394, 455, 502, 4, C1);
    bx(B, 316, 388, 500, 542, 4, C1);
    bx(B, 288, 374, 540, 584, 4, C1);
    plate(B, 296, 362, 548, 582, 5, R1);
    plate(B, 340, 390, 470, 500, 5, R2);
    /* top rail with little teeth, glowing studs */
    bx(B, 300, 1000, 262, 292, 2, C1);
    for (let x = 300; x < 1000; x += 24) if (x < 350 || x > 620) bx(B, x, x + 12, 252, 262, 2, C2);
    for (let x = 640; x < 880; x += 46) { const z = zr(x, x + 11), y = yr(252, 262); B.box(-1, y[0], z[0], 1, y[1], z[1], G, 0.05, 'glow'); }
    /* handguard */
    bx(B, 640, 1000, 275, 430, 5, C1);
    plate(B, 655, 790, 300, 420, 6, R1);
    plate(B, 672, 774, 322, 398, 6, C2);
    glow(B, 690, 760, 356, 366, 6, G);
    plate(B, 810, 945, 318, 396, 6, R1);
    glow(B, 820, 868, 354, 364, 6, G);
    glow(B, 896, 934, 354, 364, 6, G);
    disc(B, 732, 362, 46, 6, R3, 0.1);                       // rune panel
    disc(B, 732, 362, 32, 6, C2, 0.06);
    disc(B, 732, 362, 11, 6, G, 0.05, 'glow');
    plate(B, 600, 650, 292, 440, 6, R1);                      // crimson collar where the handguard starts
    plate(B, 300, 640, 420, 455, 6, R2);                      // dark crimson skirt under the receiver
    plate(B, 640, 780, 280, 298, 6, R2);                      // top vents
    for (let x = 660; x < 780; x += 24) plate(B, x, x + 10, 281, 297, 6, C2);
    plate(B, 640, 1000, 420, 432, 5, R2);
    /* front sight tower with its spike */
    bx(B, 865, 945, 262, 302, 3, C1);
    bx(B, 886, 926, 236, 266, 2, R1);
    bx(B, 930, 950, 226, 262, 1, R1);
    { const z = zr(900, 912), y = yr(244, 256); B.box(-1, y[0], z[0], 1, y[1], z[1], GH, 0.05, 'glow'); }
    /* barrel end and muzzle cap */
    bx(B, 1000, 1062, 315, 405, 3, C1);
    bx(B, 1062, 1130, 310, 416, 4, R1);
    plate(B, 1070, 1122, 326, 398, 4, C2);
    glow(B, 1084, 1118, 350, 372, 4, G);
    { const y = yr(354, 372); B.box(-1, y[0], Math.round(Zv(1130)), 1, y[1], Math.round(Zv(1130)) + 1, GH, 0.05, 'glow'); }   // the bore glows

    /* compact scope: two open rings joined by a thin bar, so the view through it stays clear */
    const ry = yr(185, 265), ry0 = ry[0], ry1 = ry0 + 7;
    const rearZ = zr(360, 395), frontZ = zr(575, 610);
    B.box(-4, ry0, frontZ[0], 4, ry1, frontZ[1], R2);                       // front ring: full frame
    B.erase(-3, ry0 + 1, frontZ[0], 3, ry1 - 1, frontZ[1]);
    B.box(-4, ry0, rearZ[0], 4, ry0 + 5, rearZ[1], R2);                     // rear frame: a low U, open on top, so the view stays clear
    B.erase(-3, ry0 + 1, rearZ[0], 3, ry0 + 5, rearZ[1]);
    // glow studs only on the far (front) ring, so nothing bright sits right in front of the eye
    B.box(-4, ry0 + 2, frontZ[0], -3, ry0 + 5, frontZ[1], GH, 0.05, 'glow');
    B.box(3, ry0 + 2, frontZ[0], 4, ry0 + 5, frontZ[1], GH, 0.05, 'glow');
    B.box(-1, ry1 - 1, frontZ[1], 1, ry1, rearZ[0], C1);                   // top bar between the rings
    B.box(-1, ry0, frontZ[1], 1, ry0 + 1, rearZ[0], C2);                    // base bar
    B.box(-2, ry0 - 1, frontZ[0], 2, ry0, rearZ[1], C2);                    // mount on the rail
    B.box(-1, ry1, frontZ[1] + 2, 1, ry1 + 1, frontZ[1] + 6, G, 0.05, 'glow');
    B.box(-1, ry1, rearZ[0] - 8, 1, ry1 + 1, rearZ[0] - 3, G, 0.05, 'glow');
    const dotZ = Math.round((rearZ[0] + frontZ[1]) / 2) - 0.5;
    const dotY = (ry0 + ry1) / 2;

    /* magazine: its own part, pivot at the top centre (the magazine well) */
    const magZ = zr(500, 590), magY = yr(455, 600);
    const magPivot = [0, magY[1], (magZ[0] + magZ[1]) / 2];
    bx(mag, 500, 590, 455, 600, 3, C1);
    bx(mag, 500, 514, 455, 600, 4, R1); bx(mag, 576, 590, 455, 600, 4, R1);
    bx(mag, 500, 590, 455, 470, 4, R1); bx(mag, 500, 590, 586, 600, 4, R1);
    glow(mag, 530, 552, 482, 572, 3, G);
    bx(mag, 520, 570, 586, 600, 1, C2);

    /* charging handle / bolt: its own part, right side, pivot at its rest spot */
    bolt.box(6, 0, -3, 8, 2, 2, R1);
    bolt.box(8, -1, -2, 9, 3, 1, G, 0.05, 'glow');
    bolt.box(4, 0, -1, 6, 1, 1, C2);

    const u = (v) => v * VOX;
    const frontZv = Math.round(Zv(1130));
    return {
      vox: VOX,
      parts: { body: { grid: B, pivot: [0, 0, 0] }, mag: { grid: mag, pivot: magPivot }, bolt: { grid: bolt, pivot: [7, 1, 0] } },
      anchors: {
        muzzle: [0, u(Yv(362)), u(frontZv)],
        sightDot: [0, u(dotY), u(dotZ)],
        magPivot: [u(magPivot[0]), u(magPivot[1]), u(magPivot[2])],
        boltRest: [u(7), u(Yv(330)), u(-14)],
        handGrip: [0, u(Yv(515)), u(Zv(340))],
        handFore: [0, u(Yv(440)), u(Zv(820))],
        handMag: [0, u(Yv(527)), u(Zv(545))],
        dotWindow: { y0: u(ry0 + 1), y1: u(ry1 - 1), halfW: u(3) },
      },
    };
  }
  return { build, VOX };
})();
if (typeof module !== 'undefined') module.exports = GothicRifle;
