/* Referee tables: the monster kinds, the level-up skills and the wave plan.
   Pure data and pure functions (no browser, no clock, no random of their own: the referee hands in its seeded rng).
   Sizes and spheres are in "fiend units": the fiend at size 1 is about 2.4 world units tall. */
const RefereeData = (function () {
  // hpMul / speedMul / dmgMul multiply the base numbers in the referee's cfg (monsterHp, monsterSpeed, monsterDamage)
  const KINDS = {
    fiend: { name: 'Horned Fiend', size: 1.0, hpMul: 1.0, speedMul: 1.0, dmgMul: 1.0, rate: 1.0, xp: 10, heavy: true, wind: 0.3,
      spheres: [{ y: 0.58, r: 0.55, f: 0 }, { y: 1.30, r: 0.62, f: 0 }, { y: 1.95, r: 0.38, f: 0, head: true }] },
    hound: { name: 'Bone Hound', size: 0.75, hpMul: 0.45, speedMul: 1.65, dmgMul: 0.55, rate: 1.5, xp: 5, heavy: false, wind: 0.2,
      spheres: [{ y: 0.55, r: 0.5, f: -0.05 }, { y: 0.6, r: 0.4, f: 0.38 }, { y: 0.82, r: 0.42, f: 0.62, head: true }] },
    golem: { name: 'Rock Golem', size: 1.25, hpMul: 3.5, speedMul: 0.62, dmgMul: 2.5, rate: 0.7, xp: 35, heavy: true, wind: 0.6,
      spheres: [{ y: 0.62, r: 0.7, f: 0 }, { y: 1.45, r: 0.85, f: 0 }, { y: 2.05, r: 0.45, f: 0, head: true }] },
    // ---- the Crusader Tactics roster, placeholder models (Grok's art comes later) ----
    // wind = seconds from reaching you to the blow landing; shoot = a ranged attacker: stops at range, rears back for wind seconds, throws a projectile (speed units/s, dmg times the monster's damage, r its size, y muzzle height)
    goblin: { name: 'Goblin', size: 1.0, hpMul: 0.35, speedMul: 1.35, dmgMul: 0.5, rate: 1.6, xp: 4, heavy: false, wind: 0.2,
      spheres: [{ y: 0.55, r: 0.42, f: 0 }, { y: 1.2, r: 0.32, f: 0, head: true }] },
    skeleton: { name: 'Skeleton', size: 1.1, hpMul: 1.8, speedMul: 0.75, dmgMul: 1.6, rate: 0.8, xp: 18, heavy: true, wind: 0.55,
      spheres: [{ y: 0.85, r: 0.38, f: 0 }, { y: 1.45, r: 0.42, f: 0 }, { y: 2.0, r: 0.3, f: 0, head: true }] },
    mushroom: { name: 'Mushroom', size: 1.0, hpMul: 0.6, speedMul: 0.7, dmgMul: 0.8, rate: 1.0, xp: 12, heavy: false, wind: 0.4,
      shoot: { range: 16, keep: 7, wind: 0.7, cd: 2.6, speed: 7, dmg: 1.0, r: 0.4, proj: 'spit', y: 0.9 },
      spheres: [{ y: 0.4, r: 0.5, f: 0 }, { y: 0.95, r: 0.6, f: 0, head: true }] },
    eyeball: { name: 'Eyeball', size: 1.0, hpMul: 0.55, speedMul: 0.95, dmgMul: 1.0, rate: 1.0, xp: 14, heavy: false, wind: 0.3, hover: 1.35,
      shoot: { range: 20, keep: 9, wind: 0.5, cd: 2.0, speed: 14, dmg: 0.9, r: 0.3, proj: 'bolt', y: 1.35 },
      spheres: [{ y: 1.35, r: 0.5, f: 0, head: true }, { y: 0.8, r: 0.25, f: 0 }] },
    flame: { name: 'Flame Spirit', size: 1.0, hpMul: 0.7, speedMul: 0.85, dmgMul: 1.3, rate: 1.0, xp: 16, heavy: false, wind: 0.3, hover: 1.45,
      shoot: { range: 18, keep: 8, wind: 0.8, cd: 3.0, speed: 8.5, dmg: 1.3, r: 0.45, proj: 'fire', y: 1.5 },
      spheres: [{ y: 1.5, r: 0.5, f: 0 }, { y: 1.95, r: 0.32, f: 0, head: true }, { y: 1.0, r: 0.35, f: 0 }] },
    demon: { name: 'Demon Lord', size: 1.4, hpMul: 78, speedMul: 0.85, dmgMul: 4.2, rate: 0.8, xp: 400, heavy: true, boss: true, wind: 0.45,
      guard: { wake: 12 },                                                   // he waits at the door, and wakes when you come within this many units in sight (or hurt him)
      charge: { every: 5.5, windup: 0.7, dur: 0.9, mult: 3.4, hit: 1.5 },     // seconds, then speed multiplier and damage multiplier on contact
      shoot: { range: 22, min: 6, wind: 0.9, cd: 3.4, speed: 9, dmg: 1.1, r: 0.7, proj: 'fire', y: 2.4 },   // a slow, wide fireball he throws from range after rearing back
      enrage: { below: 0.35, speed: 1.25, pace: 0.65 },                       // under this much health he speeds up and throws and charges more often
      summonAt: 0.5, summonKind: 'hound', summonN: 4,                        // calls hounds once, at half health
      spheres: [{ y: 0.8, r: 0.6, f: 0 }, { y: 1.7, r: 0.78, f: 0 }, { y: 2.45, r: 0.4, f: -0.05, head: true }] },
    // the three bosses taken from Crusader Tactics. Every one has its own moves (see referee_bosses.js, which plays them); the numbers sit here.
    bat: { name: 'Bat Lord', size: 1.3, hpMul: 62, speedMul: 1.1, dmgMul: 3.0, rate: 1.0, xp: 420, heavy: true, boss: true, wind: 0.4, hover: 1.5,
      guard: { wake: 14 }, enrage: { below: 0.35, speed: 1.2, pace: 0.6 },
      summonAt: 0.5, summonKind: 'eyeball', summonN: 4, summonText: 'BATS CALLED',
      moves: { dive: { cd: 4.2, min: 5, max: 26, wind: 0.9, speed: 4.6, maxT: 1.1, dmg: 1.7, drain: 0.6, rest: 0.9 }, orbit: { dist: 11, speed: 0.9 } },   // dive: rear up, then swoop through the spot where you stood; a hit heals him by `drain` of its damage
      spheres: [{ y: 1.7, r: 0.8, f: 0 }, { y: 2.2, r: 0.45, f: 0.1, head: true }] },
    lich: { name: 'Lich King', size: 1.4, hpMul: 55, speedMul: 0.7, dmgMul: 3.4, rate: 1.0, xp: 440, heavy: true, boss: true, wind: 0.4, hover: 0.8,
      guard: { wake: 16 }, enrage: { below: 0.35, speed: 1.15, pace: 0.65 },
      summonAt: 0.6, summonKind: 'skeleton', summonN: 4, summonText: 'THE DEAD RISE',
      moves: { volley: { cd: 2.6, wind: 0.8, n: 3, spread: 0.26, speed: 11, dmg: 0.9, r: 0.4, min: 3, max: 26 },
        nova: { cd: 9, wind: 1.5, n: 18, speed: 7, dmg: 0.75, r: 0.4, min: 2, max: 22 },
        blink: { cd: 6, near: 6.5, min: 12, max: 19, rest: 0.5 }, keep: 11 },     // volley: a fan of soul bolts; nova: a ring of bolts with gaps; blink: he vanishes when you get close
      spheres: [{ y: 1.0, r: 0.7, f: 0 }, { y: 1.9, r: 0.7, f: 0 }, { y: 2.6, r: 0.42, f: 0, head: true }] },
    dragon: { name: 'Elder Dragon', size: 1.9, hpMul: 110, speedMul: 0.7, dmgMul: 3.6, rate: 0.8, xp: 480, heavy: true, boss: true, wind: 0.6,
      guard: { wake: 13 }, enrage: { below: 0.35, speed: 1.2, pace: 0.7 },
      moves: { breath: { cd: 7, min: 3, max: 18, wind: 1.0, dur: 1.9, arc: 1.3, every: 0.08, speed: 13, dmg: 0.32, r: 0.5, life: 1.3 },
        slam: { cd: 5.5, near: 6, wind: 1.0, radius: 7, dmg: 1.8, rest: 0.8 } },    // breath: a fire cone sweeps across (step out of it or slide through); slam: a tail shockwave all round him
      spheres: [{ y: 0.9, r: 0.95, f: 0.1 }, { y: 1.7, r: 0.8, f: 0.3 }, { y: 2.5, r: 0.5, f: 0.7, head: true }] }
  };

  // what a level-up can offer. per = the number each stack adds (the referee applies them).
  const SKILLS = [
    { id: 'dmg',    name: 'Sharpened Rounds', desc: '+15% damage',                     max: 10, per: 0.15 },
    { id: 'rate',   name: 'Hair Trigger',     desc: '+12% fire rate',                  max: 8,  per: 0.12 },
    { id: 'speed',  name: 'Fleet Foot',       desc: '+8% move speed',                  max: 8,  per: 0.08 },
    { id: 'multi',  name: 'Split Shot',       desc: '+1 bullet every shot',            max: 4,  per: 1 },
    { id: 'hp',     name: 'Iron Blood',       desc: '+25 max health and heal 25',      max: 8,  per: 25 },
    { id: 'steal',  name: 'Leech',            desc: 'Heal 1 life for every kill',        max: 6,  per: 1 },
    { id: 'reload', name: 'Quick Hands',      desc: '15% faster reload',               max: 5,  per: 0.15 },
    { id: 'blast',  name: 'Hellfire Rounds',  desc: 'Hits explode for 35% damage',     max: 5,  per: 0.35 },
    { id: 'magnet', name: 'Grave Magnet',     desc: '+60% pickup range',               max: 4,  per: 0.6 },
    { id: 'regen',  name: 'Dark Vigor',       desc: '+4 health per second regrowth',   max: 5,  per: 4 },
    { id: 'mag',    name: 'Deep Magazine',    desc: '+8 rounds per magazine',          max: 5,  per: 8 },
    { id: 'luck',   name: 'Lucky Drops',      desc: 'Guns, armor and mods drop in better rarities', max: 4, per: 1 },
    { id: 'thick',  name: 'Thick Skin',       desc: 'Take 7% less damage from every blow', max: 5, per: 0.07 },
    { id: 'gold',   name: 'Gold Rush',        desc: '+25% gold from coins',            max: 5,  per: 0.25 },
    { id: 'over',   name: 'Overcharge',       desc: 'Every 5th shot hits +75% harder', max: 4,  per: 0.75 },
    { id: 'bounce', name: 'Bounce Pad',       desc: 'Jump 12% higher; landing slams monsters around you', max: 4, per: 1 },
    { id: 'wind',   name: 'Second Wind',      desc: 'Once per floor, a killing blow leaves you alive with 40% health', max: 3, per: 1 }
  ];

  const LOOP = {
    startWave: 1, kitPerWave: 0.8, intermission: 4, firstDelay: 2.5, bossEvery: 10, bossHpFloor: 0.45, bossDmgFloor: 0.18,   // each boss floor after the first: a boss has this much more health and hits this much harder
   
    aliveCap: 16, heavyCap: 6, spawnGap: 0.55,
    hpPerWave: 0.14, dmgPerWave: 0.05, speedPerWave: 0.02, speedMax: 1.35,
    orbMagnet: 3.5, orbPickup: 0.9, orbLife: 30, pickupLife: 25, pickupRadius: 1.1,
    healAmount: 30, healChance: 0.07, frenzyChance: 0.03, frenzyTime: 8, frenzyDmg: 1.5, frenzyRate: 1.4,
    waveClearHeal: 25, blastRadius: 2.2,
    spawnPathMin: 8, spawnPathMax: 26,                  // monsters appear a walk of this many cells away from you (2 units a cell)
    shooterCap: 4,                                     // at most this many ranged monsters alive at once, so the fight stays readable on a phone
    meleeReachMul: 1.45, meleeReachAdd: 0.6,           // a melee monster hits from this far: size times the first number, plus the second
    exploreRadius: 9,                                   // how many cells around you the minimap reveals
    // past the monster cap (aliveCap): the extra waves cannot add more bodies, so every wave past it adds power instead, with no top limit
    capHp: 0.08, capDmg: 0.04,                          // extra health / damage fraction per wave past the cap, on every monster
    eliteBase: 0.06, elitePer: 0.03, eliteMax: 0.6,     // chance a spawn is an elite: base plus a bit per wave past the cap
    eliteHp: 1.5, eliteXp: 3, eliteScale: 1.15,
    eliteAffixEvery: 8, eliteAffixMax: 4,               // an elite carries one ability, plus one more for every 8 waves past the cap
    volatileRadius: 3.6, volatileDmg: 1.0,              // an exploding elite hurts you within this far, for this times its damage
    goldPerXp: 0.4, goldWave: 0.06, goldElite: 3, coinMagnet: 4, coinPickup: 0.9, coinLife: 40,   // gold: a kill drops this much per point of its xp, a bit more every wave, triple from elites
    keeperHp: 6, keeperDmg: 1.4, keeperScale: 1.35, keeperWake: 11,   // the Key Keeper (a mini boss that holds a gate key): this many times the health and damage of his kind, this much bigger, wakes when you come this close in sight
    luckWaves: 5,                                        // Lucky Drops: each stack rolls drop rarity as if it were this many waves later
    overEvery: 5, bounceRadius: 3, bounceDmg: 1.2, bounceStun: 0.6, bounceMin: 0.9, bounceJump: 0.12, windHp: 0.4, windGrace: 1.5,   // Overcharge, Bounce Pad, Second Wind
    hopMax: 2.0, hopFrac: 0.7,   // a monster whose body is lower than this can be hopped over; your feet must be this share of its height above the floor
    sealedAlive: 6, sealedGap: 3,   // while the boss door is sealed by its puzzle, up to this many ordinary monsters at a time, one every few seconds
    shopRadius: 3.2, shopHeal: 100, shopSkill: 150, shopSkillPer: 75, shopOffers: 3,   // the merchant: a full heal, and up to three class skill levels that cost more the higher the skill already is
    trapPct: 0.12, trapScale: 0.12, trapMax: 0.35, trapTick: 0.7,           // traps: a hit takes this share of your health, a bit more on deeper floors (up to the max), and again every so often while you stand in it
    trapMonsterPct: 0.08, trapBoss: 0.25, ventEvery: 3.2, ventWarn: 0.6, ventFire: 0.8, pulseEvery: 2.8, pulseUp: 1.4,   // monsters lose this share of their health per tick (a boss a quarter of that); a vent glows then fires on its beat; pulse spikes are up for half of theirs
    fogFrom: 3, fogChance: 0.3, fogMul: 0.3, fogRamp: 3 // fog: from this wave on, this share of ordinary waves roll in fog that cuts the view to this fraction; it takes this many seconds to thicken or lift
  };
  // elite abilities, unlocked in this order as the waves past the cap pile up (from = waves past the cap needed)
  const AFFIXES = [
    { id: 'armored',  name: 'Armored',  from: 0, hp: 2.2 },
    { id: 'swift',    name: 'Swift',    from: 0, speed: 1.45 },
    { id: 'brutal',   name: 'Brutal',   from: 3, dmg: 1.8 },
    { id: 'volatile', name: 'Volatile', from: 6 }
  ];

  const xpNeed = (level) => Math.round(20 + 14 * level + 2 * level * level);

  // what the waves are made of: each kind unlocks on a wave (ten waves to a floor) and has a share that grows then levels off.
  // The horned fiend fills what is left, so the early waves stay as they were.
  const MIX = [
    { kind: 'golem',    from: 4,  share: (w) => Math.min(0.2, 0.04 * (w - 3)) },
    { kind: 'hound',    from: 2,  share: (w) => Math.min(0.4, 0.14 * (w - 1)) },
    { kind: 'goblin',   from: 1,  share: (w) => Math.min(0.3, 0.2 + 0.02 * w) },
    { kind: 'mushroom', from: 5,  share: (w) => Math.min(0.16, 0.08 + 0.01 * (w - 5)) },
    { kind: 'skeleton', from: 11, share: (w) => Math.min(0.25, 0.08 + 0.02 * (w - 11)) },
    { kind: 'eyeball',  from: 13, share: (w) => Math.min(0.14, 0.05 + 0.01 * (w - 13)) },
    { kind: 'flame',    from: 21, share: (w) => Math.min(0.14, 0.05 + 0.01 * (w - 21)) }
  ];
  // the monsters of wave w, in spawn order (a boss wave starts with its boss)
  function waveKinds(w, rng, bossKind) {
    const n = 6 + 2 * w + Math.floor(w / 3);
    const boss = w % LOOP.bossEvery === 0;
    const adds = boss ? Math.round(n * 0.5) : n;
    const open = MIX.filter((m) => w >= m.from).map((m) => ({ kind: m.kind, sh: m.share(w) })), total = open.reduce((a, m) => a + m.sh, 0), scale = total > 0.85 ? 0.85 / total : 1;   // the unlocked kinds share up to 85% of a wave, the fiend fills the rest
    const list = [];
    for (let i = 0; i < adds; i++) {
      let r = rng(), pick = 'fiend';
      for (const m of open) { const sh = m.sh * scale; if (r < sh) { pick = m.kind; break; } r -= sh; }
      list.push(pick);
    }
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = list[i]; list[i] = list[j]; list[j] = t; }
    if (boss) list.unshift(bossKind || 'demon');
    return list;
  }
  // does wave w roll in fog? A pure scramble of the run's seed and the wave number (no random draws, so it never shifts what else happens). Bosses and the first waves are clear.
  function fogWave(w, seed) {
    if (w < LOOP.fogFrom || w % LOOP.bossEvery === 0) return false;
    let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(w, 0x85ebca6b)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0; h = (h ^ (h >>> 15)) >>> 0;
    return h / 4294967296 < LOOP.fogChance;
  }
  return { KINDS, SKILLS, LOOP, AFFIXES, MIX, xpNeed, waveKinds, fogWave };
})();
if (typeof module !== 'undefined') module.exports = RefereeData;
