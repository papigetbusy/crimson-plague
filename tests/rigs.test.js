// Rig checks: every monster kind builds into a jointed group and every pose runs without a missing joint. Uses a tiny stand-in for THREE (no GPU needed).
// Plain sentences. Run: node tests/rigs.test.js
global.Voxel = require('../src/models/voxel.js'); global.VoxelSmooth = require('../src/models/voxel_smooth.js'); global.BestiaryKit = require('../src/models/bestiary_kit.js');
global.DemonLordSheet = require('../src/models/demon_lord_data.js'); global.HornedFiendSheet = require('../src/models/horned_fiend_data.js');
global.HornedFiendV2 = require('../src/models/horned_fiend_v2.js'); global.RockGolem = require('../src/models/rock_golem.js'); global.DemonLordV2 = require('../src/models/demon_lord_v2.js'); global.BoneHoundV2 = require('../src/models/bone_hound_v2.js');
for (const [g, f] of [['Goblin', 'goblin'], ['Skeleton', 'skeleton'], ['Mushroom', 'mushroom'], ['Eyeball', 'eyeball'], ['FlameSpirit', 'flame_spirit'], ['BatLord', 'bat_lord'], ['LichKing', 'lich_king'], ['ElderDragon', 'elder_dragon']]) global[g] = require('../src/models/' + f + '.js');
const MonsterRigs = require('../src/screen/monster_rigs.js'), D = require('../src/referee_data.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
class V { constructor() { this.x = 0; this.y = 0; this.z = 0; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } setScalar(v) { this.x = this.y = this.z = v; return this; } setRGB() { return this; } }
class Obj { constructor() { this.position = new V(); this.rotation = new V(); this.scale = new V(); this.scale.set(1, 1, 1); this.children = []; } add(c) { this.children.push(c); } }
const THREE = { Group: Obj, Mesh: class extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } }, MeshBasicMaterial: class { }, MeshLambertMaterial: class { constructor() { this.emissive = new V(); } },
  BufferGeometry: class { setAttribute() { } setIndex() { } computeBoundingSphere() { } }, BufferAttribute: class { } };
const rigs = MonsterRigs.create(THREE);
const states = [{ state: 'chase', atkK: 0, castK: 0 }, { state: 'attack', atkK: 0.6, castK: 0 }, { state: 'attack', atkK: 0, castK: 0 }, { state: 'cast', atkK: 0, castK: 0.8 }, { state: 'windup', atkK: 0, castK: 0 }, { state: 'charge', atkK: 0, castK: 0 }];
for (const kind of Object.keys(D.KINDS)) {
  let ok = true, why = '';
  try {
    const en = rigs.build(kind);
    for (const st of states) for (let i = 0; i < 6; i++) rigs.animate(en, Object.assign({ id: 3, phase: i, flash: 0 }, st), i * 0.37);
    ok = !!en.root && !!en.body;
  } catch (e) { ok = false; why = e.message; }
  t('The ' + D.KINDS[kind].name + ' builds into a rig and every pose runs' + (why ? ' (' + why + ')' : ''), ok);
}
process.exit(bad ? 1 : 0);
