/* Gothic Assault Rifle (Grok's model sheets, art-drop/gun).
   The colours, panels, runes and glow cells come straight from the side view (gothic_rifle_data.js,
   made by tools/sheet_to_voxels.py), so nothing is redrawn by eye. This file gives it width, splits off
   the magazine and charging handle, and adds the square-aperture sight from the detail sheet.
   Gun space: +Y up, the muzzle points to -Z. */
const GothicRifle = (function () {
  const SHEET = typeof GothicRifleSheet !== 'undefined' ? GothicRifleSheet : require('./gothic_rifle_data.js');
  const K = SHEET.res;          // voxels per sheet-voxel (the picture's own blocks are about 11 px)
  const VOX = 0.013 / K;        // world size of one voxel
  const S = 0.0885 * K;         // voxels per picture pixel (same numbers as tools/sheet_to_voxels.py)
  const OX = 430, OY = 395;     // picture pixel that becomes the gun's (z = 0, y = 0)
  const Zv = (px) => -(px - OX) * S;
  const Yv = (py) => (OY - py) * S;
  const C1 = 0x2c2c30, C2 = 0x1c1c20, R1 = 0x8b1a22, R2 = 0x651018, R3 = 0xa82a32, G = 0xff4d14, GH = 0xff9a2a, CORE = 0x0b0a0b;

  // how wide (half width in voxels) each region of the side picture is, read from the 3/4 view and the detail sheet
  function halfWidth(xpx, ypx) { return K * halfWidth1(xpx, ypx); }
  function halfWidth1(xpx, ypx) {
    if (xpx < 240) return 4;                                     // stock
    if (xpx < 325) return 2;                                     // buffer tube
    if (ypx > 455 && xpx > 285 && xpx < 400) return 4;           // pistol grip
    if (ypx > 455) return 1;                                     // trigger guard
    if (xpx >= 865 && xpx <= 950 && ypx < 300) return ypx >= 262 ? 3 : 2;   // front sight tower and its post
    if (ypx < 262) return 1;                                     // rail teeth and studs
    if (ypx < 290 && xpx > 300 && xpx < 1000) return 2;          // top rail
    if (xpx < 640) return 6;                                     // receiver
    if (xpx < 1000) return 6;                                    // handguard
    return 4;                                                    // barrel end and muzzle cap
  }

  function build() {
    const body = new Voxel.Grid(11), mag = new Voxel.Grid(12), bolt = new Voxel.Grid(13);
    const zr = (xa, xb) => { const a = Math.round(Zv(xb)), b = Math.round(Zv(xa)); return [a, Math.max(b, a + 1)]; };
    const yr = (ya, yb) => { const a = Math.round(Yv(yb)), b = Math.round(Yv(ya)); return [a, Math.max(b, a + 1)]; };
    const magZ = zr(498, 592), magTop = Math.round(Yv(456));
    const magPivot = [0, magTop, (magZ[0] + magZ[1]) / 2];

    /* 1. the picture, voxel by voxel, given width */
    const frontZ = SHEET.zMin;
    for (let ri = 0; ri < SHEET.rows.length; ri++) {
      const y = SHEET.yMax - ri, row = SHEET.rows[ri];
      for (let ci = 0; ci < row.length; ci++) {
        const ch = row[ci]; if (ch === '.') continue;
        const z = SHEET.zMax - ci, idx = parseInt(ch, 36);
        const xpx = OX - (z + 0.5) / S, ypx = OY - (y + 0.5) / S;
        const isMag = z >= magZ[0] && z < magZ[1] && y < magTop;
        const hw = isMag ? 4 : halfWidth(xpx, ypx), g = isMag ? mag : body;
        const col = SHEET.palette[idx], lit = SHEET.glow[idx] === 1;
        for (let x = -hw; x < hw; x++) {
          const outer = x === -hw || x === hw - 1;
          if (lit && !outer) g.set(x, y, z, C2, 0.04);            // glow only shows on the surface
          else g.set(x, y, z, col, lit ? 0.05 : 0.05, lit ? 'glow' : 'solid');
        }
      }
    }
    // the muzzle: ring of glowing vent ports round a blocked dark core (detail sheet: flash suppressor, bore)
    { const rows = []; for (let y = SHEET.yMin; y <= SHEET.yMax; y++) if (body.has(0, y, frontZ)) rows.push(y);
      if (rows.length) {
        const cy = (rows[0] + rows[rows.length - 1] + 1) / 2;
        for (const y of rows) for (let x = -4 * K; x < 4 * K; x++) {
          const dx = Math.abs(x + 0.5), dy = Math.abs(y + 0.5 - cy);
          if (dx < 1.5 * K && dy < 1.5 * K) body.set(x, y, frontZ, CORE, 0.02);
          else if (dx < 2.5 * K && dy < 2.5 * K) { if ((Math.floor(x / K) + Math.floor(y / K)) % 2 === 0) body.set(x, y, frontZ, GH, 0.05, 'glow'); else body.set(x, y, frontZ, R2, 0.06); }
          else body.set(x, y, frontZ, R1, 0.08);
        }
      }
    }
    // trigger guard (thin in the picture)
    { const z = zr(396, 472), y = yr(456, 468); body.box(-K, y[0], z[0], K, y[1], z[1], C2, 0.04); const z2 = zr(462, 474), y2 = yr(440, 470); body.box(-K, y2[0], z2[0], K, y2[1], z2[1], C2, 0.04); }

    /* 2. the square-aperture sight from the detail sheet: an open gate on the receiver, front post up the barrel.
          The window has nothing in it, so the player looks straight through to the target. The red dot sits at the
          window centre, at the same height as the front post tip, so the post and the dot line up. */
    const topAt = (z) => { for (let y = SHEET.yMax; y >= SHEET.yMin; y--) if (body.has(0, y, z)) return y + 1; return 0; };
    const railTop = topAt(Math.round(1.5 * K));
    const dotY = topAt(Math.round(Zv(905))) - 0.5 * K;            // the front post's tip
    const winH = 4 * K, winY0 = Math.round(dotY - winH / 2), winY1 = winY0 + winH, winZ0 = 0, winZ1 = 3 * K, halfW = 4 * K;
    body.box(-halfW - K, railTop, winZ0, halfW + K, winY0, winZ1, C1, 0.05);                  // base (the adjustable elevation block)
    body.box(-halfW - K, winY0, winZ0, -halfW, winY1 + K, winZ1, C1, 0.05); body.box(halfW, winY0, winZ0, halfW + K, winY1 + K, winZ1, C1, 0.05);   // posts
    body.box(-halfW - K, winY1, winZ0, halfW + K, winY1 + K, winZ1, R1, 0.06);                // top bar
    body.box(-halfW - K, winY1 - K, winZ0, -halfW, winY1, winZ1, R1, 0.06); body.box(halfW, winY1 - K, winZ0, halfW + K, winY1, winZ1, R1, 0.06);   // crimson corners
    for (const x of [-3 * K, 2 * K]) body.box(x, winY1 + K - 1, K, x + K, winY1 + K, 2 * K, GH, 0.05, 'glow');   // glow studs on top
    body.box(-halfW, winY0 - 1, winZ0, halfW, winY0, winZ1, R2, 0.06);                         // thin trim under the window
    body.erase(-halfW, winY0, winZ0, halfW, winY1, winZ1);                                      // keep the window clear
    const dotZ = -2 * K;

    /* 3. charging handle: its own part, right side, pivot at its rest spot */
    bolt.box(6 * K, 0, -3 * K, 8 * K, 2 * K, 2 * K, R1, 0.06);
    bolt.box(8 * K, -K, -2 * K, 9 * K, 3 * K, K, R3, 0.06);
    bolt.box(4 * K, 0, -K, 6 * K, K, K, C2, 0.04);

    const u = (v) => v * VOX;
    return {
      vox: VOX,
      parts: { body: { grid: body, pivot: [0, 0, 0] }, mag: { grid: mag, pivot: magPivot }, bolt: { grid: bolt, pivot: [7 * K, K, 0] } },
      anchors: {
        muzzle: [0, u(Yv(362)), u(frontZ)],
        sightDot: [0, u(dotY), u(dotZ)],
        magPivot: [u(magPivot[0]), u(magPivot[1]), u(magPivot[2])],
        boltRest: [u(7 * K), u(Yv(330)), u(-14 * K)],
        handGrip: [0, u(Yv(515)), u(Zv(340))],
        handFore: [0, u(Yv(440)), u(Zv(820))],
        handMag: [0, u(Yv(527)), u(Zv(545))],
        dotWindow: { y0: u(winY0), y1: u(winY1), halfW: u(halfW) },
        _debug: { railTop, winY0, winY1, dotY },
      },
    };
  }
  return { build, VOX };
})();
if (typeof module !== 'undefined') module.exports = GothicRifle;
