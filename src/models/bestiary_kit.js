/* Small helpers for hand-built monsters (bone hound, rock golem, demon lord).
   They build on Voxel.Grid and add the few shapes the sprites need: chipped boulders, bone rings, thick lines, glowing cracks. */
const BestiaryKit = (function () {
  const hash = (typeof Voxel !== 'undefined' ? Voxel : require('./voxel.js')).hash;
  const pick = (pal, h) => pal[Math.min(pal.length - 1, Math.floor(h * pal.length))];

  // a chipped boulder: an ellipsoid whose edge is roughened per voxel; pal = colours (dark to light), top voxels get the lightest
  function rock(g, cx, cy, cz, rx, ry, rz, pal, seed) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++)
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz + 1); z++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
          const d = dx * dx + dy * dy + dz * dz, chip = (hash(x, y, z, seed) - 0.5) * 0.28;
          if (d + chip > 1) continue;
          const up = Math.max(0, Math.min(1, 0.5 + dy * 0.6)), patch = hash(x >> 2, y >> 2, z >> 2, seed);   // light from above, plus clean facet patches 4 voxels wide
          g.set(x, y, z, pick(pal, Math.min(0.999, up * 0.55 + patch * 0.45)), 0.025);
        }
  }
  // an elliptical ring (outline) in the x/y plane at depth z, 'thick' voxels deep; band = fraction of the radius that is solid
  function ring(g, z, cx, cy, rx, ry, col, thick, band) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
        if (d <= 1 && d >= 1 - (band || 0.3)) for (let t = 0; t < (thick || 1); t++) g.set(x, y, z + t, col, 0.06);
      }
  }
  // a thick straight line of cubes (size r voxels) from a to b
  function line(g, a, b, r, col, kind, v) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(a[0] + (b[0] - a[0]) * i / n), y = Math.round(a[1] + (b[1] - a[1]) * i / n), z = Math.round(a[2] + (b[2] - a[2]) * i / n);
      for (let dx = 0; dx < r; dx++) for (let dy = 0; dy < r; dy++) for (let dz = 0; dz < r; dz++) g.set(x + dx, y + dy, z + dz, col, v === undefined ? 0.06 : v, kind);
    }
  }
  // a glowing crack drawn on the front (-z) surface: for each point on the path, the frontmost voxel of that column lights up
  function crack(g, pts, col, depthSide) {
    const side = depthSide || -1;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
      for (let k = 0; k <= n; k++) {
        const x = Math.round(a[0] + (b[0] - a[0]) * k / n), y = Math.round(a[1] + (b[1] - a[1]) * k / n);
        let best = null;
        for (const t of g.solid.values()) if (t.x === x && t.y === y && (best === null || (t.z - best.z) * side < 0)) best = t;
        if (best) g.set(best.x, best.y, best.z, col, 0.02, 'glow');
      }
    }
  }
  const inPoly = (px, py, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  // fills a flat polygon in the x/y plane, z0..z1-1
  function poly(g, pts, z0, z1, pal, seed) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      if (inPoly(x + 0.5, y + 0.5, pts)) for (let z = z0; z < z1; z++) g.set(x, y, z, pick(pal, hash(x, y, z, seed || 5)), 0.05);
  }
  // copy every voxel of a grid to its mirror across x = 0 (x -> -x-1)
  function mirror(src, dst) { const d = dst || src, all = [...src.solid.values()], gl = [...src.glow.values()]; for (const t of all) d.set(-t.x - 1, t.y, t.z, rgbToHex(t.c), 0); for (const t of gl) d.set(-t.x - 1, t.y, t.z, rgbToHex(t.c), 0, 'glow'); }
  const rgbToHex = (c) => (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255);
  return { rock, ring, line, crack, poly, mirror, pick };
})();
if (typeof module !== 'undefined') module.exports = BestiaryKit;
