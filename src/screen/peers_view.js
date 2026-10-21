/* Draws your friends in the hall: a body in the skin they picked, the real gun they hold, a name tag with a health bar above, and a body lying down when they are downed.
   Presentation only: positions come from the referee's snapshot (state.coop.peers); this only smooths them between network updates. */
const PeersView = (function () {
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
    const looks = SkinsLook.create(THREE);
    function make(p, i) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      looks.build(p.skin, body, i);                                                  // the skin they picked in the lobby (or one by slot if they sent none)
      const gun = FriendGun.create(THREE, body);                                      // the real gun they hold, in their hand
      const t = tag(p.name || 'Friend'); t.sp.position.set(0, 2.9, 0); g.add(t.sp);
      scene.add(g);
      return { g, body, gun, t, x: p.x, z: p.z, yaw: p.yaw, lie: 0, skin: p.skin || '', slot: i, gk: '' };
    }
    let n = 0;
    let now = 0;
    // where a friend's gun muzzle is in the world right now (their bullets start here); null if we do not know them
    function muzzleOf(key) {
      const o = people.get(key); if (!o) return null;
      const m = o.gun.muzzle(), c = Math.cos(-o.yaw), sn = Math.sin(-o.yaw);
      return [o.x + m[0] * c + m[2] * sn, m[1], o.z - m[0] * sn + m[2] * c];
    }
    function update(peers, dt) {
      now += dt;
      const ids = new Set();
      for (const p of peers || []) {
        ids.add(p.key);
        let o = people.get(p.key); if (o && o.skin !== (p.skin || '')) { scene.remove(o.g); const slot = o.slot; o = make(p, slot); people.set(p.key, o); }   // they picked another class
        if (!o) { o = make(p, n++); people.set(p.key, o); }
        const k = Math.min(1, dt * 12);
        o.x += (p.x - o.x) * k; o.z += (p.z - o.z) * k;
        let dy = p.yaw - o.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; o.yaw += dy * k;
        o.lie += ((p.down ? 1 : 0) - o.lie) * Math.min(1, dt * 6);
        o.g.position.set(o.x, 0, o.z); o.body.rotation.y = -o.yaw; o.body.rotation.x = -o.lie * Math.PI / 2 * 0.98; o.body.position.y = o.lie * 0.25;
        o.t.sp.position.y = 2.9 - o.lie * 2.0;
        const gk = p.gun + '|' + p.gr + '|' + (p.gs || []).join(); if (gk !== o.gk) { o.gk = gk; try { o.gun.set(p.gun, p.gr, p.gs); } catch (e) { /* a model that fails to build must not stop the frame */ } }
        try { o.gun.update(now); } catch (e) { /* glow only */ }
        paintTag(o.t, p.hp / Math.max(1, p.maxHp), p.down);
        o.g.visible = true;
      }
      for (const [key, o] of people) if (!ids.has(key)) { scene.remove(o.g); people.delete(key); }
    }
    const clear = () => { for (const o of people.values()) scene.remove(o.g); people.clear(); };
    return { update, clear, muzzleOf };
  }
  return { create };
})();
