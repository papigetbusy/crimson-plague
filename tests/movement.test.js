// Movement checks: jump, and slides in any direction. Plain sentences. Run: node tests/movement.test.js
const Referee = require('../src/referee.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
function mk() {
  const ref = Referee.create(5); ref.setCfg({ playerHp: 1e7, regen: 0, magSize: 1000 }); ref.reset();
  const m = ref.map; ref.place(m.start.x, m.start.z, 0);
  for (let i = 0; i < 100; i++) ref.step(1 / 60, {});
  return ref;
}
function run(ref, sec, inp) { const ev = []; let st = null; for (let i = 0; i < Math.round(sec * 60); i++) { const o = ref.step(1 / 60, inp || {}); ev.push(...o.events); st = o.state; } return { ev, st }; }

{ // jump
  const g = mk(); const eye0 = g.snapshot().player.eye;
  const a = run(g, 0.05, { jump: true });
  const peak = (() => { let hi = 0; for (let i = 0; i < 90; i++) hi = Math.max(hi, g.step(1 / 60, {}).state.player.eye); return hi; })();
  t('Jumping lifts your eye above standing height', peak > eye0 + 0.6 && a.ev.some((e) => e.type === 'jump'));
  t('You come back down and land after a jump', (() => { run(g, 1, {}); const s = g.snapshot().player; return Math.abs(s.eye - eye0) < 0.05; })());
  const h = mk(); run(h, 0.05, { jump: true }); const once = run(h, 0.1, { jump: true }).ev.filter((e) => e.type === 'jump').length;
  t('You cannot jump again while you are still in the air', once === 0);
  const f = mk(); run(f, 0.5, { mz: 1 }); const z0 = f.snapshot().player.z; run(f, 0.1, { mz: 1, jump: true }); run(f, 0.3, { mz: 1 });
  t('A jump keeps your speed forward', f.snapshot().player.z < z0 - 1.5);
  const s = mk(); run(s, 0.4, { mx: 1 }); const x0 = s.snapshot().player.x; run(s, 0.1, { mx: 1, jump: true }); run(s, 0.3, { mx: 1 });
  t('A jump works sideways too', s.snapshot().player.x > x0 + 1.5);
}
{ // slide any direction
  const dirs = { forward: { mz: 1 }, back: { mz: -1 }, right: { mx: 1 }, left: { mx: -1 } };
  for (const k in dirs) {
    const g = mk(); run(g, 0.4, dirs[k]); const p0 = g.snapshot().player;
    const r = run(g, 0.2, Object.assign({ slide: true }, dirs[k]));
    t('You can slide ' + k, r.ev.some((e) => e.type === 'slide') && Math.hypot(r.st.player.x - p0.x, r.st.player.z - p0.z) > 1.5);
  }
  const g = mk(); const p0 = g.snapshot().player; const r = run(g, 0.1, { mx: 1, slide: true });
  t('A slide can start from standing still if you hold a direction', r.ev.some((e) => e.type === 'slide') && r.st.player.x > p0.x + 0.3);
  const q = mk(); run(q, 0.05, { jump: true }); const air = run(q, 0.1, { mz: 1, slide: true });
  t('You cannot slide while you are in the air', !air.ev.some((e) => e.type === 'slide'));
}
t('The hall roof is 11.5 high, six higher than before', mk().map.WALL_H === 11.5);
console.log(bad ? bad + ' FAILED' : 'all movement checks passed'); process.exit(bad ? 1 : 0);
