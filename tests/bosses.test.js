// Boss checks: the three Crusader Tactics bosses (Bat Lord, Lich King, Elder Dragon) next to the Demon Lord: which one waits on each floor, how they scale,
// and that every one fights differently. Plain sentences. Run: node tests/bosses.test.js
const Referee = require('../src/referee.js'), D = require('../src/referee_data.js'), RB = require('../src/referee_bosses.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const KINDS = ['bat', 'lich', 'dragon'];
// a fight with one boss: you stand still (a god with no gun use) a few steps from the door, so he wakes and plays his moves. visit(state, events, step) is called every frame.
function fight(kind, o, visit, secs) {
  o = o || {};
  const r = Referee.create(o.seed || 7); r.setCfg(Object.assign({ startWave: o.wave || 10, playerHp: 1e7, regen: 0, startSafe: false, bossKind: kind, gunDrops: false, gearDrops: false, modDrops: false }, o.cfg || {})); r.reset();
  let out = r.step(1 / 60, {}), placed = false;
  for (let i = 0; i < (secs || 40) * 60; i++) {
    const b = out.state.monsters.find((m) => m.kind === kind);
    if (b && !placed) { placed = true; const d = r.map.door; r.place(d.x + d.nx * (o.dist || 9), d.z + d.nz * (o.dist || 9), Math.atan2(-d.nx, d.nz)); }
    out = r.step(1 / 60, {});
    if (visit(out.state, out.events, i, r) === true) break;
  }
  return r;
}

// ---- which boss waits on a floor
t('Without the random switch the boss is always the Demon Lord', (() => { const r = Referee.create(5); r.setCfg({ startWave: 10 }); r.reset(); return r.snapshot().monsters.length === 0 && (() => { for (let i = 0; i < 400; i++) { const o = r.step(1 / 60, {}); if (o.state.bossBar) return o.state.bossBar.name === 'Demon Lord'; } return false; })(); })());
t('With the random switch on, all four bosses turn up across the floors', (() => { const seen = new Set(); for (let s = 1; s < 40; s += 2) for (let f = 1; f <= 8; f++) seen.add(RB.pick(f, s)); return RB.ORDER.every((k) => seen.has(k)); })());
t('The same map seed always brings the same boss on the same floor', RB.pick(3, 4243) === RB.pick(3, 4243) && RB.pick(7, 99) === RB.pick(7, 99));
t('Different map seeds do not all bring the same first boss', (() => { const s = new Set(); for (let i = 1; i < 60; i += 2) s.add(RB.pick(1, i)); return s.size >= 3; })());
t('You never meet the same boss on two floors in a row', (() => { for (let s = 1; s < 80; s += 2) { let prev = ''; for (let f = 1; f <= 12; f++) { const k = RB.pick(f, s); if (k === prev) return false; prev = k; } } return true; })());
t('A forced boss kind is respected', RB.pick(1, 5, 'lich') === 'lich' && RB.pick(4, 5, 'dragon') === 'dragon');
t('Switching the random boss on in a run really spawns the picked boss at wave 10', (() => { const want = RB.pick(1, 9); const r = Referee.create(9); r.setCfg({ startWave: 10, bossRandom: true }); r.reset(); for (let i = 0; i < 400; i++) { const o = r.step(1 / 60, {}); if (o.state.bossBar) return o.state.bossBar.name === D.KINDS[want].name; } return false; })());

// ---- every boss is a real boss, and they are not alike
t('All three new bosses are bosses with a door guard, an enrage and moves of their own', KINDS.every((k) => D.KINDS[k].boss && D.KINDS[k].guard && D.KINDS[k].enrage && D.KINDS[k].moves));
t('No two bosses share the same set of moves', (() => { const sig = ['demon', ...KINDS].map((k) => Object.keys(D.KINDS[k].moves || { charge: 1, shoot: 1 }).sort().join()); return new Set(sig).size === sig.length; })());
t('Each boss has a name of its own and tougher health than an ordinary monster', ['demon', ...KINDS].every((k, i, a) => D.KINDS[k].hpMul >= 40 && a.filter((j) => D.KINDS[j].name === D.KINDS[k].name).length === 1));

// ---- harder and harder: more health and more damage on every boss floor
t('A boss on floor 3 has more health than the same boss on floor 1', KINDS.every((k) => {
  const hp = (wave) => { let h = 0; fight(k, { wave }, (s) => { if (s.bossBar) { h = s.bossBar.maxHp; return true; } }, 12); return h; };
  return hp(30) > hp(10) * 2;
}));
t('A boss on floor 3 hits harder than the same boss on floor 1', KINDS.every((k) => {
  const hit = (wave) => { let d = 0; fight(k, { wave, dist: 5, cfg: { monsterCount: 1 } }, (s, ev) => { const h = ev.find((e) => e.type === 'playerHit' && e.id === (s.monsters.find((m) => m.kind === k) || {}).id); if (h) { d = h.dmg; return true; } }, 40); return d; };
  const a = hit(10), b = hit(30); return a > 0 && b > a * 1.5;
}));

// ---- the Bat Lord
// you aim at him and shoot, so he is hurt and the drain has something to heal
const aimFire = (rr, s, b, extra) => {
  const p = s.player, want = Math.atan2(b.x - p.x, -(b.z - p.z)); let d = want - p.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  return rr.step(1 / 60, Object.assign({ lookX: d / 0.0022, lookY: -(Math.atan2(1.2 * b.scale - p.eye, Math.hypot(b.x - p.x, b.z - p.z)) - p.pitch) / 0.0022, fire: true }, extra || {}));
};
{
  let dives = 0, drains = 0, hurt = 0, lane = false, flew = D.KINDS.bat.hover >= 1;
  fight('bat', {}, (s, ev) => {
    const b = s.monsters.find((m) => m.kind === 'bat'); if (!b) return;
    for (const e of ev) { if (e.type === 'bossDive') dives++; if (e.type === 'bossDrain') drains++; if (e.type === 'playerHit' && e.id === b.id) hurt++; }
    if (s.bossFx.some((f) => f.shape === 'lane')) lane = true;
  }, 40);
  t('The Bat Lord rears up and dives at you again and again', dives >= 3);
  t('The Bat Lord shows a lane on the floor before he dives, so you can step aside', lane);
  t('A dive that lands hurts you', hurt >= 1 && drains >= 1);
  t('The Bat Lord flies', flew);
  let healed = 0, last = null, shotAt = 0;
  fight('bat', { cfg: { damage: 3 } }, (s, ev, i, rr) => {
    const b = s.monsters.find((m) => m.kind === 'bat'); if (!b) return;
    const o = aimFire(rr, s, b); const nb = o.state.monsters.find((m) => m.kind === 'bat'); if (!nb) return;
    if (o.events.some((e) => e.type === 'bossDrain')) { healed = Math.max(healed, nb.hp - (last === null ? nb.hp : last)); }
    last = nb.hp;
  }, 40);
  t('When a dive lands, the Bat Lord heals by draining you', healed > 0);
  // the same dive against a fake referee, so the timing of a slide cannot make the check flaky
  const fake = (hurtResult) => { const ev = [], hurts = []; const env = { player: () => ({ x: 0, z: 0, eye: 1.7 }), rng: () => 0.5, los: () => true, hurt: (d) => { hurts.push(d); return hurtResult; }, fire: () => { }, event: (e) => ev.push(e), speed: () => 4, spot: () => null }; return { env, ev, hurts }; };
  const dive = (hurtResult) => {
    const f = fake(hurtResult), B = RB.create(f.env), k = D.KINDS.bat, m = { kind: 'bat', x: 8, z: 0, hp: 500, maxHp: 1000, dmg: 10, scale: 1, enraged: false, state: 'chase' };
    for (let i = 0; i < 600 && !f.ev.some((e) => e.type === 'bossDrain') && !(m.bm && m.bm.hit); i++) { const dx = -m.x, dz = 0, dist = Math.abs(m.x); B.step(m, k, 1 / 60, dist, dx, dz, 2); m.x += (m.bmx || 0) / 60; m.z += (m.bmz || 0) / 60; }
    return { m, f };
  };
  const landed = dive(true), slid = dive(false);
  t('A dive that lands drains you: he heals by a share of the damage', landed.f.ev.some((e) => e.type === 'bossDrain') && landed.m.hp > 500);
  t('A dive you slide through (the hit does not land) heals him by nothing', slid.f.hurts.length >= 1 && !slid.f.ev.some((e) => e.type === 'bossDrain') && slid.m.hp === 500);
}

// ---- the Lich King
{
  let maxRing = 0, blinks = 0, summons = 0, minGap = 9, skel = 0;
  fight('lich', { dist: 14 }, (s, ev) => {
    const b = s.monsters.find((m) => m.kind === 'lich'); if (!b) return;
    const soul = s.shots.filter((q) => q.proj === 'soul'); maxRing = Math.max(maxRing, soul.length);
  }, 40);
  // the nova: a full ring in one go, with real gaps between bolts
  fight('lich', { dist: 14 }, (s, ev) => { if (ev.some((e) => e.type === 'bossNova')) { const b = s.monsters.find((m) => m.kind === 'lich'); const a = s.shots.filter((q) => q.proj === 'soul' && Math.hypot(q.x - b.x, q.z - b.z) < 3).map((q) => Math.atan2(q.x - b.x, -(q.z - b.z))).sort((x, y) => x - y); a.push(a[0] + Math.PI * 2); for (let i = 1; i < a.length; i++) minGap = Math.min(minGap, a[i] - a[i - 1]); return true; } }, 60);
  t('The Lich King sends out a ring of soul bolts all round him', maxRing >= D.KINDS.lich.moves.nova.n);
  t('The ring has gaps you can run or slide through', minGap > 0.15 && minGap < 1);
  let fan = 0; fight('lich', { dist: 14 }, (s, ev) => { for (const e of ev) if (e.type === 'shoot' && e.proj === 'soul') { fan = Math.max(fan, s.shots.filter((q) => q.proj === 'soul').length); return fan >= 3; } }, 40);
  t('The Lich King also fires a fan of three soul bolts at you', fan >= 3);
  let moved = 0; fight('lich', { dist: 5 }, (s, ev) => { const b = s.monsters.find((m) => m.kind === 'lich'); if (!b) return; for (const e of ev) if (e.type === 'bossBlink') { blinks++; moved = Math.hypot(e.x2 - e.x, e.z2 - e.z); return true; } }, 40);
  t('Get close to the Lich King and he blinks away to somewhere far from you', blinks >= 1 && moved >= 8);
  fight('lich', { cfg: { damage: 150 }, dist: 12 }, (s, ev, i, rr) => {
    const b = s.monsters.find((m) => m.kind === 'lich'); if (!b) return;
    const o = aimFire(rr, s, b);
    for (const e of o.events) if (e.type === 'bossSummon') summons++;
    skel = Math.max(skel, o.state.monsters.filter((m) => m.kind === 'skeleton').length);
    if (summons) return true;
  }, 80);
  t('At 60% health the Lich King raises the dead (skeletons), once', summons === 1 && skel >= 1);
}

// ---- the Elder Dragon
{
  let breaths = 0, slams = 0, firePeak = 0, spread = 0, lanes = false, ring = false, hitClose = 0, hitFar = 0;
  fight('dragon', { dist: 10 }, (s, ev) => {
    const b = s.monsters.find((m) => m.kind === 'dragon'); if (!b) return;
    for (const e of ev) { if (e.type === 'bossBreath') breaths++; if (e.type === 'bossSlam') slams++; }
    const fire = s.shots.filter((q) => q.proj === 'fire'); firePeak = Math.max(firePeak, fire.length);
    if (fire.length > 3) { const a = fire.map((q) => Math.atan2(q.x - b.x, -(q.z - b.z))); spread = Math.max(spread, Math.max(...a) - Math.min(...a)); }
    if (s.bossFx.some((f) => f.shape === 'lane')) lanes = true; if (s.bossFx.some((f) => f.shape === 'ring')) ring = true;
  }, 45);
  t('The Elder Dragon breathes a long stream of fire', breaths >= 2 && firePeak >= 6);
  t('The breath sweeps across an arc rather than going straight', spread > 0.35);
  t('The Elder Dragon warns with lanes on the floor before the breath and a ring before the tail slam', lanes && ring);
  t('The Elder Dragon slams his tail when you stand close', slams >= 1);
  const slam = (dist) => {                                              // the same slam against a fake referee: does the shockwave reach a player this far away?
    const hurts = []; const env = { player: () => ({ x: dist, z: 0, eye: 1.7 }), rng: () => 0.5, los: () => true, hurt: (d) => { hurts.push(d); return true; }, fire: () => { }, event: () => { }, speed: () => 4, spot: () => null };
    const B = RB.create(env), k = Object.assign({}, D.KINDS.dragon, { extra: undefined }), m = { kind: 'dragon', x: 0, z: 0, hp: 1, maxHp: 1, dmg: 10, scale: 1, enraged: false, state: 'chase' };
    for (let i = 0; i < 600 && !hurts.length; i++) B.step(m, k, 1 / 60, dist, dist, 0, 3);
    return hurts.length;
  };
  t('The tail slam hurts you when you stand close, and he does not slam at all when you are far away', slam(4) === 1 && slam(D.KINDS.dragon.moves.slam.radius + 3) === 0);
}

// ---- the same four fights are the same every time (seeded)
t('The same seed gives the same Bat Lord fight twice', (() => { const run = () => { let log = ''; fight('bat', { seed: 11 }, (s, ev) => { for (const e of ev) if (e.type === 'bossDive') log += Math.round(e.x) + ',' + Math.round(e.z) + ';'; }, 20); return log; }; return run() === run() && run().length > 0; })());
process.exit(bad ? 1 : 0);
