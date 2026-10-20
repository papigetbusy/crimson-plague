/* Sprite effects: plays the animated sheets in fx_data.js (Super Pixel Effects and Tiny Swords art) as flat pictures that always face the camera,
   so a shot, a hit, a kill or a blast can show real explosions, sparks and lightning in the voxel world. Look only: the referee decides everything;
   the screen calls play() when an event arrives and update() once a frame. A fixed pool of pictures is reused, so nothing is created while playing.
   Without fx_data.js (the art is not in the public build) every call quietly does nothing and the older voxel bursts remain. */
const FxSprites = (function () {
  const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const FRAG = 'uniform sampler2D map; uniform vec2 uOff; uniform vec2 uScale; uniform float uAlpha; varying vec2 vUv; void main(){ vec4 c = texture2D(map, vUv * uScale + uOff); if (c.a < 0.06) discard; gl_FragColor = vec4(c.rgb, c.a * uAlpha); }';
  const POOL = 80;

  function create(THREE, camera, scene) {
    const data = typeof FxData !== 'undefined' ? FxData : null, plan = typeof FxPlan !== 'undefined' ? FxPlan : require('./fx_plan.js');
    const base = {}, texCache = {};
    if (data) for (const n in data) {
      const im = new Image();
      im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); base[n] = c; };
      im.src = data[n].png;
    }
    // the sheet as a texture, optionally recoloured (the 'color' blend keeps the shading and swaps the hue, so one sheet serves every element)
    function texFor(name, tint) {
      const key = name + '|' + (tint || '');
      if (texCache[key]) return texCache[key];
      const src = base[name]; if (!src) return null;
      let c = src;
      if (tint) {
        c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
        const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'color'; x.fillStyle = tint; x.fillRect(0, 0, c.width, c.height);
        x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0);
      }
      const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
      return (texCache[key] = t);
    }

    const geo = new THREE.PlaneGeometry(1, 1), slots = [];
    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: false,
        uniforms: { map: { value: null }, uOff: { value: new THREE.Vector2() }, uScale: { value: new THREE.Vector2(1, 1) }, uAlpha: { value: 1 } } });
      const mesh = new THREE.Mesh(geo, mat); mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 20; scene.add(mesh);
      slots.push({ mesh, mat, on: false, age: 0, delay: 0, dur: 1, size: 1, fx: '', x: 0, y: 0, z: 0, ground: false });
    }
    const toCam = new THREE.Vector3();
    let total = 0;
    const art = () => !!data;
    const ready = () => !!data && Object.keys(base).length > 0;

    function grab() {
      let pick = null;
      for (const s of slots) { if (!s.on) return s; if (!pick || s.age > pick.age) pick = s; }
      return pick;                                                          // every picture is busy: reuse the oldest
    }
    // start one animation at a world spot. en comes from FxPlan; gy is the floor height for effects that rise from the ground
    function spawn(en, x, y, z, gy) {
      const d = data && data[en.fx]; if (!d || !base[en.fx]) return false;
      const s = grab();
      s.on = true; s.age = 0; s.fx = en.fx; s.dur = en.dur; s.delay = en.delay || 0; s.size = en.size; s.ground = !!en.ground;
      s.x = x + (Math.random() - 0.5) * 0.12; s.z = z + (Math.random() - 0.5) * 0.12; s.y = en.ground ? (gy === undefined ? y : gy) : y;
      s.tint = en.tint; s.mat.uniforms.map.value = texFor(en.fx, en.tint);
      s.mat.blending = en.add ? THREE.AdditiveBlending : THREE.NormalBlending;
      s.mesh.visible = false; total++;
      return true;
    }
    // everything a preset shows for one kind of event
    function play(preset, kind, x, y, z, info) {
      if (!art()) return 0;
      const list = plan.plan(preset, kind, info); let n = 0;
      for (const en of list) if (spawn(en, x, y, z, 0.05)) n++;
      return n;
    }
    // sparkles shed along a bullet streak from a to b ({x,y,z} each)
    function trail(preset, a, b, shot) {
      const tr = plan.tracer(preset, shot), sp = plan.trailSprite(preset, shot);
      if (!art() || !sp || !tr.trail) return 0;
      for (let i = 1; i <= tr.trail; i++) {
        const k = i / (tr.trail + 1), j = 0.08;
        spawn(Object.assign({}, sp, { delay: i * 0.014 }), a.x + (b.x - a.x) * k + (Math.random() - 0.5) * j, a.y + (b.y - a.y) * k + (Math.random() - 0.5) * j, a.z + (b.z - a.z) * k + (Math.random() - 0.5) * j);
      }
      return tr.trail;
    }
    function update(dt) {
      for (const s of slots) {
        if (!s.on) continue;
        s.age += dt;
        if (s.age < s.delay) continue;
        const t = s.age - s.delay;
        if (t >= s.dur) { s.on = false; s.mesh.visible = false; continue; }
        const d = data[s.fx], W = base[s.fx].width, H = base[s.fx].height, fr = d.fr[plan.frameIndex(d.fr.length, t, s.dur)];
        s.mat.uniforms.uOff.value.set(fr[0] / W, 1 - (fr[1] + d.h) / H);
        s.mat.uniforms.uScale.value.set(d.w / W, d.h / H);
        const h = s.size * d.h / d.w;
        // face the camera and sit a little in front of the spot so a wall does not cut the picture in half
        toCam.set(camera.position.x - s.x, camera.position.y - s.y, camera.position.z - s.z);
        const dist = toCam.length() || 1, push = Math.min(0.5, s.size * 0.22) / dist;
        s.mesh.position.set(s.x + toCam.x * push, s.y + (s.ground ? h * 0.5 : 0) + toCam.y * push, s.z + toCam.z * push);
        s.mesh.quaternion.copy(camera.quaternion);
        s.mesh.scale.set(s.size, h, 1);
        s.mesh.visible = true;
      }
    }
    function clear() { for (const s of slots) { s.on = false; s.mesh.visible = false; } }
    const active = () => slots.filter((s) => s.on).length, spawned = () => total;   // spawned: how many animations have started since the page opened (for the smoke test)
    return { play, trail, spawn, update, clear, art, ready, active, spawned };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = FxSprites;
