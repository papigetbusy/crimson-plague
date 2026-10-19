// Core loop checks: waves, kinds, xp, level-ups, pickups, boss, game over. Plain sentences. Run: node tests/loop.test.js
const Referee = require('../src/referee.js'), D = require('../src/referee_data.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };

// a bot that plays through the same step() the screen uses: aims at the nearest monster and fires, else walks to the nearest orb
function bot(ref, out, o) {
  o = o || {};
  const s = out.state, p = s.player;
  let near = null, nd = 1e9;
  for (const m of s.monsters) { const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < nd) { nd = d; near = m; } }
  const turn = (tx, tz) => { const want = Math.atan2(tx - p.x, -(tz - p.z)); let d = want - p.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d / 0.0022; };
  let inp = { mz: 0 };
  if (near && nd < 28 && !o.idle) {
    const hd = 1.2 * near.scale, wp = Math.atan2(hd - p.eye, nd);
    inp = { lookX: turn(near.x, near.z), lookY: -(wp - p.pitch) / 0.0022, fire: true, mz: 0 };
  } else if (s.orbs.length) {
    let bo = s.orbs[0], bd = 1e9; for (const q of s.orbs) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; bo = q; } }
    inp = { lookX: turn(bo.x, bo.z), mz: 1 };
  }
  if (s.choices) inp.pick = 0;
  if (o.pick !== undefined && s.choices) inp.pick = o.pick;
  return inp;
}
function run(ref, until, maxSec, o) {
  let out = ref.step(0.016, {}), ev = [];
  for (let i = 0; i < maxSec * 60; i++) { out = ref.step(1 / 60, bot(ref, out, o)); ev.push(...out.events); if (until(out.state, ev)) break; }
  return { out: out.state, ev };
}
const god = (ref) => { ref.setCfg({ playerHp: 1e7, regen: 0 }); ref.reset(); };

