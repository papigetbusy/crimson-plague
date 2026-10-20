/* Classes: Gunslinger, Assassin, Witch. Pure data (no browser, clock or random).
   Each class has a small starting bonus, four passive skills and one ultimate that charges from kills and fires by itself.
   Every skill has 5 levels. It levels up from use (use = the numbers in `useStep`) and from picking it again on a level-up.
   The numbers a skill uses at level n are in `v(n)`; the rules that use them live in referee_class.js. */
const RefereeClasses = (function () {
  const MAX_LEVEL = 5;
  const ULT_LEVEL = 5;                                     // the ultimate is offered from this player level on
  const lin = (a, b) => (n) => a + b * (n - 1);            // a at level 1, growing by b each level

  const CLASSES = {
    gunslinger: {
      name: 'Gunslinger', blurb: 'Fast guns, lots of bullets', start: { rate: 1.15 }, startText: '+15% fire rate',
      skills: [
        { id: 'fan', name: 'Fan the Hammer', desc: 'Every few shots fire a 3-bullet burst', stat: (v) => 'every ' + v.every + 'th shot fires ' + v.extra + ' extra bullets', useStep: 14, v: (n) => ({ every: Math.max(3, 7 - n), extra: 2 }) },
        { id: 'quickdraw', name: 'Quickdraw', desc: 'After a kill your next reload is instant', stat: (v) => 'instant reload after a kill, ready every ' + v.cd + 's', useStep: 10, v: (n) => ({ cd: Math.max(2, 8 - n) }) },
        { id: 'ricochet', name: 'Ricochet', desc: 'Bullets bounce to a nearby monster', stat: (v) => v.bounces + (v.bounces > 1 ? ' bounces' : ' bounce') + ' at ' + Math.round(v.frac * 100) + '% damage', useStep: 20, v: (n) => ({ frac: 0.4 + 0.1 * n, bounces: n >= 4 ? 2 : 1, range: 8 }) },
        { id: 'deadeye', name: 'Dead Eye', desc: 'Crit chance: hits for double damage', stat: (v) => Math.round(v.crit * 100) + '% crit chance', useStep: 25, v: (n) => ({ crit: 0.1 + 0.04 * n }) }
      ],
      ult: { id: 'bulletstorm', name: 'Bullet Storm', desc: 'Every 30 kills: 5s of double fire rate, no reloading', stat: (v) => v.dur + 's of double fire rate', need: 30, useStep: 2, v: (n) => ({ dur: 4.5 + 0.5 * n, rate: 2 }) }
    },
    assassin: {
      name: 'Assassin', blurb: 'Fast, deadly, slides and hides', start: { speed: 1.1 }, startText: '+10% move speed',
      skills: [
        { id: 'cloak', name: 'Cloak', desc: 'Sliding hides you from monsters for a few seconds. Shooting ends it', stat: (v) => v.dur.toFixed(1) + ' seconds hidden', useStep: 10, v: (n) => ({ dur: 2 + 0.4 * n }) },
        { id: 'shadowstep', name: 'Shadowstep', desc: 'The first shot after a slide always crits, and crits are likelier for that magazine', stat: (v) => '+' + Math.round(v.crit * 100) + '% crit chance for the magazine', useStep: 8, v: (n) => ({ crit: 0.15 + 0.05 * n }) },
        { id: 'bleed', name: 'Bleed', desc: 'Your hits make monsters bleed', stat: (v) => Math.round(v.frac * 100) + '% of the hit per second for ' + v.dur + 's', useStep: 25, v: (n) => ({ frac: 0.2 + 0.05 * n, dur: 4 }) },
        { id: 'predator', name: 'Predator', desc: 'Monsters nearly dead die in one hit', stat: (v) => 'kills monsters below ' + Math.round(v.below * 100) + '% health', useStep: 8, v: (n) => ({ below: 0.15 + 0.03 * n }) }
      ],
      ult: { id: 'deathmark', name: 'Death Mark', desc: 'Every 20 kills: 5s of crits only, and kills heal you', stat: (v) => v.dur + 's of crits, heal ' + Math.round(v.heal * 100) + '% per kill', need: 20, useStep: 2, v: (n) => ({ dur: 4.5 + 0.5 * n, heal: 0.03 + 0.01 * n }) }
    },
    witch: {
      name: 'Witch', blurb: 'Curses, poison and the dead', start: { poison: 0.25, chance: 0.4 }, startText: 'Hits can poison',
      skills: [
        { id: 'hex', name: 'Hex', desc: 'Your hits curse monsters: they take extra damage', stat: (v) => '+' + Math.round(v.mul * 100) + '% damage taken for ' + v.dur + 's', useStep: 20, v: (n) => ({ mul: 0.2 + 0.05 * n, dur: 5 }) },
        { id: 'plague', name: 'Plague', desc: 'Poison spreads to nearby monsters when one dies', stat: (v) => 'spreads to ' + v.targets + ' monsters within ' + v.radius.toFixed(1), useStep: 8, v: (n) => ({ radius: 4.5 + 0.5 * n, targets: 2 + n }) },
        { id: 'siphon', name: 'Soul Siphon', desc: 'Kills heal you', stat: (v) => 'heal ' + v.heal.toFixed(1) + ' per kill', useStep: 25, v: (n) => ({ heal: 2 + 1.5 * n }) },
        { id: 'raise', name: 'Raise Dead', desc: 'Killed monsters sometimes fight for you', stat: (v) => Math.round(v.chance * 100) + '% chance, fights ' + v.life + 's', useStep: 4, v: (n) => ({ chance: 0.08 + 0.02 * n, life: 8 + n, dps: 1 + 0.2 * n }) }
      ],
      ult: { id: 'crimsonplague', name: 'Crimson Plague', desc: 'Every 25 kills: a red cloud poisons everything around you for 8s', stat: (v) => v.dur + 's cloud, radius ' + v.radius.toFixed(1), need: 25, useStep: 2, v: (n) => ({ dur: 7 + n, radius: 6 + 0.5 * n, dps: 1.6 + 0.3 * n }) }
    }
  };
  // numbers shared by all classes
  const RULES = {
    critMul: 2, poisonDur: 5, bleedTick: 0.5, thrallCap: 4, thrallSpeed: 5.5, thrallReach: 1.7,
    train: 0.04,                                            // the class starting bonus grows by this fraction for every skill level you hold
    shadowWindow: 1.6,                                      // seconds after a slide in which the first shot is the Shadowstep crit
    maxStartSkills: 4
  };
  return { CLASSES, RULES, MAX_LEVEL, ULT_LEVEL, lin };
})();
if (typeof module !== 'undefined') module.exports = RefereeClasses;
