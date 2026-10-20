// Traps: where they are, when they hurt, and who they hurt. Plain sentences. Run: node tests/traps.test.js
const Referee = require('../src/referee.js'), D = require('../src/referee_data.js'), FG = require('../src/floorgen.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const L = D.LOOP;
const rngOf = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const kinds = (tier, seed) => new Set(FG.generate(2, rngOf(seed || 7), tier).traps.map((x) => x.kind));
const count = (tier) => { let n = 0; for (let s = 1; s <= 8; s++) n += FG.generate(2, rngOf(s), tier).traps.length; return n; };

t('The first floors only have always-up spikes', [...kinds(1)].every((k) => k === 'spike') && [...kinds(2)].every((k) => k === 'spike'));
t('Flame vents arrive by the third tier', kinds(3, 11).has('vent') || kinds(3, 5).has('vent') || kinds(4, 9).has('vent'));
t('Rising and sinking spikes arrive by the fifth tier', [3, 5, 7, 9, 11, 13].some((s) => kinds(5, s).has('pulse')));
t('Deeper tiers put more traps in the halls', count(5) > count(1));
{
  const a = FG.generate(2, rngOf(7), 1), b = FG.generate(2, rngOf(7), 6);
  t('Traps never change the shape of the hall itself', a.rows.join() === b.rows.join());
  const f = FG.generate(3, rngOf(3), 5), room = (x, z) => f.rooms.find((r) => x >= r.x && z >= r.z && x < r.x + r.w && z < r.z + r.h);
  t('No trap lies in your spawn room or the door room', f.traps.every((tr) => { const r = room(tr.x, tr.z); return r && r.kind === 'room'; }));
  t('Every trap sits on plain floor, not carpet, pillars or walls', f.traps.every((tr) => { for (let dz = 0; dz < tr.h; dz++) for (let dx = 0; dx < tr.w; dx++) if (f.rows[tr.z + dz][tr.x + dx] !== '.') return false; return true; }));
}
const mk = (tier) => { const ref = Referee.create(5); ref.setCfg({ startWave: 1, playerHp: 1000, regen: 0, trapTier: tier }); ref.reset(); const m = ref.map; ref.place(m.start.x, m.start.z, 0); for (let i = 0; i < 100; i++) ref.step(1 / 60, {}); return { ref, m }; };
const run = (ref, n) => { let st; for (let i = 0; i < n; i++) st = ref.step(1 / 60, {}).state; return st; };
const spikeOf = (m) => m.traps.find((x) => x.kind === 'spike');
{ // spikes hurt you
  let g = null; for (const tier of [1, 2]) { const x = mk(tier); if (spikeOf(x.m)) { g = x; break; } }
  const tr = spikeOf(g.m), cx = (tr.x + tr.w / 2) * 2, cz = (tr.z + tr.h / 2) * 2;
  g.ref.setCfg({}); const hp0 = g.ref.snapshot().player.hp;
  g.ref.place(cx, cz, 0); const st = run(g.ref, 3);
  t('Standing on spikes hurts you for a slice of your health', st.player.hp < hp0 && hp0 - st.player.hp >= 1000 * L.trapPct * 0.9);
  const st2 = run(g.ref, 60 * 3);
  t('Spikes keep hurting every so often while you stay on them', st2.player.hp < hp0 - 1000 * L.trapPct * 1.5);
  g.ref.place(g.m.start.x, g.m.start.z, 0); const hpOff = run(g.ref, 5).player.hp; const st3 = run(g.ref, 120);
  t('Stepping off the spikes stops the damage', st3.player.hp >= hpOff);
  // monsters
  const w = mk(1), tw = spikeOf(w.m), wx = (tw.x + tw.w / 2) * 2, wz = (tw.z + tw.h / 2) * 2;
  w.ref.spawnAt('fiend', wx, wz); const hpM = w.ref.snapshot().monsters[0].hp; w.ref.place(w.m.start.x, w.m.start.z, 0);
  const sw = run(w.ref, 2); const mm = sw.monsters.find((q) => q.kind === 'fiend');
  t('Spikes hurt monsters standing on them too', !mm || mm.hp < hpM);
  const e = mk(1); const te = spikeOf(e.m); e.ref.spawnAt('eyeball', (te.x + 1) * 2, (te.z + 1) * 2); const eh = e.ref.snapshot().monsters[0].hp; e.ref.place(e.m.start.x, e.m.start.z, 0);
  const se = run(e.ref, 2); t('Floating monsters pass over spikes unharmed', se.monsters.find((q) => q.kind === 'eyeball').hp >= eh - 0.001);
}
{ // vents and pulses follow a beat
  let found = null; for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) { const ref = Referee.create(seed); ref.setCfg({ startWave: 1, trapTier: 6, playerHp: 1e6, regen: 0 }); ref.reset(); if (ref.map.traps.some((x) => x.kind === 'vent')) { found = ref; break; } }
  const seen = new Set(); for (let i = 0; i < 60 * 8; i++) { const st = found.step(1 / 60, {}).state; const k = found.map.traps.findIndex((x) => x.kind === 'vent'); seen.add(st.traps[k]); }
  t('A flame vent goes quiet, then glows a warning, then fires, on a steady beat', seen.has(0) && seen.has(1) && seen.has(2));
}
{ // deeper tiers hurt more, up to a cap
  const dmgAt = (tier) => { const x = mk(tier); const tr = x.m.traps.find((q) => q.kind === 'spike'); if (!tr) return null; x.ref.place((tr.x + tr.w / 2) * 2, (tr.z + tr.h / 2) * 2, 0); const hp = x.ref.snapshot().player.hp; return hp - run(x.ref, 3).player.hp; };
  const a = dmgAt(1), b = dmgAt(6);
  t('A trap on a deeper floor hits harder than the same trap early on', a === null || b === null || b > a);
  const c = dmgAt(40); t('But a trap never takes more than the cap of your health', c === null || c <= 1000 * L.trapMax + 1);
}
console.log(bad ? bad + ' FAILED' : 'all trap checks ok'); process.exit(bad ? 1 : 0);
