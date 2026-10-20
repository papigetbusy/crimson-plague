/* Gun affixes: bonus lines a dropped gun can carry, like Crusader Tactics. Pure data and functions (the referee hands in its seeded dice).
   How many a gun gets depends on its rarity (CT: common 0-1, uncommon 1-2, rare 2-3, epic 3, legendary 3-4) and each value is bigger on higher rarities.
   Some affixes belong to one class and only ever drop while you play that class: a Witch never finds Gunslinger lines and the other way round.
   An affix is stored on the gun as { id, stat, v }: stat says what it changes, v is how much (0.1 = 10%). */
const RefereeAffixes = (function () {
  // count per rarity [min, max]
  const COUNT = [[0, 1], [1, 2], [2, 3], [3, 3], [3, 4]];
  const SCALE = { perRarity: 0.25, spread: 0.4 };         // value = base * (1 + 0.25 per rarity step) * (0.8 to 1.2)
  // stat meanings: dmg, rate, mag (percent more), reload, spread (percent less), crit (chance added), critdmg (added to the crit multiplier), head (more headshot damage), leech (share of damage healed), status (stronger status effects)
  const LIST = [
    { id: 'power',    name: 'Power',          stat: 'dmg',     base: 0.08, text: 'more damage' },
    { id: 'tempo',    name: 'Tempo',          stat: 'rate',    base: 0.06, text: 'faster fire rate' },
    { id: 'deep',     name: 'Deep Magazine',  stat: 'mag',     base: 0.12, text: 'bigger magazine' },
    { id: 'swift',    name: 'Swift Reload',   stat: 'reload',  base: 0.08, text: 'faster reload' },
    { id: 'steady',   name: 'Steady Aim',     stat: 'spread',  base: 0.10, text: 'tighter spread' },
    { id: 'keen',     name: 'Keen Eye',       stat: 'crit',    base: 0.04, text: 'crit chance', flat: true },
    { id: 'ruin',     name: 'Ruin',           stat: 'critdmg', base: 0.10, text: 'crit damage' },
    { id: 'marksman', name: 'Marksman',       stat: 'head',    base: 0.10, text: 'headshot damage' },
    { id: 'leech',    name: 'Leech',          stat: 'leech',   base: 0.015, text: 'of damage healed', flat: true },
    { id: 'venom',    name: 'Potent Element', stat: 'status',  base: 0.10, text: 'stronger status effect' },
    // class-only lines: bigger than the plain ones, and they only drop for that class
    { id: 'fan',      name: 'Fan the Hammer', stat: 'rate',    base: 0.14, text: 'faster fire rate',  cls: 'gunslinger' },
    { id: 'deadcalm', name: 'Dead Calm',      stat: 'crit',    base: 0.08, text: 'crit chance',       cls: 'gunslinger', flat: true },
    { id: 'edge',     name: "Killer's Edge",  stat: 'critdmg', base: 0.25, text: 'crit damage',       cls: 'assassin' },
    { id: 'throat',   name: 'Throat Cutter',  stat: 'head',    base: 0.25, text: 'headshot damage',   cls: 'assassin' },
    { id: 'bloodpact',name: 'Blood Pact',     stat: 'leech',   base: 0.035, text: 'of damage healed', cls: 'witch', flat: true },
    { id: 'hex',      name: 'Hex Power',      stat: 'status',  base: 0.25, text: 'stronger status effect', cls: 'witch' }
  ];
  const BY_ID = {}; for (const a of LIST) BY_ID[a.id] = a;
  const CLASSES = ['gunslinger', 'assassin', 'witch'];
  // the pool for a class: every plain line plus that class's own lines ('' = no class, plain lines only)
  const pool = (cls) => LIST.filter((a) => !a.cls || a.cls === cls);
  const countFor = (rarity, rng) => { const [lo, hi] = COUNT[Math.max(0, Math.min(4, rarity))]; return lo + (hi > lo && rng() < 0.5 ? 1 : 0); };
  // roll the affixes for a gun of this rarity, for this class (no duplicates)
  function roll(rarity, rng, cls) {
    const out = [], left = pool(cls).slice();
    for (let n = countFor(rarity, rng); n > 0 && left.length; n--) {
      const a = left.splice(Math.floor(rng() * left.length), 1)[0];
      const v = a.base * (1 + SCALE.perRarity * rarity) * (1 - SCALE.spread / 2 + SCALE.spread * rng());
      out.push({ id: a.id, stat: a.stat, v: Math.round(v * 1000) / 1000 });
    }
    return out;
  }
  const sum = (item, stat) => (item.affixes || []).reduce((s, a) => s + (a.stat === stat ? a.v : 0), 0);
  const pct = (v, flat) => (flat && v < 0.1 ? (v * 100).toFixed(1) : String(Math.round(v * 100))) + '%';
  // the line to show the player: "+12% bigger magazine" and which class it belongs to
  function describe(a) { const d = BY_ID[a.id]; return { name: d.name, text: '+' + pct(a.v, d.flat) + ' ' + d.text, cls: d.cls || '' }; }
  return { LIST, BY_ID, COUNT, CLASSES, pool, roll, sum, describe };
})();
if (typeof module !== 'undefined') module.exports = RefereeAffixes;
