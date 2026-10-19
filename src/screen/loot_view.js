/* Draws the referee's XP orbs and pickups (health hearts, frenzy flames). Presentation only: positions come from the snapshot. */
const LootView = (function () {
  function create(THREE, scene, glowTex) {
    const ORB_N = 90, PICK_N = 14;
    const orbGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xffd45a, fog: false });
    const crossGeo = new THREE.BoxGeometry(0.16, 0.5, 0.16), crossGeo2 = new THREE.BoxGeometry(0.5, 0.16, 0.16);
    const healMat = new THREE.MeshBasicMaterial({ color: 0xe23a42, fog: false }), frenzyMat = new THREE.MeshBasicMaterial({ color: 0xff8a1a, fog: false });
    const sprite = (color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })); s.scale.setScalar(size); return s; };
    const orbs = [], picks = [];
    for (let i = 0; i < ORB_N; i++) { const g = new THREE.Group(), m = new THREE.Mesh(orbGeo, orbMat); g.add(m, sprite(0xffb030, 0.7)); g.visible = false; scene.add(g); orbs.push({ g, m }); }
    for (let i = 0; i < PICK_N; i++) {
      const g = new THREE.Group(), a = new THREE.Mesh(crossGeo, healMat), b = new THREE.Mesh(crossGeo2, healMat), f = new THREE.Mesh(orbGeo, frenzyMat);
      const gl = sprite(0xff3a3a, 1.3); g.add(a, b, f, gl); g.visible = false; scene.add(g); picks.push({ g, a, b, f, gl });
    }
    function update(st, t) {
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
