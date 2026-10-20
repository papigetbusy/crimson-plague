/* The stash and blueprints (first, simple version; the finer rules come later).
   STASH: in a safe room you can put a gun, a piece of gear or a mod away. A stashed item cannot be used for the rest of that run, but it is safe.
   BLUEPRINTS: when a run ends you can turn stashed items into blueprints. A blueprint is a saved copy (all its lines kept) that you can start every
   later run with: ONE gun (with the mods fitted on it) and one piece of each gear place. Loose mods are not blueprints; fit them to a gun first. You can keep 3 blueprints of each type (a gun type such as pistol or shotgun, a gear place such as head or charm, or mods).
   Pure data and functions. An entry is { kind: 'gun'|'gear'|'mod', item }; a library is a plain list of entries (the screen saves it). */
const RefereeStash = (function () {
  const RULES = { stashSize: 6, perType: 3 };      // places in the run stash; blueprints kept per type
  const GUN_TYPES = ['rifle', 'pistol', 'smg', 'shotgun', 'sniper', 'hmg'];
  const TYPE_NAMES = { rifle: 'Rifle', pistol: 'Pistol', smg: 'SMG', shotgun: 'Shotgun', sniper: 'Sniper', hmg: 'Heavy MG', head: 'Head gear', chest: 'Chest gear', boots: 'Boots', charm: 'Charm', mod: 'Gun mod' };
  // which type an entry counts as for the limit (guns by gun type, gear by its place, all mods together)
  function typeOf(e, guns) { return e.kind === 'gun' ? (guns[e.item.id] || { type: 'pistol' }).type : e.kind === 'gear' ? e.item.slot : 'mod'; }
  // a clean copy for a blueprint: same rarity and lines, back to wave 1, no leftover ammo
  function fresh(e) {
    const it = JSON.parse(JSON.stringify(e.item)); it.wave = 1; delete it.ammo;
    if (it.mods) it.mods.forEach((m) => { m.wave = 1; });
    return { kind: e.kind, item: it };
  }
  const sameItem = (a, b) => JSON.stringify(a.item) === JSON.stringify(b.item);
  const countOf = (lib, type, guns) => lib.filter((b) => typeOf(b, guns) === type).length;
  // can this entry become a blueprint? '' = yes, else the reason (full for its type, or an exact copy is already saved)
  function canAdd(lib, e, guns) {
    if (e.kind === 'mod') return 'mods are kept on a gun: fit it first, then keep the gun';
    const f = fresh(e);
    if (lib.some((b) => b.kind === f.kind && sameItem(b, f))) return 'you already have this blueprint';
    const ty = typeOf(f, guns); if (countOf(lib, ty, guns) >= RULES.perType) return 'you already have ' + RULES.perType + ' ' + TYPE_NAMES[ty] + ' blueprints';
    return '';
  }
  function add(lib, e, guns) { const why = canAdd(lib, e, guns); if (why) return why; lib.push(fresh(e)); return ''; }
  // tapping a blueprint on the start card: you bring one gun and one piece of each gear place, so picking another of the same place swaps it in. Returns the new picked list (indexes into lib).
  function pickToggle(lib, picked, i, guns) {
    if (picked.includes(i)) return picked.filter((x) => x !== i);
    const same = (j) => lib[j] && lib[i] && (lib[j].kind === lib[i].kind) && (lib[i].kind === 'gun' || lib[j].item.slot === lib[i].item.slot);
    return picked.filter((j) => !same(j)).concat(i);
  }
  const remove = (lib, i) => { if (i >= 0 && i < lib.length) lib.splice(i, 1); };
  return { RULES, GUN_TYPES, TYPE_NAMES, typeOf, fresh, canAdd, add, remove, pickToggle };
})();
if (typeof module !== 'undefined') module.exports = RefereeStash;
