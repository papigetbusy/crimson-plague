// Touch button settings: sizes are kept in a safe range, and hiding only works for the buttons that may be hidden.
const TouchLayout = require('../src/screen/touch_layout.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const D = TouchLayout.DEFAULTS;

t('Untouched settings give full size buttons and nothing hidden', (() => { const r = TouchLayout.cssVars(Object.assign({}, D)); return r.hidden.length === 0 && r.vars['--s-fire'] === 1 && r.vars['--s-joy'] === 1; })());
t('A size is passed straight through inside the allowed range', TouchLayout.cssVars(Object.assign({}, D, { tAds: 1.3 })).vars['--s-ads'] === 1.3);
t('A size too big or too small is pulled back into the allowed range', (() => { const r = TouchLayout.cssVars(Object.assign({}, D, { tFire: 9, tJoy: 0.01 })).vars; return r['--s-fire'] === TouchLayout.MAX && r['--s-joy'] === TouchLayout.MIN; })());
t('A broken saved value falls back to normal size', TouchLayout.cssVars(Object.assign({}, D, { tSlide: 'abc', tReload: NaN })).vars['--s-slide'] === 1);
t('Aim, Slide, Run and Reload can each be hidden', (() => { const r = TouchLayout.cssVars(Object.assign({}, D, { showAds: 0, showSlide: 0, showSprint: 0, showReload: 0 })); return ['ads', 'slide', 'sprint', 'reload'].every((id) => r.hidden.includes(id)); })());
t('Fire can never be hidden, whatever is saved', !TouchLayout.cssVars(Object.assign({}, D, { showFire: 0 })).hidden.includes('fire'));
t('Only the button that was switched off is hidden', (() => { const r = TouchLayout.cssVars(Object.assign({}, D, { showAds: 0 })); return r.hidden.length === 1 && r.hidden[0] === 'ads'; })());
process.exit(bad ? 1 : 0);
