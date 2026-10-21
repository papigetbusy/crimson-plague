/* The Gear menu: everything you carry and wear in one screen (the game pauses while it is open). Two guns, head, chest, boots and two charms, each as the same
   card used for things on the floor, and a line of what it all adds up to. Presentation only: it draws the referee's snapshot. html() is pure so a test can check it. */
const GearMenu = (function () {
  const NAMES = { head: 'Head', chest: 'Chest', boots: 'Boots', charm: 'Charm' };
  const sign = (v, unit) => (v > 0 ? '+' + v + unit : '');
  function totals(g) {
    const bits = [g.def > 0 ? 'Defense ' + g.def + '%' : '', sign(g.hp, ' health'), sign(g.vit, '% max health'), g.regen > 0 ? '+' + g.regen + ' health/s' : '', sign(g.speed, '% speed'), sign(g.magnet, '% pickup range'),
      sign(g.dmg, '% damage'), sign(g.rate, '% fire rate'), sign(g.crit, '% crit'), sign(g.critdmg, '% crit damage'), sign(g.leech, ' life on kill'), sign(g.reload, '% faster reload')];
    const out = bits.filter(Boolean);
    return out.length ? out.join(' · ') : 'Nothing worn yet. Armor and charms drop from monsters.';
  }
  const colorOf = (c) => '#' + c.color.toString(16).padStart(6, '0');
  // the bag of loose mods: every mod with a button for each hand it could go on
  function bagHtml(player) {
    const g = player.gun, hands = [[g.held, 'hands'], [1 - g.held, 'back']].filter((h) => h[0] === g.held || g.other);
    const cards = player.mods.map((m, i) => '<div class="gslot" style="border-color:' + colorOf(m) + '">' + GunCard.modHtml(Object.assign({}, m, { why: '' })) + hands.map((h) => {
      const c = h[0] === g.held ? g.card : g.other.card, ok = fitsCard(c, m);
      return '<button class="gbtn" data-act="attach:' + i + ':' + h[0] + '"' + (ok ? '' : ' disabled') + '>' + (ok ? 'Fit to gun in ' + h[1] : 'Not this gun in ' + h[1]) + '</button>';
    }).join('') + stashBtn(player, 'mod', i) + '</div>').join('');
    return '<div class="gsec">Mod bag ' + player.mods.length + '/6</div><div class="ggrid">' + (cards || '<div class="gslot empty"><div class="sub">no loose mods</div></div>') + '</div>';
  }
  // the same fit rules as the referee, read from the cards (rarity window and a free place); the referee still has the last word
  const fitsCard = (c, m) => m.rarity >= Math.max(0, c.rarity - 1) && m.rarity <= Math.min(4, c.rarity + 1) && c.mods.length < c.slots;
  const stashBtn = () => '';                         // putting things away happens at the stash chest, not here
  // the stash: what you put away this run (it cannot be used until the run ends; then you can keep it as a blueprint)
  function stashHtml(player) {
    const st = player.stash; if (!st.items.length) return '';
    const cards = st.items.map((it) => '<div class="gslot" style="border-color:' + colorOf(it.card) + '">' + (it.kind === 'gear' ? GunCard.gearHtml(Object.assign({}, it.card, { vs: '' })) : GunCard.html(it.card, null, true)) + '</div>').join('');
    return '<div class="gsec">Stash ' + st.items.length + '/' + st.size + '' + '</div><div class="ggrid">' + (cards || '<div class="gslot empty"><div class="sub">nothing put away</div></div>') + '</div><div class="gtot">Stashed things cannot be used for the rest of this run. After you fall you can keep them as blueprints.</div>';
  }
  const gunSlot = (c, tag, hand, player) => {
    if (!c) return '<div class="gslot empty"><h4>Other hand</h4><div class="sub">empty</div></div>';
    const rm = c.mods.map((m, i) => '<button class="gbtn" data-act="detach:' + hand + ':' + i + '">Take off ' + m.name + '</button>').join('') + (player ? stashBtn(player, 'gun', hand) : '');
    return '<div class="gslot" style="border-color:' + colorOf(c) + '"><div class="sub">' + tag + '</div>' + GunCard.html(c, null, true) + rm + '</div>';
  };
  function html(player, msg) {
    const slot = (w) => w.empty ? '<div class="gslot empty"><h4>' + NAMES[w.slot] + '</h4><div class="sub">empty</div></div>' : '<div class="gslot" style="border-color:#' + w.color.toString(16).padStart(6, '0') + '">' + GunCard.gearHtml(Object.assign({}, w, { vs: '' })) + stashBtn(player, 'gear', w.i) + '</div>';
    const g = player.gun;
    return '<h2>Gear</h2><div class="gtot">' + totals(player.gear) + '</div>' + (msg ? '<div class="gmsg">' + msg + '</div>' : '') + '<div class="ggrid">' + gunSlot(g.card, 'in your hands', g.held, player) + gunSlot(g.other && g.other.card, 'on your back', 1 - g.held, player) + player.gear.worn.map((w, i) => slot(Object.assign({}, w, { i }))).join('') + '</div>' + bagHtml(player) + stashHtml(player) + '<p class="gclose" data-act="close">Close</p>';
  }
  // id: which overlay element; htmlFn: what it shows (the Gear menu by default, the stash menu for the chest)
  function create($, hooks, id, htmlFn) {
    const el = $(id || 'gearMenu'); let open = false; const render = htmlFn || html;
    const focus = MenuFocus.create(() => el, '[data-act]', false);
    const draw = (msg) => { if (hooks && hooks.state) { el.querySelector('.gbody').innerHTML = render(hooks.state().player, msg); focus.apply(); } };
    function setOpen(v, state) { open = v; el.hidden = !v; if (v && state) { el.querySelector('.gbody').innerHTML = render(state.player); focus.reset(); } if (hooks && hooks.onChange) hooks.onChange(v); }
    // tap a button to fit/remove a mod; tap "Close" or the dark space around the menu to leave
    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest && e.target.closest('[data-act]'); e.preventDefault();
      if (!b) { if (e.target === el) setOpen(false); return; }
      const parts = b.dataset.act.split(':'), act = parts[0];
      if (act === 'close') { setOpen(false); return; }
      if (b.disabled || !hooks || !hooks.act) return;
      const why = hooks.act(parts); draw(why ? (why[0] === '✔' ? why : 'Cannot: ' + why) : '');
    });
    return { setOpen, redraw: draw, nav: (d) => focus.move(d), press: () => focus.press('pointerdown'), toggle: (state) => setOpen(!open, state), get isOpen() { return open; } };
  }
  return { html, totals, create };
})();
if (typeof module !== 'undefined') module.exports = GearMenu;
