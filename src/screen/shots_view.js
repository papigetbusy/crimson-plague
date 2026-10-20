/* Monster projectiles on screen: green spit, blue-white lightning bolts and fireballs, drawn from the snapshot's `shots` list.
   Presentation only: where a shot is and what kind it is comes from the referee. Look-only numbers (colours, glow size) live here. */
const ShotsView = (function () {
  const LOOK = {
    spit: { core: 0x9cff4a, glow: 0x4fd02a, size: 1.0, glow2: 4.5 },
    bolt: { core: 0xeaffff, glow: 0x6fd8ff, size: 0.8, glow2: 5.5 },
    fire: { core: 0xffe070, glow: 0xff5a14, size: 1.0, glow2: 5.0 },
    soul: { core: 0xf0dcff, glow: 0xa050ff, size: 0.9, glow2: 5.5 }
  };
  function create(THREE, scene, glowTex) {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const live = new Map();                                             // id -> { group, core, halo, look }
    function make(s) {
      const look = LOOK[s.proj] || LOOK.fire, g = new THREE.Group();
      const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: look.core, fog: false }));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: look.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      g.add(core); g.add(halo); scene.add(g);
      return { g, core, halo, look };
    }
    function update(shots, t) {
      const seen = new Set();
      for (const s of shots) {
        seen.add(s.id);
        let e = live.get(s.id); if (!e) { e = make(s); live.set(s.id, e); }
        const pulse = 1 + Math.sin(t * 30 + s.id) * 0.12;
        e.g.position.set(s.x, s.y, s.z);
        e.core.scale.setScalar(s.r * 0.75 * e.look.size * pulse);
        e.halo.scale.setScalar(s.r * e.look.glow2 * pulse);
      }
      for (const [id, e] of live) if (!seen.has(id)) { scene.remove(e.g); live.delete(id); }
    }
    function clear() { for (const e of live.values()) scene.remove(e.g); live.clear(); }
    return { update, clear };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = ShotsView;
