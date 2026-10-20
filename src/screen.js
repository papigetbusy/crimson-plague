/* ============================================================
   SCREEN
   Draws the 3D view and sends inputs. Holds no game rules:
   every position, hit, damage and monster move comes from the
   Referee. Anything here is presentation only.
   ============================================================ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  if (!window.THREE) { $('fatal').hidden = false; return; }

  const ref = Referee.create((Date.now() & 0xffffff) | 1);

  // a link can start the run on a later wave, to try the boss: ...#wave10 (or ?wave=10)
  const startWaveFromLink = (() => { const m = /wave=?(\d+)/.exec(location.hash + location.search); return m ? Math.max(1, Math.min(60, +m[1])) : 1; })();
  if (startWaveFromLink > 1) { ref.setCfg({ startWave: startWaveFromLink }); ref.reset(); }

  // presentation-only numbers (the tuning panel edits these too)
  const GUN_DEFAULTS = { gunX: 0.29, gunY: -0.36, gunZ: -0.5, gunScale: 1.15 };
  const view = Object.assign({ pixelH: 300, brightness: 1, fogFar: 34, sound: 1, fxPreset: 'common', wallSkin: 'original', gunSkin: 'crimson' }, GUN_DEFAULTS, TouchLayout.DEFAULTS);
  const LS_KEY = 'crimsonhall.tune.v2';
  try {
    let saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (!saved) {   // carry over movement and look tuning from the first build, but not gun position
      saved = JSON.parse(localStorage.getItem('crimsonhall.tune.v1') || 'null');
      if (saved) { for (const k of ['gunX', 'gunY', 'gunZ', 'gunScale']) if (saved.view) delete saved.view[k]; if (saved.ref) { delete saved.ref.fovAds; delete saved.ref.fireRate; } }
    }
    if (saved) { if (saved.ref) ref.setCfg(saved.ref); if (saved.view) Object.assign(view, saved.view); }
  } catch (e) { /* storage can be unavailable */ }

  /* ============ texture painting (small canvases, nearest filter = chunky pixels) ============ */
  const T = WorldTex.create(THREE);
  const { texStone, texBanner, texPanel, texPillar, texGold, texFloor, texFloor2, texFloor3, texFloorEdge, texCarpet, texCeil, texCloth, texSkin, texBone, texDark } = T;

  /* ============ renderer, scene, camera ============ */
  const canvas = $('gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) { $('fatal').hidden = false; return; }
  renderer.setPixelRatio(1);
  const FOG_COL = 0x0c0406;                                   // a deep, warm crimson-black haze (was almost pure black)
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FOG_COL);
  scene.fog = new THREE.Fog(FOG_COL, 5, view.fogFar);
  const camera = new THREE.PerspectiveCamera(64, 2, 0.05, 120);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  function resize() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const ph = Math.min(view.pixelH, h), pw = Math.round(ph * w / h);
    renderer.setSize(pw, ph, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // lights for the things that move (gun and monsters); the world is lit by baked torch light
  scene.add(new THREE.AmbientLight(0x8a6a70, 0.75));
  const dirLight = new THREE.DirectionalLight(0xffd0a0, 0.55); dirLight.position.set(-0.4, 1, 0.6); scene.add(dirLight);
  const lantern = new THREE.PointLight(0xffb070, 0.8, 20, 2); camera.add(lantern);

  // simple helper for small solid boxes
  const geoCache = {};
  function boxMesh(w, h, d, mat, x, y, z, parent) {
    const k = w + '_' + h + '_' + d;
    const geo = geoCache[k] || (geoCache[k] = new THREE.BoxGeometry(w, h, d));
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }

  /* ============ world: the floor is baked and drawn by src/screen/world_view.js (rebuilt on every new floor), with the glow texture shared by the flames ============ */
  const glowTex = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,190,90,0.95)'); gr.addColorStop(0.35, 'rgba(255,120,40,0.35)'); gr.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const worldView = WorldView.create(THREE, scene, T, glowTex);
  let loadedFloor = -1;
  const goldLit = new THREE.MeshLambertMaterial({ map: texGold, emissive: 0x3a2a0a });   // the gun's gold trim (the world's own gold lives in world_view.js)

  /* ============ the gun: gothic AK-pattern rifle, red dot sight, gloved hands ============ */
  const stoneLit = new THREE.MeshLambertMaterial({ map: texStone, emissive: 0x181414 });
  const gemMat = new THREE.MeshBasicMaterial({ color: 0xd8222c });
  const gemHi = new THREE.MeshBasicMaterial({ color: 0xff7a6e });
  const blackMat = new THREE.MeshBasicMaterial({ color: 0x050303 });
  const gloveMat = new THREE.MeshLambertMaterial({ map: texDark, emissive: 0x1a100c });
  const gun = new THREE.Group();
  camera.add(gun);
  const gunBody = new THREE.Group(); gun.add(gunBody);
  const gb = (w, h, d, m, x, y, z, p) => boxMesh(w, h, d, m, x, y, z, p || gunBody);
  // the rifle itself: Grok's gothic assault rifle, built from voxels (src/models/gothic_rifle.js)
  const RIFLE = GothicRifle.build(), RA = RIFLE.anchors;
  const gunLook = GunLook.create(THREE, gunBody);                // smoothed shiny meshes, skins, glow and the little light on the hands (src/screen/gun_look.js)
  const voxelPart = (part, vox, parent) => { const g = new THREE.Group(); parent.add(g); return gunLook.part(part, vox, g); };
  voxelPart(RIFLE.parts.body, RIFLE.vox, gunBody);
  // charging handle (right side) and magazine are their own parts so they can move
  const charge = voxelPart(RIFLE.parts.bolt, RIFLE.vox, gunBody); charge.position.set(RA.boltRest[0], RA.boltRest[1], RA.boltRest[2]);
  const CHARGE_Z = RA.boltRest[2];
  const mag = voxelPart(RIFLE.parts.mag, RIFLE.vox, gunBody); mag.rotation.x = 0.1;
  const MAG_BASE = new THREE.Vector3(RA.magPivot[0], RA.magPivot[1], RA.magPivot[2]);
  mag.position.copy(MAG_BASE);

  // the red dot floats between the scope rings; ADS lines it up with the eye
  const SIGHT = { y: RA.sightDot[1], z: RA.sightDot[2] };
  const EYE_RELIEF = 0.5;
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xff2424, fog: false });
  gb(0.008, 0.008, 0.004, dotMat, 0, SIGHT.y, SIGHT.z);
  const dotGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2a2a, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  dotGlow.scale.setScalar(0.035); dotGlow.position.set(0, SIGHT.y, SIGHT.z + 0.004); gunBody.add(dotGlow);

  // gloved hands and forearms (forearms stretch between a fixed elbow and the hand)
  const limbGeo = new THREE.BoxGeometry(1, 1, 1);
  const makeLimb = () => { const m = new THREE.Mesh(limbGeo, gloveMat); gunBody.add(m); return m; };
  const limbL = makeLimb(), limbR = makeLimb();
  const handL = new THREE.Group(); gunBody.add(handL);
  gb(0.13, 0.08, 0.14, gloveMat, 0, 0, 0, handL);
  gb(0.035, 0.1, 0.11, gloveMat, -0.08, 0.05, 0, handL);
  gb(0.035, 0.1, 0.11, gloveMat, 0.08, 0.05, 0, handL);
  gb(0.05, 0.035, 0.09, gloveMat, 0.07, 0.1, -0.03, handL);
  gb(0.15, 0.1, 0.05, goldLit, 0, -0.015, 0.11, handL);
  const handR = new THREE.Group(); handR.position.set(0, -0.15, 0.15); gunBody.add(handR);
  gb(0.12, 0.14, 0.07, gloveMat, 0, 0, 0, handR);
  for (const y of [0.045, 0.005, -0.035]) gb(0.11, 0.035, 0.08, gloveMat, 0, y, -0.075, handR);
  gb(0.035, 0.04, 0.1, gloveMat, -0.075, 0.07, -0.03, handR);
  gb(0.14, 0.1, 0.045, goldLit, 0, -0.01, 0.07, handR);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const HOLD = V3(0, -0.12, -0.45), MAGH = V3(0, -0.15, -0.13), BELT = V3(-0.15, -0.8, -0.05);
  const CH_F = V3(0.1, 0.1, -0.17), CH_B = V3(0.1, 0.1, 0.0);
  const ELBOW_L = V3(-0.55, -1.0, 0.7), ELBOW_R = V3(0.3, -0.9, 1.0);
  const Zaxis = V3(0, 0, 1), tA = V3(0, 0, 0), tB = V3(0, 0, 0);
  function placeLimb(m, a, b, th) {
    tA.subVectors(b, a); const len = tA.length() || 1;
    m.position.copy(a).addScaledVector(tA, 0.5);
    m.quaternion.setFromUnitVectors(Zaxis, tA.divideScalar(len));
    m.scale.set(th, th * 0.9, len);
  }
  const muzzle = new THREE.Object3D(); muzzle.position.set(RA.muzzle[0], RA.muzzle[1], RA.muzzle[2]); gunBody.add(muzzle);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const flashMesh = new THREE.Group(); muzzle.add(flashMesh);
  boxMesh(0.14, 0.14, 0.06, flashMat, 0, 0, -0.04, flashMesh);
  boxMesh(0.04, 0.26, 0.04, flashMat, 0, 0, -0.08, flashMesh);
  boxMesh(0.26, 0.04, 0.04, flashMat, 0, 0, -0.08, flashMesh);
  flashMesh.visible = false;
  const muzzleLight = new THREE.PointLight(0xff9a40, 0, 14, 2); muzzle.add(muzzleLight);

  // reload choreography: hand keyframes (k = 0..1 through the reload)
  const RL_NORMAL = { hand: [[0, HOLD], [0.16, MAGH], [0.24, MAGH], [0.38, BELT], [0.46, BELT], [0.64, MAGH], [0.72, MAGH], [0.9, HOLD], [1, HOLD]], grab: 0.24, pullEnd: 0.38, newStart: 0.46, seat: 0.64, tilt: [0.14, 0.8, 1.0], snd: { magout: 0.3, magin: 0.66 }, bolt: null };
  const RL_EMPTY = { hand: [[0, HOLD], [0.12, MAGH], [0.18, MAGH], [0.3, BELT], [0.36, BELT], [0.5, MAGH], [0.55, MAGH], [0.64, CH_F], [0.72, CH_B], [0.78, CH_F], [0.9, HOLD], [1, HOLD]], grab: 0.18, pullEnd: 0.3, newStart: 0.36, seat: 0.5, tilt: [0.1, 0.86, 1.0], snd: { magout: 0.24, magin: 0.52, bolt: 0.72 }, bolt: [0.64, 0.78] };
  // inspect (magazine): the left hand pulls the magazine out, lifts it in front of the eye (MAG_LOOK is the hand spot that puts the magazine
  // top at camera-space (-0.03, 0.02, -0.38) while the gun is tilted away, worked out with the pose from GunMotion.inspect('mag')), then slides it home
  const MAG_LOOK = V3(-0.094, 0.2415, 0.211), MAG_DOWN = V3(-0.04, -0.3, -0.1);
  const INSPECT_MAG = { hand: [[0, HOLD], [0.1, MAGH], [0.17, MAGH], [0.27, MAG_DOWN], [0.4, MAG_LOOK], [0.72, MAG_LOOK], [0.8, MAG_DOWN], [0.86, MAGH], [0.93, HOLD], [1, HOLD]], grab: 0.17, pullEnd: 9, newStart: 9, seat: 0.86, snd: { magout: 0.24, magin: 0.88 }, bolt: null };
  const smooth01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const handPos = V3(0, 0, 0), kfOut = V3(0, 0, 0);
  function kfLerp(frames, k, out) {
    if (k <= frames[0][0]) return out.copy(frames[0][1]);
    for (let i = 1; i < frames.length; i++) {
      if (k <= frames[i][0]) {
        const a = frames[i - 1], b = frames[i];
        return out.lerpVectors(a[1], b[1], smooth01((k - a[0]) / (b[0] - a[0])));
      }
    }
    return out.copy(frames[frames.length - 1][1]);
  }
  let rlPrev = 0;
  // returns gun offsets for this frame and poses the hands, mag and charging handle
  function animateReload(p) {
    const ins = !p.reloading && inspK > 0 && inspKind === 'mag';
    const R = ins ? INSPECT_MAG : p.reloadEmpty ? RL_EMPTY : RL_NORMAL;
    const k = p.reloading ? p.reloadK : ins ? inspK : 0;
    kfLerp(R.hand, k, handPos);
    handL.position.copy(handPos);
    let magHidden = false;
    mag.position.copy(MAG_BASE);
    if ((p.reloading || ins) && k >= R.grab && k < R.seat) {
      magHidden = k > R.pullEnd && k < R.newStart;
      mag.position.x += handPos.x - MAGH.x; mag.position.y += handPos.y - MAGH.y; mag.position.z += handPos.z - MAGH.z;
    }
    mag.visible = !magHidden;
    charge.position.z = CHARGE_Z + ((p.reloading && R.bolt && k >= R.bolt[0] && k <= R.bolt[1]) ? (handPos.z - CH_F.z) : 0);
    tB.copy(handPos); tB.y -= 0.02; tB.z += 0.1;
    placeLimb(limbL, ELBOW_L, tB, 0.12);
    tB.copy(handR.position); tB.z += 0.08;
    placeLimb(limbR, ELBOW_R, tB, 0.12);
    // sounds on the way through
    if (p.reloading || ins) {
      for (const n in R.snd) if (rlPrev < R.snd[n] && k >= R.snd[n]) sfx(n);
    }
    rlPrev = p.reloading || ins ? k : 0;
    mag.rotation.set(0.1 + (ins ? 0.5 * smooth01((k - 0.3) / 0.1) * (1 - smooth01((k - 0.74) / 0.08)) : 0), ins ? GunMotion.magSpin(k) : 0, 0);   // the held magazine turns so you see both faces
    if (!p.reloading) return { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 };
    const tilt = smooth01(k / R.tilt[0]) * (1 - smooth01((k - R.tilt[1]) / (R.tilt[2] - R.tilt[1])));
    const bump = Math.exp(-Math.pow((k - R.seat) / 0.025, 2));
    return { px: -0.1 * tilt, py: -0.05 * tilt, pz: 0.03 * tilt + bump * 0.035, rx: 0.28 * tilt + bump * 0.06, ry: -0.12 * tilt, rz: -0.5 * tilt };
  }
  const shellV = V3(0, 0, 0);

  /* ============ monsters: four voxel kinds, built and posed by src/screen/monster_rigs.js ============ */
  const RIGS = MonsterRigs.create(THREE), MODEL = RIGS.MODEL;
  const shotsView = ShotsView.create(THREE, scene, glowTex);   // spit, bolts and fireballs the monsters throw
  { const q = ['goblin', 'skeleton', 'mushroom', 'eyeball', 'flame'], warm = () => { if (!q.length) return; if (!RIGS.warmStep(q[0])) q.shift(); setTimeout(warm, 120); }; setTimeout(warm, 3000); }   // cut and smooth the newer kinds a slice at a time in the background, so the first one to appear does not stall a frame
  const mons = new Map();     // id -> entry
  const dying = [];
  const smoothLight = (x, z) => worldView.light(x, 1.5, z, 0, 1, 0);
  const loot = LootView.create(THREE, scene, glowTex);       // XP orbs and pickups
  const fx = FxSprites.create(THREE, camera, scene);          // sprite explosions, sparks and lightning (look presets, see fx_plan.js)
  const fxOn = () => fx.art() && view.fxPreset !== 'original';
  let shakeAmp = 0, shakeT = 0;

  /* ============ effects ============ */
  const parts = [];
  const partGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  for (let i = 0; i < 100; i++) {
    const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    m.visible = false; scene.add(m);
    parts.push({ m, v: new THREE.Vector3(), life: 0, grav: 0 });
  }
  let partCursor = 0;
  function burst(x, y, z, n, colors, speed, life, grav, size) {
    for (let i = 0; i < n; i++) {
      const p = parts[partCursor++ % parts.length];
      p.m.visible = true; p.m.position.set(x, y, z);
      p.m.material.color.setHex(colors[(Math.random() * colors.length) | 0]);
      const s = (size || 1) * (0.6 + Math.random() * 0.9); p.m.scale.setScalar(s);
      const a = Math.random() * 6.283, e = Math.random() * 1.2 - 0.2, sp = speed * (0.4 + Math.random() * 0.8);
      p.v.set(Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + speed * 0.3, Math.sin(a) * Math.cos(e) * sp);
      p.life = life * (0.6 + Math.random() * 0.6); p.grav = grav;
    }
  }
  const tracers = [];
  const tracerGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; scene.add(m); tracers.push({ m, life: 0 });
  }
  let tracerCursor = 0;
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  function addTracer(ex, ey, ez) {
    muzzle.getWorldPosition(tmpV);
    tmpV2.set(ex, ey, ez);
    const t = tracers[tracerCursor++ % tracers.length], tr = FxPlan.tracer(fxOn() ? view.fxPreset : 'original');
    const len = tmpV.distanceTo(tmpV2);
    t.m.position.copy(tmpV).add(tmpV2).multiplyScalar(0.5);
    t.m.lookAt(tmpV2);
    t.m.scale.set(tr.width, tr.width, len);
    t.m.material.color.setHex(tr.color);
    t.m.visible = true; t.life = t.dur = tr.life; t.m.material.opacity = 0.9;
    if (fxOn() && tr.trail) fx.trail(view.fxPreset, tmpV, tmpV2);
  }

  /* ---- floating damage numbers ---- */
  const dnLayer = $('dn');
  const dnPool = [];
  for (let i = 0; i < 14; i++) { const d = document.createElement('div'); d.className = 'dn'; d.hidden = true; dnLayer.appendChild(d); dnPool.push({ d, life: 0, x: 0, y: 0, z: 0 }); }
  let dnCursor = 0;
  function damageNumber(x, y, z, text, crit) {
    const n = dnPool[dnCursor++ % dnPool.length];
    n.d.textContent = text; n.d.className = 'dn' + (crit ? ' crit' : ''); n.d.hidden = false;
    n.life = 0.7; n.x = x + (Math.random() - 0.5) * 0.4; n.y = y; n.z = z + (Math.random() - 0.5) * 0.4;
  }

  /* ============ audio (tiny synth, starts after the first tap) ============ */
  let AC = null, noiseBuf = null;
  function audioInit() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.4, AC.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }
  function sfx(kind) {
    if (!AC || !view.sound) return;
    const t = AC.currentTime, out = AC.createGain(); out.connect(AC.destination);
    const noise = (dur, f0, f1, vol, type) => {
      const s = AC.createBufferSource(); s.buffer = noiseBuf;
      const f = AC.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.2, dur);
    };
    const tone = (type, f0, f1, dur, vol) => {
      const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
    };
    if (kind === 'shot') { noise(0.14, 5200, 500, 0.55); tone('square', 170, 45, 0.12, 0.35); }
    else if (kind === 'hit') { tone('sine', 1100, 700, 0.05, 0.22); }
    else if (kind === 'crit') { tone('sine', 1600, 900, 0.08, 0.28); }
    else if (kind === 'kill') { tone('sawtooth', 240, 50, 0.3, 0.3); noise(0.22, 1800, 200, 0.4); }
    else if (kind === 'hurt') { tone('sine', 110, 50, 0.2, 0.6); noise(0.12, 600, 120, 0.3); }
    else if (kind === 'magout') { tone('square', 340, 110, 0.07, 0.22); noise(0.06, 3500, 700, 0.25); }
    else if (kind === 'magin') { tone('square', 210, 80, 0.09, 0.32); noise(0.07, 2500, 500, 0.3); }
    else if (kind === 'bolt') { noise(0.1, 4200, 1100, 0.35); tone('square', 520, 190, 0.06, 0.2); }
    else if (kind === 'slide') { noise(0.5, 900, 3000, 0.22, 'bandpass'); }
    else if (kind === 'dead') { tone('sawtooth', 160, 30, 0.8, 0.35); }
    else if (kind === 'orb') { tone('sine', 900, 1500, 0.07, 0.12); }
    else if (kind === 'pickup') { tone('sine', 520, 1040, 0.16, 0.25); }
    else if (kind === 'levelup') { tone('square', 330, 660, 0.18, 0.22); tone('sine', 660, 1320, 0.3, 0.2); }
    else if (kind === 'wave') { tone('sawtooth', 90, 70, 0.5, 0.3); noise(0.4, 400, 120, 0.18); }
    else if (kind === 'boss') { tone('sawtooth', 70, 38, 1.0, 0.45); noise(0.7, 300, 80, 0.3); }
    else if (kind === 'blast') { noise(0.25, 1500, 150, 0.35); }
    else if (kind === 'spit') { noise(0.12, 900, 300, 0.3, 'bandpass'); tone('sine', 300, 140, 0.1, 0.2); }
    else if (kind === 'zap') { noise(0.14, 6000, 1500, 0.3); tone('sawtooth', 900, 200, 0.1, 0.18); }
    else if (kind === 'fireball') { noise(0.35, 1200, 200, 0.3); tone('sawtooth', 220, 90, 0.3, 0.2); }
  }

  /* ============ input ============ */
  const I = { mx: 0, mz: 0, lookX: 0, lookY: 0, touchX: 0, touchY: 0, fire: false, ads: false, sprint: false, slide: false, reload: false, pick: undefined, restart: false };
  const keys = {};
  const mouse = { fire: false, ads: false };
  const tch = { fire: false, ads: false, sprint: false, reload: false };
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  let running = false, started = false, panelOpen = false, noLock = false;
  if (isTouch) document.body.classList.add('touch');

  // ---- controller: any standard gamepad that is connected is picked up by itself; the touch controls hide while one is ----
  const pad = { on: false, input: PadInput.create(), now: null };
  const currentPad = () => { try { return PadInput.pick(navigator.getGamepads ? Array.from(navigator.getGamepads()) : []); } catch (e) { return null; } };
  const toastEl = $('padToast'); let toastT = 0;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); toastT = 2.6; }
  // once a frame: find the pad, switch the touch controls on or off, and read its input (null when there is no pad)
  function pollPad(dt) {
    const p = currentPad();
    if (!!p !== pad.on) {
      pad.on = !!p; document.body.classList.toggle('pad', pad.on); pad.input.reset();
      toast(pad.on ? 'Controller connected' : (isTouch ? 'Controller lost. Touch controls are back' : 'Controller disconnected'));
    }
    toastT -= dt; if (toastT <= 0) toastEl.classList.remove('show');
    pad.now = p ? pad.input.read(p) : null;
  }

  const locked = () => document.pointerLockElement === canvas;
  function tryLock() {
    if (isTouch || noLock) return;
    try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { noLock = true; }); } catch (e) { noLock = true; }
  }
  document.addEventListener('pointerlockerror', () => { noLock = true; });
  document.addEventListener('pointerlockchange', () => {
    if (!locked() && running && !noLock && !panelOpen && !isTouch) setRunning(false);
  });
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyC' || e.code === 'ControlLeft') { if (running) I.slide = true; e.preventDefault(); }
    if (e.code === 'KeyR' && running) I.reload = true;
    if (e.code === 'KeyM' && running) minimap.toggle();                                  // open or close the big map
    if (e.code === 'KeyF' && running) startInspect();   // F shows both sides, press again for the magazine
    if (running && e.code.startsWith('Digit') && +e.code.slice(5) >= 1 && +e.code.slice(5) <= 3) I.pick = +e.code.slice(5) - 1;   // level-up choice
    if (running && (e.code === 'Enter' || e.code === 'NumpadEnter')) I.restart = true;                                     // after you fall
    if (e.code === 'Tab') { e.preventDefault(); if (started) togglePanel(); }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  document.addEventListener('keyup', (e) => { keys[e.code] = false; });
  document.addEventListener('mousemove', (e) => {
    if (!running) return;
    if (locked() || (noLock && (mouse.fire || mouse.ads))) { I.lookX += e.movementX || 0; I.lookY += e.movementY || 0; }
  });
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || !running || panelOpen) return;
    if (e.target.closest && e.target.closest('#panel,#gear,.overlay')) return;
    if (state.over) { I.restart = true; return; }
    if (e.button === 0) { mouse.fire = true; if (!locked()) tryLock(); }
    if (e.button === 2) mouse.ads = true;
  });
  document.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (e.button === 0) mouse.fire = false;
    if (e.button === 2) mouse.ads = false;
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => { mouse.fire = mouse.ads = false; for (const k in keys) keys[k] = false; });

  // ---- touch: joystick (left), look (right), buttons ----
  const joyZone = $('joyZone'), lookZone = $('lookZone'), joyBase = $('joyBase'), joyKnob = $('joyKnob');
  const joyR = () => Math.max(46, window.innerHeight * 0.14) * (view.tJoy || 1);
  function placeJoy(x, y) {
    joyBase.style.left = x + 'px'; joyBase.style.top = y + 'px'; joyBase.classList.add('on');
  }
  function resetJoy() {
    joy.id = null; joy.x = joy.y = 0; joyBase.classList.remove('on');
    joyBase.style.left = ''; joyBase.style.top = ''; joyKnob.style.transform = 'translate(-50%,-50%)';
  }
  joyZone.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || joy.id !== null) return;
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0;
    placeJoy(e.clientX, e.clientY);
    try { joyZone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  joyZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joy.id) return;
    const R = joyR();
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const l = Math.hypot(dx, dy);
    if (l > R) { joy.ox += dx / l * (l - R); joy.oy += dy / l * (l - R); dx = dx / l * R; dy = dy / l * R; placeJoy(joy.ox, joy.oy); }
    joy.x = dx / R; joy.y = dy / R;
    joyKnob.style.transform = 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px))';
  });
  const joyEnd = (e) => { if (e.pointerId === joy.id) resetJoy(); };
  joyZone.addEventListener('pointerup', joyEnd);
  joyZone.addEventListener('pointercancel', joyEnd);

  const look = { id: null, x: 0, y: 0 };
  function lookDown(e) { if (e.pointerType === 'mouse') return false; look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; return true; }
  lookZone.addEventListener('pointerdown', (e) => {
    if (look.id !== null) return;
    if (lookDown(e)) { try { lookZone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
  });
  lookZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== look.id) return;
    I.touchX += e.clientX - look.x; I.touchY += e.clientY - look.y; look.x = e.clientX; look.y = e.clientY;
  });
  const lookEnd = (e) => { if (e.pointerId === look.id) look.id = null; };
  lookZone.addEventListener('pointerup', lookEnd);
  lookZone.addEventListener('pointercancel', lookEnd);

  // fire button: hold to shoot, drag the same thumb to aim
  const bFire = $('bFire'), bAds = $('bAds'), bSprint = $('bSprint'), bSlide = $('bSlide'), bReload = $('bReload');
  const fireP = { id: null, x: 0, y: 0 };
  bFire.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || fireP.id !== null) return;
    fireP.id = e.pointerId; fireP.x = e.clientX; fireP.y = e.clientY; tch.fire = true; bFire.classList.add('on');
    try { bFire.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault();
  });
  bFire.addEventListener('pointermove', (e) => {
    if (e.pointerId !== fireP.id) return;
    I.touchX += e.clientX - fireP.x; I.touchY += e.clientY - fireP.y; fireP.x = e.clientX; fireP.y = e.clientY;
  });
  const fireEnd = (e) => { if (e.pointerId === fireP.id) { fireP.id = null; tch.fire = false; bFire.classList.remove('on'); } };
  bFire.addEventListener('pointerup', fireEnd);
  bFire.addEventListener('pointercancel', fireEnd);
  bAds.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; tch.ads = !tch.ads; bAds.classList.toggle('on', tch.ads); e.preventDefault(); });
  bSprint.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; tch.sprint = !tch.sprint; bSprint.classList.toggle('on', tch.sprint); e.preventDefault(); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) bReload.addEventListener(ev, () => { tch.reload = false; });
  bReload.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; I.reload = true; tch.reload = true; bReload.classList.add('on'); setTimeout(() => bReload.classList.remove('on'), 180); e.preventDefault(); });
  bSlide.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; I.slide = true; bSlide.classList.add('on'); setTimeout(() => bSlide.classList.remove('on'), 180); e.preventDefault(); });

  function gatherInput() {
    let mx = 0, mz = 0;
    if (joy.id !== null) {
      const l = Math.hypot(joy.x, joy.y);
      if (l > 0.1) { const k = (l - 0.1) / 0.9 / l; mx = joy.x * k; mz = -joy.y * k; }
    }
    const kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    const kz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const pr = pad.now;
    if (pr && (pr.mx || pr.mz)) { mx = pr.mx; mz = pr.mz; }
    if (kx || kz) { mx = kx; mz = kz; }
    if (tch.sprint && joy.id === null && !(kx || kz)) { tch.sprint = false; bSprint.classList.remove('on'); }
    if (tch.sprint && tch.ads) { tch.sprint = false; bSprint.classList.remove('on'); }
    const out = {
      mx, mz, lookX: I.lookX, lookY: I.lookY, touchX: I.touchX, touchY: I.touchY, padX: pr ? pr.padX : 0, padY: pr ? pr.padY : 0,
      fire: mouse.fire || tch.fire || !!(pr && pr.fire), ads: mouse.ads || tch.ads || !!(pr && pr.ads),
      sprint: !!(keys.ShiftLeft || keys.ShiftRight) || tch.sprint || !!(pr && pr.sprint), slide: I.slide || !!(pr && pr.slide), reload: I.reload || !!(pr && pr.reload), pick: I.pick, restart: I.restart
    };
    I.lookX = I.lookY = I.touchX = I.touchY = 0; I.slide = false; I.reload = false; I.pick = undefined; I.restart = false;
    return out;
  }

  /* ============ HUD, overlays, tuning panel ============ */
  const elAmmo = $('ammo'), elAmmoN = $('ammoN'), elAmmoM = $('ammoM'), elRl = $('rlFill'), elKills = $('kills'), elHpFill = $('hpFill'), elHurt = $('hurt'), elCross = $('cross'), elHit = $('hitmark');
  const overlay = $('start'), playBtn = $('play'), playLabel = $('playLabel'), diedEl = $('died');
  let lastKills = -1, hitT = 0, hitKill = false, diedT = 0;
  const minimap = Minimap.create($, () => ref.map), compass = Compass.create($);
  const hud = Hud.create($, { pick: (i) => { I.pick = i; }, restart: () => { I.restart = true; } });

  function setRunning(v) {
    running = v;
    overlay.hidden = v;
    if (!v) {
      mouse.fire = mouse.ads = false; tch.fire = false; bFire.classList.remove('on');
      playLabel.textContent = started ? 'RESUME' : 'ENTER THE HALL';
    }
  }
  // starts or resumes. A controller press is not a click, so it cannot ask for fullscreen or the mouse lock
  function begin(fromPad) {
    audioInit();
    if (!started) {
      started = true;
      if (isTouch && !fromPad) { try { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (e) { /* ignore */ } try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ } }
    }
    setRunning(true);
    if (!fromPad) tryLock();
  }
  playBtn.addEventListener('click', () => begin(false));
  // controller menus: Start pauses and resumes, A starts, picks the highlighted level-up card, and rises again after a fall
  function padMenus() {
    const r = pad.now; if (!r) return;
    if (r.start) { if (running) setRunning(false); else begin(true); return; }
    if (!running) { if (r.confirm) begin(true); return; }
    if (minimap.isOpen) { if (r.map || r.confirm) minimap.setOpen(false); return; }               // the big map covers the screen: any pad press that is not a move closes it, so it can never trap a controller
    if (r.map) { minimap.toggle(); return; }
    if (state.choices) { if (r.nav) hud.moveSel(r.nav); if (r.confirm && hud.selected() >= 0) I.pick = hud.selected(); }
    else if (state.over && r.confirm) I.restart = true;
  }

  const TUNE = [
    ['Movement', null],
    ['Eye height', 'ref', 'eyeStand', 1.2, 2.4, 0.05],
    ['Walk speed', 'ref', 'walkSpeed', 3, 12, 0.1],
    ['Sprint speed', 'ref', 'sprintSpeed', 5, 16, 0.1],
    ['Slide speed', 'ref', 'slideSpeed', 6, 28, 0.5],
    ['Slide time', 'ref', 'slideTime', 0.3, 1.6, 0.05],
    ['Camera', null],
    ['FOV', 'ref', 'fovBase', 50, 100, 1],
    ['FOV aiming', 'ref', 'fovAds', 20, 70, 1],
    ['Mouse sens', 'ref', 'lookSens', 0.0008, 0.006, 0.0001],
    ['Touch sens', 'ref', 'touchSens', 0.002, 0.012, 0.0002],
    ['Stick turn', 'ref', 'padTurn', 1, 8, 0.1],
    ['Gun', null],
    ['Fire rate', 'ref', 'fireRate', 2, 20, 0.5],
    ['Magazine', 'ref', 'magSize', 5, 60, 1],
    ['Reload time', 'ref', 'reloadTime', 0.6, 4, 0.1],
    ['Damage', 'ref', 'damage', 4, 60, 1],
    ['Spread', 'ref', 'spread', 0, 0.1, 0.002],
    ['Gun left/right', 'view', 'gunX', 0, 0.7, 0.01],
    ['Gun up/down', 'view', 'gunY', -0.6, 0, 0.01],
    ['Gun forward', 'view', 'gunZ', -1.1, -0.3, 0.01],
    ['Gun size', 'view', 'gunScale', 0.5, 1.6, 0.05],
    ['Run', null],
    ['Start wave (next new run)', 'ref', 'startWave', 1, 60, 1],
    ['Monsters', null],
    ['Alive in wave 1 (+1 each wave)', 'ref', 'monsterCount', 1, 16, 1],
    ['Size', 'ref', 'monsterScale', 0.6, 2.2, 0.05],
    ['Speed', 'ref', 'monsterSpeed', 1, 8, 0.1],
    ['Health', 'ref', 'monsterHp', 20, 300, 5],
    ['Damage to you', 'ref', 'monsterDamage', 0, 30, 1],
    ['Look', null],
    ['Brightness', 'view', 'brightness', 0.5, 2.4, 0.05],
    ['View distance', 'view', 'fogFar', 15, 70, 1],
    ['Pixel size (lower = chunkier)', 'view', 'pixelH', 150, 540, 10]
  ];
  const panel = $('panel'), panelBody = $('panelBody');
  const sliderEls = {};
  // touch button sizes and show/hide switches sit at the top of the panel (phones only); a hidden toggle button is switched off so it cannot stay stuck on
  const fxSet = FxPicker.mount(panelBody, view, { save: () => saveTune(), art: fx.art() });
  const skinSet = GunSkinPicker.mount(panelBody, view, { save: () => saveTune(), set: (id) => gunLook.setSkin(id), inspect: (kind) => startInspect(kind) });
  const wallSet = WallSkin.mount(panelBody, view, WallSkin.create(texStone), { save: () => saveTune() });
  const touchSet = TouchLayout.mount(panelBody, view, { save: () => saveTune(), hid: (id) => {
    if (id === 'ads') { tch.ads = false; bAds.classList.remove('on'); }
    if (id === 'sprint') { tch.sprint = false; bSprint.classList.remove('on'); }
  } });
  function fmt(v, step) { return step < 0.01 ? v.toFixed(4) : step < 0.1 ? v.toFixed(2) : step < 1 ? v.toFixed(1) : String(Math.round(v)); }
  for (const t of TUNE) {
    if (!t[1]) { const h = document.createElement('h3'); h.textContent = t[0]; panelBody.appendChild(h); continue; }
    const [label, tgt, key, mn, mx, st] = t;
    const row = document.createElement('label'); row.className = 'row';
    const name = document.createElement('span'); name.textContent = label;
    const val = document.createElement('output');
    const inp = document.createElement('input'); inp.type = 'range'; inp.min = mn; inp.max = mx; inp.step = st; inp.id = 'tune_' + key;
    const get = () => (tgt === 'ref' ? ref.cfg[key] : view[key]);
    inp.value = get(); val.textContent = fmt(+inp.value, st);
    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      if (tgt === 'ref') ref.setCfg({ [key]: v }); else view[key] = v;
      val.textContent = fmt(v, st);
      if (key === 'pixelH') resize();
      if (key === 'fogFar') { scene.fog.far = v; worldView.setFogFar(v); }
      saveTune();
    });
    row.appendChild(name); row.appendChild(val); row.appendChild(inp); panelBody.appendChild(row);
    sliderEls[key] = { inp, val, tgt, st };
  }
  scene.fog.far = view.fogFar;
  function saveTune() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ref: pick(ref.cfg, 'ref'), view })); } catch (e) { /* ignore */ }
  }
  function pick(cfg, tgt) { const o = {}; for (const k in sliderEls) if (sliderEls[k].tgt === tgt && k !== 'startWave') o[k] = cfg[k]; return o; }
  $('tuneReset').addEventListener('click', () => {
    ref.setCfg(ref.defaults);
    Object.assign(view, { pixelH: 300, brightness: 1, fogFar: 34, sound: 1, fxPreset: 'common', wallSkin: 'original', gunSkin: 'crimson' }, GUN_DEFAULTS, TouchLayout.DEFAULTS); touchSet.sync(); fxSet.sync(); wallSet.sync(); skinSet.sync();
    for (const k in sliderEls) { const s = sliderEls[k]; s.inp.value = s.tgt === 'ref' ? ref.cfg[k] : view[k]; s.val.textContent = fmt(+s.inp.value, s.st); }
    scene.fog.far = view.fogFar; worldView.setFogFar(view.fogFar); resize(); saveTune();
  });
  $('newRun').addEventListener('click', () => { ref.reset(); togglePanel(); });
  $('tuneCopy').addEventListener('click', () => {
    const txt = JSON.stringify({ ref: pick(ref.cfg, 'ref'), view }, null, 1);
    const ta = $('tuneText'); ta.value = txt; ta.hidden = false; ta.select();
    try { navigator.clipboard.writeText(txt).then(() => { $('tuneCopy').textContent = 'Copied'; setTimeout(() => { $('tuneCopy').textContent = 'Copy settings'; }, 1200); }).catch(() => { /* text is selected instead */ }); } catch (e) { /* text is selected instead */ }
  });
  $('tuneSound').addEventListener('click', () => { view.sound = view.sound ? 0 : 1; $('tuneSound').textContent = view.sound ? 'Sound on' : 'Sound off'; saveTune(); });
  $('tuneSound').textContent = view.sound ? 'Sound on' : 'Sound off';
  function togglePanel() {
    panelOpen = !panelOpen; panel.hidden = !panelOpen;
    if (panelOpen) { if (locked()) document.exitPointerLock(); mouse.fire = mouse.ads = false; }
    else if (started && !isTouch && !noLock) tryLock();
  }
  $('gear').addEventListener('click', togglePanel);
  $('panelClose').addEventListener('click', togglePanel);
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) setRunning(false); });

  /* ============ per-frame presentation ============ */
  const clock = { last: performance.now() };
  const reloadHold = { t: 0, done: false };
  let equipK = 0, inspK = 0, inspKind = 'sides', kickDir = [0, 0], emberT = 0, nextInspect = 'sides';
  const startInspect = (kind) => { if (running && inspK === 0 && !state.over && !state.player.reloading) { inspKind = kind || nextInspect; nextInspect = inspKind === 'sides' ? 'mag' : 'sides'; inspK = 0.0001; } };
  let bob = 0, kickG = 0, flashT = 0, sway = 0, roll = 0, lastSlideK = 0;
  const gunHip = new THREE.Vector3(), gunAds = new THREE.Vector3();
  function ejectShell() {
    gunBody.localToWorld(shellV.set(0.09, 0.07, -0.05));
    const q = parts[partCursor++ % parts.length], e = camera.matrixWorld.elements;
    q.m.visible = true; q.m.position.copy(shellV); q.m.material.color.setHex(0xe0b050); q.m.scale.setScalar(0.7);
    q.v.set(e[0] * 2.4 + e[4] * 1.8 + e[8] * 0.4 + (Math.random() - 0.5) * 0.6, e[1] * 2.4 + e[5] * 1.8 + e[9] * 0.4, e[2] * 2.4 + e[6] * 1.8 + e[10] * 0.4 + (Math.random() - 0.5) * 0.6);
    q.life = 0.8; q.grav = 14;
  }

  function bigShake(a) { if (a > shakeAmp * 0.5) { shakeAmp = a; shakeT = 0.22; } }
  function handleEvents(events) {
    for (const e of events) {
      hud.event(e);
      if (e.type === 'shot') {
        if (!e.extra) { flashT = 0.06; kickG = 1; kickDir = [Math.random() * 2 - 1, Math.random() * 2 - 1]; inspK = 0; sfx('shot'); ejectShell(); if (fxOn()) { muzzle.getWorldPosition(tmpV); camera.getWorldDirection(tmpV2); fx.play(view.fxPreset, 'muzzle', tmpV.x + tmpV2.x * 0.12, tmpV.y + tmpV2.y * 0.12, tmpV.z + tmpV2.z * 0.12); } }
        addTracer(e.ex, e.ey, e.ez);
        if (e.hit === 'wall') { burst(e.ex, e.ey, e.ez, 5, [0xffb347, 0xff7a1a, 0x888078], 4, 0.35, 12, 0.7); if (fxOn()) fx.play(view.fxPreset, 'wall', e.ex, e.ey, e.ez); }
      } else if (e.type === 'hit') {
        burst(e.x, e.y, e.z, e.crit ? 9 : 5, [0xb01818, 0x701010, 0xe03030], 3.5, 0.4, 10, 0.8);
        if (fxOn() && !e.splash) fx.play(view.fxPreset, 'flesh', e.x, e.y, e.z, { crit: e.crit });
        if (!e.splash) damageNumber(e.x, e.y + 0.2, e.z, e.dmg, e.crit);
        hitT = 0.14; hitKill = false; sfx(e.crit ? 'crit' : 'hit');
      } else if (e.type === 'kill') {
        hitT = 0.28; hitKill = true; sfx('kill');
        const en = mons.get(e.id);
        if (en) { mons.delete(e.id); dying.push({ en, t: 0 }); }
        burst(e.x, 1.2 * e.scale, e.z, e.boss ? 40 : 24, [0xb01818, 0x701010, 0x3a0a0a, 0xff6a20], 5, 0.8, 11, e.boss ? 2 : 1.3);
        if (fxOn()) { fx.play(view.fxPreset, 'kill', e.x, 1.2 * e.scale, e.z, { scale: e.scale, boss: e.boss }); bigShake(FxPlan.shake(view.fxPreset, 'kill') * (e.boss ? 1.6 : 1)); }
      } else if (e.type === 'blast') { burst(e.x, e.y, e.z, 10, [0xff9a1c, 0xff4500, 0xffd060], 5, 0.4, 4, 1.1); sfx('blast'); if (fxOn()) { fx.play(view.fxPreset, 'blast', e.x, e.y, e.z, { r: e.r }); bigShake(FxPlan.shake(view.fxPreset, 'blast')); } }
      else if (e.type === 'playerHit') { sfx('hurt'); }
      else if (e.type === 'slide') { sfx('slide'); }
      else if (e.type === 'shoot') { sfx(e.proj === 'bolt' ? 'zap' : e.proj === 'spit' ? 'spit' : 'fireball'); }
      else if (e.type === 'projHit') { burst(e.x, e.y, e.z, e.proj === 'fire' ? 12 : 7, e.proj === 'spit' ? [0x9cff4a, 0x4fd02a, 0x2a6a18] : e.proj === 'bolt' ? [0xeaffff, 0x6fd8ff, 0xffffff] : [0xffe070, 0xff5a14, 0xc8260c], 4, 0.4, 6, 0.8); if (e.onPlayer) sfx('hurt'); }
      else if (e.type === 'eliteBlast') { burst(e.x, 1, e.z, 16, [0x9cff4a, 0xffe070, 0xff5a14], 6, 0.5, 4, 0.9); sfx('fireball'); }
      else if (e.type === 'orb') { sfx('orb'); }
      else if (e.type === 'pickup' || e.type === 'skill') { sfx('pickup'); }
      else if (e.type === 'levelUp') { sfx('levelup'); }
      else if (e.type === 'waveStart') { sfx(e.boss ? 'boss' : 'wave'); }
      else if (e.type === 'bossSummon') { sfx('boss'); }
      else if (e.type === 'dead') { diedT = 1.4; sfx('dead'); rlPrev = 0; }
      else if (e.type === 'restart') { diedT = 0; rlPrev = 0; equipK = 0; inspK = 0; fx.clear(); }
      else if (e.type === 'reloadStart') { rlPrev = 0; }
    }
  }

  const ELITE_GLOW = { armored: [0.12, 0.2, 0.38], swift: [0.4, 0.34, 0.02], brutal: [0.42, 0.06, 0.03], volatile: [0.1, 0.42, 0.06] };   // look only
  function eliteGlow(list, t) {
    if (!list || !list.length) return [0, 0, 0];
    const k = 0.75 + 0.25 * Math.sin(t * 5), n = list.length, o = [0, 0, 0];
    for (const id of list) { const g = ELITE_GLOW[id]; o[0] += g[0] / n; o[1] += g[1] / n; o[2] += g[2] / n; }
    return [o[0] * k, o[1] * k, o[2] * k];
  }
  function syncMonsters(st, dt) {
    const seen = new Set();
    for (const m of st.monsters) {
      seen.add(m.id);
      let en = mons.get(m.id);
      if (!en) { en = RIGS.build(m.kind); mons.set(m.id, en); scene.add(en.root); }
      en.root.position.set(m.x, (ref.kinds[m.kind].hover || 0) * m.scale, m.z); en.root.rotation.y = -m.yaw; en.root.scale.setScalar(m.scale * MODEL);
      RIGS.animate(en, m, st.t);
      const lt = smoothLight(m.x, m.z), f = clamp(m.flash / 0.12, 0, 1), warn = m.state === 'windup' ? 0.35 + 0.25 * Math.sin(st.t * 30) : (m.castK > 0 ? 0.12 + 0.3 * m.castK : m.atkK > 0.4 ? 0.2 * m.atkK : 0);
      const ge = eliteGlow(m.elite, st.t);                                    // elites glow the colour of their abilities
      en.skin.emissive.setRGB(Math.max(0, (lt[0] - 0.14)) * 0.22 + f * 0.7 + warn + ge[0], Math.max(0, (lt[1] - 0.1)) * 0.12 + f * 0.35 + ge[1], f * 0.3 + ge[2]);
    }
    for (const [id, en] of mons) if (!seen.has(id)) { scene.remove(en.root); mons.delete(id); }
    for (let i = dying.length - 1; i >= 0; i--) {
      const d = dying[i]; d.t += dt;
      const k = d.t / 0.55;
      if (k >= 1) { scene.remove(d.en.root); dying.splice(i, 1); continue; }
      d.en.root.rotation.x = k * 1.5; d.en.root.position.y = -k * 0.4;
      d.en.skin.emissive.setRGB(0.6 * (1 - k), 0.15 * (1 - k), 0.05 * (1 - k));
    }
  }

  function updateView(st, dt, time) {
    const p = st.player;
    camera.position.set(p.x, p.eye, p.z);
    const planar = clamp(p.speed / 6, 0, 1.6);
    bob += dt * (p.sprinting ? 13 : 9) * (p.speed > 0.5 ? 1 : 0) * (p.sliding ? 0 : 1);
    const bobAmt = (p.sliding ? 0 : planar) * (1 - p.adsT * 0.7);
    const strafe = (p.vx * Math.cos(p.yaw) + p.vz * Math.sin(p.yaw)) / 8;
    roll += ((p.sliding ? 0.09 : -strafe * 0.025) - roll) * Math.min(1, dt * 10);
    camera.rotation.set(p.pitch + Math.sin(bob * 2) * 0.0035 * bobAmt, -p.yaw, roll);
    camera.position.y += Math.abs(Math.sin(bob)) * 0.05 * bobAmt;
    if (shakeT > 0) { shakeT = Math.max(0, shakeT - dt); const k = shakeAmp * (shakeT / 0.22); camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k; if (shakeT === 0) shakeAmp = 0; }
    if (Math.abs(camera.fov - p.fov) > 0.01) { camera.fov = p.fov; camera.updateProjectionMatrix(); }

    // gun pose
    kickG = Math.max(0, kickG - dt * 14);
    const sp = p.sprintK, ad = p.adsT, sl = p.sliding ? 1 : 0;
    const rl = animateReload(p);
    const gs = view.gunScale;
    gunHip.set(view.gunX, view.gunY, view.gunZ);
    gunAds.set(0, -SIGHT.y * gs, -EYE_RELIEF - SIGHT.z * gs);   // puts the sight window dead centre
    const still = clamp(1 - planar, 0, 1) * (1 - sp) * (1 - sl);
    // hold Reload for 2 seconds with a full magazine: gun inspect (keyboard R, the touch Reload button, or the controller X button)
    const pr = currentPad(), rHeld = !!keys.KeyR || tch.reload || !!(pr && pr.reloadHeld);
    if (GunMotion.holdStep(reloadHold, dt, rHeld, running && p.ammo >= p.magSize && !p.reloading && !state.over && inspK === 0)) startInspect();
    if (equipK < 1) equipK = Math.min(1, equipK + dt / 0.7);
    if (inspK > 0) { inspK += dt / GunMotion.LENGTH[inspKind]; if (inspK >= 1 || p.reloading || p.sprintK > 0.2 || p.adsT > 0.15 || flashT > 0.04) inspK = 0; }
    if (gunLook.skin().embers && running) { emberT -= dt; if (emberT <= 0) { emberT = 0.07; muzzle.getWorldPosition(tmpV); burst(tmpV.x + (Math.random() - 0.5) * 0.5, tmpV.y + (Math.random() - 0.3) * 0.1, tmpV.z + (Math.random() - 0.5) * 0.5, 1, [0xff6a1a, 0xff3a10, 0xffb040], 0.5, 0.7, -1.5, 0.35); } }
    const mo = GunMotion.add(GunMotion.add(GunMotion.kick(kickG, ad, kickDir), GunMotion.idle(time, still, ad)), GunMotion.add(GunMotion.equip(equipK), GunMotion.inspect(inspKind, inspK)));
    charge.position.z += GunMotion.bolt(kickG, 0.04);
    const gx = lerp(gunHip.x, gunAds.x, ad) - sp * 0.1 - sl * 0.05 + Math.sin(bob) * 0.012 * bobAmt + rl.px + mo.px;
    const gy = lerp(gunHip.y, gunAds.y, ad) - sp * 0.07 + Math.abs(Math.cos(bob)) * 0.012 * bobAmt - sl * 0.06 + rl.py + mo.py;
    const gz = lerp(gunHip.z, gunAds.z, ad) + sp * 0.05 + rl.pz + mo.pz;
    gun.position.set(gx, gy, gz);
    gun.scale.setScalar(gs);
    gun.rotation.set(
      -sp * 0.42 + sl * 0.08 + rl.rx + mo.rx,
      lerp(0.05, 0, ad) + sp * 0.5 + sl * 0.12 + rl.ry + mo.ry,
      sp * 0.22 + sl * 0.3 + Math.sin(bob) * 0.012 * bobAmt + rl.rz + mo.rz
    );
    gunLook.update(time, flashT / 0.06);
    // muzzle flash
    flashT = Math.max(0, flashT - dt);
    flashMesh.visible = flashT > 0;
    if (flashT > 0) { flashMesh.rotation.z = Math.random() * 3; flashMesh.scale.setScalar(0.8 + Math.random() * 0.6); }
    muzzleLight.intensity = flashT > 0 ? 2.2 : 0;

    // world brightness: flicker + muzzle flash
    const fl = 1 + 0.035 * Math.sin(time * 17) + 0.025 * Math.sin(time * 31 + 1.3), fb = flashT / 0.06;
    const br = view.brightness * fl;
    worldView.update(time, camera.position, dt, br, fb, st.door.open);

    // particles, tracers, damage numbers
    for (const q of parts) {
      if (!q.m.visible) continue;
      q.life -= dt; if (q.life <= 0) { q.m.visible = false; continue; }
      q.v.y -= q.grav * dt; q.m.position.addScaledVector(q.v, dt);
      if (q.m.position.y < 0.05) { q.m.position.y = 0.05; q.v.y *= -0.3; q.v.x *= 0.6; q.v.z *= 0.6; }
    }
    for (const t of tracers) { if (!t.m.visible) continue; t.life -= dt; if (t.life <= 0) t.m.visible = false; else t.m.material.opacity = t.life / t.dur * 0.9; }
    camera.updateMatrixWorld(true);
    fx.update(dt);
    for (const n of dnPool) {
      if (n.d.hidden) continue;
      n.life -= dt; if (n.life <= 0) { n.d.hidden = true; continue; }
      n.y += dt * 0.9;
      tmpV.set(n.x, n.y, n.z).project(camera);
      if (tmpV.z > 1) { n.d.hidden = true; continue; }
      n.d.style.transform = 'translate(' + ((tmpV.x * 0.5 + 0.5) * window.innerWidth) + 'px,' + ((-tmpV.y * 0.5 + 0.5) * window.innerHeight) + 'px) translate(-50%,-50%)';
      n.d.style.opacity = clamp(n.life / 0.3, 0, 1);
    }

    // HUD
    if (st.kills !== lastKills) { elKills.textContent = st.kills; lastKills = st.kills; elKills.classList.remove('pop'); void elKills.offsetWidth; elKills.classList.add('pop'); }
    elHpFill.style.width = (clamp(p.hp / p.maxHp, 0, 1) * 100) + '%';
    elHurt.style.opacity = clamp(p.hurt / 0.3, 0, 1) * 0.85 + (p.hp < p.maxHp * 0.3 ? 0.18 : 0);
    elCross.style.opacity = (1 - clamp(p.adsT * 1.8, 0, 1)) * (p.reloading ? 0.25 : 1);
    elAmmoN.textContent = p.ammo; elAmmoM.textContent = '/ ' + p.magSize;
    elAmmo.classList.toggle('low', p.ammo <= Math.ceil(p.magSize * 0.25));
    elAmmo.classList.toggle('rl', p.reloading);
    elRl.style.width = (p.reloading ? p.reloadK * 100 : 0) + '%';
    elCross.style.setProperty('--gap', (6 + planar * 5 + (1 - p.adsT) * 4) + 'px');
    hitT = Math.max(0, hitT - dt);
    elHit.style.opacity = hitT > 0 ? Math.min(1, hitT / 0.1) : 0;
    elHit.classList.toggle('kill', hitKill);
    diedT = Math.max(0, diedT - dt); diedEl.style.opacity = clamp(diedT / 0.6, 0, 1);
    shotsView.update(st.shots, st.t);
    hud.update(st, dt); minimap.update(st, dt); compass.update(st); loot.update(st, time);
  }

  /* ============ main loop ============ */
  let state = ref.snapshot(), frameErr = '';
  function ensureFloor(st) { if (st.floorId !== loadedFloor) { worldView.load(ref.map, view.fogFar); loadedFloor = st.floorId; } }   // a new floor (or a new run) is baked and drawn here
  ensureFloor(state);
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - clock.last) / 1000, 0.05); clock.last = now;
    try { pollPad(dt); padMenus(); } catch (e) { /* a controller hiccup must not stop the frame */ }
    // each stage guards itself: one bad frame in the drawing code must never freeze the rules or the controller, and the first error is shown on screen so it can be read off a phone
    const stage = (name, fn) => { try { fn(); } catch (e) { if (!frameErr) { frameErr = name + ': ' + (e && e.message ? e.message : e); toastEl.textContent = 'Error in ' + frameErr; toastEl.classList.add('show'); toastT = 1e9; if (window.console) console.error(e); } } };
    if (running && !panelOpen) {
      stage('rules', () => { const out = ref.step(dt, gatherInput()); state = out.state; stage('events', () => handleEvents(out.events)); });
    } else {
      I.lookX = I.lookY = I.touchX = I.touchY = 0; I.slide = false; I.reload = false;
    }
    stage('floor', () => ensureFloor(state));
    stage('monsters', () => syncMonsters(state, dt));
    stage('view', () => updateView(state, running && !panelOpen ? dt : 0, now / 1000));
    stage('draw', () => renderer.render(scene, camera));
  }
  requestAnimationFrame((t) => { clock.last = t; frame(t); });
  setRunning(false);
  window.__game = { ref, view, THREE, fx };   // handy for poking at numbers from the console
})();
