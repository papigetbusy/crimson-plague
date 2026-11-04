/* Meta Quest / WebXR mode: an "Enter VR" button (only shown when the browser can do immersive VR), the VR camera rig,
   the two Touch controllers (simple hand meshes and an aim laser), and a floating HUD you can read in the headset.
   Presentation and input only: it never touches the referee's rules. The game reads its input through the same
   controller path as a normal gamepad (XrInput.toPad -> PadInput), and aim is sent as a mouse-style look input. */
const XrMode = (function () {
  function create(o) {
    const { THREE, renderer, scene, camera, gun, $, gunHome } = o;
    const q = location.search + location.hash;
    const opts = { snap: /[?&#]snap\b/.test(q), gaze: /[?&#]gaze\b/.test(q), perf: /[?&#]perf\b/.test(q), vignette: /[?&#]vignette\b/.test(q), aimMove: /[?&#]aimmove\b/.test(q),
      scale: (() => { const m = /[?&#]xrscale=([0-9.]+)/.exec(q); return m ? Math.max(0.5, Math.min(1, +m[1])) : 0.8; })() };   // ?xrscale=0.7 trades sharpness for speed
    const dolly = new THREE.Group(); dolly.name = 'xrDolly';
    scene.add(dolly); scene.remove(camera); dolly.add(camera);       // flat screen: the rig sits at 0,0,0 with no turn, so nothing changes
    let session = null, bodyYaw = 0, onStart = null, onEnd = null;
    const turn = XrInput.createTurn(opts.snap);
    const TURN_SPEED = 2.2;                                         // smooth turn, radians a second at full tilt (gentler than the flat-screen stick)
    const hands = { left: null, right: null };
    const tmpS = new THREE.Vector3(), v3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), fwd = new THREE.Vector3(), aimQ = new THREE.Quaternion(), aimP = new THREE.Vector3(), headQ = new THREE.Quaternion();
    let aimInit = false, fps = 0, fpsN = 0, fpsT = 0, moveK = 0;
    const AIM_SMOOTH = 28;                                          // per second: takes the hand jitter out of the ray without feeling laggy

    // ---- controllers: rays (aim) and grips (where the hand mesh and the gun sit) ----
    const handMat = new THREE.MeshLambertMaterial({ color: 0x2a1a18, emissive: 0x120806 });
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.55, fog: false });
    const ctl = [0, 1].map((i) => {
      const ray = renderer.xr.getController(i), grip = renderer.xr.getControllerGrip(i);
      dolly.add(ray); dolly.add(grip);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.11), handMat); body.position.z = 0.01; grip.add(body);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 6, 16), handMat); ring.position.set(0, 0.02, -0.05); ring.rotation.x = Math.PI / 3; grip.add(ring);
      const laser = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 1), laserMat); laser.position.z = -0.5; laser.scale.z = 1; laser.visible = false; ray.add(laser);
      const c = { ray, grip, laser, hand: null };
      ray.addEventListener('connected', (e) => { c.hand = e.data && e.data.handedness; if (c.hand === 'left' || c.hand === 'right') hands[c.hand] = c; laser.visible = c.hand === 'right'; });
      ray.addEventListener('disconnected', () => { if (c.hand && hands[c.hand] === c) hands[c.hand] = null; c.hand = null; laser.visible = false; });
      return c;
    });

    // the gun rides in the right hand in VR: an anchor that follows the grip, offset so the gun's usual hip spot lands in the palm
    const gunAnchor = new THREE.Group(); dolly.add(gunAnchor);
    const aimLocal = new THREE.Quaternion(), dollyInv = new THREE.Quaternion();
    function placeGun() {
      const h = hands.right;
      if (!h) { if (gun.parent !== camera) camera.add(gun); return; }
      if (gun.parent !== gunAnchor) gunAnchor.add(gun);
      gunAnchor.position.copy(h.grip.position); gunAnchor.quaternion.copy(aimInit ? aimLocal : h.ray.quaternion);   // held at the grip, pointing along the (smoothed) aim ray
      v3.set(-gunHome.gunX, -gunHome.gunY + 0.02, -gunHome.gunZ - 0.12).applyQuaternion(gunAnchor.quaternion);
      gunAnchor.position.add(v3);
    }

    // ---- HUD: a small canvas in front of your eyes, redrawn a few times a second from the page's own HUD text ----
    const hc = document.createElement('canvas'); hc.width = 1024; hc.height = 512;
    const hx = hc.getContext('2d'), hudTex = new THREE.CanvasTexture(hc);
    const hudMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
    hudMesh.position.set(0, -0.12, -1.1); hudMesh.renderOrder = 999; hudMesh.visible = false; camera.add(hudMesh);
    const reticle = new THREE.Mesh(new THREE.RingGeometry(0.008, 0.013, 16), new THREE.MeshBasicMaterial({ color: 0xffe0c0, depthTest: false, fog: false, transparent: true }));
    reticle.renderOrder = 1000; reticle.visible = false; scene.add(reticle);
    // comfort vignette: a dark ring that closes in a little while you move or turn with the sticks (off with ?novignette)
    const vig = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.6, 32, 1), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
    vig.position.z = -0.3; vig.renderOrder = 998; vig.visible = false; camera.add(vig);
    // the game's own menus (start card, level-up and shop cards, game over, Gear and stash) shown in VR exactly as they look on the
    // flat page: the open menu's HTML is photographed into a texture with html2canvas whenever it changes, and hung in front of you
    const MENUS = ['gearMenu', 'stashMenu', 'levelup', 'gameover', 'mapOverlay', 'start'];
    const menuTex = new THREE.Texture(), menuMat = new THREE.MeshBasicMaterial({ map: menuTex, transparent: true, depthTest: false, depthWrite: false, fog: false });
    const menuMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), menuMat); menuMesh.renderOrder = 1001; menuMesh.visible = false; menuMesh.position.set(0, 0, -1.25); camera.add(menuMesh);
    let menuKey = '', menuBusy = false, menuT = 0, menuOk = false, h2cTried = false;
    // the page's controller prompts name Xbox buttons and a D-pad; the Quest Touch controllers have neither, so VR shows Quest names
    const QUEST_WORDS = [[/D-pad down/g, 'right stick down'], [/D-pad up/g, 'right stick up'], [/(the )?D-pad( or (the )?left stick)?/g, 'left stick'],
      [/\bRT\b( \(R2\))?/g, 'right trigger'], [/\bLT\b( \(L2\))?/g, 'left trigger'], [/\bRB\b/g, 'right stick click'], [/\bLB\b/g, 'right grip'],
      [/\bStart\b( \(Options\))?/g, 'Y'], [/\bBack\b( \(View \/ Share\))?/g, 'left grip + Y'], [/Triangle|\bY\b(?= swaps)/g, 'left grip'], [/\bCross\b/g, 'A'], [/\bSquare\b/g, 'X'], [/\bCircle\b/g, 'B'],
      [/Click the left stick/g, 'Click the left stick (or push it all the way forward)'], [/right stick<\/b> looks/g, 'right stick</b> turns']];
    const questText = (t) => { for (const [re, w] of QUEST_WORDS) t = t.replace(re, w); return t; };
    function questify(root) {
      for (const el of root.querySelectorAll('.padk, .padhelp, #luHint, .gm p, .gm .hint')) { el.innerHTML = questText(el.innerHTML); el.style.display = el.style.display || ''; }
      for (const el of root.querySelectorAll('.kbd, .touchhelp, .keys')) el.style.display = 'none';
      for (const el of root.querySelectorAll('.padk, .padhelp')) el.style.display = 'inline';
    }
    function loadH2c() {
      if (h2cTried || window.html2canvas) return; h2cTried = true;
      const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; sc.async = true; document.head.appendChild(sc);
    }
    function openMenu(running) {
      for (const id of MENUS) { const e = $(id); if (e && !e.hidden && (id !== 'start' || !running) && getComputedStyle(e).display !== 'none') return e; }
      return null;
    }
    function menuPanel(running, dt) {
      const el = openMenu(running);
      if (!el) { menuMesh.visible = false; menuKey = ''; menuOk = false; return false; }
      const card = el.querySelector('.card, .gbody') || el;
      menuT -= dt;
      const key = el.id + '|' + card.innerHTML.length + '|' + Array.from(card.querySelectorAll('.sel, .focus, :focus')).map((n) => n.textContent.length).join(',');
      if (window.html2canvas && !menuBusy && (key !== menuKey || menuT <= 0) && menuT < 1.2) {
        menuBusy = true; const k = key; menuT = 1.5;
        window.html2canvas(card, { backgroundColor: null, scale: 1, logging: false, useCORS: true, onclone: (doc) => questify(doc.body) }).then((c) => {
          menuTex.image = c; menuTex.needsUpdate = true; menuKey = k; menuOk = true;
          const w = 1.5, h = w * c.height / Math.max(1, c.width); menuMesh.scale.set(w, Math.min(h, 1.3), 1);
        }).catch(() => { /* keep the text fallback */ }).then(() => { menuBusy = false; });
      }
      menuMesh.visible = menuOk;
      return menuOk;
    }
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
      if (bn && bn.classList.contains('show')) { center(txt('bannerT'), 52, '#ff4a4a'); center(txt('bannerS'), 28); }
      if (shown('boss')) center(txt('bossName'), 28, '#ff8a60');
      if (menuPanel(running, 0)) { const toastE = $('padToast'); if (toastE && toastE.classList.contains('show')) center(toastE.textContent, 24, '#cfa54a'); return; }   // the real menu is on its own panel
      if (!running) { center(o.started() ? 'PAUSED' : 'CRIMSON PLAGUE', 56, '#ff4a4a'); center('A: ' + (o.started() ? 'resume' : 'enter the hall') + '    Y: pause    left stick: pick class', 26, '#ecdfc6'); return; }
      if (st.over) { center('YOU FELL', 56, '#ff4a4a'); center(txt('overStats'), 24); center('A: rise again', 28); return; }
      if (st.choices || st.classChoices || st.shop) {
        center(txt('luTitle') || (st.shop ? 'THE MERCHANT' : 'LEVEL UP'), 40, '#ffcf6a');
        for (const id of ['classCards', 'cards']) {
          const box = $(id); if (!box || !box.children.length || box.offsetParent === null && box.hidden) continue;
          Array.from(box.children).slice(0, 6).forEach((c) => { const sel = c.classList.contains('sel'); center((sel ? '> ' : '') + (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) + (sel ? ' <' : ''), 24, sel ? '#ffe08a' : '#cbb8a8'); });
        }
        center('left stick: choose   right stick up/down: row   A: take' + (st.shop ? '   left grip+Y: leave' : ''), 22, '#a89080');
        return;
      }
      if (o.menuOpen()) { center('Menu open: easier on the flat screen', 28); center('right stick click: close', 22); }
      const lb = $('lockBox'); if (lb && getComputedStyle(lb).display !== 'none' && lb.offsetParent !== null) { center(txt('lockTxt'), 24, '#cfa54a'); const b0 = txt('lockB0'), b1 = txt('lockB1'); center((b0 ? 'Right grip: ' + b0 : '') + (b1 ? '    Right stick down: ' + b1 : ''), 22); }
      const fc = $('floorCard'); if (fc && fc.offsetParent !== null && txt('floorCard')) center('Right grip / A: pick up  ' + txt('floorCard').slice(0, 50), 22, '#ecdfc6');
      const sh = $('stashHint'); if (sh && !sh.hidden) center('STASH CHEST: right grip or A', 22, '#cfa54a');
      const toastE = $('padToast'); if (toastE && toastE.classList.contains('show')) center(questText(toastE.textContent), 24, '#e8c890');
    }

    let lastDt = 1 / 72;
    function update(st, running, dt) {
      if (!session) return;
      lastDt = dt || lastDt;
      const p = st.player;
      const dYaw = turn.step(hands.right && hands.right.gamepad, dt, opts.snap ? 0 : TURN_SPEED); bodyYaw += dYaw;
      fpsN++; fpsT += dt; if (fpsT >= 0.5) { fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
      if (opts.vignette) {
        const want = Math.min(1, (Math.hypot(p.vx || 0, p.vz || 0) / 7) + Math.abs(dYaw) / Math.max(dt, 1e-3) / 2.5) * 0.6;
        moveK += (want - moveK) * Math.min(1, dt * 6); vig.material.opacity = moveK; vig.visible = moveK > 0.03;
        vig.scale.setScalar(1.25 - moveK * 0.3);
      }
      dolly.position.set(p.x, p.eye, p.z);
      dolly.rotation.set(0, -bodyYaw, 0);
      dolly.updateMatrixWorld(true);
      placeGun();
      menuPanel(running, dt);
      hudT -= dt; if (hudT <= 0) { hudT = 0.1; drawHud(st, running); hudTex.needsUpdate = true; }
    }
    // where the player is aiming, in the game's yaw/pitch: the right controller's ray, else your head
    function aim() {
      if (!session) return null;
      const h = !opts.gaze && hands.right;
      if (h) { h.ray.getWorldQuaternion(q4); h.ray.getWorldPosition(v3); } else { camera.matrixWorld.decompose(v3, q4, tmpS); }
      if (!aimInit) { aimQ.copy(q4); aimInit = true; } else aimQ.slerp(q4, Math.min(1, AIM_SMOOTH * lastDt));
      q4.copy(aimQ); aimP.copy(v3);
      dollyInv.copy(dolly.quaternion).invert(); aimLocal.copy(dollyInv).multiply(aimQ);    // the same aim in the rig's space, for the gun
      fwd.set(0, 0, -1).applyQuaternion(q4);
      reticle.visible = true; reticle.position.copy(v3).addScaledVector(fwd, 6); reticle.quaternion.copy(q4);
      return XrInput.dirToAngles(fwd.x, fwd.y, fwd.z);
    }
    const srcBuf = [];
    function sources() {
      if (!session) return [];
      srcBuf.length = 0;
      const list = session.inputSources;
      for (let i = 0; i < list.length; i++) { const s = list[i]; if (s && s.gamepad) srcBuf.push(s); }   // XRInputSource already has handedness + gamepad
      for (const c of ctl) { c.gamepad = null; if (c.hand) for (let i = 0; i < srcBuf.length; i++) if (srcBuf[i].handedness === c.hand) c.gamepad = srcBuf[i].gamepad; }
      return srcBuf;
    }
    // the direction your head faces, as the game's yaw (movement goes this way, not where the gun points; ?aimmove for the old way)
    function headYaw() {
      if (!session || opts.aimMove) return null;
      camera.matrixWorld.decompose(v3, headQ, tmpS); fwd.set(0, 0, -1).applyQuaternion(headQ);
      return XrInput.dirToAngles(fwd.x, fwd.y, fwd.z).yaw;
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
    // right grip: grab. One press = pick up the gun at your feet, open the stash, or use a gold gate / the boss door (like E / A on the flat page)
    let gripWas = false;
    function grab() {
      const g = hands.right && hands.right.gamepad, b = g && g.buttons && g.buttons[1], on = !!b && (b.pressed || b.value > 0.5);
      const e = on && !gripWas; gripWas = on; return e;
    }
    function aimDir(out) { return out.set(0, 0, -1).applyQuaternion(aimQ); }
    const pad = () => (session ? XrInput.toPad(sources()) : null);

    let farWas = 120;
    async function enter() {
      if (session) { session.end(); return; }
      try {
        const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
        renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local'); renderer.xr.setFramebufferScaleFactor(opts.scale);   // ~80% resolution: holds 72/90 fps
        await renderer.xr.setSession(s);
        const bl = s.renderState && s.renderState.baseLayer; if (bl && 'fixedFoveation' in bl) bl.fixedFoveation = 1;   // full fixed foveation: edges drawn coarser, centre sharp
        if (renderer.xr.setFoveation) renderer.xr.setFoveation(1);
        loadH2c();
        session = s; aimInit = false; bodyYaw = o.playerYaw(); turn.reset(); hudMesh.visible = true; btn.textContent = 'EXIT VR'; btn.hidden = true;
        s.addEventListener('end', () => {
          session = null; renderer.xr.enabled = false; vig.visible = false; hudMesh.visible = false; reticle.visible = false; menuMesh.visible = false;
          dolly.position.set(0, 0, 0); dolly.rotation.set(0, 0, 0); if (gun.parent !== camera) camera.add(gun);
          btn.textContent = 'ENTER VR'; btn.hidden = false; if (onEnd) onEnd();
        });
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
    return { update, aim, pad, headPose, headYaw, pulse, aimDir, corner, grab, questText, menuShown: () => menuMesh.visible, vigOn: () => vig.visible, presenting: () => !!session, on: (start, end) => { onStart = start; onEnd = end; }, rig: dolly };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = XrMode;
