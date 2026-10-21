// New level-up gifts: Lucky Drops, Thick Skin, Gold Rush, Overcharge, Bounce Pad, Second Wind. Plain sentences. Run: node tests/gifts.test.js
const Referee = require('../src/referee.js'), D = require('../src/referee_data.js'), W = require('../src/referee_weapons.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
function mk(cfg) { const r = Referee.create(5); r.setCfg(Object.assign({ playerHp: 100, regen: 0, magSize: 1000, spread: 0, spreadAds: 0, startGun: 'pistol_service' }, cfg || {})); r.reset(); r.place(r.map.start.x, r.map.start.z, 0); for (let i = 0; i < 200; i++) r.step(1 / 60, {}); return r; }
const run = (r, sec, inp) => { const ev = []; let st = null; for (let i = 0; i < Math.round(sec * 60); i++) { const o = r.step(1 / 60, inp || {}); ev.push(...o.events); st = o.state; } return { ev, st }; };
const ids = D.SKILLS.map((s) => s.id);
t('The six new gifts are in the level-up list', ['luck', 'thick', 'gold', 'over', 'bounce', 'wind'].every((id) => ids.includes(id)));
t('Every gift has a name, a description and a stack limit', D.SKILLS.every((s) => s.name && s.desc && s.max >= 1 && s.per > 0));

// Thick Skin
{ const hit = (n) => { const r = mk({ playerHp: 1000, monsterAttackRate: 1 }); r.giveGift('thick', n); const hp0 = r.snapshot().player.hp; r.spawnAt('goblin', r.map.start.x, r.map.start.z - 1.0); run(r, 4); return hp0 - r.snapshot().player.hp; };
  const a = hit(0), b = hit(3);
  t('Thick Skin makes the same monster hurt you less', a > 0 && b < a * 0.9); }
// Second Wind
{ const r = mk({ playerHp: 10 }); r.giveGift('wind', 1); r.spawnAt('golem', r.map.start.x, r.map.start.z - 1.0); let saved = false, over = false, hp = 0; for (let i = 0; i < 600 && !saved; i++) { const o = r.step(1 / 60, {}); if (o.events.some((e) => e.type === 'secondWind')) { saved = true; over = !!o.state.over; hp = o.state.player.hp; } }
  t('Second Wind: a killing blow leaves you alive once per floor, with some health back', saved && !over && hp >= 4); }
{ const r = mk({ playerHp: 10 }); r.giveGift('wind', 1); r.spawnAt('golem', r.map.start.x, r.map.start.z - 1.0); r.spawnAt('golem', r.map.start.x + 1, r.map.start.z - 1.0); const o = run(r, 12);
  t('Second Wind works only once per floor: the next killing blow ends the run', o.ev.filter((e) => e.type === 'secondWind').length === 1 && !!o.st.over); }
{ const r = mk({ playerHp: 10 }); r.giveGift('wind', 0); r.spawnAt('golem', r.map.start.x, r.map.start.z - 1.0); const o = run(r, 8);
  t('Without Second Wind the same blow ends the run', !!o.st.over && !o.ev.some((e) => e.type === 'secondWind')); }
// Overcharge
{ const shots = (n) => { const r = mk(); r.giveGift('over', n); r.spawnAt('golem', r.map.start.x, r.map.start.z - 6); const dmgs = []; for (let i = 0; i < 400 && dmgs.length < 10; i++) { const o = r.step(1 / 60, { fire: true }); for (const e of o.events) if (e.type === 'hit') dmgs.push(e.dmg); } return dmgs; };
  const base = shots(0), over = shots(2);
  t('Overcharge: every fifth shot hits much harder than the shots between', over.length >= 6 && over[4] > over[0] * 2 && over[3] <= over[0] * 1.05 && Math.abs(base[4] - base[0]) < 1); }
// Gold Rush
{ const gold = (n) => { const r = mk({ damage: 1e5 }); r.giveGift('gold', n); const g0 = r.snapshot().gold; r.spawnAt('golem', r.map.start.x, r.map.start.z - 6); run(r, 3, { fire: true }); const o = run(r, 3, { mz: 1 }); return o.st.gold - g0; };
  const a = gold(0), b = gold(4);
  t('Gold Rush gives more gold from the same coins', a > 0 && b > a * 1.5); }
// Lucky Drops
{ const avg = (n) => { let sum = 0, cnt = 0; for (let seed = 1; seed <= 14; seed++) { const r = Referee.create(seed); r.setCfg({ playerHp: 1e7, regen: 0, magSize: 1e5, spread: 0, spreadAds: 0, startGun: 'pistol_service', damage: 1e6, startWave: 25, gunDrops: true, gearDrops: false, modDrops: false }); r.reset(); r.place(r.map.start.x, r.map.start.z, 0); r.giveGift('luck', n); for (let k = 0; k < 12; k++) r.spawnAt('golem', r.map.start.x, r.map.start.z - 4 - k * 0.3); for (let i = 0; i < 900; i++) r.step(1 / 60, { fire: true }); for (const p of r.snapshot().pickups) if (p.kind === 'gun') { sum += p.gun.rarity; cnt++; } } return cnt ? sum / cnt : 0; };
  t('With Lucky Drops the guns monsters really drop are of better rarity', avg(4) > avg(0) + 0.5);
  t('Lucky Drops is limited to four stacks in the list', D.SKILLS.find((s) => s.id === 'luck').max === 4); }
// Bounce Pad
{ const jumpPeak = (n) => { const r = mk(); r.giveGift('bounce', n); let peak = 0; run(r, 0.05, { jump: true }); for (let i = 0; i < 140; i++) { const o = r.step(1 / 60, {}); peak = Math.max(peak, o.state.player.eye); } return peak; };
  t('Bounce Pad makes you jump higher', jumpPeak(2) > jumpPeak(0) + 0.35);
  const slam = (n) => { const r = mk(); r.giveGift('bounce', n); r.spawnAt('golem', r.map.start.x + 1.5, r.map.start.z); const pick = () => r.snapshot().monsters.filter((m) => m.kind === 'golem').pop(); const h0 = pick().hp; const o = run(r, 1.4, { jump: true }); return { ev: o.ev, lost: h0 - (pick() ? pick().hp : 0) }; };
  const a = slam(0), b = slam(2);
  t('Landing with Bounce Pad slams monsters next to you', b.ev.some((e) => e.type === 'bounceSlam') && b.lost > a.lost + 1);
  t('Without Bounce Pad landing hurts nobody', !a.ev.some((e) => e.type === 'bounceSlam')); }
console.log(bad ? bad + ' FAILED' : 'all gift checks passed'); process.exit(bad ? 1 : 0);
