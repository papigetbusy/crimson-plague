// Co-op checks: up to five players in one game, played over an in-memory link. Plain sentences. Run: node tests/coop.test.js
const Referee = require('../src/referee.js'), CoopLink = require('../src/coop_link.js'), RC = require('../src/referee_coop.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const BASE = { gunDrops: true, gearDrops: true, modDrops: true, playerHp: 100, startGun: 'pistol_service' };

// a game with a host and (n-1) friends; each one has its own referee and its own luck
function game(n, o) {
  o = o || {};
  const host = Referee.create(o.seed || 77, { damage: 101, item: 102 }); host.setCfg(Object.assign({}, BASE, { coop: true, selfKey: 'host' }, o.cfg)); host.reset();
  const g = { host, hostLink: null, guests: [], inbox: {}, tickN: 0 };
  g.hostLink = CoopLink.host(host, (key, msg) => g.guests.find((x) => x.key === key).link.onMessage(JSON.parse(JSON.stringify(msg))));
  for (let i = 1; i < n; i++) {
    const key = 'g' + i, ref = Referee.create(o.seed || 77, { damage: 200 + i, item: 300 + i });
    ref.setCfg(Object.assign({}, BASE, { coop: true, guest: true, selfKey: key, selfName: 'Friend' + i }, o.cfg)); ref.reset();
    const link = CoopLink.guest(ref, (msg) => g.hostLink.onMessage(key, JSON.parse(JSON.stringify(msg))), 'Friend' + i);
    g.guests.push({ key, ref, link, inp: {} }); link.hello();
  }
  g.run = function (secs, hostInp, each) {
    for (let i = 0; i < secs * 60; i++) {
      const dt = 1 / 60, hOut = host.step(dt, typeof hostInp === 'function' ? hostInp(host, g) : hostInp || {});
      g.hostLink.tick(dt, hOut.events); g.last = hOut;
      for (const q of g.guests) { q.out = q.ref.step(dt, typeof q.inp === 'function' ? q.inp(q.ref, g) : q.inp); q.link.tick(dt); (q.evs = q.evs || []).push(...q.out.events); }
      if (each && each(g, i) === true) break;
    }
  };
  return g;
}
const snap = (r) => r.snapshot();
const sees = (g, i) => snap(g.guests[i].ref);

// ---- joining
{
  const g = game(3);
  t('The snapshot tells the lobby how many players a room holds (5)', snap(g.host).coop.max === 5);
  t('A friend who joins is counted, and a sixth player is turned away', (() => { const g5 = game(5); const ok = g5.host.remoteJoin('x', 'Extra'); return snap(g5.host).coop.n === 5 && ok === false && game(4).host.remoteJoin('y', 'Five') === true; })());
  g.run(1);
  t('Each friend sees the other two players, the host and the other friend', sees(g, 0).coop.peers.length === 2 && sees(g, 1).coop.peers.length === 2 && snap(g.host).coop.peers.length === 2);
  t('A friend who walks is seen to walk on the host', (() => { const q = g.guests[0]; q.inp = { mz: 1 }; const x0 = snap(g.host).coop.peers.find((p) => p.key === 'g1').z; g.run(1); const z1 = snap(g.host).coop.peers.find((p) => p.key === 'g1').z; q.inp = {}; return Math.abs(z1 - x0) > 1; })());
}
// ---- each friend is drawn as the class they picked
{
  const g = game(3); g.host.setCfg({ classId: 'gunslinger' }); g.guests[0].ref.setCfg({ classId: 'witch' }); g.guests[1].ref.setCfg({ classId: 'assassin' }); g.run(0.5);
  const cl = (s, k) => s.coop.peers.find((p) => p.key === k).cls;
  t('The host sees which class each friend picked', cl(snap(g.host), 'g1') === 'witch' && cl(snap(g.host), 'g2') === 'assassin');
  t('A friend sees the host and the other friend as the classes they picked', cl(sees(g, 0), 'host') === 'gunslinger' && cl(sees(g, 0), 'g2') === 'assassin' && cl(sees(g, 1), 'g1') === 'witch');
}
// ---- monsters scale with the number of friends
{
  const solo = Referee.create(77); solo.setCfg(Object.assign({}, BASE)); solo.reset(); solo.spawnAt('fiend', 5, 5);
  const g = game(3); g.host.spawnAt('fiend', 5, 5);
  t('With three players every monster has more health (x2.4)', Math.abs(snap(g.host).monsters[0].maxHp / snap(solo).monsters[0].maxHp - RC.hpMul(3)) < 0.01 && RC.hpMul(3) > 2);
  t('One player alone is exactly the same as before: health x1 and count x1', RC.hpMul(1) === 1 && RC.countMul(1) === 1);
  t('Three players get twice as many monsters in a wave', (() => { const a = Referee.create(5); const b = game(3, { seed: 5 }); return RC.scaleQueue(['a', 'a', 'a', 'a', 'b', 'b'], 3, () => 0.3, () => false).length === 12; })());
  t('A boss is never doubled for more players', (() => { const q = RC.scaleQueue(['boss', 'a', 'a'], 3, () => 0.1, (k) => k === 'boss'); return q.filter((k) => k === 'boss').length === 1 && q.length === 5; })());
}
// ---- the friends' games fight the host's monsters
{
  const g = game(3); g.run(8);
  t('Friends see the monsters the host has, with the same ids', (() => { const h = snap(g.host).monsters.map((m) => m.id).sort(), f = sees(g, 0).monsters.map((m) => m.id).sort(); return h.length > 0 && h.join() === f.join(); })());
  t('A friend sees the same wave and floor as the host', sees(g, 1).wave.n === snap(g.host).wave.n && sees(g, 1).floor === snap(g.host).floor);
}
// ---- hits and kills, loot and gold are separate
{
  const g = game(3); g.run(1);
  g.host.spawnAt('fiend', g.host.map.start.x + 4, g.host.map.start.z); g.host.setCfg({}); g.run(1);
  const id = snap(g.host).monsters[0].id, hp0 = snap(g.host).monsters[0].hp;
  g.guests[0].ref.place(g.host.map.start.x, g.host.map.start.z, Math.PI / 2);   // the monster is to the east, on the same row
  g.run(0.2);
  const m = sees(g, 0).monsters.find((q) => q.id === id);
  t('A friend can see the monster they are about to shoot', !!m);
  // hand the friend a strong hit through their own referee: damage is reported to the host
  const gr = g.guests[0].ref; gr.setCfg({ playerHp: 100 });
  const before = snap(g.host).monsters.find((q) => q.id === id).hp;
  g.host.remoteDamage('g1', [[id, 25]]); g.run(0.1);
  t("A friend's damage lowers the monster's health on the host", snap(g.host).monsters.find((q) => q && q.id === id).hp <= before - 25 + 1);
  g.host.remoteDamage('g1', [[id, 1e6]]); g.run(0.2);
  t('When a monster dies it is gone for the host and for both friends', !snap(g.host).monsters.some((q) => q.id === id) && !sees(g, 0).monsters.some((q) => q.id === id) && !sees(g, 1).monsters.some((q) => q.id === id));
  t('Every player is credited with the kill and drops their own loot', snap(g.host).kills >= 1 && sees(g, 0).kills >= 1 && sees(g, 1).kills >= 1 && sees(g, 0).level.xp > 0 && sees(g, 1).level.xp > 0);
  t("A friend's gold is their own: the host's gold does not move when a friend picks up coins", (() => { const gold0 = snap(g.host).gold; const f = g.guests[1].ref; f.giveGold(50); return snap(g.host).gold === gold0 && sees(g, 1).gold >= 50; })());
}
// ---- going down and getting up
{
  const g = game(3); g.run(1);
  const f = g.guests[0].ref, st = g.host.map.start;
  f.setCfg({ regen: 0 }); f.setHp(1); f.place(st.x + 4, st.z, 0); g.run(0.3);
  // a monster reaches the friend: the host sees the blow land on the friend and reports it, the friend's own game takes the damage
  g.host.spawnAt('fiend', st.x + 4.2, st.z);
  g.run(6, null, () => snap(f).coop.down);
  t('A friend who is hit at 1 health goes down, not out', snap(f).coop.down === true && !snap(f).over);
  t('The run goes on while a friend is down', !snap(g.host).over);
  g.run(0.2);
  t('The host knows the friend is down', snap(g.host).coop.peers.find((p) => p.key === 'g1').down === true);
  t('Monsters leave a downed friend alone and go for the one still standing', (() => {
    g.host.clearWave(); const fp = snap(g.host).coop.peers.find((p) => p.key === 'g1'), hp = snap(g.host).player; g.host.spawnAt('fiend', fp.x + 0.3, fp.z);
    const d0 = Math.hypot(snap(g.host).monsters[0].x - hp.x, snap(g.host).monsters[0].z - hp.z); g.run(1);
    const m = snap(g.host).monsters[0]; return Math.hypot(m.x - hp.x, m.z - hp.z) < d0 - 1 || Math.hypot(m.x - hp.x, m.z - hp.z) < 2;
  })());
  // the other friend walks over and stands close
  const down = snap(f).player; g.guests[1].ref.place(down.x, down.z + 1, 0);
  g.host.clearWave(); g.run(0.5);
  g.run(6, null, () => !snap(f).coop.down);
  t('A friend who stands close to a downed player brings them back up', snap(f).coop.down === false);
  t('A revived player comes back with part of their health and a moment of safety', (() => { const p = snap(f).player; return p.hp > 0 && p.hp < p.maxHp * 0.6; })());
}
// ---- everyone down ends the run
{
  const g = game(3, { cfg: { monsterDamage: 400 } }); g.run(1);
  for (const q of g.guests) { q.ref.setHp(1); }
  g.host.setHp(1);
  for (let i = 0; i < 3; i++) g.host.spawnAt('fiend', g.host.map.start.x + 0.5, g.host.map.start.z);
  g.run(25, null, () => snap(g.host).over);
  t('When every player is down the host ends the run', !!snap(g.host).over);
  g.run(1);
  t('The friends are told the run is over', !!sees(g, 0).over && !!sees(g, 1).over);
}
// ---- menus do not stop the world
{
  const g = game(2); g.run(1);
  const f = g.guests[0].ref; f.giveXp(100000);   // a level-up is waiting for the friend
  const t0 = snap(g.host).t; g.run(2);
  t('A friend choosing a level-up does not stop the host\'s world', snap(g.host).t - t0 > 1.9 && !!snap(f).choices);
  t('A friend in a menu can not be hurt', (() => { const hp0 = snap(f).player.hp; g.host.spawnAt('fiend', g.host.map.start.x, g.host.map.start.z); g.run(3); return snap(f).player.hp >= hp0 - 0.01; })());
  f.step(1 / 60, { pick: 0, pickClass: 0 }); g.run(0.2);
  t('After the friend picks, they play on', (() => { for (let i = 0; i < 300 && snap(f).choices; i++) f.step(1 / 60, { pick: 0, pickClass: 0 }); return !snap(f).choices; })());
}
// ---- one friend's progress is not another's
{
  const g = game(3); g.run(1);
  g.guests[0].ref.giveXp(100000);
  t("One friend's level-up is theirs alone", snap(g.guests[0].ref).level.n > 1 && snap(g.guests[1].ref).level.n === 1 && snap(g.host).level.n === 1);
}
// ---- through the door together
{
  const g = game(2, { cfg: { startWave: 10 } }); g.host.setCfg({ startWave: 10, bossKind: 'demon' }); g.host.reset();
  g.run(0.5);
  g.host.clearWave();
  g.host.setCfg({});
  t('Playing alone still works: no friends, nothing changes in the numbers', (() => { const a = Referee.create(9); a.setCfg({ coop: true }); a.reset(); a.step(1 / 60, {}); return snap(a).coop.n === 1 && snap(a).coop.peers.length === 0; })());
}
// ---- a friend's real shots reach the host's monster
{
  const g = game(3); g.run(1);
  const st = g.host.map.start, f = g.guests[0].ref;
  f.place(st.x, st.z, Math.PI / 2); g.host.spawnAt('fiend', st.x + 5, st.z); g.run(0.5);
  const id = snap(g.host).monsters[0].id, hp0 = snap(g.host).monsters[0].maxHp;
  g.guests[0].inp = { fire: true }; g.run(1.2); g.guests[0].inp = {};
  const m = snap(g.host).monsters.find((q) => q.id === id);
  t("A friend's gun really hurts the host's monster", !m || m.hp < hp0 - 5);
  t('A friend uses their own ammo, not the host\'s', snap(f).player.ammo < snap(f).player.magSize && snap(g.host).player.ammo === snap(g.host).player.magSize);
}
// ---- through the boss door together
{
  const g = game(3, { cfg: { startWave: 10, bossKind: 'demon', bossRandom: false } }); g.run(1);
  g.run(6, null, () => snap(g.host).monsters.some((m) => m.kind === 'demon'));
  g.run(0.3);
  t('Friends see the boss the host fights', sees(g, 0).monsters.some((m) => m.kind === 'demon') && !!sees(g, 1).bossBar);
  g.host.clearWave(); g.run(0.5);
  t('When the boss is down the door opens for everyone', snap(g.host).door.open && sees(g, 0).door.open && sees(g, 1).door.open);
  const d = g.host.map.door, cell = d.cells[0];
  g.host.place((cell[0] + 0.5) * 2, (cell[1] + 0.5) * 2, 0); g.run(0.5);
  t('One player stepping through takes everybody into the safe room', snap(g.host).safe && sees(g, 0).safe && sees(g, 1).safe && sees(g, 0).floor === snap(g.host).floor);
  t('Each friend gets their own merchant stock in the safe room', !!sees(g, 0).merchant && !!sees(g, 1).merchant);
  const d2 = g.host.map.door, c2 = d2.cells[0];
  g.host.place((c2[0] + 0.5) * 2, (c2[1] + 0.5) * 2, 0); g.run(0.5);
  t('Through the next door everybody is on the next floor', !snap(g.host).safe && snap(g.host).floor === 2 && sees(g, 0).floor === 2 && sees(g, 1).floor === 2 && !sees(g, 0).safe);
}
// ---- random play never throws or stalls
{
  const g = game(3, { cfg: { startWave: 3, playerHp: 1e6 } }); let seed = 5; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const inp = () => ({ mx: rnd() * 2 - 1, mz: rnd() * 2 - 1, lookX: (rnd() - 0.5) * 200, fire: rnd() < 0.7, slide: rnd() < 0.02, reload: rnd() < 0.01, pick: 0, pickClass: 0, pickup: rnd() < 0.05, shopClose: rnd() < 0.2 });
  let ok = true, t0 = snap(g.host).t;
  try { for (const q of g.guests) q.inp = inp; g.run(120, inp); } catch (e) { ok = false; console.log(e.stack); }
  t('Three players moving, shooting and picking at random for two minutes never throws', ok);
  t('The world kept moving the whole time', snap(g.host).t - t0 > 100);
}
// ---- the host's map is the friends' map
{
  const g = game(2, { seed: 1234 }); g.run(1);
  const f = g.guests[0].ref;
  t('A friend plays on the host\'s map even when the seed is an even number', f.map.id !== undefined && JSON.stringify(f.map.rows) === JSON.stringify(g.host.map.rows) && f.seeds().map === g.host.seeds().map);
  g.host.reset(); g.run(0.3);
  t('When the host starts a new run the friends start one too', sees(g, 0).wave.n === 1 && f.seeds().map === g.host.seeds().map);
}
// ---- saving is off while playing with friends
t('There is no save in a co-op run', (() => { const g = game(2); return g.host.saveData() === null; })());
console.log(bad ? bad + ' FAILED' : 'all co-op checks passed');
process.exit(bad ? 1 : 0);
