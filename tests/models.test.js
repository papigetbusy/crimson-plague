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
const tallest = (m) => { let top = -1e9; for (const k in m.grids) for (const v of m.grids[k].solid.values()) top = Math.max(top, (v.y + 1) * m.vox / ((m.fine && m.fine[k]) || 1)); return top; };
const total = (m) => Object.values(m.grids).reduce((n, g) => n + faces(g), 0);
const hound = require('../src/models/bone_hound.js').build(), golem = require('../src/models/rock_golem.js').build(), demon = require('../src/models/demon_lord.js').build();
t('The bone hound is a low dog: about 1.6 world units tall, with four legs, a head and a moving jaw', tallest(hound) > 1.3 && tallest(hound) < 1.9 && ['legFR', 'legFL', 'legBR', 'legBL', 'head', 'jaw'].every((n) => hound.grids[n].count() > 20));
t('The rock golem stands about 3 world units tall and has the fiend\'s nine parts', tallest(golem) > 2.8 && tallest(golem) < 3.6 && Object.keys(golem.grids).length === 9);
t('The demon lord boss is taller than the fiend and has two wings', tallest(demon) > 3.8 && demon.grids.wingR.count() > 300 && demon.grids.wingL.count() > 300);
t('The golem has glowing ember cracks and the demon lord has glowing eyes', golem.grids.torso.glow.size > 10 && demon.grids.head.glow.size > 0);
t('The hound has glowing eyes', hound.grids.head.glow.size > 0);
t('Each new monster is under 30,000 faces so six on screen stays light', total(hound) < 30000 && total(golem) < 30000 && total(demon) < 30000);
console.log('     (hound ' + total(hound) + ', golem ' + total(golem) + ', demon lord ' + total(demon) + ' faces)');
// ---- signed off 2026-10-19: the v2 hound and fiend are the ones the game uses (v1 files stay as the fallback) ----
const hound2 = require('../src/models/bone_hound_v2.js').build();
t('Bone hound v2 has the same seven parts as v1, so the rig does not change', Object.keys(hound.grids).sort().join() === Object.keys(hound2.grids).sort().join() && Object.keys(hound.joints).sort().join() === Object.keys(hound2.joints).sort().join());
t('Bone hound v2 is a low dog about the same height as v1, with glowing eyes and glowing ribs, under 25,000 faces', Math.abs(tallest(hound2) - tallest(hound)) < 0.25 && hound2.grids.head.glow.size > 0 && hound2.grids.body.glow.size > 0 && total(hound2) < 25000);
console.log('     (hound v2 ' + total(hound2) + ' faces)');
const fiend2 = require('../src/models/horned_fiend_v2.js').build(), fiend1 = Fiend.build();
t('Horned fiend v2 has the same nine parts and joints as v1, so the walk and attack animation do not change', Object.keys(fiend1.grids).sort().join() === Object.keys(fiend2.grids).sort().join() && JSON.stringify(fiend1.joints) === JSON.stringify(fiend2.joints));
t('Horned fiend v2 is no more than 0.3 taller than v1 (the horns), has glowing eyes, and stays under 60,000 faces', tallest(fiend2) - tallest(fiend1) < 0.3 && tallest(fiend2) >= tallest(fiend1) && fiend2.grids.head.glow.size > 0 && total(fiend2) < 60000);
t('Horned fiend v2 keeps its feet on the floor', Math.min(...Object.values(fiend2.grids).flatMap((g) => [...g.solid.values()].map((v) => v.y))) === 0);
console.log('     (fiend v1 ' + total(fiend1) + ', fiend v2 ' + total(fiend2) + ' faces, tallest ' + tallest(fiend1).toFixed(2) + ' -> ' + tallest(fiend2).toFixed(2) + ')');
// ---- demon lord v2 (candidate) ----
global.DemonLord = require('../src/models/demon_lord.js');
const demon2 = require('../src/models/demon_lord_v2.js').build();
t('Demon lord v2 has the same eleven parts and joints as v1, so the walk and attacks do not change', Object.keys(demon.grids).sort().join() === Object.keys(demon2.grids).sort().join() && Object.keys(demon.joints).sort().join() === Object.keys(demon2.joints).sort().join());
t('Demon lord v2 is bigger and fiercer: taller horns (no more than 0.8 taller), blazing eyes, a glowing chest sigil feet on the floor', tallest(demon2) > tallest(demon) && tallest(demon2) - tallest(demon) < 0.8 && demon2.grids.head.glow.size > demon.grids.head.glow.size && demon2.grids.torso.glow.size > demon.grids.torso.glow.size * 1.5 && Math.min(...Object.values(demon2.grids).flatMap((g) => [...g.solid.values()].map((v) => v.y))) === 0);
t('Demon lord v2 stays under 80,000 faces (one boss on screen)', total(demon2) < 80000);
console.log('     (demon lord v1 ' + total(demon) + ', v2 ' + total(demon2) + ' faces, tallest ' + tallest(demon).toFixed(2) + ' -> ' + tallest(demon2).toFixed(2) + ')');
process.exit(bad ? 1 : 0);
{ // the finer gun (upsample pass): same gun, smaller cubes
  const a1 = GothicRifle.build(1), a2 = GothicRifle.build(2);
  const world = (m) => { const g = m.parts.body.grid; let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const mp of [g.solid, g.glow]) for (const v of mp.values()) { lo = [Math.min(lo[0], v.x), Math.min(lo[1], v.y), Math.min(lo[2], v.z)]; hi = [Math.max(hi[0], v.x + 1), Math.max(hi[1], v.y + 1), Math.max(hi[2], v.z + 1)]; } return lo.concat(hi).map((n) => n * m.vox); };
  const w1 = world(a1), w2 = world(a2);
  t('The finer gun has smaller cubes', Math.abs(a2.vox * 2 - a1.vox) < 1e-9);
  t('The finer gun is the same size in the world as before', w1.every((n, i) => Math.abs(n - w2[i]) < 0.0001));
  t('The finer gun keeps every anchor (muzzle, sight dot, hands, magazine and handle) exactly where it was', JSON.stringify(a1.anchors.muzzle) === JSON.stringify(a2.anchors.muzzle) && JSON.stringify(a1.anchors.sightDot) === JSON.stringify(a2.anchors.sightDot) && JSON.stringify(a1.anchors.boltRest) === JSON.stringify(a2.anchors.boltRest) && JSON.stringify(a1.anchors.handMag) === JSON.stringify(a2.anchors.handMag));
  t('The finer gun turns the magazine and handle pivots into the smaller cubes', a2.parts.mag.pivot.every((n, i) => n === a1.parts.mag.pivot[i] * 2) && a2.parts.bolt.pivot.every((n, i) => n === a1.parts.bolt.pivot[i] * 2));
  const g = a2.parts.body.grid, V = a2.vox, y0 = Math.round(a2.anchors.dotWindow.y0 / V), y1 = Math.round(a2.anchors.dotWindow.y1 / V), zd = Math.floor(a2.anchors.sightDot[2] / V);
  let blocked = 0; for (let z = zd; z < zd + 80; z++) for (let y = y0 + 2; y < y1; y++) for (let x = -4; x < 4; x++) if (g.has(x, y, z)) blocked++;
  t('The finer gun still has a clear line of sight to the red dot', blocked === 0);
  t('The finer gun stays under 120,000 faces and keeps the buried middle out of memory', faces(a2.parts.body.grid) + faces(a2.parts.mag.grid) + faces(a2.parts.bolt.grid) < 120000 && a2.parts.body.grid.solid.size < 150000);
}
