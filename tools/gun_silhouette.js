// Side-view silhouette of the original rifle (grey) and a second gun (colour) on one picture, so a new gun can be checked against the original's shape.
// usage: node tools/gun_silhouette.js ember out.json   then   python3 tools/gun_silhouette.py out.json out.png
global.Voxel = require('../src/models/voxel.js'); global.GothicRifleSheet = require('../src/models/gothic_rifle_data.js');
const mods = { ember: '../src/models/ember_rifle.js' };
const cells = (m) => {
  const out = new Set(), V = m.vox, put = (g, pivot, off) => { for (const map of [g.solid, g.glow]) for (const v of map.values()) out.add(Math.round((v.z - pivot[2]) * V / 0.0065 + off[2] / 0.0065) + ',' + Math.round((v.y - pivot[1]) * V / 0.0065 + off[1] / 0.0065)); };
  put(m.parts.body.grid, [0, 0, 0], [0, 0, 0]); put(m.parts.mag.grid, m.parts.mag.pivot, m.anchors.magPivot); put(m.parts.bolt.grid, m.parts.bolt.pivot, m.anchors.boltRest);
  return [...out].map((s) => s.split(',').map(Number));
};
const a = cells(require('../src/models/gothic_rifle.js').build()), b = cells(require(mods[process.argv[2]]).build());
require('fs').writeFileSync(process.argv[3], JSON.stringify({ a, b }));
