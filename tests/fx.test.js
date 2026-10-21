// Effect checks: the look presets escalate from common to legendary, elements recolour them, and the sprite pool plays and frees animations.
const Plan = require('../src/screen/fx_plan.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const power = (id, kind, info) => Plan.plan(id, kind, info).reduce((s, e) => s + e.size, 0);
const ids = Plan.PRESETS.map((p) => p.id);

t('The Original preset shows no sprite effects at all, so the plain voxel bursts are all there is', ['muzzle', 'wall', 'flesh', 'kill', 'blast'].every((k) => Plan.plan('original', k, { scale: 1 }).length === 0));
t('An unknown preset falls back to Common instead of breaking', Plan.plan('nonsense', 'kill', { scale: 1 }).length === Plan.plan('common', 'kill', { scale: 1 }).length);
t('Every preset has something to show for a muzzle flash, a wall hit, a hit, a kill and a blast (except Original)', ids.filter((i) => i !== 'original').every((i) => ['muzzle', 'wall', 'flesh', 'kill', 'blast'].every((k) => Plan.plan(i, k, { scale: 1 }).length > 0)));
t('Each tier is a bigger show than the one before it, for kills and for blasts', ['kill', 'blast'].every((k) => power('common', k, { scale: 1, r: 2.5 }) < power('rare', k, { scale: 1, r: 2.5 }) && power('rare', k, { scale: 1, r: 2.5 }) < power('epic', k, { scale: 1, r: 2.5 }) && power('epic', k, { scale: 1, r: 2.5 }) < power('legendary', k, { scale: 1, r: 2.5 })));
t('A legendary kill is a pile of explosions: at least five animations including the big epic explosion', (() => { const k = Plan.plan('legendary', 'kill', { scale: 1 }); return k.length >= 5 && k.some((e) => e.fx === 'epic_explosion_001'); })());
t('A kill grows with the monster, and a boss kill is 1.8 times bigger again', (() => { const a = Plan.plan('legendary', 'kill', { scale: 1 })[0].size, b = Plan.plan('legendary', 'kill', { scale: 2 })[0].size, c = Plan.plan('legendary', 'kill', { scale: 1, boss: true })[0].size; return Math.abs(b - 2 * a) < 1e-9 && Math.abs(c - 1.8 * a) < 1e-9; })());
t('A blast grows with its radius', Plan.plan('legendary', 'blast', { r: 5 })[0].size > Plan.plan('legendary', 'blast', { r: 2.5 })[0].size);
t('A critical hit adds extra animations to a normal hit', Plan.plan('epic', 'flesh', { crit: true }).length > Plan.plan('epic', 'flesh', { crit: false }).length);
t('An element recolours every tintable animation of a legendary kill, but blood is never recoloured', (() => { const k = Plan.plan('hellfire', 'kill', { scale: 1 }); return k.find((e) => e.fx === 'epic_explosion_001').tint === '#ff7a2e' && k.find((e) => e.fx === 'directional_splatter_003').tint === null; })());
t('Smoke, dust and skulls are tinted ash grey so nothing pale and bright breaks the gothic look', ['common', 'rare'].every((i) => ['kill', 'wall', 'blast'].every((k) => Plan.plan(i, k, { scale: 1 }).filter((e) => /smoke|dust/.test(e.fx)).every((e) => e.tint === '#8a8078'))));
t('Each element adds its own signature animation to kills', ['hellfire', 'frostbite', 'stormcaller', 'voidmaw', 'plague'].every((i) => Plan.plan(i, 'kill', { scale: 1 }).length > Plan.plan('legendary', 'kill', { scale: 1 }).length));
t('Screen shake only comes with epic and legendary, and only for kills and blasts', Plan.shake('common', 'kill') === 0 && Plan.shake('epic', 'kill') > 0 && Plan.shake('legendary', 'kill') > Plan.shake('epic', 'kill') && Plan.shake('legendary', 'blast') > 0 && Plan.shake('legendary', 'wall') === 0 && Plan.shake('original', 'kill') === 0);
t('The bullet streak gets thicker and sheds more sparkles with each tier, and takes the element colour', (() => { const c = Plan.tracer('common'), l = Plan.tracer('legendary'); return l.width > c.width && l.trail > c.trail && Plan.tracer('frostbite').color === 0x9fe8ff && Plan.tracer('original').trail === 0; })());
t('The sparkle trail has a sprite for every preset except Original', Plan.trailSprite('original') === null && ids.filter((i) => i !== 'original').every((i) => Plan.trailSprite(i) && Plan.trailSprite(i).fx));
t('Every animation any preset asks for is on the list of sheets to pack', (() => { const need = new Set(Plan.needed()); return ids.every((i) => ['muzzle', 'wall', 'flesh', 'kill', 'blast'].every((k) => Plan.plan(i, k, { scale: 1, crit: true }).every((e) => need.has(e.fx)))) && need.has(Plan.trailSprite('legendary').fx); })());
t('Frame picking stays inside the animation and runs from the first frame to the last', Plan.frameIndex(10, 0, 1) === 0 && Plan.frameIndex(10, 0.99, 1) === 9 && Plan.frameIndex(10, 5, 1) === 9 && Plan.frameIndex(10, -1, 1) === 0);
t('Muzzle flashes stay small enough not to fill the screen (under 0.7 of a world unit)', ids.every((i) => Plan.plan(i, 'muzzle', {}).every((e) => e.size < 0.7)));

t('Legendary effects are 15% smaller than they were: the first legendary kill sprite is 4.4 x 0.85, the muzzle flash 0.5 x 0.85, the streak 15% thinner', (() => { const k = Plan.plan('legendary', 'kill', { scale: 1 })[0], m = Plan.plan('legendary', 'muzzle', {})[0]; return Math.abs(k.size - 4.4 * 0.85) < 0.001 && Math.abs(m.size - 0.5 * 0.85) < 0.001 && Math.abs(Plan.tracer('legendary').width - 0.07 * 0.85) < 0.001; })());
t('The cut is only for legendary: an epic kill keeps its size', Math.abs(Plan.plan('epic', 'kill', { scale: 1 })[0].size - 3.6) < 0.001);

// ---- shots follow the gun you hold
const RW = require('../src/referee_weapons.js');
t('Every gun status colour has an element, so no gun is left without its look', RW.STATUSES.every((st) => Plan.STATUS_EL[st] && Plan.ELEMENTS[Plan.STATUS_EL[st]]));
t('The look of a gun is its rarity tier plus its status element: a common gun with ice is ice-blue common, an epic fire gun is epic fire', Plan.lookFor(0, ['ice']) === 'common:ice' && Plan.lookFor(3, ['fire']) === 'epic:fire' && Plan.lookFor(2, []) === 'rare');
t('Uncommon guns use the common tier, rare uses rare, epic epic, legendary legendary', ['common', 'common', 'rare', 'epic', 'legendary'].every((tier, r) => Plan.presetOf(Plan.lookFor(r, [])).tier === tier));
t('A legendary with two statuses plays both elements\' extras on a kill', (() => { const one = Plan.plan('legendary:fire', 'kill', { scale: 1 }).length, two = Plan.plan('legendary:fire+ice', 'kill', { scale: 1 }).length; return two > one; })());
t('A two-colour gun alternates its bullet streak between its colours, and a one-colour gun keeps one', (() => { const a = Plan.tracer('legendary:fire+ice', 0).color, b = Plan.tracer('legendary:fire+ice', 1).color, c = Plan.tracer('rare:fire', 0).color, d = Plan.tracer('rare:fire', 1).color; return a !== b && c === d; })());
t('Each of the seven colours gives a different bullet streak colour', (() => { const cols = RW.STATUSES.map((st) => Plan.tracer('rare:' + Plan.STATUS_EL[st], 0).color); return new Set(cols).size === 7; })());
t('Poison is purple and radiation is green, as chosen', Plan.ELEMENTS.toxin.tint === '#c04cff' && Plan.ELEMENTS.plague.tint === '#7cff5a');
t('A made-up gun look falls back to Common instead of breaking', Plan.plan('epic:nonsense', 'kill', { scale: 1 }).length === Plan.plan('epic', 'kill', { scale: 1 }).length && Plan.plan('bogus:fire', 'kill', { scale: 1 }).length === Plan.plan('common', 'kill', { scale: 1 }).length);
t('Every gun in the game has a working look for every rarity', Object.keys(RW.GUNS).every((id) => [0, 1, 2, 3, 4].every((r) => ['muzzle', 'wall', 'flesh', 'kill', 'blast'].every((k) => Plan.plan(Plan.lookFor(r, RW.make(id, r, 5, () => 0.5).status), k, { scale: 1 }).length > 0))));

// ---- the sprite pool, with a fake drawing library (no GPU needed) ----
const fs = require('fs'), path = require('path');
const packed = fs.existsSync(path.join(__dirname, '..', 'src', 'screen', 'fx_data.js'));
if (packed) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'screen', 'fx_data.js'), 'utf8');
  const data = new Function(src + '; return FxData;')();
  t('When the effect art is packed, every sheet the presets need is in it with a frame table', Plan.needed().every((n) => data[n] && data[n].fr.length > 0 && data[n].w > 0));
} else console.log('     (effect art not packed here, skipping the packed-art check)');

