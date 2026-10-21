/* Draws your friends in the hall: a simple body with a gun, a name tag with a health bar above, and a body lying down when they are downed.
   Presentation only: positions come from the referee's snapshot (state.coop.peers); this only smooths them between network updates. */
const PeersView = (function () {
  const COLORS = [0x3a7bd5, 0x3fae5a, 0xd5a23a, 0xb25ad5];
  function create(THREE, scene) {
    const people = new Map();
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const box = (w, h, d, m, x, y, z, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); parent.add(o); return o; };
    function tag(name) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; const tex = new THREE.CanvasTexture(c);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false })); sp.scale.set(1.8, 0.45, 1); sp.renderOrder = 10;
      return { c, tex, sp, name, last: '' };
    }
    function paintTag(t, hpK, down) {
      const key = t.name + '|' + Math.round(hpK * 20) + '|' + down; if (key === t.last) return; t.last = key;
      const g = t.c.getContext('2d'); g.clearRect(0, 0, 256, 64);
      g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(t.name, 128, 28); g.fillStyle = down ? '#ff6a6a' : '#fff'; g.fillText(down ? t.name + ' (down)' : t.name, 128, 28);
      g.fillStyle = '#000'; g.fillRect(48, 40, 160, 12); g.fillStyle = down ? '#7a1a1a' : '#e23a42'; g.fillRect(50, 42, 156 * Math.max(0, Math.min(1, hpK)), 8);
      t.tex.needsUpdate = true;
    }
    // the three classes, as simple blocky placeholders in the Crusader Tactics spirit (hat and coat, hooded and masked, pointed hat and robe); Grok's models replace them later
    const ASSASSIN_TONES = [[0x1a1a22, 0x2a2a34], [0x4a0f18, 0x6a1a24], [0x14343a, 0x1f4a52]];     // three assassins, three colours: shadow black, blood red, deep teal
    const LOOKS = {
      gunslinger(body, M, col) {
        const coat = M(0x6a2a1e), dark = M(0x1e1612), skin = M(0xd9b38c), gold = M(0xcfa54a), hat = M(0x3a2414);
        box(0.2, 0.7, 0.24, dark, -0.15, 0.4, 0, body); box(0.2, 0.7, 0.24, dark, 0.15, 0.4, 0, body);        // boots and legs
        box(0.62, 0.9, 0.34, coat, 0, 1.1, 0, body); box(0.7, 0.5, 0.38, coat, 0, 0.62, 0, body);              // a long coat
        box(0.66, 0.1, 0.4, M(col), 0, 0.98, 0, body); box(0.14, 0.12, 0.05, gold, 0, 0.98, -0.2, body);      // sash in the player's colour, gold buckle
        box(0.3, 0.3, 0.3, skin, 0, 1.72, 0, body); box(0.32, 0.1, 0.06, M(0x8a1a1a), 0, 1.62, -0.16, body); // face and a red bandana
        box(0.8, 0.05, 0.8, hat, 0, 1.9, 0, body); box(0.36, 0.24, 0.36, hat, 0, 2.02, 0, body);               // wide-brimmed hat
        box(0.18, 0.62, 0.18, coat, -0.4, 1.1, 0, body); box(0.18, 0.18, 0.5, coat, 0.4, 1.2, -0.2, body);
      },
      assassin(body, M, col, slot) {
        const T = ASSASSIN_TONES[slot % ASSASSIN_TONES.length], cloth = M(T[0]), cape = M(T[1]), white = new THREE.MeshBasicMaterial({ color: 0xf4f8ff }), skin = M(0x2a2024);
        box(0.18, 0.72, 0.2, cloth, -0.14, 0.4, 0, body); box(0.18, 0.72, 0.2, cloth, 0.14, 0.4, 0, body);
        box(0.5, 0.8, 0.28, cloth, 0, 1.12, 0, body); box(0.6, 0.9, 0.08, cape, 0, 1.0, 0.2, body);            // slim, with a short cape
        box(0.54, 0.09, 0.32, M(col), 0, 0.82, 0, body);
        box(0.34, 0.36, 0.34, cloth, 0, 1.72, 0, body); box(0.3, 0.2, 0.12, cloth, 0, 1.78, 0.2, body);        // the hood
        box(0.26, 0.1, 0.06, white, 0, 1.76, -0.17, body);                                                   // glowing eyes in the dark
        box(0.3, 0.14, 0.1, M(0x0c0c10), 0, 1.6, -0.15, body); box(0.4, 0.1, 0.34, M(0x8a1a1a), 0, 1.5, 0, body);   // mask and a red scarf
        box(0.16, 0.6, 0.16, cloth, -0.34, 1.1, 0, body); box(0.16, 0.16, 0.5, cloth, 0.34, 1.2, -0.2, body);
      },
      witch(body, M, col) {
        const robe = M(0x4a1a6a), trim = M(0x2a0c3e), skin = M(0xe0c4a8), glow = new THREE.MeshBasicMaterial({ color: 0x8cff6a }), hat = M(0x2a0c3e);
        box(0.6, 0.5, 0.42, robe, 0, 0.3, 0, body); box(0.5, 0.45, 0.36, robe, 0, 0.72, 0, body); box(0.44, 0.5, 0.3, robe, 0, 1.18, 0, body);   // a long robe, wider at the hem
        box(0.5, 0.08, 0.34, M(col), 0, 0.92, 0, body);
        box(0.3, 0.3, 0.3, skin, 0, 1.68, 0, body); box(0.08, 0.06, 0.04, glow, -0.07, 1.7, -0.16, body); box(0.08, 0.06, 0.04, glow, 0.07, 1.7, -0.16, body);
        box(0.76, 0.05, 0.76, hat, 0, 1.84, 0, body); box(0.44, 0.32, 0.44, hat, 0, 2.02, 0, body); box(0.3, 0.3, 0.3, hat, 0, 2.3, 0.04, body); box(0.14, 0.26, 0.14, hat, 0, 2.55, 0.1, body);   // a tall pointed hat
        box(0.5, 0.06, 0.52, M(0x8a5acf), 0, 1.89, 0, body);
        box(0.16, 0.6, 0.16, robe, -0.34, 1.12, 0, body); box(0.16, 0.16, 0.5, robe, 0.34, 1.2, -0.2, body);
      },
      none(body, M, col) {
        const skin = M(0xd9b38c), cloth = M(col), dark = M(0x222226);
        box(0.55, 0.8, 0.3, cloth, 0, 1.15, 0, body); box(0.32, 0.32, 0.32, skin, 0, 1.72, 0, body);
        box(0.2, 0.7, 0.22, dark, -0.15, 0.4, 0, body); box(0.2, 0.7, 0.22, dark, 0.15, 0.4, 0, body);
        box(0.18, 0.6, 0.18, cloth, -0.38, 1.1, 0, body); box(0.18, 0.18, 0.5, cloth, 0.38, 1.2, -0.2, body);
      }
    };
    function make(p, i) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      (LOOKS[p.cls] || LOOKS.none)(body, mat, COLORS[i % COLORS.length], i);
      const gun = new THREE.Group(); gun.position.set(0.38, 1.28, -0.5); gun.rotation.y = Math.PI / 2; gun.scale.set(1.5, 1.5, 1.5); body.add(gun);   // the gun they really hold
      const t = tag(p.name || 'Friend'); t.sp.position.set(0, 2.9, 0); g.add(t.sp);
      scene.add(g);
      return { g, body, gun, shape: '', t, x: p.x, z: p.z, yaw: p.yaw, lie: 0, cls: p.cls, slot: i };
    }
    const gunMat = mat(0x2a2a30), gunMat2 = mat(0x141418), partGeo = {};
    function holdGun(o, id) {                       // a plain stand-in of the gun type they carry (the same shapes as guns on the floor)
      const GD = typeof RefereeWeapons !== 'undefined' && RefereeWeapons.GUNS[id], type = GD ? GD.type : 'rifle';
      if (o.shape === type) return; o.shape = type;
      for (const m of o.parts || []) o.gun.remove(m);
      o.parts = [];
      for (const [l, h, w, x, y, z, dark] of (FloorGunShapes.SHAPES[type] || FloorGunShapes.SHAPES.rifle)) {
        const k = l + ',' + h + ',' + w, geo = partGeo[k] || (partGeo[k] = new THREE.BoxGeometry(l, h, w));
        const m = new THREE.Mesh(geo, dark ? gunMat2 : gunMat); m.position.set(x, y, z); o.gun.add(m); o.parts.push(m);
      }
    }
    let n = 0;
    function update(peers, dt) {
      const ids = new Set();
      for (const p of peers || []) {
        ids.add(p.key);
        let o = people.get(p.key); if (o && o.cls !== p.cls) { scene.remove(o.g); const slot = o.slot; o = make(p, slot); people.set(p.key, o); }   // they picked another class
        if (!o) { o = make(p, n++); people.set(p.key, o); }
        const k = Math.min(1, dt * 12);
        o.x += (p.x - o.x) * k; o.z += (p.z - o.z) * k;
        let dy = p.yaw - o.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; o.yaw += dy * k;
        o.lie += ((p.down ? 1 : 0) - o.lie) * Math.min(1, dt * 6);
        o.g.position.set(o.x, 0, o.z); o.body.rotation.y = -o.yaw; o.body.rotation.x = -o.lie * Math.PI / 2 * 0.98; o.body.position.y = o.lie * 0.25;
        o.t.sp.position.y = 2.9 - o.lie * 2.0;
        holdGun(o, p.gun);
        paintTag(o.t, p.hp / Math.max(1, p.maxHp), p.down);
        o.g.visible = true;
      }
      for (const [key, o] of people) if (!ids.has(key)) { scene.remove(o.g); people.delete(key); }
    }
    const clear = () => { for (const o of people.values()) scene.remove(o.g); people.clear(); };
    return { update, clear };
  }
  return { create };
})();
