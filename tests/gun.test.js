// Gun look checks: the smoothed shape, skins and motion (all look-only; the referee is not involved).
global.Voxel = require('../src/models/voxel.js'); global.GothicRifleSheet = require('../src/models/gothic_rifle_data.js');
const VS = require('../src/models/voxel_smooth.js'), Skins = require('../src/screen/gun_skins.js'), Motion = require('../src/screen/gun_motion.js'), Rifle = require('../src/models/gothic_rifle.js');
let fails = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) fails++; };

// a 4x4x4 solid block with one glowing voxel on its surface
const g = new Voxel.Grid(1); g.box(0, 0, 0, 4, 4, 4, 0x808080, 0); g.set(1, 3, 1, 0xff0000, 0, 'glow');
const raw = [Voxel.mesh(g, 'solid', 1), Voxel.mesh(g, 'glow', 1)];
const sm = VS.smooth(raw, 1);
const bound = (m, ax) => { let lo = 1e9, hi = -1e9; for (let i = ax; i < m.pos.length; i += 3) { lo = Math.min(lo, m.pos[i]); hi = Math.max(hi, m.pos[i]); } return [lo, hi]; };
t('Smoothing rounds the sharp corners of a block inward', (() => { const m = sm[0]; for (let i = 0; i < m.pos.length; i += 3) if (m.pos[i] > 3.99 && m.pos[i + 1] > 3.99 && m.pos[i + 2] > 3.99) return false; return true; })());
t('Smoothing keeps the mesh the same size (same faces, same vertices)', sm[0].faces === raw[0].faces && sm[0].pos.length === raw[0].pos.length);
const flatMid = (() => { const m = sm[0]; for (let i = 0; i < m.pos.length; i += 3) if (Math.abs(m.pos[i + 1] - 4) < 1e-6 && Math.abs(m.pos[i] - 2) < 0.01 && Math.abs(m.pos[i + 2] - 2) < 0.01) return true; return false; })();
t('The middle of a flat face stays flat', flatMid);
t('The glowing voxel moves with the metal around it, so it never pokes out', (() => { const gl = sm[1]; for (let i = 0; i < gl.pos.length; i += 3) { if (gl.pos[i + 1] > 4.05) return false; } return true; })());
t('Soft normals are unit length', (() => { for (let i = 0; i < sm[0].nor.length; i += 3) if (Math.abs(Math.hypot(sm[0].nor[i], sm[0].nor[i + 1], sm[0].nor[i + 2]) - 1) > 1e-4) return false; return true; })());

// the rifle's rounded cross-section: the top row of the receiver is narrower than the middle
const r = Rifle.build(), body = r.parts.body.grid;
const widthAt = (z, y) => { let n = 0; for (let x = -40; x < 40; x++) if (body.has(x, y, z)) n++; return n; };
let best = null; for (let z = -60; z < 30; z++) { let ys = []; for (let y = -45; y < 50; y++) if (widthAt(z, y)) ys.push(y); if (ys.length > 24 && (!best || ys.length > best.ys.length)) best = { z, ys }; }
t('The rifle is rounded: the top and bottom rows are narrower than the middle', best && widthAt(best.z, best.ys[0]) < widthAt(best.z, best.ys[Math.floor(best.ys.length / 2)]));

// skins
const red = new Float32Array([0.55, 0.1, 0.13, 0.17, 0.17, 0.19, 1, 0.3, 0.08]);   // a red plate, dark metal, an orange glow cell
const frost = Skins.recolor(red, 'solid', Skins.byId('frost')), frostG = Skins.recolor(red.slice(6), 'glow', Skins.byId('frost'));
const hue = (a, i) => Skins.rgb2hsv(a[i], a[i + 1], a[i + 2])[0];
t('Every skin has a name, a hue and a glow style', Skins.SKINS.length >= 7 && Skins.SKINS.every((s) => s.id && s.name && s.mode));
t('The Crimson skin leaves the colours exactly as they are', Skins.recolor(red, 'solid', Skins.byId('crimson')).every((v, i) => v === red[i]));
t('The Frostbite skin turns the red plates blue and keeps the dark metal dark', hue(frost, 0) > 180 && hue(frost, 0) < 215 && Math.max(frost[3], frost[4], frost[5]) < 0.3);
t('The Frostbite skin turns the orange glow cyan', hue(frostG, 0) > 170 && hue(frostG, 0) < 215);
t('Each skin makes the red plates a different colour', new Set(Skins.SKINS.map((s) => Math.round(hue(Skins.recolor(red, 'solid', s), 0) / 20))).size >= 6);
t('The Prismatic glow cycles through colours over time', JSON.stringify(Skins.glowAt(Skins.byId('prism'), 0, 0).tint) !== JSON.stringify(Skins.glowAt(Skins.byId('prism'), 1.5, 0).tint));
t('A shot makes the glow brighter', Skins.glowAt(Skins.byId('frost'), 1, 1).k > Skins.glowAt(Skins.byId('frost'), 1, 0).k);
t('An unknown skin name falls back to Crimson', Skins.byId('nope').id === 'crimson');

