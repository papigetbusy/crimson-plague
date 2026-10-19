// Dumps a model's mesh data as JSON so tools/preview_models.py can draw it (no GPU, no THREE needed).
// usage: node tools/preview_models.js rifle|fiend out.json
const fs = require('fs'), path = require('path');
global.Voxel = require('../src/models/voxel.js');
const which = process.argv[2], out = process.argv[3];
const dump = (grid, pivot, vox, off) => {
  const r = [];
  for (const kind of ['solid', 'glow']) { const m = Voxel.mesh(grid, kind, vox, pivot); r.push({ kind, pos: Array.from(m.pos), col: Array.from(m.col), idx: Array.from(m.idx) }); }
  return { meshes: r, off: off || [0, 0, 0] };
};
let parts = [];
if (which === 'rifle') {
  const m = require('../src/models/gothic_rifle.js').build();
  parts.push(dump(m.parts.body.grid, m.parts.body.pivot, m.vox));
  const mp = m.anchors.magPivot;
  parts.push(dump(m.parts.mag.grid, m.parts.mag.pivot, m.vox, mp));
  parts.push(dump(m.parts.bolt.grid, m.parts.bolt.pivot, m.vox, m.anchors.boltRest));
} else if (which === 'fiend') {
  const m = require('../src/models/horned_fiend.js').build();
  for (const p of m.pose) parts.push(dump(p.grid, p.pivot, m.vox, p.off));
}
fs.writeFileSync(out, JSON.stringify(parts));
