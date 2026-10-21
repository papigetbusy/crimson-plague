// Past-the-cap checks: tougher monsters forever and elites with abilities. Plain sentences. Run: node tests/elites.test.js
const Referee = require('../src/referee.js'), D = require('../src/referee_data.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const at = (wave, seed) => { const ref = Referee.create(seed || 5); ref.setCfg({ startWave: wave, playerHp: 1e7, regen: 0 }); ref.reset(); const m = ref.map; ref.place(m.start.x, m.start.z, 0); for (let i = 0; i < 100; i++) ref.step(1 / 60, {}); return { ref, m }; };
const hp0 = (ref, kind) => { const { m } = { m: ref.map }; ref.spawnAt(kind, m.start.x + 12, m.start.z); const s = ref.snapshot(); return s.monsters[s.monsters.length - 1].maxHp; };
const cap = D.LOOP.aliveCap;   // with the default 6 alive in wave 1, the screen is full from wave cap-5

{ // before the cap nothing changes
  const a = at(1), b = at(cap - 6 + 1);
  t('Before the screen is full there are no elites', (() => { let n = 0; for (let i = 0; i < 30; i++) { a.ref.spawnAt('fiend', a.m.start.x + 12, a.m.start.z); } for (const m of a.ref.snapshot().monsters) n += m.elite.length; return n === 0; })());
}
{ // past the cap
  const base = at(cap - 5), far = at(cap - 5 + 10);
  t('Past the cap every monster has more health than the same monster a wave earlier', hp0(far.ref, 'fiend') > hp0(base.ref, 'fiend') * 1.5);
  t('The extra health keeps growing the further past the cap you get', hp0(at(cap + 30).ref, 'fiend') > hp0(far.ref, 'fiend'));
  let elites = 0, total = 0; const e = at(cap - 5 + 10, 9);
  for (let i = 0; i < 60; i++) { e.ref.spawnAt('goblin', e.m.start.x + 12, e.m.start.z); }
  // spawnAt rolls elites the same way waves do
  for (const m of e.ref.snapshot().monsters) { total++; if (m.elite.length) elites++; }
  t('Some of the monsters past the cap are elites, but not all of them', elites > 0 && elites < total);
  const f = at(cap - 5 + 10, 3); f.ref.spawnElite('fiend', f.m.start.x + 12, f.m.start.z); const el = f.ref.snapshot().monsters.filter((q) => !q.elite.includes("keeper"))[0];
  t('An elite is bigger and much tougher than a normal one', el.elite.length >= 1 && el.maxHp > Math.min(...[1,2,3,4,5,6,7,8].map(() => hp0(f.ref, 'fiend'))) * 1.4 && el.scale > 0);
  const lots = at(cap + 40, 4); lots.ref.spawnElite('fiend', lots.m.start.x + 12, lots.m.start.z);
  t('Far past the cap an elite carries several abilities at once', lots.ref.snapshot().monsters.filter((q) => !q.elite.includes("keeper"))[0].elite.length >= 4);
  const early = at(1, 4); early.ref.spawnElite('fiend', early.m.start.x + 12, early.m.start.z);
  t('A new elite on an early wave carries just one ability', early.ref.snapshot().monsters.filter((q) => !q.elite.includes("keeper"))[0].elite.length === 1);
}
{ // volatile blast: kill a volatile elite next to you and it hurts
  let hurt = false, blast = false;
  for (let seed = 1; seed <= 40 && !blast; seed++) {
    const v = at(cap + 40, seed); v.ref.setCfg({ damage: 1e6, playerHp: 1000 }); v.ref.place(v.m.start.x, v.m.start.z, 0); for (let i = 0; i < 100; i++) v.ref.step(1 / 60, {});
    v.ref.spawnElite('goblin', v.m.start.x, v.m.start.z - 1.6);
    const mon = v.ref.snapshot().monsters.find((m) => m.elite.includes('volatile')); if (!mon) continue;
    for (let i = 0; i < 90; i++) { const o = v.ref.step(1 / 60, { fire: true }); if (o.events.some((e) => e.type === 'eliteBlast')) blast = true; if (o.events.some((e) => e.type === 'eliteBlast') && o.events.some((e) => e.type === 'playerHit')) hurt = true; }
  }
  t('A volatile elite explodes when it dies', blast);
  t('The blast hurts you if you are standing next to it', hurt);
}
process.exit(bad ? 1 : 0);
