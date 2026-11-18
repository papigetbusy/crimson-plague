// VR leather-glove portraits for the playtest: empty open hands, pistol grip, AK with the
// support hand on the fore-end, M4 ADS through the optic, and a door grab.
// Run: NODE_PATH=/workspace/xrsim/node_modules node tools/xr_hands_shots.js /workspace/fp_shots/hands
const { launch } = require('./xr_sim.js');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const out = process.argv[2] || '/workspace/fp_shots/hands';
fs.mkdirSync(out, { recursive: true });

const REST = { right: [0.18, -0.42, -0.32], left: [-0.18, -0.42, -0.32] };
const VIEW = { right: [0.16, -0.18, -0.34], left: [-0.16, -0.18, -0.34] };
const HELPERS = () => {
  const G = window.__game, T = G.THREE;
  const rig = () => { const r = G.xr.rig; r.updateMatrixWorld(true); return r; };
  const toLocal = (x, y, z) => { const v = new T.Vector3(x, y, z); rig().worldToLocal(v); return [v.x, v.y, v.z]; };
  const look = (from, toW) => { const t = toLocal(toW[0], toW[1], toW[2]); const d = new T.Vector3(t[0] - from[0], t[1] - from[1], t[2] - from[2]).normalize(); const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, -1), d); return [q.x, q.y, q.z, q.w]; };
  const atDoor = (k) => { const m = G.ref.map, d = m.door, C = m.CELL; for (const sg of [1, -1]) { const x = d.x + d.nx * k * sg, z = d.z + d.nz * k * sg, r = m.rows[Math.floor(z / C)], ch = r && r[Math.floor(x / C)]; if (ch === '.' || ch === 'c') { const y = Math.atan2(-d.nx * sg, d.nz * sg); G.ref.place(x, z, y); if (G.xr.faceYaw) G.xr.faceYaw(y); return { x: d.x, z: d.z }; } } return null; };
  const openSpot = (r, avoid) => { const m = G.ref.map, C = m.CELL; const ok = (ch) => ch === '.' || ch === 'c';
    for (let z = r + 1; z < m.H - r - 1; z++) for (let x = r + 1; x < m.W - r - 1; x++) { let good = true; for (let dz = -r; dz <= r && good; dz++) for (let dx = -r; dx <= r; dx++) if (!ok(m.rows[z + dz][x + dx])) { good = false; break; } if (!good) continue; const wx = (x + 0.5) * C, wz = (z + 0.5) * C; if (avoid && Math.hypot(wx - avoid[0], wz - avoid[1]) < 10) continue; return [wx, wz]; }
    return null; };
  const place0 = G.ref.place; G.ref.place = (x, z, yaw) => { place0(x, z, yaw); if (yaw !== undefined && G.xr.faceYaw) G.xr.faceYaw(yaw); };
  window.__pt = { atDoor, toLocal, look, openSpot };
};
async function waitGlb(S, id) {
  const t0 = Date.now();
  while (Date.now() - t0 < 10000) {
    const g = await S.ev(() => window.__game.glb && window.__game.glb());
    if (g && g.ready && (!id || g.ready.indexOf(id) >= 0)) return g;
    await S.frames(8);
  }
  return null;
}
async function clean(S) {
  await S.ev(() => { const r = window.__game.ref; r.setCfg({ monsterCount: 0 }); r.clearWave(); });
  await S.frames(6);
  await S.ev(() => {
    const r = window.__game.ref, s = r.snapshot(), p = s.player;
    const near = (s.pickups || []).some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 5);
    const avoid = (s.pickups || [])[0] ? [(s.pickups || [])[0].x, (s.pickups || [])[0].z] : [p.x, p.z];
    const O = window.__pt.openSpot(4, avoid) || window.__pt.openSpot(3, avoid);
    if (O && near) r.place(O[0], O[1], Math.PI / 2);
    else if (O && !near) { /* already clear */ }
    else if (O) r.place(O[0], O[1], Math.PI / 2);
  });
  await S.frames(6);
}
async function hideHitMark(S) {
  await S.ev(() => {
    window.__game.scene.traverse((o) => {
      if (o.type === 'Group' && o.children.length === 4 && o.children.every((c) => c.renderOrder === 999 && c.geometry && c.geometry.type === 'PlaneGeometry')) o.visible = false;
    });
  });
}
function hideHeldGun(S, hide) {
  return S.ev((h) => {
    const G = window.__game;
    G.scene.traverse((o) => {
      if (o.name !== 'glb_body' && o.name !== 'sightMark' && o.name !== 'muzzle') return;
      let p = o;
      while (p.parent && p.parent.name !== 'xrDolly' && p.parent !== G.camera && p.parent !== G.scene) p = p.parent;
      p.visible = !h;
    });
  }, hide);
}

