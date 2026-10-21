// Skin checks: seven detailed player looks, the picker's rules, and the real gun a friend holds. Plain sentences. Run: node tests/skins.test.js
global.Voxel = require('../src/models/voxel.js'); global.VoxelSmooth = require('../src/models/voxel_smooth.js'); global.GunKit = require('../src/models/gun_kit.js');
global.GothicRifleSheet = require('../src/models/gothic_rifle_data.js'); global.GothicRifle = require('../src/models/gothic_rifle.js'); global.EmberProfile = require('../src/models/ember_profile.js'); global.EmberRifle = require('../src/models/ember_rifle.js'); global.RevolverSheet = require('../src/models/revolver_data.js'); global.Revolver = require('../src/models/revolver.js');
global.GunSkins = require('../src/screen/gun_skins.js'); global.GunCatalog = require('../src/models/gun_catalog.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
// a tiny stand-in for THREE: just enough to build and look at the pieces
class V3 { constructor() { this.x = 0; this.y = 0; this.z = 0; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } setScalar(s) { return this.set(s, s, s); } }
class Obj { constructor() { this.children = []; this.position = new V3(); this.scale = new V3().set(1, 1, 1); this.rotation = new V3(); } add(o) { this.children.push(o); o.parent = this; return this; } remove(o) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); } }
class Mat { constructor(o) { Object.assign(this, o || {}); this.color = { setHex() {}, setRGB() {} }; this.specular = { setHex() {} }; } }
class Geo { constructor(w, h, d) { this.d = [w, h, d]; this.attrs = {}; } setAttribute(k, a) { this.attrs[k] = a; } getAttribute(k) { return this.attrs[k]; } setIndex() {} computeBoundingSphere() {} dispose() {} }
const THREE = {
  Group: Obj, Mesh: class extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } },
  BoxGeometry: Geo, BufferGeometry: Geo, BufferAttribute: class { constructor(a) { this.array = a; this.needsUpdate = false; } },
  MeshLambertMaterial: Mat, MeshBasicMaterial: Mat, MeshPhongMaterial: Mat, PointLight: class extends Obj { constructor() { super(); this.isLight = true; this.color = { setRGB() {} }; } }
};
global.THREE = THREE;
const Skins = require('../src/screen/skins_look.js');
global.GunLook = require('../src/screen/gun_look.js'); global.GunList = require('../src/screen/gun_list.js'); global.SkinsLook = Skins;
const Friend = require('../src/screen/friend_gun.js');

const look = Skins.create(THREE);
const built = Skins.IDS.map((id) => { const body = new Obj(); look.build(id, body, 0); return { id, body }; });
const boxes = (b) => b.body.children.length;
const top = (b) => Math.max(...b.body.children.map((m) => m.position.y + m.geometry.d[1] / 2));
const glowCount = (b) => b.body.children.filter((m) => m.material.constructor === THREE.MeshBasicMaterial).length;

t('There are seven skins, each with its own name and id', Skins.LIST.length === 7 && new Set(Skins.IDS).size === 7 && Skins.LIST.every((s) => s.name && s.blurb && /^#[0-9a-f]{6}$/.test(s.tone) && /^#[0-9a-f]{6}$/.test(s.glow)));
t('Every skin builds a body of 30 to 60 boxes, so it is detailed but cheap enough for five players', built.every((b) => boxes(b) >= 30 && boxes(b) <= 60));
t('Every skin has glowing parts (eyes, seams or lenses) and some of them have a lot', built.every((b) => glowCount(b) >= 2));
t('Every skin stands between 2.0 and 2.7 units tall, taller than the hall doors are wide, like a person next to a gun', built.every((b) => top(b) >= 2.0 && top(b) <= 2.7));
t('The skins have different outlines: no two are the same height with the same number of boxes', (() => { const keys = built.map((b) => boxes(b) + ':' + top(b).toFixed(2)); return new Set(keys).size === 7; })());
t('A skin id from a bad save or a typo falls back to a skin by slot and never fails', Skins.pick('nonsense', 2) === Skins.IDS[2] && Skins.pick(undefined, 9) === Skins.IDS[9 % 7] && Skins.pick('frost', 0) === 'frost');
t('Two friends with no skin chosen look different from each other', Skins.pick('', 0) !== Skins.pick('', 1));
t('A random skin is always one of the seven', (() => { for (let i = 0; i < 40; i++) if (!Skins.valid(Skins.random())) return false; return Skins.random(() => 0.999999) === Skins.IDS[6]; })());
t('A skin builds the same boxes every time (nothing random in a look)', (() => { const a = new Obj(), b = new Obj(); look.build('crimson', a, 0); look.build('crimson', b, 0); return a.children.length === b.children.length && a.children.every((m, i) => m.position.y === b.children[i].position.y); })());

// ---- the real gun in a friend's hand
{
  const fg = Friend.create(THREE, new Obj());
  fg.set('pistol_service', 0, []);
  const rootBox = (id) => { const f = Friend.create(THREE, new Obj()); f.set(id, 0, []); return f; };
  const ids = ['rifle', 'ember', 'revolver'].concat(GunCatalog.LIST.map((g) => g.id));
  t('Every gun in the catalog can be held by a friend without failing', ids.every((id) => { try { rootBox(id); return true; } catch (e) { console.log(id, e.message); return false; } }));
  t('A gun is held out in front of the body, with its muzzle ahead of the hand', ids.every((id) => rootBox(id).muzzle()[2] < Friend.HAND[2] - 0.2));
  t('The muzzle is at chest height, between the belt and the eyes', ids.every((id) => { const m = rootBox(id).muzzle(); return m[1] > 0.9 && m[1] < 1.65; }));
  t('A rifle reaches out farther than a pistol', rootBox('pistol_service').muzzle()[2] > rootBox(ids.find((i) => i.startsWith('rifle')) || 'rifle').muzzle()[2]);
  t('Swapping guns rebuilds it, and the new gun has its own muzzle', (() => { const f = Friend.create(THREE, new Obj()); f.set('pistol_service', 0, []); const a = f.muzzle()[2]; f.set(ids.find((i) => i.startsWith('smg')), 0, []); return f.muzzle()[2] !== a; })());
  t('A rarity or status change repaints without rebuilding the gun', (() => { const f = Friend.create(THREE, new Obj()); f.set('pistol_service', 0, []); const n = f.root.children[0].children.length; f.set('pistol_service', 4, ['fire', 'ice']); return f.root.children[0].children.length === n; })());
  t('A friend\'s gun carries no light of its own, so five friends do not slow the hall down', (() => { const f = Friend.create(THREE, new Obj()); f.set('pistol_service', 0, []); return !f.root.children.some((c) => c.isLight); })());
}
console.log(bad ? bad + ' FAILED' : 'all skin checks passed'); process.exit(bad ? 1 : 0);
