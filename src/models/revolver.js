/* Revolver: Grok's black and neon-green revolver (art-drop/gun/revolver_ref.jpg), built from its own silhouette (revolver_data.js, made by
   tools/make_revolver_data.py), so nothing is redrawn by eye. This file gives it width, splits off the hammer (it plays the charging handle's part:
   it kicks back when you fire) and sets the anchors. Same shape of answer as gothic_rifle.js, so the game can swap guns. Gun space: +Y up, muzzle to -Z, origin mid-cylinder.
   Aim: the red dot floats just above the top strap (no frame: the picture has no sight), with nothing solid in front of or behind it. */
const Revolver = (function () {
  const SHEET = typeof RevolverSheet !== 'undefined' ? RevolverSheet : require('./revolver_data.js');
  const VOX = 0.0065;
  const IRON = 0x232327, SILVER = 0xb4b4bc, GREEN = 0x39ff14;
  const DOT = [0, 14, 0], WIN = { y0: 12, y1: 17, halfW: 4 };
  const HAMMER_PIVOT = [0, 9, 3];

  const isHammer = (z, y) => (z >= 3 && y >= 9) || (z >= 8 && y >= 5);
  // half width in voxels: the cylinder is fat, the guard and hammer are thin, everything else is a slim slab
  function halfWidth(z, y) {
    if (z >= -7 && z <= 8 && y >= -6 && y <= 7) return 5;      // cylinder
    if (y < -8 && z >= -16 && z <= 3) return 1;                  // trigger guard and trigger
    return 3;
  }

  function build() {
    const body = new Voxel.Grid(31), mag = new Voxel.Grid(32), bolt = new Voxel.Grid(33);
    const rows = SHEET.rows, H = rows.length;
    // the row/column cell around (z, y) is empty? (used to round the edges)
    const at = (z, y) => { const r = SHEET.yMax - y, c = z - SHEET.zMin; return r < 0 || r >= H || c < 0 || c >= rows[0].length ? '.' : rows[r][c]; };
    for (let r = 0; r < H; r++) for (let c = 0; c < rows[0].length; c++) {
      const ch = rows[r][c]; if (ch === '.') continue;
      const y = SHEET.yMax - r, z = SHEET.zMin + c, g = isHammer(z, y) ? bolt : body, hw0 = isHammer(z, y) ? 1 : halfWidth(z, y);
      const edge = Math.min(at(z, y + 1) === '.' ? 0 : 9, at(z, y - 1) === '.' ? 0 : 9, at(z - 1, y) === '.' ? 0 : 9, at(z + 1, y) === '.' ? 0 : 9);
      const hw = Math.max(1, hw0 - (edge === 0 && hw0 > 3 ? 1 : 0));                         // the fat cylinder gets a rounded rim
      for (let x = -hw; x < hw; x++) {
        const outer = x === -hw || x === hw - 1, front = z <= SHEET.zMin + 2;
        if (ch === 'g') { if (outer || front) g.set(x, y, z, GREEN, 0.04, 'glow'); else g.set(x, y, z, IRON, 0.05); }
        else if (ch === 's') g.set(x, y, z, outer || x === -hw + 1 || x === hw - 2 ? SILVER : IRON, 0.05);
        else g.set(x, y, z, IRON, 0.06);
      }
    }
    const u = (v) => v * VOX;
    return {
      vox: VOX,
      parts: { body: { grid: body, pivot: [0, 0, 0], scale: 1 }, mag: { grid: mag, pivot: [0, 0, 0], scale: 1 }, bolt: { grid: bolt, pivot: HAMMER_PIVOT, scale: 1 } },
      anchors: {
        muzzle: [0, u(2), u(SHEET.zMin)],
        sightDot: [0, u(DOT[1]), u(DOT[2])],
        magPivot: [0, 0, 0],
        boltRest: HAMMER_PIVOT.map(u),
        handGrip: [0, u(-20), u(20)],
        handFore: [0, u(-24), u(15)],
        handMag: [0, u(-14), u(0)],
        dotWindow: { y0: u(WIN.y0), y1: u(WIN.y1), halfW: u(WIN.halfW) },
      },
    };
  }
  return { build, VOX };
})();
if (typeof module !== 'undefined') module.exports = Revolver;
