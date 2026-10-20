/* Gun look: the rifle's materials and skin. Builds smoothed, shiny meshes for the voxel parts, repaints them when the skin changes,
   and animates the glow cells and a small coloured light on the hands. Look-only (no rules, no numbers the referee needs). */
const GunLook = (function () {
  function create(THREE, parent) {
    const gunMat = new THREE.MeshPhongMaterial({ vertexColors: true, emissive: 0x1c0c0c, specular: 0x553030, shininess: 22 });
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    const light = new THREE.PointLight(0xff5030, 0.5, 2.2); light.position.set(0, 0.1, -0.25); parent.add(light);
    const tracked = [];            // { geo, kind, orig }
    let skin = GunSkins.byId('crimson');

    // a model part (a voxel grid) becomes a group with one shiny lit mesh and one glowing mesh
    function part(p, vox, group) {
      const kinds = ['solid', 'glow'], raw = kinds.map((k) => Voxel.mesh(p.grid, k, vox, p.pivot));
      const sm = VoxelSmooth.smooth(raw, vox, p.scale > 1 ? { passes: 2 * p.scale } : undefined);   // finer voxels need more rounding passes to keep the same roundness in the world
      kinds.forEach((kind, i) => {
        if (!sm[i].faces) return;
        const geo = Voxel.toGeometry(THREE, sm[i]);
        const mesh = new THREE.Mesh(geo, kind === 'glow' ? glowMat : gunMat);
        mesh.frustumCulled = false; group.add(mesh);
        tracked.push({ geo, kind, orig: sm[i].col, base: null });
      });
      return group;
    }
    function release() { for (const t of tracked) t.geo.dispose(); tracked.length = 0; }     // forget the old gun's meshes before a new gun is built
    function setSkin(id) {
      skin = GunSkins.byId(id);
      for (const t of tracked) { const a = t.geo.getAttribute('color'); a.array.set(GunSkins.recolor(t.orig, t.kind, skin)); t.base = a.array.slice(); a.needsUpdate = true; }
      gunMat.specular.setHex(skin.spec); gunMat.shininess = skin.shine;
    }
    // every frame: t = seconds, flash = 0..1 after a shot, run = 0..1.6 how fast the player runs (the glow brightens and flows faster as you run)
    let phase = 0, lastT = 0;
    function update(t, flash, run) {
      const r = run || 0; phase += Math.max(0, Math.min(0.1, t - lastT)) * (1 + 2.5 * r); lastT = t;
      const g = GunSkins.glowAt(skin, t, flash); g.k += 0.3 * Math.min(1, r);
      glowMat.color.setRGB(g.k * g.tint[0], g.k * g.tint[1], g.k * g.tint[2]);
      if (skin.mode === 'flow') for (const tr of tracked) {     // the glow cells brighten in a band that runs down the barrel
        if (tr.kind !== 'glow') continue;
        const a = tr.geo.getAttribute('color'), pos = tr.geo.getAttribute('position'), b = tr.base;
        for (let i = 0; i < pos.count; i++) {
          const m = GunSkins.flowAt(pos.getZ(i), phase), e = Math.max(0, m - 1);
          a.setXYZ(i, Math.min(1.6, b[i * 3] * m + e * 0.3), Math.min(1.6, b[i * 3 + 1] * m + e * 0.35), Math.min(1.6, b[i * 3 + 2] * m));
        }
        a.needsUpdate = true;
      }
      light.color.setRGB(g.light[0], g.light[1], g.light[2]); light.intensity = 0.45 * g.k + flash * 1.2;
    }
    setSkin('crimson');
    return { gunMat, glowMat, part, release, setSkin, update, skin: () => skin };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = GunLook;
