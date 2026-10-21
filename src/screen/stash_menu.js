/* The stash menu: opens when you press pick up next to the stash chest in a safe room. It lists what you carry with a Put in stash button for each, and what is already
   in the stash. It has 3 gun places and 3 mod places and lets you take things back out. Presentation only: it draws the referee's snapshot; html() is pure so a test can check it. */
const StashMenu = (function () {
  const colorOf = (c) => '#' + c.color.toString(16).padStart(6, '0');
  const nameBox = (v) => '<input class="gname" maxlength="24" placeholder="Name it (or keep the regular name)" value="' + String(v || '').replace(/["<>&]/g, '') + '">';
  const btn = (kind, at) => (kind === 'gun' ? nameBox('') : '') + '<button class="gbtn stash" data-act="stash:' + kind + ':' + at + '">Put in stash</button>';
  const box = (c, inner, extra) => '<div class="gslot" style="border-color:' + colorOf(c) + '">' + inner + (extra || '') + '</div>';
  function html(player, msg) {
    const g = player.gun, st = player.stash, open = st.open;
    const put = (kind, at) => (open ? btn(kind, at) : '');            // the stash itself may be shut; the save point never is
    const entry = !!st.entry && !st.near, canTake = st.take;
    const take = (label, i, hand, off) => (canTake ? '<button class="gbtn stash" data-act="take:' + i + ':' + hand + '"' + (off ? ' disabled' : '') + '>' + label + '</button>' : '');
    const guns = [[g.card, g.held], [g.other && g.other.card, 1 - g.held]].filter((x) => x[0]).map((x) => box(x[0], GunCard.html(x[0], null, true), put('gun', x[1]))).join('');
    const mods = player.mods.map((m, i) => box(m, GunCard.modHtml(Object.assign({}, m, { why: '' })), put('mod', i))).join('');
    // the six stash places: three for guns, three for mods, each filled or empty, every filled one with a Take out button
    const places = (kind, n) => {
      const list = st.items.filter((it) => it.kind === kind), out = [];
      for (let k = 0; k < n; k++) {
        const it = list[k];
        if (!it) { out.push('<div class="gslot empty"><div class="sub">' + (kind === 'gun' ? 'gun' : 'mod') + ' place ' + (k + 1) + ': empty</div></div>'); continue; }
        out.push(kind === 'gun'
          ? box(it.card, GunCard.html(it.card, null, true), entry ? take(it.taken ? 'Taken' : st.entryGun ? 'You already took a gun' : 'Take this gun', it.i, g.held, st.entryGun || it.taken) : take('Take into my hands', it.i, g.held) + (g.other ? take('Swap with the gun on my back', it.i, 1 - g.held) : take('Take to my back', it.i, 1 - g.held)) + (open ? nameBox(it.card.label) + '<button class="gbtn stash" data-act="rename:' + it.i + '">Rename</button>' : ''))
          : box(it.card, GunCard.modHtml(Object.assign({}, it.card, { why: '' })), take(it.taken ? 'Taken' : 'Take to my mod bag', it.i, 0, it.taken)));
      }
      return out.join('');
    };
    const sec = (title, cards, empty) => '<div class="gsec">' + title + '</div><div class="ggrid">' + (cards || '<div class="gslot empty"><div class="sub">' + empty + '</div></div>') + '</div>';
    const nG = st.items.filter((it) => it.kind === 'gun').length, nM = st.items.filter((it) => it.kind === 'mod').length;
    const save = '<div class="gsec">Save point</div><button class="gbtn savebtn" data-act="save">Save game here</button><div class="gtot">The game only saves when you press this, and only in a safe room. Going back to a save keeps this map but rolls new damage and item seeds.</div>';
    if (entry) return '<h2>Your stash</h2><div class="gtot stashnote">You are at the door of the hall. Take <b>one gun</b> and <b>as many mods as you like</b> from your stash, then close this and enter. You take a <b>copy</b>: the stash always keeps the original, even if you fall, so every run can start strong.</div>' +
      (msg ? '<div class="gmsg">' + msg + '</div>' : '') + sec('Stash: guns ' + nG + '/' + st.gunSlots, places('gun', st.gunSlots)) + sec('Stash: mods ' + nM + '/' + st.modSlots, places('mod', st.modSlots)) + '<p class="gclose" data-act="close">Enter the hall</p>';
    return '<h2>Stash chest</h2>' + save + '<div class="gtot stashnote">The stash has <b>3 places for guns and 3 for mods</b>. Put things in, take them back out, rename guns, or swap them as often as you like while you stand here. Stashed things are kept for every future run: at the door of the hall you can take a copy of one gun and any mods, even after you fall. Name a gun when you put it in, or keep its regular name.</div>' +
      (msg ? '<div class="gmsg">' + msg + '</div>' : '') + sec('Stash: guns ' + nG + '/' + st.gunSlots, places('gun', st.gunSlots)) + sec('Stash: mods ' + nM + '/' + st.modSlots, places('mod', st.modSlots)) +
      sec('Your guns', guns, 'none') + sec('Mod bag', mods, 'no loose mods') + '<p class="gclose" data-act="close">Close</p>';
  }
  return { html };
})();
if (typeof module !== 'undefined') module.exports = StashMenu;
