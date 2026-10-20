/* Menu focus for a controller: a highlighted button inside an overlay that the D-pad / stick moves and A presses. Presentation only.
   create(getRoot, selector, allowNone): allowNone makes "nothing highlighted" a stop (-1), so A keeps doing the overlay's normal job (start, rise again). */
const MenuFocus = (function () {
  function create(getRoot, sel, allowNone) {
    let idx = allowNone ? -1 : 0;
    const items = () => { const r = getRoot(); return r ? Array.from(r.querySelectorAll(sel)).filter((b) => !b.disabled) : []; };
    function apply() {
      const it = items(); idx = Math.max(allowNone ? -1 : 0, Math.min(it.length - 1, idx));
      it.forEach((b, k) => b.classList.toggle('focus', k === idx));
      const f = it[idx]; if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    // press the highlighted button the way a finger would (ev: 'click' or 'pointerdown'); false when nothing is highlighted
    function press(ev) { const f = items()[idx]; if (!f) return false; f.dispatchEvent(ev === 'click' ? new MouseEvent('click', { bubbles: true }) : new PointerEvent('pointerdown', { bubbles: true })); return true; }
    return { move(d) { idx += d; apply(); }, reset() { idx = allowNone ? -1 : 0; apply(); }, apply, press, get index() { return idx; } };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = MenuFocus;
