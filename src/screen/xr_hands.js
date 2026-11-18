/* VR leather gloves: a low-poly pair of black gloves that follow the Quest controllers,
   snap to a gun's grip / fore-end, and curl with the trigger and grip. Look-only: the
   new ADS module and the fire ray are not touched. ?nohands keeps the guns-only look. */
const XrHands = (function () {
  const useOff = (q) => /[?&#]nohands\b/.test(q || '');

  // per-class extra wrist rotation (radians, local X/Y/Z) and how tightly the fingers wrap
  const GRIP_POSE = {
    pistol:  { rot: [0.15, 0.05, 0.10], wrap: 0.72, index: 0.12 },
    smg:     { rot: [0.20, 0.00, 0.06], wrap: 0.78, index: 0.14 },
    rifle:   { rot: [0.22, 0.00, 0.04], wrap: 0.80, index: 0.16 },
    shotgun: { rot: [0.18, 0.02, 0.08], wrap: 0.76, index: 0.14 },
    sniper:  { rot: [0.20, 0.00, 0.05], wrap: 0.78, index: 0.15 },
    hmg:     { rot: [0.16, 0.00, 0.08], wrap: 0.82, index: 0.18 }
  };

  function leatherMat(THREE) {
    return new THREE.MeshPhongMaterial({
      color: 0x1a1a1d, specular: 0x4a4a52, shininess: 32, emissive: 0x0c0c10,
      side: THREE.DoubleSide, name: 'xr_glove_leather'
    });
  }

  // a short rounded bone (cylinder + cap) along +Y
  function bone(THREE, mat, r, len, segs) {
    const g = new THREE.Group();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, len, segs || 8, 1, false), mat);
    cyl.position.y = len / 2; cyl.castShadow = false; cyl.frustumCulled = false; g.add(cyl);
    return g;
  }
  function box(THREE, mat, w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0); m.frustumCulled = false; return m;
  }
  function countTris(root) {
    let n = 0; root.traverse((o) => { if (!o.isMesh || !o.visible || !o.geometry) return; const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; });
    return Math.round(n);
  }

  // one draw per glove: the posed bone meshes are baked into a single BufferGeometry after each pose
  function bakeSkin(THREE, root) {
    const pieces = []; let nV = 0, nI = 0;
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal, idx = g.index;
      pieces.push({ mesh: o, pos, nor, idx, v0: nV });
      nV += pos.count; nI += idx ? idx.count : pos.count;
      o.visible = false;
    });
    const posArr = new Float32Array(nV * 3), norArr = new Float32Array(nV * 3);
    const idxArr = nI > 65535 ? new Uint32Array(nI) : new Uint16Array(nI);
    let iOff = 0;
    for (const p of pieces) {
      if (p.idx) { for (let i = 0; i < p.idx.count; i++) idxArr[iOff++] = p.idx.getX(i) + p.v0; }
      else { for (let i = 0; i < p.pos.count; i++) idxArr[iOff++] = i + p.v0; }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(norArr, 3));
    geo.setIndex(new THREE.BufferAttribute(idxArr, 1));
    const baked = new THREE.Mesh(geo, pieces[0].mesh.material);
    baked.name = 'xr_glove_mesh'; baked.frustumCulled = false; baked.castShadow = false; root.add(baked);
    const w = new THREE.Matrix4(), inv = new THREE.Matrix4(), nM = new THREE.Matrix3(), v = new THREE.Vector3(), n = new THREE.Vector3();
    function bake() {
      root.updateMatrixWorld(true); inv.copy(root.matrixWorld).invert();
      for (const p of pieces) {
        p.mesh.updateMatrixWorld(true); w.multiplyMatrices(inv, p.mesh.matrixWorld); nM.getNormalMatrix(w);
        for (let i = 0; i < p.pos.count; i++) {
          v.fromBufferAttribute(p.pos, i).applyMatrix4(w);
          const o = (p.v0 + i) * 3; posArr[o] = v.x; posArr[o + 1] = v.y; posArr[o + 2] = v.z;
          if (p.nor) { n.fromBufferAttribute(p.nor, i).applyMatrix3(nM).normalize(); norArr[o] = n.x; norArr[o + 1] = n.y; norArr[o + 2] = n.z; }
        }
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
      geo.computeBoundingSphere();
    }
    bake();
    return bake;
  }

  // right-hand glove in hand space: origin in the palm, +Y toward the fingers, -Z out the palm, +X toward the thumb.
  // a left glove is the same mesh with scale.x = -1 (no second layout, so the fingers stay mirrored correctly).
  function buildGlove(THREE, mat, side) {
    const root = new THREE.Group(); root.name = side > 0 ? 'xr_glove_right' : 'xr_glove_left';
    root.userData.xrGlove = true;
    const palm = new THREE.Group(); palm.name = 'palm'; root.add(palm);
    palm.add(box(THREE, mat, 0.078, 0.088, 0.028, 0.006, 0.012, 0));
    palm.add(box(THREE, mat, 0.062, 0.04, 0.026, 0.002, -0.018, 0.001));   // heel of the palm, still a plain volume, no stitching
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat);
    mound.position.set(0.028, 0.004, 0.002); mound.scale.set(1.1, 0.7, 0.7); mound.frustumCulled = false; palm.add(mound);
    // short cuff behind the wrist (toward -Y)
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.042, 8, 1, true), mat);
    cuff.position.set(0.002, -0.058, 0.002); cuff.rotation.z = 0.08; cuff.frustumCulled = false; root.add(cuff);
    const cuffCap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.006, 8, 1, false), mat);
    cuffCap.position.set(0.002, -0.038, 0.002); cuffCap.frustumCulled = false; root.add(cuffCap);

    const joints = { index: [], middle: [], ring: [], pinky: [], thumb: [] };
    const fingers = [
      { name: 'index',  x: 0.026, z: 0.002, lens: [0.028, 0.022, 0.018], r: 0.0084 },
      { name: 'middle', x: 0.008, z: 0.001, lens: [0.030, 0.024, 0.019], r: 0.0088 },
      { name: 'ring',   x: -0.010, z: 0.002, lens: [0.028, 0.022, 0.017], r: 0.0080 },
      { name: 'pinky',  x: -0.026, z: 0.004, lens: [0.022, 0.018, 0.014], r: 0.0072 }
    ];
    for (const f of fingers) {
      let parent = palm;
      for (let i = 0; i < 3; i++) {
        const j = new THREE.Group(); j.name = f.name + i;
        j.position.set(i === 0 ? f.x : 0, i === 0 ? 0.052 : (i === 1 ? f.lens[0] : f.lens[1]), i === 0 ? f.z : 0);
        j.add(bone(THREE, mat, f.r * (i === 2 ? 0.85 : 1), f.lens[i], 8));
        parent.add(j); joints[f.name].push(j); parent = j;
      }
    }
    // thumb: off the side of the palm, slightly forward, 3 joints
    let tp = palm;
    const tLens = [0.026, 0.022, 0.018], tPos = [
      [0.038, 0.000, -0.010],
      [0, tLens[0], 0],
      [0, tLens[1], 0]
    ];
    for (let i = 0; i < 3; i++) {
      const j = new THREE.Group(); j.name = 'thumb' + i; j.position.fromArray(tPos[i]);
      if (i === 0) { j.rotation.z = 0.85; j.rotation.x = -0.55; j.rotation.y = 0.25; }
      j.add(bone(THREE, mat, 0.009, tLens[i], 8)); tp.add(j); joints.thumb.push(j); tp = j;
    }
    if (side < 0) root.scale.x = -1;
    const indexTip = new THREE.Object3D(); indexTip.name = 'indexTip';
    joints.index[2].add(indexTip); indexTip.position.set(0, 0.018, 0);
    const bake = bakeSkin(THREE, root);
    const tris = countTris(root);
    return { root, palm, joints, indexTip, cuff, tris, side, bake };
  }

  // curl a finger: k 0 = rest, 1 = tight fist. thumb uses a slightly different axis mix.
  function curlFinger(joints, k, isThumb) {
    const a = isThumb ? [0.35, 0.55, 0.50] : [0.85, 1.15, 0.95];
    const rest = isThumb ? [0.05, 0.08, 0.06] : [0.08, 0.06, 0.05];
    for (let i = 0; i < 3; i++) {
      const t = rest[i] + (a[i] - rest[i]) * Math.max(0, Math.min(1, k));
      joints[i].rotation.x = t;
    }
  }
  function poseFingers(G, wrap, index, thumb) {
    curlFinger(G.joints.index, index, false);
    curlFinger(G.joints.middle, wrap, false);
    curlFinger(G.joints.ring, wrap * 1.02, false);
    curlFinger(G.joints.pinky, wrap * 1.06, false);
    curlFinger(G.joints.thumb, thumb == null ? wrap * 0.7 : thumb, true);
  }

  function create(THREE, o) {
    o = o || {};
    const q = o.query || '';
    const off = useOff(q);
    const mat = leatherMat(THREE);
    const right = buildGlove(THREE, mat, 1), left = buildGlove(THREE, mat, -1);
    const parent = o.dolly || null;
    if (parent) { parent.add(right.root); parent.add(left.root); }
    right.root.visible = false; left.root.visible = false;
    const tmpQ = new THREE.Quaternion(), basisM = new THREE.Matrix4();
    const wP = new THREE.Vector3(), wQ = new THREE.Quaternion(), axis = new THREE.Vector3();
    const down = new THREE.Vector3(), camP = new THREE.Vector3(), camF = new THREE.Vector3(), tmpP = new THREE.Vector3();
    const BX = new THREE.Vector3(), BY = new THREE.Vector3(), BZ = new THREE.Vector3();
    let poseL = 'hidden', poseR = 'hidden', force = null;

    function attachWorld(glove, worldObj) {
      const host = o.dolly; if (!host || !worldObj) return;
      if (glove.root.parent !== host) host.add(glove.root);
      worldObj.updateMatrixWorld(true);
      worldObj.getWorldPosition(wP); worldObj.getWorldQuaternion(wQ);
      host.updateMatrixWorld(true);
      host.worldToLocal(glove.root.position.copy(wP));
      host.getWorldQuaternion(tmpQ); glove.root.quaternion.copy(tmpQ).invert().multiply(wQ);
    }

    // map the glove's local axes ( +Y fingers, +X thumb, -Z out the palm ) onto a parent space
    function setBasis(out, xx, xy, xz, yx, yy, yz, zx, zy, zz) {
      BX.set(xx, xy, xz); BY.set(yx, yy, yz); BZ.set(zx, zy, zz);
      basisM.makeBasis(BX, BY, BZ);
      out.setFromRotationMatrix(basisM);
      return out;
    }
    // palm on the backstrap, fingers down the handle (gun space: +Y up, -Z forward, +X right)
    function gunGripQuat(out) {
      return setBasis(out, -1, 0, 0,  0, -1, 0,  0, 0, 1);
    }
    // fingers along the barrel, palm up under the handguard
    function foreQuat(out, side) {
      setBasis(out, -1, 0, 0,  0, 0, -1,  0, -1, 0);
      if (side < 0) { tmpQ.setFromAxisAngle(axis.set(0, 0, 1), 0.2); out.multiply(tmpQ); }
      return out;
    }
    // empty / controller: fingers forward, back of the hand facing you (grip -Z forward, +Y up)
    function controllerQuat(out) {
      return setBasis(out, 1, 0, 0,  0, 0, -1,  0, 1, 0);
    }

    function tuck(glove, camera, adsK) {
      if (!camera || adsK < 0.35) return;
      glove.root.updateMatrixWorld(true);
      glove.palm.getWorldPosition(wP);
      camera.getWorldPosition(camP); camF.set(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(tmpQ));
      const vx = wP.x - camP.x, vy = wP.y - camP.y, vz = wP.z - camP.z;
      const along = vx * camF.x + vy * camF.y + vz * camF.z;
      if (along < 0.02 || along > 0.45) return;
      const px = vx - camF.x * along, py = vy - camF.y * along, pz = vz - camF.z * along;
      const rad = Math.hypot(px, py, pz);
      if (rad > 0.055) return;                                         // already clear of the sight line
      // push the hand down (camera down) and a little out, so it never covers the optic
      down.set(0, -1, 0).applyQuaternion(tmpQ).normalize();
      const push = (0.055 - rad) + 0.02;
      glove.root.parent.worldToLocal(tmpP.copy(wP).addScaledVector(down, push));
      glove.root.position.copy(tmpP);
    }

    function btnVal(g, i) {
      const b = g && g.buttons && g.buttons[i];
      return b ? (typeof b.value === 'number' ? b.value : (b.pressed ? 1 : 0)) : 0;
    }

    function update(s) {
      s = s || {};
      if (off || !s.presenting) { right.root.visible = false; left.root.visible = false; poseR = poseL = 'hidden'; return; }
      right.root.visible = true; left.root.visible = true;
      const type = (s.type || 'rifle');
      const gp = GRIP_POSE[type] || GRIP_POSE.rifle;
      const grab = s.grab || {};
      const adsK = s.adsK || 0;
      const empty = force === 'empty' || s.forceEmpty;

      function one(glove, which) {
        const c = s[which];
        const isR = which === 'right';
        const gv = btnVal(c && c.gamepad, 1), tv = btnVal(c && c.gamepad, 0);
        const tgt = grab[which];
        const grabbing = !empty && !!(tgt && (tgt.mode === 'near' || tgt.mode === 'ray' || tgt.mode === 'use' || tgt.mode === 'body' || tgt.mode === 'shoulder'));
        const onGun = !empty && !grabbing && isR && s.gripObj;
        const onFore = !empty && !isR && s.foreObj && (s.twoHand || (s.pistolCup && gv > 0.35));
        const onReload = !empty && !isR && s.reloadObj;
        let pose = 'open';
        if (onReload) {
          attachWorld(glove, s.reloadObj); poseFingers(glove, 0.7, 0.55, 0.5); pose = 'reload';
        } else if (grabbing && c && c.grip) {
          if (glove.root.parent !== c.grip) c.grip.add(glove.root);
          controllerQuat(glove.root.quaternion);
          glove.root.position.set(0, -0.01, 0.02);
          const k = Math.max(gv, 0.25);
          poseFingers(glove, tgt && tgt.mode === 'use' && gv < 0.3 ? 0.2 : 0.25 + k * 0.6, 0.2 + k * 0.5, 0.3 + k * 0.4);
          pose = gv > 0.4 ? 'grab' : 'reach';
        } else if (onGun) {
          if (glove.root.parent !== s.gripObj) s.gripObj.add(glove.root);
          gunGripQuat(glove.root.quaternion);
          glove.root.rotation.x += gp.rot[0]; glove.root.rotation.y += gp.rot[1] * glove.side; glove.root.rotation.z += gp.rot[2] * glove.side;
          // sit the palm on the backstrap, not inside the handle
          glove.root.position.set(0.010 * glove.side, -0.018, 0.048);
          const wrap = gp.wrap, idx = gp.index + tv * 0.75;
          poseFingers(glove, wrap, idx, wrap * 0.65); pose = type;
        } else if (onFore) {
          if (glove.root.parent !== s.foreObj) s.foreObj.add(glove.root);
          foreQuat(glove.root.quaternion, glove.side);
          // cupped under the handguard so the fingers stay out of the sights
          glove.root.position.set(0.012 * glove.side, -0.038, 0.000);
          if (s.pistolCup) { glove.root.position.set(0.018 * glove.side, -0.045, 0.012); glove.root.rotation.z += 0.2 * glove.side; }
          poseFingers(glove, 0.62, 0.50, 0.45); pose = s.pistolCup ? 'cup' : 'fore';
        } else if (c && c.grip) {
          if (glove.root.parent !== c.grip) c.grip.add(glove.root);
          controllerQuat(glove.root.quaternion);
          glove.root.position.set(0, -0.012, 0.02);
          if (grabbing) {
            const k = Math.max(gv, 0.25);
            poseFingers(glove, tgt && tgt.mode === 'use' && gv < 0.3 ? 0.2 : 0.25 + k * 0.6, 0.2 + k * 0.5, 0.3 + k * 0.4);
            pose = gv > 0.4 ? 'grab' : 'reach';
          } else {
            const wrap = Math.max(gv, tv * 0.5);
            poseFingers(glove, wrap, Math.max(tv, wrap * 0.85), wrap * 0.7);
            pose = wrap < 0.12 ? 'open' : (wrap > 0.7 ? 'fist' : 'curl');
          }
        } else { glove.root.visible = false; pose = 'hidden'; }
        if (s.camera && adsK > 0.35 && glove.root.visible) tuck(glove, s.camera, adsK);
        if (glove.bake) glove.bake();
        return pose;
      }
      poseR = one(right, 'right');
      poseL = one(left, 'left');
    }

    function tip(which) {
      const G = which === 'left' ? left : right;
      if (!G.root.visible) return null;
      G.indexTip.updateMatrixWorld(true);
      return G.indexTip.getWorldPosition(tmpP).toArray();
    }
    function tipVec(which, out) {
      const G = which === 'left' ? left : right;
      if (!G.root.visible) return null;
      G.indexTip.updateMatrixWorld(true);
      return G.indexTip.getWorldPosition(out || tmpP);
    }

    return {
      update, tip, tipVec, useOff: off,
      force: (v) => { force = v || null; },
      mats: [mat],
      visible: () => !off && (right.root.visible || left.root.visible),
      status: () => ({
        on: !off && (right.root.visible || left.root.visible), noHands: off,
        left: left.root.visible, right: right.root.visible,
        pose: { left: poseL, right: poseR },
        tris: { left: left.tris, right: right.tris }
      }),
      roots: { left: left.root, right: right.root }
    };
  }

  return { create, useOff, GRIP_POSE, leatherMat, buildGlove, poseFingers, curlFinger, countTris };
})();
if (typeof module !== 'undefined') module.exports = XrHands;
