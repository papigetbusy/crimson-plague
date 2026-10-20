// Never stuck: a level-up can always be picked, wherever you stand and whatever else is open, and random play never throws or traps the game. Plain sentences. Run: node tests/stuck.test.js
const Referee = require('../src/referee.js'), W = require('../src/referee_weapons.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const GAME = { startGun: 'pistol_service', gunDrops: true, gearDrops: true, modDrops: true, stashOpen: true, manualGuns: true, playerHp: 1e7, regen: 0, classId: 'gunslinger' };
const mk = (seed, extra) => { const r = Referee.create(seed); r.setCfg(Object.assign({}, GAME, extra || {})); r.reset(); return r; };
const waiting = (r) => { const s = r.snapshot(); return !!(s.choices || s.classChoices); };
// pick until no level-up is waiting; returns how many steps it took (999 = stuck)
const clear = (r) => { for (let i = 0; i < 400; i++) { if (!waiting(r)) return i; r.step(1 / 60, { pick: 0, pickClass: 0 }); } return 999; };

t('A level-up in the middle of a fight can be picked', (() => { const r = mk(5); r.giveXp(500); return waiting(r) && clear(r) < 100; })());
t('A level-up that arrives while you stand at the merchant can be picked, and the shop comes back after', (() => { const r = mk(5, { startSafe: true, startWave: 11, startGold: 500 }); const m = r.map.merchant; r.place(m.x - 1.5, m.z, 0); r.step(1 / 60, {}); const open = !!r.snapshot().shop; r.giveXp(900); const hid = !r.snapshot().shop; const n = clear(r); return open && hid && n < 100 && !!r.snapshot().shop; })());
t('A level-up that arrives while you stand at the stash chest can be picked', (() => { const r = mk(5, { startSafe: true, startWave: 11 }); r.place(r.map.chest.x + 1, r.map.chest.z, 0); r.step(1 / 60, {}); r.giveXp(900); return waiting(r) && clear(r) < 100; })());
t('A level-up right after going back to a save can be picked', (() => { const a = mk(5, { startSafe: true, startWave: 11 }); const d = a.saveData(); const b = mk(9); b.loadData(d, { damage: 3, item: 5 }); b.giveXp(900); return waiting(b) && clear(b) < 100; })());
t('A level-up that arrives while a shop pick is being made does not buy something by accident', (() => { const r = mk(5, { startSafe: true, startWave: 11, startGold: 5000 }); const m = r.map.merchant; r.place(m.x - 1.5, m.z, 0); r.step(1 / 60, {}); r.giveXp(900); const g0 = r.snapshot().gold; clear(r); return r.snapshot().gold === g0; })());
t('Walking out of the safe room never leaves a level-up stuck', (() => { const r = mk(5, { startSafe: true, startWave: 11 }); r.giveXp(900); clear(r); r.place(r.map.door.x, r.map.door.z + 3, 0); for (let i = 0; i < 300; i++) r.step(1 / 60, { mz: 1 }); r.giveXp(900); return clear(r) < 100; })());

// random play: every kind of input at random, level-ups and shop picks included; nothing may throw and no level-up may stay stuck
let seed = 7; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const randomInput = (r) => { const s = r.snapshot(); const inp = { mx: rng() * 2 - 1, mz: rng() * 2 - 1, yawD: (rng() - 0.5) * 0.1, fire: rng() < 0.6, ads: rng() < 0.2, sprint: rng() < 0.2, slide: rng() < 0.02, reload: rng() < 0.03, swap: rng() < 0.02, pickup: rng() < 0.05 };
  if (s.choices || s.classChoices || s.shop) { if (rng() < 0.4) inp.pick = Math.floor(rng() * 3); if (rng() < 0.4) inp.pickClass = Math.floor(rng() * 3); if (s.shop && rng() < 0.05) inp.shopClose = true; }
  return inp; };
let threw = '', stuckAt = '';
for (let run = 0; run < 6 && !threw; run++) {
  try {
    const r = mk(100 + run, run % 2 ? { startSafe: true, startWave: 11, startGold: 800 } : {}); let stuck = 0;
    for (let i = 0; i < 60 * 90; i++) {
      const s = r.snapshot(); if (s.over) { r.step(1 / 60, { restart: true }); continue; }
      r.step(1 / 60, randomInput(r));
      if (i % 600 === 0) { const d = r.saveData(); if (d) r.loadData(JSON.parse(JSON.stringify(d)), { damage: 3 + i, item: 5 + i }); }
      if (i % 400 === 0) { r.place(r.map.chest ? r.map.chest.x + 1 : r.map.start.x, r.map.chest ? r.map.chest.z : r.map.start.z, 0); r.stashItem('mod', 0); }
      if (waiting(r)) { stuck++; if (stuck > 600) { stuckAt = 'run ' + run + ' step ' + i; break; } } else stuck = 0;
    }
  } catch (e) { threw = e.stack.split('\n').slice(0, 3).join(' | '); }
}
t('Ninety seconds of random play over six runs never throws', !threw); if (threw) console.log(threw);
t('Random play never leaves a level-up stuck for ten seconds', !stuckAt); if (stuckAt) console.log(stuckAt);

console.log(bad ? bad + ' FAILED' : 'all stuck checks passed'); process.exit(bad ? 1 : 0);
