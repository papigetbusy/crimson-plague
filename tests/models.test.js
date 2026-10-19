// Model checks: things the game relies on, in plain sentences. Run: node tests/models.test.js
global.Voxel = require('../src/models/voxel.js'); global.GothicRifleSheet = require('../src/models/gothic_rifle_data.js'); global.HornedFiendSheet = require('../src/models/horned_fiend_data.js');
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
t('The rifle stays light enough for a phone (under 40,000 faces; it is the only one on screen)', faces(r.parts.body.grid) + faces(r.parts.mag.grid) + faces(r.parts.bolt.grid) < 40000);

const f = Fiend.build(); let ff = 0; for (const k in f.grids) ff += faces(f.grids[k]);
t('The fiend stands about 3.4 world units tall before the game scales it', (() => { let top = -1e9; for (const k in f.grids) for (const v of f.grids[k].solid.values()) top = Math.max(top, (v.y + 1) * f.vox); return top > 3.3 && top < 3.6; })());
t('One fiend stays light enough for six on screen (under 30,000 faces)', ff < 30000);
console.log('     (one fiend = ' + ff + ' faces)');
t('The fiend has glowing eyes', [...f.grids.head.glow.values()].length > 0);
t('The fiend is cut into body, two legs, torso, head, two upper arms and two forearms', Object.keys(f.grids).length === 9 && Object.values(f.grids).every((g) => g.count() > 100));

// ---- bestiary: monsters and bosses drawn after the Crusader Tactics sprites ----
global.BestiaryKit = require('../src/models/bestiary_kit.js');
const tallest = (m) => { let top = -1e9; for (const k in m.grids) for (const v of m.grids[k].solid.values()) top = Math.max(top, (v.y + 1) * m.vox); return top; };
const total = (m) => Object.values(m.grids).reduce((n, g) => n + faces(g), 0);
const hound = require('../src/models/bone_hound.js').build(), golem = require('../src/models/rock_golem.js').build(), demon = require('../src/models/demon_lord.js').build();
t('The bone hound is a low dog: about 1.6 world units tall, with four legs, a head and a moving jaw', tallest(hound) > 1.3 && tallest(hound) < 1.9 && ['legFR', 'legFL', 'legBR', 'legBL', 'head', 'jaw'].every((n) => hound.grids[n].count() > 20));
t('The rock golem stands about 3 world units tall and has the fiend\'s nine parts', tallest(golem) > 2.8 && tallest(golem) < 3.6 && Object.keys(golem.grids).length === 9);
t('The demon lord boss is taller than the fiend and has two wings', tallest(demon) > 3.8 && demon.grids.wingR.count() > 300 && demon.grids.wingL.count() > 300);
t('The golem has glowing ember cracks and the demon lord has glowing eyes', golem.grids.torso.glow.size > 10 && demon.grids.head.glow.size > 0);
t('The hound has glowing eyes', hound.grids.head.glow.size > 0);
t('Each new monster is under 30,000 faces so six on screen stays light', total(hound) < 30000 && total(golem) < 30000 && total(demon) < 30000);
console.log('     (hound ' + total(hound) + ', golem ' + total(golem) + ', demon lord ' + total(demon) + ' faces)');
process.exit(bad ? 1 : 0);
