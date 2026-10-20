/* The gun buttons (which gun you hold), gun skin buttons and the two gun inspect buttons in the Tune panel. hooks: { save(), set(id), inspect(kind), guns[{id,name}], setGun(id) } */
const GunSkinPicker = (function () {
  function mount(host, view, hooks) {
    const wrap = document.createElement('div'); wrap.className = 'fxset gunset';
    const gh = document.createElement('h3'); gh.textContent = 'Gun'; wrap.appendChild(gh);
    const ggrid = document.createElement('div'); ggrid.className = 'fxgrid';
    const gbtns = (hooks.guns || []).map((g) => {
      const b = document.createElement('button'); b.className = 'fxb'; b.textContent = g.name; b.dataset.gun = g.id;
      b.addEventListener('click', () => { hooks.setGun(g.id); hooks.save(); });
      ggrid.appendChild(b); return b;
    });
    wrap.appendChild(ggrid);
    const h = document.createElement('h3'); h.textContent = 'Gun skin'; wrap.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'fxgrid';
    const btns = GunSkins.SKINS.map((s) => {
      const b = document.createElement('button'); b.className = 'fxb'; b.textContent = s.name; b.dataset.skin = s.id;
      b.addEventListener('click', () => { view.gunSkin = s.id; hooks.set(s.id); hooks.save(); sync(); });
      grid.appendChild(b); return b;
    });
    wrap.appendChild(grid);
    for (const [id, label] of [['sides', 'Inspect: both sides'], ['mag', 'Inspect: magazine']]) {
      const b = document.createElement('button'); b.className = 'fxb'; b.dataset.inspect = id; b.textContent = label;
      b.addEventListener('click', () => hooks.inspect(id)); wrap.appendChild(b);
    }
    host.appendChild(wrap);
    function sync() { gbtns.forEach((b) => b.classList.toggle('on', b.dataset.gun === (view.gun || 'rifle'))); btns.forEach((b) => b.classList.toggle('on', b.dataset.skin === (view.gunSkin || 'crimson'))); hooks.set(view.gunSkin || 'crimson'); }
    sync();
    return { sync };
  }
  return { mount };
})();
if (typeof module !== 'undefined') module.exports = GunSkinPicker;
