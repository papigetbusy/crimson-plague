// New VR ADS module: the sight line blends onto the right eye, the fire ray stays on
// the sights and is zeroed at 25 m, and ?oldads is the only way back to the old path.
const XrAds = require('../src/screen/xr_ads.js');
let fails = 0;
const t = (name, ok, seen) => { if (!ok) fails++; if (!ok || process.env.V) console.log((ok ? 'ok   ' : 'FAIL ') + name + (seen !== undefined ? '  (' + seen + ')' : '')); };

t('The table has a number for every gun type, and the M4 is closer than a rifle (eye on the optic)',
  ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'hmg'].every((k) => XrAds.of(k).relief > 0) &&
  XrAds.of('rifle', 'rifle_m4').relief === 0.08 && XrAds.of('rifle', 'rifle_m4').relief < XrAds.of('rifle').relief &&
  XrAds.of('pistol').relief === 0.30 && XrAds.of('sniper').zoom === 4);

t('?oldads in the link selects the old ADS; the full game path does not',
  XrAds.useOld('?sandbox&oldads') && XrAds.useOld('#oldads') && !XrAds.useOld('?sandbox') && !XrAds.useOld(''));

// critically damped blend: about 135 ms to settle, no overshoot, release comes back the same way
{
  const s = XrAds.SETTLE, dt = 1 / 72;
  let x = 0, v = 0, over = false;
  for (let i = 0; i < Math.round(0.15 / dt); i++) { const r = XrAds.dampStep(x, v, 1, dt, s); x = r[0]; v = r[1]; if (x > 1.002) over = true; }
  t('A critically damped blend settles onto the eye in about 150 ms without overshoot', x > 0.95 && x <= 1.001 && !over, x.toFixed(3));
  let x2 = 0, v2 = 0;
  for (let i = 0; i < Math.round(0.08 / dt); i++) { const r = XrAds.dampStep(x2, v2, 1, dt, s); x2 = r[0]; v2 = r[1]; }
  t('At 80 ms it is on the way, not already snapped', x2 > 0.2 && x2 < 0.95, x2.toFixed(3));
  const bl = XrAds.create();
  for (let i = 0; i < 20; i++) bl.step(dt, true);
  for (let i = 0; i < Math.round(0.16 / dt); i++) bl.step(dt, false);
  t('Releasing the trigger blends back to the hand the same way (at rest in about 150 ms)', bl.value() === 0);
}

// fire ray on the sight line, zeroed at 25 m, angle at ADS is well under 0.3 deg
{
  const eye = [0.032, 1.6, 0], dir = [0, 0, -1], sight = [0.032, 1.6, -0.14], muzzle = [0.032, 1.53, -0.55];
  const fr = XrAds.fire(eye, sight, dir, muzzle, 25);
  t('When the right eye sits on the sight line, the fire ray is on that line (angle under 0.3 deg)', fr.angleDeg < 0.3, fr.angleDeg.toFixed(4) + ' deg');
  t('The 25 m zero sits on the sight line, in front of the sight',
    Math.abs(fr.zero[0] - sight[0]) < 1e-9 && Math.abs(fr.zero[1] - sight[1]) < 1e-9 && Math.abs(fr.zero[2] - (sight[2] - 25)) < 1e-9);
  // a bore from the muzzle through the same zero meets the sight line at 25 m
  const at25 = [muzzle[0] + fr.bore[0] * (25 / Math.max(1e-9, -fr.bore[2]) * (muzzle[2] < fr.zero[2] ? 0 : 1))];
  const along = XrAds.norm([fr.zero[0] - muzzle[0], fr.zero[1] - muzzle[1], fr.zero[2] - muzzle[2]]);
  t('A line from the muzzle through the 25 m point is the bore zero',
    Math.abs(along[0] - fr.bore[0]) < 1e-9 && Math.abs(along[2] - fr.bore[2]) < 1e-9);
  // M4: optic 7 cm above the bore, eye 8 cm behind the optic, still under 0.3 deg
  const m4 = XrAds.fire([0, 1.7, 0], [0, 1.7, -0.08], [0, 0, -1], [0, 1.63, -0.5], 25);
  t('The M4 (optic above the bore, eye on the optic centre) also stays under 0.3 deg', m4.angleDeg < 0.3, m4.angleDeg.toFixed(4) + ' deg');
}

// local ADS pose puts the sight at (0,0,-relief) along -Z
{
  const relief = 0.14, gs = 1.15, sight = [0, 0.2, 0.05], dir = [0, 0, -1];
  const p = XrAds.localAdsPose(sight, dir, relief, gs);
  const sx = 0 + p.px, sy = p.py + sight[1] * gs, sz = p.pz + sight[2] * gs;
  t('The ADS pose puts the sight in front of the eye at the gun\'s eye relief',
    Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9 && Math.abs(sz + relief) < 1e-9, [sx, sy, sz].map((n) => n.toFixed(4)).join(','));
  // a slightly tilted iron-sight line is rotated onto -Z
  const tilt = XrAds.norm([0, 0.02, -0.32]);
  const q = XrAds.quatFromTo(tilt, [0, 0, -1]);
  const d2 = XrAds.applyQuat(q, tilt);
  t('A rear-to-front sight line is rotated onto the eye\'s -Z', Math.abs(d2[0]) < 1e-6 && Math.abs(d2[1]) < 1e-6 && Math.abs(d2[2] + 1) < 1e-6, d2.map((n) => n.toFixed(5)).join(','));
}

if (fails) { console.log(fails + ' ADS check(s) failed'); process.exit(1); }
console.log('all ADS checks passed');
