/* Locks view: draws the gold gates across the corridors, the sign with the rules beside the boss door, the Scale or the Fortune Wheels next to it, and the hidden Coin Sockets on the walls.
   Presentation only: where things are and what has been paid or shot come from the referee's snapshot (state.locks). Everything is boxes and little painted signs, in the same gold and iron as the boss door.
   sync(locks, map) is called every frame; it rebuilds when the floor changes and then only moves what moved (a gate lifting, a pan tipping, a reel turning). */
const LocksView = (function () {
  const GOLD = '#e8b830', GOLD_D = '#a67c14', INK = '#1a1014', PAPER = '#cbbfb0';
  const SYMS = ['Skull', 'Crown', 'Flame', 'Eye'];

  // little painted icons for the four wheel symbols, drawn into a square at (x, y) of size s
  function drawSym(g, i, x, y, s, col) {
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = Math.max(2, s * 0.06); const c = s / 2;
    if (i === 0) {                                                                   // skull: round head, jaw, dark eyes
      g.beginPath(); g.arc(x + c, y + c * 0.85, c * 0.62, 0, 7); g.fill(); g.fillRect(x + c * 0.55, y + c * 1.2, c * 0.9, c * 0.65);
      g.fillStyle = INK; g.beginPath(); g.arc(x + c * 0.72, y + c * 0.9, c * 0.18, 0, 7); g.arc(x + c * 1.28, y + c * 0.9, c * 0.18, 0, 7); g.fill(); g.fillRect(x + c * 0.95, y + c * 1.1, c * 0.1, c * 0.2);
    } else if (i === 1) {                                                            // crown: three points on a band
      g.beginPath(); g.moveTo(x + c * 0.3, y + c * 1.5); g.lineTo(x + c * 0.2, y + c * 0.5); g.lineTo(x + c * 0.7, y + c * 0.95); g.lineTo(x + c, y + c * 0.35); g.lineTo(x + c * 1.3, y + c * 0.95); g.lineTo(x + c * 1.8, y + c * 0.5); g.lineTo(x + c * 1.7, y + c * 1.5); g.closePath(); g.fill(); g.fillRect(x + c * 0.3, y + c * 1.5, c * 1.4, c * 0.22);
    } else if (i === 2) {                                                            // flame: a teardrop with a hollow
      g.beginPath(); g.moveTo(x + c, y + c * 0.1); g.quadraticCurveTo(x + c * 1.8, y + c * 0.9, x + c * 1.45, y + c * 1.5); g.quadraticCurveTo(x + c, y + c * 1.95, x + c * 0.55, y + c * 1.5); g.quadraticCurveTo(x + c * 0.2, y + c * 0.9, x + c, y + c * 0.1); g.fill();
      g.fillStyle = INK; g.beginPath(); g.moveTo(x + c, y + c * 0.95); g.quadraticCurveTo(x + c * 1.3, y + c * 1.3, x + c, y + c * 1.6); g.quadraticCurveTo(x + c * 0.7, y + c * 1.3, x + c, y + c * 0.95); g.fill();
    } else {                                                                         // eye: an almond, an iris and a pupil
      g.beginPath(); g.moveTo(x + c * 0.1, y + c); g.quadraticCurveTo(x + c, y + c * 0.1, x + c * 1.9, y + c); g.quadraticCurveTo(x + c, y + c * 1.9, x + c * 0.1, y + c); g.fill();
      g.fillStyle = INK; g.beginPath(); g.arc(x + c, y + c, c * 0.42, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x + c, y + c, c * 0.16, 0, 7); g.fill();
    }
  }

  function create(THREE, scene, T, glowTex) {
    const goldMat = new THREE.MeshLambertMaterial({ map: T.texGold, emissive: 0x3a2a0a }), ironMat = new THREE.MeshLambertMaterial({ map: T.texDark, emissive: 0x201410 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd23a, fog: false }), darkMat = new THREE.MeshBasicMaterial({ color: 0x0a0608 }), greenMat = new THREE.MeshBasicMaterial({ color: 0x7aff7a, fog: false });
    const geo = {}; const box = (w, h, d, mat, x, y, z, parent) => { const k = w + '_' + h + '_' + d, gm = geo[k] || (geo[k] = new THREE.BoxGeometry(w, h, d)); const m = new THREE.Mesh(gm, mat); m.position.set(x, y, z); parent.add(m); return m; };
    const plane = (w, h, tex, x, y, z, parent, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: true })); m.position.set(x, y, z); if (ry) m.rotation.y = ry; parent.add(m); return m; };
    const painted = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; const g = c.getContext('2d'); const repaint = (...a) => { g.clearRect(0, 0, w, h); draw(g, w, h, ...a); tex.needsUpdate = true; }; return { tex, repaint }; };

    let made = [], mapId = -1, gates = [], sockets = [], station = null, bossKey = '';
    const drop = () => { for (const o of made) scene.remove(o); made = []; gates = []; sockets = []; station = null; };
    const place = (g, p, y, off) => { g.position.set(p.x + p.nx * (off || 0), y || 0, p.z + p.nz * (off || 0)); g.rotation.y = Math.atan2(p.nx, p.nz); scene.add(g); made.push(g); return g; };

    // a gold gate: iron bars in a gold frame with a lock plate carrying the price; it lifts out of the way once it is paid for
    function makeGate(g, h) {
      const grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner);
      const W = 6, th = 0.5;
      box(0.45, h, th + 0.3, goldMat, -W / 2 + 0.22, h / 2, 0, grp); box(0.45, h, th + 0.3, goldMat, W / 2 - 0.22, h / 2, 0, grp); box(W, 0.6, th + 0.3, goldMat, 0, h - 0.3, 0, grp);          // the frame stays when the gate lifts
      for (let x = -2.5; x <= 2.51; x += 0.5) box(0.16, h - 0.5, 0.16, ironMat, x, h / 2 - 0.25, 0, inner);                                                                                   // iron bars
      for (const y of [2.2, 5.2, 8.2]) box(W - 0.8, 0.28, 0.3, goldMat, 0, y, 0, inner);                                                                                                       // gold rails
      box(1.5, 1.5, 0.4, goldMat, 0, 5.0, 0, inner); box(0.55, 0.55, 0.45, darkMat, 0, 4.9, 0, inner); box(0.3, 0.3, 0.5, glowMat, 0, 4.9, 0, inner);                                         // the lock
      const label = painted(128, 64, (c, w, hh, g) => { c.fillStyle = 'rgba(10,6,8,0.85)'; c.fillRect(0, 0, w, hh); c.strokeStyle = GOLD; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, hh - 4); c.fillStyle = GOLD; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; if (g.type === 'key') { c.fillText('KEY', w / 2, 38); c.font = '13px sans-serif'; c.fillText('KEEPER HOLDS IT', w / 2, 58); } else { c.fillText(String(g.price), w / 2, 40); c.font = '14px sans-serif'; c.fillText('GOLD', w / 2, 58); } });
      label.repaint(g);
      plane(2.4, 1.2, label.tex, 0, 3.3, th / 2 + 0.2, inner); plane(2.4, 1.2, label.tex, 0, 3.3, -th / 2 - 0.2, inner, Math.PI);
      place(grp, g, 0);
      return { grp, inner, h, t: 0, open: false, i: g.i };
    }

    // the wall sign with the rules of the boss door's puzzle
    function makeSign(b) {
      const grp = new THREE.Group(), tx = b.text;
      const sign = painted(512, 256, (c, w, hh) => {                                  // (the painted sizes are powers of two, so every phone's graphics chip takes them)
        c.fillStyle = '#140c10'; c.fillRect(0, 0, w, hh); c.strokeStyle = GOLD; c.lineWidth = 10; c.strokeRect(6, 6, w - 12, hh - 12); c.strokeStyle = GOLD_D; c.lineWidth = 3; c.strokeRect(22, 22, w - 44, hh - 44);
        c.fillStyle = GOLD; c.font = 'bold 46px serif'; c.textAlign = 'center'; c.fillText(tx.title, w / 2, 80);
        c.fillStyle = GOLD_D; c.fillRect(70, 100, w - 140, 4);
        c.fillStyle = PAPER; c.font = '32px serif'; tx.lines.forEach((l, i) => c.fillText(l, w / 2, 144 + i * 40));
      });
      sign.repaint();
      box(5.6, 3.0, 0.3, goldMat, 0, 0, 0.16, grp); plane(5.3, 2.7, sign.tex, 0, 0, 0.33, grp);        // held out from the wall so the banners never hang over it
      place(grp, b.sign, 4.0, 0.3);
    }

    // the Scale: a gold stand, a beam that tips, a pan of gold coins on one side and the weight the wall asks for on the other
    function makeScale(b) {
      const grp = new THREE.Group(), beam = new THREE.Group(); beam.position.set(0, 4.6, 0.3); grp.add(beam);
      box(0.4, 4.6, 0.4, goldMat, 0, 2.3, 0.3, grp); box(2.2, 0.3, 1.2, goldMat, 0, 0.15, 0.3, grp); box(5.2, 0.24, 0.24, goldMat, 0, 0, 0, beam);
      const mkPan = (x) => { const p = new THREE.Group(); p.position.set(x, -1.6, 0); beam.add(p); box(0.06, 1.5, 0.06, ironMat, -0.7, 0.8, 0, p); box(0.06, 1.5, 0.06, ironMat, 0.7, 0.8, 0, p); box(1.9, 0.14, 1.3, goldMat, 0, 0, 0, p); return p; };
      const left = mkPan(-2.3), right = mkPan(2.3); box(1.4, 1.1, 1.0, ironMat, 0, 0.62, 0, right);                                           // the door's weight: an iron block
      const coins = []; for (let k = 0; k < 14; k++) { const c = box(0.5, 0.12, 0.5, glowMat, -0.5 + (k % 3) * 0.5, 0.14 + Math.floor(k / 3) * 0.13, (k % 2) * 0.2 - 0.1, left); c.visible = false; coins.push(c); }
      const num = painted(256, 64, (c, w, hh, pan, target) => { c.fillStyle = 'rgba(10,6,8,0.88)'; c.fillRect(0, 0, w, hh); c.strokeStyle = GOLD; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, hh - 4); c.fillStyle = GOLD; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.fillText(pan + ' / ' + target, w / 2, 42); });
      plane(2.8, 0.7, num.tex, 0, 6.0, 0.3, grp);
      place(grp, b.station, 0, 0.4);
      station = { kind: 'scale', beam, coins, num, tilt: 0, key: '' };
    }

    // the Fortune Wheels: three reels in a gold frame, with the symbol to match shown above
    function makeWheels(b) {
      const grp = new THREE.Group(); box(5.4, 3.0, 0.5, goldMat, 0, 2.6, 0, grp);
      const reels = [];
      for (let i = 0; i < 3; i++) {
        const r = painted(128, 128, (c, w, hh, sym, locked) => { c.fillStyle = locked ? '#2a2410' : '#0e0a0c'; c.fillRect(0, 0, w, hh); c.strokeStyle = locked ? '#7aff7a' : GOLD; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, hh - 4); drawSym(c, sym, 20, 20, 88, locked ? '#9aff9a' : GOLD); });
        r.repaint(0, false); plane(1.6, 1.6, r.tex, -1.7 + i * 1.7, 2.6, 0.27, grp); reels.push({ r, key: '' });
      }
      const tgt = painted(128, 128, (c, w, hh) => { c.fillStyle = 'rgba(10,6,8,0.9)'; c.fillRect(0, 0, w, hh); c.strokeStyle = GOLD; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, hh - 4); c.fillStyle = PAPER; c.font = '15px serif'; c.textAlign = 'center'; c.fillText('MATCH', w / 2, 22); drawSym(c, b.sym, 24, 32, 80, GOLD); });
      tgt.repaint(); plane(1.5, 1.5, tgt.tex, 0, 4.9, 0.27, grp);
      place(grp, b.station, 0, 0.4);
      station = { kind: 'wheels', reels };
    }

    // a hidden gold socket on a wall: a gold ring with a dark hole and a pulsing glow; shot, it fills with light
    function makeSocket(s) {
      const grp = new THREE.Group();
      for (const [x, y, w, h] of [[-0.55, 0, 0.22, 1.32], [0.55, 0, 0.22, 1.32], [0, -0.55, 1.32, 0.22], [0, 0.55, 1.32, 0.22]]) box(w, h, 0.22, goldMat, x, y, 0.08, grp);
      box(0.9, 0.9, 0.18, darkMat, 0, 0, 0.04, grp);
      const core = box(0.5, 0.5, 0.24, glowMat, 0, 0, 0.14, grp);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc830, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })); sp.scale.setScalar(3.2); sp.position.set(0, 0, 0.5); grp.add(sp);
      place(grp, s, s.y);
      return { core, sp, hit: false };
    }

    function build(locks, map) {
      drop(); mapId = map.id; const h = map.WALL_H;
      gates = (locks.gates || []).map((g) => makeGate(g, h));
      const b = locks.boss;
      if (b) { makeSign(b); if (b.kind === 'scale') makeScale(b); else if (b.kind === 'wheels') makeWheels(b); sockets = (b.sockets || []).map(makeSocket); }
    }

    function sync(locks, map, time, dt) {
      if (!locks || !map) return;
      if (map.id !== mapId) build(locks, map);
      for (const g of gates) {
        const open = !!(locks.gates.find((q) => q.i === g.i) || {}).open;
        g.t += Math.sign((open ? 1 : 0) - g.t) * Math.min(Math.abs((open ? 1 : 0) - g.t), dt * 0.9);
        g.inner.position.y = g.t * (g.h + 0.2);
      }
      const b = locks.boss; if (!b) return;
      sockets.forEach((s, i) => {
        const hit = !!(b.sockets[i] && b.sockets[i].hit), pulse = 0.85 + 0.2 * Math.sin(time * 5 + i * 2);
        if (hit !== s.hit) { s.hit = hit; s.core.material = hit ? greenMat : glowMat; s.sp.material.color.setHex(hit ? 0x7aff7a : 0xffc830); }
        s.sp.scale.setScalar((hit ? 4.2 : 3.2) * pulse); s.sp.material.opacity = hit ? 0.9 : 0.55 + 0.25 * Math.sin(time * 5 + i * 2);
      });
      if (!station) return;
      if (station.kind === 'scale') {
        const want = Math.max(-0.35, Math.min(0.35, (b.target ? (b.pan / b.target - 1) * 0.5 : 0))), k = Math.min(1, dt * 4);
        station.tilt += (want - station.tilt) * k; station.beam.rotation.z = station.tilt;                       // the pan side sinks as it fills
        for (const p of station.beam.children) if (p.position.y < -1) p.rotation.z = -station.tilt;                // the pans hang level
        station.coins.forEach((c, i) => { c.visible = b.pan / 20 > i; });
        const key = b.pan + '/' + b.target; if (key !== station.key) { station.key = key; station.num.repaint(b.pan, b.target); }
      } else {
        station.reels.forEach((q, i) => { const key = b.wheels[i] + (b.locked[i] ? 'L' : ''); if (key !== q.key) { q.key = key; q.r.repaint(b.wheels[i], !!b.locked[i]); } });
      }
    }
    return { sync, drop };
  }
  return { create, SYMS };
})();
