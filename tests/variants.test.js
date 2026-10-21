// Variant monsters (Ember, Frost, Venom) and what burn, freeze and poison do to YOU. Plain sentences. Run: node tests/variants.test.js
const Referee = require('../src/referee.js'), VR = require('../src/referee_variants.js'), RA = require('../src/referee_ailments.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const seq = (a) => { let i = 0; return () => a[i++ % a.length]; };
const dice = (seed) => { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };

// ---- who is a variant
t('Floor 1 has no variant monsters at all, and rolling for it uses no dice', (() => { let used = 0; const r = () => { used++; return 0; }; return VR.roll(1, r) === null && used === 0; })());
t('From floor 2 some monsters are variants, and deeper floors have more of them', (() => { const share = (f) => { const r = dice(5); let n = 0; for (let i = 0; i < 4000; i++) if (VR.roll(f, r)) n++; return n / 4000; }; return share(2) > 0.05 && share(4) > share(2) * 1.5 && share(30) <= VR.RULES.max + 0.03; })());
t('All three variants turn up', (() => { const s = new Set(), r = dice(9); for (let i = 0; i < 400; i++) { const v = VR.roll(6, r); if (v) s.add(v); } return VR.IDS.every((v) => s.has(v)); })());
t('A boss is never a variant on floors 1 and 2, and always one from floor 5', (() => { for (let seed = 1; seed < 40; seed++) { if (VR.forBoss(1, seed) || VR.forBoss(2, seed) || !VR.forBoss(5, seed) || !VR.forBoss(9, seed)) return false; } return true; })());
t('The same seed and floor always give the same boss variant', VR.forBoss(5, 77) === VR.forBoss(5, 77) && VR.forBoss(6, 12) === VR.forBoss(6, 12));
t('Each variant has its own ailment, a weak spot and a resistance', VR.IDS.every((id) => { const v = VR.VARIANTS[id]; return v.ail && v.weak && v.resist && v.weak !== v.resist; }) && new Set(VR.IDS.map((i) => VR.VARIANTS[i].ail)).size === 3);

// ---- the ailments on their own
const mk = () => { const o = { hp: 100, lost: 0 }; const a = RA.create({ maxHp: () => 100, dot: (d, kill) => { o.hp -= d; if (!kill && o.hp < 1) o.hp = 1; } }); return { o, a }; };
{
  const { o, a } = mk(); a.inflict('burn'); for (let i = 0; i < 60; i++) a.update(1 / 60, false);
  t('Burning costs you health every second', o.hp < 98 && o.hp > 95);
  const b = mk(); b.a.inflict('burn'); b.a.update(0.5, true);
  t('A slide puts the fire out', b.a.view().burn === 0 && b.o.hp === 100);
  const c = mk(); c.a.inflict('burn'); for (let i = 0; i < 600; i++) c.a.update(1 / 60, false);
  t('A burn runs out by itself', c.a.view().burn === 0);
}
{
  const { o, a } = mk(); a.inflict('poison'); for (let i = 0; i < 60 * 9; i++) a.update(1 / 60, false);
  t('Poison hurts for longer than a burn and then wears off', o.hp < 95 && a.view().poison === 0);
  const z = { hp: 1.2 }; const p = RA.create({ maxHp: () => 100, dot: (d, kill) => { z.hp -= d; if (!kill && z.hp < 1) z.hp = 1; } }); p.inflict('poison'); for (let i = 0; i < 600; i++) p.update(1 / 60, false);
  t('Poison alone never kills you: it leaves you on 1 health', z.hp === 1);
  t('Burn or poison stops your health coming back, a plain moment does not', (() => { const q = mk(); const base = q.a.blocksHealing(); q.a.inflict('poison'); return !base && q.a.blocksHealing(); })());
}
{
  const { a } = mk(); const base = a.speedMul(); a.inflict('freeze');
  t('Freezing slows you to half speed for a couple of seconds, then you are free', base === 1 && a.speedMul() === 0.5 && (() => { for (let i = 0; i < 200; i++) a.update(1 / 60, false); return a.speedMul() === 1; })());
  const s = mk(); s.a.inflict('burn'); s.a.inflict('burn', 50);
  t('Being hit again never stacks a timer past the cap', s.a.view().burn <= RA.RULES.stackCap);
}

// ---- in a real run: a variant's blow puts its ailment on you
const go = (r, secs, inp) => { let o; const ev = []; for (let i = 0; i < Math.round(secs * 60); i++) { o = r.step(1 / 60, inp || {}); ev.push(...o.events); } return { s: o.state, ev }; };
const quiet = (extra) => { const r = Referee.create(5); r.setCfg(Object.assign({ playerHp: 1e5, regen: 0, gunDrops: false, locks: false }, extra || {})); r.reset(); r.place(r.map.start.x, r.map.start.z, 0); go(r, 1.7); return r; };
const struck = (variant) => {
  const r = quiet(); const x = r.map.start.x, z = r.map.start.z;
  if (variant) r.spawnVariant('goblin', x, z - 1.2, variant); else r.spawnAt('goblin', x, z - 1.2);
  let out; for (let i = 0; i < 300; i++) { out = r.step(1 / 60, {}); if (out.events.some((e) => e.type === 'playerHit')) break; }
  return out.state.player.ail;
};
{
  const e = struck('ember'), f = struck('frost'), v = struck('venom'), p = struck(null);
  t('A blow from an Ember monster sets you burning', e.burn > 0 && !e.freeze && !e.poison);
  t('A blow from a Frost monster freezes you', f.freeze > 0 && !f.burn);
  t('A blow from a Venom monster poisons you', v.poison > 0 && !v.burn);
  t('A plain monster puts nothing on you', p.burn === 0 && p.freeze === 0 && p.poison === 0);
}
{
  const r = quiet(), x = r.map.start.x, z = r.map.start.z; r.spawnAt('flame', x, z - 8);
  let burnt = false; for (let i = 0; i < 60 * 14 && !burnt; i++) { const o = r.step(1 / 60, {}); burnt = o.state.player.ail.burn > 0; }
  t('A fireball from a Flame Spirit sets you burning', burnt);
}
{
  const r = quiet(), x = r.map.start.x, z = r.map.start.z; r.spawnVariant('goblin', x, z - 1.2, 'ember');
  let hp0 = 0; for (let i = 0; i < 300; i++) { const o = r.step(1 / 60, {}); if (o.events.some((e) => e.type === 'playerHit')) { hp0 = o.state.player.hp; break; } }
  r.clearWave && r.clearWave(); const o = go(r, 1.5);
  t('While you burn your health keeps dropping with nobody hitting you', hp0 > 0 && o.s.player.hp < hp0 - 5);
}
{
  const r = quiet(), x = r.map.start.x, z = r.map.start.z; r.spawnVariant('goblin', x, z - 1.2, 'frost'); r.spawnAt('golem', x, z - 30);
  let frozen = false; for (let i = 0; i < 300 && !frozen; i++) frozen = r.step(1 / 60, {}).state.player.ail.freeze > 0;
  const walk = () => { const a = r.snapshot().player, o = go(r, 0.5, { mz: 1 }), b = o.s.player; return Math.hypot(b.x - a.x, b.z - a.z); };
  const slow = walk(); r.clearWave && r.clearWave(); go(r, 3.5); const free = walk();
  t('A frozen you walks slower than a free you', frozen && slow < free * 0.75);
}

// ---- weak spots
{
  const hitFor = (gun, variant) => {
    const r = quiet({ startGun: 'pistol_service', magSize: 1000, spread: 0, spreadAds: 0 }); r.equipGun(gun, 1); go(r, 0.5);
    const x = r.map.start.x, z = r.map.start.z; if (variant) r.spawnVariant('golem', x, z - 6, variant); else r.spawnAt('golem', x, z - 6);
    const m0 = r.snapshot().monsters.find((m) => Math.abs(m.x - x) < 0.05); const hp0 = m0.hp;
    go(r, 1 / 60, { fire: true }); const m1 = r.snapshot().monsters.find((m) => m.id === m0.id); return hp0 - m1.hp;
  };
  const plainDmg = hitFor('pistol_cannon', null);
  t('A fire gun hurts a Frost monster much more than a plain one', hitFor('pistol_cannon', 'frost') > plainDmg * 1.3 / VR.VARIANTS.frost.hp * VR.VARIANTS.frost.hp);
  t('An ice gun barely scratches a Frost monster and a fire gun barely scratches an Ember one', hitFor('pistol_duelist', 'frost') < hitFor('pistol_duelist', null) * 0.8 && hitFor('pistol_cannon', 'ember') < hitFor('pistol_cannon', null) * 0.8);
  t('A Venom monster is weak to light guns', hitFor('sniper_bolt', 'venom') > hitFor('sniper_bolt', null) * 1.3);
}
console.log(bad ? bad + ' failed' : 'all variant checks passed'); process.exit(bad ? 1 : 0);
