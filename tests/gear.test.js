// Gear checks: armor and charms (counts by rarity, which affixes fit which piece, class-only lines, drops, pickups, and what wearing them does). Plain sentences. Run: node tests/gear.test.js
const Referee = require('../src/referee.js'), G = require('../src/referee_gear.js'), W = require('../src/referee_weapons.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
let seed = 3; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const many = (n, f) => Array.from({ length: n }, f);
const piece = (slot, rarity, affixes, wave) => ({ slot, rarity, wave: wave || 1, affixes: affixes || [] });
const mk = (cfg) => { const r = Referee.create(5); r.setCfg(Object.assign({ playerHp: 100, regen: 0, startGun: 'pistol_service', gunDrops: false, gearDrops: false }, cfg || {})); r.reset(); return r; };
const go = (r, secs, inp) => { let o; const ev = []; for (let i = 0; i < Math.round(secs * 60); i++) { o = r.step(1 / 60, inp || {}); ev.push(...o.events); } return { s: o.state, ev }; };

// ---- the rules
for (let q = 0; q < 5; q++) {
  const counts = many(300, () => G.make('chest', q, 5, rng, '').affixes.length), [lo, hi] = [[0, 1], [1, 2], [2, 3], [3, 3], [3, 4]][q];
  t('A ' + W.RARITIES[q].name + ' chest gets between ' + lo + ' and ' + hi + ' affixes', counts.every((n) => n >= lo && n <= hi));
}
t('A charm always carries at least one affix, even a common one', many(300, () => G.make('charm', 0, 1, rng, '').affixes.length).every((n) => n >= 1));
t('Armor pieces only roll affixes that fit them: boots can be fleet but never add gun damage', many(300, () => G.make('boots', 4, 5, rng, '').affixes).flat().every((a) => G.BY_ID[a.id].slots.includes('boots')) && !many(300, () => G.make('boots', 4, 5, rng, '').affixes).flat().some((a) => a.id === 'might'));
t('Charms are where gun damage, fire rate and crit damage come from', ['might', 'haste', 'ruin'].every((id) => G.BY_ID[id].slots.length === 1 && G.BY_ID[id].slots[0] === 'charm'));
for (const cls of ['gunslinger', 'assassin', 'witch']) {
  const got = many(500, () => G.roll(3, 8, rng, cls)).map((i) => i.affixes).flat().map((a) => G.BY_ID[a.id]);
  t('A ' + cls + ' finds its own class-only gear lines and never another class\'s', got.some((a) => a.cls === cls) && got.every((a) => !a.cls || a.cls === cls));
}
t('With no class picked no class-only gear lines drop', many(300, () => G.roll(4, 8, rng, '')).map((i) => i.affixes).flat().every((a) => !G.BY_ID[a.id].cls));
t('Better rarity armor gives more defense and health', G.stats(piece('chest', 4)).def > G.stats(piece('chest', 0)).def * 2.5 && G.stats(piece('chest', 4)).hp > G.stats(piece('chest', 0)).hp * 2.5);
t('Later waves make gear a little stronger', G.stats(piece('head', 1, [], 30)).hp > G.stats(piece('head', 1, [], 1)).hp);
t('Chest armor protects more than boots of the same rarity', G.stats(piece('chest', 2)).def > G.stats(piece('boots', 2)).def);
t('A charm with no affixes gives nothing by itself', (() => { const s = G.stats(piece('charm', 4)); return s.def === 0 && s.hp === 0; })());
t('Defense stops at its cap however much you wear', G.total(many(5, () => piece('chest', 4, [{ id: 'ward', stat: 'def', v: 0.5 }]))).def === G.DEF_CAP);
t('Each piece has a name that goes up with its rarity', G.NAMES.head[0] !== G.NAMES.head[4] && Object.keys(G.NAMES).every((k) => G.NAMES[k].length === 5));
t('Where a piece goes: an empty spot first, then a worse piece of its kind, else nowhere', (() => {
  const worn = [null, null, null, null, null], c1 = piece('charm', 1, [{ id: 'might', stat: 'dmg', v: 0.05 }]), c4 = piece('charm', 4, [{ id: 'might', stat: 'dmg', v: 0.2 }]);
  const a = G.place(worn, c1); worn[a] = c1; const b = G.place(worn, c1); worn[b] = c1;     // two charms fill both charm places
  return a !== b && G.WEAR[a] === 'charm' && G.WEAR[b] === 'charm' && G.place(worn, c4) >= 3 && G.place(worn, piece('charm', 0, [{ id: 'might', stat: 'dmg', v: 0.01 }])) === -1;
})());
t('The gear card names the piece, rarity, defense, health and affix lines and says if it beats what you wear', (() => { const v = G.view(piece('chest', 3, [{ id: 'vit', stat: 'vit', v: 0.1 }]), [null, null, null, null, null]); return v.name === 'Bloodforged Cuirass' && v.rarityName === 'Epic' && v.def > 0 && v.hp > 0 && v.affixes.length === 1 && v.vs === 'empty'; })());

// ---- wearing it in a run
const baseHp = mk().snapshot().player.maxHp;
t('Wearing armor adds its health to your maximum', (() => { const r = mk(); r.wearGear(piece('chest', 3)); return r.snapshot().player.maxHp > baseHp + 20; })());
t('A max health affix raises your health by that share', (() => { const r = mk(); r.wearGear(piece('charm', 0, [{ id: 'vit', stat: 'vit', v: 0.5 }])); return r.snapshot().player.maxHp === Math.round(baseHp * 1.5); })());
const lost = (worn) => { const r = mk({ playerHp: 1e6 }); const p = r.snapshot().player; r.place(r.map.start.x, r.map.start.z, 0); go(r, 1.7); if (worn) worn.forEach((w) => r.wearGear(w)); r.spawnAt('goblin', r.map.start.x + 1.7, r.map.start.z); return go(r, 1.5).ev.filter((e) => e.type === 'playerHit').reduce((n, e) => n + e.dmg, 0); };
t('A monster biting you does damage in the test setup', lost(null) > 0);
t('Defense blocks that share of every hit', (() => { const a = lost(null), b = lost([piece('chest', 0, [{ id: 'ward', stat: 'def', v: 0.5 }])]); return b < a * 0.7 && b > 0; })());
t('Boots with a move speed affix make you faster', (() => { const run = (worn) => { const r = mk(); if (worn) r.wearGear(worn); const x0 = r.snapshot().player.x, z0 = r.snapshot().player.z; const o = go(r, 0.5, { mz: 1 }).s.player; return Math.hypot(o.x - x0, o.z - z0); }; return run(piece('boots', 2, [{ id: 'stride', stat: 'speed', v: 0.5 }])) > run(null) * 1.2; })());
t('A charm of regeneration heals you over time', (() => { const r = mk({ regenDelay: 0 }); r.wearGear(piece('charm', 2, [{ id: 'mend', stat: 'regen', v: 5 }])); r.setHp(40); go(r, 2); return r.snapshot().player.hp > 45; })());
t('The gear sheet in the snapshot lists all five places and the totals', (() => { const r = mk(); r.wearGear(piece('head', 2)); const g = r.snapshot().player.gear; return g.worn.length === 5 && g.worn[0].name && g.worn[1].empty && g.hp > 0 && g.def > 0; })());
t('A new run starts with nothing worn', (() => { const r = mk(); r.wearGear(piece('head', 2)); r.reset(); return r.snapshot().player.gear.worn.every((w) => w.empty); })());

// ---- drops and pickup
t('With gear drops off, nothing but hearts and guns ever drops', (() => { const r = mk(); r.spawnAt('goblin', 0, 0); for (let i = 0; i < 30; i++) r.clearWave && r.clearWave(); return r.snapshot().pickups.every((q) => q.kind !== 'gear'); })());
t('A gear piece lying on the floor carries a card, and walking over it puts it on', (() => {
  const r = mk({ gearDrops: true }); r.giveGear('head', 2); const q0 = r.snapshot().pickups.find((q) => q.kind === 'gear');
  const had = q0 !== undefined; go(r, 0.2);
  return had && q0.gear.slot === 'head' && r.snapshot().player.gear.worn[0].name === q0.gear.name && !r.snapshot().pickups.some((q) => q.kind === 'gear');
})());
t('Gear that is worse than what you wear stays on the floor', (() => { const r = mk({ gearDrops: true }); r.wearGear(piece('head', 4)); r.giveGear('head', 0); go(r, 0.3); return r.snapshot().pickups.some((q) => q.kind === 'gear' && q.gear.vs === 'worse') && r.snapshot().player.gear.worn[0].rarityName === 'Legendary'; })());
t('Better gear replaces the old piece, and the old piece drops at your feet', (() => { const r = mk({ gearDrops: true }); r.wearGear(piece('head', 0)); r.giveGear('head', 3); go(r, 0.3); const s = r.snapshot(); return s.player.gear.worn[0].rarityName === 'Epic' && s.pickups.some((q) => q.kind === 'gear' && q.gear.rarityName === 'Common'); })());
t('Two charms can be worn at once', (() => { const r = mk({ gearDrops: true }); r.giveGear('charm', 1); go(r, 0.2); r.giveGear('charm', 1); go(r, 0.2); const w = r.snapshot().player.gear.worn; return !w[3].empty && !w[4].empty; })());
t('A boss always drops a piece of gear when gear drops are on', (() => { const r = mk({ gearDrops: true, startWave: 10, damage: 1e6, magSize: 1000, spread: 0, spreadAds: 0 }); r.place(r.map.start.x, r.map.start.z, 0); go(r, 1.7); r.spawnAt('demon', r.map.start.x, r.map.start.z - 5); const ev = go(r, 0.4, { fire: true }).ev; return ev.some((e) => e.type === 'kill' && e.boss) && r.snapshot().pickups.some((q) => q.kind === 'gear'); })());
t('A Witch only ever finds Witch or plain gear lines on the floor', (() => { const r = mk({ gearDrops: true, classId: 'witch' }); for (let i = 0; i < 12; i++) r.giveGear('charm', 4); const got = r.snapshot().pickups.filter((q) => q.kind === 'gear'); const all = G.LIST; return got.length > 0 && got.every((q) => q.gear.affixes.every((a) => !a.cls || a.cls === 'witch')); })());

// ---- manual pickup of gear (the game's setting): nothing is taken unless you press pick up
{
  const man = () => mk({ gearDrops: true, manualGuns: true });
  const r = man(); r.giveGear('head', 2); go(r, 0.3);
  t('With manual pickup, standing on gear does not put it on', r.snapshot().player.gear.worn[0].empty === true && r.snapshot().pickups.some((q) => q.kind === 'gear'));
  t('Gear in reach is marked, so the card can say tap to pick up', r.snapshot().pickups.find((q) => q.kind === 'gear').inReach === true);
  r.step(1 / 60, { pickup: true });
  t('Pressing pick up puts the gear on', !r.snapshot().player.gear.worn[0].empty && !r.snapshot().pickups.some((q) => q.kind === 'gear'));
  const w = man(); w.wearGear(piece('head', 4)); w.giveGear('head', 0); w.step(1 / 60, { pickup: true });
  t('A piece you pick up on purpose goes on even if it is worse, and your old piece drops at your feet', w.snapshot().player.gear.worn[0].rarityName === 'Common' && w.snapshot().pickups.some((q) => q.kind === 'gear' && q.gear.rarityName === 'Legendary'));
  const walk = man(); walk.wearGear(piece('head', 1)); walk.giveGear('head', 4); go(walk, 3);
  t('Walking around never swaps your gear for what is on the floor', walk.snapshot().player.gear.worn[0].rarityName === 'Uncommon');
  const both = man(); both.giveGear('chest', 2); both.giveGun('smg_compact', 2); both.step(1 / 60, { pickup: true });
  t('One press picks up one thing: with a gun and gear both at your feet, a second press takes the other', (() => { const s1 = both.snapshot(); const one = s1.pickups.filter((q) => q.kind === 'gun' || q.kind === 'gear').length === 1; both.step(1 / 60, { pickup: true }); return one && both.snapshot().pickups.filter((q) => q.kind === 'gun' || q.kind === 'gear').length === 0; })());
}

// ---- the merchant sells gear
{
  const open = (gear, cls) => { const ref = Referee.create(5); ref.setCfg({ startWave: 1, playerHp: 1e7, regen: 0, classId: cls || 'witch', startGun: 'pistol_service', gunDrops: true, gearDrops: gear }); ref.reset(); const m = ref.map;
    ref.spawnAt('demon', m.start.x + 10, m.start.z); ref.clearWave(); ref.place(m.door.x, m.door.z, 0); go(ref, 2);
    for (let i = 0; i < 30 && (ref.snapshot().choices || ref.snapshot().classChoices); i++) ref.step(1 / 60, { pick: 0, pickClass: 0 });
    const mer = ref.snapshot().merchant; ref.place(mer.x, mer.z + 2, 0); go(ref, 0.5); return ref; };
  const r = open(true); let st = r.snapshot();
  const gears = () => r.snapshot().shop.supplies.filter((x) => /^gear/.test(x.id));
  t('The merchant offers two pieces of gear, each with a price, a colour and a line saying what it gives', gears().length === 2 && gears().every((g) => g.price > 0 && /^#/.test(g.color) && g.desc.length > 8));
  t('The shelf runs Mend, two guns, two pieces of gear, Leave', st.shop.supplies.length === 6 && st.shop.supplies[0].id === 'mend' && st.shop.supplies[5].id === 'leave');
  t('The second piece of gear is a rarity better and costs more', gears()[1].rarity >= gears()[0].rarity && gears()[1].price >= gears()[0].price);
  t('A Witch is only offered Witch or plain affixes on the shelf', gears().every((g) => !/Gunslinger|Killer|Viper|Shadow Step|Fan the|Dead Calm|Steel Nerve/.test(g.desc)));
  r.giveGold(-r.snapshot().gold); r.step(1 / 60, { pick: 3 });
  t('With no gold the gear cannot be bought', gears().length === 2 && r.snapshot().player.gear.worn.every((w) => w.empty));
  r.giveGold(5000); const g0 = gears()[0], gold0 = r.snapshot().gold; r.step(1 / 60, { pick: 3 }); st = r.snapshot();
  t('Buying gear takes its price in gold and puts it on', st.gold === gold0 - g0.price && st.player.gear.worn.some((w) => !w.empty));
  t('Bought gear leaves the shelf', gears().length === 1);
  const none = open(false);
  t('With gear drops off the merchant sells no gear, as before', none.snapshot().shop.supplies.every((x) => !/^gear/.test(x.id)));
}

// ---- the screen helpers (pure html)
global.GunCard = require('../src/screen/gun_card.js'); const Menu = require('../src/screen/gear_menu.js');
const r1 = mk({ gearDrops: true }); r1.wearGear(piece('chest', 3, [{ id: 'vit', stat: 'vit', v: 0.1 }])); r1.equipGun('smg_tactical', 3); const pl = r1.step(1 / 60, {}).state.player;
const mh = Menu.html(pl);
t('The Gear menu shows both guns and all five places, with empty ones marked', mh.includes('Tactical SMG') && mh.includes('in your hands') && mh.includes('Other hand') && mh.includes('Bloodforged Cuirass') && (mh.match(/gslot empty/g) || []).length >= 4);
t('The Gear menu adds up what you wear in one line', Menu.totals(pl.gear).includes('Defense') && Menu.totals(pl.gear).includes('max health'));
t('With nothing worn the Gear menu says so', Menu.totals(mk().snapshot().player.gear).includes('Nothing worn'));
t('The floor card for a gear piece shows its name, slot, defense, health and whether it beats yours', (() => { const h = GunCard.html(G.view(piece('head', 2), [null, null, null, null, null]), null); return h.includes('Crusader Visor') && h.includes('head') && h.includes('Defense') && h.includes('fills an empty place'); })());
t('The floor card finds the nearest piece of gear as well as guns', GunCard.nearest({ player: { x: 0, z: 0 }, pickups: [{ id: 1, kind: 'gear', gear: {}, x: 1, z: 0 }] }, 5).id === 1);

console.log(bad ? bad + ' FAILED' : 'all gear checks passed'); process.exit(bad ? 1 : 0);
