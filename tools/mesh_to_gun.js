/* Turns a pack gun model (OBJ + MTL, CC0) into a flat "profile" the game can rebuild as voxels: for every side-view cell (y up, z along the gun,
   muzzle at z = 0 and the butt at the biggest z) a half width and a colour role. The game then extrudes each cell sideways, so tubes stay round.
   usage: node tools/mesh_to_gun.js <OBJ dir> <out.json> <Name:length[:flip]> ...        (length = how many voxels long; flip = the model's muzzle is at +x) */
const fs = require('fs'), path = require('path');
const ROLES = ['IRON', 'DARK', 'STEEL', 'PLATE', 'PLATE2', 'TRIM'];     // the numbers stored in the data: index into this list

function readMtl(file) {
  const m = {}; let cur = null;
  if (!fs.existsSync(file)) return m;
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    const w = l.trim().split(/\s+/);
    if (w[0] === 'newmtl') cur = w[1]; else if (w[0] === 'Kd' && cur) m[cur] = w.slice(1, 4).map(Number);
  }
  return m;
}
// the colour role of a material: wood takes the plate colour (so skins paint it), dark metal is iron, black is dark, light metal is steel
function roleOf(name, kd) {
  const [r, g, b] = kd || [0.05, 0.05, 0.05], lum = (r + g + b) / 3;
  if (/wood/i.test(name) || r > b * 1.4) return 4;
  if (/glass|lens/i.test(name)) return 1;
  if (lum < 0.016) return 1;
  if (lum < 0.045) return 0;
  return 2;
}
function readObj(file) {
  const mats = readMtl(file.replace(/\.obj$/i, '.mtl')), V = [], tris = []; let mat = '';
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    const w = l.trim().split(/\s+/);
    if (w[0] === 'v') V.push([+w[1], +w[2], +w[3]]);
    else if (w[0] === 'usemtl') mat = w[1];
    else if (w[0] === 'f') { const ix = w.slice(1).map((s) => { const i = parseInt(s, 10); return i < 0 ? V.length + i : i - 1; }); for (let i = 1; i + 1 < ix.length; i++) tris.push({ p: [V[ix[0]], V[ix[i]], V[ix[i + 1]]], role: roleOf(mat, mats[mat]) }); }
  }
  return tris;
}
function convert(file, len, flip) {
  const tris = readObj(file);
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const t of tris) for (const p of t.p) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
  const s = len / (mx[0] - mn[0]), cw = (mn[2] + mx[2]) / 2;
  // model x (long) -> game z (muzzle at 0), model y -> y (bottom at 0), model z -> x (centred)
  const tf = (p) => [(p[2] - cw) * s, (p[1] - mn[1]) * s, flip ? (p[0] - mn[0]) * s : (mx[0] - p[0]) * s];
  const cells = new Map();
  for (const t of tris) {
    const P = t.p.map(tf); let e = 0;
    for (let i = 0; i < 3; i++) { const a = P[i], b = P[(i + 1) % 3]; e = Math.max(e, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])); }
    const n = Math.max(1, Math.ceil(e / 0.3));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const u = i / n, v = j / n, w = 1 - u - v, x = P[0][0] * w + P[1][0] * u + P[2][0] * v, y = P[0][1] * w + P[1][1] * u + P[2][1] * v, z = P[0][2] * w + P[1][2] * u + P[2][2] * v;
      const k = Math.floor(y) + ',' + Math.floor(z); let c = cells.get(k);
      if (!c) { c = { y: Math.floor(y), z: Math.floor(z), ax: 0, role: t.role }; cells.set(k, c); }
      if (Math.abs(x) >= c.ax) { c.ax = Math.abs(x); c.role = t.role; }
    }
  }
  return [...cells.values()].map((c) => ({ y: c.y, z: c.z, hw: Math.max(1, Math.round(c.ax)), role: c.role }));
}
// run-length per row: [y, z0, runLength, hw, role] flattened
function pack(cells) {
  const rows = new Map(); for (const c of cells) { if (!rows.has(c.y)) rows.set(c.y, []); rows.get(c.y).push(c); }
  const out = [];
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const r = rows.get(y).sort((a, b) => a.z - b.z); let i = 0;
    while (i < r.length) { let j = i; while (j + 1 < r.length && r[j + 1].z === r[j].z + 1 && r[j + 1].hw === r[i].hw && r[j + 1].role === r[i].role) j++; out.push(y, r[i].z, j - i + 1, r[i].hw, r[i].role); i = j + 1; }
  }
  return out;
}
if (require.main === module) {
  const [dir, outFile, ...specs] = process.argv.slice(2), data = {};
  for (const sp of specs) { const [name, len, flip] = sp.split(':'); data[name] = pack(convert(path.join(dir, name + '.obj'), +len, flip === 'flip')); }
  fs.writeFileSync(outFile, JSON.stringify(data));
}
module.exports = { convert, pack, ROLES };
