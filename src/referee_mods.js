/* Gun mods: small parts that bolt onto a gun. A mod is its own kind of item with its own lines (magazine size, fire rate, aim speed...): it never
   carries the plain gun or gear lines. How many lines it has follows rarity (common 1, uncommon 2, rare 3, epic 3, legendary 4). A gun has room for
   a few mods by rarity, and (owner, 2026-10-21) ANY mod fits ANY gun that has a free place: you may take the hit on stats to keep a line you like.
   Pure data and functions (the referee hands in its seeded dice). A mod item is { rarity, wave, affixes[{id,stat,v}] }. */
const RefereeMods = (function () {
  const COUNT = [1, 2, 3, 3, 4];             // lines per mod rarity
  const SLOTS = [1, 1, 2, 2, 3];             // mod places on a gun, by the gun's rarity
  const BAG = 6;                             // mods you can carry loose (until the stash arrives)
  const DROP = { chance: 0.05, eliteChance: 0.3 };      // like guns: chance an ordinary monster, an elite, drops one (bosses always drop one)
  const SCALE = { perRarity: 0.25, spread: 0.4 };
  const LIST = [
    { id: 'extmag',   name: 'Extended Magazine', stat: 'mag',     base: 0.15, text: 'bigger magazine' },
    { id: 'tuned',    name: 'Tuned Action',      stat: 'rate',    base: 0.08, text: 'faster fire rate' },
    { id: 'quickads', name: 'Quick Aim',         stat: 'ads',     base: 0.25, text: 'faster aiming' },
    { id: 'loader',   name: 'Speed Loader',      stat: 'reload',  base: 0.10, text: 'faster reload' },
    { id: 'barrel',   name: 'Match Barrel',      stat: 'spread',  base: 0.12, text: 'tighter spread' },
    { id: 'grip',     name: 'Steady Grip',       stat: 'adsmove', base: 0.20, text: 'faster walking while aiming' }
  ];
  const BY_ID = {}; for (const a of LIST) BY_ID[a.id] = a;
  const clampR = (r) => Math.max(0, Math.min(4, r));
  const slotsFor = (gunRarity) => SLOTS[clampR(gunRarity)];
  // the mod rarities a gun can take: one step below to one step above its own
  const window = () => [0, 4];                                                  // every mod rarity fits every gun (the only limit is the gun's free places)
  const fits = (gunRarity, modRarity) => { const [lo, hi] = window(gunRarity); return modRarity >= lo && modRarity <= hi; };
  function make(rarity, wave, rng) {
    const out = [], left = LIST.slice();
    for (let n = COUNT[clampR(rarity)]; n > 0 && left.length; n--) {
      const a = left.splice(Math.floor(rng() * left.length), 1)[0];
      const v = a.base * (1 + SCALE.perRarity * rarity) * (1 - SCALE.spread / 2 + SCALE.spread * rng());
      out.push({ id: a.id, stat: a.stat, v: Math.round(v * 1000) / 1000 });
    }
    return { rarity: clampR(rarity), wave: wave || 1, affixes: out };
  }
  // why a mod does not go on a gun right now ('' = it fits): the card shows this
  function why(gun, mod) {
    if (!gun || !mod) return 'nothing to fit';
    if (mod.rarity < window(gun.rarity)[0]) return 'too weak for this gun';
    if (mod.rarity > window(gun.rarity)[1]) return 'too strong for this gun';
    if ((gun.mods || []).length >= slotsFor(gun.rarity)) return 'no free mod place';
    return '';
  }
  const sum = (gun, stat) => (gun.mods || []).reduce((s, m) => s + (m.affixes || []).reduce((t, a) => t + (a.stat === stat ? a.v : 0), 0), 0);
  const pct = (v) => String(Math.round(v * 100)) + '%';
  const describe = (a) => ({ name: BY_ID[a.id].name, text: '+' + pct(a.v) + ' ' + BY_ID[a.id].text });
  const nameOf = (mod) => (mod.affixes[0] ? BY_ID[mod.affixes[0].id].name : 'Mod');
  return { LIST, BY_ID, COUNT, SLOTS, BAG, DROP, slotsFor, window, fits, make, why, sum, describe, nameOf };
})();
if (typeof module !== 'undefined') module.exports = RefereeMods;
