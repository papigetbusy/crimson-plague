/* Touch button settings: a size for each on-screen button and the stick, and a show/hide switch for the buttons you can live without
   (Aim, Slide, Run, Reload; Fire always stays). Look-only: the numbers live in the screen's `view` and are saved with the other tuning.
   cssVars() is pure so tests can check it; mount() builds the rows in the settings panel and keeps the page's CSS variables and classes in step. */
const TouchLayout = (function () {
  const BUTTONS = [['fire', 'Fire', false], ['ads', 'Aim', true], ['slide', 'Slide', true], ['sprint', 'Run', true], ['reload', 'Reload', true]];   // id, label, can be hidden
  const cap = (id) => id[0].toUpperCase() + id.slice(1);
  const DEFAULTS = { tJoy: 1, tFire: 1, tAds: 1, tSlide: 1, tSprint: 1, tReload: 1, showAds: 1, showSlide: 1, showSprint: 1, showReload: 1 };
  const MIN = 0.6, MAX = 1.6, STEP = 0.05;
  const size = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.min(MAX, Math.max(MIN, n)) : 1; };

  // the page's CSS variables (a size multiplier each) and the list of buttons to hide
  function cssVars(view) {
    const vars = { '--s-joy': size(view.tJoy) }, hidden = [];
    for (const [id, , canHide] of BUTTONS) {
      vars['--s-' + id] = size(view['t' + cap(id)]);
      if (canHide && view['show' + cap(id)] === 0) hidden.push(id);
    }
    return { vars, hidden };
  }

  // hooks: { save(), hid(id) }   (hid runs when a button gets hidden, so a held toggle like Aim cannot stay stuck on)
  function mount(host, view, hooks) {
    const wrap = document.createElement('div'); wrap.className = 'touchset';
    const h = document.createElement('h3'); h.textContent = 'Touch buttons (phone)'; wrap.appendChild(h);
    const note = document.createElement('p'); note.className = 'note'; note.textContent = 'Size and show or hide each button. The buttons stay visible beside this panel.'; wrap.appendChild(note);
    const rows = [];
    const addSize = (label, key) => {
      const row = document.createElement('label'); row.className = 'row';
      const name = document.createElement('span'); name.textContent = label + ' size';
      const val = document.createElement('output');
      const inp = document.createElement('input'); inp.type = 'range'; inp.min = MIN; inp.max = MAX; inp.step = STEP; inp.id = 'touch_' + key;
      inp.addEventListener('input', () => { view[key] = size(inp.value); val.textContent = Math.round(view[key] * 100) + '%'; apply(); hooks.save(); });
      row.append(name, val, inp); wrap.appendChild(row); rows.push(() => { inp.value = view[key]; val.textContent = Math.round(size(view[key]) * 100) + '%'; });
    };
    const addShow = (label, key, id) => {
      const row = document.createElement('label'); row.className = 'row check';
      const name = document.createElement('span'); name.textContent = 'Show ' + label;
      const inp = document.createElement('input'); inp.type = 'checkbox'; inp.id = 'touch_' + key;
      inp.addEventListener('change', () => { view[key] = inp.checked ? 1 : 0; if (!inp.checked) hooks.hid(id); apply(); hooks.save(); });
      row.append(name, inp); wrap.appendChild(row); rows.push(() => { inp.checked = view[key] !== 0; });
    };
    addSize('Move stick', 'tJoy');
    for (const [id, label, canHide] of BUTTONS) { addSize(label, 't' + cap(id)); if (canHide) addShow(label, 'show' + cap(id), id); }
    host.appendChild(wrap);

    function apply() {
      const { vars, hidden } = cssVars(view), body = document.body;
      for (const k in vars) body.style.setProperty(k, String(vars[k]));
      for (const [id, , canHide] of BUTTONS) if (canHide) body.classList.toggle('hide-' + id, hidden.includes(id));
    }
    // shows the current numbers in the rows (after load and after a reset) and applies them to the page
    function sync() { rows.forEach((r) => r()); apply(); }
    sync();
    return { sync, apply };
  }
  return { mount, cssVars, DEFAULTS, BUTTONS, MIN, MAX };
})();
if (typeof module !== 'undefined') module.exports = TouchLayout;
