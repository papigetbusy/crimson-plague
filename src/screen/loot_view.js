/* Draws the referee's XP orbs and pickups (health hearts, frenzy flames). Presentation only: positions come from the snapshot. */
const LootView = (function () {
  function create(THREE, scene, glowTex) {
    const ORB_N = 90, PICK_N = 14, COIN_N = 60;
    const orbGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xffd45a, fog: false });
    const crossGeo = new THREE.BoxGeometry(0.16, 0.5, 0.16), crossGeo2 = new THREE.BoxGeometry(0.5, 0.16, 0.16);
    const healMat = new THREE.MeshBasicMaterial({ color: 0xe23a42, fog: false }), frenzyMat = new THREE.MeshBasicMaterial({ color: 0xff8a1a, fog: false });
    const sprite = (color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })); s.scale.setScalar(size); return s; };
    const coinGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.05, 10), coinMat = new THREE.MeshBasicMaterial({ color: 0xffe36a, fog: false });
    const coins = [];
    for (let i = 0; i < COIN_N; i++) { const g = new THREE.Group(), m = new THREE.Mesh(coinGeo, coinMat); m.rotation.x = Math.PI / 2; g.add(m, sprite(0xffe070, 0.55)); g.visible = false; scene.add(g); coins.push({ g, m }); }
    // the merchant: a hooded figure behind a little stall, lantern on the counter (a placeholder shape, like the first monsters were)
    const box = (w, h, d, color, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color })); m.position.set(x, y, z); parent.add(m); return m; };
    const shop = new THREE.Group(); shop.visible = false; scene.add(shop);
    box(0.9, 1.5, 0.7, 0x4a0f18, 0, 0.75, 0, shop); box(0.62, 0.55, 0.62, 0x35090f, 0, 1.75, 0, shop); box(0.4, 0.3, 0.1, 0x120406, 0, 1.75, 0.3, shop);
    for (const x of [-0.12, 0.12]) box(0.08, 0.06, 0.04, 0xffc83a, x, 1.78, 0.36, shop);
    box(1.8, 0.7, 0.7, 0x2a1a10, 0, 0.35, 0.95, shop); box(1.9, 0.08, 0.8, 0x6a4a1c, 0, 0.72, 0.95, shop);
    box(0.18, 0.22, 0.18, 0xffd45a, -0.55, 0.86, 0.95, shop); box(0.3, 0.1, 0.3, 0xffe36a, 0.45, 0.8, 0.95, shop);
    const lamp = sprite(0xffa840, 2.2); lamp.position.set(-0.55, 1.0, 0.95); shop.add(lamp);
    const orbs = [], picks = [];
    for (let i = 0; i < ORB_N; i++) { const g = new THREE.Group(), m = new THREE.Mesh(orbGeo, orbMat); g.add(m, sprite(0xffb030, 0.7)); g.visible = false; scene.add(g); orbs.push({ g, m }); }
    for (let i = 0; i < PICK_N; i++) {
      const g = new THREE.Group(), a = new THREE.Mesh(crossGeo, healMat), b = new THREE.Mesh(crossGeo2, healMat), f = new THREE.Mesh(orbGeo, frenzyMat);
      const gl = sprite(0xff3a3a, 1.3); g.add(a, b, f, gl); g.visible = false; scene.add(g); picks.push({ g, a, b, f, gl });
    }
    function update(st, t) {
      for (let i = 0; i < COIN_N; i++) {
        const c = coins[i], d = st.coins[i];
        if (!d) { c.g.visible = false; continue; }
        c.g.visible = true; c.g.position.set(d.x, 0.4 + Math.sin(t * 3 + d.id) * 0.06, d.z); c.g.scale.setScalar(d.v >= 40 ? 1.8 : d.v >= 8 ? 1.3 : 1);
        c.m.rotation.set(Math.PI / 2, 0, t * 4 + d.id);
      }
      shop.visible = !!st.merchant;
      if (st.merchant) { shop.position.set(st.merchant.x, 0, st.merchant.z); shop.rotation.y = Math.atan2(st.player.x - st.merchant.x, st.player.z - st.merchant.z); lamp.material.opacity = 0.8 + Math.sin(t * 7) * 0.1; }
      for (let i = 0; i < ORB_N; i++) {
        const o = orbs[i], d = st.orbs[i];
        if (!d) { o.g.visible = false; continue; }
        o.g.visible = true; const big = d.v >= 30 ? 1.7 : d.v >= 10 ? 1.25 : 1;
        o.g.position.set(d.x, 0.55 + Math.sin(t * 3 + d.id) * 0.08, d.z); o.g.scale.setScalar(big);
        o.m.rotation.set(t * 2 + d.id, t * 3, 0.78);
      }
      for (let i = 0; i < PICK_N; i++) {
        const p = picks[i], d = st.pickups[i];
        if (!d) { p.g.visible = false; continue; }
        const heal = d.kind === 'heal';
        p.g.visible = true; p.a.visible = p.b.visible = heal; p.f.visible = !heal;
        p.gl.material.color.setHex(heal ? 0xff3a3a : 0xff9a2a);
        p.g.position.set(d.x, 0.75 + Math.sin(t * 2.4 + d.id) * 0.12, d.z); p.g.rotation.y = t * 1.6;
        p.g.scale.setScalar(d.life < 4 ? (Math.sin(t * 16) > 0 ? 1 : 0.5) : 1);       // blinks before it vanishes
        if (!heal) p.f.rotation.set(t * 2, t * 3, 0.78);
      }
    }
    return { update };
  }
  return { create };
})();