class V { constructor(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; } set(x, y, z) { this.x = x; this.y = y === undefined ? x : y; this.z = z === undefined ? 0 : z; return this; } length() { return Math.hypot(this.x, this.y, this.z); } }
const THREE = {
  Vector2: V, Vector3: V, NearestFilter: 1, AdditiveBlending: 2, NormalBlending: 1,
  PlaneGeometry: class {}, CanvasTexture: class { constructor(c) { this.image = c; } },
  ShaderMaterial: class { constructor(o) { Object.assign(this, o); } },
  Mesh: class { constructor(g, m) { this.material = m; this.visible = true; this.position = new V(); this.scale = new V(1, 1, 1); this.quaternion = { copy() {} }; } },
};
global.Image = class { set src(v) { this.naturalWidth = 192; this.naturalHeight = 64; if (this.onload) this.onload(); } };
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {}, fillRect() {}, set globalCompositeOperation(v) {}, set fillStyle(v) {} }) }) };
const sheet = { png: 'x', w: 64, h: 64, fr: [[0, 0], [64, 0], [128, 0]] };
const FxSprites = require('../src/screen/fx_sprites.js');
const cam = { position: new V(0, 1.6, 0), quaternion: {} }, scene = { added: [], add(m) { this.added.push(m); } };

const none = FxSprites.create(THREE, cam, scene);
t('Without the effect art the sprite player is switched off and plays nothing', !none.art() && none.play('legendary', 'kill', 0, 1, -5, { scale: 1 }) === 0);

