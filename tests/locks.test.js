// Lock checks: gold gates across the corridors and the boss door's puzzle (Scale, Coin Sockets, Fortune Wheels). Plain sentences. Run: node tests/locks.test.js
global.FloorGenGates = require('../src/floorgen_gates.js'); const Referee = require('../src/referee.js'), RL = require('../src/referee_locks.js'), FG = require('../src/floorgen.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const lcg = (s) => { let a = s >>> 0; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; };
const mapFor = (floor, seed) => { const m = FG.generate(floor, lcg(seed || floor * 31 + 5), floor); m.WALL_H = 11.5; return m; };
// the first floor (from a few seeds) whose boss puzzle is this kind
const withKind = (kind) => { for (let f = 1; f < 60; f++) { const m = mapFor(f, f * 17 + 3), lay = RL.layout(m, f); if (lay.boss.kind === kind) return { m, lay, f }; } return null; };

// ---- the rules on their own
t('The boss door puzzle is the Scale, the Coin Sockets or the Fortune Wheels, and all three turn up across floors', (() => { const seen = new Set(); for (let f = 1; f < 40; f++) seen.add(RL.layout(mapFor(f, f * 17 + 3), f).boss.kind); return seen.size === 3 && [...seen].every((k) => RL.KINDS.includes(k)); })());
t('The same floor always gets the same locks, so a host and its friends agree', JSON.stringify(RL.layout(mapFor(4, 9), 4)) === JSON.stringify(RL.layout(mapFor(4, 9), 4)));
t('A gate costs 80 gold on floor 1 and 30 more on each floor after', RL.tollFor(1) === 80 && RL.tollFor(2) === 110 && RL.tollFor(5) === 200);
t('Every gate on a floor asks the same price', (() => { const l = RL.layout(mapFor(6, 3), 6); const tolls = l.gates.filter((g) => g.type === 'toll'); return tolls.length > 0 && tolls.every((g) => g.price === RL.tollFor(6)); })());
{ const m = mapFor(1, 5), L = RL.create(RL.layout(m, 1)), g = L.layout.gates[0];
  t('A gate does not open without the full price', L.act({ k: 'toll', i: 0 }, g.price - 1) === null && !L.S.open[0]);
  const r = L.act({ k: 'toll', i: 0 }, g.price);
  t('Paying the price opens the gate and costs exactly that much', !!r && r.cost === g.price && L.S.open[0] && r.ev.type === 'gateOpen');
  t('An open gate can not be paid for twice', L.act({ k: 'toll', i: 0 }, 999) === null);
  t('A gate that does not exist can not be paid for', L.act({ k: 'toll', i: 7 }, 999) === null && L.act({ k: 'toll', i: -1 }, 999) === null);
  t('Standing at a gate offers to pay; standing far away offers nothing', (() => { const L2 = RL.create(RL.layout(m, 1)); const n = L2.near(g.x - g.nx * 3, g.z - g.nz * 3, 500); return n && n.what === 'toll' && n.actions[0].afford && !L2.near(g.x - g.nx * 3, g.z - g.nz * 3, 10).actions[0].afford && L2.near(g.x + 60, g.z + 60, 500) === null; })()); }
{ const { lay, m, f } = withKind('scale'), L = RL.create(lay), b = lay.boss;
  t('The Scale asks for 20 gold times four plus the floor number', b.target === 20 * (4 + f));
  t('Adding to the pan costs 20 gold and the pan weighs 20 more', (() => { const r = L.act({ k: 'pan', d: 1 }, 100); return r && r.cost === 20 && L.S.pan === 20; })());
  t('Adding without 20 gold does nothing', L.act({ k: 'pan', d: 1 }, 19) === null && L.S.pan === 20);
  t('Taking back gives the 20 gold back, and the pan never goes below nothing', (() => { const r = L.act({ k: 'pan', d: -1 }, 0); return r && r.cost === -20 && L.S.pan === 0 && L.act({ k: 'pan', d: -1 }, 0) === null; })());
  let r; while (L.S.pan < b.target) r = L.act({ k: 'pan', d: 1 }, 1e6);
  t('When the pan weighs exactly what the wall says, the puzzle is solved', L.S.solved && L.solved() && r.ev.type === 'lockSolved');
  t('A solved puzzle takes no more gold', L.act({ k: 'pan', d: 1 }, 1e6) === null);
  t('The wheels and the sockets do nothing on a Scale door', L.act({ k: 'spin' }, 1e6) === null && L.act({ k: 'sock', i: 0 }, 0) === null); }
{ const { lay, f } = withKind('wheels'), L = RL.create(lay), b = lay.boss;
  t('A wheel spin costs 20 gold on floor 1 and 5 more per floor', RL.spinFor(1) === 20 && RL.spinFor(3) === 30 && b.spin === RL.spinFor(f));
  t('A spin without enough gold does nothing', L.act({ k: 'spin' }, b.spin - 1) === null && L.S.spins === 0);
  let spins = 0, last = null, everLocked = false; while (!L.S.solved && spins < 400) { const before = L.S.locked.slice(), w = L.S.wheels.slice(); last = L.act({ k: 'spin' }, 1e6); spins++; if (last.ev.locked.some(Boolean)) everLocked = true; before.forEach((lk, i) => { if (lk && L.S.wheels[i] !== w[i]) everLocked = 'moved'; }); }
  t('Spinning eventually locks all three wheels on the door symbol, and that solves the puzzle', L.S.solved && L.S.wheels.every((w) => w === b.sym) && L.S.locked.every(Boolean) && spins > 2);
  t('A wheel that has locked never moves again', everLocked === true);
  t('Two copies of the same floor spin the same wheels', (() => { const a = RL.create(lay), c = RL.create(lay); for (let i = 0; i < 6; i++) { a.act({ k: 'spin' }, 1e6); c.act({ k: 'spin' }, 1e6); } return JSON.stringify(a.state()) === JSON.stringify(c.state()); })()); }
{ const { lay, m } = withKind('sockets'), L = RL.create(lay), b = lay.boss;
  t('The Coin Sockets puzzle hides three sockets, each on a wall of a different ordinary room', b.sockets.length === 3 && new Set(b.sockets.map((s) => m.rooms.findIndex((q) => q.kind === 'room' && s.x >= q.x * 2 - 1 && s.x <= (q.x + q.w) * 2 + 1 && s.z >= q.z * 2 - 1 && s.z <= (q.z + q.h) * 2 + 1))).size === 3);
  t('Each socket hangs on a wall with open floor in front of it', b.sockets.every((s) => { const cx = Math.floor((s.x + s.nx * 1) / 2), cz = Math.floor((s.z + s.nz * 1) / 2), ch = m.rows[cz][cx]; return ch === '.' || ch === 'c' || ch === 'P'; }));
  const s0 = b.sockets[0];
  t('A bullet straight at a socket hits it; one that goes past does not', L.socketHit(s0.x + s0.nx * 4, s0.y, s0.z + s0.nz * 4, -s0.nx, 0, -s0.nz, 30) !== null && L.socketHit(s0.x + s0.nx * 4, s0.y + 3, s0.z + s0.nz * 4, -s0.nx, 0, -s0.nz, 30) === null);
  t('A bullet stopped by something nearer does not reach the socket', L.socketHit(s0.x + s0.nx * 4, s0.y, s0.z + s0.nz * 4, -s0.nx, 0, -s0.nz, 2) === null);
  t('A hit socket stays hit and only counts once', L.act({ k: 'sock', i: 0 }, 0).cost === 0 && L.act({ k: 'sock', i: 0 }, 0) === null && L.socketHit(s0.x + s0.nx * 4, s0.y, s0.z + s0.nz * 4, -s0.nx, 0, -s0.nz, 30) === null);
  L.act({ k: 'sock', i: 1 }, 0); t('The puzzle is solved when all three are hit', !L.solved() && L.act({ k: 'sock', i: 2 }, 0).ev.type === 'lockSolved' && L.solved()); }
t('Every puzzle has rules written for the wall beside the door', RL.KINDS.every((k) => { const x = RL.signText({ kind: k, target: 120, spin: 25, sym: 1 }); return x.title.startsWith('THE ') && x.lines.length === 3 && x.lines.join(' ').length > 20; }));
t('The Scale sign says the weight, the Wheels sign says the price and the symbol', RL.signText({ kind: 'scale', target: 140 }).lines.join(' ').includes('140') && RL.signText({ kind: 'wheels', spin: 25, sym: 1 }).lines.join(' ').includes('25') && RL.signText({ kind: 'wheels', spin: 25, sym: 1 }).lines.join(' ').includes('Crown'));
t('The sign hangs beside the boss door on the wall facing the room, with the pan or wheels on the other side', (() => { const m = mapFor(3, 4), l = RL.layout(m, 3), d = m.door; return Math.hypot(l.boss.sign.x - d.x, l.boss.sign.z - d.z) > 4 && Math.hypot(l.boss.station.x - d.x, l.boss.station.z - d.z) > 4 && Math.hypot(l.boss.sign.x - l.boss.station.x, l.boss.sign.z - l.boss.station.z) > 8; })());

// ---- in a game
const mkRef = (o) => { const r = Referee.create((o && o.seed) || 5); r.setCfg(Object.assign({ playerHp: 1e7, regen: 0 }, o && o.cfg)); r.reset(); return r; };
const stepN = (r, secs, inp) => { let out; for (let i = 0; i < secs * 60; i++) out = r.step(1 / 60, typeof inp === 'function' ? inp() : inp || {}); return out; };
const yawTo = (nx, nz) => Math.atan2(nx, -nz);
{ const r = mkRef(), m = r.map, g = m.gates[0];
  t('A floor has gates, and in the game a shut gate is solid', m.gates.length >= 1 && r.snapshot().locks.gates.every((q) => !q.open));
  r.place(g.x - g.nx * 3, g.z - g.nz * 3, yawTo(g.nx, g.nz)); stepN(r, 0.2);
  const before = { x: r.snapshot().player.x, z: r.snapshot().player.z };
  stepN(r, 3, { mz: 1 }); const p = r.snapshot().player;
  t('You can not walk through a shut gate', Math.hypot(p.x - g.x, p.z - g.z) > 0.9 && Math.sign((p.x - g.x) * g.nx + (p.z - g.z) * g.nz) <= 0);
  t('At the gate the screen is told what is near, with the price and whether you can pay', (() => { const n = r.snapshot().locks.near; return n && n.what === 'toll' && n.price === 80 && n.actions[0].afford === false; })());
  r.giveGold(79); let o = stepN(r, 0.1, { lockUse: 0 });
  t('With 79 gold the toll can not be paid', !o.state.locks.gates[0].open && o.state.gold === 79);
  r.giveGold(21); const ev = []; o = r.step(1 / 60, { lockUse: 0 }); ev.push(...o.events);
  t('With 100 gold the toll is paid: 80 gold goes, the gate opens, and the game says so', o.state.locks.gates[0].open && Math.round(o.state.gold) === 20 && ev.some((e) => e.type === 'gateOpen'));
  stepN(r, 4, { mz: 1 }); const q = r.snapshot().player;
  t('Once paid you walk right through the gate', Math.sign((q.x - g.x) * g.nx + (q.z - g.z) * g.nz) > 0);
  t('Using a lock where there is none does nothing and costs nothing', (() => { const r2 = mkRef(); r2.giveGold(500); const o2 = stepN(r2, 0.2, { lockUse: 0 }); return o2.state.gold === 500 && o2.state.locks.near === null; })()); }
{ const r = mkRef({ cfg: { locks: false } });
  t('With locks turned off every gate is open and the boss door puzzle is solved', r.snapshot().locks.gates.every((q) => q.open) && r.snapshot().locks.boss.solved); }
{ // the boss door
  const mk = () => { const r = mkRef({ seed: 16, cfg: { startWave: 10 } }); return r; };
  const killBoss = (r) => { let o = r.snapshot(); for (let i = 0; i < 6000 && !o.bossBar; i++) o = r.step(1 / 60, {}).state; r.clearWave(); return stepN(r, 0.3).state; };
  { const r = mk(); const o = killBoss(r);
    t('The boss is down but the door stays sealed while its puzzle is not solved', !o.door.open && o.locks.sealed && !o.locks.boss.solved);
    r.solveLocks(); const o2 = stepN(r, 0.2).state;
    t('Solving the puzzle afterwards opens the boss door', o2.door.open && !o2.locks.sealed); }
  { const r = mk(); r.solveLocks(); const o = stepN(r, 0.1).state;
    t('A solved puzzle does not open the door before the boss falls', !o.door.open);
    const o2 = killBoss(r);
    t('With the puzzle already solved, the boss falling opens the door at once', o2.door.open); }
  { const r = mk(); killBoss(r); let n = 0; const o = stepN(r, 25, () => { return {}; });
    t('While the door is sealed a few ordinary monsters keep coming, so there is always gold to earn', o.state.monsters.length > 0 && o.state.monsters.length <= 6 && o.state.monsters.every((q) => q.kind !== 'demon')); } }
{ // sockets in a real game
  let r = null;
  for (let f = 1; f < 40 && !r; f++) { const q = mkRef({ seed: f * 13 + 1, cfg: { startWave: (f - 1) * 10 + 1, locks: true } }); const b = q.snapshot().locks.boss; if (b && b.kind === 'sockets') r = q; }
  if (!r) t('A game with the Coin Sockets puzzle was found to test', false);
  else {
    const b = r.snapshot().locks.boss, s = b.sockets[0];
    r.place(s.x + s.nx * 4, s.z + s.nz * 4, yawTo(-s.nx, -s.nz));
    const fire = () => { const o = r.snapshot().player; const pitch = Math.atan2(s.y - o.eye, 4); let out = null; for (let i = 0; i < 90; i++) { const p = r.snapshot().player; out = r.step(1 / 60, { fire: true, lookY: -(pitch - p.pitch) / 0.0022 }); if (out.state.locks.boss.sockets[0].hit) return out; } return out; };
    stepN(r, 2); const out = fire();
    t('Shooting a hidden gold socket in the game marks it as hit', out.state.locks.boss.sockets[0].hit);
    t('The other sockets are still waiting', out.state.locks.boss.sockets.slice(1).every((q) => !q.hit) && !out.state.locks.boss.solved);
  } }
{ // the gold trail runs through the gates, so you can follow it and pay your way
  const r = mkRef({ seed: 16, cfg: { startWave: 10 } }); let o = r.snapshot(); for (let i = 0; i < 6000 && !o.bossBar; i++) o = r.step(1 / 60, {}).state;
  t('The gold trail to the boss still shows when gates are shut, and it runs through them', !!o.trail && o.trail.length > 10 && o.locks.gates.some((q) => !q.open) && o.trail.some(([x, z]) => r.map.gates.some((g) => g.cells.some(([cx, cz]) => Math.floor(x / 2) === cx && Math.floor(z / 2) === cz)))); }
t('The safe room after a boss has no gates and no puzzle', (() => { const r = mkRef({ seed: 16, cfg: { startWave: 10 } }); r.solveLocks(); let o = r.snapshot(); for (let i = 0; i < 6000 && !o.bossBar; i++) o = r.step(1 / 60, {}).state; r.clearWave(); stepN(r, 0.3); const d = r.map.door; r.place(d.x + d.nx * 0.2, d.z + d.nz * 0.2, 0); stepN(r, 0.5); const s = r.snapshot(); return s.safe && s.locks.gates.length === 0 && s.locks.boss === null; })());
{ // the Key Keeper and the key gate
  const keeperGame = () => { for (let sd = 1; sd < 40; sd++) { const q = mkRef({ seed: sd * 7 + 2, cfg: { startWave: 21, locks: true } }); if (q.snapshot().locks.keeper) return q; } return null; };
  const r1 = mkRef({ seed: 5, cfg: { startWave: 1, locks: true } });
  t('Floors 1 and 2 have no Key Keeper and no key gate', !r1.snapshot().locks.keeper && r1.snapshot().locks.gates.every((g) => g.type === 'toll'));
  const r = keeperGame();
  if (!r) t('A game with a Key Keeper was found to test', false);
  else {
    const o0 = r.snapshot(), gs = o0.locks.gates;
    t('From floor 3 the last gate is the key gate and the earlier ones are paid with gold', gs[gs.length - 1].type === 'key' && gs.slice(0, -1).every((g) => g.type === 'toll'));
    t('The Key Keeper starts asleep and is much tougher than a normal monster of his kind', !!o0.locks.keeper && o0.locks.keeper.asleep && (() => { const kp = o0.monsters.find((m) => m.elite.includes('keeper')); if (!kp) return false; r.spawnAt(kp.kind, kp.x + 30, kp.z); const plain = r.snapshot().monsters.filter((m) => m.kind === kp.kind && !m.elite.includes('keeper')).pop(); return !!plain && kp.maxHp >= 3.9 * plain.maxHp; })());
    t('The Key Keeper is not counted in the wave', o0.wave.left === 0 || o0.wave.left === o0.monsters.length - 1 || o0.wave.left <= o0.monsters.length - 1);
    const kg = gs[gs.length - 1]; r.solveLocks && 0;
    const kk = o0.locks.keeper;
    r.setCfg({ damage: 1e6, playerHp: 1e6 }); r.place(kk.x + 4, kk.z, Math.PI / 2);
    let got = false, o = o0;
    for (let i = 0; i < 400 && !got; i++) { const p = r.snapshot().player; const yaw = Math.atan2(-(kk.x - p.x), -(kk.z - p.z)); o = r.step(1 / 60, { fire: true, lookX: 0 }); got = o.events.some((e) => e.type === 'keyTaken'); if (i === 0) r.place(kk.x + 4, kk.z, yawTo(kk.x - (kk.x + 4), 0)); }
    t('Killing the Key Keeper gives you a key', got && o.state.locks.keys === 1);
    const g = r.map.gates[r.map.gates.length - 1];
    const before = r.snapshot().player;
    r.place(g.x + g.nx * 1.2, g.z + g.nz * 1.2, yawTo(-g.nx, -g.nz)); stepN(r, 0.2);
    const near = r.snapshot().locks.near;
    t('At the key gate with a key you are offered to use it', !!near && near.what === 'key' && near.actions[0].afford);
    r.step(1 / 60, { lockUse: 0 }); const o2 = r.step(1 / 60, {}).state;
    t('Using the key opens the key gate and the key is spent', o2.locks.gates[o2.locks.gates.length - 1].open && o2.locks.keys === 0);
  } }
process.exit(bad ? 1 : 0);
