// Model checks: things the game relies on, in plain sentences. Run: node tests/models.test.js
global.Voxel = require('../src/models/voxel.js');
const Rifle = require('../src/models/gothic_rifle.js'), Fiend = require('../src/models/horned_fiend.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const faces = (g) => Voxel.mesh(g, 'solid', 1).faces + Voxel.mesh(g, 'glow', 1).faces;

const r = Rifle.build(), a = r.anchors;
t('The red dot sits exactly on the centre line of the gun', a.sightDot[0] === 0);
t('The muzzle is at the very front of the gun, on the centre line', a.muzzle[0] === 0 && a.muzzle[2] < -0.7);
t('The magazine is its own part, so it can slide out and in', r.parts.mag.grid.count() > 100);
t('The charging handle is its own part, so it can slide back', r.parts.bolt.grid.count() > 10);
{ // nothing solid sits in the sight window between the dot and the camera, so the view stays clear
  const g = r.parts.body.grid, V = r.vox, y0 = Math.round(a.dotWindow.y0 / V), y1 = Math.round(a.dotWindow.y1 / V), zd = Math.floor(a.sightDot[2] / V);
  let blocked = 0;
  for (let z = zd; z < zd + 40; z++) for (let y = y0 + 1; y < y1; y++) for (let x = -2; x < 2; x++) if (g.has(x, y, z)) blocked++;
  t('Nothing solid blocks the line of sight from behind the red dot', blocked === 0);
}
t('The rifle stays light enough for a phone (under 12,000 faces)', faces(r.parts.body.grid) + faces(r.parts.mag.grid) + faces(r.parts.bolt.grid) < 12000);

const f = Fiend.build(); let ff = 0; for (const k in f.grids) ff += faces(f.grids[k]) * (['leg', 'arm', 'fore'].includes(k) ? 2 : 1);   // legs and arms are used twice
t('The fiend stands about 3.5 world units tall before the game scales it', (() => { let top = -1e9; for (const p of f.pose) for (const v of [...p.grid.solid.values()]) top = Math.max(top, (v.y + 1) * f.vox + p.off[1]); return top > 3.3 && top < 4.1; })());
t('One fiend is light enough that a dozen can be on screen (under 12,000 faces)', ff < 12000);
console.log('     (one fiend = ' + ff + ' faces)');
t('The fiend has glowing eyes', [...f.grids.head.glow.values()].length > 4);
process.exit(bad ? 1 : 0);