(async () => {
  const S = await launch({ root, page: 'site/index.html', query: '?sandbox' });
  await S.page.evaluate(HELPERS);
  await S.enterVR();
  await S.head({ p: [0, 0, 0], q: [0, 0, 0, 1] });
  await waitGlb(S, 'pistol_service');
  await S.ev(() => { const r = window.__game.ref; r.clearWave(); r.equipGun('pistol_service', 1); });
  await S.page.evaluate(HELPERS); // place() wrap may have been overwritten; re-apply
  await clean(S);
  await S.frames(12);

  // 1. empty hands: both gloves in the open pose, gun hidden so the leather is clear
  await S.ev(() => window.__game.xr.handsForce('empty'));
  await S.hand('right', { p: [0.18, -0.12, -0.36], q: [0, 0, 0, 1], v: { 0: 0, 1: 0 } });
  await S.hand('left', { p: [-0.18, -0.12, -0.36], q: [0, 0, 0, 1], v: { 0: 0, 1: 0 } });
  await hideHeldGun(S, true);
  await S.frames(16);
  const emptyInfo = await S.ev(() => window.__game.xr.debug().vrHands);
  await hideHitMark(S); await S.shot(out + '/empty_hands.png');
  await hideHeldGun(S, false);
  await S.ev(() => window.__game.xr.handsForce(null));

  // 2. pistol: right hand on the 1911 grip, left open beside it
  await S.hand('right', { p: [0.14, -0.16, -0.38], q: [0, 0, 0, 1], v: { 0: 0, 1: 0 } });
  await S.hand('left', { p: [-0.18, -0.14, -0.36], q: [0, 0, 0, 1], v: { 0: 0, 1: 0 } });
  await S.frames(16);
  const pistolInfo = await S.ev(() => ({ hands: window.__game.xr.debug().vrHands, gun: window.__game.ref.snapshot().player.gun.id }));
  await hideHitMark(S); await S.shot(out + '/pistol.png');

  // 3. AK (the rifle slot) with the support hand on the fore-end
  await waitGlb(S, 'rifle');
  await clean(S);
  await S.ev(() => { window.__game.ref.clearWave(); window.__game.ref.equipGun('rifle', 1); }); await S.frames(24);
  await S.hand('right', { p: REST.right, q: [0, 0, 0, 1], v: { 0: 0, 1: 0 } });
  const fore = await S.ev(() => window.__game.xr.debug().foreAt);
  if (fore) await S.hand('left', { p: fore, q: [0, 0, 0, 1] });
  else await S.hand('left', { p: [-0.02, -0.36, -0.50], q: [0, 0, 0, 1] });
  await S.hold('left', 'grip', true); await S.frames(20);
  const akInfo = await S.ev((fore) => ({ hands: window.__game.xr.debug().vrHands, twoHand: window.__game.xr.debug().twoHand, gun: window.__game.ref.snapshot().player.gun.id, fore }), fore);
  await hideHitMark(S); await S.shot(out + '/ak_fore.png');
  await S.hold('left', 'grip', false);

  // 4. M4 ADS through the optic, hands still on (tucked if they would clip the sight)
  await waitGlb(S, 'rifle_m4');
  await clean(S);
  await S.ev(() => { window.__game.ref.clearWave(); window.__game.ref.equipGun('rifle_m4', 0); }); await S.frames(24);
  const tgt = await S.ev(() => { const p = window.__game.ref.snapshot().player; return [p.x + 10, p.eye, p.z]; });
  const qAim = await S.ev((t) => window.__pt.look([0.18, -0.42, -0.32], t), tgt);
  await S.hand('right', { p: REST.right, q: qAim });
  const foreM4 = await S.ev(() => window.__game.xr.debug().foreAt);
  if (foreM4) { await S.hand('left', { p: foreM4, q: qAim }); await S.hold('left', 'grip', true); }
  await S.hold('left', 'trigger', true); await S.frames(50);
  const adsInfo = await S.ev(() => ({ ads: window.__game.xr.adsInfo && window.__game.xr.adsInfo(), feel: window.__game.xr.feel(), hands: window.__game.xr.debug().vrHands, twoHand: window.__game.xr.debug().twoHand, gun: window.__game.ref.snapshot().player.gun.id }));
  await hideHitMark(S); await S.shot(out + '/m4_ads.png');
  await S.hold('left', 'trigger', false); await S.hold('left', 'grip', false);

  // 5. door grab: stand at the sandbox boss door and reach for the handle (shot before it opens)
  await clean(S);
  await S.ev(() => { window.__game.ref.clearWave(); window.__game.ref.equipGun('pistol_service', 1); }); await S.frames(12);
  const door = await S.ev(() => { const m = window.__game.ref.map; return { x: m.door.x, z: m.door.z }; });
  await S.ev(() => window.__pt.atDoor(2.2)); await S.frames(8);
  const qDoor = await S.ev((d) => window.__pt.look([0.20, -0.08, -0.42], [d.x, 1.35, d.z]), door);
  await S.hand('right', { p: [0.20, -0.08, -0.42], q: qDoor, v: { 0: 0, 1: 0 } });
  await S.hand('left', { p: [-0.18, -0.16, -0.34], q: [0, 0, 0, 1], v: { 0: 0, 1: 0 } });
  await S.frames(12);
  const doorInfo = await S.ev(() => ({ hands: window.__game.xr.debug().vrHands, grab: window.__game.xr.debug().grab, door: window.__game.ref.snapshot().door }));
  await hideHitMark(S); await S.shot(out + '/door_grab.png');

  console.log(JSON.stringify({ emptyInfo, pistolInfo, akInfo, adsInfo, doorInfo }, null, 2));
  await S.close();
  console.log('shots in ' + out);
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
