// Gun status effects: what each colour does to a monster. Plain sentences. Run: node tests/gunfx.test.js
const Referee = require('../src/referee.js'), W = require('../src/referee_weapons.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const go = (r, secs, inp) => { let o; const ev = []; for (let i = 0; i < Math.round(secs * 60); i++) { o = r.step(1 / 60, inp || {}); ev.push(...o.events); } return { s: o.state, ev }; };
// a quiet run holding this gun; golems (lots of health) stand ahead where we point; nothing can hurt you
function mk(gun, rarity, others) {
  const r = Referee.create(5); r.setCfg({ playerHp: 1e7, regen: 0, startGun: 'pistol_service', gunDrops: false, magSize: 1000, spread: 0, spreadAds: 0 }); r.reset();
  r.place(r.map.start.x, r.map.start.z, 0); go(r, 1.7); r.equipGun(gun, rarity || 0); go(r, 0.4);
  r.spawnAt('golem', r.map.start.x, r.map.start.z - 6);
  for (const [dx, dz] of others || []) r.spawnAt('golem', r.map.start.x + dx, r.map.start.z - 6 + dz);
  return r;
}
const mons = (r) => r.snapshot().monsters;
const target = (r) => mons(r).filter((m) => Math.abs(m.x - r.map.start.x) < 0.05).sort((a, b) => b.z - a.z)[0] || mons(r)[0];
const shoot = (r) => go(r, 1 / 60, { fire: true });
const hpOf = (r, id) => { const m = mons(r).find((x) => x.id === id); return m ? m.hp : 0; };

{
  const a = mk('pistol_cannon', 1), id = target(a).id; shoot(a); const h0 = hpOf(a, id); go(a, 3.4); const h1 = hpOf(a, id);
  const b = mk('pistol_cannon', 4), idb = target(b).id; shoot(b); const hb0 = hpOf(b, idb); go(b, 3.4); const hb1 = hpOf(b, idb);
  t('A fire gun sets the monster burning: it keeps losing health after the hit', h0 - h1 > 5 && target(a));
  t('A better rarity of the same fire gun burns harder', (hb0 - hb1) > (h0 - h1) * 1.3);
  t('A burning monster is flagged for the screen, and the flag is gone once the burn is out', (() => { const c = mk('pistol_cannon', 1), ic = target(c).id; shoot(c); const on = mons(c).find((m) => m.id === ic).gx.burning; go(c, 3.6); return on && !mons(c).find((m) => m.id === ic).gx.burning; })());
}
{
  const a = mk('smg_bullpup', 1), id = target(a).id; shoot(a); const h0 = hpOf(a, id); go(a, 4.4); const h1 = hpOf(a, id);
  t('A poison gun poisons: the monster loses more health over the next seconds', h0 - h1 > 8);
}
{
  const plain = mk('pistol_service', 0), pid = target(plain).id, ice = mk('pistol_duelist', 1), iid = target(ice).id;
  const z0 = (r, id) => mons(r).find((m) => m.id === id).z; const pz = z0(plain, pid), iz = z0(ice, iid);
  shoot(plain); shoot(ice); go(plain, 1); go(ice, 1);
  t('An ice gun slows a monster: it covers much less ground than an unslowed one', (z0(plain, pid) - pz) > 0.5 && (z0(ice, iid) - iz) < (z0(plain, pid) - pz) * 0.75);
  const f = mk('pistol_duelist', 1), fid = target(f).id; for (let i = 0; i < 5; i++) { shoot(f); go(f, 0.3); }
  t('Five ice hits in a row freeze a monster solid', mons(f).find((m) => m.id === fid).gx.frozen === true);
}
{
  const r = mk('pistol_machine', 1, [[1.5, 0], [-1.5, 0], [30, 0]]), ids = mons(r).map((m) => m.id), hp0 = Object.fromEntries(mons(r).map((m) => [m.id, m.hp]));
  const tid = target(r).id; const o = shoot(r);
  const hurt = mons(r).filter((m) => m.hp < hp0[m.id] - 0.5 && m.id !== tid).length, far = mons(r).filter((m) => Math.abs(m.x - r.map.start.x) > 20).every((m) => m.hp >= hp0[m.id] - 0.001);
  t('An electric gun arcs lightning to monsters standing next to the one you hit, and not to far ones', hurt >= 1 && far && o.ev.some((e) => e.type === 'arc'));
}
{
  const r = mk('smg_compact', 1, [[1.5, 0], [30, 0]]), hp0 = Object.fromEntries(mons(r).map((m) => [m.id, m.hp])), tid = target(r).id; shoot(r); go(r, 0.1);
  const near = mons(r).filter((m) => m.id !== tid && Math.abs(m.x - r.map.start.x) < 3), farM = mons(r).filter((m) => Math.abs(m.x - r.map.start.x) > 20);
  t('A radiation gun hurts monsters around the target and marks them irradiated, but leaves far ones alone', near.length && near.every((m) => m.hp < hp0[m.id] && m.gx.irradiated) && farM.every((m) => m.hp >= hp0[m.id] - 0.001 && !(m.gx && m.gx.irradiated)));
}
{
  const r = mk('smg_tactical', 1); r.setHp(50); const tid = target(r).id; const o = shoot(r);
  t('A dark gun drains health back to you when it hits', r.snapshot().player.hp > 50);
  const w = mk('smg_tactical', 1), id2 = target(w).id, full = hpOf(w, id2); shoot(w); const a1 = hpOf(w, id2); go(w, 0.3); shoot(w); const a2 = hpOf(w, id2);
  t('A dark gun withers its target: the next hit on it does more damage than the first', (a1 - a2) > (full - a1) * 1.1 && mons(w).find((m) => m.id === id2).gx.withered === true);
}
{
  const r = mk('sniper_bolt', 1), id = target(r).id; shoot(r);
  t('A light gun smites: the monster is stunned for a moment', mons(r).find((m) => m.id === id).gx.smitten === true);
}
{
  const r = mk('pistol_cannon', 4), id = target(r).id; shoot(r); const g = mons(r).find((m) => m.id === id).gx;
  t('A legendary fire gun carries a second status too, and both land on the monster at once', r.snapshot().player.gun.status.length === 2 && g.burning && Object.values(g).filter((v) => v === true).length >= 2);
}
{
  const r = mk('pistol_service', 0), id = target(r).id; shoot(r); go(r, 1);
  t('The plain silver pistol has no status: nothing burns, chills or poisons', (() => { const g = mons(r).find((m) => m.id === id).gx; return !g || (!g.burning && !g.toxic && !g.chilled && !g.irradiated && !g.withered); })());
}
console.log(bad ? bad + ' FAILED' : 'all gun effect checks passed'); t('A common gun carries no status effect, whatever its type', Object.keys(W.GUNS).every((id) => W.make(id, 0, 1, () => 0.5, '').status.length === 0));
t('An uncommon or better gun carries the status its kind is known for', Object.keys(W.GUNS).filter((id) => W.GUNS[id].status.length).every((id) => [1, 2, 3].every((r) => JSON.stringify(W.make(id, r, 1, () => 0.5, '').status) === JSON.stringify(W.GUNS[id].status))));
t('A common gun dropped by monsters never carries a status, over many drops', (() => { let s = 11; const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; for (let i = 0; i < 400; i++) { const g = W.roll(1 + (i % 5), rng, 0, ''); if (g.rarity === 0 && g.status.length) return false; } return true; })());
t('Only a legendary gun carries two statuses', (() => { let s = 5; const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; for (let i = 0; i < 300; i++) for (let r = 0; r < 5; r++) { const g = W.make(Object.keys(W.GUNS)[i % 20], r, 1, rng, ''); if ((r === 4) !== (g.status.length === 2) && Object.keys(W.GUNS)[i % 20] !== 'pistol_service' && Object.keys(W.GUNS)[i % 20] !== 'rifle' && g.status.length > 2) return false; if (r < 4 && g.status.length > 1) return false; } return true; })());
{ // held monsters do not fight back
  const close = (gun, rar) => { const r = Referee.create(5); r.setCfg({ playerHp: 1e7, regen: 0, startGun: 'pistol_service', gunDrops: false, magSize: 1000, spread: 0, spreadAds: 0 }); r.reset(); r.place(r.map.start.x, r.map.start.z, 0); go(r, 1.7); r.equipGun(gun, rar); go(r, 0.4); r.spawnAt('golem', r.map.start.x, r.map.start.z - 1.4); return r; };
  const hp = (r) => r.snapshot().player.hp;
  const ctl = close('pistol_service', 0); const h0 = hp(ctl); go(ctl, 1.2); const hurtCtl = h0 - hp(ctl);
  const sm = close('sniper_bolt', 1); const s0 = hp(sm); go(sm, 0.05, { fire: true }); go(sm, 0.6); const hurtSmite = s0 - hp(sm);
  t('A monster hit by a light gun is stunned and does not hurt you while the stun lasts', hurtCtl > 0 && hurtSmite === 0);
  const ic = close('pistol_duelist', 1); let frozenAt = -1, i0 = 0;
  for (let i = 0; i < 900 && frozenAt < 0; i++) { ic.step(1 / 60, { fire: true }); const m = ic.snapshot().monsters[0]; if (m && m.gx && m.gx.frozen) { frozenAt = i; i0 = hp(ic); } }
  go(ic, 0.3); const stillFrozen = ic.snapshot().monsters[0].gx.frozen;
  t('A monster frozen solid by an ice gun does not hurt you while it is frozen', frozenAt >= 0 && stillFrozen && hp(ic) === i0);
}
t('A boss is frozen for only a small part of the time a normal monster is', (() => { const FX = require('../src/referee_gunfx.js'); return FX.FX.bossFreeze < 0.5; })());
process.exit(bad ? 1 : 0);
