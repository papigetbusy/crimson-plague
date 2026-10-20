// Dumps a model's mesh data as JSON so tools/preview_models.py can draw it (no GPU, no THREE needed).
// usage: node tools/preview_models.js rifle|fiend|hound|golem|demon out.json [smooth [skin]]
const fs = require('fs'), path = require('path');
global.Voxel = require('../src/models/voxel.js'); const VS = require('../src/models/voxel_smooth.js'); const SMOOTH = process.argv[4] === 'smooth'; const SKIN = (process.argv[5] || String(process.argv[2]).startsWith('gun:')) ? require('../src/screen/gun_skins.js') : null; global.BestiaryKit = require('../src/models/bestiary_kit.js'); global.DemonLord = require('../src/models/demon_lord.js'); global.DemonLordSheet = require('../src/models/demon_lord_data.js'); global.GothicRifleSheet = require('../src/models/gothic_rifle_data.js'); global.RevolverSheet = require('../src/models/revolver_data.js'); global.HornedFiendSheet = require('../src/models/horned_fiend_data.js');
const which = process.argv[2], out = process.argv[3];
const dump = (grid, pivot, vox, off, so) => {
  const r = [], kinds = ['solid', 'glow'];
  let ms = kinds.map((kind) => Voxel.mesh(grid, kind, vox, pivot));
  if (SMOOTH) ms = VS.smooth(ms, vox, so);
  kinds.forEach((kind, i) => { const m = ms[i]; const col = SKIN ? SKIN.recolor(m.col, kind, SKIN.byId(process.argv[5] || process.env.GUN_SKIN || 'crimson')) : m.col; r.push({ kind, pos: Array.from(m.pos), nor: Array.from(m.nor), col: Array.from(col), idx: Array.from(m.idx) }); });
  return { meshes: r, off: off || [0, 0, 0] };
};
let parts = [];
if (which.startsWith('gun:')) {      // any gun in the catalog, with the two gloves drawn as simple blocks where the hands hold it
  global.GunKit = require('../src/models/gun_kit.js'); const m = require('../src/models/gun_catalog.js').build(which.slice(4)); process.env.GUN_SKIN = process.env.GUN_SKIN || m.skin;
  parts.push(dump(m.parts.body.grid, m.parts.body.pivot, m.vox));
  parts.push(dump(m.parts.mag.grid, m.parts.mag.pivot, m.vox, m.anchors.magPivot));
  parts.push(dump(m.parts.bolt.grid, m.parts.bolt.pivot, m.vox, m.anchors.boltRest));
  if (process.env.HANDS !== '0') for (const [p, sz] of [[m.hands.grip, [20, 24, 12]], [m.hands.fore, [22, 12, 22]]]) { const h = new Voxel.Grid(77); h.box(-sz[0] / 2 | 0, -sz[1] / 2 | 0, -sz[2] / 2 | 0, sz[0] / 2 | 0, sz[1] / 2 | 0, sz[2] / 2 | 0, 0x7a5a3a, 0.05); parts.push(dump(h, [0, 0, 0], m.vox, p)); }
} else if (which === 'rifle' || which === 'ember' || which === 'revolver') {
  const m = require(which === 'ember' ? '../src/models/ember_rifle.js' : which === 'revolver' ? '../src/models/revolver.js' : '../src/models/gothic_rifle.js').build(+process.env.SCALE || 1);
  parts.push(dump(m.parts.body.grid, m.parts.body.pivot, m.vox, undefined, m.parts.body.scale > 1 ? { passes: 2 * m.parts.body.scale } : undefined));
  const mp = m.anchors.magPivot;
  parts.push(dump(m.parts.mag.grid, m.parts.mag.pivot, m.vox, mp, m.parts.mag.scale > 1 ? { passes: 2 * m.parts.mag.scale } : undefined));
  parts.push(dump(m.parts.bolt.grid, m.parts.bolt.pivot, m.vox, m.anchors.boltRest, m.parts.bolt.scale > 1 ? { passes: 2 * m.parts.bolt.scale } : undefined));
} else if (which === 'hound' || which === 'hound2' || which === 'demon2' || which === 'golem' || which === 'demon') {
  const m = require({ hound: '../src/models/bone_hound.js', hound2: '../src/models/bone_hound_v2.js', demon2: '../src/models/demon_lord_v2.js', golem: '../src/models/rock_golem.js', demon: '../src/models/demon_lord.js' }[which]).build();
  for (const p of m.pose) parts.push(dump(p.grid, p.pivot, p.vox || m.vox, p.off));
} else if (['goblin', 'skeleton', 'mushroom', 'eyeball', 'flame_spirit'].includes(which)) {
  const m = require('../src/models/' + which + '.js').build();
  for (const p of m.pose) parts.push(dump(p.grid, p.pivot, p.vox || m.vox, p.off, m.smooth ? { relax: 0.6, passes: 5, soft: 0.9 } : undefined));
} else if (which === 'fiend' || which === 'fiend2') {
  const m = require(which === 'fiend2' ? '../src/models/horned_fiend_v2.js' : '../src/models/horned_fiend.js').build();
  for (const p of m.pose) parts.push(dump(p.grid, p.pivot, p.vox || m.vox, p.off));
}
fs.writeFileSync(out, JSON.stringify(parts));
