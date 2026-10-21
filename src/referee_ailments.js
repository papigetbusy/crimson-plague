/* What monsters can do to YOU besides plain damage: burn you, freeze you or poison you.
   BURN   a steady loss of health for a few seconds (a slide puts it out).
   FREEZE you move at half speed for a couple of seconds.
   POISON a slower loss of health that lasts longer and stops your healing, but never kills you on its own.
   The loss is a share of your top health, so it stays fair late in a run. Pure: the referee hands in what it needs (env). */
const RefereeAilments = (function () {
  const RULES = {
    burn:   { dur: 3.5, dps: 0.025 },      // seconds, and the share of top health lost each second
    poison: { dur: 8,   dps: 0.012 },
    freeze: { dur: 2.2, slow: 0.5 },       // you walk at this share less speed
    stackCap: 6                            // a new hit never pushes a timer above this many seconds
  };
  const KINDS = ['burn', 'freeze', 'poison'];
  // env: { maxHp(), dot(amount, canKill) }
  function create(env) {
    const T = { burn: 0, freeze: 0, poison: 0 };
    function inflict(kind, power) {
      const r = RULES[kind]; if (!r) return false;
      const dur = Math.min(RULES.stackCap, r.dur * (power || 1));
      if (dur > T[kind]) T[kind] = dur;
      return true;
    }
    function update(dt, sliding) {
      if (T.burn > 0 && sliding) T.burn = 0;                                           // rolling on the ground puts the fire out
      if (T.burn > 0) { T.burn = Math.max(0, T.burn - dt); env.dot(env.maxHp() * RULES.burn.dps * dt, true); }
      if (T.poison > 0) { T.poison = Math.max(0, T.poison - dt); env.dot(env.maxHp() * RULES.poison.dps * dt, false); }
      if (T.freeze > 0) T.freeze = Math.max(0, T.freeze - dt);
    }
    const speedMul = () => (T.freeze > 0 ? 1 - RULES.freeze.slow : 1);
    const blocksHealing = () => T.burn > 0 || T.poison > 0;
    const clear = () => { T.burn = T.freeze = T.poison = 0; };
    const view = () => ({ burn: T.burn, freeze: T.freeze, poison: T.poison });
    return { inflict, update, speedMul, blocksHealing, clear, view, T };
  }
  return { RULES, KINDS, create };
})();
if (typeof module !== 'undefined') module.exports = RefereeAilments;
