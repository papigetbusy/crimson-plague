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
      const sm = VoxelSmooth.smooth(raw, vox);
      kinds.forEach((kind, i) => {
        if (!sm[i].faces) return;
        const geo = Voxel.toGeometry(THREE, sm[i]);
        const mesh = new THREE.Mesh(geo, kind === 'glow' ? glowMat : gunMat);
        mesh.frustumCulled = false; group.add(mesh);
        tracked.push({ geo, kind, orig: sm[i].col });
      });
      return group;
    }
    function setSkin(id) {
      skin = GunSkins.byId(id);
      for (const t of tracked) { const a = t.geo.getAttribute('color'); a.array.set(GunSkins.recolor(t.orig, t.kind, skin)); a.needsUpdate = true; }
      gunMat.specular.setHex(skin.spec); gunMat.shininess = skin.shine;
    }
    // every frame: t = seconds, flash = 0..1 after a shot
    function update(t, flash) {
      const g = GunSkins.glowAt(skin, t, flash);
      glowMat.color.setRGB(g.k * g.tint[0], g.k * g.tint[1], g.k * g.tint[2]);
      light.color.setRGB(g.light[0], g.light[1], g.light[2]); light.intensity = 0.45 * g.k + flash * 1.2;
    }
    setSkin('crimson');
    return { gunMat, glowMat, part, setSkin, update, skin: () => skin };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = GunLook;
