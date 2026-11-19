// VR leather gloves: low-poly black gloves, per-class grip poses, ?nohands hides them,
// and posing must not touch the new ADS module.
const fs = require('fs'), path = require('path');
const XrHands = require('../src/screen/xr_hands.js');
const XrAds = require('../src/screen/xr_ads.js');
const threePath = [process.env.THREE_JS, '/workspace/three128.js', path.join(__dirname, '..', 'node_modules', 'three', 'build', 'three.js')].find((p) => p && fs.existsSync(p));
if (!threePath) { console.log('FAIL no THREE.js to build a glove'); process.exit(1); }
const THREE = require(threePath);

let fails = 0;
const t = (name, ok, seen) => { if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (seen !== undefined ? '  (' + seen + ')' : '')); };

t('?nohands in the link turns the gloves off; the full game path does not',
  XrHands.useOff('?sandbox&nohands') && XrHands.useOff('#nohands') && XrHands.useOff('?nohands') &&
  !XrHands.useOff('?sandbox') && !XrHands.useOff('') && !XrHands.useOff('?sandbox&oldads'));

t('Every gun class has a grip pose (pistol, SMG, rifle, shotgun, sniper, HMG)',
  ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'hmg'].every((k) => XrHands.GRIP_POSE[k] && XrHands.GRIP_POSE[k].wrap > 0));

const mat = XrHands.leatherMat(THREE);
t('The material is a dark matte-to-satin black leather (no steel env sheen)',
  mat.color.getHex() === 0x1a1a1d && mat.shininess >= 16 && mat.shininess <= 40 && !mat.envMap, mat.color.getHexString() + ' shininess ' + mat.shininess);

const R = XrHands.buildGlove(THREE, mat, 1), L = XrHands.buildGlove(THREE, mat, -1);
t('Each glove is a low-poly mesh (about 1-2k triangles, and never a heavy sculpt)',
  R.tris >= 400 && R.tris <= 2000 && L.tris === R.tris, 'tris ' + R.tris);
t('The left glove is the right mesh mirrored, and the wrist cuff is short',
  L.root.scale.x === -1 && R.root.scale.x === 1 && R.root.name === 'xr_glove_right' && L.root.name === 'xr_glove_left' &&
  Math.abs(R.cuff.position.y) <= 0.08 && Math.abs(R.cuff.geometry.parameters.height) <= 0.05,
  'cuff y ' + R.cuff.position.y + ' h ' + R.cuff.geometry.parameters.height);

const openX = R.joints.index[0].rotation.x;
XrHands.poseFingers(R, 0, 0, 0);
const restX = R.joints.index[0].rotation.x;
XrHands.poseFingers(R, 1, 1, 1);
const fistX = R.joints.index[0].rotation.x;
t('A held grip curls the fingers from a relaxed open pose into a fist',
  fistX > restX + 0.4, 'rest ' + restX.toFixed(3) + ' fist ' + fistX.toFixed(3));

const adsSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'screen', 'xr_ads.js'), 'utf8');
t('The gloves do not live in, or edit, the new ADS module', !/xr_glove|XrHands/.test(adsSrc));

const dolly = new THREE.Group();
const on = XrHands.create(THREE, { dolly, query: '?sandbox' });
const off = XrHands.create(THREE, { dolly, query: '?sandbox&nohands' });
t('create() honors ?nohands and starts with both gloves hidden',
  off.useOff && !off.visible() && !on.visible() && on.status().pose.right === 'hidden');

const gripR = new THREE.Group(), rayR = new THREE.Group(); dolly.add(gripR); dolly.add(rayR);
const right = { grip: gripR, ray: rayR, gamepad: { buttons: [{ value: 0, pressed: false }, { value: 0, pressed: false }] } };
on.update({ presenting: true, right, left: null, type: 'pistol' });
t('In VR an empty right hand follows the controller in the open pose',
  on.visible() && on.status().right && on.status().pose.right === 'open' && on.roots.right.parent === gripR,
  JSON.stringify(on.status()));

right.gamepad.buttons[1].value = 1; right.gamepad.buttons[1].pressed = true;
on.update({ presenting: true, right, type: 'pistol' });
t('Squeezing the grip with nothing in the hand makes a fist',
  on.status().pose.right === 'fist', on.status().pose.right);

const gunGrip = new THREE.Group(); dolly.add(gunGrip);
right.gamepad.buttons[0].value = 0; right.gamepad.buttons[0].pressed = false;
on.update({ presenting: true, right, type: 'pistol', gripObj: gunGrip });
const idx0 = on.roots.right; // just to hold a ref
// index curl is on the glove's joints; pull the trigger and it should close further
const gloveR = { joints: null };
// walk to index0 under the snapped root
let idxJoint = null; gunGrip.traverse((o) => { if (o.name === 'index0') idxJoint = o; });
const before = idxJoint ? idxJoint.rotation.x : 0;
right.gamepad.buttons[0].value = 1; right.gamepad.buttons[0].pressed = true;
on.update({ presenting: true, right, type: 'pistol', gripObj: gunGrip });
const after = idxJoint ? idxJoint.rotation.x : 0;
t('On a pistol the right hand snaps to the grip, and the index finger curls on the trigger',
  on.status().pose.right === 'pistol' && on.roots.right.parent === gunGrip && after > before + 0.2,
  'pose ' + on.status().pose.right + ' curl ' + before.toFixed(3) + ' -> ' + after.toFixed(3));


