// Revolver checks: Grok's black and neon-green revolver must keep the picture's shape and fit the game like the rifle does.
global.Voxel = require('../src/models/voxel.js');
const Sheet = require('../src/models/revolver_data.js'), Rev = require('../src/models/revolver.js');
let fails = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) fails++; };
const r = Rev.build(), a = r.anchors, V = r.vox, body = r.parts.body.grid, bolt = r.parts.bolt.grid;
const faces = (g) => Voxel.mesh(g, 'solid', V, [0, 0, 0]).faces + Voxel.mesh(g, 'glow', V, [0, 0, 0]).faces;
const hasAny = (z, y) => { for (let x = -6; x < 6; x++) if (body.has(x, y, z) || bolt.has(x, y, z)) return true; return false; };

t('The revolver has a body, a hammer (in the charging handle slot) and a magazine slot, like the rifle', !!(r.parts.body && r.parts.mag && r.parts.bolt));
t('Its red dot sits on the centre line, above the top strap', a.sightDot[0] === 0 && a.sightDot[1] > 0.07);
t('Its muzzle is on the centre line at the front tip of the barrel', a.muzzle[0] === 0 && a.muzzle[2] === Sheet.zMin * Rev.VOX);
t('Its hands sit on the grip, which is behind the cylinder and below it', a.handGrip[2] > 0 && a.handGrip[1] < 0);
{
  const y0 = Math.round(a.dotWindow.y0 / V), y1 = Math.round(a.dotWindow.y1 / V), zd = Math.round(a.sightDot[2] / V);
  let blocked = 0; for (let z = zd - 60; z < zd + 40; z++) for (let y = y0 + 1; y < y1; y++) for (let x = -2; x < 2; x++) if (body.has(x, y, z) || bolt.has(x, y, z)) blocked++;
  t('Nothing solid blocks the line of sight through the red dot window, in front or behind', blocked === 0);
}
{ // the side silhouette is the picture's: every filled cell of the sheet is solid in the gun, and nothing else is
  let miss = 0, extra = 0, total = 0;
  Sheet.rows.forEach((row, ri) => { for (let c = 0; c < row.length; c++) { const z = Sheet.zMin + c, y = Sheet.yMax - ri, full = row[c] !== '.', has = hasAny(z, y); if (full) total++; if (full && !has) miss++; if (!full && has) extra++; } });
  t('The side silhouette matches the picture: no missing cells and nothing sticking out', miss === 0 && extra === 0 && total > 900);
}
t('The trigger guard is open: there is air inside it, the way the picture shows', (() => { let air = 0; for (let z = -12; z <= -4; z++) for (let y = -14; y <= -9; y++) if (!hasAny(z, y)) air++; return air >= 10; })());
t('The grip is one piece with the frame, with no gap behind the trigger', (() => { for (let z = 14; z <= 18; z++) for (let y = -26; y <= -2; y++) if (!hasAny(z, y)) return false; return true; })());
t('It has green glow cells on the cylinder and at the muzzle', body.glow.size > 20 && (() => { let nearMuzzle = 0, cyl = 0; for (const v of body.glow.values()) { if (v.z <= Sheet.zMin + 3) nearMuzzle++; if (v.z > -8 && v.z < 9) cyl++; } return nearMuzzle > 0 && cyl > 0; })());
t('It is light on a phone: under 15,000 faces', faces(body) + faces(bolt) < 15000);
t('It is about a third the length of the rifle', (Sheet.rows[0].length * Rev.VOX) > 0.4 && (Sheet.rows[0].length * Rev.VOX) < 0.6);
console.log(fails ? fails + ' FAILED' : 'all revolver checks ok'); process.exit(fails ? 1 : 0);
