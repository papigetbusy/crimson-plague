/* The stash menu: opens when you press pick up next to the stash chest in a safe room. It lists what you carry with a Put in stash button for each, and what is already
   in the stash. It says plainly that stashed things cannot be used for the rest of the run. Presentation only: it draws the referee's snapshot; html() is pure so a test can check it. */
const StashMenu = (function () {
  const colorOf = (c) => '#' + c.color.toString(16).padStart(6, '0');
  const btn = (kind, at) => '<button class="gbtn stash" data-act="stash:' + kind + ':' + at + '">Put in stash</button>';
  const box = (c, inner, extra) => '<div class="gslot" style="border-color:' + colorOf(c) + '">' + inner + (extra || '') + '</div>';
  function html(player, msg) {
    const g = player.gun, st = player.stash;
    const put = (kind, at) => (st.open ? btn(kind, at) : '');            // the stash itself may be shut; the save point never is
    const guns = [[g.card, g.held], [g.other && g.other.card, 1 - g.held]].filter((x) => x[0]).map((x) => box(x[0], GunCard.html(x[0], null, true), put('gun', x[1]))).join('');
    const worn = player.gear.worn.map((w, i) => (w.empty ? '' : box(w, GunCard.gearHtml(Object.assign({}, w, { vs: '' })), put('gear', i)))).join('');
    const mods = player.mods.map((m, i) => box(m, GunCard.modHtml(Object.assign({}, m, { why: '' })), put('mod', i))).join('');
    const kept = st.items.map((it) => box(it.card, it.kind === 'gear' ? GunCard.gearHtml(Object.assign({}, it.card, { vs: '' })) : it.kind === 'mod' ? GunCard.modHtml(Object.assign({}, it.card, { why: '' })) : GunCard.html(it.card, null, true))).join('');
    const sec = (title, cards, empty) => '<div class="gsec">' + title + '</div><div class="ggrid">' + (cards || '<div class="gslot empty"><div class="sub">' + empty + '</div></div>') + '</div>';
    const save = '<div class="gsec">Save point</div><button class="gbtn savebtn" data-act="save">Save game here</button><div class="gtot">The game only saves when you press this, and only in a safe room. Going back to a save keeps this map but rolls new damage and item seeds.</div>';
    return '<h2>Stash chest</h2>' + save + '<div class="gtot stashnote">Things you put in here are safe, but you <b>cannot use them for the rest of this run</b>. After you fall you can keep them as blueprints and start the next run with them.</div>' +
      (msg ? '<div class="gmsg">' + msg + '</div>' : '') + sec('Your guns', guns, 'none') + sec('Worn gear', worn, 'nothing worn') + sec('Mod bag', mods, 'no loose mods') +
      sec('In the stash ' + st.items.length + '/' + st.size, kept, 'nothing put away yet') + '<p class="gclose" data-act="close">Close</p>';
  }
  return { html };
})();
if (typeof module !== 'undefined') module.exports = StashMenu;
