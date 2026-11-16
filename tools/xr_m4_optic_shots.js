// M4 optic shots for the tonight playtest: a side view of the physical red-dot, and an ADS view through the glass.
// Run: NODE_PATH=/workspace/xrsim/node_modules node tools/xr_m4_optic_shots.js /workspace/fp_shots/tonight
const { launch, quatYawPitch } = require('./xr_sim.js');
const fs = require('fs'), root = require('path').join(__dirname, '..'), out = process.argv[2] || '/workspace/fp_shots/tonight';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const S = await launch({ root, page: 'site/index.html', query: '?sandbox' });
  await S.enterVR(); await S.head({ p: [0, 0, 0], q: [0, 0, 0, 1] });
  const t0 = Date.now();
  while (Date.now() - t0 < 10000) {
    const g = await S.ev(() => window.__game.glb && window.__game.glb());
    if (g && g.ready && g.ready.indexOf('rifle_m4') >= 0) break;
    await S.frames(10);
  }
  await S.ev(() => { const r = window.__game.ref; r.clearWave(); r.equipGun('rifle_m4', 0); const m = r.map, R = m.rooms.find((q) => q.kind === 'start'), C = m.CELL; r.place((R.x + R.w / 2) * C, (R.z + R.h / 2) * C, Math.PI / 2); if (window.__game.xr.faceYaw) window.__game.xr.faceYaw(Math.PI / 2); });
  await S.frames(24);
  // side view: show the tube on the rail
  await S.hand('right', { p: [0.0, -0.06, -0.28], q: quatYawPitch(1.4, 0.05) }); await S.frames(20);
  await S.shot(out + '/m4_optic_side.png');
  // ADS through the glass: point at a wall 10 m ahead, hold left trigger, look down the optic
  const tgt = await S.ev(() => { const p = window.__game.ref.snapshot().player; return [p.x + 10, p.eye, p.z]; });
  await S.hand('right', { p: [0.18, -0.42, -0.32], q: [0, 0, 0, 1] });
  await S.ev((t) => { /* point the right ray at the target via the sim helper if present */ }, tgt);
  const look = await S.ev((t) => {
    const G = window.__game, p = G.ref.snapshot().player;
    // a controller pose that aims at the target
    return t;
  }, tgt);
  // reuse the playtest pointAt pattern: compute look quat in-page
  const qAim = await S.ev((t) => {
    if (window.__pt && window.__pt.look) return window.__pt.look([0.18, -0.42, -0.32], t);
    const THREE = window.__game.THREE, rig = window.__game.xr.rig;
    rig.updateMatrixWorld(true);
    const from = [0.18, -0.42, -0.32], v = new THREE.Vector3(t[0], t[1], t[2]); rig.worldToLocal(v);
    const d = new THREE.Vector3(v.x - from[0], v.y - from[1], v.z - from[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), d);
    return [q.x, q.y, q.z, q.w];
  }, tgt);
  await S.hand('right', { p: [0.18, -0.42, -0.32], q: qAim });
  await S.hold('left', 'trigger', true); await S.frames(50);
  const info = await S.ev(() => ({ ads: window.__game.xr.adsInfo && window.__game.xr.adsInfo(), feel: window.__game.xr.feel(), gun: window.__game.ref.snapshot().player.gun.id, glb: window.__game.glb() }));
  await S.shot(out + '/m4_optic_ads.png');
  await S.hold('left', 'trigger', false);
  console.log('ads', JSON.stringify(info));
  await S.close();
  console.log('shots in ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
