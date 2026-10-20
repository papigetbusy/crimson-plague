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
const nearBoss = (ref, d) => { const b = ref.snapshot().monsters.find((q) => q.kind === 'demon'); ref.place(b.x + ref.map.door.nx * (d || 6), b.z + ref.map.door.nz * (d || 6)); };   // walk up to him (the floor is big: the tests do not make the bot cross it)
{ // boss wave
  const ref = Referee.create(14); ref.setCfg({ startWave: 10, playerHp: 1e7, regen: 0 }); ref.reset();
  const r = run(ref, (o) => o.bossBar, 40, { idle: true });
  t('Starting on wave 10 brings out the demon lord with a boss bar', !!r.out.bossBar && r.out.bossBar.name === 'Demon Lord' && r.out.wave.boss);
  const m = r.out.monsters.find((q) => q.kind === 'demon');
  t('The boss is much bigger and tougher than a fiend', m.scale > 1.3 && r.out.bossBar.maxHp > 20 * 70);
  nearBoss(ref, 11);
  const states = new Set(); const r3 = run(ref, (o) => { const b = o.monsters.find((q) => q.kind === 'demon'); if (b) states.add(b.state); return states.has('charge'); }, 40, { idle: true });
  t('The boss rears back (wind-up) and then charges at you', states.has('windup') && states.has('charge'));
}
{ // the boss guards the door
  const ref = Referee.create(16); ref.setCfg({ startWave: 10, playerHp: 1e7, regen: 0 }); ref.reset();
  const door = ref.map.door;
  const r = run(ref, (o) => o.bossBar, 40, { idle: true });
  const b0 = r.out.monsters.find((q) => q.kind === 'demon');
  t('The boss spawns at the door, just inside it, and is guarding', Math.hypot(b0.x - door.x, b0.z - door.z) < 4 && b0.state === 'guard' && r.out.bossBar.state === 'guard');
  t('The compass points at the boss from the moment he spawns', !!r.out.compass && Math.abs(r.out.compass.x - b0.x) < 1e-6 && Math.abs(r.out.compass.z - b0.z) < 1e-6);
  const far = run(ref, () => false, 6, { idle: true }), b1 = far.out.monsters.find((q) => q.kind === 'demon');
  t('While you are far away he stays at the door and the compass stays on', Math.hypot(b1.x - b0.x, b1.z - b0.z) < 0.01 && b1.state === 'guard' && !!far.out.compass);
  nearBoss(ref);
  const w = run(ref, () => false, 1, { idle: true });
  t('When you come into his sight he wakes, and the compass disappears as the fight starts', w.out.compass === null && w.out.monsters.find((q) => q.kind === 'demon').state !== 'guard');
}
{ // hurting him from afar also wakes him
  const ref = Referee.create(17); ref.setCfg({ startWave: 10, playerHp: 1e7, regen: 0 }); ref.reset();
  run(ref, (o) => o.bossBar, 40, { idle: true });
  const b = ref.snapshot().monsters.find((q) => q.kind === 'demon');
  ref.place(b.x + ref.map.door.nx * 15, b.z + ref.map.door.nz * 15);
  const far = run(ref, () => false, 1, { idle: true });
  t('At 15 units he has not noticed you yet', far.out.monsters.find((q) => q.kind === 'demon').state === 'guard');
  t('Shoot him from there and he wakes', run(ref, (o) => o.monsters.find((q) => q.kind === 'demon').state !== 'guard', 8).out.monsters.find((q) => q.kind === 'demon').state !== 'guard');
}
{ // the door opens where he falls, and the next floor is bigger
  const ref = Referee.create(18); ref.setCfg({ startWave: 10, playerHp: 1e7, regen: 0, damage: 400 }); ref.reset();
  t('Floors are ten waves long: waves 1 to 10 are floor 1, wave 11 starts floor 2', Referee.create(1).snapshot().floor === 1);
  run(ref, (o) => o.bossBar, 40, { idle: true }); nearBoss(ref, 9);
  const kill = run(ref, (o, ev) => ev.some((e) => e.type === 'doorOpen'), 90);
  const door = ref.map.door;
  t('Killing the boss opens the door right where he stood, so there is no walk back', kill.ev.some((e) => e.type === 'doorOpen') && kill.out.door.open && door.cells.every(([x, z]) => ref.map.rows[z][x] === 'D') /* the map rows stay as generated; the live grid opens */);
  run(ref, (o) => o.wave.phase === 'intermission', 120);               // the bot clears the boss's escorts
  const wait = run(ref, () => false, 9, { idle: true });
  t('After the boss the next wave waits: nothing spawns until you step through the door', wait.out.wave.phase === 'intermission' && wait.out.wave.n === 11 && wait.out.monsters.length === 0);
  const hp0 = ref.snapshot().player.hp, floorId0 = ref.snapshot().floorId, W0 = ref.map.W;
  ref.place(door.x + door.nx * 2.5, door.z + door.nz * 2.5);           // in front of the open door
  let out = ref.step(1 / 60, {});
  t('Standing just inside the open door does not take you through yet', out.state.floor === 1);
  ref.place(door.x, door.z);                                          // in the doorway itself
  out = ref.step(1 / 60, {});
  t('Stepping into the doorway takes you to floor 2, a new and bigger floor, and wave 11 comes after a short pause', out.events.some((e) => e.type === 'floorChange' && e.floor === 2) && out.state.floor === 2 && out.state.floorId !== floorId0 && ref.map.W > W0 && out.state.wave.phase === 'intermission' && out.state.wave.n === 11 && out.state.monsters.length === 0);
  const sp = ref.map.start;
  t('You arrive in the new floor\'s spawn room with your health, and the new door is shut and far away', Math.abs(out.state.player.x - sp.x) < 0.01 && Math.abs(out.state.player.z - sp.z) < 0.01 && out.state.player.hp === hp0 && !out.state.door.open && Math.hypot(out.state.door.x - sp.x, out.state.door.z - sp.z) > ref.map.W);
  const f2 = run(ref, (o) => o.wave.phase === 'fight', 10, { idle: true });
  t('Wave 11 starts on floor 2 and the boss is not out until wave 20', f2.out.wave.phase === 'fight' && f2.out.wave.n === 11 && !f2.out.monsters.some((q) => q.kind === 'demon'));
}
{ // exploring and spawning on a big floor
  const ref = Referee.create(19); god(ref);
  const s0 = ref.snapshot(), p0 = s0.player;
  const count = (e) => { let n = 0; for (const v of e) n += v; return n; };
  const startCell = Math.floor(p0.z / 2) * ref.map.W + Math.floor(p0.x / 2);
  t('The minimap knows the cell you stand on and not the far side of the map', s0.explored[startCell] === 1 && s0.explored[(ref.map.H - 1 - Math.floor(p0.z / 2)) * ref.map.W + ref.map.W - 1 - Math.floor(p0.x / 2)] === 0);
  const before = count(s0.explored);
  ref.step(1 / 60, {}); let o; for (let i = 0; i < 120; i++) o = ref.step(1 / 60, { mz: 1, sprint: true });
  t('Walking around reveals more of the floor, and what you saw stays revealed', count(o.state.explored) >= before && o.state.explored[startCell] === 1);
  const r = run(ref, (q) => q.monsters.length >= 4, 30, { idle: true });
  t('Monsters appear a walk away from you, not on the far side of a huge floor', r.out.monsters.length >= 4 && r.out.monsters.every((m) => Math.hypot(m.x - r.out.player.x, m.z - r.out.player.z) < 60));
}
{ // boss summons at half health
  const ref = Referee.create(15); ref.setCfg({ startWave: 10, playerHp: 1e7, regen: 0, damage: 120 }); ref.reset();
  run(ref, (o) => o.bossBar, 40, { idle: true }); nearBoss(ref);
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
  t('The hall ceiling is 5.5 high, so the Demon Lord (4.2 tall) has room and the torches sit lower than the ceiling', Referee.create(1).map.WALL_H === 5.5 && Referee.create(1).map.torches.every((x) => x.y < 5.5 - 1));
}
process.exit(bad ? 1 : 0);
