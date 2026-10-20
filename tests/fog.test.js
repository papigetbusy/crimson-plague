// Fog wave checks: which waves roll in fog, how it thickens and lifts. Plain sentences. Run: node tests/fog.test.js
const Referee = require('../src/referee.js'), D = require('../src/referee_data.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const L = D.LOOP;
const foggy = []; for (let w = 1; w <= 100; w++) if (D.fogWave(w, 7)) foggy.push(w);
t('Fog never rolls in before the fog waves begin', foggy.every((w) => w >= L.fogFrom));
t('Fog never rolls in on a boss wave', foggy.every((w) => w % L.bossEvery !== 0));
t('Some waves are foggy but most are not', foggy.length > 5 && foggy.length < 50);
t('The same seed always gives the same foggy waves', foggy.join() === (() => { const o = []; for (let w = 1; w <= 100; w++) if (D.fogWave(w, 7)) o.push(w); return o.join(); })());
{ // thickening and lifting: use a seed and wave that is foggy
  const w = foggy[0], ref = Referee.create(7);
  ref.setCfg({ startWave: w, playerHp: 1e7, regen: 0 }); ref.reset();
  let announced = false, st = ref.snapshot();
  for (let i = 0; i < 60 * 8; i++) { const r = ref.step(1 / 60, {}); st = r.state; if (r.events.some((e) => e.type === 'waveStart' && e.fog)) announced = true; }
  t('A foggy wave announces itself', announced);
  t('The fog thickens during a foggy wave', st.fog.k > 0.9 && st.fog.mul < 0.4);
  ref.clearWave(); for (let i = 0; i < 60 * 5; i++) st = ref.step(1 / 60, {}).state;
  t('The fog lifts again once the wave is cleared', st.fog.k < 0.05 && st.fog.mul > 0.95);
}
console.log(bad ? bad + ' FAILED' : 'all fog checks ok'); process.exit(bad ? 1 : 0);
