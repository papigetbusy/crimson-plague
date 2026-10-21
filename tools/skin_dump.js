// Dumps the boxes of every player skin to a JSON file so tools/skin_sheet.py can draw them with no GPU.
// usage: node tools/skin_dump.js out.json [gun_id]
let boxes = [], cur = '';
class Geo { constructor(w, h, d) { this.d = [w, h, d]; } }
class Mat { constructor(o, glow) { this.c = (o && o.color !== undefined) ? o.color : 0x888888; this.glow = !!glow; } }
class Lam extends Mat { constructor(o) { super(o, false); } }
class Bas extends Mat { constructor(o) { super(o, true); } }
class Mesh { constructor(g, m) { this.g = g; this.m = m; this.position = { x: 0, y: 0, z: 0, set: (x, y, z) => { this.position.x = x; this.position.y = y; this.position.z = z; } }; } }
class Group { constructor() { this.children = []; } add(o) { this.children.push(o); if (o instanceof Mesh) boxes.push({ d: o.g.d, p: [o.position.x, o.position.y, o.position.z], c: o.m.c, glow: o.m.glow, k: cur }); } }
const THREE = { BoxGeometry: Geo, MeshLambertMaterial: Lam, MeshBasicMaterial: Bas, Mesh, Group };
const S = require('../src/screen/skins_look.js'), look = S.create(THREE), out = {};
// the real gun a friend holds (the same model and the same placement as src/screen/friend_gun.js), every voxel drawn as a little box
global.Voxel = require('../src/models/voxel.js'); global.GunKit = require('../src/models/gun_kit.js');
const GunCatalog = require('../src/models/gun_catalog.js'), FG = require('../src/screen/friend_gun.js'), gunId = process.argv[3] || 'smg_tactical';
function gunBoxes(id, into) {
  const G = GunCatalog.build(id), A = G.anchors, H = G.hands || { grip: A.handGrip || [0, -0.15, 0.15] }, grip = H.grip, sc = FG.SCALE;
  const o = [FG.HAND[0] - grip[0] * sc, FG.HAND[1] - grip[1] * sc, FG.HAND[2] - grip[2] * sc];
  for (const [part, off] of [[G.parts.body, [0, 0, 0]], [G.parts.bolt, A.boltRest], [G.parts.mag, A.magPivot]]) for (const kind of ['solid', 'glow']) for (const v of (kind === 'glow' ? part.grid.glow : part.grid.solid).values()) {
    const col = (Math.min(255, v.c[0] * 255) << 16) | (Math.min(255, v.c[1] * 255) << 8) | Math.min(255, v.c[2] * 255), vx = G.vox * sc;
    into.push({ d: [vx, vx, vx], p: [o[0] + ((v.x + 0.5 - part.pivot[0]) * G.vox + off[0]) * sc, o[1] + ((v.y + 0.5 - part.pivot[1]) * G.vox + off[1]) * sc, o[2] + ((v.z + 0.5 - part.pivot[2]) * G.vox + off[2]) * sc], c: col, glow: kind === 'glow', k: id });
  }
}
for (const id of S.IDS) { boxes = []; cur = id; look.build(id, new Group(), 0); gunBoxes(gunId, boxes); out[id] = boxes; }
require('fs').writeFileSync(process.argv[2], JSON.stringify({ names: S.LIST, boxes: out }));
console.log(S.IDS.map((id) => id + ':' + out[id].length).join(' '));
