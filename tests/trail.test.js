// Gold trail checks: the route from you to the Demon Lord that the minimap draws. Plain-sentence names.
const Referee = require('../src/referee.js'), TR = require('../src/referee_trail.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const mk = () => { const r = Referee.create(5); r.setCfg({ locks: false, playerHp: 1e7, regen: 0, startSafe: false, startWave: 10, gunDrops: false, gearDrops: false }); r.reset(); return r; };
function toBoss(r) { for (let i = 0; i < 4000; i++) { r.step(1 / 60, {}); const s = r.snapshot(); if (s.compass) return s; } return null; }

const r = mk(), s = toBoss(r);
t('The trail only exists while the Demon Lord guards the door', !!s && Array.isArray(s.trail) && s.trail.length > 1);
t('No trail on a quiet floor with no boss', (() => { const q = mk(); q.step(1 / 60, {}); return q.snapshot().trail === null; })());
if (s) {
  const T = s.trail, map = r.map, C = map.CELL;
  t('The trail starts at the boss', Math.hypot(T[0][0] - s.compass.x, T[0][1] - s.compass.z) < 1e-6);
  t('The trail ends in the cell you stand in', Math.floor(T[T.length - 1][0] / C) === Math.floor(s.player.x / C) && Math.floor(T[T.length - 1][1] / C) === Math.floor(s.player.z / C));
  t('Every step of the trail is on open floor, never inside a wall', T.every(([x, z]) => { const ch = map.rows[Math.floor(z / C)][Math.floor(x / C)]; return ch === '.' || ch === 'c' || ch === 'd' || ch === 'D'; }));
  t('Every step moves at most one cell, so the line has no jumps', T.slice(1).every((p, i) => { const q = T[i]; return i === 0 || (Math.abs(Math.floor(p[0] / C) - Math.floor(q[0] / C)) <= 1 && Math.abs(Math.floor(p[1] / C) - Math.floor(q[1] / C)) <= 1); }));
}
t('The trail finder returns nothing for a spot inside a wall', TR.walk(new Int16Array(4).fill(-1), 2, 2, 2, () => false, 1, 1).length === 0);
t('The trail finder stops if the field is broken and never loops for ever', (() => { const f = new Int16Array(9).fill(5); return TR.walk(f, 3, 3, 2, () => false, 3, 3).length <= TR.MAX; })());
process.exit(bad ? 1 : 0);
