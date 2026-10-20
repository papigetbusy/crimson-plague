// Gun catalog checks: all 20 guns (5 types x 4 versions) fit the game like the rifle does: sight on the centre line and clear, hands where a person would hold it, one piece, sane size.
global.Voxel = require('../src/models/voxel.js');
const Cat = require('../src/models/gun_catalog.js'), Skins = require('../src/screen/gun_skins.js');
let fails = 0;
const t = (name, ok) => { if (!ok) fails++; if (!ok || process.env.V) console.log((ok ? 'ok   ' : 'FAIL ') + name); };
const faces = (g, V) => Voxel.mesh(g, 'solid', V, [0, 0, 0]).faces + Voxel.mesh(g, 'glow', V, [0, 0, 0]).faces;
t('There are 20 guns: 4 versions each of pistol, SMG, shotgun, sniper and heavy machine gun', Cat.IDS.length === 20 && ['pistol', 'smg', 'shotgun', 'sniper', 'hmg'].every((k) => Cat.IDS.filter((i) => i.startsWith(k + '_')).length === 4));
for (const id of Cat.IDS) {
  const g = Cat.build(id), a = g.anchors, V = g.vox, body = g.parts.body.grid, bolt = g.parts.bolt.grid, n = id + ': ';
  t(n + 'has a body, a magazine and a bolt part, and a skin that exists', !!(g.parts.body && g.parts.mag && g.parts.bolt) && Skins.byId(g.skin).id === g.skin);
  t(n + 'the red dot and the muzzle sit on the centre line, the muzzle in front of the dot', a.sightDot[0] === 0 && a.muzzle[0] === 0 && a.muzzle[2] < a.sightDot[2]);
  { const y0 = Math.round(a.dotWindow.y0 / V), y1 = Math.round(a.dotWindow.y1 / V), zd = Math.round(a.sightDot[2] / V); let blocked = 0;
    for (let z = zd - 60; z < zd + 40; z++) for (let y = y0 + 1; y < y1; y++) for (let x = -2; x < 2; x++) if (body.has(x, y, z) || bolt.has(x, y, z)) blocked++;
    t(n + 'nothing solid blocks the line of sight through the red dot window', blocked === 0); }
  t(n + 'the right hand is on the grip (behind and below the sight) and the left hand is in front of it', g.hands.grip[2] > a.sightDot[2] - 0.2 && g.hands.grip[1] < a.sightDot[1] && g.hands.fore[2] < g.hands.grip[2]);
  t(n + 'its right-hand grip spot is the same for every gun, so the hands always meet the grip', Math.abs(g.hands.grip[1] - (-21 * V)) < 0.2 * 1 && Math.abs(g.hands.grip[2] - 16 * V) < 0.2);
  t(n + 'its face count stays inside the budget so phones stay smooth', faces(body, V) + faces(g.parts.mag.grid, V) + faces(bolt, V) < 30000);
}
console.log(fails ? fails + ' failed' : 'all gun catalog checks passed'); process.exit(fails ? 1 : 0);
