/* Variant monsters: from the second floor on, some monsters come as an Ember (burns you), Frost (freezes you) or Venom (poisons you) version.
   They have more health, hit harder, and every blow that lands puts its ailment on you. Each has a weak spot: a gun carrying the right status hurts
   it a lot more, and the same status as its own barely scratches it. Bosses from the third floor on can be variants too, and rain marked blasts.
   Pure: nothing random of its own (the referee hands in its seeded dice). */
const RefereeVariants = (function () {
  const VARIANTS = {
    ember: { id: 'ember', name: 'Ember', ail: 'burn',   power: 1, hp: 1.5, dmg: 1.2, weak: 'ice',   resist: 'fire',   text: 'Burns you. Ice guns hurt it most; fire guns barely scratch it.' },
    frost: { id: 'frost', name: 'Frost', ail: 'freeze', power: 1, hp: 1.5, dmg: 1.1, weak: 'fire',  resist: 'ice',    text: 'Freezes you. Fire guns hurt it most; ice guns barely scratch it.' },
    venom: { id: 'venom', name: 'Venom', ail: 'poison', power: 1, hp: 1.5, dmg: 1.1, weak: 'light', resist: 'poison', text: 'Poisons you. Light guns hurt it most; poison guns barely scratch it.' }
  };
  const IDS = ['ember', 'frost', 'venom'];
  const RULES = {
    from: 2, perFloor: 0.12, max: 0.5,        // monsters: from this floor, this share (grows per floor, up to max) of ordinary monsters is a variant
    bossFrom: 3,                              // bosses: from this floor on, a boss is a variant (every second boss floor at first, then every one)
    bossHp: 1.35, bossDmg: 1.15,              // a variant boss is this much tougher on top of the floor growth
    weakMul: 1.6, resistMul: 0.6,             // damage from the right (or the same) gun status
    exposedMul: 1.5,                          // a boss left open after a big move takes this much extra
    tempoPerFloor: 0.07                       // each floor deeper, a boss's clocks run this much faster
  };
  // is this ordinary monster a variant? draws one die only from floor 2 on, so floor 1 plays exactly as before
  function roll(floor, rng) {
    if (floor < RULES.from) return null;
    if (rng() >= Math.min(RULES.max, RULES.perFloor * (floor - RULES.from + 1))) return null;
    return IDS[(rng() * IDS.length) | 0];
  }
  // a boss's variant comes from the map seed and the floor, with no dice, so it never shifts the fight
  function forBoss(floor, seed) {
    if (floor < RULES.bossFrom) return null;
    if (floor < RULES.bossFrom + 2 && (floor + (seed | 0)) % 2) return null;
    const h = Math.imul((seed | 0) ^ Math.imul(floor, 0x45d9f3b), 0x2c1b3c6d) >>> 0;
    return IDS[(h >>> 7) % IDS.length];
  }
  return { VARIANTS, IDS, RULES, roll, forBoss };
})();
if (typeof module !== 'undefined') module.exports = RefereeVariants;