global.FxData = {}; for (const n of Plan.needed()) global.FxData[n] = Object.assign({}, sheet);
const fx = FxSprites.create(THREE, cam, scene);
t('With the art in place the sprite player is on and has loaded the sheets', fx.art() && fx.ready());
const slots = scene.added;
t('A legendary kill starts one sprite for every animation in its plan', fx.play('legendary', 'kill', 0, 1.2, -6, { scale: 1 }) === Plan.plan('legendary', 'kill', { scale: 1 }).length && fx.active() === Plan.plan('legendary', 'kill', { scale: 1 }).length);
fx.update(0.001);
t('Sprites with no delay show at once and delayed ones wait their turn', slots.filter((m) => m.visible).length > 0 && slots.filter((m) => m.visible).length < fx.active());
fx.update(0.3);
t('Delayed sprites appear once their delay has passed', slots.filter((m) => m.visible).length === fx.active());
t('A sprite steps through its frames as it ages (the picture window moves along the sheet)', (() => { fx.clear(); fx.spawn({ fx: 'epic_explosion_001', size: 2, dur: 0.9, tint: null, add: false, ground: false, delay: 0 }, 0, 1, -5); const u = slots.find((m) => m.material.uniforms.map.value !== null).material.uniforms; const seen = new Set(); for (let i = 0; i < 9; i++) { fx.update(0.1); seen.add(u.uOff.value.x.toFixed(3)); } return seen.size >= 3; })());
t('A finished animation frees its sprite so it can be used again', (() => { fx.clear(); fx.spawn({ fx: 'epic_explosion_001', size: 2, dur: 0.2, tint: null, add: false, ground: false, delay: 0 }, 0, 1, -5); fx.update(0.1); const mid = fx.active(); fx.update(0.2); return mid === 1 && fx.active() === 0; })());
t('When every sprite is busy the oldest is reused, so the pool never grows', (() => { fx.clear(); for (let i = 0; i < 200; i++) fx.spawn({ fx: 'epic_explosion_001', size: 1, dur: 5, tint: null, add: false, ground: false, delay: 0 }, 0, 1, -5); return fx.active() === 80 && scene.added.length === 160; })());
t('A ground animation sits on the floor spot (its centre is lifted by half its height)', (() => { fx.clear(); fx.spawn({ fx: 'epic_explosion_001', size: 4, dur: 1, tint: null, add: false, ground: true, delay: 0 }, 0, 1.2, -6, 0.05); fx.update(0.01); const m = slots.find((q) => q.visible); return m.position.y > 1.9 && m.position.y < 2.2; })());
t('Glowing animations use additive blending and the rest use normal blending', (() => { fx.clear(); fx.spawn({ fx: 'epic_explosion_001', size: 1, dur: 1, tint: null, add: true, ground: false, delay: 0 }, 0, 1, -5); const add = slots.find((m) => m.material.blending === 2); fx.clear(); fx.spawn({ fx: 'epic_explosion_001', size: 1, dur: 1, tint: null, add: false, ground: false, delay: 0 }, 0, 1, -5); return !!add && slots.some((m) => m.material.blending === 1); })());
t('Clearing hides everything at once (a restart leaves no explosion hanging)', (() => { fx.play('legendary', 'kill', 0, 1, -5, { scale: 1 }); fx.update(0.5); fx.clear(); return fx.active() === 0 && slots.every((m) => !m.visible); })());
t('A bullet streak sheds sparkles along its path on legendary and none on Original', (() => { fx.clear(); const n = fx.trail('legendary', { x: 0, y: 1.4, z: 0 }, { x: 0, y: 1.4, z: -10 }); const o = fx.trail('original', { x: 0, y: 1.4, z: 0 }, { x: 0, y: 1.4, z: -10 }); return n === Plan.tracer('legendary').trail && o === 0; })());
process.exit(bad ? 1 : 0);
