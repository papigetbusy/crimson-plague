// Dumps a model's mesh data as JSON so tools/preview_models.py can draw it (no GPU, no THREE needed).
// usage: node tools/preview_models.js rifle|fiend|hound|golem|demon out.json [smooth [skin]]
const fs = require('fs'), path = require('path');
global.Voxel = require('../src/models/voxel.js'); const VS = require('../src/models/voxel_smooth.js'); const SMOOTH = process.argv[4] === 'smooth'; const SKIN = process.argv[5] ? require('../src/screen/gun_skins.js') : null; global.BestiaryKit = require('../src/models/bestiary_kit.js'); global.GothicRifleSheet = require('../src/models/gothic_rifle_data.js'); global.HornedFiendSheet = require('../src/models/horned_fiend_data.js');
const which = process.argv[2], out = process.argv[3];
const dump = (grid, pivot, vox, off) => {
  const r = [], kinds = ['solid', 'glow'];
  let ms = kinds.map((kind) => Voxel.mesh(grid, kind, vox, pivot));
  if (SMOOTH) ms = VS.smooth(ms, vox);
  kinds.forEach((kind, i) => { const m = ms[i]; const col = SKIN ? SKIN.recolor(m.col, kind, SKIN.byId(process.argv[5])) : m.col; r.push({ kind, pos: Array.from(m.pos), nor: Array.from(m.nor), col: Array.from(col), idx: Array.from(m.idx) }); });
  return { meshes: r, off: off || [0, 0, 0] };
};
let parts = [];
if (which === 'rifle') {
  const m = require('../src/models/gothic_rifle.js').build();
  parts.push(dump(m.parts.body.grid, m.parts.body.pivot, m.vox));
  const mp = m.anchors.magPivot;
  parts.push(dump(m.parts.mag.grid, m.parts.mag.pivot, m.vox, mp));
  parts.push(dump(m.parts.bolt.grid, m.parts.bolt.pivot, m.vox, m.anchors.boltRest));
} else if (which === 'hound' || which === 'hound2' || which === 'golem' || which === 'demon') {
  const m = require({ hound: '../src/models/bone_hound.js', hound2: '../src/models/bone_hound_v2.js', golem: '../src/models/rock_golem.js', demon: '../src/models/demon_lord.js' }[which]).build();
  for (const p of m.pose) parts.push(dump(p.grid, p.pivot, m.vox, p.off));
} else if (which === 'fiend' || which === 'fiend2') {
  const m = require(which === 'fiend2' ? '../src/models/horned_fiend_v2.js' : '../src/models/horned_fiend.js').build();
  for (const p of m.pose) parts.push(dump(p.grid, p.pivot, m.vox, p.off));
}
fs.writeFileSync(out, JSON.stringify(parts));
