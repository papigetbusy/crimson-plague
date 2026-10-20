// Ember Rifle checks: an original code-built gun that must fit the game exactly like the rifle does.
global.Voxel = require('../src/models/voxel.js');
const Ember = require('../src/models/ember_rifle.js');
let fails = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) fails++; };
const c = Ember.build(), a = c.anchors, V = c.vox, body = c.parts.body.grid;
const faces = (g) => Voxel.mesh(g, 'solid', V, [0, 0, 0]).faces + Voxel.mesh(g, 'glow', V, [0, 0, 0]).faces;

t('The Ember Rifle has a body, a magazine and a charging handle, like the rifle', !!(c.parts.body && c.parts.mag && c.parts.bolt));
t('Its red dot sits on the centre line, at the same spot as the rifle red dot', a.sightDot[0] === 0 && Math.abs(a.sightDot[1] - 0.1755) < 0.001 && Math.abs(a.sightDot[2] + 0.026) < 0.001);
t('Its muzzle is on the centre line and in front of everything else', a.muzzle[0] === 0 && a.muzzle[2] < a.handFore[2] && a.muzzle[2] < a.sightDot[2]);
t('Its hands sit on the grip, the handguard and the magazine, in that order from back to front', a.handGrip[2] > a.handMag[2] && a.handMag[2] > a.handFore[2]);
{
  const y0 = Math.round(a.dotWindow.y0 / V), y1 = Math.round(a.dotWindow.y1 / V), zd = Math.floor(a.sightDot[2] / V);
  let blocked = 0;
  for (let z = zd - 60; z < zd + 40; z++) for (let y = y0 + 1; y < y1; y++) for (let x = -2; x < 2; x++) if (body.has(x, y, z)) blocked++;
  t('Nothing solid blocks the line of sight through the red dot window, in front or behind', blocked === 0);
}
t('It has glowing cells for the vents, seams and brake', body.glow.size > 150);
t('It is under 40,000 faces, so it is light on a phone', faces(body) + faces(c.parts.mag.grid) + faces(c.parts.bolt.grid) < 40000);
{ let mz = 0; for (const v of body.solid.values()) mz = Math.min(mz, v.z); t('It is about as long as the rifle (the nose is within 15 voxels of the muzzle anchor)', Math.abs(mz * V - a.muzzle[2]) < 15 * V); }
{ // the side silhouette matches the original rifle's, so the gun never gets gaps (a missing trigger area, a floating magazine) or odd bulges
  global.GothicRifleSheet = require('../src/models/gothic_rifle_data.js');
  const side = (m) => { const out = new Set(), put = (g, pv, off) => { for (const map of [g.solid, g.glow]) for (const v of map.values()) { const y = Math.round((v.y - pv[1]) * m.vox / 0.0065 + off[1] / 0.0065); if (y <= 22) out.add(Math.round((v.z - pv[2]) * m.vox / 0.0065 + off[2] / 0.0065) + ',' + y); } };
    put(m.parts.body.grid, [0, 0, 0], [0, 0, 0]); put(m.parts.mag.grid, m.parts.mag.pivot, m.anchors.magPivot); put(m.parts.bolt.grid, m.parts.bolt.pivot, m.anchors.boltRest); return out; };
  const A = side(require('../src/models/gothic_rifle.js').build()), B = side(c); let both = 0; for (const k of A) if (B.has(k)) both++;
  t('Its side silhouette overlaps the original rifle by at least 92% (nothing missing, nothing sticking out)', both / (A.size + B.size - both) >= 0.92);
  t('The trigger area is closed up: the grip and the lower receiver are one piece, no gap behind the trigger', (() => { for (let z = 10; z <= 16; z++) for (let y = -30; y < 0; y++) if (!body.has(0, y, z)) return false; return true; })());
}
console.log(fails ? fails + ' FAILED' : 'all ember checks ok'); process.exit(fails ? 1 : 0);
