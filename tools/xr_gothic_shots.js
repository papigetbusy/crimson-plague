// The 17 gothic remakes, held in the fake Quest (front three-quarter, plus an ADS view): which slots loaded their GLB (not the voxel fallback), what material look each got,
// and screenshots. Run: NODE_PATH=/workspace/xrsim/node_modules node tools/xr_gothic_shots.js outdir [?query]
const { launch, quatYawPitch } = require('./xr_sim.js');
const fs = require('fs'), root = require('path').join(__dirname, '..'), out = process.argv[2] || '/tmp/gothic_shots', query = process.argv[3] || '?sandbox';
fs.mkdirSync(out, { recursive: true });
const IDS = (process.env.ONLY ? process.env.ONLY.split(',') : null) || ['pistol_cannon', 'pistol_machine', 'pistol_duelist', 'smg_drum', 'smg_bullpup', 'shotgun_pump', 'shotgun_blunderbuss', 'shotgun_double', 'shotgun_combat', 'sniper_bolt', 'sniper_antimat', 'sniper_marksman', 'sniper_rail', 'hmg_belt', 'hmg_minigun', 'hmg_drum', 'hmg_chain', 'pistol_service', 'rifle', 'rifle_m4', 'smg_tactical', 'smg_compact'];
const clearSpot = () => { const G = window.__game, r = G.ref; r.clearWave(); const m = r.map, C = m.CELL; for (let z = 4; z < m.H - 4; z++) for (let x = 4; x < m.W - 4; x++) { let ok = true; for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -3; dx <= 3; dx++) if (m.solid && m.solid(x + dx, z + dz)) { ok = false; break; } if (ok) { r.place((x + 0.5) * C, (z + 0.5) * C, Math.PI / 2); return true; } } return false; };
(async () => {
  const S = await launch({ root, page: 'site/index.html', query, w: +process.env.W || undefined, h: +process.env.H || undefined });
  await S.enterVR();
  await S.head({ p: [0, 0, 0], q: [0, 0, 0, 1] });
  await S.hand('left', { p: [-0.25, -0.6, -0.1], q: [0, 0, 0, 1] });
  await S.ev(clearSpot);
  const report = {};
  // photo booth: hide the hall and everything but the lights and the rig (hands, gun), plain grey backdrop, so each gun is judged on its own look
  const booth = () => { const G = window.__game; G.scene.background = new G.THREE.Color(0x3a3d44); G.scene.children.forEach((o) => { if (!o.isLight && o.name !== 'xrDolly') o.visible = false; }); };
  for (const id of IDS) {
    await S.ev((g) => window.__game.ref.equipGun(g, 0), id); await S.frames(30);
    const st = await S.ev((g) => { const G = window.__game, s = G.glb(); let body = null; G.scene.traverse((o) => { if (o.name === 'glb_body' && o.parent) body = o; }); let tris = 0, mats = {}; if (body) body.traverse((m) => { if (m.isMesh && m.geometry) { tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; const k = m.material.type + (m.material.transparent ? '+T' : '') + (m.material.map ? ':' + (m.material.map.image && m.material.map.image.width) + (m.material.map.magFilter === 1003 ? 'N' : 'L') : ''); mats[k] = (mats[k] || 0) + 1; } });
      let dots = 0; G.scene.traverse((o) => { if (o.name === 'red_dot' && o.parent) dots++; });
      return { on: s.on, gun: s.gun, file: G.glb && s.ready.indexOf(g) >= 0, loaded: s.ready.indexOf(g) >= 0, failed: s.failed[g] || null, hasBody: !!body, tris: Math.round(tris), mats, onGunRedDotMeshes: dots }; }, id);
    report[id] = st;
    for (const [n, p, q] of [['three', [0.05, -0.12, -0.8], quatYawPitch(0.7, -0.12)], ['front', [0.05, -0.12, -0.8], quatYawPitch(2.45, -0.12)]]) { await S.hand('right', { p, q }); await S.frames(22); if (!process.env.NOBOOTH) { await S.ev(booth); await S.frames(2); } await S.shot(out + '/' + id + '_' + n + '.png'); }
    if (process.env.ADS) { await S.hand('right', { p: [0.04, -0.1, -0.4], q: [0, 0, 0, 1] }); await S.hold('left', 'trigger', true); await S.frames(40); await S.shot(out + '/' + id + '_ads.png'); await S.hold('left', 'trigger', false); await S.frames(12); }
    console.log(id, JSON.stringify(st));
  }
  fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 1));
  await S.close();
})().catch((e) => { console.error(e); process.exit(1); });
