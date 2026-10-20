// Monster roster checks: wind-up and reach, ranged attackers, projectiles, the slide, and which monsters unlock when. Plain sentences. Run: node tests/monsters.test.js
const Referee = require('../src/referee.js'), D = require('../src/referee_data.js'), Shots = require('../src/referee_shots.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const room = () => { const ref = Referee.create(5); ref.setCfg({ playerHp: 1e7, regen: 0 }); ref.reset(); const m = ref.map; ref.place(m.start.x, m.start.z, 0); for (let i = 0; i < 100; i++) ref.step(1 / 60, {}); return { ref, m }; };   // the first moments after a place are untouchable, so let them pass
// run idle for sec seconds; returns what happened
function idle(ref, sec, inp) { const ev = []; let st = null; for (let i = 0; i < sec * 60; i++) { const o = ref.step(1 / 60, inp || {}); ev.push(...o.events); st = o.state; } return { ev, st }; }
const hits = (ev) => ev.filter((e) => e.type === 'playerHit');
const setWave = (ref, w) => { ref.setCfg({ startWave: w, playerHp: 1e7, regen: 0 }); ref.reset(); };

{ // wind-up and reach
  const { ref, m } = room(); ref.spawnAt('goblin', m.start.x + 1.7, m.start.z);
  const r = idle(ref, 0.45);
  t('A goblin that reaches you lands its blow within half a second, not after a long pause', hits(r.ev).length >= 1);
  const a = room(); a.ref.spawnAt('fiend', a.m.start.x, a.m.start.z + 1.9);
  t('A horned fiend 1.9 units away is already in reach (melee reach is longer than before)', hits(idle(a.ref, 0.6).ev).length >= 1);
  const b = room(); b.ref.spawnAt('goblin', b.m.start.x + 1.7, b.m.start.z);
  const rb = idle(b.ref, 0.1); b.ref.place(b.m.start.x - 6, b.m.start.z, 0); const rb2 = idle(b.ref, 0.12);
  t('Stepping well out of reach during the wind-up dodges the blow', hits(rb.ev).length + hits(rb2.ev).length === 0);
}
{ // ranged attackers
  const { ref, m } = room(); ref.spawnAt('mushroom', m.start.x + 8, m.start.z);
  const r = idle(ref, 4);
  t('A mushroom 8 units away rears back and spits, and the spit shows in the snapshot', r.ev.some((e) => e.type === 'shoot' && e.proj === 'spit'));
  let seen = false; const q = room(); q.ref.spawnAt('mushroom', q.m.start.x + 8, q.m.start.z);
  for (let i = 0; i < 4 * 60; i++) { const o = q.ref.step(1 / 60, {}); if (o.state.shots.length) seen = true; }
  t('Projectiles in flight are listed in the snapshot (for the screen to draw)', seen);
  const c = room(); c.ref.spawnAt('mushroom', c.m.start.x + 3, c.m.start.z); const rc = idle(c.ref, 2), mc = rc.st.monsters[0];
  t('A ranged monster backs away when you get close, to keep its distance', Math.hypot(mc.x - c.m.start.x, mc.z - c.m.start.z) > 4.5);
  const e = room(); e.ref.spawnAt('eyeball', e.m.start.x + 9, e.m.start.z);
  t('An eyeball throws fast lightning bolts', idle(e.ref, 4).ev.some((v) => v.type === 'shoot' && v.proj === 'bolt'));
  const f = room(); f.ref.spawnAt('flame', f.m.start.x + 9, f.m.start.z);
  t('A flame spirit hurls fireballs', idle(f.ref, 5).ev.some((v) => v.type === 'shoot' && v.proj === 'fire'));
  const g = room(); g.ref.spawnAt('mushroom', g.m.start.x + 8, g.m.start.z);
  t('A spit that is not dodged hurts you', hits(idle(g.ref, 6).ev).length >= 1);
  t('The floating monsters hover above the floor, the walkers do not', D.KINDS.eyeball.hover > 1 && D.KINDS.flame.hover > 1 && !D.KINDS.goblin.hover);
}
{ // projectiles on their own
  const ev = [], hurt = []; let wall = false, sliding = false;
  const S = Shots.create({ nextId: (() => { let n = 1; return () => n++; })(), solidAt: (x, z) => wall && (x > 5 || z > 5), player: () => ({ x: 4, z: 0, eye: 1.6, sliding }), hurt: (d) => hurt.push(d), event: (e) => ev.push(e) });
  const shoot = () => S.fire({ proj: 'fire', owner: 1, x: 0, y: 1.5, z: 0, tx: 4, tz: 0, ty: 1.25, speed: 8, r: 0.4, dmg: 5 });
  shoot(); for (let i = 0; i < 90; i++) S.update(1 / 60);
  t('A projectile that reaches you hurts you once and is gone', hurt.length === 1 && hurt[0] === 5 && S.view().length === 0);
  hurt.length = 0; sliding = true; shoot(); for (let i = 0; i < 90; i++) S.update(1 / 60);
  t('A projectile passes through you while you slide', hurt.length === 0);
  hurt.length = 0; sliding = false; wall = true; S.fire({ proj: 'spit', owner: 1, x: 0, y: 1.5, z: 0, tx: 0, tz: 20, ty: 1.5, speed: 8, r: 0.3, dmg: 5 }); for (let i = 0; i < 180; i++) S.update(1 / 60);
  t('A projectile stops at a wall', hurt.length === 0 && S.view().length === 0 && ev.some((e) => e.type === 'projHit' && !e.onPlayer));
}
{ // the slide
  const { ref, m } = room();
  idle(ref, 0.5, { mz: 1 });
  const o = ref.step(1 / 60, { mz: 1, slide: true });
  const p = ref.snapshot().player; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ref.spawnAt('goblin', p.x + dx, p.z + dz);
  let hurtDuring = 0, frames = 0;
  for (let i = 0; i < 60; i++) { const r = ref.step(1 / 60, { mz: 1 }); if (r.state.player.sliding) { frames++; hurtDuring += hits(r.events).length; } }
  t('Monsters standing right next to you cannot hurt you for the whole slide', frames > 5 && hurtDuring === 0);
}
{ // the Demon Lord fireball
  const ref = Referee.create(14); ref.setCfg({ startWave: 10, playerHp: 1e7, regen: 0 }); ref.reset();
  for (let i = 0; i < 40 * 60; i++) ref.step(1 / 60, { idle: true });
  const b = ref.snapshot().monsters.find((q) => q.kind === 'demon'), d = ref.map.door;
  ref.place(b.x + d.nx * 10, b.z + d.nz * 10, 0);
  const r = idle(ref, 12);
  t('Once awake the Demon Lord rears back and throws a fireball from range', r.ev.some((e) => e.type === 'shoot' && e.proj === 'fire'));
}
{ // unlocks
  const mk = (w) => { let a = 7 + w; const rng = () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; const c = new Set(); for (let i = 0; i < 6; i++) D.waveKinds(w, rng).forEach((k) => c.add(k)); return c; };
  t('Goblins are in wave 1; mushrooms start on wave 5', mk(1).has('goblin') && !mk(4).has('mushroom') && mk(8).has('mushroom'));
  t('Skeletons start with floor 2 (wave 11), eyeballs on wave 13, flame spirits on floor 3 (wave 21)', !mk(10).has('skeleton') && mk(12).has('skeleton') && !mk(12).has('eyeball') && mk(16).has('eyeball') && !mk(20).has('flame') && mk(24).has('flame'));
  const ref = Referee.create(9); setWave(ref, 25); let maxShoot = 0;
  for (let i = 0; i < 60 * 40; i++) { const o = ref.step(1 / 60, { idle: true }); maxShoot = Math.max(maxShoot, o.state.monsters.filter((q) => D.KINDS[q.kind].shoot && !D.KINDS[q.kind].boss).length); }
  t('No more than four ranged monsters are alive at once, so fights stay readable', maxShoot <= D.LOOP.shooterCap && maxShoot >= 1);
}
process.exit(bad ? 1 : 0);
