/* GLB guns: low-poly mesh guns (Blender exports, listed in assets/models/manifest.json) shown in place of a voxel gun.
   tools/build.js embeds the manifest and each GLB as base64 (GlbData), so the one-file page needs no fetch. The GLB is decoded once with
   three's GLTFLoader (src/vendor/gltf_loader_r128.js); until it is ready, or if it fails, or with ?voxelguns in the link, the voxel gun stays.
   build() hands screen.js the same parts the voxel guns give: a body, a magazine that reloads drop and insert, a moving part (the slide)
   and the anchors in gun units (muzzle, red dot, magazine pivot, slide rest, both hands), with the right hand on the same grip spot as every voxel gun.
   Look-only: no rules, no numbers the referee needs. */
const GlbGuns = (function () {
  const GRIP_TARGET = [0, -21 * 0.0065, 16 * 0.0065];   // where the right hand holds every gun (GunKit.GRIP_TARGET in gun units)

  function decode(b64) {
    if (typeof Buffer !== 'undefined' && typeof atob === 'undefined') { const b = Buffer.from(b64, 'base64'); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); }
    const s = atob(b64), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u.buffer;
  }
  // the game's look for a textured low-poly gun: nearest-filter pixels, lit by the torches like the voxel guns (Phong), with a little of the
  // texture glowing by itself so it never goes black in a dark hall
  function lookMat(THREE, map) {
    if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; map.encoding = THREE.LinearEncoding; map.needsUpdate = true; }
    return new THREE.MeshPhongMaterial({ color: 0xffffff, map: map || null, emissive: 0x303030, emissiveMap: map || null, specular: 0x2a2828, shininess: 24, side: THREE.DoubleSide });
  }
  // polished steel (a GLB material with metalness >= 0.5, e.g. Wrok's blued 1911 base: metallic 1, roughness 0.3): a metal needs something to
  // reflect, or it reads black. A tiny warm torch-hall gradient turned into a PMREM once (envFrom) gives it its sheen; a little self-light keeps it readable.
  function steelMat(THREE, src, map) {
    // the blued atlas is very dark (about 7-46 of 255), and a metal's colour is its reflection tinted by that atlas, so the tint is lifted
    // (color 1.3) and the reflection raised (1.7); metalness and roughness stay Wrok's (1 and 0.3)
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: map || null, metalness: Math.min(1, src.metalness), roughness: Math.max(0.22, src.roughness), envMapIntensity: 1.7, emissive: 0x18181c, emissiveMap: map || null, side: THREE.DoubleSide });
    m.color.setScalar(1.3); return m;
  }
  function envFrom(THREE, renderer) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 32; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 32);                       // top to bottom: dark vault, warm torch band, bright streak, red-brown floor
    g.addColorStop(0, '#2a2228'); g.addColorStop(0.3, '#5a4034'); g.addColorStop(0.42, '#e8a868'); g.addColorStop(0.5, '#fff6e6'); g.addColorStop(0.58, '#d07a44'); g.addColorStop(0.72, '#4a2620'); g.addColorStop(1, '#1a1010');
    x.fillStyle = g; x.fillRect(0, 0, 64, 32);
    x.fillStyle = 'rgba(255,190,120,0.9)'; for (const px of [8, 30, 52]) x.fillRect(px, 9, 3, 6);   // three torch flames round the room
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
    return env;
  }
  function firstMap(scene) { let m = null; scene.traverse((o) => { if (!m && o.isMesh && o.material && o.material.map) m = o.material.map; }); return m; }

  // take node n out of the model and keep its place, relative to the point pivot (model units)
  function detach(THREE, n, pivot) {
    const M = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z).multiply(n.matrixWorld);
    n.parent.remove(n); M.decompose(n.position, n.quaternion, n.scale); n.updateMatrix();
    return n;
  }
  // a small open red-dot sight on the slide (model metres): base plate, two posts and a top bar round an empty window; returns the dot spot
  function redDot(THREE, parent, r) {
    const mat = r.mat;
    const box = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.name = 'red_dot'; m.frustumCulled = false; parent.add(m); };
    const hw = r.halfW, b = r.base, h = r.height, z = r.z, t = 0.002;
    box(2 * hw + 2 * t, 0.003, 0.02, 0, b + 0.0015, z + 0.009);              // base plate on the slide, running back from the window
    box(t, h - 0.003, t, -hw - t / 2, b + 0.003 + (h - 0.003) / 2, z);       // left and right posts
    box(t, h - 0.003, t, hw + t / 2, b + 0.003 + (h - 0.003) / 2, z);
    box(2 * hw + 2 * t, t, t, 0, b + h - t / 2, z);                          // top bar
    return { dot: new THREE.Vector3(0, b + 0.003 + (h - 0.003 - t) / 2, z), y0: b + 0.003, y1: b + h - t, halfW: hw };
  }

  // a physical M4-style red-dot optic (Aimpoint-like tube) sitting on optic_mount.
  // Dark steel with the locked 1911 sheen, a thin brass / engraved band, and a lens whose
  // illuminated reticle is drawn in the glass (visible only when you look through it,
  // collimated along the optic axis / bore). This is not the old on-gun red_dot housing.
  function reticleMat(THREE) {
    const MOA = Math.PI / (180 * 60), CORE = 16 * MOA, GLOW = 40 * MOA;
    return new THREE.ShaderMaterial({
      uniforms: { core: { value: CORE }, glow: { value: GLOW } },
      vertexShader: 'varying vec3 vWPos;\nvarying vec3 vAxis;\nvoid main() {\n  vec4 w = modelMatrix * vec4(position, 1.0);\n  vWPos = w.xyz;\n  vAxis = normalize((modelMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);\n  gl_Position = projectionMatrix * viewMatrix * w;\n}',
      fragmentShader: [
        'uniform float core, glow;',
        'varying vec3 vWPos;',
        'varying vec3 vAxis;',
        'void main() {',
        '  vec3 C = cameraPosition;',
        '  vec3 D = normalize(-vAxis);',
        '  vec3 view = normalize(vWPos - C);',
        '  float looking = dot(view, D);',
        '  if (looking < 0.15) discard;',
        '  float ang = acos(clamp(dot(view, D), -1.0, 1.0));',
        '  float k = 1.0 - smoothstep(core, glow, ang);',
        '  vec3 glass = vec3(0.10, 0.14, 0.12);',
        '  vec3 red = vec3(1.0, 0.22, 0.16);',
        '  gl_FragColor = vec4(mix(glass, red, k), 0.30 + 0.70 * k);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide
    });
  }
  function m4Optic(THREE, parent, mat, mount) {
    const g = new THREE.Group(); g.name = 'm4_optic'; g.position.copy(mount);
    const steel = mat.userData.steel || new THREE.MeshLambertMaterial({ color: 0x1c1c20, emissive: 0x0c0c0e, side: THREE.DoubleSide });
    if (!mat.userData.brass) mat.userData.brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 0.85, roughness: 0.38, envMapIntensity: 1.4, emissive: 0x1a1008, envMap: steel.envMap || null, side: THREE.DoubleSide });
    const brass = mat.userData.brass;
    const add = (mesh, name) => { mesh.name = name; mesh.frustumCulled = false; g.add(mesh); return mesh; };
    const box = (w, h, d, x, y, z, m, n) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return add(o, n); };
    const cyl = (r, l, x, y, z, m, n, seg, open) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg || 8, 1, open !== false), m); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); return add(o, n); };
    const ay = 0.027;                                                   // axis height above the rail (optic centre)
    box(0.024, 0.012, 0.036, 0, 0.006, 0, steel, 'm4_optic_mount');
    box(0.020, 0.010, 0.010, 0, 0.011, 0, brass, 'm4_optic_brass_foot'); // subtle brass accent on the clamp
    cyl(0.0154, 0.054, 0, ay, -0.008, steel, 'm4_optic_tube', 8);
    cyl(0.0172, 0.008, 0, ay, -0.033, steel, 'm4_optic_hood', 8);       // front hood
    cyl(0.0164, 0.006, 0, ay, -0.008, brass, 'm4_optic_band', 8);       // engraved / brass ring
    const glass = (z, rear) => {
      const m = rear ? reticleMat(THREE) : new THREE.MeshBasicMaterial({ color: 0x1a2420, opacity: 0.28, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
      const o = new THREE.Mesh(new THREE.CircleGeometry(0.0115, 16), m); o.position.set(0, ay, z);
      return add(o, rear ? 'm4_optic_lens' : 'm4_optic_glass');
    };
    glass(-0.034, false);                                               // front window
    glass(0.018, true);                                                 // rear window + infinity reticle
    parent.add(g);
    return { center: new THREE.Vector3(mount.x, mount.y + ay, mount.z - 0.008), group: g };
  }

  // the parts of one GLB gun at scale k (gun units per model metre)
  function parts(THREE, scene, spec, k, mat) {
    const src = (spec.root && scene.getObjectByName(spec.root)) || scene;
    const root = src.clone(true);
    root.position.set(0, 0, 0); root.quaternion.set(0, 0, 0, 1); root.scale.set(1, 1, 1); root.updateMatrixWorld(true);
    let tris = 0;
    root.traverse((m) => { if (!m.isMesh) return; m.material = (mat.userData.steel && m.material && m.material.metalness >= 0.5) ? mat.userData.steel : mat; m.frustumCulled = false; const g = m.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; });
    const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    const at = (name) => { const n = name && root.getObjectByName(name); return n ? new THREE.Vector3().setFromMatrixPosition(n.matrixWorld) : null; };
    const grip = V(spec.grip || [0, 0, 0]);
    const off = V(GRIP_TARGET).addScaledVector(grip, -k);
    const P = (v) => [off.x + k * v.x, off.y + k * v.y, off.z + k * v.z];
    const box3 = new THREE.Box3().setFromObject(root);
    // magazine: its own group pivoting at the magazine well (screen.js tilts every magazine 0.1 rad; the inner group takes that back out)
    const magN = root.getObjectByName(spec.magazine || 'magazine');
    if (!magN) throw new Error('GLB gun has no ' + (spec.magazine || 'magazine') + ' node');
    const wellN = root.getObjectByName('mag_well');
    const well = wellN ? new THREE.Vector3().setFromMatrixPosition(wellN.matrixWorld) : new THREE.Vector3().setFromMatrixPosition(magN.parent.matrixWorld);
    const magBox = new THREE.Box3().setFromObject(magN);
    const mag = new THREE.Group(), magIn = new THREE.Group(); magIn.rotation.x = -0.1; magIn.scale.setScalar(k); mag.add(magIn);
    magIn.add(detach(THREE, magN, well)); mag.position.fromArray(P(well)); mag.name = 'glb_mag';
    // slide: moves back on each shot (and stays back on an empty magazine); pivots at its rear top
    const slideN = root.getObjectByName(spec.slide || 'slide');
    const bolt = new THREE.Group(), boltIn = new THREE.Group(); boltIn.scale.setScalar(k); bolt.add(boltIn); bolt.name = 'glb_slide';
    let rest = new THREE.Vector3(0, well.y, well.z);
    if (slideN) { const sb = new THREE.Box3().setFromObject(slideN); rest = new THREE.Vector3(0, (sb.min.y + sb.max.y) / 2, sb.max.z); boltIn.add(detach(THREE, slideN, rest)); }
    bolt.position.fromArray(P(rest));
    // sights: 1911 keeps its open sight window (anchors ADS). Iron-sight mesh guns use the rear
    // empty as the ADS point and rear-to-front as the sight line (never the front post alone).
    // The M4 gets a physical optic on optic_mount; ADS uses the optic centre, not the rail.
    // Other mesh guns never get the old on-gun red_dot housing; the sharp fire-ray dot is separate.
    const rear = at('rear_sight'), front = at('front_sight'), mount = at('optic_mount');
    let r, sightDir = new THREE.Vector3(0, 0, -1);
    if (spec.optic && mount) {
      const op = m4Optic(THREE, root, mat, mount);
      r = { dot: op.center, y0: op.center.y - 0.012, y1: op.center.y + 0.012, halfW: 0.012 };
    } else if (spec.redDot === false) {
      const s = (rear || front || at(spec.sight) || new THREE.Vector3(0, box3.max.y, box3.min.z * 0.2));
      r = { dot: s, y0: s.y - 0.006, y1: s.y + 0.006, halfW: 0.004 };
      if (rear && front) sightDir.subVectors(front, rear);
    } else {
      if (!mat.userData.dotMat) mat.userData.dotMat = new THREE.MeshLambertMaterial({ color: 0x1c1c20, emissive: 0x0c0c0e });
      r = redDot(THREE, root, Object.assign({ base: box3.max.y, z: (box3.min.z + box3.max.z) / 2, halfW: 0.011, height: 0.024 }, spec.redDot || {}, { mat: mat.userData.dotMat }));
    }
    if (sightDir.lengthSq() < 1e-8) sightDir.set(0, 0, -1); else sightDir.normalize();
    const body = new THREE.Group(); body.name = 'glb_body'; body.position.copy(off); body.scale.setScalar(k); body.add(root);
    const muzzle = at(spec.muzzle || 'muzzle') || new THREE.Vector3(0, r.dot.y - 0.02, box3.min.z);
    const fore = V(spec.fore || [grip.x, grip.y - 0.035, grip.z - 0.018]);
    const anchors = {
      muzzle: P(muzzle), sightDot: P(r.dot), sightDir: [sightDir.x, sightDir.y, sightDir.z],
      rear: rear ? P(rear) : null, front: front ? P(front) : null, opticMount: mount ? P(mount) : null,
      magPivot: P(well), boltRest: P(rest),
      handGrip: P(grip), handFore: P(fore), handMag: P(spec.magHand ? V(spec.magHand) : fore),
      dotWindow: { y0: off.y + k * r.y0, y1: off.y + k * r.y1, halfW: k * r.halfW },
    };
    return {
      name: spec.name || 'GLB gun', glb: true, file: spec.file, k, tris: Math.round(tris),
      groups: { body, mag, bolt }, anchors, hands: { grip: anchors.handGrip, fore: anchors.handFore, mag: anchors.handMag },
      kind: spec.kind || 'pistol', skin: spec.skin, slideTravel: k * (spec.slideTravel || 0),
      size: { length: k * (box3.max.z - box3.min.z), height: k * (box3.max.y - box3.min.y), magDrop: k * (magBox.max.y - magBox.min.y) },
    };
  }

  // one per page: decodes every listed GLB once, then builds fresh parts whenever a gun is put in your hands
  function create(THREE, o) {
    o = o || {};
    const data = o.data || (typeof GlbData !== 'undefined' ? GlbData : null);
    const forced = /[?&#]voxelguns\b/.test(o.query || '');
    const guns = (data && data.manifest && data.manifest.guns) || {};
    const ready = {}, failed = {};
    let started = false;
    const steels = []; let env = null;
    const failOut = (id, e) => { failed[id] = String((e && e.message) || e); delete ready[id]; console.warn('GLB gun ' + id + ' could not load, using the voxel gun: ' + failed[id]); };
    function start(onReady) {
      if (started) return; started = true;
      if (forced) { console.warn('GLB guns off (?voxelguns): using the voxel guns'); return; }
      if (!Object.keys(guns).length) return;
      if (!THREE.GLTFLoader) { console.warn('GLB guns: no GLTFLoader in this page, using the voxel guns'); return; }
      for (const id of Object.keys(guns)) {
        const spec0 = guns[id];
        const tryFile = (file, next) => {
        const spec = Object.assign({}, spec0, file === spec0.file ? {} : (spec0.fallbackSpec || {}), { file }), b64 = data.files && data.files[file];
        const fail = (id, e) => { if (next) { console.warn('GLB gun ' + id + ': ' + file + ' did not load (' + ((e && e.message) || e) + '), trying ' + next); tryFile(next, null); } else failOut(id, e); };
        if (!b64) { fail(id, 'no embedded file ' + file); return; }
        try {
          new THREE.GLTFLoader().parse(decode(b64), '', (gltf) => {
            try {
              const map = firstMap(gltf.scene), r = { scene: gltf.scene, spec, mat: lookMat(THREE, map) };
              let metal = null; gltf.scene.traverse((m) => { if (!metal && m.isMesh && m.material && m.material.metalness >= 0.5) metal = m.material; });
              if (metal) { r.mat.userData.steel = steelMat(THREE, metal, map); if (env) r.mat.userData.steel.envMap = env; steels.push(r.mat.userData.steel);
                // 1911 only: next to the steel, the ivory grips are toned down and cooled (near-white ivory under an orange torch blew out to a skin-coloured block that read as a hand). Wood and polymer keep their own colour.
                if (spec.coolNonMetal) { r.mat.color.setRGB(0.5, 0.5, 0.58); r.mat.emissive.setHex(0x1c1c1e); r.mat.specular.setHex(0x151412); } }
              parts(THREE, r.scene, spec, 1, r.mat);              // a dry run: a GLB missing its magazine fails here, not mid-game
              if (env && r.mat.userData.brass) r.mat.userData.brass.envMap = env;
              ready[id] = r; if (onReady) onReady(id);
            } catch (e) { fail(id, e); }
          }, (e) => fail(id, e));
        } catch (e) { fail(id, e); }
        };
        tryFile(spec0.file, spec0.fallback || null);                  // the manifest's file, then its fallback (the older 1911), then the voxel gun
      }
    }
    const has = (id) => !forced && !!ready[id];
    const fail = failOut;
    // the steel's reflection: made once from the renderer (screen.js calls this as soon as there is one)
    function wearEnv(m) { if (m) { m.envMap = env; m.needsUpdate = true; } }
    function setRenderer(renderer) { if (env || !renderer) return; try { env = envFrom(THREE, renderer); for (const m of steels) wearEnv(m); Object.keys(ready).forEach((id) => wearEnv(ready[id].mat.userData.brass)); } catch (e) { console.warn('GLB guns: no steel reflection (' + e.message + ')'); } }
    function build(id, k) { const r = ready[id]; if (!r || forced) return null; try { return parts(THREE, r.scene, r.spec, k, r.mat); } catch (e) { fail(id, e); return null; } }
    // gun units per model metre: true size in a headset (the view scales every gun by gunScale), the voxel gun's size on a flat screen
    const scaleFor = (id, vr, gunScale) => (vr ? 1 / (gunScale || 1) : ((guns[id] && guns[id].flatScale) || 1));
    return { start, has, build, scaleFor, setRenderer, file: (id) => ready[id] && ready[id].spec.file, envReady: () => !!env, ids: Object.keys(guns), status: () => ({ ready: Object.keys(ready), failed: Object.assign({}, failed), forced, loader: !!THREE.GLTFLoader }) };
  }
  return { create, parts, decode, lookMat, GRIP_TARGET };
})();
if (typeof module !== 'undefined') module.exports = GlbGuns;
