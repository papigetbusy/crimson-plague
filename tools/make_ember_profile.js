// Reads the original gothic rifle and writes src/models/ember_profile.js: for every z the solid stretches of the body and the magazine (side view),
// so the Ember Rifle keeps the original silhouette. Everything above the sight rail (y 22) is left out: the new gun has its own thin sight.
// usage: node tools/make_ember_profile.js
global.Voxel = require('../src/models/voxel.js'); global.GothicRifleSheet = require('../src/models/gothic_rifle_data.js');
const R = require('../src/models/gothic_rifle.js').build(), V = R.vox, A = R.anchors;
const stretches = (grid, off, pivot) => {
  const cols = new Map();
  for (const map of [grid.solid, grid.glow]) for (const v of map.values()) {
    const z = Math.round((v.z - pivot[2]) * V / 0.0065 + off[2] / 0.0065), y = Math.round((v.y - pivot[1]) * V / 0.0065 + off[1] / 0.0065);
    if (y > 22) continue;
    if (!cols.has(z)) cols.set(z, new Set()); cols.get(z).add(y);
  }
  const out = {};
  for (const [z, ys] of cols) {
    const a = [...ys].sort((p, q) => p - q), runs = []; let s = a[0], p = a[0];
    for (let i = 1; i <= a.length; i++) { if (a[i] === p + 1) { p = a[i]; continue; } runs.push([s, p + 1]); s = a[i]; p = a[i]; }
    out[z] = runs;
  }
  return out;
};
const body = stretches(R.parts.body.grid, [0, 0, 0], [0, 0, 0]), mag = stretches(R.parts.mag.grid, A.magPivot, R.parts.mag.pivot);
const fmt = (o) => '{' + Object.keys(o).map(Number).sort((a, b) => a - b).map((z) => '"' + z + '":' + JSON.stringify(o[z])).join(',') + '}';
require('fs').writeFileSync(__dirname + '/../src/models/ember_profile.js', '/* The original rifle\'s side silhouette, z -> list of [y0,y1) stretches (0.0065 units), made by tools/make_ember_profile.js. Data only. */\nconst EmberProfile = { body: ' + fmt(body) + ',\n  mag: ' + fmt(mag) + ' };\nif (typeof module !== \'undefined\') module.exports = EmberProfile;\n');
