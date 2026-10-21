/* The party panel (top left, under the health bar): each friend's name and health, and the message you see while you are down.
   Presentation only: reads state.coop. */
const PartyHud = (function () {
  function create($) {
    const box = $('party'), msg = $('downMsg');
    let key = '';
    function update(st) {
      const c = st.coop;
      if (!c || !c.on || !c.peers.length) { if (key) { box.innerHTML = ''; box.hidden = true; key = ''; } msg.hidden = true; return; }
      const k = c.peers.map((p) => p.name + ':' + Math.round(p.hp / Math.max(1, p.maxHp) * 20) + ':' + p.down).join('|');
      if (k !== key) {
        key = k; box.hidden = false;
        box.innerHTML = c.peers.map((p) => '<div class="pm' + (p.down ? ' dn' : '') + '"><b>' + String(p.name).replace(/[<>&]/g, '') + (p.down ? ' - DOWN' : '') + '</b><i><u style="width:' + Math.round(Math.max(0, Math.min(1, p.hp / Math.max(1, p.maxHp))) * 100) + '%"></u></i></div>').join('');
      }
      if (c.down) { msg.hidden = false; msg.innerHTML = 'YOU ARE DOWN<span>A friend standing close brings you back (' + Math.round(c.reviveK * 100) + '%)</span>'; }
      else msg.hidden = true;
    }
    return { update };
  }
  return { create };
})();
