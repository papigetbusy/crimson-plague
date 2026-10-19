/* Wall look switch: the game's own painted stone, or the Tiny Swords stone (only when the owner's local art is packed in as WallData).
   Look-only. Repaints the stone texture's canvas in place, so the walls change at once. */
const WallSkin = (function () {
  const has = () => typeof WallData !== 'undefined';
  function create(tex) {
    const canvas = tex.image, g = canvas.getContext('2d');
    const own = g.getImageData(0, 0, canvas.width, canvas.height);
    let img = null;
    function apply(id) {
      if (id === 'ts' && has()) {
        const draw = () => { g.drawImage(img, 0, 0); tex.needsUpdate = true; };
        if (!img) { img = new Image(); img.onload = draw; img.src = WallData.stone; } else draw();
      } else { g.putImageData(own, 0, 0); tex.needsUpdate = true; }
    }
    return { apply, art: has };
  }
  // two buttons in the tune panel; hooks: { save() }
  function mount(host, view, skin, hooks) {
    if (!skin.art()) return { sync() {} };
    const wrap = document.createElement('div'); wrap.className = 'fxset';
    const h = document.createElement('h3'); h3text(h, 'Wall stone'); wrap.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'fxgrid';
    const btns = [['original', 'Original'], ['ts', 'Tiny Swords']].map(([id, label]) => {
      const b = document.createElement('button'); b.className = 'fxb'; b.textContent = label; b.dataset.wall = id;
      b.addEventListener('click', () => { view.wallSkin = id; skin.apply(id); hooks.save(); sync(); });
      grid.appendChild(b); return b;
    });
    wrap.appendChild(grid); host.appendChild(wrap);
    function sync() { btns.forEach((b) => b.classList.toggle('on', b.dataset.wall === (view.wallSkin || 'original'))); skin.apply(view.wallSkin || 'original'); }
    sync();
    return { sync };
  }
  const h3text = (h, t) => { h.textContent = t; };
  return { create, mount };
})();
if (typeof module !== 'undefined') module.exports = WallSkin;
