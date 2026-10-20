/* Boss floor warnings: glowing lanes (the Bat Lord's dive, the Elder Dragon's fire cone) and rings (the Lich King's nova charge, the dragon's tail slam) drawn flat on the floor,
   so every big attack can be seen coming and dodged. Presentation only: where and how far along they are comes from the snapshot's `bossFx` list. Look-only numbers live here. */
const BossFx = (function () {
  const COLOUR = { lane: 0xff4a30, ring: 0xc070ff, slam: 0xff8a2a };
  function create(THREE, scene) {
    const box = new THREE.BoxGeometry(1, 0.04, 1), cyl = new THREE.CylinderGeometry(1, 1, 0.04, 40, 1, true), disc = new THREE.CylinderGeometry(1, 1, 0.03, 40);
    const pool = [];
    const mat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
    function get(i, kind) {
      let e = pool[i];
      if (!e || e.kind !== kind) {
        if (e) scene.remove(e.mesh);
        const mesh = new THREE.Mesh(kind === 'lane' ? box : kind === 'disc' ? disc : cyl, mat(kind === 'lane' ? COLOUR.lane : kind === 'disc' ? COLOUR.slam : COLOUR.ring));
        scene.add(mesh); e = pool[i] = { mesh, kind };
      }
      return e;
    }
    function update(st, t) {
      const list = st.bossFx || []; let n = 0;
      for (const f of list) {
        const pulse = 0.65 + 0.35 * Math.sin(t * 22);
        if (f.shape === 'lane') {
          const e = get(n++, 'lane'), sx = Math.sin(f.ang), sz = -Math.cos(f.ang);
          e.mesh.visible = true; e.mesh.position.set(f.x + sx * f.len / 2, 0.06, f.z + sz * f.len / 2);
          e.mesh.scale.set(f.w, 1, f.len); e.mesh.rotation.y = Math.atan2(sx, sz);
          e.mesh.material.opacity = (0.18 + 0.4 * f.k) * pulse;
        } else {
          const kind = f.fill ? 'disc' : 'ring', e = get(n++, kind);
          e.mesh.visible = true; e.mesh.position.set(f.x, 0.07, f.z); e.mesh.scale.set(f.r, 1, f.r); e.mesh.rotation.y = 0;
          e.mesh.material.opacity = (f.fill ? 0.12 + 0.3 * f.k : 0.3 + 0.4 * f.k) * pulse;
        }
      }
      for (let i = n; i < pool.length; i++) if (pool[i]) pool[i].mesh.visible = false;
    }
    function clear() { for (const e of pool) if (e) e.mesh.visible = false; }
    return { update, clear };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = BossFx;
