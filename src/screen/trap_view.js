/* Draws the floor's traps: always-up spike patches, flame vents and rising spikes. Presentation only: where they are comes from the map,
   whether each is quiet, warning or dangerous (0, 1, 2) from the snapshot's `traps` list. Look-only numbers live here. */
const TrapView = (function () {
  function create(THREE, scene, glowTex) {
    const coneGeo = new THREE.ConeGeometry(0.2, 0.62, 4), plateGeo = new THREE.BoxGeometry(1, 0.05, 1);
    const steel = new THREE.MeshLambertMaterial({ color: 0xa8a8b4, emissive: 0x2a1014 }), tip = new THREE.MeshBasicMaterial({ color: 0xb02030 });
    const plateMat = new THREE.MeshLambertMaterial({ color: 0x241012 }), grateMat = new THREE.MeshLambertMaterial({ color: 0x15100f, emissive: 0x200800 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a1a, transparent: true, opacity: 0.85, fog: false });
    const sprite = (color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })); s.scale.setScalar(size); return s; };
    let group = null, parts = [], mapId = -1;

    function build(map, CELL) {
      if (group) scene.remove(group);
      group = new THREE.Group(); parts = [];
      for (const t of map.traps || []) {
        const g = new THREE.Group(), cx = (t.x + t.w / 2) * CELL, cz = (t.z + t.h / 2) * CELL;
        g.position.set(cx, 0, cz);
        const part = { t, g, cx, cz, spikes: [], flame: null, glow: null };
        if (t.kind === 'vent') {
          const grate = new THREE.Mesh(plateGeo, grateMat); grate.scale.set(1.5, 1, 1.5); grate.position.y = 0.03; g.add(grate);
          part.flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 6), flameMat); part.flame.position.y = 0.9; g.add(part.flame);
          part.glow = sprite(0xff6a1a, 3); part.glow.position.y = 0.8; g.add(part.glow);
        } else {
          const plate = new THREE.Mesh(plateGeo, plateMat); plate.scale.set(t.w * CELL - 0.15, 1, t.h * CELL - 0.15); plate.position.y = 0.03; g.add(plate);
          for (let ix = 0; ix < t.w * 2; ix++) for (let iz = 0; iz < t.h * 2; iz++) {
            const s = new THREE.Mesh(coneGeo, (ix + iz) % 3 === 0 ? tip : steel);
            s.position.set(-t.w * CELL / 2 + (ix + 0.5) * (CELL / 2), 0.31, -t.h * CELL / 2 + (iz + 0.5) * (CELL / 2));
            g.add(s); part.spikes.push(s);
          }
          if (t.kind === 'pulse') { part.glow = sprite(0xff3030, 2.6); part.glow.position.y = 0.2; g.add(part.glow); }
        }
        group.add(g); parts.push(part);
      }
      scene.add(group);
    }
    function update(st, map, t) {
      if (mapId !== st.floorId) { build(map, map.CELL); mapId = st.floorId; }
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i], s = st.traps[i] || 0, near = Math.hypot(p.cx - st.player.x, p.cz - st.player.z) < 46;
        p.g.visible = near; if (!near) continue;
        if (p.t.kind === 'vent') {
          p.flame.visible = s === 2; p.flame.scale.set(1 + Math.sin(t * 30 + i) * 0.12, 0.8 + Math.sin(t * 22 + i) * 0.2, 1);
          p.glow.visible = s > 0; p.glow.material.opacity = s === 2 ? 1 : 0.35 + 0.35 * Math.sin(t * 18);
        } else {
          const up = s === 2 ? 1 : s === 1 ? 0.45 + 0.1 * Math.sin(t * 25) : 0.04;     // pulse spikes shiver before they rise, and sink flat when quiet
          for (const sp of p.spikes) { sp.scale.y = up; sp.position.y = 0.05 + 0.31 * up; }
          if (p.glow) { p.glow.visible = s > 0; p.glow.material.opacity = s === 2 ? 0.9 : 0.4; }
        }
      }
    }
    return { update };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = TrapView;
