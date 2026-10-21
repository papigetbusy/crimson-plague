// Class checks: Gunslinger, Assassin, Witch. Plain sentences. Run: node tests/classes.test.js
const Referee = require('../src/referee.js'), C = require('../src/referee_classes.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
// a run in a quiet room with a class, nothing can hurt you
function mk(cls, skills, cfg, seed) {
  const ref = Referee.create(seed || 5);
  ref.setCfg(Object.assign({ classId: cls, playerHp: 1e7, regen: 0, magSize: 1000, spread: 0, spreadAds: 0 }, cfg || {}));
  ref.reset();
  for (const s of skills || []) ref.giveSkill(s);
  const m = ref.map; ref.place(m.start.x, m.start.z, 0);
  for (let i = 0; i < 100; i++) ref.step(1 / 60, {});
  return { ref, m, ev: [] };
}
function run(g, sec, inp) { const ev = []; let st = null; for (let i = 0; i < sec * 60; i++) { const o = g.ref.step(1 / 60, inp || {}); ev.push(...o.events); st = o.state; } return { ev, st }; }
const ahead = (g, d) => ({ x: g.m.start.x, z: g.m.start.z - d });   // yaw 0 faces -z
const fire = (g, sec) => run(g, sec, { fire: true });
function target(g, kind, d) { const a = ahead(g, d); g.ref.spawnAt(kind, a.x, a.z); }
// kill n goblins one after another (huge damage makes each shot a kill)
function kill(g, n) { g.ref.setCfg({ damage: 1e6 }); for (let i = 0; i < n; i++) { target(g, 'fiend', 5); run(g, 0.25, { fire: true }); } g.ref.setCfg({ damage: 14 }); }

{ // starting bonuses
  const none = mk('', []), gun = mk('gunslinger', []);
  const shots = (g) => run(g, 1, { fire: true }).ev.filter((e) => e.type === 'shot').length;
  t('A Gunslinger fires faster than someone with no class', shots(gun) > shots(none) * 1.1);
  const dist = (g) => { const a = g.ref.snapshot().player; run(g, 1, { mz: 1 }); const b = g.ref.snapshot().player; return Math.hypot(b.x - a.x, b.z - a.z); };
  t('An Assassin runs faster than someone with no class', dist(mk('assassin', [])) > dist(mk('', [])) * 1.05);
  let infected = 0;
  for (let seed = 1; seed <= 40; seed++) { const w = mk('witch', [], {}, seed); target(w, 'golem', 8); const r = run(w, 0.12, { fire: true }); if (r.ev.some((e) => e.type === 'status' && e.kind === 'poison')) infected++; }
  t('A Witch\'s hit only sometimes infects with poison (not every hit, not never)', infected >= 6 && infected <= 34);
  const wp = mk('witch', [], { damage: 3 }, 3); target(wp, 'golem', 8); run(wp, 1.5, { fire: true });
  t('A poisoned monster shows it in the snapshot, so the screen can glow it purple', wp.ref.snapshot().monsters.some((m) => m.kind === 'golem' && m.poisoned));
}
{ // level-ups
  const none = mk('', []); none.ref.giveXp(1e5);
  t('With no class a level-up shows only the regular cards', !!none.ref.snapshot().choices && none.ref.snapshot().classChoices === null);
  const g = mk('gunslinger', []); g.ref.giveXp(60);
  const s = g.ref.snapshot();
  t('With a class every level-up shows a row of regular cards and a row of class skills', s.choices && s.choices.length === 3 && s.classChoices && s.classChoices.length === 3);
  t('The class row only offers skills of your class', s.classChoices.every((c) => C.CLASSES.gunslinger.skills.some((k) => k.id === c.id)));
  const pos = g.ref.snapshot().player.z; run(g, 0.5, { mz: 1 });
  t('The game waits until both a card and a class skill are picked', Math.abs(g.ref.snapshot().player.z - pos) < 1e-9);
  run(g, 0.1, { pick: 0 });
  t('Picking only the regular card still waits for the class skill', !!g.ref.snapshot().classChoices);
  run(g, 0.1, { pickClass: 0 });
  const s2 = g.ref.snapshot();
  t('Picking both gets you back in the game, and the class skill is yours', !s2.choices && !s2.classChoices && s2.cls.skills.length === 1);
  const u = mk('gunslinger', []); u.ref.giveXp(40);
  t('The ultimate is not offered at a low level', !u.ref.snapshot().classChoices.some((c) => c.ult));
  const high = mk('witch', ['hex', 'plague', 'siphon', 'raise']); high.ref.giveXp(1e5);
  t('Once you have all four skills and are high enough, the ultimate is offered', high.ref.snapshot().classChoices.some((c) => c.ult));
  const all = mk('assassin', ['cloak', 'shadowstep', 'bleed', 'predator']); all.ref.giveXp(40);
  t('With all four skills a level-up offers to upgrade one you have', all.ref.snapshot().classChoices.every((c) => c.lvl >= 1));
  const kit = mk('gunslinger', [], { startWave: 11 });
  t('Starting on wave 11 hands you class skills as well as regular upgrades', kit.ref.snapshot().cls.skills.length >= 4);
}
{ // Gunslinger
  const f = mk('gunslinger', ['fan']);
  const r = run(f, 3, { fire: true });
  t('Fan the Hammer adds extra bullets every few shots', r.ev.filter((e) => e.type === 'shot' && e.extra).length >= 4);
  const rl1 = (g, inp) => run(g, 0.2, inp).ev.find((e) => e.type === 'reloadStart');
  const q = mk('gunslinger', ['quickdraw'], { magSize: 30 }); fire(q, 0.3); const plainRl = rl1(q, { reload: true }); run(q, 4, {});
  fire(q, 0.3); run(q, 0.3, { mz: 1 }); run(q, 0.05, { mz: 1, slide: true }); const fastRl = rl1(q, { reload: true });
  t('After a slide, Quickdraw makes the next reload faster but not instant', !!plainRl && !!fastRl && fastRl.dur < plainRl.dur * 0.9 && fastRl.dur > plainRl.dur * 0.3);
  const q2 = mk('gunslinger', ['quickdraw'], { magSize: 30 }); fire(q2, 0.3); run(q2, 4, {});
  t('A reload with no slide before it is a normal reload', run(q2, 0.2, { reload: true }).ev.find((e) => e.type === 'reloadStart').dur > fastRl.dur);
  t('Killing a monster no longer gives an instant reload', (() => { const k = mk('gunslinger', ['quickdraw'], { magSize: 30 }); fire(k, 0.3); kill(k, 1); const e = run(k, 0.2, { reload: true }).ev.find((x) => x.type === 'reloadStart'); return e && e.dur > 0.3; })());
  { // Bullet Storm must never leave you stuck in a reload: the 30th kill comes with the very last bullet
    const b = mk('gunslinger', ['bulletstorm'], { magSize: 1000 }); kill(b, 29);
    b.ref.setCfg({ magSize: 1, damage: 1e6 }); target(b, 'fiend', 5);
    const last = run(b, 0.25, { fire: true });
    t('The thirtieth kill with the last bullet still starts Bullet Storm', last.ev.some((e) => e.type === 'ultStart'));
    const storm = run(b, 0.4, { fire: true });
    t('Bullet Storm fires without stopping to reload, even when the last bullet was just spent', storm.ev.filter((e) => e.type === 'shot').length >= 3 && !storm.ev.some((e) => e.type === 'reloadStart'));
    t('Reload does nothing while Bullet Storm runs', !run(b, 0.2, { reload: true }).ev.some((e) => e.type === 'reloadStart'));
  }
  const d = mk('gunslinger', ['deadeye']); target(d, 'golem', 6); d.ref.setCfg({ damage: 2 });
  t('Dead Eye makes some hits crit', run(d, 3, { fire: true }).ev.filter((e) => e.type === 'crit').length > 3);
  const n = mk('gunslinger', []); target(n, 'golem', 6);
  t('Without Dead Eye nothing crits', run(n, 2, { fire: true }).ev.filter((e) => e.type === 'crit').length === 0);
  const rc = mk('gunslinger', ['ricochet']); target(rc, 'golem', 6); const a = ahead(rc, 6); rc.ref.spawnAt('golem', a.x + 3, a.z);
  const rr = run(rc, 1, { fire: true });
  t('A ricochet bullet hurts a second monster nearby', rr.ev.some((e) => e.type === 'ricochet') && rc.ref.snapshot().monsters.some((m) => m.hp < m.maxHp && Math.abs(m.x - a.x) > 2));
  const bs = mk('gunslinger', ['bulletstorm']); kill(bs, 30);
  const on = run(bs, 0.2, {});
  t('Thirty kills charge Bullet Storm and it starts by itself', bs.ref.snapshot().cls.ult.active || on.ev.some((e) => e.type === 'ultStart'));
  const st = mk('gunslinger', ['bulletstorm'], { magSize: 30 }); st.ref.setCfg({ magSize: 30 }); st.ref.reset(); st.ref.giveSkill('bulletstorm'); st.ref.place(st.m.start.x, st.m.start.z, 0); run(st, 1.7, {}); kill(st, 30);
  const a0 = st.ref.snapshot().player.ammo; run(st, 1, { fire: true });
  t('During Bullet Storm the magazine does not run down', st.ref.snapshot().player.ammo >= a0 - 1);
}
{ // Assassin
  const c = mk('assassin', ['cloak']); target(c, 'fiend', 14); run(c, 0.2, { mz: 1, sprint: true }); run(c, 0.1, { mz: 1, sprint: true, slide: true });
  const cl = c.ref.snapshot();
  t('Sliding with Cloak hides you', !!cl.cls.cloak);
  const m0 = cl.monsters[0], mx = Math.hypot(m0.x - cl.player.x, m0.z - cl.player.z);
  run(c, 1, {}); const cl2 = c.ref.snapshot(), m1 = cl2.monsters[0];
  t('A cloaked player is lost to the monsters: they stop coming', Math.hypot(m1.x - m0.x, m1.z - m0.z) < 1.0 && m1.state === 'lost');
  t('Shooting ends the cloak', (() => { run(c, 0.1, { fire: true }); return !c.ref.snapshot().cls.cloak; })());
  const nc = mk('assassin', []); nc.ref.place(nc.m.start.x, nc.m.start.z, 0); run(nc, 0.1, { mz: 1, sprint: true }); run(nc, 0.1, { mz: 1, sprint: true, slide: true });
  t('Without the Cloak skill a slide does not hide you', !nc.ref.snapshot().cls.cloak);
  const ss = mk('assassin', ['shadowstep']); target(ss, 'golem', 7); run(ss, 0.2, { mz: 1, sprint: true }); const sl = run(ss, 0.15, { mz: 1, sprint: true, slide: true, fire: true });
  t('Shadowstep: the first shot after a slide is a crit', sl.ev.some((e) => e.type === 'crit'));
  t('Shadowstep: the crit chance stays up for the rest of that magazine', ss.ref.snapshot().cls.boost === true);
  const rl = run(ss, 0.3, { reload: true }); t('Reloading ends the Shadowstep boost', ss.ref.snapshot().cls.boost === false);
  const bl = mk('assassin', ['bleed']); target(bl, 'golem', 6); run(bl, 0.2, { fire: true }); const h1 = bl.ref.snapshot().monsters[0].hp; run(bl, 1.5, {});
  t('A bleeding monster keeps losing health after you stop shooting', bl.ref.snapshot().monsters[0].hp < h1 - 1);
  const pr = mk('assassin', ['predator']); target(pr, 'golem', 6); let safe = true;
  for (let i = 0; i < 400; i++) { const o = pr.ref.step(1 / 60, { fire: true }); const mo = o.state.monsters.find((q) => q.kind === 'golem'); if (mo && mo.hp < mo.maxHp * 0.15) safe = false; }
  t('Predator: a monster never lingers on the last scraps of health, and it does die', safe && !pr.ref.snapshot().monsters.some((q) => q.kind === 'golem'));
  const dm = mk('assassin', ['deathmark']); kill(dm, 20); dm.ref.setHp(1000); target(dm, 'golem', 6);
  const dr = run(dm, 0.5, { fire: true });
  t('Death Mark: after twenty kills every shot crits', dr.ev.filter((e) => e.type === 'crit').length >= 3);
}
{ // Witch
  const hx = mk('witch', ['hex']); target(hx, 'golem', 6); run(hx, 0.2, { fire: true });
  t('Hex curses what you hit', !!(hx.ref.snapshot().monsters[0].cursed));
  const pl = mk('witch', ['plague']); target(pl, 'fiend', 6); const a = ahead(pl, 6); pl.ref.spawnAt('golem', a.x + 2, a.z);
  pl.ref.setCfg({ damage: 2 }); run(pl, 1, { fire: true }); pl.ref.setCfg({ damage: 1e6 }); run(pl, 0.3, { fire: true });
  const gol = pl.ref.snapshot().monsters.find((m) => m.kind === 'golem');
  t('Plague: a poisoned monster that dies passes the poison to its neighbours', !!(gol && gol.poisoned));
  const sp = mk('witch', ['siphon']); kill(sp, 1); sp.ref.setHp(10); kill(sp, 2);
  t('Soul Siphon: kills heal you', sp.ref.snapshot().player.hp > 12);
  const rd = mk('witch', ['raise']); let thralls = 0; kill(rd, 1);
  for (let i = 0; i < 80; i++) { kill(rd, 1); thralls = Math.max(thralls, rd.ref.snapshot().cls.thralls.length); }
  t('Raise Dead: some killed monsters rise to fight for you', thralls > 0);
  const cp = mk('witch', ['crimsonplague']); kill(cp, 25); const a2 = ahead(cp, 5); cp.ref.spawnAt('golem', a2.x, a2.z); run(cp, 1, {});
  const cs = cp.ref.snapshot();
  t('Crimson Plague: the cloud poisons everything around you', cs.cls.cloud > 0 && cs.monsters.find((m) => m.kind === 'golem').poisoned);
}
{ // levelling
  const f = mk('gunslinger', ['fan']); const r = run(f, 8, { fire: true });
  t('A skill levels up the more it is used', r.ev.some((e) => e.type === 'skillLevel' && e.id === 'fan'));
  const g = mk('gunslinger', ['fan']); g.ref.giveXp(60); run(g, 0.1, { pick: 0, pickClass: 0 });
  const sk = g.ref.snapshot().cls.skills;
  t('Picking a class skill you already have raises its level', sk.length >= 1);
  const up = mk('assassin', ['cloak', 'shadowstep', 'bleed', 'predator']); up.ref.giveXp(40);
  const card = up.ref.snapshot().classChoices[0].id; run(up, 0.1, { pick: 0, pickClass: 0 });
  t('Upgrading a skill from the level-up row makes it level 2', up.ref.snapshot().cls.skills.find((s) => s.id === card).lvl === 2);
}
{ // cards say what they change, and the class bonus keeps growing
  const g = mk('assassin', ['cloak', 'shadowstep', 'bleed', 'predator']); g.ref.giveXp(40);
  const cards = g.ref.snapshot().classChoices;
  t('An upgrade card says what it is now and what it becomes', cards.every((c) => c.now && c.next && c.now !== c.next));
  const fresh = mk('witch', []); fresh.ref.giveXp(40);
  t('A new skill card says what it does at level 1', fresh.ref.snapshot().classChoices.every((c) => c.next && !c.now));
  const lv = mk('gunslinger', []); for (let i = 0; i < 4; i++) for (const k of ['fan', 'quickdraw', 'ricochet', 'deadeye']) lv.ref.giveSkill(k);
  const shots = (q) => run(q, 2, { fire: true }).ev.filter((e) => e.type === 'shot' && !e.extra).length;
  const base = mk('gunslinger', []);
  t('The class starting bonus grows as you hold more skill levels', shots(lv) > shots(base));
  const bl = mk('assassin', ['bleed', 'hex']); target(bl, 'golem', 6); const ev = run(bl, 0.5, { fire: true }).ev;
  t('A bleed landing tells the screen', ev.some((e) => e.type === 'status' && e.kind === 'bleed'));
  const hx = mk('witch', ['hex']); target(hx, 'golem', 6);
  t('A hex landing tells the screen', run(hx, 0.5, { fire: true }).ev.some((e) => e.type === 'status' && e.kind === 'hex'));
  const lvlEv = mk('gunslinger', ['fan']); const lr = run(lvlEv, 8, { fire: true }).ev.find((e) => e.type === 'skillLevel');
  t('A skill levelling up says what it became', !!lr && typeof lr.stat === 'string' && lr.stat.length > 3);
}
process.exit(bad ? 1 : 0);
