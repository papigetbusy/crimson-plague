/* Polish for voxel models: takes the blocky mesh arrays from Voxel.mesh and softens them, so a gun reads as a shaped, shiny object
   instead of a pile of cubes. Two steps, both gentle:
   1. relax: every corner moves a little toward the average of the corners it is joined to (rounds stair-steps and sharp edges,
      leaves flat areas flat). Corners are shared between the lit mesh and the glowing mesh, so the glow never pokes out.
   2. soften normals: each corner gets the average direction of the faces that meet there, mixed with the face's own direction,
      so light slides across a curved surface and a shiny material catches a highlight.
   Pure data, no THREE: runs in node tests and in the screen. */
const VoxelSmooth = (function () {
  // meshes: array of Voxel.mesh results that share corners (for example [solid, glow]). opts: { relax: 0..1 per pass, passes, soft: 0..1 }
  function smooth(meshes, vox, opts) {
    const o = Object.assign({ relax: 0.5, passes: 2, soft: 0.7 }, opts || {});
    const q = 4 / vox, ids = new Map(), P = [];                 // welded corners
    const idOf = (x, y, z) => {
      const k = Math.round(x * q) + ',' + Math.round(y * q) + ',' + Math.round(z * q);
      let id = ids.get(k); if (id === undefined) { id = P.length / 3; ids.set(k, id); P.push(x, y, z); } return id;
    };
    const maps = meshes.map((m) => { const a = new Int32Array(m.pos.length / 3); for (let i = 0; i < a.length; i++) a[i] = idOf(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]); return a; });
    const n = P.length / 3, nbr = Array.from({ length: n }, () => new Set());
    meshes.forEach((m, mi) => { const a = maps[mi]; for (let b = 0; b + 3 < a.length; b += 4) for (let e = 0; e < 4; e++) { const u = a[b + e], v = a[b + (e + 1) % 4]; nbr[u].add(v); nbr[v].add(u); } });
    let cur = Float32Array.from(P);
    for (let pass = 0; pass < o.passes; pass++) {
      const nx = new Float32Array(cur);
      for (let i = 0; i < n; i++) {
        const s = nbr[i]; if (!s.size) continue; let ax = 0, ay = 0, az = 0;
        for (const j of s) { ax += cur[j * 3]; ay += cur[j * 3 + 1]; az += cur[j * 3 + 2]; }
        nx[i * 3] += (ax / s.size - cur[i * 3]) * o.relax; nx[i * 3 + 1] += (ay / s.size - cur[i * 3 + 1]) * o.relax; nx[i * 3 + 2] += (az / s.size - cur[i * 3 + 2]) * o.relax;
      }
      cur = nx;
    }
    // soft normals from the relaxed faces
    const acc = new Float32Array(n * 3);
    meshes.forEach((m, mi) => {
      const a = maps[mi];
      for (let b = 0; b + 3 < a.length; b += 4) {
        const A = a[b] * 3, B = a[b + 1] * 3, C = a[b + 2] * 3;
        const ux = cur[B] - cur[A], uy = cur[B + 1] - cur[A + 1], uz = cur[B + 2] - cur[A + 2], vx = cur[C] - cur[A], vy = cur[C + 1] - cur[A + 1], vz = cur[C + 2] - cur[A + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        for (let e = 0; e < 4; e++) { const k = a[b + e] * 3; acc[k] += nx; acc[k + 1] += ny; acc[k + 2] += nz; }
      }
    });
    return meshes.map((m, mi) => {
      const a = maps[mi], pos = new Float32Array(m.pos.length), nor = new Float32Array(m.nor.length);
      for (let i = 0; i < a.length; i++) {
        const k = a[i] * 3; pos[i * 3] = cur[k]; pos[i * 3 + 1] = cur[k + 1]; pos[i * 3 + 2] = cur[k + 2];
        let sx = acc[k], sy = acc[k + 1], sz = acc[k + 2]; const sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
        let fx = m.nor[i * 3], fy = m.nor[i * 3 + 1], fz = m.nor[i * 3 + 2];
        fx += (sx - fx) * o.soft; fy += (sy - fy) * o.soft; fz += (sz - fz) * o.soft;
        const l = Math.hypot(fx, fy, fz) || 1; nor[i * 3] = fx / l; nor[i * 3 + 1] = fy / l; nor[i * 3 + 2] = fz / l;
      }
      return Object.assign({}, m, { pos, nor });
    });
  }
  return { smooth };
})();
if (typeof module !== 'undefined') module.exports = VoxelSmooth;
