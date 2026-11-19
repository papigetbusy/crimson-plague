// Clean high-res look at each GLB gun exactly as the game's loader builds it (same materials, steel sheen, glass, glow, filtering), in the game's own renderer, lit like a torch hall
// (dim ambient, one warm point, one cool fill). Run: NODE_PATH=/workspace/xrsim/node_modules node tools/xr_gothic_look.js outdir [id,id,...]
const { launch } = require('./xr_sim.js');
const fs = require('fs'), root = require('path').join(__dirname, '..'), out = process.argv[2] || '/tmp/gothic_look';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const S = await launch({ root, page: 'site/index.html', query: '?sandbox' });
  await new Promise((r) => setTimeout(r, 2500));
  const ids = process.argv[3] ? process.argv[3].split(',') : await S.ev(() => Object.keys(GlbData.manifest.guns));
  const views = [['three', 0.9, 0.35, 1.6], ['front', 0.45, 0.25, 1.6], ['side', 1.571, 0.05, 1.5]];   // azimuth from +x toward +z (muzzle is -z), elevation, distance factor
  for (const id of ids) for (const [vn, az, el, dist] of views) {
    const png = await S.ev(async (id, az, el, dist, patch) => {
      const G = window.__game, T = G.THREE, R = G.renderer;
      if (!window.__look) { const gg = GlbGuns.create(T, { query: '' }); gg.setRenderer(R); await new Promise((res) => { let n = Object.keys(GlbData.manifest.guns).length; gg.start(() => { if (--n <= 0) res(); }); setTimeout(res, 20000); }); window.__look = gg; }
      const gg = window.__look; if (!gg.has(id)) return 'NOLOAD ' + JSON.stringify(gg.status().failed);
      const P = gg.build(id, 1), grp = new T.Group(); grp.add(P.groups.body, P.groups.mag, P.groups.bolt);
      if (patch) grp.traverse((o) => { if (o.isMesh && o.material.isMeshPhysicalMaterial) Object.assign(o.material, patch); });
      const sc = new T.Scene(); sc.background = new T.Color(0x2c2a2e); sc.add(grp);
      sc.add(new T.AmbientLight(0x6a5a58, 0.9)); const pl = new T.PointLight(0xffb070, 1.6, 6); pl.position.set(1.0, 1.2, 1.0); sc.add(pl);
      const dl = new T.DirectionalLight(0x8899cc, 0.6); dl.position.set(-1, 1, -1); sc.add(dl);
      const b = new T.Box3().setFromObject(grp), c = b.getCenter(new T.Vector3()), size = b.getSize(new T.Vector3()).length();
      const cam = new T.PerspectiveCamera(35, 2, 0.01, 20), d = size * dist * 0.55;
      cam.position.set(c.x + Math.sin(az) * Math.cos(el) * d * (az > 1.5 ? 1 : 1), c.y + Math.sin(el) * d, c.z + Math.cos(az) * Math.cos(el) * d * -1); cam.lookAt(c); cam.updateMatrixWorld();
      const W = 1200, H = 600, rt = new T.WebGLRenderTarget(W, H); const old = R.getRenderTarget(); const xr = R.xr.enabled; R.xr.enabled = false;
      pl.position.copy(cam.position).add(new T.Vector3(0.4, 0.8, 0.2)); R.setRenderTarget(rt); R.render(sc, cam); const buf = new Uint8Array(W * H * 4); R.readRenderTargetPixels(rt, 0, 0, W, H, buf); R.setRenderTarget(old); R.xr.enabled = xr; rt.dispose();
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'), im = x.createImageData(W, H);
      for (let y = 0; y < H; y++) im.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); x.putImageData(im, 0, 0);
      return cv.toDataURL('image/png');
    }, id, az, el, dist, process.env.PATCH ? JSON.parse(process.env.PATCH) : null);
    if (!/^data:/.test(png)) { console.log(id, vn, png); continue; }
    fs.writeFileSync(out + '/' + id + '_' + vn + '.png', Buffer.from(png.split(',')[1], 'base64'));
  }
  await S.close(); console.log('done', out);
})().catch((e) => { console.error(e); process.exit(1); });