// motion
const isZero = (o) => Object.values(o).every((v) => Math.abs(v) < 1e-9);
t('The gun finishes coming up and then adds nothing', isZero(Motion.equip(1)) && !isZero(Motion.equip(0)));
t('Coming up starts below and tilted, and ends at rest', Motion.equip(0).py < -0.2 && Motion.equip(0.99).py > -0.01);
t('Showing off the gun starts and ends at rest and turns it in between', isZero(Motion.inspect('sides', 0)) && isZero(Motion.inspect('sides', 1)) && Math.abs(Motion.inspect('sides', 0.37).ry) > 0.5);
t('The kick pushes the gun back and up, and fades to nothing', Motion.kick(1, 0, [0, 0]).pz > 0.05 && Motion.kick(1, 0, [0, 0]).rx > 0.03 && isZero(Motion.kick(0, 0, [1, 1])));
t('The kick is smaller when aiming', Motion.kick(1, 1, [0, 0]).pz < Motion.kick(1, 0, [0, 0]).pz);
t('Each shot wanders the muzzle a different way', Motion.kick(1, 0, [1, 0]).ry !== Motion.kick(1, 0, [-1, 0]).ry);
t('The bolt slides back after a shot and is home when the kick is gone', Motion.bolt(0.5, 0.04) > 0.03 && Motion.bolt(0, 0.04) === 0);
t('Idle breathing is gentle, still when sprinting, and quieter when aiming', Math.abs(Motion.idle(1, 1, 0).py) < 0.01 && isZero(Motion.idle(1, 0, 0)) && Math.abs(Motion.idle(1, 1, 1).rz) < Math.abs(Motion.idle(1, 1, 0).rz));

// inspect: both kinds stay in view (camera at the origin looking down -Z, 64 degree lens, landscape phone about 2:1)
function rot(rx, ry, rz) { const a = [[1, 0, 0], [0, Math.cos(rx), -Math.sin(rx)], [0, Math.sin(rx), Math.cos(rx)]], b = [[Math.cos(ry), 0, Math.sin(ry)], [0, 1, 0], [-Math.sin(ry), 0, Math.cos(ry)]], c = [[Math.cos(rz), -Math.sin(rz), 0], [Math.sin(rz), Math.cos(rz), 0], [0, 0, 1]];
  const mul = (x, y) => x.map((r) => [0, 1, 2].map((j) => r[0] * y[0][j] + r[1] * y[1][j] + r[2] * y[2][j])); return mul(mul(a, b), c); }
