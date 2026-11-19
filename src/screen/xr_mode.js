/* Meta Quest / WebXR mode: an "Enter VR" button (only shown when the browser can do immersive VR), the VR camera rig,
   the two Touch controllers (simple hand meshes and an aim laser), and a floating HUD you can read in the headset.
   Presentation and input only: it never touches the referee's rules. The game reads its input through the same
   controller path as a normal gamepad (XrInput.toPad -> PadInput), and aim is sent as a mouse-style look input. */
const XrMode = (function () {
  // the menu laser's steadying filter (a small "one euro" style filter): the slower the BEAM is moving, the more it is smoothed, so a
  // still hand's tremor is damped (~55 ms) while a real sweep is followed closely (~10 ms); a jump of 20 degrees or more is taken at once
  const LASER_SNAP = 0.35;
  const laserRate = (spd) => 18 + 80 * Math.min(1, Math.max(0, spd) / 2);      // per second; spd = the beam's own speed (rad/s)
  function create(o) {
    const { THREE, renderer, scene, camera, gun, $, gunHome } = o;
    const q = location.search + location.hash;
    const opts = { vstock: /[?&#]vstock\b/.test(q), snap: /[?&#]snap\b/.test(q), gaze: /[?&#]gaze\b/.test(q), perf: /[?&#]perf\b/.test(q), vignette: /[?&#]vignette\b/.test(q), aimMove: /[?&#]aimmove\b/.test(q),  rack: /[?&#]rack\b/.test(q),
      oldads: (typeof XrAds !== 'undefined' && XrAds.useOld(q)),
      turnFlag: (() => { const m = /[?&#]turn=([0-9.]+)/.exec(q); return m ? Math.max(0.5, Math.min(10, +m[1])) : null; })(),
      snapDegFlag: (() => { const m = /[?&#]snap=([0-9]+)/.exec(q); return m ? Math.max(10, Math.min(90, +m[1])) : null; })(),
      scale: (() => { const m = /[?&#]xrscale=([0-9.]+)/.exec(q); return m ? Math.max(0.5, Math.min(1, +m[1])) : 0.8; })() };   // ?xrscale=0.7 trades sharpness for speed
    const dolly = new THREE.Group(); dolly.name = 'xrDolly';
    scene.add(dolly); scene.remove(camera); dolly.add(camera);       // flat screen: the rig sits at 0,0,0 with no turn, so nothing changes
    let session = null, bodyYaw = 0, onStart = null, onEnd = null;
    // Comfort settings (VR pause menu): snap or smooth turn, turn speed, the vignette, slower walking, walk from the head or the left hand.
    // Kept between visits; a link flag (?snap, ?vignette, ?turn=N, ?snap=N) wins for that visit.
    const COMFORT_KEY = 'cp.vrComfort';
    const comfort = (() => { let c = {}; try { c = JSON.parse(localStorage.getItem(COMFORT_KEY) || '{}') || {}; } catch (e) { c = {}; } return { snap: /[?&#]snap\b/.test(q) ? true : !!c.snap, vignette: /[?&#]vignette\b/.test(q) ? true : !!c.vignette, slow: !!c.slow, turnRate: XrInput.parseTurnRate(c.turnRate), walkHand: !!c.walkHand }; })();
    opts.snap = comfort.snap; opts.vignette = comfort.vignette;
    const snapDegOf = () => XrInput.snapTurnDeg(comfort.turnRate, opts.snapDegFlag);
    const turnSpeedOf = () => XrInput.smoothTurn(comfort.turnRate, opts.turnFlag);
    let turn = XrInput.createTurn(opts.snap, snapDegOf() * Math.PI / 180);
    function setComfort(k, v) {
      if (!(k in comfort)) return;
      if (k === 'turnRate') comfort.turnRate = XrInput.parseTurnRate(v);
      else comfort[k] = !!v;
      if (k === 'snap' || k === 'turnRate') { opts.snap = comfort.snap; turn = XrInput.createTurn(opts.snap, snapDegOf() * Math.PI / 180); }
      if (k === 'vignette') { opts.vignette = comfort.vignette; if (!opts.vignette) { moveK = 0; vig.visible = false; vig.material.opacity = 0; } }
      try { localStorage.setItem(COMFORT_KEY, JSON.stringify(comfort)); } catch (e) { /* private mode: just this visit */ }
    }
    const hands = { left: null, right: null };
    const vrHands = (typeof XrHands !== 'undefined') ? XrHands.create(THREE, { dolly, query: q }) : null;
    const foreMark = new THREE.Group(); foreMark.name = 'xr_fore_mark';
    const gripMark = new THREE.Group(); gripMark.name = 'xr_grip_mark';
    let handsForce = null;
    const tmpS = new THREE.Vector3(), v3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), fwd = new THREE.Vector3(), aimQ = new THREE.Quaternion(), aimP = new THREE.Vector3(), headQ = new THREE.Quaternion();
    let aimInit = false, fps = 0, fpsN = 0, fpsT = 0, moveK = 0;

    // ---- controllers: rays (aim) and grips (where the hand mesh and the gun sit) ----
    const handMat = new THREE.MeshLambertMaterial({ color: 0x2a1a18, emissive: 0x120806 });
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.55, fog: false });
    const ctl = [0, 1].map((i) => {
      const ray = renderer.xr.getController(i), grip = renderer.xr.getControllerGrip(i);
      dolly.add(ray); dolly.add(grip);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.11), handMat); body.position.z = 0.01; grip.add(body);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 6, 16), handMat); ring.position.set(0, 0.02, -0.05); ring.rotation.x = Math.PI / 3; grip.add(ring);
      const lp = new THREE.Group(); ray.add(lp);                       // the menu laser hangs off a pivot that follows the hand smoothed (a steady beam, no tremor)
      const laser = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 1), laserMat); laser.position.z = -0.5; laser.scale.z = 1; laser.visible = false; lp.add(laser);
      const c = { ray, grip, laser, lp, sq: new THREE.Quaternion(), pq: new THREE.Quaternion(), spd: 0, sqOn: false, hand: null };
      ray.addEventListener('connected', (e) => { c.hand = e.data && e.data.handedness; if (c.hand === 'left' || c.hand === 'right') hands[c.hand] = c; });
      ray.addEventListener('disconnected', () => { if (c.hand && hands[c.hand] === c) hands[c.hand] = null; c.hand = null; laser.visible = false; });
      return c;
    });

    // the gun rides in the right hand in VR: an anchor that follows the grip, offset so the gun's usual hip spot lands in the palm
    const gunAnchor = new THREE.Group(); dolly.add(gunAnchor);
    const aimLocal = new THREE.Quaternion(), dollyInv = new THREE.Quaternion();
    // ---- aim down sights (left trigger): the gun leaves the hand and its sight comes up in front of your right eye, at a distance that
    //      suits the gun (eye relief), still pointing where the right controller points (a virtual stock: aim comes from the rear hand only,
    //      smoothed more while aiming). The flat game's own ADS pose (gunAds) already puts the sight on the anchor's centre line, so in VR the
    //      anchor moves from the palm to the eye. The left glove sits at that gun's own hand spot (HOLD: fore-end, pump, cupped under a pistol).
    //      Per gun type (docs/vr-design.md, research round 3):
    // (the voxel guns are drawn bigger than real ones, so the distances are set to give a real-looking sight picture: the sight
    //  housing fills about the same share of your view as a real optic at a real cheek weld; checked per gun in fake-XR screenshots)
    const ADS = {
      pistol: { relief: 0.46, smooth: 16, drop: 0.0 },     // arms out, support hand cupped under the grip (H3VR palm grip)
      smg: { relief: 0.38, smooth: 14, drop: 0.0 },        // compact stock in the shoulder, hand on the fore-grip
      rifle: { relief: 0.34, smooth: 12, drop: 0.0 },      // cheek on the stock, hand on the fore-end
      shotgun: { relief: 0.36, smooth: 12, drop: 0.0 },    // hand on the pump
      sniper: { relief: 0.22, smooth: 8, drop: 0.0, zoom: 4 },   // eye close behind the scope; a 4x picture inside the lens
      hmg: { relief: 0.40, smooth: 10, drop: 0.015 }       // heavy: sits a touch lower, slowest to swing
    };
    const adsOf = () => { const g = o.gunParts && o.gunParts(); return ADS[(g && g.type) || 'rifle'] || ADS.rifle; };
    let adsK = 0;
    const eyeP = new THREE.Vector3(), hipP = new THREE.Vector3(), adsP = new THREE.Vector3();
    const adsBlend = (typeof XrAds !== 'undefined') ? XrAds.create() : null;
    const adsLocalP = new THREE.Vector3(), adsLocalQ = new THREE.Quaternion();
    const hipLocalP = new THREE.Vector3(), hipLocalQ = new THREE.Quaternion();
    const sightW = new THREE.Vector3(), dirW = new THREE.Vector3(), eyeW = new THREE.Vector3();
    let adsInfo = { k: 0, angleDeg: 0, relief: 0, old: !!opts.oldads, id: '' };
    let lastGunId = '';
    const camNear0 = camera.near;
    // ---- support hand (left grip near the gun's fore-end): the right hand keeps the gun's position, the left one steers the barrel ----
    //      (Contractors / Pavlov style: rotation comes from both hands, position from the trigger hand). Pistols only get a light pull (cupped hand).
    let twoHand = false, gripErr = -1;
    const foreW = new THREE.Vector3(), gripW = new THREE.Vector3(), sh = new THREE.Vector3(), dir2 = new THREE.Vector3(), up2 = new THREE.Vector3(), m4b = new THREE.Matrix4(), q2 = new THREE.Quaternion();
    const ZERO3 = new THREE.Vector3();
    // grabbing and using things in the world (xr_interact.js): what each hand will take, the highlight, the squeeze
    const inter = XrInteract.create({ THREE, dolly, camera, hands, pulse: (h, s, ms) => pulse(h, s, ms), twoHand: () => twoHand, map: o.levelMap, toast: o.toast });
    const STEER = { pistol: 0.3, smg: 0.75, rifle: 0.8, shotgun: 0.8, sniper: 0.85, hmg: 0.85 };
    // ---- feel (xr_feel.js): recoil kicks the gun in the hand and springs back (look and buzz only: bullets go where you point); a hit marker on what you hit ----
    const recRot = XrFeel.createSpring(XrFeel.CAP_ROT), recBack = XrFeel.createSpring(XrFeel.CAP_BACK), recQ = new THREE.Quaternion(), AX_X = new THREE.Vector3(1, 0, 0);
    let shotN = 0, lastKick = null;
    function shotFx() {
      const g = o.gunParts && o.gunParts(), K = XrFeel.kickOf((g && g.type) || 'rifle', twoHand, adsK > 0.5);
      recRot.kick(K.rot, K.w); recBack.kick(K.back, K.w); pulse('right', K.hap, K.ms); if (K.left) pulse('left', K.left, K.ms);
      shotN++; lastKick = K;
    }
    const hmMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, depthWrite: false, fog: false });
    const hitMk = new THREE.Group(); hitMk.visible = false;
    { const geo = new THREE.PlaneGeometry(0.012, 0.045); for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, m = new THREE.Mesh(geo, hmMat); m.position.set(Math.sin(a) * 0.04, Math.cos(a) * 0.04, 0); m.rotation.z = -a; m.renderOrder = 999; hitMk.add(m); } }
    scene.add(hitMk);
    let hmT = 0, hmDur = 0.12, hmS = 1, hitN = 0; const hmQ = new THREE.Quaternion(), hmC = new THREE.Vector3();
    function hitMark(x, y, z, kind) {
      if (!session) return;
      hitMk.position.set(x, y, z); hmDur = hmT = kind === 'kill' ? 0.26 : 0.13; hmS = kind === 'kill' ? 1.6 : kind === 'crit' ? 1.25 : 1;
      hmMat.color.setHex(kind === 'kill' ? 0xff3030 : kind === 'crit' ? 0xffd27a : 0xffffff); hitMk.visible = true; hitN++;
    }
    function hitFx(x, y, z, crit) { hitMark(x, y, z, crit ? 'crit' : 'hit'); pulse('right', crit ? 0.6 : 0.25, crit ? 40 : 20); }
    function hitMarkStep(dt) {
      if (hmT <= 0) return; hmT -= dt; if (hmT <= 0) { hitMk.visible = false; return; }
      camera.getWorldQuaternion(hmQ); camera.getWorldPosition(hmC); hitMk.quaternion.copy(hmQ);
      const k = hmT / hmDur; hitMk.scale.setScalar(hmS * Math.max(0.6, hitMk.position.distanceTo(hmC) * 0.35) * (1.3 - 0.3 * k)); hmMat.opacity = Math.min(1, k * 1.6);
    }
    function supportHand() {
      const L = hands.left, R = hands.right, g = o.gunParts && o.gunParts();
      const held = !!L && btnOn(L.gamepad, 1, 0.35);
      if (!held || !R || !g || !g.gunBody) { if (twoHand) pulse('left', 0.15, 10); twoHand = false; return; }
      if (!twoHand) {                                                  // only grabs when the hand closes near the fore-end (a big, forgiving zone)
        g.gunBody.updateMatrixWorld(true); foreW.copy(g.fore).applyMatrix4(g.gunBody.matrixWorld); dolly.worldToLocal(foreW);
        // anywhere along the gun ahead of the trigger hand counts (the voxel guns are long, a real reach is 30-45 cm), so you never fish for a spot
        const a0 = R.grip.position; dir2.copy(foreW).sub(a0); const len = dir2.length(); dir2.divideScalar(len || 1);
        const t = Math.max(0, Math.min(len, v3.copy(L.grip.position).sub(a0).dot(dir2)));
        if (t > 0.12 && v3.copy(a0).addScaledVector(dir2, t).distanceTo(L.grip.position) < 0.2) { twoHand = true; pulse('left', 0.35, 25); }
      }
    }
    // the aim the hands give this frame (dolly space): the right ray, turned toward the left hand while it holds the fore-end
    function handsAim(out) {
      const R = hands.right; out.copy(R.ray.quaternion);
      if (!twoHand || !hands.left) return out;
      const g = o.gunParts && o.gunParts(), w = STEER[(g && g.type) || 'rifle'] || 0.8;
      let from = R.grip.position;
      if (opts.vstock) {                                               // virtual stock: with the trigger hand near your right shoulder, the gun pivots on the shoulder
        sh.set(0.17, -0.22, 0.05).applyQuaternion(camera.quaternion).add(camera.position);
        if (R.grip.position.distanceTo(sh) < 0.3) from = sh;
      }
      dir2.copy(hands.left.grip.position).sub(from); if (dir2.lengthSq() < 0.01) return out;
      dir2.normalize(); fwd.set(0, 0, -1).applyQuaternion(out);
      dir2.lerp(fwd, 1 - w).normalize();
      up2.set(0, 1, 0).applyQuaternion(out);
      m4b.lookAt(ZERO3, dir2, up2); q2.setFromRotationMatrix(m4b);   // Matrix4.lookAt makes -z face the target (camera style), which is how the gun points
      return out.copy(q2);
    }
    // The right eye in rig space. In a WebXR session three.js leaves the user camera at the LEFT eye's pose (not the head centre), so
    // "camera + half an IPD" landed between the eyes and the sights sat 3.2 cm left of the aiming eye (2026-11-19 playtest: looking down the
    // gun showed only the side of the receiver, a square, and no dot). Use the right view's own pose; off-headset, fall back to the old guess.
    const eyeA = new THREE.Vector3(), eyeB = new THREE.Vector3(), headR = new THREE.Vector3();
    function rightEye(eyeOff, out) {
      const xc = session && renderer.xr.getCamera && renderer.xr.getCamera(camera), cams = xc && xc.cameras;
      if (cams && cams.length >= 2) {
        eyeA.setFromMatrixPosition(cams[0].matrix); eyeB.setFromMatrixPosition(cams[1].matrix);
        if (eyeA.distanceToSquared(eyeB) > 1e-6) {
          headR.set(1, 0, 0).applyQuaternion(camera.quaternion);
          return out.copy(eyeB.dot(headR) >= eyeA.dot(headR) ? eyeB : eyeA);
        }
      }
      return out.set(eyeOff, 0, 0).applyQuaternion(camera.quaternion).add(camera.position);
    }
    function placeGun(p) {
      const h = hands.right;
      if (!h) { if (gun.parent !== camera) camera.add(gun); return; }
      if (gun.parent !== gunAnchor) gunAnchor.add(gun);
      const q = aimInit ? aimLocal : h.ray.quaternion;
      gunAnchor.quaternion.copy(q);                                    // pointing along the (smoothed) aim
      const g = o.gunParts && o.gunParts(), glove = o.arms && o.arms[1];
      if (g && g.id !== lastGunId) { lastGunId = g.id || ''; if (adsBlend) adsBlend.reset(); }  // a swap starts the blend from the hip
      // hip: the gun's own grip point (each gun's model says where the hand holds it) sits exactly in the controller grip, so it never floats
      gunAnchor.position.copy(h.grip.position); gunAnchor.updateMatrixWorld(true);
      if (glove && g && g.gunBody) { glove.updateMatrixWorld(true); glove.getWorldPosition(gripW); dolly.worldToLocal(gripW); hipP.copy(h.grip.position).sub(gripW).add(h.grip.position); }
      else hipP.set(-gunHome.gunX, -gunHome.gunY + 0.02, -gunHome.gunZ - 0.12).applyQuaternion(q).add(h.grip.position);
      const eyeOff = (typeof XrAds !== 'undefined') ? XrAds.EYE_X : 0.032;
      rightEye(eyeOff, eyeP);                                          // the right (dominant) eye, from the headset's own right-eye view
      if (opts.oldads || !adsBlend) {
        adsK = p ? Math.max(0, Math.min(1, p.adsT || 0)) : 0;
        if (adsK > 0) {
          const A = adsOf();
          adsP.set(0, -A.drop, (o.eyeRelief || 0.5) - A.relief).applyQuaternion(q).add(eyeP);   // gunAds puts the sight eyeRelief ahead of the anchor: pull it back to this gun's distance
          gunAnchor.position.lerpVectors(hipP, adsP, adsK * adsK * (3 - 2 * adsK));
        } else gunAnchor.position.copy(hipP);
      } else {
        const type = (g && g.type) || 'rifle', id = (g && g.id) || '';
        const A = XrAds.of(type, id);
        const aiming = !!(p && (p.adsT || 0) > 0.02 && !p.reloading);
        adsK = adsBlend.step(lastDt || 0.016, aiming, XrAds.SETTLE);
        adsInfo.k = adsK; adsInfo.relief = A.relief; adsInfo.old = false; adsInfo.id = id;
        const s = (o.sight && o.sight()) || (g && g.sightDir) || { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: -1 };
        const gs = (g && g.gunScale) || 1;
        const loc = XrAds.localAdsPose([s.x || 0, s.y || 0, s.z || 0], [s.dx || 0, s.dy || 0, s.dz == null ? -1 : s.dz], A.relief, gs);
        adsLocalP.set(loc.px, loc.py, loc.pz); adsLocalQ.set(loc.qx, loc.qy, loc.qz, loc.qw);
        hipLocalP.copy(gun.position); hipLocalQ.copy(gun.quaternion);
        if (adsK > 0) {
          gun.position.lerpVectors(hipLocalP, adsLocalP, adsK);
          gun.quaternion.copy(hipLocalQ).slerp(adsLocalQ, adsK);
        }
        gunAnchor.position.lerpVectors(hipP, eyeP, adsK);             // sight is relief metres in front of the eye along the aim
        // the default camera near plane is 0.1 m, which would clip a close optic (the M4 sits 8 cm from the eye).
        // pull it in while aiming so you can see through the glass; the stock behind the camera is already out of view.
        camera.near = adsK > 0.4 ? Math.min(camNear0, XrAds.HEAD_NEAR) : camNear0;
        camera.updateProjectionMatrix();
      }
      if (glove && adsK < 0.01) { gunAnchor.updateMatrixWorld(true); glove.getWorldPosition(gripW); dolly.worldToLocal(gripW); gripErr = gripW.distanceTo(h.grip.position); }   // (checked by the test) the gun's grip is in the hand
      // hands: the game's own gloves at this gun's grip and fore-end spots (no forearms: they crowded the left eye). The right glove is always
      // on the grip; the left one appears on the fore-end while the left grip holds the gun or you aim down sights.
      const kr = recRot.step(lastDt), kb = recBack.step(lastDt);   // recoil: muzzle up and the gun back toward you, springing home
      if (kr || kb) { recQ.setFromAxisAngle(AX_X, kr); gunAnchor.quaternion.multiply(recQ); v3.set(0, 0, kb).applyQuaternion(q); gunAnchor.position.add(v3); }
      const gR = o.arms && o.arms[1], gL = o.arms && o.arms[0], showL = twoHand || adsK > 0.35;
      // viewmodel gold-cuffed gloves and the old box/torus controller placeholders stay hidden in VR.
      // the new leather gloves (xr_glove_*) are posed after this, and must not be hidden with the placeholders.
      if (gR) gR.visible = false; if (gL) gL.visible = false; void showL;
      const skipHand = (m) => m === mapMesh || (m && (m.name === 'xr_glove_right' || m.name === 'xr_glove_left' || m.userData && m.userData.xrGlove));
      for (const m of h.grip.children) if (!skipHand(m)) m.visible = false;
      const L = hands.left; if (L) for (const m of L.grip.children) if (!skipHand(m)) m.visible = false;
      scope(p);
    }
    // called from screen.js at the end of the gun pose (updateView runs after xr.update and would otherwise
    // put the gun back at the hip). Locks the sight on the eye's -Z at the gun's eye relief.
    function alignAds() {
      if (opts.oldads || !adsBlend || adsK <= 0) return;
      const g = o.gunParts && o.gunParts();
      const type = (g && g.type) || 'rifle', id = (g && g.id) || '';
      const A = typeof XrAds !== 'undefined' ? XrAds.of(type, id) : { relief: 0.14 };
      const s = (o.sight && o.sight()) || (g && g.sightDir) || { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: -1 };
      const gs = (g && g.gunScale) || 1;
      const loc = XrAds.localAdsPose([s.x || 0, s.y || 0, s.z || 0], [s.dx || 0, s.dy || 0, s.dz == null ? -1 : s.dz], A.relief, gs);
      adsLocalP.set(loc.px, loc.py, loc.pz); adsLocalQ.set(loc.qx, loc.qy, loc.qz, loc.qw);
      hipLocalP.copy(gun.position); hipLocalQ.copy(gun.quaternion);
      gun.position.lerpVectors(hipLocalP, adsLocalP, adsK);
      gun.quaternion.copy(hipLocalQ).slerp(adsLocalQ, adsK);
    }
    // ---- sniper scope: while aiming a sniper, a small camera renders a magnified picture into the lens, picture-in-picture. The whole
    //      view never zooms (that makes people sick); only the glass shows the zoomed world. The lens is drawn by a small shader: the
    //      picture, a fine duplex crosshair (thin centre, thicker outer posts) drawn per pixel so it stays crisp, and a dark ring at the edge
    //      (the scope's eye-box shadow). Quest 3 budget: one 448 px mono render per frame with a 3-6 degree frustum (culling drops almost
    //      everything), no hands, gun, dot or HUD in it.
    const SCOPE_RES = 448, LENS_R = 0.019;                            // picture size (px); lens radius in metres
    const scopeRT = new THREE.WebGLRenderTarget(SCOPE_RES, SCOPE_RES, { depthBuffer: true, stencilBuffer: false });
    const scopeCam = new THREE.PerspectiveCamera(10, 1, 0.3, 160);
    const lensMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: scopeRT.texture } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform sampler2D map; varying vec2 vUv;',
        'float line(float d, float w) { float aa = max(fwidth(d), 1e-4); return 1.0 - smoothstep(w - aa, w + aa, abs(d)); }',
        'void main() {',
        '  vec2 p = vUv * 2.0 - 1.0; float r = length(p);',
        '  if (r > 1.0) discard;',
        '  vec3 c = texture2D(map, vUv).rgb;',
        '  c *= mix(1.0, 0.82, smoothstep(0.35, 0.8, r));',                // a touch of fall-off, then the dark ring at the rim
        '  c *= 1.0 - smoothstep(0.80, 0.97, r);',
        '  float thin = 0.0045, post = 0.022;',
        '  float h = line(p.y, abs(p.x) > 0.55 ? post : thin), v = line(p.x, abs(p.y) > 0.55 ? post : thin);',
        '  float cross = max(h, v) * step(r, 0.93);',
        '  c = mix(c, vec3(0.0), cross);',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n'),
      depthWrite: true, fog: false, toneMapped: false
    });
    lensMat.extensions = { derivatives: true };
    const lens = new THREE.Mesh(new THREE.CircleGeometry(1, 40), lensMat); lens.name = 'xr_scope_lens';
    const lensRim = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.32, 40), new THREE.MeshBasicMaterial({ color: 0x050405, fog: false })); lensRim.position.z = -0.002; lens.add(lensRim);
    lens.visible = false; let scopeOn = false, scopeN = 0, scopeZoom = 0, scopeFov = 0;
    const lensW = new THREE.Vector3(), eyeWs = new THREE.Vector3(), lensS = new THREE.Vector3();
    function scopeSpec(g) {
      const type = (g && g.type) || 'rifle', id = (g && g.id) || '';
      return opts.oldads || typeof XrAds === 'undefined' ? adsOf() : XrAds.of(type, id);
    }
    function scope(p) {
      const g = o.gunParts && o.gunParts(), A = scopeSpec(g), want = !!(session && A.zoom && adsK > 0.85 && p && !p.reloading && g && o.sight);
      if (want && lens.parent !== gun) gun.add(lens);
      lens.visible = want; scopeOn = want;
      if (!want) return;
      const sp = o.sight();                                            // the sight point in the gun's own space (the eyepiece; ADS puts it on the eye line)
      const gsx = Math.max(0.01, gun.scale.x), gsz = Math.max(0.01, gun.scale.z);
      lens.position.set(sp.x || 0, sp.y, sp.z + 0.008 / gsz);          // just behind the eyepiece, toward the eye
      lens.scale.setScalar(LENS_R / gsx);
      scopeZoom = A.zoom;
    }
    function renderScope() {                                           // called just before the XR frame renders (screen.js)
      if (!scopeOn) return;
      lens.updateMatrixWorld(true); lens.getWorldPosition(lensW); lens.getWorldScale(lensS);
      // the lens covers a cone of 2*atan(r/d) from the eye; the picture in it is that cone magnified
      eyeWs.copy(eyeP).applyMatrix4(dolly.matrixWorld);
      const d = Math.max(0.03, lensW.distanceTo(eyeWs)), cone = 2 * Math.atan(Math.abs(lensS.x) / d);
      scopeFov = cone / Math.max(1, scopeZoom) * 180 / Math.PI;
      scopeCam.fov = scopeFov; scopeCam.updateProjectionMatrix();
      scopeCam.position.copy(lensW); scopeCam.quaternion.copy(aimQ); scopeCam.updateMatrixWorld(true);
      // hide what must not be in the picture: the gun and gloves (in front of the lens), the dot (it is drawn on top of the lens already), the HUD
      const hide = [gun, fireDot, reticle, menuMesh, hudMesh, vrHands && vrHands.roots.left, vrHands && vrHands.roots.right].filter(Boolean), was = hide.map((m) => m.visible);
      hide.forEach((m) => { m.visible = false; });
      const xrOn = renderer.xr.enabled; renderer.xr.enabled = false; const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(scopeRT); renderer.render(scene, scopeCam); renderer.setRenderTarget(prev); renderer.xr.enabled = xrOn;
      hide.forEach((m, i) => { m.visible = was[i]; });
      scopeN++;
    }

    // ---- HUD: a small canvas in front of your eyes, redrawn a few times a second from the page's own HUD text ----
    const hc = document.createElement('canvas'); hc.width = 1024; hc.height = 512;
    const hx = hc.getContext('2d'), hudTex = new THREE.CanvasTexture(hc);
    const hudMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
    hudMesh.position.set(0, -0.12, -1.1); hudMesh.renderOrder = 999; hudMesh.visible = false; camera.add(hudMesh);
    const reticle = new THREE.Mesh(new THREE.RingGeometry(0.008, 0.013, 16), new THREE.MeshBasicMaterial({ color: 0xffe0c0, depthTest: false, fog: false, transparent: true }));
    reticle.renderOrder = 1000; reticle.visible = false; scene.add(reticle);
    // Collimated red-dot sight: a solid red point with a white-hot centre and a soft glow, sitting on the fire ray at the hit (or far along it).
    // From any eye it overlays the impact, the way a real red dot (collimated at infinity) does. Sized in angle, not metres: the sprite is about
    // 44 MOA across, the solid core about 13 MOA (3-4 px on a Quest 3: ~15-20 px per degree at the default 0.8 framebuffer scale), the rest a soft glow. The texture is small
    // (32 px) so the sprite is drawn at about one texel per pixel: a big 128 px texture minified 10:1 (mipmapped or not) smears the core into
    // the glow and the dot all but disappears on the headset.
    // Drawn on top (no depth test), like the dot on a real optic's glass: it already sits at the first wall or monster along the fire ray, so
    // nothing in the world can be in front of it, and the gun's own sights, the optic housing or the glove never hide it. (Depth-tested, the
    // 2026-11-19 playtest saw no dot in ADS: the ADS near plane of 2 cm leaves a 16-bit headset depth buffer ~10 cm of precision at 12 m, so
    // the wall won against a dot 3 cm in front of it.)
    const MOA = Math.PI / (180 * 60), DOT_GLOW_MOA = 26, DOT_CORE = 0.3, DOT_MIN_CORE_MOA = 18, DOT_TEX = 32;   // sprite radius (MOA), core share of the radius, smallest core (~5 px on a Quest 3)
    const fireDotTex = (() => {
      const N = DOT_TEX, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), R = N / 2;
      const g = x.createRadialGradient(R, R, 0, R, R, R);
      // (playtest 2: the old white-hot centre vanished on a pistol's white front post) a solid saturated red core with a thin dark rim, so it reads on white sights, bright walls and dark halls alike
      g.addColorStop(0, 'rgba(255,96,72,1)'); g.addColorStop(0.12, 'rgba(255,34,24,1)'); g.addColorStop(DOT_CORE, 'rgba(236,16,12,1)');
      g.addColorStop(DOT_CORE + 0.05, 'rgba(24,0,0,0.7)'); g.addColorStop(DOT_CORE + 0.14, 'rgba(10,0,0,0.35)'); g.addColorStop(0.62, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, N, N);
      const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
    })();
    const fireDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireDotTex, color: 0xffffff, blending: THREE.NormalBlending, depthTest: false, depthWrite: false, fog: false, transparent: true }));
    fireDot.renderOrder = 1002; fireDot.visible = false; scene.add(fireDot);
    const fireDotPos = new THREE.Vector3();
    function placeFireDot(hit, dir, dist, show) {
      fireDot.visible = !!show;
      if (!show) return;
      fireDotPos.copy(hit).addScaledVector(dir, -Math.min(0.03, dist * 0.01));   // a hair toward you, so it does not z-fight the wall or hide inside a monster
      fireDot.position.copy(fireDotPos);
      const moa = Math.max(DOT_GLOW_MOA * 2, DOT_MIN_CORE_MOA / DOT_CORE);        // sprite diameter in MOA: never lets the solid core drop under ~3 px
      const s = Math.max(0.004, dist * moa * MOA);
      fireDot.scale.set(s, s, 1);
    }
    // comfort vignette: a dark ring that closes in a little while you move or turn with the sticks (off with ?novignette)
    const vig = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.6, 32, 1), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
    vig.position.z = -0.3; vig.renderOrder = 998; vig.visible = false; camera.add(vig);
    // ---- VR menus: the open menu's data drawn again as a clean VR panel (xr_menu.js), world-locked in front of you ----
    const MENUS = ['codex', 'gearMenu', 'stashMenu', 'levelup', 'gameover', 'start'];   // the big map is held in the left hand instead
    const vm = XrMenu.create(THREE);
    const PANEL_W = 1.5, MENU_DIST = 1.6, RECENTER = 70 * Math.PI / 180;   // metres; ~50 degrees wide at 1.6 m, so no head turning to read the edges
    const menuMat = new THREE.MeshBasicMaterial({ map: vm.tex, transparent: true, depthTest: false, depthWrite: false, fog: false });
    const menuMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), menuMat); menuMesh.scale.set(PANEL_W, PANEL_W * vm.ASPECT, 1);
    menuMesh.renderOrder = 1001; menuMesh.visible = false; dolly.add(menuMesh);
    // ---- menu smoothing (owner, 2026-11-13). Look and function stay the original menus; only the motion is new:
    //  - open: the panel fades and grows in (94% -> 100%) over 150 ms, eased; close: a copy fades out over 150 ms (it takes no clicks)
    //  - one menu straight to another (pause -> codex): the old one dips out in 75 ms, then the new one fades in (no flash of half-drawn content)
    //  - hover: a soft gold frame floats over the whole card or button under the laser and glides between them; only clickable tiles
    //    (the page's own buttons) ever get it, never titles or text. The canvas is not redrawn for hover (no texture upload, no hitch).
    const MENU_FADE = 0.15, MENU_DIP = 0.075; let menuK = 1, ghostK = 0, dipT = 0, dipN = 0, openN = 0; const openRec = { id: '', k0: -1, ms: 0, t0: 0 };   // openRec: the last opening (tests)
    const ghostMat = menuMat.clone(); const menuGhost = new THREE.Mesh(menuMesh.geometry, ghostMat); menuGhost.renderOrder = 1000; menuGhost.visible = false; dolly.add(menuGhost);
    const ease = (k) => 1 - (1 - k) * (1 - k) * (1 - k);
    const hiTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
      x.shadowColor = 'rgba(255,210,122,0.9)'; x.shadowBlur = 10; x.strokeStyle = '#ffd27a'; x.lineWidth = 5; x.beginPath(); x.moveTo(26, 8); x.arcTo(56, 8, 56, 56, 12); x.arcTo(56, 56, 8, 56, 12); x.arcTo(8, 56, 8, 8, 12); x.arcTo(8, 8, 56, 8, 12); x.closePath();
      x.fillStyle = 'rgba(255,190,110,0.12)'; x.fill(); x.stroke(); const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; })();
    const hiGeo = new THREE.BufferGeometry(), hiPos = new Float32Array(16 * 3), hiUv = new Float32Array(16 * 2), hiIdx = [];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const a = j * 4 + i; hiIdx.push(a, a + 4, a + 1, a + 1, a + 4, a + 5); }
    const UV9 = [0, 24 / 64, 40 / 64, 1]; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { hiUv[(j * 4 + i) * 2] = UV9[i]; hiUv[(j * 4 + i) * 2 + 1] = 1 - UV9[j]; }
    hiGeo.setAttribute('position', new THREE.BufferAttribute(hiPos, 3)); hiGeo.setAttribute('uv', new THREE.BufferAttribute(hiUv, 2)); hiGeo.setIndex(hiIdx);
    const hiMat = new THREE.MeshBasicMaterial({ map: hiTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false });
    const hiMesh = new THREE.Mesh(hiGeo, hiMat); hiMesh.renderOrder = 1002; hiMesh.frustumCulled = false; hiMesh.position.z = 0.001; hiMesh.visible = false; menuMesh.add(hiMesh);
    const hiCur = { x: 0, y: 0, w: 0, h: 0, a: 0, on: false };
    function hiShape(r) {                                              // a 9-slice frame: the corners keep their size whatever the tile's shape (panel units)
      const bx = 0.016 / PANEL_W, by = 0.016 / (PANEL_W * vm.ASPECT), xs = [r.x - r.w / 2 - bx * 0.3, r.x - r.w / 2 + bx, r.x + r.w / 2 - bx, r.x + r.w / 2 + bx * 0.3], ys = [r.y + r.h / 2 + by * 0.3, r.y + r.h / 2 - by, r.y - r.h / 2 + by, r.y - r.h / 2 - by * 0.3];
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const k = (j * 4 + i) * 3; hiPos[k] = xs[i]; hiPos[k + 1] = ys[j]; hiPos[k + 2] = 0; }
      hiGeo.attributes.position.needsUpdate = true;
    }
    function hiRect(t) {                                               // a tile's rectangle in panel units, cut to the visible part of the list
      const W = XrMenu.W, H = XrMenu.H, V = XrMenu.VIEW; let y0 = t.y, y1 = t.y + t.h;
      if (!t.exit) { y0 = Math.max(0, t.y - vm.scroll); y1 = Math.min(V, t.y + t.h - vm.scroll); }
      return { x: (t.x + t.w / 2) / W - 0.5, y: 0.5 - (y0 + y1) / 2 / H, w: t.w / W, h: Math.max(0, y1 - y0) / H };
    }
    const panelScale = (m, k) => m.scale.set(PANEL_W * k, PANEL_W * vm.ASPECT * k, 1);
    function menuAnim(dt) {
      dt = Math.min(dt || 0, 0.05);                                    // one long frame never skips the whole transition
      if (menuMesh.visible) { menuK = dipT > 0 ? Math.max(0, menuK - dt / MENU_DIP) : Math.min(1, menuK + dt / MENU_FADE); const e = ease(menuK); menuMat.opacity = e; panelScale(menuMesh, 0.94 + 0.06 * e);
        if (openRec.k0 < 0) openRec.k0 = menuK; if (menuK === 1 && !openRec.ms && openRec.t0) openRec.ms = performance.now() - openRec.t0; }
      if (ghostK > 0) { ghostK = Math.max(0, ghostK - dt / MENU_FADE); const e = ghostK * ghostK; ghostMat.opacity = e; panelScale(menuGhost, 0.96 + 0.04 * e); menuGhost.visible = ghostK > 0; }
      const t = dipT > 0 ? null : vm.hover, k = 1 - Math.exp(-dt * 26);
      if (t && menuMesh.visible) { const r = hiRect(t); if (!hiCur.on || hiCur.a < 0.02) Object.assign(hiCur, r); else { hiCur.x += (r.x - hiCur.x) * k; hiCur.y += (r.y - hiCur.y) * k; hiCur.w += (r.w - hiCur.w) * k; hiCur.h += (r.h - hiCur.h) * k; } hiCur.on = true; }
      hiCur.a += ((t && menuMesh.visible ? 1 : 0) - hiCur.a) * (1 - Math.exp(-dt * 22));
      hiMesh.visible = hiCur.a > 0.01 && menuMesh.visible; if (hiMesh.visible) { hiShape(hiCur); hiMat.opacity = hiCur.a * menuMat.opacity; } else hiCur.on = false;
    }
    function menuGone() {                                              // the panel closed: a copy of it fades out where it was (the canvas keeps its last picture)
      if (!menuMesh.visible) return;
      menuGhost.position.copy(menuMesh.position); menuGhost.quaternion.copy(menuMesh.quaternion); ghostK = Math.max(0.05, menuMat.opacity); ghostMat.opacity = ghostK * ghostK; panelScale(menuGhost, menuMesh.scale.x / PANEL_W); menuGhost.visible = true;
      hiCur.on = false; hiCur.a = 0; hiMesh.visible = false;
    }
    const cursor = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.011, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, fog: false, transparent: true }));
    cursor.renderOrder = 1003; cursor.visible = false; dolly.add(cursor);
    let menuPlacedFor = '', menuEl = null, modelT = 0, awayT = 0;
    function placeMenu() {
      const hp = camera.position, f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, -1); f.normalize();
      menuMesh.position.set(hp.x + f.x * MENU_DIST, hp.y - 0.1, hp.z + f.z * MENU_DIST);
      menuMesh.rotation.set(0, Math.atan2(-f.x, -f.z), 0);
    }
    // the page's controller prompts name Xbox buttons and a D-pad; the Quest Touch controllers have neither, so VR shows Quest names
    const QUEST_WORDS = [[/Press <b>A<\/b> to (begin|resume)/g, 'Point and pull the trigger to $1'], [/Press A to (begin|resume)/g, 'Point and pull the trigger to $1'],
      [/D-pad down/g, 'right stick down'], [/(the )?D-pad( or (the )?left stick)?( to choose)?/g, 'the laser'], [/up and down to change row,?/g, ''],
      [/\bRT\b( \(R2\))?/g, 'right trigger'], [/\bLT\b( \(L2\))?/g, 'left trigger'], [/\bRB\b/g, 'right stick click'], [/\bLB\b/g, 'right grip'],
      [/\bStart\b( \(Options\))?/g, 'Y'], [/\bBack\b( \(View \/ Share\))?/g, 'hold the left grip'], [/Triangle|\bY\b(?= swaps)/g, 'A'], [/\bCross\b/g, 'A'], [/\bSquare\b/g, 'X'], [/\bCircle\b/g, 'B'],
      [/\bA\b to (take|pick|press|confirm)/g, 'the trigger to $1'],
      [/Click the left stick/g, 'Click the left stick (or push it all the way forward)'], [/right stick<\/b> looks/g, 'right stick</b> turns']];
    const questText = (t) => { for (const [re, w] of QUEST_WORDS) t = t.replace(re, w); return t; };
    function openMenu(running) {
      for (const id of MENUS) { const e = $(id); if (e && !e.hidden && (id !== 'start' || !running) && getComputedStyle(e).display !== 'none') return e; }
      return null;
    }
    // the model: what xr_menu.js reads from the page, plus the exits the flat page does not draw as buttons
    function menuModel(el) {
      const root = el.querySelector('.cxwrap, .card, .gbody') || el;
      const m = XrMenu.extract(root, el.id);
      if (el.id === 'levelup' && o.inShop && o.inShop()) { m.sub = 'Spend your gold   ·   ' + txt('goldN').replace(/\s+/g, ' ') ; m.exits.push({ action: 'shopClose', label: 'Leave the merchant' }); }
      if (el.id === 'levelup' && !(o.inShop && o.inShop())) m.sub = 'Take one card from each row';
      if (el.id === 'start' && o.started()) m.title = 'PAUSED';
      return m;
    }
    function hintsFor(el) {
      const exit = vm.layout && vm.layout.exits.length, paused = el.id === 'start' && o.started();
      return { left: 'Trigger: pick    Right stick or drag: scroll', right: exit ? 'Y: ' + vm.layout.exits[0].title.toLowerCase() : paused ? 'Y: resume' : el.id === 'levelup' ? 'Pick to carry on' : '' };
    }
    function menuPanel(running, dt) {
      const el = openMenu(running);
      if (!el) { if (menuPlacedFor) { menuGone(); vm.reset(); } menuMesh.visible = false; cursor.visible = false; menuPlacedFor = ''; menuEl = null; dipT = 0; return false; }
      if (!dt) return menuMesh.visible;
      if (menuPlacedFor !== el.id) {
        if (menuPlacedFor && menuMesh.visible && dipT <= 0 && menuK > 0.05) { dipT = MENU_DIP; dipN++; }   // straight from one menu to another: dip the old one out first
        if (dipT > 0) { dipT -= dt; if (dipT > 0) return true; }      // (still showing the old picture; it takes no clicks meanwhile, see laser())
        dipT = 0; menuPlacedFor = el.id; vm.reset(); placeMenu(); modelT = 0; awayT = 0; scrollV = 0;
        ghostK = 0; menuGhost.visible = false;                         // the canvas is about to hold the new menu: no old copy may show it
        menuK = 0; menuMat.opacity = 0; panelScale(menuMesh, 0.94); hiCur.on = false; hiCur.a = 0; openN++; Object.assign(openRec, { id: el.id, k0: -1, ms: 0, t0: performance.now() });
      }
      menuEl = el;
      modelT -= dt; if (modelT <= 0) { modelT = 0.25; const m = menuModel(el); if (!vm.setModel(m)) vm.refreshEls(m); }
      // turned well away from the panel (or it got left behind)? bring it back in front, so a menu can never be lost
      const hp = camera.position, f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const ang = Math.atan2(f.x * (menuMesh.position.z - hp.z) - f.z * (menuMesh.position.x - hp.x), f.x * (menuMesh.position.x - hp.x) + f.z * (menuMesh.position.z - hp.z));
      awayT = Math.abs(ang) > RECENTER ? awayT + dt : 0; if (awayT > 0.6) { placeMenu(); awayT = 0; }
      vm.draw(hintsFor(el));
      if (!menuMesh.visible && vm.layout) { ghostK = 0; menuGhost.visible = false; menuK = 0; menuMat.opacity = 0; panelScale(menuMesh, 0.94); }   // just opened: starts clear and a touch small (menuAnim brings it in)
      menuMesh.visible = !!vm.layout; return menuMesh.visible;
    }
    // ---- laser pointer: point at a tile (it lights up, a soft tick in that hand), pull and RELEASE the trigger to press it.
    //      Holding the trigger and moving up/down drags the list (and cancels the press); the right stick scrolls too. ----
    const rc = new THREE.Raycaster(), rO = new THREE.Vector3(), rD = new THREE.Vector3();
    const trig = { left: { on: false, t: null, v0: 0, last: 0, drag: false }, right: { on: false, t: null, v0: 0, last: 0, drag: false } };
    let pressN = 0;
    function pressEl(t) {
      pressN++;
      try { t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'pen', isPrimary: true })); t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'pen' })); } catch (e) { /* old browser */ }
      t.click();
    }
    function press(t) {
      if (!t) return;
      if (t.action === 'shopClose') { if (o.shopClose) o.shopClose(); pressN++; }
      else if (t.el) {
        if (!t.el.isConnected && menuEl) { const L0 = vm.layout, list = t.exit ? L0.exits : L0.tiles, i = list.indexOf(t); vm.refreshEls(menuModel(menuEl)); t = list[i] || t; }
        if (t.el && t.el.isConnected) pressEl(t.el);
      }
      modelT = 0.05;                                                   // redraw soon: the press usually changes the menu
    }
    function back() {                                                  // Y in a menu: the panel's exit, or resume from pause
      if (!menuEl || dipT > 0) return;
      const L0 = vm.layout; if (L0 && L0.exits.length) { press(L0.exits[0]); return; }
      if (menuEl.id === 'start' && o.started()) { const p = $('play'); if (p && !p.disabled) pressEl(p); }
    }
    const laserMatHi = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.8, fog: false });
    function laser() {
      let hov = null, hovHand = null;
      cursor.visible = false;
      for (const c of ctl) {
        if (!c.hand) continue;
        const g = c.gamepad, on = btnOn(g, 0, 0.55), T = trig[c.hand];
        if (!menuMesh.visible) { c.laser.visible = false; c.sqOn = false; T.on = on; T.t = null; continue; }
        // a steady beam: the hand's tremor is filtered out. Light filtering when the hand is still (~55 ms), almost none on a quick sweep,
        // and a jump of 20 degrees or more in one frame is taken at once. What the beam and cursor show is exactly what a pull presses.
        c.ray.updateMatrixWorld(); rO.setFromMatrixPosition(c.ray.matrixWorld); c.ray.getWorldQuaternion(rq);
        if (!c.sqOn) { c.sq.copy(rq); c.sqOn = true; c.spd = 0; }
        else if (c.sq.angleTo(rq) > LASER_SNAP) { c.sq.copy(rq); c.spd = 0; }
        else { const dt = Math.max(lastDt, 1e-3); c.pq.copy(c.sq); c.sq.slerp(rq, 1 - Math.exp(-dt * laserRate(c.spd))); c.spd += (c.pq.angleTo(c.sq) / dt - c.spd) * (1 - Math.exp(-dt * 20)); }
        c.lp.quaternion.copy(rq).invert().multiply(c.sq); rD.set(0, 0, -1).applyQuaternion(c.sq);
        rc.set(rO, rD); const hit = dipT > 0 ? null : rc.intersectObject(menuMesh, false)[0];
        c.laser.visible = true; const len = hit ? hit.distance : 1.2; c.laser.scale.z = len; c.laser.position.z = -len / 2;
        const t = hit && hit.uv ? vm.hit(hit.uv.x, hit.uv.y) : null; laserUv[c.hand] = hit && hit.uv ? [+hit.uv.x.toFixed(3), +hit.uv.y.toFixed(3)] : null;
        c.laser.material = t ? laserMatHi : laserMat;
        if (hit && hit.uv) {
          if (on && !T.on) { T.t = t; T.v0 = hit.uv.y; T.last = hit.uv.y; T.drag = false; scrollV = 0; }   // a pull stops a gliding list (it holds still under the laser)
          else if (on && T.on) { if (Math.abs(hit.uv.y - T.v0) > 0.035) T.drag = true; if (T.drag) { const d = (hit.uv.y - T.last) * XrMenu.H * 1.2; vm.scrollBy(d); scrollV += ((lastDt > 0 ? d / lastDt : 0) - scrollV) * 0.35; dragging = true; } T.last = hit.uv.y; }
          if (c.hand === 'right' || !cursor.visible) { cursor.visible = true; cursor.position.copy(hit.point); dolly.worldToLocal(cursor.position); cursor.quaternion.copy(menuMesh.quaternion); cursor.translateZ(0.004); cursor.scale.setScalar(on ? 0.83 : 1); }
        }
        if (!on && T.on) { if (!T.drag && T.t && t && (T.t === t || (T.t.title === t.title && T.t.x === t.x && T.t.y === t.y))) {   // the same tile, even if the menu was redrawn while the trigger was down
           press(T.t); pulse(c.hand, 0.35, 25); } T.t = null; T.drag = false; }
        T.on = on;
        if (t && (c.hand === 'right' || !hov)) { hov = t; hovHand = c.hand; }
      }
      if (vm.setHover(hov) && hov) pulse(hovHand, 0.1, 8);              // a light tick each time the highlight moves to a new card or button
      // scrolling: the right stick sets a speed the list eases to; a trigger-drag moves it 1:1 and, let go, it glides on and slows down
      if (menuMesh.visible && dipT <= 0) {
        const rs = XrInput.rightStick(hands.right && hands.right.gamepad), ry = Math.abs(rs.y) > 0.15 ? Math.sign(rs.y) * Math.pow((Math.abs(rs.y) - 0.15) / 0.85, 1.4) : 0;
        if (dragging) { if (!trig.left.drag && !trig.right.drag) dragging = false; }
        else if (ry) scrollV += (ry * 1500 - scrollV) * (1 - Math.exp(-lastDt * 10));
        else scrollV *= Math.exp(-lastDt * 9);                         // a short, gentle glide after the stick or a drag lets go
        if (!dragging && Math.abs(scrollV) > 4) { if (!vm.scrollBy(scrollV * lastDt)) scrollV = 0; } else if (!dragging) scrollV = 0;
      } else { scrollV = 0; dragging = false; }
    }
    const laserUv = { left: null, right: null }, rq = new THREE.Quaternion(); let scrollV = 0, dragging = false;
    let hudT = 0;
    const txt = (id) => { const e = $(id); return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; };
    const shown = (id) => { const e = $(id); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; };
    function drawHud(st, running) {
      const W = hc.width, H = hc.height; hx.clearRect(0, 0, W, H);
      hx.textBaseline = 'top'; hx.shadowColor = '#000'; hx.shadowBlur = 8;
      const line = (s, x, y, size, col, align, disp) => { hx.font = (disp ? '' : '700 ') + size + 'px ' + (disp ? "'Pirata One', Georgia, serif" : "'Barlow Condensed', 'Arial Narrow', sans-serif"); hx.fillStyle = col || '#f3e6d8'; hx.textAlign = align || 'left'; hx.fillText(s, x, y); };
      const p = st.player;
      if (opts.perf) line(fps + ' fps', 40, 6, 30, fps >= 70 ? '#7dff7d' : fps >= 55 ? '#ffd060' : '#ff5050');
      // bottom strip: health bar, ammo, wave, kills
      const hpK = Math.max(0, Math.min(1, p.hp / (p.maxHp || 100)));
      hx.fillStyle = 'rgba(0,0,0,0.55)'; hx.fillRect(40, 430, 360, 34); hx.fillStyle = hpK < 0.3 ? '#e23a42' : '#a31d26'; hx.fillRect(44, 434, 352 * hpK, 26);
      line('HP ' + Math.ceil(p.hp), 52, 436, 24);
      line((p.reloading ? 'RELOADING ' : '') + p.ammo + ' / ' + p.magSize, W - 40, 426, 40, p.ammo <= Math.ceil(p.magSize * 0.25) ? '#e23a42' : '#ecdfc6', 'right', true);
      line('Wave ' + txt('waveN') + '   Lvl ' + txt('lvlN') + '   Kills ' + st.kills + '   Gold ' + txt('goldN'), W / 2, 470, 26, '#cfa54a', 'center');
      // middle: banners, menus, prompts
      let y = 40;
      const center = (s, size, col) => { line(s, W / 2, y, size, col, 'center'); y += size + 12; };
      const bn = $('banner');
      if (bn && bn.classList.contains('show') && adsK < 0.15) { center(txt('bannerT'), 52, '#ff4a4a'); center(txt('bannerS'), 28); }
      if (shown('boss')) center(txt('bossName'), 28, '#ff8a60');
      if (menuPanel(running, 0)) { const toastE = $('padToast'); if (toastE && toastE.classList.contains('show')) center(toastE.textContent, 24, '#cfa54a'); return; }   // the real menu is on its own panel
      if (!running) { center(o.started() ? 'PAUSED' : 'CRIMSON PLAGUE', 56, '#ff4a4a'); center('Point and pull the trigger on the menu    Y: pause', 26, '#ecdfc6'); return; }
      if (st.over) { center('YOU FELL', 56, '#ff4a4a'); center(txt('overStats'), 24); center('Point at RISE AGAIN and pull the trigger', 28); return; }
      if (st.choices || st.classChoices || st.shop) {
        center(txt('luTitle') || (st.shop ? 'THE MERCHANT' : 'LEVEL UP'), 40, '#ffcf6a');
        for (const id of ['classCards', 'cards']) {
          const box = $(id); if (!box || !box.children.length || box.offsetParent === null && box.hidden) continue;
          Array.from(box.children).slice(0, 6).forEach((c) => { const sel = c.classList.contains('sel'); center((sel ? '> ' : '') + (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) + (sel ? ' <' : ''), 24, sel ? '#ffe08a' : '#cbb8a8'); });
        }
        center('Point with the laser and pull the trigger to pick' + (st.shop ? '   Y: leave the merchant' : ''), 22, '#a89080');
        return;
      }
      const lb = $('lockBox'); if (lb && getComputedStyle(lb).display !== 'none' && lb.offsetParent !== null) { center(txt('lockTxt'), 24, '#cfa54a'); const b0 = txt('lockB0'), b1 = txt('lockB1'); center((b0 ? 'Grip: ' + b0 : '') + (b1 ? '    Right stick down: ' + b1 : ''), 22); }
      const fc = $('floorCard'); if (fc && fc.offsetParent !== null && txt('floorCard')) center('Grip (reach or point at it): pick up  ' + txt('floorCard').slice(0, 44), 22, '#ecdfc6');
      const sh = $('stashHint'); if (sh && !sh.hidden) center('STASH CHEST: grip', 22, '#cfa54a');
      const mm = o.map && o.map.small;                                // (hidden, with the WAVE banner, while aiming down sights: both sat over the sight picture) the corner map, bottom left of the view (turn the LEFT palm up for the whole floor in your hand)
      if (mm && mm.width && !mapMesh.visible && adsK < 0.15) { hx.shadowBlur = 0; hx.globalAlpha = 0.92; hx.imageSmoothingEnabled = false; hx.drawImage(mm, 24, 140, 280, 280); hx.imageSmoothingEnabled = true; hx.globalAlpha = 1; hx.strokeStyle = '#6a2a2e'; hx.lineWidth = 3; hx.strokeRect(24, 140, 280, 280); hx.shadowBlur = 8; line('Left palm up: full map', 24, 110, 20, '#cfa54a'); }   // 280 px (was 170), clear of the health bar at y 430
      const toastE = $('padToast'); if (toastE && toastE.classList.contains('show')) center(questText(toastE.textContent), 24, '#e8c890');
    }

    let lastDt = 1 / 72;
    function update(st, running, dt) {
      if (!session) return;
      lastDt = dt || lastDt;
      lastSt = st;
      const p = st.player;
      const dYaw = turn.step(hands.right && hands.right.gamepad, dt, opts.snap ? 0 : turnSpeedOf()); bodyYaw += dYaw;
      fpsN++; fpsT += dt; if (fpsT >= 0.5) { fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
      if (opts.vignette) {
        const want = Math.min(1, (Math.hypot(p.vx || 0, p.vz || 0) / 7) + Math.abs(dYaw) / Math.max(dt, 1e-3) / 2.5) * 0.6;
        moveK += (want - moveK) * Math.min(1, dt * 6); vig.material.opacity = moveK; vig.visible = moveK > 0.03;
        vig.scale.setScalar(1.25 - moveK * 0.3);
      }
      dolly.position.set(p.x, p.eye, p.z);
      dolly.rotation.set(0, -bodyYaw, 0);
      dolly.updateMatrixWorld(true);
      fall(dt); mapHand(dt, running);
      placeGun(p);
      hitMarkStep(dt);
      menuPanel(running, dt); menuAnim(dt);
      inter.update(st, running, dt, menuMesh.visible);
      if (vrHands) {
        const g = o.gunParts && o.gunParts();
        if (g && g.gunBody) {
          if (foreMark.parent !== g.gunBody) g.gunBody.add(foreMark);
          if (gripMark.parent !== g.gunBody) g.gunBody.add(gripMark);
          if (g.fore) foreMark.position.copy(g.fore);
          // sit on the same grip point as the (hidden) viewmodel hand; never parent to that hand, it is invisible
          if (o.arms && o.arms[1]) gripMark.position.copy(o.arms[1].position);
        }
        const type = (g && g.type) || 'rifle';
        vrHands.update({
          presenting: !!session, left: hands.left, right: hands.right, type, id: (g && g.id) || '',
          gripObj: gripMark.parent ? gripMark : null, foreObj: foreMark.parent ? foreMark : null,
          twoHand, pistolCup: type === 'pistol' && twoHand,
          reloadObj: (p && p.reloading && o.arms && o.arms[0]) || null,
          grab: inter.debug(), adsK, camera, forceEmpty: handsForce === 'empty'
        });
      }
      laser(dt);
      hudT -= dt; if (hudT <= 0) { hudT = 0.1; drawHud(st, running); hudTex.needsUpdate = true; }
    }
    // ---- aim: the right controller's ray (smoothed) ----
    const rP = new THREE.Vector3(), magwell = new THREE.Vector3(), tgtQ = new THREE.Quaternion();
    const gl = new THREE.Vector3();
    function toRig(obj, local, out) { gl.copy(local); obj.localToWorld(gl); return dolly.worldToLocal(out.copy(gl)); }
    const convO = [0, 0, 0], convD = [0, 0, 0], WALK = { '.': 1, c: 1, d: 1, P: 1 }; let convDist = 0, lastSt = null;
    const wallAt = (x, z) => { const m = o.levelMap && o.levelMap(); if (!m) return false; const r = m.rows[Math.floor(z / m.CELL)]; return !r || !WALK[r[Math.floor(x / m.CELL)]]; };
    function aim() {
      if (!session) return null;
      const h = !opts.gaze && hands.right;
      if (h) { rP.copy(h.grip.position); supportHand(); handsAim(tgtQ); }
      else { camera.matrixWorld.decompose(v3, q4, tmpS); dollyInv.copy(dolly.quaternion).invert(); tgtQ.copy(dollyInv).multiply(q4); rP.copy(camera.position); }
      if (!aimInit) { aimLocal.copy(tgtQ); aimInit = true; } else { const gp = o.gunParts && o.gunParts(); const adsSmooth = adsK > 0.5 ? (opts.oldads ? adsOf().smooth : ((typeof XrAds !== 'undefined' && XrAds.of((gp && gp.type) || 'rifle', gp && gp.id).aimRate) || 28)) : 0; aimLocal.slerp(tgtQ, Math.min(1, XrFeel.aimRate((gp && gp.type) || 'rifle', twoHand, adsSmooth) * lastDt)); }   // heavier guns trail the hand a touch; steadier while aiming down sights or with two hands
      aimQ.copy(dolly.quaternion).multiply(aimLocal);                // world aim (the gun in the hand follows this)
      fwd.set(0, 0, -1).applyQuaternion(aimQ);
      v3.copy(rP).applyMatrix4(dolly.matrixWorld);
      // Fire ray. New ADS: stays on the sight line, zeroed at 25 m; the shot starts at the right eye
      // when you are aiming (the eye sits on that line) so the impact matches the reticle. ?oldads keeps
      // the old path (muzzle-parallel, then the head is aimed at that hit).
      const gp = o.gunParts && o.gunParts();
      const pl = lastSt && lastSt.player;
      if (!opts.oldads && typeof XrAds !== 'undefined' && pl && h && gp && (gp.sight || gp.muzzle)) {
        const originW = adsK > 0.7 ? eyeW.copy(eyeP).applyMatrix4(dolly.matrixWorld) : eyeW.set(pl.x, pl.eye, pl.z);
        if (gp.sight) { gp.sight.updateMatrixWorld(true); gp.sight.getWorldPosition(sightW); }
        else if (gp.muzzle) { gp.muzzle.updateMatrixWorld(true); gp.muzzle.getWorldPosition(sightW); }
        // visual recoil is look only: the fire ray follows the smoothed aim, so the red dot stays on the shot
        dirW.set(0, 0, -1).applyQuaternion(aimQ);
        const muz = (gp.muzzle && (gp.muzzle.updateMatrixWorld(true), gp.muzzle.getWorldPosition(v3), [v3.x, v3.y, v3.z])) || null;
        const relief = adsInfo.relief || 0.14;
        const sightForFire = adsK > 0.7
          ? [originW.x + dirW.x * relief, originW.y + dirW.y * relief, originW.z + dirW.z * relief]
          : [sightW.x, sightW.y, sightW.z];
        const fr = XrAds.fire([originW.x, originW.y, originW.z], sightForFire, [dirW.x, dirW.y, dirW.z], muz);
        adsInfo.angleDeg = fr.angleDeg;
        // first hit along the sight line, then fire from the origin at that point so the shot and the reticle agree
        convO[0] = sightW.x; convO[1] = sightW.y; convO[2] = sightW.z; convD[0] = fr.dir[0]; convD[1] = fr.dir[1]; convD[2] = fr.dir[2];
        const dSight = XrFeel.converge(convO, convD, lastSt.monsters, wallAt, 40);
        const hx = sightW.x + fr.dir[0] * dSight, hy = sightW.y + fr.dir[1] * dSight, hz = sightW.z + fr.dir[2] * dSight;
        tmpS.set(hx - originW.x, hy - originW.y, hz - originW.z); const L = tmpS.length() || 1;
        fwd.copy(tmpS).multiplyScalar(1 / L);
        convO[0] = originW.x; convO[1] = originW.y; convO[2] = originW.z; convD[0] = fwd.x; convD[1] = fwd.y; convD[2] = fwd.z;
        const d = XrFeel.converge(convO, convD, lastSt.monsters, wallAt, 40); convDist = d;
        v3.set(originW.x, originW.y, originW.z).addScaledVector(fwd, d);
        reticle.visible = !menuMesh.visible; reticle.position.copy(v3); reticle.quaternion.copy(aimQ); reticle.scale.setScalar(Math.max(0.5, d / 6));
        placeFireDot(v3, fwd, d, !menuMesh.visible);
        const ang = XrInput.dirToAngles(fwd.x, fwd.y, fwd.z);
        ang.origin = [originW.x, originW.y, originW.z];
        return ang;
      }
      if (gp && gp.muzzle) { gp.muzzle.updateMatrixWorld(true); gp.muzzle.getWorldPosition(v3); }
      if (pl && h) {
        convO[0] = v3.x; convO[1] = v3.y; convO[2] = v3.z; convD[0] = fwd.x; convD[1] = fwd.y; convD[2] = fwd.z;
        const dBar = XrFeel.converge(convO, convD, lastSt.monsters, wallAt, 40);
        v3.addScaledVector(fwd, dBar);                                 // where the barrel points
        tmpS.set(v3.x - pl.x, v3.y - pl.eye, v3.z - pl.z); const L = tmpS.length() || 1;
        const fire = L > 0.4;                                          // the rules shoot from the eye toward that point
        if (fire) { fwd.copy(tmpS).multiplyScalar(1 / L); v3.set(pl.x, pl.eye, pl.z); }
        convO[0] = v3.x; convO[1] = v3.y; convO[2] = v3.z; convD[0] = fwd.x; convD[1] = fwd.y; convD[2] = fwd.z;
        const d = XrFeel.converge(convO, convD, lastSt.monsters, wallAt, 40); convDist = d;
        v3.addScaledVector(fwd, d);                                    // impact along the actual fire ray (eye -> barrel point), so the dot cannot sit behind a wall the shot would hit
        reticle.visible = !menuMesh.visible; reticle.position.copy(v3); reticle.quaternion.copy(aimQ); reticle.scale.setScalar(Math.max(0.5, d / 6));
        placeFireDot(v3, fwd, d, !menuMesh.visible);
        return XrInput.dirToAngles(fwd.x, fwd.y, fwd.z);
      }
      reticle.visible = !menuMesh.visible; reticle.position.copy(v3).addScaledVector(fwd, 6); reticle.quaternion.copy(aimQ); reticle.scale.setScalar(1);
      placeFireDot(reticle.position, fwd, 6, !menuMesh.visible);
      return XrInput.dirToAngles(fwd.x, fwd.y, fwd.z);
    }
    // ---- reload: the game's own reload animation plays on the gun (screen.js animateReload); here only the old magazine falling away ----
    let dropMag = null, dropV = 0, dropN = 0;
    function dropMagFrom(mag) {                                       // a copy of the gun's own magazine part drops from the magwell and tumbles to the floor
      if (!session || !mag) return;
      if (dropMag) dolly.remove(dropMag);
      mag.updateMatrixWorld(true); dropMag = mag.clone(); dropMag.visible = true; dropMag.matrixAutoUpdate = true;
      mag.matrixWorld.decompose(dropMag.position, dropMag.quaternion, dropMag.scale);
      dolly.worldToLocal(dropMag.position); dropMag.quaternion.premultiply(dollyInv.copy(dolly.quaternion).invert());
      dolly.add(dropMag); dropV = 0.4; dropN++;
      toRig(mag.parent, mag.position, magwell);
    }
    function fall(dt) { if (dropMag) { dropV += 9.8 * dt; dropMag.position.y -= dropV * dt; dropMag.rotation.x += dt * 4; dropMag.rotation.z += dt * 2; if (dropMag.position.y < -2.2) { dolly.remove(dropMag); dropMag = null; } } }
    const btnOn = (g, i, th) => { const b = g && g.buttons && g.buttons[i]; return !!b && (b.pressed || b.value > (th || 0.5)); };
    // ---- palm map (owner, 2026-11-19): turn your LEFT hand palm-up, so you look at the bottom of the left controller, and the floor map
    //      lies on that hand like a card you are holding: explored rooms, you (arrow = facing), the exit gate, monsters, the gold road.
    //      It rides the hand every frame, so it works while you run and look around, and fades out (150 ms) when you turn the hand back.
    //      Guarded so it cannot pop open in a fight: not while aiming down sights, holding the gun with two hands, grabbing, or in a menu,
    //      and the palm must face your eyes for ~0.12 s (it closes with some slack so a wobble does not flicker it). Double-tap Y still toggles
    //      it (then it floats over the hand, as before).
    const mapCv = o.map && o.map.big, mapTex = mapCv ? new THREE.CanvasTexture(mapCv) : null;
    if (mapTex) { mapTex.minFilter = THREE.LinearFilter; mapTex.generateMipmaps = false; }
    const PALM_MAP = 0.26;                                             // metres across (about 40 degrees at a held-out hand: easy to read)
    const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(PALM_MAP, PALM_MAP), new THREE.MeshBasicMaterial({ map: mapTex, transparent: true, opacity: 0.97, depthTest: false, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    mapMesh.renderOrder = 999.4; mapMesh.visible = false; mapMesh.name = 'xr_palm_map';   // over the HUD strip
    const mapFrame = new THREE.Mesh(new THREE.PlaneGeometry(PALM_MAP * 1.06, PALM_MAP * 1.06), new THREE.MeshBasicMaterial({ color: 0x2a0d10, transparent: true, depthTest: false, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    mapFrame.renderOrder = 999.2; mapFrame.position.z = -0.001; mapMesh.add(mapFrame);
    let mapHeld = false, mapT = 0, mapHost = null, mapK = 0;          // mapK: the map's 150 ms fade/grow in and out (menu smoothing)
    const camUp = new THREE.Vector3();
    let mapOpen = false, palmUp = false, palmT = 0, palmDot = -1;
    const PALM_ON = 0.6, PALM_OFF = 0.35, PALM_HOLD = 0.12;
    const gBot = new THREE.Vector3(), gFwd = new THREE.Vector3(), toEye = new THREE.Vector3(), mN = new THREE.Vector3(), mUp = new THREE.Vector3(), mX = new THREE.Vector3(), mM = new THREE.Matrix4(), headP = new THREE.Vector3();
    function palmCheck(L, dt) {                                        // rig space: the controller's bottom (-Y of the grip) toward the eyes
      gBot.set(0, -1, 0).applyQuaternion(L.grip.quaternion);
      headP.copy(camera.position); toEye.copy(headP).sub(L.grip.position); const dist = toEye.length(); toEye.divideScalar(dist || 1);
      palmDot = gBot.dot(toEye);
      const busy = adsK > 0.2 || twoHand || btnOn(L.gamepad, 1, 0.5) || dist > 0.9;       // (not while the left hand grabs or holds the gun)
      const want = !busy && (palmUp ? palmDot > PALM_OFF : palmDot > PALM_ON);
      palmT = want ? palmT + dt : 0;
      palmUp = want && (palmUp || palmT >= PALM_HOLD);
    }
    function mapHand(dt, running) {
      const L = hands.left;
      if (!running || menuMesh.visible || !L || !mapTex) { mapOpen = false; palmUp = false; palmT = 0; }
      else palmCheck(L, dt);
      const show = mapOpen || palmUp;
      if (show !== mapHeld) { mapHeld = show; if (o.map) { if (o.map.fit) o.map.fit(show); o.map.open(show); } pulse('left', show ? 0.25 : 0.12, 15); }
      if (mapHost !== dolly) { dolly.add(mapMesh); mapHost = dolly; }
      mapK = show ? Math.min(1, mapK + Math.min(dt, 0.05) / MENU_FADE) : Math.max(0, mapK - Math.min(dt, 0.05) / MENU_FADE);
      if (!show && (!L || !mapTex)) mapK = 0;
      mapMesh.visible = mapK > 0;
      if (!mapMesh.visible) return;
      const e = show ? ease(mapK) : mapK * mapK; mapMesh.material.opacity = 0.97 * e; mapMesh.children[0].material.opacity = e; mapMesh.scale.setScalar(0.9 + 0.1 * e);
      if (palmUp || (!mapOpen && palmDot > 0)) {
        // on the palm: the card lies on the hand (a hair above the controller's bottom), its face tipped halfway toward your eyes so it reads
        // at any wrist angle, the top of the map toward your fingertips (the controller's forward)
        gBot.set(0, -1, 0).applyQuaternion(L.grip.quaternion); gFwd.set(0, 0, -1).applyQuaternion(L.grip.quaternion);
        toEye.copy(camera.position).sub(L.grip.position).normalize();
        mN.copy(gBot).add(toEye).normalize();
        camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);                           // north up as you see it, so it reads level at any wrist roll
        mUp.copy(camUp).addScaledVector(mN, -camUp.dot(mN)); if (mUp.lengthSq() < 1e-4) mUp.copy(gFwd); mUp.normalize();
        mX.crossVectors(mUp, mN).normalize();
        mM.makeBasis(mX, mUp, mN); mapMesh.quaternion.setFromRotationMatrix(mM);
        mapMesh.position.copy(L.grip.position).addScaledVector(gBot, 0.035).addScaledVector(gFwd, 0.05);
      } else {
        mapMesh.position.copy(L.grip.position); mapMesh.position.y += 0.13;                 // double-tap Y: just above the hand
        mapMesh.lookAt(v3.copy(camera.position).applyMatrix4(dolly.matrixWorld));           // always turned to face you (lookAt works in world space)
      }
      mapT -= dt; if (mapT <= 0) { mapT = 0.15; mapTex.needsUpdate = true; }
    }
    const canFire = () => true, takeReload = () => false, onReloadStart = () => {}, poseGun = () => {};   // kept so older callers stay harmless
    const srcBuf = [];
    function sources() {
      if (!session) return [];
      srcBuf.length = 0;
      const list = session.inputSources;
      for (let i = 0; i < list.length; i++) { const s = list[i]; if (s && s.gamepad) srcBuf.push(s); }   // XRInputSource already has handedness + gamepad
      for (const c of ctl) { c.gamepad = null; if (c.hand) for (let i = 0; i < srcBuf.length; i++) if (srcBuf[i].handedness === c.hand) c.gamepad = srcBuf[i].gamepad; }
      return srcBuf;
    }
    // the direction your head (or a hand) faces, as the game's yaw, flattened to the floor. Movement goes this way, not where the gun points (?aimmove for the old way).
    function poseYaw(obj) {
      if (!obj) return null;
      obj.updateMatrixWorld(true); obj.matrixWorld.decompose(v3, q4, tmpS); fwd.set(0, 0, -1).applyQuaternion(q4);
      return XrInput.dirToAngles(fwd.x, 0, fwd.z).yaw;
    }
    function headYaw() {
      if (!session || opts.aimMove) return null;
      return poseYaw(camera);
    }
    function handYaw(which) {
      if (!session || opts.aimMove) return null;
      const h = hands[which];
      return poseYaw(h && (h.ray || h.grip));
    }
    function walkYaw() {
      if (comfort.walkHand) { const y = handYaw('left'); if (y !== null) return y; }
      return headYaw();
    }
    // a short buzz in one hand (fire, getting hit). Quest exposes hapticActuators[0].pulse
    function pulse(hand, strength, ms) {
      if (!session) return;
      for (let i = 0; i < session.inputSources.length; i++) {
        const s = session.inputSources[i]; if (s.handedness !== hand || !s.gamepad) continue;
        const a = s.gamepad.hapticActuators && s.gamepad.hapticActuators[0];
        try { if (a && a.pulse) a.pulse(strength, ms); else if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength }); } catch (e) { /* no haptics */ }
      }
    }
    // grips: what a squeeze did this frame (xr_interact.js): { type: 'item', id } take that exact item, { type: 'use' } use the gate / door /
    // chest / puzzle you stand at, { type: 'swap' } the gun on your back. Either hand; the left grip on the gun's fore-end is the support hand instead.
    function grab() { return session ? inter.take() : null; }
    function aimDir(out) { return out.set(0, 0, -1).applyQuaternion(aimQ); }
    const yBtn = XrInput.createY(); let yNow = { tap: false, hold: false, progress: 0 };
    function pad() {
      if (!session) return null;
      const src = sources(), L = hands.left, yOn = btnOn(L && L.gamepad, 5);
      yNow = yBtn.step(yOn, lastDt);
      const menu = menuMesh.visible;
      if (menu) { if (yNow.up) { yBtn.reset(); back(); } yNow = { tap: false, hold: false, double: false, up: false, progress: 0 }; }   // Y in a menu = back at once: no menu can trap you
      else if (yNow.double) mapOpen = !mapOpen;                        // double-tap Y: map on / off
      else if (yNow.tap && mapOpen) { mapOpen = false; yNow = Object.assign({}, yNow, { tap: false }); }   // a tap with the map open just closes it (no pause)
      if (yNow.hold && !menu) pulse('left', 0.4, 30);
      return XrInput.toPad(src, { y: yNow, menu });
    }

    let farWas = 120;
    async function enter() {
      if (session) { session.end(); return; }
      try {
        const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
        renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local'); renderer.xr.setFramebufferScaleFactor(opts.scale);   // ~80% resolution: holds 72/90 fps
        await renderer.xr.setSession(s);
        const bl = s.renderState && s.renderState.baseLayer; if (bl && 'fixedFoveation' in bl) bl.fixedFoveation = 1;   // full fixed foveation: edges drawn coarser, centre sharp
        if (renderer.xr.setFoveation) renderer.xr.setFoveation(1);
        session = s; aimInit = false; bodyYaw = o.playerYaw(); turn.reset(); hudMesh.visible = true; btn.textContent = 'EXIT VR'; btn.hidden = true;
        s.addEventListener('end', () => {
          session = null; inter.clear(); renderer.xr.enabled = false; vig.visible = false; hudMesh.visible = false; reticle.visible = false; fireDot.visible = false; menuMesh.visible = false; if (adsBlend) adsBlend.reset(); camera.near = camNear0; camera.updateProjectionMatrix();
          dolly.position.set(0, 0, 0); dolly.rotation.set(0, 0, 0); if (gun.parent !== camera) camera.add(gun);
          for (const m of (o.arms || [])) m.visible = true; if (mapHeld && o.map) o.map.open(false); mapHeld = false; mapK = 0; mapMesh.visible = false;
          btn.textContent = 'ENTER VR'; btn.hidden = false; if (onEnd) onEnd();
        });
        for (const m of (o.arms || [])) m.visible = false;          // no viewmodel hands or forearms in VR: just the gun
        if (onStart) onStart();
      } catch (e) { o.toast('Could not start VR: ' + (e && e.message ? e.message : e)); }
    }
    // the button: added to the start card only when this browser can really do immersive VR (Quest Browser can; phones and desktops without a headset do not)
    const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'vrBtn'; btn.textContent = 'ENTER VR'; btn.hidden = true;
    // big, fixed on top of everything (start card, menus, HUD) so it can never be scrolled away or covered
    btn.style.cssText = 'position:fixed;z-index:2147483000;left:50%;top:14px;transform:translateX(-50%);padding:18px 44px;font:800 28px sans-serif;letter-spacing:.14em;color:#fff;background:#b0101e;border:3px solid #ffd27a;border-radius:12px;box-shadow:0 0 24px #ff3040;cursor:pointer';
    btn.addEventListener('click', enter);
    const show = (note) => { if (!btn.isConnected) document.body.appendChild(btn); btn.hidden = false; if (note) btn.title = note; };
    try {
      if (navigator.xr) {
        show();                                                     // shown straight away whenever WebXR exists (the Quest browser), not after a slow check
        if (navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then((ok) => { if (!ok) { if (/OculusBrowser|Quest/i.test(navigator.userAgent)) btn.textContent = 'ENTER VR (allow VR in browser settings)'; else btn.hidden = true; } }).catch(() => {});
      } else if (/OculusBrowser|Quest/i.test(navigator.userAgent)) { show(); btn.textContent = 'VR needs https'; }
    } catch (e) { /* no WebXR here */ }

    // in VR, put the camera back at the head pose the headset gave last frame (the game's flat-screen camera code is skipped)
    // in VR three.js already leaves the camera at the head pose after each render. Never read the XR camera's own world pose here:
    // asking it for a world quaternion rebuilds its matrix from its world position, which doubled the player offset and put the view inside the walls
    function headPose() { /* nothing to do: the camera keeps last frame's head pose */ }
    // during a run the button shrinks into the top-left corner so it does not cover the wave counter
    function corner(on) {
      btn.style.left = on ? '10px' : '50%'; btn.style.top = on ? 'auto' : '14px'; btn.style.bottom = on ? '10px' : 'auto';
      btn.style.transform = on ? 'none' : 'translateX(-50%)'; btn.style.padding = on ? '8px 16px' : '18px 44px'; btn.style.fontSize = on ? '15px' : '28px';
    }
    return { comfort: () => Object.assign({}, comfort), setComfort, poseGun, alignAds, handsForce: (v) => { handsForce = v || null; }, dropMag: dropMagFrom, update, aim, pad, headPose, headYaw, handYaw, walkYaw, turnSpeed: turnSpeedOf, snapDeg: snapDegOf, pulse, aimDir, corner, grab, questText, canFire, takeReload, onReloadStart, menuOpen: () => menuMesh.visible, menuCanvas: () => vm.canvas, renderScope, menuHit: (u, v) => { const t = vm.hit(u, v); return t ? t.title : null; }, shotFx, hitFx, hitMark, feel: () => ({ conv: convDist, shotN, hitN, kick: lastKick, rot: recRot.x, back: recBack.x, marker: hitMk.visible, dot: fireDot.visible ? fireDotPos.toArray() : null, ads: { k: adsK, angleDeg: adsInfo.angleDeg, relief: adsInfo.relief, old: !!opts.oldads, id: adsInfo.id } }), adsInfo: () => ({ k: adsK, angleDeg: adsInfo.angleDeg, relief: adsInfo.relief, old: !!opts.oldads, id: adsInfo.id }), menuTiles: () => { const L = vm.layout; if (!L) return []; const W = XrMenu.W, H = XrMenu.H, V = XrMenu.VIEW, sc = vm.scroll; return L.tiles.map((t) => ({ title: t.title, disabled: !!t.disabled, u: (t.x + t.w / 2) / W, v: 1 - (t.y - sc + t.h / 2) / H, inView: t.y - sc >= 0 && t.y + t.h - sc <= V })).concat(L.exits.map((t) => ({ title: t.title, exit: true, u: (t.x + t.w / 2) / W, v: 1 - (t.y + t.h / 2) / H, inView: true }))); }, faceYaw: (y) => { bodyYaw = y; }, debug: () => ({ grab: inter.debug(), pressN, menuId: menuPlacedFor, dropN, dropping: !!dropMag, magwell: magwell.toArray(), mapShown: mapHeld, armsHidden: (o.arms || []).every((m) => !m.visible), magVisible: !!(o.gunParts() && o.gunParts().mag.visible), hover: vm.hover ? vm.hover.title : null, laserUv, scroll: vm.scroll, maxScroll: vm.maxScroll, tiles: vm.layout ? vm.layout.tiles.length : 0, exits: vm.layout ? vm.layout.exits.map((e) => e.title) : [], adsK, scopeOn, scope: { on: scopeOn, zoom: scopeZoom, fov: +scopeFov.toFixed(3), n: scopeN, res: SCOPE_RES }, gloveOn: !!(o.arms && o.arms[0] && o.arms[0].visible), handsOn: !!(vrHands && vrHands.visible()), vrHands: vrHands ? vrHands.status() : { on: false, noHands: true }, twoHand, gripErr, foreAt: (() => { const g = o.gunParts && o.gunParts(); if (!g || !g.gunBody) return null; g.gunBody.updateMatrixWorld(true); const v = g.fore.clone().applyMatrix4(g.gunBody.matrixWorld); dolly.worldToLocal(v); return [v.x, v.y, v.z].map((n) => +n.toFixed(3)); })(), hit: (u, v) => 0, menu: menuMesh.visible, menuPos: menuMesh.position.toArray(), menuScale: menuMesh.scale.toArray(), aim: aimLocal.toArray() }), menuShown: () => menuMesh.visible, smooth: () => ({ dipN, openN, open: Object.assign({}, openRec), dt: lastDt, textSpot: (() => { const L = vm.layout; if (!L) return null; for (const it of L.items) { if (it.k !== 'title' && it.k !== 'text' && it.k !== 'head') continue; const y = it.y + 24 - vm.scroll; if (y > 10 && y < XrMenu.VIEW - 10) return [0.5, 1 - y / XrMenu.H, it.k]; } return null; })(), menuK, opacity: menuMat.opacity, scale: menuMesh.scale.x / PANEL_W, ghostK, ghost: menuGhost.visible, dip: dipT > 0, hiA: hiCur.a, hi: hiMesh.visible, hiRect: hiMesh.visible ? { x: hiCur.x, y: hiCur.y, w: hiCur.w, h: hiCur.h } : null, scrollV, dragging, mapK, mapVisible: mapMesh.visible, palmUp, palmDot: +palmDot.toFixed(3), laserDir: (hands.right && hands.right.sqOn) ? new THREE.Vector3(0, 0, -1).applyQuaternion(hands.right.sq).toArray() : null }), vigOn: () => vig.visible, presenting: () => !!session, on: (start, end) => { onStart = start; onEnd = end; }, rig: dolly };
  }
  return { create, laserRate, LASER_SNAP };
})();
if (typeof module !== 'undefined') module.exports = XrMode;
