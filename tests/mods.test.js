// Gun mod checks: how many lines a mod has, which guns it fits, how many places a gun has, what a mod changes, drops, the bag and fitting/removing. Plain sentence names.
const Referee = require('../src/referee.js'), M = require('../src/referee_mods.js'), W = require('../src/referee_weapons.js'), AF = require('../src/referee_affixes.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
let seed = 11; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const many = (n, f) => Array.from({ length: n }, f);
const mk = (cfg) => { const r = Referee.create(5); r.setCfg(Object.assign({ playerHp: 100, regen: 0, startGun: 'pistol_service', gunDrops: false, gearDrops: false, modDrops: false }, cfg || {})); r.reset(); return r; };
const go = (r, secs, inp) => { let o; const ev = []; for (let i = 0; i < Math.round(secs * 60); i++) { o = r.step(1 / 60, inp || {}); ev.push(...o.events); } return { s: o.state, ev }; };
const mod = (rarity, affixes) => ({ rarity, wave: 1, affixes: affixes || [{ id: 'extmag', stat: 'mag', v: 0.5 }] });

// ---- the rules
[1, 2, 3, 3, 4].forEach((n, q) => t('A ' + W.RARITIES[q].name + ' mod carries exactly ' + n + ' line' + (n > 1 ? 's' : ''), many(100, () => M.make(q, 5, rng).affixes.length).every((c) => c === n)));
t('A mod never carries the ordinary gun or gear lines, only its own', many(300, () => M.make(4, 5, rng).affixes).flat().every((a) => M.BY_ID[a.id] && !AF.BY_ID[a.id]));
t('A mod never repeats a line', many(200, () => M.make(4, 5, rng).affixes.map((a) => a.id)).every((ids) => new Set(ids).size === ids.length));
t('Higher rarity mods have bigger numbers', (() => { const avg = (q) => many(300, () => { const a = M.make(q, 1, rng).affixes[0]; return a.v / M.BY_ID[a.id].base; }).reduce((x, y) => x + y, 0) / 300; return avg(4) > avg(2) && avg(2) > avg(0); })());
t('Guns have 1, 1, 2, 2 and 3 mod places by rarity', [0, 1, 2, 3, 4].map(M.slotsFor).join() === '1,1,2,2,3');
t('Any mod rarity fits a gun of any rarity (you may take the hit on stats for a line you like)', [0, 1, 2, 3, 4].every((g) => [0, 1, 2, 3, 4].every((m) => M.fits(g, m))));



t('Every mod rarity has a gun it fits (nothing is ever stuck in the bag for good)', [0, 1, 2, 3, 4].every((m) => [0, 1, 2, 3, 4].some((g) => M.fits(g, m))));

// ---- what a mod changes
const base = W.make('pistol_service', 2, 1), plain = W.stats(base, { damage: 10, fireRate: 5, magSize: 20, reloadTime: 2, spread: 1 });
const withMod = (affixes) => W.stats(Object.assign({}, base, { mods: [mod(2, affixes)] }), { damage: 10, fireRate: 5, magSize: 20, reloadTime: 2, spread: 1 });
t('A magazine mod makes the magazine bigger', withMod([{ id: 'extmag', stat: 'mag', v: 0.5 }]).mag > plain.mag);
t('A fire rate mod makes the gun shoot faster', withMod([{ id: 'tuned', stat: 'rate', v: 0.2 }]).rate > plain.rate);
t('A reload mod makes reloading quicker', withMod([{ id: 'loader', stat: 'reload', v: 0.3 }]).reload < plain.reload);
t('A barrel mod tightens the spread', withMod([{ id: 'barrel', stat: 'spread', v: 0.3 }]).spread < plain.spread);
t('A quick aim mod and a steady grip mod show up as aiming numbers', withMod([{ id: 'quickads', stat: 'ads', v: 0.5 }, { id: 'grip', stat: 'adsmove', v: 0.3 }]).ads === 0.5 && withMod([{ id: 'grip', stat: 'adsmove', v: 0.3 }]).adsMove === 0.3);
t('Two mods on one gun add up', (() => { const g = Object.assign({}, base, { mods: [mod(2, [{ id: 'tuned', stat: 'rate', v: 0.1 }]), mod(2, [{ id: 'tuned', stat: 'rate', v: 0.1 }])] }); return Math.abs(W.stats(g, { damage: 10, fireRate: 5, magSize: 20, reloadTime: 2, spread: 1 }).rate / plain.rate - 1.2 / 1) < 1e-9; })());

// ---- in a run
t('A mod dropped by hand lies on the floor and is not picked up by walking over it', (() => { const r = mk({ manualGuns: true }); r.giveMod(1); go(r, 0.5); return r.snapshot().player.mods.length === 0 && r.snapshot().pickups.some((p) => p.kind === 'mod'); })());
t('Pressing pick up puts a mod in the bag', (() => { const r = mk({ manualGuns: true }); r.giveMod(1); go(r, 2); go(r, 0.1, { pickup: true }); const s = r.snapshot(); return s.player.mods.length === 1 && !s.pickups.some((p) => p.kind === 'mod'); })());
t('The bag holds six mods and the seventh stays on the floor', (() => { const r = mk({ manualGuns: true }); for (let i = 0; i < 6; i++) r.addMod(mod(1)); r.giveMod(1); go(r, 2); const o = go(r, 0.1, { pickup: true }); return r.snapshot().player.mods.length === 6 && r.snapshot().pickups.some((p) => p.kind === 'mod') && o.ev.some((e) => e.type === 'bagFull'); })());
t('A mod that fits goes from the bag onto the gun and the gun card shows it', (() => { const r = mk(); r.equipItem(W.make('pistol_service', 2, 1)); r.addMod(mod(2)); const why = r.attachMod(0, 0); const c = r.snapshot().player.gun.card; return why === '' && c.mods.length === 1 && c.slots === 2 && r.snapshot().player.mods.length === 0; })());
t('A legendary mod goes onto a common gun, and a common mod onto a legendary gun', (() => { const r = mk(); r.equipItem(W.make('pistol_service', 0, 1)); r.addMod(mod(4)); const a = r.attachMod(0, 0) === '' && r.snapshot().player.gun.card.mods.length === 1; const q = mk(); q.equipItem(W.make('pistol_service', 4, 1)); q.addMod(mod(0)); return a && q.attachMod(0, 0) === ''; })());
t('A mod can still be refused when the gun has no free place left', (() => { const r = mk(); r.equipItem(W.make('pistol_service', 0, 1)); r.addMod(mod(1)); r.addMod(mod(1)); r.attachMod(0, 0); return r.attachMod(0, 0).length > 0 && r.snapshot().player.mods.length === 1; })());
t('A gun with all its mod places full refuses another', (() => { const r = mk(); r.equipItem(W.make('pistol_service', 1, 1)); r.addMod(mod(1)); r.addMod(mod(1)); r.attachMod(0, 0); return r.attachMod(0, 0).includes('no free'); })());
t('Taking a mod off puts it back in the bag, and a full bag refuses', (() => { const r = mk(); r.equipItem(W.make('pistol_service', 1, 1)); r.addMod(mod(1)); r.attachMod(0, 0); const ok = r.detachMod(0, 0) === '' && r.snapshot().player.mods.length === 1; for (let i = 0; i < 5; i++) r.addMod(mod(1)); r.attachMod(0, 0); r.addMod(mod(1)); return ok && r.detachMod(0, 0).includes('bag full'); })());
t('A magazine mod raises the real magazine in a run and removing it trims the ammo back', (() => { const r = mk(); r.equipItem(W.make('pistol_service', 1, 1)); const m0 = r.snapshot().player.maxAmmo !== undefined ? r.snapshot().player.maxAmmo : r.snapshot().player.gun.card.mag; r.addMod(mod(1, [{ id: 'extmag', stat: 'mag', v: 1 }])); r.attachMod(0, 0); const m1 = r.snapshot().player.gun.card.mag; r.detachMod(0, 0); return m1 > m0 && r.snapshot().player.gun.card.mag === m0 && r.snapshot().player.ammo <= m0; })());
t('A quick aim mod gets the sights up faster', (() => { const run = (withMod) => { const r = mk(); r.equipItem(W.make('pistol_service', 1, 1)); if (withMod) { r.addMod(mod(1, [{ id: 'quickads', stat: 'ads', v: 1 }])); r.attachMod(0, 0); } r.step(1 / 60, { ads: true }); r.step(1 / 60, { ads: true }); return r.snapshot().player.adsT; }; return run(true) > run(false); })());
const quiet = (cfg) => { const r = mk(Object.assign({ magSize: 1000, spread: 0, spreadAds: 0, damage: 1e6, playerHp: 1e7 }, cfg || {})); r.place(r.map.start.x, r.map.start.z, 0); go(r, 1.7); return r; };
const killOne = (r, kind) => { r.spawnAt(kind || 'fiend', r.map.start.x, r.map.start.z - 5); return go(r, 0.4, { fire: true }).ev.filter((e) => e.type === 'kill').length; };
{ const r = quiet({ modDrops: true, manualGuns: true }), r0 = quiet({ modDrops: false, manualGuns: true }); let k = 0, k0 = 0; for (let i = 0; i < 120; i++) { k += killOne(r); k0 += killOne(r0); }
  const n = r.snapshot().pickups.filter((p) => p.kind === 'mod').length;
  t('With mod drops on, killing monsters leaves mods on the floor, and not on every kill', k >= 100 && n >= 1 && n < k * 0.5);
  t('With mod drops off, no mods appear', r0.snapshot().pickups.filter((p) => p.kind === 'mod').length === 0);
  const boss = quiet({ modDrops: true, startWave: 10 }); const kk = killOne(boss, 'demon');
  t('A boss always leaves a mod behind', kk === 1 && boss.snapshot().pickups.some((q) => q.kind === 'mod')); }
t('Mods drop on the same wave bands as guns, so a wave 5 mod is common or uncommon only', many(200, () => W.rarityFor(5, rng)).every((x) => x <= 1) && many(300, () => W.rarityFor(35, rng)).some((x) => x === 4));

// ---- on screen
const GunCard = require('../src/screen/gun_card.js'); global.GunCard = GunCard; const Menu = require('../src/screen/gear_menu.js');
t('The gun card shows how many mod places a gun has and what is fitted', (() => { const r = mk(); r.equipItem(W.make('pistol_service', 2, 1)); r.addMod(mod(2)); r.attachMod(0, 0); return GunCard.html(r.snapshot().player.gun.card, null, true).includes('Mods 1/2'); })());
t('The floor card for a mod says when the gun in your hands has no free place for it', (() => { const r = mk({ manualGuns: true }); r.equipItem(W.make('pistol_service', 0, 1)); r.addMod(mod(1)); r.attachMod(0, 0); r.giveMod(1); const q = r.snapshot().pickups.find((p) => p.kind === 'mod'); return GunCard.html(q.mod, null).includes('no free mod place') && GunCard.nearest(r.snapshot(), 5).id === q.id; })());
t('The Gear menu lists the bag with a fit button for each hand, and a take-off button for fitted mods', (() => { const r = mk(); r.equipItem(W.make('pistol_service', 2, 1)); r.addMod(mod(2)); r.addMod(mod(2)); r.attachMod(0, 0); const h = Menu.html(r.snapshot().player); return h.includes('Mod bag 1/6') && h.includes('data-act="attach:0:0"') && h.includes('data-act="detach:0:0"'); })());
t('The Gear menu greys out a mod when the gun has no free place', Menu.html((() => { const r = mk(); r.equipItem(W.make('pistol_service', 0, 1)); r.addMod(mod(1)); r.attachMod(0, 0); r.addMod(mod(1)); return r.snapshot().player; })()).includes('disabled'));

console.log(bad ? bad + ' FAILED' : 'all mod checks passed'); process.exit(bad ? 1 : 0);
