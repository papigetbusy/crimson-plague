/* Referee tables: the monster kinds, the level-up skills and the wave plan.
   Pure data and pure functions (no browser, no clock, no random of their own: the referee hands in its seeded rng).
   Sizes and spheres are in "fiend units": the fiend at size 1 is about 2.4 world units tall. */
const RefereeData = (function () {
  // hpMul / speedMul / dmgMul multiply the base numbers in the referee's cfg (monsterHp, monsterSpeed, monsterDamage)
  const KINDS = {
    fiend: { name: 'Horned Fiend', size: 1.0, hpMul: 1.0, speedMul: 1.0, dmgMul: 1.0, rate: 1.0, xp: 10, heavy: true,
      spheres: [{ y: 0.58, r: 0.55, f: 0 }, { y: 1.30, r: 0.62, f: 0 }, { y: 1.95, r: 0.38, f: 0, head: true }] },
    hound: { name: 'Bone Hound', size: 0.75, hpMul: 0.45, speedMul: 1.65, dmgMul: 0.55, rate: 1.5, xp: 5, heavy: false,
      spheres: [{ y: 0.55, r: 0.5, f: -0.05 }, { y: 0.6, r: 0.4, f: 0.38 }, { y: 0.82, r: 0.42, f: 0.62, head: true }] },
    golem: { name: 'Rock Golem', size: 1.25, hpMul: 3.5, speedMul: 0.62, dmgMul: 2.5, rate: 0.7, xp: 35, heavy: true,
      spheres: [{ y: 0.62, r: 0.7, f: 0 }, { y: 1.45, r: 0.85, f: 0 }, { y: 2.05, r: 0.45, f: 0, head: true }] },
    demon: { name: 'Demon Lord', size: 1.4, hpMul: 26, speedMul: 0.85, dmgMul: 3.2, rate: 0.8, xp: 400, heavy: true, boss: true,
      guard: { wake: 12 },                                                   // he waits at the door, and wakes when you come within this many units in sight (or hurt him)
      charge: { every: 7, windup: 0.7, dur: 0.9, mult: 3.4, hit: 1.5 },     // seconds, then speed multiplier and damage multiplier on contact
      summonAt: 0.5, summonKind: 'hound', summonN: 4,                        // calls hounds once, at half health
      spheres: [{ y: 0.8, r: 0.6, f: 0 }, { y: 1.7, r: 0.78, f: 0 }, { y: 2.45, r: 0.4, f: -0.05, head: true }] }
  };

  // what a level-up can offer. per = the number each stack adds (the referee applies them).
  const SKILLS = [
    { id: 'dmg',    name: 'Sharpened Rounds', desc: '+15% damage',                     max: 10, per: 0.15 },
    { id: 'rate',   name: 'Hair Trigger',     desc: '+12% fire rate',                  max: 8,  per: 0.12 },
    { id: 'speed',  name: 'Fleet Foot',       desc: '+8% move speed',                  max: 8,  per: 0.08 },
    { id: 'multi',  name: 'Split Shot',       desc: '+1 bullet every shot',            max: 4,  per: 1 },
    { id: 'hp',     name: 'Iron Blood',       desc: '+25 max health and heal 25',      max: 8,  per: 25 },
    { id: 'steal',  name: 'Leech',            desc: 'Heal 3% of damage you deal',      max: 6,  per: 0.03 },
    { id: 'reload', name: 'Quick Hands',      desc: '15% faster reload',               max: 5,  per: 0.15 },
    { id: 'blast',  name: 'Hellfire Rounds',  desc: 'Hits explode for 35% damage',     max: 5,  per: 0.35 },
    { id: 'magnet', name: 'Grave Magnet',     desc: '+60% pickup range',               max: 4,  per: 0.6 },
    { id: 'regen',  name: 'Dark Vigor',       desc: '+4 health per second regrowth',   max: 5,  per: 4 },
    { id: 'mag',    name: 'Deep Magazine',    desc: '+8 rounds per magazine',          max: 5,  per: 8 }
  ];

  const LOOP = {
    startWave: 1, intermission: 4, firstDelay: 2.5, bossEvery: 10,
    aliveCap: 16, heavyCap: 6, spawnGap: 0.55,
    hpPerWave: 0.14, dmgPerWave: 0.05, speedPerWave: 0.02, speedMax: 1.35,
    orbMagnet: 3.5, orbPickup: 0.9, orbLife: 30, pickupLife: 25, pickupRadius: 1.1,
    healAmount: 30, healChance: 0.07, frenzyChance: 0.03, frenzyTime: 8, frenzyDmg: 1.5, frenzyRate: 1.4,
    waveClearHeal: 25, blastRadius: 2.2,
    spawnPathMin: 8, spawnPathMax: 26,                  // monsters appear a walk of this many cells away from you (2 units a cell)
    exploreRadius: 9                                    // how many cells around you the minimap reveals
  };

  const xpNeed = (level) => Math.round(20 + 14 * level + 2 * level * level);

  // the monsters of wave w, in spawn order (a boss wave starts with its boss)
  function waveKinds(w, rng) {
    const n = 6 + 2 * w + Math.floor(w / 3);
    const boss = w % LOOP.bossEvery === 0;
    const adds = boss ? Math.round(n * 0.5) : n;
    const houndShare = w < 2 ? 0 : Math.min(0.55, 0.14 * (w - 1));
    const golemShare = w < 4 ? 0 : Math.min(0.2, 0.04 * (w - 3));
    const list = [];
    for (let i = 0; i < adds; i++) { const r = rng(); list.push(r < golemShare ? 'golem' : r < golemShare + houndShare ? 'hound' : 'fiend'); }
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = list[i]; list[i] = list[j]; list[j] = t; }
    if (boss) list.unshift('demon');
    return list;
  }
  return { KINDS, SKILLS, LOOP, xpNeed, waveKinds };
})();
if (typeof module !== 'undefined') module.exports = RefereeData;
