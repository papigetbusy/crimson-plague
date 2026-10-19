/* Voxel toolkit. Builds chunky voxel models out of boxes and ellipsoids, then turns them into
   mesh data (hidden faces removed, one colour per voxel with a little noise, so every block reads).
   Pure data: no THREE in here, so it runs in node tests and in the screen alike. */
const Voxel = (function () {
  const OFF = 512;
  const key = (x, y, z) => (x + OFF) + (y + OFF) * 1024 + (z + OFF) * 1048576;
  function hash(x, y, z, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647) + Math.imul(s, 1013904223)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];

  function Grid(seed) { this.solid = new Map(); this.glow = new Map(); this.seed = seed | 0; }
  // one voxel. kind 'solid' is lit like stone; 'glow' is unlit and always bright
  Grid.prototype.set = function (x, y, z, col, v, kind) {
    const c = rgb(col), n = (hash(x, y, z, this.seed) - 0.5) * 2 * (v === undefined ? 0.1 : v), k = key(x, y, z);
    const f = 1 + n;
    const val = { x, y, z, c: [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)] };
    if (kind === 'glow') { this.solid.delete(k); this.glow.set(k, val); } else { this.glow.delete(k); this.solid.set(k, val); }
  };
  // fills x0..x1-1, y0..y1-1, z0..z1-1
  // a voxel whose six faces can each have their own colour (fc = [+x, -x, +y, -y, +z, -z], each a hex or null)
  Grid.prototype.setFaces = function (x, y, z, fc, kind) {
    const k = key(x, y, z), val = { x, y, z, c: [0, 0, 0], fc: [] };
    let n = 0;
    for (let i = 0; i < 6; i++) {
      if (fc[i] === null || fc[i] === undefined) { val.fc.push(null); continue; }
      const c = rgb(fc[i]), f = 1 + (hash(x, y, z, this.seed + i) - 0.5) * 0.08;
      const col = [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)];
      val.fc.push(col); val.c[0] += col[0]; val.c[1] += col[1]; val.c[2] += col[2]; n++;
    }
    if (n) { val.c = val.c.map((v) => v / n); }
    if (kind === 'glow') { this.solid.delete(k); this.glow.set(k, val); } else { this.glow.delete(k); this.solid.set(k, val); }
  };
  Grid.prototype.box = function (x0, y0, z0, x1, y1, z1, col, v, kind) {
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) this.set(x, y, z, col, v, kind);
    return this;
  };
  // same box, and its mirror image across x = 0 (the model is left/right symmetric)
  Grid.prototype.mbox = function (x0, y0, z0, x1, y1, z1, col, v, kind) {
    this.box(x0, y0, z0, x1, y1, z1, col, v, kind);
    this.box(-x1, y0, z0, -x0, y1, z1, col, v, kind);
    return this;
  };
  Grid.prototype.erase = function (x0, y0, z0, x1, y1, z1) {
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) { const k = key(x, y, z); this.solid.delete(k); this.glow.delete(k); }
    return this;
  };
  // ellipsoid centred at (cx,cy,cz) with radii rx,ry,rz (voxel units)
  Grid.prototype.ell = function (cx, cy, cz, rx, ry, rz, col, v, kind) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1) this.set(x, y, z, col, v, kind);
        }
    return this;
  };
  // ellipsoid and its mirror (cx is the distance from the centre line)
  Grid.prototype.mell = function (cx, cy, cz, rx, ry, rz, col, v, kind) {
    this.ell(cx, cy, cz, rx, ry, rz, col, v, kind);
    this.ell(-cx, cy, cz, rx, ry, rz, col, v, kind);
    return this;
  };
  Grid.prototype.count = function () { return this.solid.size + this.glow.size; };
  Grid.prototype.has = function (x, y, z) { const k = key(x, y, z); return this.solid.has(k) || this.glow.has(k); };

  // face table: outward direction, then two edge axes u, v with u x v = direction
  const FACES = [
    { d: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], shade: 0.84 },
    { d: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.84 },
    { d: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0], shade: 1.0 },
    { d: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.66 },
    { d: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.9 },
    { d: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0], shade: 0.92 },
  ];
  // turns one kind ('solid' or 'glow') of a grid into mesh arrays. vox = world size of one voxel,
  // pivot = voxel coordinate that becomes the model's (0,0,0)
  function mesh(grid, kind, vox, pivot) {
    const map = kind === 'glow' ? grid.glow : grid.solid;
    const pos = [], nor = [], col = [], idx = [];
    const p = pivot || [0, 0, 0];
    for (const t of map.values()) {
      for (const f of FACES) {
        if (grid.has(t.x + f.d[0], t.y + f.d[1], t.z + f.d[2])) continue;
        const o = [t.x + (f.d[0] > 0 ? 1 : 0), t.y + (f.d[1] > 0 ? 1 : 0), t.z + (f.d[2] > 0 ? 1 : 0)];
        const base = pos.length / 3, sh = kind === 'glow' ? 1 : f.shade;
        for (let i = 0; i < 4; i++) {
          const a = i === 1 || i === 2 ? 1 : 0, b = i >= 2 ? 1 : 0;
          pos.push((o[0] + f.u[0] * a + f.v[0] * b - p[0]) * vox, (o[1] + f.u[1] * a + f.v[1] * b - p[1]) * vox, (o[2] + f.u[2] * a + f.v[2] * b - p[2]) * vox);
          nor.push(f.d[0], f.d[1], f.d[2]);
          const fcol = t.fc && t.fc[FACES.indexOf(f)] ? t.fc[FACES.indexOf(f)] : t.c;
          col.push(fcol[0] * sh, fcol[1] * sh, fcol[2] * sh);
        }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), col: new Float32Array(col), idx: idx.length > 65000 ? new Uint32Array(idx) : new Uint16Array(idx), faces: idx.length / 6 };
  }
  // THREE geometry from mesh arrays (the screen calls this; THREE is passed in)
  function toGeometry(THREE, m) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(m.nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(m.col, 3));
    g.setIndex(new THREE.BufferAttribute(m.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
  return { Grid, mesh, toGeometry, hash };
})();
if (typeof module !== 'undefined') module.exports = Voxel;
