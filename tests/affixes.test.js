// Gun affix checks: how many by rarity, class-only lines, what each line does, and the floor card numbers. Plain sentences. Run: node tests/affixes.test.js
const Referee = require('../src/referee.js'), W = require('../src/referee_weapons.js'), A = require('../src/referee_affixes.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
let seed = 1; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const many = (n, f) => Array.from({ length: n }, f);
const mk = (cls) => { const r = Referee.create(5); r.setCfg({ playerHp: 1e7, regen: 0, startGun: 'pistol_service', gunDrops: true, classId: cls || '' }); r.reset(); return r; };

for (let r = 0; r < 5; r++) {
  const [lo, hi] = A.COUNT[r], counts = many(400, () => A.roll(r, rng, 'witch').length);
  t('A ' + W.RARITIES[r].name + ' gun gets between ' + lo + ' and ' + hi + ' affixes, and both ends happen when they differ', counts.every((n) => n >= lo && n <= hi) && (lo === hi || (counts.includes(lo) && counts.includes(hi))));
}
t('A gun never rolls the same affix twice', many(300, () => A.roll(4, rng, 'gunslinger')).every((l) => new Set(l.map((a) => a.id)).size === l.length));
for (const cls of A.CLASSES) {
  const others = A.CLASSES.filter((c) => c !== cls);
  const seen = many(600, () => A.roll(3, rng, cls)).flat().map((a) => A.BY_ID[a.id]);
  t('A ' + cls + ' finds its own class-only affixes and never another class\'s', seen.some((a) => a.cls === cls) && seen.every((a) => !a.cls || a.cls === cls) && !seen.some((a) => others.includes(a.cls)));
}
t('With no class picked only the plain affixes drop', many(300, () => A.roll(4, rng, '')).flat().every((a) => !A.BY_ID[a.id].cls));
t('Every class has class-only affixes to find', A.CLASSES.every((c) => A.LIST.some((a) => a.cls === c)));
const avg = (r, id) => { const v = many(600, () => A.roll(r, rng, '').concat(A.roll(r, rng, '')).find((a) => a.id === id)).filter(Boolean).map((a) => a.v); return v.reduce((s, x) => s + x, 0) / v.length; };
t('The same affix rolls a bigger number on a legendary than on an uncommon', avg(4, 'power') > avg(1, 'power') * 1.3);
t('Class-only affixes are stronger than the plain version of the same stat', A.BY_ID.fan.base > A.BY_ID.tempo.base && A.BY_ID.edge.base > A.BY_ID.ruin.base && A.BY_ID.bloodpact.base > A.BY_ID.leech.base);

// ---- what a line does to a gun
const cfg = Referee.create(1).cfg || { damage: 14, fireRate: 10, magSize: 30, reloadTime: 2.1 };
const base = { id: 'smg_compact', rarity: 2, wave: 1, status: [], affixes: [] };
const withA = (stat, v) => Object.assign({}, base, { affixes: [{ id: 'x', stat, v }] });
const S0 = W.stats(base, cfg);
t('A damage affix raises the gun\'s damage by that share', Math.abs(W.stats(withA('dmg', 0.2), cfg).dmg / S0.dmg - 1.2) < 1e-9);
t('A fire rate affix raises the fire rate', W.stats(withA('rate', 0.2), cfg).rate > S0.rate * 1.19);
t('A magazine affix makes the magazine bigger', W.stats(withA('mag', 0.5), cfg).mag > S0.mag);
t('A reload affix shortens the reload', W.stats(withA('reload', 0.25), cfg).reload < S0.reload * 0.8);
t('A steady affix tightens the spread', W.stats(withA('spread', 0.3), cfg).spread < S0.spread * 0.75);
t('Crit, crit damage, headshot and leech affixes show up as extras on the gun', (() => { const s = W.stats(Object.assign({}, base, { affixes: [{ id: 'a', stat: 'crit', v: 0.1 }, { id: 'b', stat: 'critdmg', v: 0.5 }, { id: 'c', stat: 'head', v: 0.4 }, { id: 'd', stat: 'leech', v: 0.05 }] }), cfg); return s.crit === 0.1 && s.critDmg === 0.5 && s.head === 0.4 && s.leech === 0.05; })());
t('A gun with no affixes has no extras', S0.crit === 0 && S0.critDmg === 0 && S0.head === 0 && S0.leech === 0 && S0.status === 0);

// ---- in the referee
t('A gun that drops for a Witch only ever carries plain or Witch affixes', (() => { const r = mk('witch'); for (let i = 0; i < 60; i++) r.giveGun('pistol_cannon', 4); return r.snapshot().pickups.filter((q) => q.gun).every((q) => q.gun.affixes.every((a) => !a.cls || a.cls === 'witch')); })());
t('A gun that drops for a Gunslinger never carries Witch or Assassin affixes', (() => { const r = mk('gunslinger'); for (let i = 0; i < 20; i++) r.giveGun('smg_drum', 4); const got = r.snapshot().pickups.filter((q) => q.gun); return got.length > 0 && got.every((q) => q.gun.affixes.every((a) => !a.cls || a.cls === 'gunslinger')); })());
t('A gun lying on the floor carries a card with its name, numbers and affix lines', (() => { const r = mk('assassin'); r.giveGun('sniper_bolt', 4); const q = r.snapshot().pickups.find((x) => x.gun); const g = q.gun; return g.name === 'Bolt Rifle' && g.rarityName === 'Legendary' && g.dmg > 0 && g.mag > 0 && g.affixes.length >= 3 && g.affixes.every((a) => a.text && a.name); })());
t('The gun in your hands has a card too, with its affix lines', (() => { const r = mk(); r.equipGun('smg_tactical', 3); const p = r.step(1 / 60, {}).state.player.gun; return p.card && p.card.name === 'Tactical SMG' && p.card.affixes.length === 3; })());
t('The starting pistol has no affixes', mk().snapshot().player.gun.card.affixes.length === 0);
// a real shot at a monster standing in front of the player
function shootAt(item, hpStart) {
  const r = Referee.create(5); r.setCfg({ playerHp: 1e7, regen: 0, startGun: 'pistol_service', gunDrops: false, magSize: 1000, spread: 0, spreadAds: 0 }); r.reset();
  const sx = r.map.start.x, sz = r.map.start.z; r.place(sx, sz, 0);
  const ev = []; const go = (n, inp) => { for (let i = 0; i < n; i++) ev.push(...r.step(1 / 60, inp || {}).events); };
  go(100); r.equipItem(item); go(24); r.spawnAt('golem', sx, sz - 6); r.setHp(hpStart || 100); ev.length = 0; go(1, { fire: true });
  return { ev, hp: r.snapshot().player.hp, hits: ev.filter((e) => e.type === 'hit') };
}
const plain = { id: 'pistol_service', rarity: 0, wave: 1, status: [], affixes: [] };
const base1 = shootAt(plain);
t('A shot at a monster registers a hit (the test setup works)', base1.hits.length > 0);
t('A damage affix really makes the gun hit harder', shootAt(Object.assign({}, plain, { affixes: [{ id: 'power', stat: 'dmg', v: 1 }] })).hits[0].dmg > base1.hits[0].dmg * 1.9);
t('A crit chance affix of 100% makes every shot a crit, doubling the damage', (() => { const c = shootAt(Object.assign({}, plain, { affixes: [{ id: 'keen', stat: 'crit', v: 1 }] })); return c.ev.some((e) => e.type === 'crit') && c.hits[0].dmg > base1.hits[0].dmg * 1.9; })());
t('A crit damage affix makes crits hit harder still', (() => { const mk2 = (v) => shootAt(Object.assign({}, plain, { affixes: [{ id: 'keen', stat: 'crit', v: 1 }, { id: 'ruin', stat: 'critdmg', v: v }] })).hits[0].dmg; return mk2(1) > mk2(0) * 1.4; })());
const killer = { id: 'power', stat: 'dmg', v: 1e7 };      // a shot that kills what it hits
t('A leech affix heals a flat amount of life when you kill a monster', Math.round(shootAt(Object.assign({}, plain, { affixes: [killer, { id: 'leech', stat: 'leech', v: 3 }] }), 50).hp) === 53);
t('A leech affix does not heal you from a hit that does not kill', shootAt(Object.assign({}, plain, { affixes: [{ id: 'leech', stat: 'leech', v: 3 }] }), 50).hp <= 50);
t('Without a leech affix a kill does not heal you', Math.round(shootAt(Object.assign({}, plain, { affixes: [killer] }), 50).hp) === 50);
t('A leech line reads as life on kill, a flat number', A.describe({ id: 'leech', stat: 'leech', v: 2 }).text === '+2 life on kill');

// ---- the floor card (screen helper, pure html)
const Card = require('../src/screen/gun_card.js');
const cardOf = (item) => W.view(item, Referee.create(1).cfg);
const hi = cardOf({ id: 'smg_compact', rarity: 4, wave: 30, status: ['radiation', 'fire'], affixes: [{ id: 'fan', stat: 'rate', v: 0.2 }, { id: 'power', stat: 'dmg', v: 0.1 }] });
const lo = cardOf({ id: 'pistol_service', rarity: 0, wave: 1, status: [], affixes: [] });
const h1 = Card.html(hi, lo);
t('The floor card shows the gun name, rarity, type, status, numbers and every affix line', ['Compact SMG', 'Legendary', 'smg', 'radiation + fire', 'Fan the Hammer', 'Power', 'Reload'].every((x) => h1.includes(x)));
t('The floor card marks class-only affixes with their class', h1.includes('★') && h1.includes('gunslinger only'));
t('The floor card shows a green arrow where the floor gun beats yours and a red one where it is worse', h1.includes('class="up"') && Card.html(lo, hi).includes('class="dn"'));
t('A gun with no affixes says so on its card', Card.html(lo, null).includes('no affixes'));
t('The card picks the nearest gun on the floor within range and ignores hearts', (() => { const st = { player: { x: 0, z: 0 }, pickups: [{ id: 1, kind: 'heal', x: 0.5, z: 0 }, { id: 2, kind: 'gun', gun: lo, x: 3, z: 0 }, { id: 3, kind: 'gun', gun: hi, x: 1, z: 1 }] }; return Card.nearest(st, 5).id === 3 && Card.nearest(st, 0.5) === null; })());

console.log(bad ? bad + ' FAILED' : 'all affix checks passed'); process.exit(bad ? 1 : 0);
