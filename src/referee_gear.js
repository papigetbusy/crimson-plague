/* Gear: armor pieces (head, chest, boots) and charms that drop in a run and make you stronger. Pure data and functions (the referee hands in its seeded dice).
   Like guns they come in five rarities (higher = stronger) and carry affixes that suit the piece, in the same counts as Crusader Tactics. Armor gives defense and
   health on its own; charms give nothing until their affixes roll, so a charm always carries at least one. Some affixes belong to one class and only drop for it.
   An item is { slot, rarity, wave, affixes[] } with slot one of head, chest, boots, charm. You wear head, chest, boots and two charms. */
const RefereeGear = (function () {
  const AFX = typeof RefereeAffixes !== 'undefined' ? RefereeAffixes : require('./referee_affixes.js');
  const WEAR = ['head', 'chest', 'boots', 'charm', 'charm'];                  // the five places on you
  const NAMES = {
    head: ['Leather Cap', 'Iron Helm', 'Crusader Visor', 'Horned Helm', 'Crown of Ash'],
    chest: ['Padded Vest', 'Chainmail', 'Crusader Plate', 'Bloodforged Cuirass', 'Hallowed Aegis'],
    boots: ['Worn Boots', 'Iron Greaves', 'Crusader Sabatons', 'Duskwalkers', 'Boots of the Hundred Gates'],
    charm: ['Bone Charm', 'Silver Charm', 'Gilded Charm', 'Runed Charm', 'Relic of the Plague']
  };
  // base numbers at common: defense (share of damage taken blocked) and health; times the rarity step below, times a little more each wave
  const BASE = { head: { def: 0.03, hp: 8 }, chest: { def: 0.05, hp: 14 }, boots: { def: 0.02, hp: 5 }, charm: { def: 0, hp: 0 } };
  const RARITY_K = [1, 1.35, 1.8, 2.4, 3.2];
  const GROW = 0.03, DEF_CAP = 0.75;
  const DROP = { chance: 0.05, eliteChance: 0.3 };   // the chance an ordinary monster, an elite, drops a piece of gear (a boss always does, a rarity band better); the rarity follows the same waves as guns
  // affix list: stat is what it changes (the referee adds them up), base is the common value, slots is which pieces can roll it, cls makes it class-only
  const LIST = [
    { id: 'vit',     name: 'Vitality',     stat: 'vit',     base: 0.06,  text: 'max health', slots: ['head', 'chest', 'boots', 'charm'] },
    { id: 'ward',    name: 'Warding',      stat: 'def',     base: 0.025, text: 'defense', slots: ['head', 'chest', 'boots'] },
    { id: 'mend',    name: 'Mending',      stat: 'regen',   base: 0.4,   text: 'health a second', slots: ['head', 'chest', 'boots', 'charm'], flat: true, unit: '' },
    { id: 'stride',  name: 'Fleet Foot',   stat: 'speed',   base: 0.05,  text: 'move speed', slots: ['boots', 'charm'] },
    { id: 'magnet',  name: 'Magnetism',    stat: 'magnet',  base: 0.15,  text: 'pickup range', slots: ['head', 'boots', 'charm'] },
    { id: 'might',   name: 'Might',        stat: 'dmg',     base: 0.05,  text: 'gun damage', slots: ['charm'] },
    { id: 'haste',   name: 'Haste',        stat: 'rate',    base: 0.04,  text: 'fire rate', slots: ['charm'] },
    { id: 'eye',     name: 'Keen Eye',     stat: 'crit',    base: 0.03,  text: 'crit chance', slots: ['head', 'charm'], flat: true },
    { id: 'ruin',    name: 'Ruin',         stat: 'critdmg', base: 0.10,  text: 'crit damage', slots: ['charm'] },
    { id: 'leech',   name: 'Leech',        stat: 'leech',   base: 1, text: 'life on kill', slots: ['chest', 'charm'], unit: '' },
    { id: 'quick',   name: 'Quick Hands',  stat: 'reload',  base: 0.06,  text: 'faster reload', slots: ['head', 'charm'] },
    // class-only lines: bigger than the plain ones, and only for that class
    { id: 'g_hands', name: "Gunslinger's Hands", stat: 'reload', base: 0.12, text: 'faster reload', slots: ['head', 'charm'], cls: 'gunslinger' },
    { id: 'g_nerve', name: 'Steel Nerve',  stat: 'def',     base: 0.05,  text: 'defense', slots: ['chest'], cls: 'gunslinger' },
    { id: 'a_shadow', name: 'Shadow Step', stat: 'speed',   base: 0.10,  text: 'move speed', slots: ['boots', 'charm'], cls: 'assassin' },
    { id: 'a_fang',  name: 'Viper Fang',   stat: 'critdmg', base: 0.22,  text: 'crit damage', slots: ['charm', 'head'], cls: 'assassin' },
    { id: 'w_pact',  name: 'Blood Pact',   stat: 'leech',   base: 2,  text: 'life on kill', slots: ['chest', 'charm'], cls: 'witch', unit: '' },
    { id: 'w_bloom', name: 'Grave Bloom',  stat: 'regen',   base: 0.9,   text: 'health a second', slots: ['chest', 'charm'], cls: 'witch', flat: true }
  ];
  const BY_ID = {}; for (const a of LIST) BY_ID[a.id] = a;
  const pool = (slot, cls) => LIST.filter((a) => a.slots.includes(slot) && (!a.cls || a.cls === cls));
  const COUNT = AFX.COUNT;
  function count(slot, rarity, rng) { const [lo, hi] = COUNT[rarity]; const n = lo + (hi > lo && rng() < 0.5 ? 1 : 0); return slot === 'charm' ? Math.max(1, n) : n; }
  function rollAffixes(slot, rarity, rng, cls) {
    const out = [], left = pool(slot, cls || '');
    for (let n = count(slot, rarity, rng); n > 0 && left.length; n--) {
      const a = left.splice(Math.floor(rng() * left.length), 1)[0];
      const v = a.base * (1 + 0.25 * rarity) * (0.8 + 0.4 * rng());
      out.push({ id: a.id, stat: a.stat, v: Math.round(v * 1000) / 1000 });
    }
    return out;
  }
  // a piece of gear (no rng = no affixes, used by tests that want a bare piece)
  const make = (slot, rarity, wave, rng, cls) => ({ slot, rarity, wave: wave || 1, affixes: rng ? rollAffixes(slot, rarity, rng, cls) : [] });
  const SLOTS = ['head', 'chest', 'boots', 'charm'];
  const roll = (rarity, wave, rng, cls) => make(SLOTS[Math.floor(rng() * SLOTS.length)], rarity, wave, rng, cls);
  const grow = (item) => 1 + GROW * ((item.wave || 1) - 1);
  const sum = (item, stat) => (item.affixes || []).reduce((s, a) => s + (a.stat === stat ? a.v : 0), 0);
  // what one piece gives: defense, flat health, and each affix stat
  function stats(item) {
    const b = BASE[item.slot], k = RARITY_K[item.rarity] * grow(item);
    return { def: b.def * k + sum(item, 'def'), hp: Math.round(b.hp * k), vit: sum(item, 'vit'), regen: sum(item, 'regen'), speed: sum(item, 'speed'), magnet: sum(item, 'magnet'),
      dmg: sum(item, 'dmg'), rate: sum(item, 'rate'), crit: sum(item, 'crit'), critdmg: sum(item, 'critdmg'), leech: sum(item, 'leech'), reload: sum(item, 'reload') };
  }
  // everything you wear, added up
  function total(worn) {
    const t = { def: 0, hp: 0, vit: 0, regen: 0, speed: 0, magnet: 0, dmg: 0, rate: 0, crit: 0, critdmg: 0, leech: 0, reload: 0 };
    for (const it of worn) if (it) { const s = stats(it); for (const k in t) t[k] += s[k]; }
    t.def = Math.min(DEF_CAP, t.def);
    return t;
  }
  const pct = (v, flat) => (flat && v < 0.1 ? (v * 100).toFixed(1) : String(Math.round(v * 100))) + '%';
  function describe(a) { const d = BY_ID[a.id]; return { name: d.name, text: '+' + (d.unit === '' ? (Math.round(a.v * 10) / 10) : pct(a.v, d.flat)) + ' ' + d.text, cls: d.cls || '' }; }
  // a rough power number to compare two pieces of the same slot: rarity first, then the sum of what it gives
  const score = (it) => { const s = stats(it); return it.rarity * 1000 + s.def * 400 + s.hp + (it.affixes || []).length * 60 + (s.vit + s.speed + s.magnet + s.dmg + s.rate + s.crit + s.critdmg + s.leech + s.reload) * 100 + s.regen * 40; };
  // which place a new piece goes in: an empty one of its kind, else the weakest worn piece of its kind if the new one is better, else -1 (leave it)
  function place(worn, item) {
    const spots = []; WEAR.forEach((w, i) => { if (w === item.slot) spots.push(i); });
    const empty = spots.find((i) => !worn[i]); if (empty !== undefined) return empty;
    const weakest = spots.sort((a, b) => score(worn[a]) - score(worn[b]))[0];
    return score(item) > score(worn[weakest]) ? weakest : -1;
  }
  function view(item, worn) {
    const s = stats(item), r = RefereeWeaponsRef().RARITIES[item.rarity], pl = worn ? place(worn, item) : -2;
    return { gear: true, slot: item.slot, name: NAMES[item.slot][item.rarity], type: item.slot, rarity: item.rarity, rarityName: r.name, color: r.color,
      def: Math.round(s.def * 1000) / 10, hp: s.hp, affixes: (item.affixes || []).map(describe), vs: pl === -2 ? '' : pl === -1 ? 'worse' : worn[pl] ? 'better' : 'empty' };
  }
  function RefereeWeaponsRef() { return typeof RefereeWeapons !== 'undefined' ? RefereeWeapons : require('./referee_weapons.js'); }
  return { DROP, WEAR, SLOTS, NAMES, LIST, BY_ID, BASE, RARITY_K, DEF_CAP, make, roll, stats, total, score, place, view, describe, pool, count };
})();
if (typeof module !== 'undefined') module.exports = RefereeGear;
