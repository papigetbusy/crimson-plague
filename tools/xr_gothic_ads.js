// Every GLB gun slot: aim down sights and count the red dots (exactly one: the sharp fire-ray sprite; no on-gun dot housing or cubes), then fire at 10 m and check the shot lands on that dot,
// and read the reload / ADS numbers. Run: NODE_PATH=/workspace/xrsim/node_modules node tools/xr_gothic_ads.js [outdir] [id,id]
const { launch } = require('./xr_sim.js');
const clearSpot = () => { const G = window.__game, r = G.ref; r.clearWave(); const m = r.map, C = m.CELL; for (let z = 4; z < m.H - 4; z++) for (let x = 4; x < m.W - 4; x++) { let ok = true; for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -3; dx <= 3; dx++) if (m.solid && m.solid(x + dx, z + dz)) { ok = false; break; } if (ok) { r.place((x + 0.5) * C, (z + 0.5) * C, Math.PI / 2); return true; } } return false; };
const fs = require('fs'), root = require('path').join(__dirname, '..'), out = process.argv[2] || '/tmp/gothic_ads';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const S = await launch({ root, page: 'site/index.html', query: '?sandbox' });
  await S.enterVR(); await S.head({ p: [0, 0, 0], q: [0, 0, 0, 1] });
  await S.hand('left', { p: [-0.25, -0.6, -0.1], q: [0, 0, 0, 1] });
  const ids = process.argv[3] ? process.argv[3].split(',') : await S.ev(() => Object.keys(GlbData.manifest.guns));
  let bad = 0;
  for (const id of ids) {
    await S.ev((g) => { const r = window.__game.ref; r.equipGun(g, 0); r.setCfg({ spread: 0, spreadAds: 0 }); }, id); await S.ev(clearSpot);
    await S.frames(30);
    await S.hand('right', { p: [0.06, -0.08, -0.35], q: [0, 0, 0, 1] });
    await S.hold('left', 'trigger', true); await S.frames(45);
    const st = await S.ev((g) => { const G = window.__game, V = G.THREE.Vector3, s = G.glb(), d = G.xr.feel().dot, cam = G.camera.getWorldPosition(new V()), at = d ? new V(d[0], d[1], d[2]) : null, list = [];
      G.scene.traverse((o) => { if (!o.visible || !o.material || !o.material.color) return; for (let p = o; p; p = p.parent) if (!p.visible) return;
        const c = o.material.color, red = c.r > 0.9 && c.g < 0.3 && c.b < 0.3, w = o.getWorldPosition(new V()), near = w.distanceTo(cam) < 1.5 || (at && w.distanceTo(at) < 0.5);
        const isDot = (o.isSprite && (red || (o.material.map && o.material.map.image && (o.material.map.image.width === 32 || o.material.map.image.width === 128)))) || (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width < 0.01 && (red || c.g > 0.9));
        if (isDot && near) list.push(o.type + (o.isSprite ? ' ' + o.scale.x.toFixed(3) : '') + (o.name ? ' ' + o.name : '')); });
      let onGunDot = 0; G.scene.traverse((o) => { if (o.name === 'red_dot' && o.visible) { let v = true; for (let p = o; p; p = p.parent) if (!p.visible) v = false; if (v) onGunDot++; } });
      return { gun: s.gun, glb: s.ready.indexOf(g) >= 0, ads: +G.ref.snapshot().player.adsT.toFixed(2), dots: list.length, list, onGunDot, hasDot: !!d }; }, id);
    await S.hold('right', 'trigger', true); await S.frames(3); await S.hold('right', 'trigger', false); await S.frames(2);
    const r = await S.ev(() => { const G = window.__game, sh = G.lastShot(), d = G.xr.feel().dot; if (!sh || !d) return { ok: false, why: 'no shot/dot' }; const V = G.THREE.Vector3, o = new V(sh.ox, sh.oy, sh.oz), e = new V(sh.ex, sh.ey, sh.ez), dir = e.clone().sub(o).normalize(), q = new V(d[0], d[1], d[2]).sub(o), err = q.clone().sub(dir.clone().multiplyScalar(q.dot(dir))).length(); return { ok: err <= 0.06 + 0.01 * (sh.t || 10), err: +err.toFixed(4) }; });
    await S.hold('left', 'trigger', false); await S.frames(10);
    const ok = st.glb && st.ads > 0.9 && st.dots === 1 && st.hasDot && r.ok && (id === 'pistol_service' || st.onGunDot === 0 || id === 'pistol_service');
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + JSON.stringify(st) + ' shot ' + JSON.stringify(r));
  }
  const errs = await S.ev(() => window.__fx.errors.slice(0, 3)); console.log('script errors:', errs.length ? errs.join(' | ') : 'none');
  await S.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
