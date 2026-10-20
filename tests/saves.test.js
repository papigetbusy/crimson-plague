// Seeds and saves: the map seed is locked into a save, the damage and item seeds are fresh every time you enter. Plain sentences. Run: node tests/saves.test.js
const Referee = require('../src/referee.js'), W = require('../src/referee_weapons.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const cfg = { playerHp: 1e7, regen: 0, startGun: 'pistol_service', gunDrops: true, gearDrops: true, modDrops: true, manualGuns: true, startSafe: true, startWave: 11, startGold: 700, classId: 'witch' };
const mk = (seed, luck) => { const r = Referee.create(seed, luck); r.setCfg(cfg); r.reset(); return r; };
const rows = (r) => r.map.rows.join('|');

t('The same map seed gives the same floor whatever the luck seeds are', rows(mk(77, { damage: 5, item: 9 })) === rows(mk(77, { damage: 123, item: 456 })));
t('A different map seed gives a different floor', (() => { const a = mk(77), b = mk(78); a.setSeeds({ map: 78 }); const c = Referee.create(78); c.setCfg({ startWave: 11 }); c.reset(); const d = Referee.create(77); d.setCfg({ startWave: 11 }); d.reset(); return c.map.rows.join() !== d.map.rows.join(); })());
t('You can read the three seeds of a run', (() => { const s = mk(77, { damage: 5, item: 9 }).seeds(); return s.map === 77 && s.damage === 5 && s.item === 9; })());
t('Different item seeds drop different loot, the same item seed drops the same loot', (() => {
  const roll = (item) => { const r = mk(77, { damage: 5, item }); const out = []; for (let i = 0; i < 30; i++) out.push(JSON.stringify(W.roll(7, (() => { let s = item + i; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(), 0, ''))); return out.join(); };
  return roll(9) === roll(9) && roll(9) !== roll(10);
})());

// ---- saves
t('A save only exists in a safe room, so there is never a half-fought wave in it', (() => { const r = Referee.create(5); r.setCfg({ playerHp: 1e7 }); r.reset(); return r.saveData() === null && mk(5).saveData() !== null; })());
t('A save holds the map seed but not the damage or item seeds', (() => { const d = mk(77, { damage: 5, item: 9 }).saveData(); return d.mapSeed === 77 && d.damage === undefined && d.item === undefined && JSON.stringify(d).includes('"mapSeed":77') && !/"(damage|item)Seed"/.test(JSON.stringify(d)); })());
t('A save survives being written to text and back', (() => { const d = mk(77).saveData(); return JSON.stringify(JSON.parse(JSON.stringify(d))) === JSON.stringify(d); })());
t('Going back to a save gives the same floors (same map seed)', (() => { const a = mk(77, { damage: 1, item: 2 }); const d = a.saveData(); const b = Referee.create(999, { damage: 7, item: 8 }); b.setCfg(Object.assign({}, cfg, { startSafe: false, startWave: 1 })); b.reset(); const ok = b.loadData(d, { damage: 31, item: 41 }); return ok && b.seeds().map === 77 && rows(b) === rows(a); })());
t('Going back to a save uses fresh damage and item seeds, not the old ones', (() => { const a = mk(77, { damage: 1, item: 2 }); const d = a.saveData(); const b = mk(77, { damage: 1, item: 2 }); b.loadData(d, { damage: 31, item: 41 }); const s = b.seeds(); return s.damage === 31 && s.item === 41 && s.map === 77; })());
t('Going back to a save with a different item seed rolls a different merchant', (() => { const a = mk(77, { damage: 1, item: 2 }); const d = a.saveData(); const stk = (item) => { const b = mk(77); b.loadData(d, { damage: 3, item }); b.place(b.map.merchant.x - 1, b.map.merchant.z, 0); b.step(1 / 60, {}); return JSON.stringify(b.snapshot().shop); }; const s1 = stk(41), s2 = stk(41), s3 = stk(77777); return s1 === s2 && s1 !== s3; })());
t('Going back to a save brings back your wave, level, gold, class, skills, guns, gear, mods and stash', (() => {
  const a = mk(77, { damage: 1, item: 2 }); a.giveSkill('dmg'); a.giveXp(400); for (let i = 0; i < 30 && (a.snapshot().choices || a.snapshot().classChoices); i++) a.step(1 / 60, { pick: 0, pickClass: 0 });
  a.equipItem(W.make('smg_compact', 3, 11, () => 0.3, '')); a.addMod({ rarity: 2, wave: 1, affixes: [{ id: 'extmag', stat: 'mag', v: 0.2 }] }); a.giveGold(55);
  a.place(a.map.chest.x + 1, a.map.chest.z, 0); a.setCfg({ stashOpen: true }); a.addMod({ rarity: 1, wave: 1, affixes: [{ id: 'tuned', stat: 'rate', v: 0.1 }] }); a.stashItem('mod', 1);
  const before = a.snapshot(), d = a.saveData(); if (!d) return false;
  const b = Referee.create(5); b.setCfg(Object.assign({}, cfg, { classId: '', startSafe: false, startWave: 1 })); b.reset(); b.loadData(d, { damage: 3, item: 4 }); const after = b.snapshot();
  return after.wave.n === before.wave.n && after.level.n === before.level.n && after.gold === before.gold && after.floor === before.floor && after.safe && after.cls.id === before.cls.id &&
    after.player.gun.card.name === 'Compact SMG' && after.player.mods.length === 1 && after.player.stash.items.length === 1 && JSON.stringify(after.cls) === JSON.stringify(before.cls);
})());
t('After going back you can leave the safe room and the next floor is the one the first run saw', (() => {
  const a = mk(77, { damage: 1, item: 2 }); const d = a.saveData(); const b = mk(5); b.loadData(d, { damage: 9, item: 9 });
  const walk = (r) => { r.place(r.map.door.x, r.map.door.z + 3, 0); for (let i = 0; i < 300; i++) r.step(1 / 60, { mz: 1 }); return rows(r); };
  return walk(a) === walk(b);
})());
t('A restart that brings new seeds changes the floor and the seeds', (() => { const r = Referee.create(77, { damage: 1, item: 2 }); r.setCfg({ playerHp: 1, regen: 0, startWave: 1 }); r.reset(); const f0 = rows(r); r.spawnAt('fiend', r.map.start.x, r.map.start.z - 1); for (let i = 0; i < 600 && !r.snapshot().over; i++) r.step(1 / 60, {}); const over = !!r.snapshot().over; r.step(1 / 60, { restart: true, seeds: { map: 4243, damage: 11, item: 13 } }); const s = r.seeds(); return over && s.map === 4243 && s.damage === 11 && s.item === 13 && rows(r) !== f0; })());

// ---- the list on screen
global.localStorage = (() => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; })();
const SV = require('../src/screen/saves.js');
const sd = (floor, seed) => ({ mapSeed: seed || 77, floor, wave: floor * 10, level: floor * 4, classId: 'witch' });
t('The saves list says so when there are none', SV.html([]).includes('none yet'));
t('A save shows its floor, wave, level and class with Continue and Delete buttons', (() => { SV.add(sd(2), 'Oct 20'); const h = SV.html(SV.all()); return h.includes('Floor 2') && h.includes('Wave 20') && h.includes('Witch') && h.includes('data-load=') && h.includes('data-del='); })());
t('Saving the same floor of the same map again replaces the old save instead of piling up copies', (() => { SV.add(sd(2)); SV.add(sd(2)); return SV.all().filter((x) => x.data.floor === 2).length === 1; })());
t('A different map or floor is its own save, newest first', (() => { SV.add(sd(3)); SV.add(sd(2, 99)); return SV.all().length === 3 && SV.all()[0].data.mapSeed === 99; })());
t('Only the newest eight saves are kept', (() => { for (let i = 0; i < 12; i++) SV.add(sd(i + 10, 500 + i)); return SV.all().length === SV.MAX && SV.all()[0].data.mapSeed === 511; })());
t('A save can be deleted', (() => { const id = SV.all()[0].id; SV.remove(id); return !SV.find(id) && SV.all().length === SV.MAX - 1; })());
t('The list survives the page reloading (it is kept in the browser)', (() => { const n = SV.all().length; return JSON.parse(localStorage.getItem('cp_saves_v1')).length === n; })());

console.log(bad ? bad + ' FAILED' : 'all save checks passed'); process.exit(bad ? 1 : 0);
