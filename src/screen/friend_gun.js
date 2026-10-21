/* A friend's gun in their hands: the real model of the gun they hold (the same voxel model, smoothing and skin colours as your own gun), sized for a person standing in the hall.
   Look only. One of these per friend; it rebuilds when they swap guns and repaints when the gun's rarity or status colours change. */
const FriendGun = (function () {
  const SCALE = 1.7;                                           // gun space is a first-person size; this makes it right for a whole body
  const HAND = [0.36, 1.22, -0.5];                             // where the gun hand is, in body space (y up, -z forward)
  function create(THREE, parent) {
    const root = new THREE.Group(); parent.add(root);
    const look = GunLook.create(THREE, root);                  // GunLook adds a small light to its parent: a friend's gun does not need one
    try { for (const c of root.children.slice()) if (c.isLight) root.remove(c); } catch (e) { /* no light to remove */ }
    const rig = new THREE.Group(); root.add(rig);
    let cur = '', skinKey = '', muzzle = [0, 0, -0.5], baseSkin = 'crimson';
    function build(id) {
      const entry = GunList.find(id), G = entry.build(), A = G.anchors, H = entry.hands || G.hands || { grip: A.handGrip || [0, -0.15, 0.15] };
      look.release(); for (const c of rig.children.slice()) rig.remove(c);
      const add = (p, pos, rotX) => { const g = new THREE.Group(); look.part(p, G.vox, g); if (pos) g.position.set(pos[0], pos[1], pos[2]); if (rotX) g.rotation.x = rotX; rig.add(g); };
      add(G.parts.body); add(G.parts.bolt, A.boltRest); add(G.parts.mag, A.magPivot, 0.1);
      const grip = H.grip || [0, -0.15, 0.15];
      root.scale.set(SCALE, SCALE, SCALE);
      root.position.set(HAND[0] - grip[0] * SCALE, HAND[1] - grip[1] * SCALE, HAND[2] - grip[2] * SCALE);    // the gun's grip sits in the glove
      muzzle = [root.position.x + A.muzzle[0] * SCALE, root.position.y + A.muzzle[1] * SCALE, root.position.z + A.muzzle[2] * SCALE];
      baseSkin = G.skin || 'crimson'; cur = id; skinKey = '';
    }
    // id: the gun, rarity and status list: a legendary wears both its colours, like your own
    function set(id, rarity, status) {
      if (id !== cur) build(id || 'pistol_service');
      const key = GunSkins.forGun(baseSkin, status, rarity | 0);
      if (key !== skinKey) { skinKey = key; look.setSkin(key); }
    }
    return { set, update: (t) => look.update(t, 0, 0), muzzle: () => muzzle.slice(), root };
  }
  return { create, SCALE, HAND };
})();
if (typeof module !== 'undefined') module.exports = FriendGun;