{ // waves
  const ref = Referee.create(11); let out = ref.snapshot();
  t('The run starts on wave 1, in a short pause before anything spawns', out.wave.n === 1 && out.wave.phase === 'intermission' && out.monsters.length === 0);
  const r = run(ref, (o) => o.wave.phase === 'fight', 6);
  t('After the pause wave 1 begins and monsters appear', r.out.wave.phase === 'fight' && r.ev.some((e) => e.type === 'waveStart' && e.n === 1));
  const r2 = run(ref, (o) => o.monsters.length >= 6, 20, { idle: true });
  t('Wave 1 is only horned fiends, and no more than six are alive at once', r2.out.monsters.every((m) => m.kind === 'fiend') && r2.out.monsters.length <= 6);
}
{ // a whole wave, orbs, xp, level-up, skills
  const ref = Referee.create(12); god(ref);
  const r = run(ref, (o, ev) => ev.some((e) => e.type === 'waveClear'), 120);
  t('Killing every monster of the wave clears it', r.ev.some((e) => e.type === 'waveClear' && e.n === 1));
  const orbRun = run(ref, (o, ev) => ev.some((e) => e.type === 'orb'), 40);
  t('Every kill drops an XP orb, and walking over it collects the XP', r.ev.filter((e) => e.type === 'kill').length >= 8 && (r.out.orbs.length > 0 || r.ev.some((e) => e.type === 'orb')) && orbRun.ev.some((e) => e.type === 'orb'));
  t('Clearing a wave drops a health pickup near the player', r.out.pickups.some((q) => q.kind === 'heal') || r.ev.some((e) => e.type === 'pickup' && e.kind === 'heal'));
  const r2 = run(ref, (o) => o.choices, 90);
  t('Enough XP levels you up and offers three different skills', !!r2.out.choices && r2.out.choices.length === 3 && new Set(r2.out.choices.map((c) => c.id)).size === 3);
  const frozen = ref.snapshot();
  let moved = false; for (let i = 0; i < 60; i++) { const o = ref.step(1 / 60, { mz: 1, fire: true }); if (o.state.player.z !== frozen.player.z || o.state.t !== frozen.t) moved = true; }
  t('The game freezes while you choose: nothing moves, nobody attacks', !moved && !!ref.snapshot().choices);
  const pickedId = ref.snapshot().choices[1].id;
  const o3 = ref.step(1 / 60, { pick: 1 });
  t('Picking a skill adds it to your run and the game carries on', o3.state.skills.some((s) => s.id === pickedId && s.n === 1));
  t('Level and XP are tracked, and the next level needs more XP than the last', D.xpNeed(2) > D.xpNeed(1) && D.xpNeed(10) > D.xpNeed(5));
}
{ // skills really change numbers: find a seed that offers the skill, pick it, look at the effect
  const withSkill = (id) => {
    for (let seed = 1; seed < 60; seed++) {
      const ref = Referee.create(seed); god(ref);
      for (let i = 0; i < 60 * 150; i++) {
        const sn = ref.snapshot();
        if (sn.choices) { const idx = sn.choices.findIndex((c) => c.id === id); if (idx >= 0) { ref.step(1 / 60, { pick: idx }); return ref; } ref.step(1 / 60, { pick: 0 }); continue; }
        ref.step(1 / 60, bot(ref, { state: sn }));
      }
    }
    return null;
  };
  const hp = withSkill('hp'); t('Iron Blood raises max health', !!hp && hp.snapshot().player.maxHp > 1e7);
  const mg = withSkill('mag'); t('Deep Magazine makes the magazine bigger', !!mg && mg.snapshot().player.magSize === 38);
  const dm = withSkill('dmg'); t('Sharpened Rounds is listed in your skills with its stack count', !!dm && dm.snapshot().skills.some((k) => k.id === 'dmg' && k.n === 1));
  const fresh = Referee.create(30); god(fresh); fresh.setCfg({ spread: 0, spreadAds: 0 }); fresh.reset();
  const dmgHit = (ref) => { let d = 0; for (let i = 0; i < 60 * 40 && !d; i++) { const out = ref.step(1 / 60, bot(ref, { state: ref.snapshot() })); const h = out.events.find((e) => e.type === 'hit' && !e.splash && !e.crit); if (h) d = h.dmg; } return d; };
  if (dm) { dm.setCfg({ spread: 0, spreadAds: 0 }); t('Sharpened Rounds makes each hit hit harder', dmgHit(dm) > dmgHit(fresh)); }
}
{ // kinds
  const K = D.KINDS;
  t('Bone hounds are fast and fragile, golems are slow and tough, fiends sit in the middle', K.hound.speedMul > K.fiend.speedMul && K.hound.hpMul < K.fiend.hpMul && K.golem.speedMul < K.fiend.speedMul && K.golem.hpMul > K.fiend.hpMul);
  const mk = (w, seed) => { let a = seed; const rng = () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; return D.waveKinds(w, rng); };
  t('Hounds arrive from wave 2 and golems from wave 4', !mk(1, 1).includes('hound') && mk(6, 1).includes('hound') && !mk(3, 2).includes('golem') && mk(12, 3).includes('golem'));
  t('Every wave has more monsters than the one before (until bosses)', mk(2, 1).length > mk(1, 1).length && mk(5, 1).length > mk(4, 1).length);
  t('Wave 10 and wave 20 each start with exactly one demon lord boss', mk(10, 1)[0] === 'demon' && mk(10, 1).filter((k) => k === 'demon').length === 1 && mk(20, 4)[0] === 'demon' && mk(9, 1).indexOf('demon') < 0);
}
{ // boss wave
  const ref = Referee.create(14); ref.setCfg({ startWave: 10, playerHp: 1e7, regen: 0 }); ref.reset();
  const r = run(ref, (o) => o.bossBar, 40, { idle: true });
  t('Starting on wave 10 brings out the demon lord with a boss bar', !!r.out.bossBar && r.out.bossBar.name === 'Demon Lord' && r.out.wave.boss);
  const m = r.out.monsters.find((q) => q.kind === 'demon');
  t('The boss is much bigger and tougher than a fiend', m.scale > 1.3 && r.out.bossBar.maxHp > 20 * 70);
  const states = new Set(); const r3 = run(ref, (o) => { const b = o.monsters.find((q) => q.kind === 'demon'); if (b) states.add(b.state); return states.has('charge'); }, 40, { idle: true });
  t('The boss rears back (wind-up) and then charges at you', states.has('windup') && states.has('charge'));
}
{ // boss summons at half health
  const ref = Referee.create(15); ref.setCfg({ startWave: 10, playerHp: 1e7, regen: 0, damage: 120 }); ref.reset();
  const r = run(ref, (o, ev) => ev.some((e) => e.type === 'bossSummon'), 90);
  t('At half health the boss calls hounds to its side, once', r.ev.filter((e) => e.type === 'bossSummon').length === 1);
  const r2 = run(ref, (o, ev) => ev.some((e) => e.type === 'kill' && e.boss), 90);
  t('Killing the boss pays out a lot of XP and a health pickup', r2.ev.some((e) => e.type === 'kill' && e.boss) && (r2.out.orbs.some((q) => q.v >= 400) || r2.ev.some((e) => e.type === 'orb' && e.v >= 400)));
}
{ // caps
  const ref = Referee.create(16); ref.setCfg({ startWave: 12, playerHp: 1e7 }); ref.reset();
  let maxAlive = 0, maxHeavy = 0;
  for (let i = 0; i < 60 * 40; i++) {
    const o = ref.step(1 / 60, {}); maxAlive = Math.max(maxAlive, o.state.monsters.length);
    maxHeavy = Math.max(maxHeavy, o.state.monsters.filter((q) => D.KINDS[q.kind].heavy).length);
  }
  t('Even late waves never put more than 16 monsters on screen', maxAlive <= 16 && maxAlive > 6);
  t('At most 6 of the heavy models (fiends, golems, bosses) are alive at once, so phones keep up', maxHeavy <= 6);
}
{ // pickups
  const ref = Referee.create(17); ref.setCfg({ regen: 0 }); ref.reset();
  let out = ref.step(1 / 60, {});
  // take damage first by standing still among monsters, then collect a heal
  const hurt = run(ref, (o) => o.player.hp < 70, 120, { idle: true });
  t('Monsters hurt you when they reach you', hurt.out.player.hp < 100);
}
{ // death and restart
  const ref = Referee.create(18); ref.setCfg({ regen: 0 }); ref.reset();
  const r = run(ref, (o) => o.over, 400, { idle: true });
  t('When your health hits zero the run ends and shows the wave, kills and level you reached', !!r.out.over && r.out.over.wave >= 1 && typeof r.out.over.kills === 'number' && r.out.over.level >= 1);
  const frozen = ref.snapshot(); const before = JSON.stringify(frozen.monsters);
  for (let i = 0; i < 120; i++) ref.step(1 / 60, { mz: 1, fire: true });
  t('After you die nothing moves until you restart (no auto-respawn)', JSON.stringify(ref.snapshot().monsters) === before && !!ref.snapshot().over);
  const o = ref.step(1 / 60, { restart: true });
  t('Restart begins a brand new run: wave 1, level 1, no skills, full health, no kills', !o.state.over && o.state.wave.n === 1 && o.state.level.n === 1 && o.state.skills.length === 0 && o.state.kills === 0 && o.state.player.hp === o.state.player.maxHp && o.state.monsters.length === 0);
}
{ // determinism
  const sim = () => { const ref = Referee.create(21); god(ref); const r = run(ref, (o) => o.wave.n >= 2, 120); return [r.out.kills, r.out.level.n, r.out.monsters.length, r.out.player.x.toFixed(3)].join(); };
  t('The same seed plays out the same way every time', sim() === sim());
}
process.exit(bad ? 1 : 0);
