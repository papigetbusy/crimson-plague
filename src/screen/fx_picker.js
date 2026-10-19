/* The effects row in the settings panel: one button per look preset (Original, Common, Rare, Epic, Legendary and the elements),
   so the owner can try each gun tier's bullet and explosion effects before real guns exist. Look only; saved with the other tuning.
   hooks: { save(), art } where art says whether the effect art is in this build. */
const FxPicker = (function () {
  function mount(host, view, hooks) {
    const plan = typeof FxPlan !== 'undefined' ? FxPlan : require('./fx_plan.js');
    const wrap = document.createElement('div'); wrap.className = 'fxset';
    const h = document.createElement('h3'); h.textContent = 'Bullet and explosion effects'; wrap.appendChild(h);
    const note = document.createElement('p'); note.className = 'note';
    note.textContent = hooks.art ? 'Pick a gun tier to preview its muzzle flash, bullet streak, hits, kills and explosions. Legendary and the elements are the full show.' : 'The effect art is not in this build, so only the plain effects show.';
    wrap.appendChild(note);
    const grid = document.createElement('div'); grid.className = 'fxgrid'; wrap.appendChild(grid);
    const btns = [];
    for (const p of plan.PRESETS) {
      if (!hooks.art && p.id !== 'original') continue;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn fxb'; b.textContent = p.label; b.dataset.fx = p.id;
      b.addEventListener('click', () => { view.fxPreset = p.id; sync(); hooks.save(); });
      grid.appendChild(b); btns.push(b);
    }
    host.appendChild(wrap);
    function sync() { const cur = hooks.art ? view.fxPreset : 'original'; btns.forEach((b) => b.classList.toggle('on', b.dataset.fx === cur)); }
    sync();
    return { sync };
  }
  return { mount };
})();
if (typeof module !== 'undefined') module.exports = FxPicker;
