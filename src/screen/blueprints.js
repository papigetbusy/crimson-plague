/* Blueprints on screen: the saved list (kept in this browser), the "start with" picker on the start card, and the "keep as blueprint" list on the game over card.
   The rules (3 per type, what a copy keeps) live in the referee's referee_stash.js; this file only saves, lists and sends taps. html() functions are pure so a test can check them. */
const Blueprints = (function () {
  const KEY = 'cp_blueprints_v1', PICK = 'cp_blueprints_picked_v1';
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const read = (key) => { try { const a = JSON.parse(localStorage.getItem(key)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private window: the list just lasts until you close the page */ } };
  // a short card for an entry: name in rarity colour, what it is, its lines
  function card(e, d) {
    const c = e.kind === 'gun' ? d.WP.view(e.item, d.cfg) : e.kind === 'gear' ? d.GR.view(e.item, null) : d.WP.modView(e.item);
    const lines = c.affixes.map((a) => esc(a.text)).join(', ') || 'no extra lines';
    const sub = e.kind === 'gun' ? c.rarityName + ' ' + c.type + (c.mods && c.mods.length ? ' + ' + c.mods.length + ' mod' : '') : e.kind === 'gear' ? c.rarityName + ' ' + c.slot : c.rarityName + ' mod';
    return { color: c.color, html: '<b style="color:' + hex(c.color) + '">' + esc(c.name) + (e.kind === 'mod' ? ' Mod' : '') + '</b><span>' + esc(sub) + '</span><i>' + lines + '</i>' };
  }
  // the start card list: tap a blueprint to start the next run with it (tap again to leave it out)
  function startHtml(lib, picked, d) {
    if (!lib.length) return '<p class="bpnone">Blueprints: none yet. Put things in a safe-room stash, then keep them when a run ends.</p>';
    return '<div class="bphead">Blueprints (tap to start with them)</div>' + lib.map((e, i) => { const c = card(e, d); return '<button type="button" class="bp' + (picked.includes(i) ? ' on' : '') + '" data-bp="' + i + '" style="border-color:' + hex(c.color) + '">' + c.html + '</button>'; }).join('');
  }
  // the game over list: each thing you had stashed with a button to keep it, and the reason when it cannot be kept
  function overHtml(items, lib, d, ST) {
    if (!items.length) return '';
    return '<div class="bphead">Your stash: keep as a blueprint?</div>' + items.map((it) => {
      const e = d.entry(it.i), why = ST.canAdd(lib, e, d.WP.GUNS), c = card(e, d);
      return '<div class="bpo" style="border-color:' + hex(c.color) + '">' + c.html + (why ? '<em>' + esc(why) + '</em>' : '<button type="button" data-keep="' + it.i + '">Keep as blueprint</button>') + '</div>';
    }).join('');
  }
  return { read: () => read(KEY), save: (lib) => write(KEY, lib), readPicked: () => read(PICK), savePicked: (p) => write(PICK, p), startHtml, overHtml, card };
})();
if (typeof module !== 'undefined') module.exports = Blueprints;