function toCam(kind, k, v) { const o = Motion.inspect(kind, k), R = rot(o.rx, 0.05 + o.ry, o.rz), P = [0.29 + o.px, -0.36 + o.py, -0.5 + o.pz]; return [0, 1, 2].map((i) => P[i] + 1.15 * (R[i][0] * v[0] + R[i][1] * v[1] + R[i][2] * v[2])); }
const inView = (c) => c[2] < -0.1 && Math.abs(c[0] / -c[2]) < 0.625 * 2 && Math.abs(c[1] / -c[2]) < 0.625;
const MUZ = [0, 0.02, r.anchors.muzzle[2]], STOCK = [0, 0, 0.46];
let allIn = true; for (let k = 0.16; k < 0.86; k += 0.02) for (const v of [MUZ, STOCK, [0, -0.2, 0]]) if (!inView(toCam('sides', k, v))) { allIn = false; console.log('  out of view at k', k.toFixed(2), toCam('sides', k, v).map((q) => q.toFixed(2)).join(',')); }
t('While you inspect both sides the whole gun stays on the screen', allIn);
t('Inspect shows the right side first (muzzle swings right) and then the left (muzzle swings left)', toCam('sides', 0.37, MUZ)[0] > toCam('sides', 0.37, STOCK)[0] && toCam('sides', 0.71, MUZ)[0] < toCam('sides', 0.71, STOCK)[0]);
t('Both inspects start and end with the gun at rest, and take a few seconds', isZero(Motion.inspect('sides', 0)) && isZero(Motion.inspect('sides', 1)) && isZero(Motion.inspect('mag', 0)) && isZero(Motion.inspect('mag', 1)) && Motion.LENGTH.sides > 2.5 && Motion.LENGTH.mag > 2.5);
const magTop = toCam('mag', 0.5, [-0.094, 0.32, 0.208]);
t('In the magazine inspect the lifted magazine is held in front of the eye, in view, with its whole length on screen', inView(magTop) && inView([magTop[0], magTop[1] - 0.19, magTop[2]]));
t('The held magazine turns to show its back and then turns home before it goes in', Motion.magSpin(0.55) > 2.5 && Math.abs(Motion.magSpin(0.2)) < 1e-9 && Math.abs(Motion.magSpin(0.8)) < 1e-9);
t('The Infernal skin is all red with ember sparks', Skins.byId('infernal').embers === true && hue(Skins.recolor(red, 'solid', Skins.byId('infernal')), 0) > 340);
const hs = { t: 0, done: false }; let fired = 0, T = 0;
for (let i = 0; i < 150; i++) { if (Motion.holdStep(hs, 0.02, true, true)) { fired++; T = i * 0.02; } }
t('Holding Reload for 2 seconds on a full magazine starts the inspect, once', fired === 1 && T >= 1.95 && T <= 2.1);
const hs2 = { t: 0, done: false }; let f2 = 0; for (let i = 0; i < 80; i++) { if (Motion.holdStep(hs2, 0.02, true, true)) f2++; } for (let i = 0; i < 80; i++) { if (Motion.holdStep(hs2, 0.02, false, true)) f2++; } for (let i = 0; i < 110; i++) { if (Motion.holdStep(hs2, 0.02, true, true)) f2++; }
t('A hold that is let go early does nothing, and a later full hold works again', f2 === 1);
const hs3 = { t: 0, done: false }; let f3 = 0; for (let i = 0; i < 400; i++) if (Motion.holdStep(hs3, 0.02, true, false)) f3++;
t('Holding Reload with a magazine that is not full never starts the inspect (it just reloads)', f3 === 0);
// Hellfire skin
const hf = Skins.byId('hellfire');
t('Hellfire is a near-black gun with molten orange-yellow glow and trim, a flowing glow and red tracers', hf.val < 0.6 && hf.glow > 25 && hf.glow < 45 && hf.trim > 25 && hf.mode === 'flow' && hf.tracer === 0xff2418);
t('The Hellfire glow band moves along the barrel as time passes', Skins.flowAt(-0.2, 0) !== Skins.flowAt(-0.2, 0.3));
t('The Hellfire glow is brighter at the crest of the band than in the dark part', (() => { let lo = 9, hi = 0; for (let z = 0; z > -0.5; z -= 0.005) { const v = Skins.flowAt(z, 0); lo = Math.min(lo, v); hi = Math.max(hi, v); } return hi > 1.3 && lo < 0.7; })());
t('Running makes much more fire than standing still, and other skins make none', Skins.flameRate({ flame: true }, 1) > 3 * Skins.flameRate({ flame: true }, 0) && Skins.flameRate(Skins.byId('gilded'), 1) === 0);
t('The glow burns brighter when you run and flashes when you shoot, on every skin', Skins.SKINS.every((k) => Skins.glowAt(k, 1, 0, 1).k > Skins.glowAt(k, 1, 0, 0).k && Skins.glowAt(k, 1, 1, 0).k > Skins.glowAt(k, 1, 0, 0).k));
t('The flowing glow band moves faster when you run', Math.abs(Skins.flowAt(-0.2, 0.2, 1) - Skins.flowAt(-0.2, 0, 1)) !== Math.abs(Skins.flowAt(-0.2, 0.2, 0) - Skins.flowAt(-0.2, 0, 0)));




{ // legendary guns wear two statuses' colours
  const S = Skins, id = S.forGun('flame', ['fire', 'ice'], 4), k = S.byId(id), fl = S.byId('flame'), fr = S.byId('frost');
  t('A legendary with two statuses wears a mixed skin: the first status paints the plates, the second sets the glow', id === 'mix:flame:frost' && k.hue === fl.hue && k.glow === fr.glow && k.mode === fr.mode);
  t('Any lower rarity keeps the gun\'s own paint', S.forGun('flame', ['fire'], 3) === 'flame' && S.forGun('flame', ['fire', 'ice'], 3) === 'flame');
  t('Every status has a skin, so every legendary mix can be built', ['radiation', 'poison', 'electric', 'fire', 'ice', 'dark', 'light'].every((st) => S.SKINS.some((x) => x.id === S.STATUS_SKIN[st])));
}

console.log(fails ? fails + ' FAILED' : 'all gun checks ok'); process.exit(fails ? 1 : 0);
