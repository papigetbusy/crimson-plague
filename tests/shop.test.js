// Gold, coins, the safe room and the merchant. Plain sentences. Run: node tests/shop.test.js
const Referee = require('../src/referee.js'), D = require('../src/referee_data.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const L = D.LOOP;
const fresh = (cls, wave) => { const ref = Referee.create(5); ref.setCfg({ startWave: wave || 1, playerHp: 1e7, regen: 0, classId: cls || 'gunslinger' }); ref.reset(); const m = ref.map; ref.place(m.start.x, m.start.z, 0); for (let i = 0; i < 100; i++) ref.step(1 / 60, {}); return ref; };
const levels = (ref) => { for (let i = 0; i < 30 && (ref.snapshot().choices || ref.snapshot().classChoices); i++) ref.step(1 / 60, { pick: 0, pickClass: 0 }); };   // the boss's soul gives levels: take the cards
const run = (ref, n, inp) => { let r; for (let i = 0; i < n; i++) r = ref.step(1 / 60, inp || {}); return r; };

{ // coins and gold
  const ref = fresh(); const m = ref.map;
  t('You start a run with no gold', ref.snapshot().gold === 0);
  ref.spawnAt('goblin', m.start.x + 3, m.start.z); ref.clearWave();
  const s = ref.snapshot();
  t('A dead monster drops a coin pile where it fell', s.coins.length === 1 && s.coins[0].v >= 1);
  run(ref, 60 * 3);
  t('Walking up to a coin picks it up and counts it as gold', ref.snapshot().gold >= 1 && ref.snapshot().coins.length === 0);
  const a = fresh(); a.spawnAt('goblin', a.map.start.x + 3, a.map.start.z); a.clearWave(); const small = a.snapshot().coins[0].v;
  const b = fresh(); b.spawnAt('golem', b.map.start.x + 3, b.map.start.z); b.clearWave(); const big = b.snapshot().coins[0].v;
  t('Tougher monsters drop more gold', big > small);
  const c = fresh(); c.spawnElite('goblin', c.map.start.x + 3, c.map.start.z); c.clearWave();
  t('An elite drops more gold than the same monster that is not one', c.snapshot().coins.reduce((n, k) => n + k.v, 0) > small);
}
{ // the safe room
  const ref = fresh('witch', 1); const m = ref.map;
  ref.spawnAt('demon', m.start.x + 10, m.start.z); ref.clearWave();
  let st = ref.snapshot();
  t('Killing the boss opens the door as before', st.door.open);
  ref.place(st.door.x - m.door.nx * 1, st.door.z - m.door.nz * 1, 0);
  let ev = []; for (let i = 0; i < 120; i++) { const r = ref.step(1 / 60, {}); ev = ev.concat(r.events); }
  st = ref.snapshot();
  t('Stepping through the boss door leads into the safe room, not the next floor', st.safe && st.floor === 1 && ev.some((e) => e.type === 'safeRoom'));
  t('The safe room has a merchant', !!st.merchant);
  t('No monsters come while you are in the safe room', (run(ref, 60 * 10), ref.snapshot().monsters.length === 0 && ref.snapshot().wave.phase === 'intermission'));
  t('The safe room door is already open', ref.snapshot().door.open);
}
{ // the shop
  const ref = fresh('witch', 1); const m = ref.map;
  ref.spawnAt('demon', m.start.x + 10, m.start.z); ref.clearWave();
  ref.place(m.door.x, m.door.z, 0); run(ref, 120);
  let st = ref.snapshot(); const mer = st.merchant;
  levels(ref); ref.place(mer.x, mer.z + 4, 0); run(ref, 10);
  t('Far from the merchant the shop stays shut', !ref.snapshot().shop);
  ref.place(mer.x, mer.z + 2, 0); run(ref, 5);
  st = ref.snapshot();
  t('Walking up to the merchant opens the shop with class skills and supplies', !!st.shop && st.shop.skills.length > 0 && st.shop.supplies.length === 2);
  ref.giveGold(-ref.snapshot().gold); st = ref.snapshot();
  t('With no gold nothing can be bought', st.shop.skills.every((s) => !s.afford));
  const before = JSON.stringify(st.cls.skills);
  run(ref, 1, { pickClass: 0 });
  t('Trying to buy a skill with no gold does nothing', JSON.stringify(ref.snapshot().cls.skills) === before && ref.snapshot().gold === 0);
  ref.giveGold(1000); st = ref.snapshot();
  const price = st.shop.skills[0].price, name = st.shop.skills[0].id;
  run(ref, 1, { pickClass: 0 }); st = ref.snapshot();
  t('Buying a class skill takes its price in gold', st.gold === 1000 - price);
  t('The bought class skill is now yours', st.cls.skills.some((s) => s.id === name));
  t('A bought skill leaves the shelf', !st.shop.skills.some((s) => s.id === name));
  ref.setHp(10); run(ref, 1, { pick: 0 }); st = ref.snapshot();
  t('Mend heals to full health for gold', st.player.hp === st.player.maxHp && st.gold === 1000 - price - L.shopHeal);
  run(ref, 1, { pick: 1 }); st = ref.snapshot();
  t('Leave closes the shop, and it does not pop open again while you stand there', !st.shop && (run(ref, 30), !ref.snapshot().shop));
  ref.place(mer.x + 12, mer.z, 0); run(ref, 5); ref.place(mer.x, mer.z + 2, 0); run(ref, 5);
  t('Walk away and come back and the shop opens again', !!ref.snapshot().shop);
  run(ref, 1, { shopClose: true });
  ref.place(ref.snapshot().door.x, ref.snapshot().door.z, 0); run(ref, 120);
  st = ref.snapshot();
  t('The safe room door leads on to the next floor', !st.safe && st.floor === 2);
  t('You keep your gold on the next floor', st.gold === 1000 - price - L.shopHeal);
}
console.log(bad ? bad + ' FAILED' : 'all shop checks ok'); process.exit(bad ? 1 : 0);
