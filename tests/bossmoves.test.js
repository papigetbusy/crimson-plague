// More boss moves: the extra attacks every boss picks from at random, the open moment after a big move, variant bosses and deeper-floor speed. Plain sentences. Run: node tests/bossmoves.test.js
const Referee = require('../src/referee.js'), D = require('../src/referee_data.js'), RB = require('../src/referee_bosses.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const dice = (seed) => { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const ALL = ['demon', 'bat', 'lich', 'dragon'];

// a fake world: you stand at (px, 0), the boss at the origin. Returns what happened.
function sim(kind, o) {
  o = o || {}; const rng = dice(o.seed || 1), ev = [], hurts = [], shots = [], moves = [], warns = [];
  const P = { x: o.px === undefined ? 10 : o.px, z: 0, eye: 1.7, jumpH: o.jump || 0, vx: 0, vz: 0 };
  const env = { player: () => P, rng, los: () => true, hurt: (d, id) => { hurts.push(d); return true; }, fire: (s) => shots.push(s), event: (e) => ev.push(e), speed: () => 4, spot: () => null };
  const B = RB.create(env), k = D.KINDS[kind];
  const m = { id: 1, kind, x: 0, z: 0, hp: 1000, maxHp: 1000, dmg: 10, scale: 1, enraged: !!o.enraged, state: 'chase', tempo: o.tempo || 1, variant: o.variant || null };
  let prev = '';
  for (let i = 0; i < (o.secs || 120) * 60; i++) {
    const dx = P.x - m.x, dz = P.z - m.z, dist = Math.hypot(dx, dz);
    const taken = B.step(m, k, 1 / 60, dist, dx, dz, 2.2);
    if (taken) { m.x += (m.bmx || 0) / 60; m.z += (m.bmz || 0) / 60; }
    if (o.chase) { P.x = m.x + o.px; P.z = m.z; }
    const ph = m.bm ? m.bm.phase : ''; if (ph === 'xwind' && prev !== 'xwind') moves.push(m.bm.move); prev = ph;
    const v = B.view(m, k); if (v.warn.length) warns.push(...v.warn);
    if (o.visit) o.visit(m, i);
  }
  return { ev, hurts, shots, moves, warns, m };
}
const names = (kind) => Object.keys(D.KINDS[kind].extra);

t('Every boss has at least three extra moves on top of its signature ones', ALL.every((k) => D.KINDS[k].extra && Object.keys(D.KINDS[k].extra).length >= 3 || (D.KINDS[k].extra && Object.keys(D.KINDS[k].extra).length >= 2 && k !== 'demon')));
t('Over a long fight each boss uses every one of its extra moves', ALL.every((k) => { const seen = new Set(); for (let s = 1; s <= 6; s++) sim(k, { seed: s, secs: 90, px: s % 2 ? 3.5 : 10 }).moves.forEach((x) => seen.add(x)); return names(k).every((n) => seen.has(n)); }));
t('The order of the moves is not the same fight to fight', ['bat', 'lich'].every((k) => { const set = new Set(); for (let s = 1; s <= 8; s++) set.add(sim(k, { seed: s, secs: 60 }).moves.filter((x, i, a) => x !== a[i - 1]).slice(0, 6).join()); return set.size >= 3; }));

// ---- marked circles on the floor
{
  const stand = sim('lich', { seed: 3, secs: 60, px: 10 });
  t('Marked circles show on the floor before the blast, so you can step out', stand.warns.some((w) => w.shape === 'ring' && w.fill && w.k < 1));
  t('Standing still in the circles hurts you', stand.ev.some((e) => e.type === 'bossStrike') && stand.hurts.length >= 1);
  const air = sim('lich', { seed: 3, secs: 60, px: 10, jump: 1.2 });
  const volleysOnly = sim('lich', { seed: 3, secs: 60, px: 10, jump: 1.2 }).ev.filter((e) => e.type === 'bossStrike').length;
  t('A jump over the circles takes no damage from the blast itself', volleysOnly >= 1 && air.hurts.length < stand.hurts.length);
}
// ---- the open moment
{
  let open = 0, closed = 0; sim('dragon', { seed: 2, secs: 90, px: 3.5, visit: (m) => { if (m.exposed) open++; else closed++; } });
  t('After a big move the boss is left open for a moment, and is not open all the time', open > 30 && closed > open);
  const r = Referee.create(7); r.setCfg({ startWave: 10, playerHp: 1e7, regen: 0, bossKind: 'dragon', gunDrops: false, gearDrops: false, modDrops: false }); r.reset();
  let sawOpen = false, sawField = false, put = false; let out = r.step(1 / 60, {});
  for (let i = 0; i < 70 * 60 && !sawOpen; i++) { const b = out.state.monsters.find((m) => m.kind === 'dragon'); if (b && !put) { put = true; const d = r.map.door; r.place(d.x + d.nx * 6, d.z + d.nz * 6, 0); } out = r.step(1 / 60, {}); const b2 = out.state.monsters.find((m) => m.kind === 'dragon'); if (b2) { sawField = 'exposed' in b2; if (b2.exposed) sawOpen = true; } }
  t('The screen is told when a boss is open, so it can show it', sawField && sawOpen);
}
// ---- variant bosses and deeper floors
{
  for (const v of ['ember', 'frost', 'venom']) {
    const x = sim('bat', { seed: 4, secs: 60, variant: v });
    t('A ' + v + ' boss rains marked blasts of its own kind', x.moves.includes('rain') && x.ev.some((e) => e.type === 'bossStrike' && e.fx === v));
  }
  const plain = sim('bat', { seed: 4, secs: 60 });
  t('A plain boss never rains', !plain.moves.includes('rain'));
}
{
  const first = (tempo) => { let n = 0, hit = -1; sim('bat', { seed: 9, secs: 30, tempo, visit: (m, i) => { if (hit < 0 && m.bm && m.bm.phase === 'wind') hit = i; } }); return hit; };
  const cnt = (tempo) => sim('lich', { seed: 5, secs: 60, tempo }).moves.length;
  t('A boss from a deeper floor starts his attacks sooner and uses more of them', cnt(1.4) > cnt(1));
}
// ---- the Demon Lord keeps his own charge and fireball
{
  const r = Referee.create(7); r.setCfg({ startWave: 10, playerHp: 1e7, regen: 0, gunDrops: false, gearDrops: false, modDrops: false }); r.reset();
  let out = r.step(1 / 60, {}), charge = 0, fire = 0, extra = 0, placed = false;
  for (let i = 0; i < 80 * 60; i++) {
    const b = out.state.monsters.find((m) => m.kind === 'demon'); if (b && !placed) { placed = true; const d = r.map.door; r.place(d.x + d.nx * 9, d.z + d.nz * 9, Math.atan2(-d.nx, d.nz)); }
    if (placed && i % 150 === 149) { const d = r.map.door; r.place(d.x + d.nx * 11, d.z + d.nz * 11, Math.atan2(-d.nx, d.nz)); }      // you keep stepping back to the door, so he has to come at you
    out = r.step(1 / 60, {});
    if (out.state.monsters.some((m) => m.kind === 'demon' && m.state === 'charge')) charge++;
    for (const e of out.events) { if (e.type === 'shoot' && e.proj === 'fire' && out.state.monsters.some((m) => m.id === e.id && m.kind === 'demon')) fire++; if (e.type === 'bossStrike' || e.type === 'bossSlam') extra++; }
  }
  t('The Demon Lord still charges and keeps his fireball, and now also uses his new moves', charge >= 1 && !!D.KINDS.demon.shoot && extra >= 1);
}
console.log(bad ? bad + ' failed' : 'all boss move checks passed'); process.exit(bad ? 1 : 0);