// orientation (the 2026-11-19 playtest: the gun hand was upside down and facing back). In gun space (+Y up, -Z forward, +X right):
// the palm faces the handle from the right, the fingers run forward, the thumb is up, the index finger is the top finger,
// and the wrist cuff trails behind the grip. Checked for every class.
const W = (o) => { o.updateMatrixWorld(true); return o.getWorldPosition(new THREE.Vector3()); };
const named = (root, n) => { let r = null; root.traverse((o) => { if (o.name === n) r = o; }); return r; };
for (const type of ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'hmg']) {
  right.gamepad.buttons[0].value = 0; right.gamepad.buttons[0].pressed = false;
  on.update({ presenting: true, right, type, gripObj: gunGrip });
  const G = on.roots.right, palm = W(named(G, 'palm')), i0 = W(named(G, 'index0')), p0 = W(named(G, 'pinky0')), t0 = W(named(G, 'thumb0'));
  const cuffY = new THREE.Vector3(0, -0.06, 0); G.localToWorld(cuffY);
  const palmN = new THREE.Vector3(0, 0, 1).transformDirection(G.matrixWorld);
  const ok = i0.z < palm.z - 0.02 && i0.y > p0.y + 0.02 && t0.y > palm.y && cuffY.z > palm.z && palmN.x < -0.8 && palm.x > 0.015;
  t('Gun hand on a ' + type + ' wraps the grip the right way up (palm on the handle, fingers forward, thumb and index on top, cuff behind)', ok,
    'palmN ' + palmN.toArray().map((v) => v.toFixed(2)) + ' index y ' + i0.y.toFixed(3) + ' pinky y ' + p0.y.toFixed(3));
}
{
  const gripL2 = new THREE.Group(), fore2 = new THREE.Group(); dolly.add(gripL2); dolly.add(fore2);
  const left2 = { grip: gripL2, ray: new THREE.Group(), gamepad: { buttons: [{ value: 0 }, { value: 1, pressed: true }] } };
  on.update({ presenting: true, right, left: left2, type: 'rifle', gripObj: gunGrip, foreObj: fore2, twoHand: true });
  const G = on.roots.left, palm = W(named(G, 'palm')), i0 = W(named(G, 'index0')), t0 = W(named(G, 'thumb0'));
  const palmN = new THREE.Vector3(0, 0, 1).transformDirection(G.matrixWorld);
  t('Support hand under a handguard: palm up, fingers forward, thumb on the left side', palmN.y > 0.8 && i0.z < palm.z - 0.02 && t0.x < palm.x,
    'palmN ' + palmN.toArray().map((v) => v.toFixed(2)));
}

const gripL = new THREE.Group(), fore = new THREE.Group(); dolly.add(gripL); dolly.add(fore);
const left = { grip: gripL, ray: new THREE.Group(), gamepad: { buttons: [{ value: 0 }, { value: 1, pressed: true }] } };
on.update({ presenting: true, right, left, type: 'rifle', gripObj: gunGrip, foreObj: fore, twoHand: true });
t('The support hand snaps to the fore-end in a cupped pose when the left grip is held',
  on.status().pose.left === 'fore' && on.roots.left.parent === fore, JSON.stringify(on.status().pose));

on.update({ presenting: true, right, left, type: 'pistol', gripObj: gunGrip, foreObj: fore, twoHand: true, pistolCup: true });
t('A pistol gets a two-hand cup grip on the support hand',
  on.status().pose.left === 'cup', on.status().pose.left);

const doorGrab = { right: { mode: 'use', text: 'Open the door', ok: true, what: 'door' } };
on.update({ presenting: true, right: { grip: gripR, gamepad: { buttons: [{ value: 0 }, { value: 0 }] } }, type: 'pistol', grab: doorGrab });
t('Pointing at a door uses a reach pose; squeezing the grip becomes a grab',
  on.status().pose.right === 'reach', on.status().pose.right);
on.update({ presenting: true, right: { grip: gripR, gamepad: { buttons: [{ value: 0 }, { value: 1, pressed: true }] } }, type: 'pistol', grab: doorGrab });
t('A held grip on a door handle is a grab pose', on.status().pose.right === 'grab', on.status().pose.right);

off.update({ presenting: true, right, left, type: 'rifle', gripObj: gunGrip, foreObj: fore, twoHand: true });
t('?nohands stays hidden even when you are holding a gun with both hands',
  !off.visible() && off.status().noHands && off.status().pose.right === 'hidden');

// ADS numbers stay exactly what the module already shipped (this file must not drift them)
t('The new ADS table is unchanged (M4 0.08 m, pistol 0.30 m, sniper zoom 4)',
  XrAds.of('rifle', 'rifle_m4').relief === 0.08 && XrAds.of('pistol').relief === 0.30 && XrAds.of('sniper').zoom === 4);

if (fails) { console.log(fails + ' failed'); process.exit(1); }
console.log('all ok');
