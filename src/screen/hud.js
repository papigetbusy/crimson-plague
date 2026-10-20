/* HUD for the core loop: wave counter, level and XP bar, boss bar, banners, the level-up cards and the game-over card.
   Presentation only: everything shown comes from the referee's snapshot; clicks are sent back through the callbacks. */
const Hud = (function () {
  function create($, cb) {
    const el = {
      waveN: $('waveN'), floorN: $('floorN'), waveLeft: $('waveLeft'), lvlN: $('lvlN'), xpFill: $('xpFill'), boss: $('boss'), bossName: $('bossName'), bossFill: $('bossFill'),
      banner: $('banner'), bannerT: $('bannerT'), bannerS: $('bannerS'), chips: $('chips'), frenzy: $('frenzy'), clsName: $('clsName'), ultBox: $('ultBox'), ultName: $('ultName'), ultFill: $('ultFill'),
      levelup: $('levelup'), cards: $('cards'), classCards: $('classCards'), classHead: $('clsHead'), cardHead: $('cardHead'), over: $('gameover'), overStats: $('overStats'), restart: $('restart')
    };
    let last = {}, chipKey = '', bannerT = 0;
    const setText = (k, node, v) => { if (last[k] !== v) { node.textContent = v; last[k] = v; } };
    el.restart.addEventListener('click', () => cb.restart());
    function banner(title, sub) {
      el.bannerT.textContent = title; el.bannerS.textContent = sub || '';
      el.banner.classList.remove('show'); void el.banner.offsetWidth; el.banner.classList.add('show'); bannerT = 2.6;
    }
    function event(e) {
      if (e.type === 'waveStart') banner('WAVE ' + e.n, e.boss ? 'A Demon Lord comes' : e.count + ' monsters');
      else if (e.type === 'waveClear') banner('WAVE ' + e.n + ' CLEARED', 'Gather the souls');
      else if (e.type === 'pickup') banner(e.kind === 'heal' ? '+HEALTH' : 'BLOODLUST', e.kind === 'heal' ? '' : 'More damage, faster fire');
      else if (e.type === 'bossSummon') banner('HOUNDS CALLED', '');
      else if (e.type === 'bossWake') banner('THE DEMON LORD WAKES', 'Fight for the door');
      else if (e.type === 'doorOpen') banner('THE DOOR OPENS', 'Step through to the next floor');
      else if (e.type === 'ultStart') banner(e.name.toUpperCase(), 'Unleashed');
      else if (e.type === 'skillNew') banner(e.name.toUpperCase(), 'New class skill');
      else if (e.type === 'skillLevel') banner(e.name.toUpperCase(), 'Level ' + e.lvl + ': ' + e.stat);
      else if (e.type === 'floorChange') banner('FLOOR ' + e.floor, 'The Plague runs deeper');
    }
    // two rows of cards on a level-up: the class skills (top) and the regular gifts (below). A controller highlights one card at a time.
    const rows = [
      { name: 'class', box: el.classCards, head: el.classHead, n: 0, sel: 0, key: '', hint: 4, send: (i) => cb.pickClass(i) },
      { name: 'gift', box: el.cards, head: el.cardHead, n: 0, sel: 0, key: '', hint: 1, send: (i) => cb.pick(i) }
    ];
    let cur = 0;
    const applySel = () => rows.forEach((r, ri) => Array.from(r.box.children).forEach((b, i) => b.classList.toggle('sel', ri === cur && i === r.sel)));
    const fixCur = () => { if (!rows[cur].n) { const o = rows.findIndex((r) => r.n); if (o >= 0) cur = o; } };
    function moveSel(d) { const r = rows[cur]; if (r.n) { r.sel = (r.sel + d + r.n) % r.n; applySel(); } }
    function moveRow(d) { const o = cur + d; if (o >= 0 && o < rows.length && rows[o].n) { cur = o; applySel(); } }
    function selected() { const r = rows[cur]; return r.n ? { row: r.name, index: r.sel } : null; }
    function showRow(r, list, label) {
      const key = list ? list.map((c) => c.id + (c.stack || c.lvl || 0)).join() : '';
      if (key === r.key) return;
      r.key = key; r.box.hidden = !list; r.head.hidden = !list;
      r.box.textContent = '';
      r.n = list ? list.length : 0; r.sel = 0;
      if (!list) { fixCur(); applySel(); return; }
      list.forEach((c, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'card3' + (c.ult ? ' ult' : '') + (r.name === 'class' ? ' cls' : '');
        const hint = document.createElement('i'); hint.textContent = String(r.hint + i);
        const nm = document.createElement('b'); nm.textContent = c.name;
        const ds = document.createElement('span'); ds.textContent = r.name === 'class' && c.lvl ? c.now + '  →  ' + c.next : c.desc;   // an upgrade says exactly what changes
        const lv = document.createElement('em');
        if (r.name === 'class') lv.textContent = c.lvl ? 'Level ' + (c.lvl + 1) + ' of ' + c.max : (c.ult ? 'Ultimate' : 'New skill');
        else lv.textContent = c.stack ? 'Level ' + (c.stack + 1) + ' of ' + c.max : 'New';
        b.append(hint, nm, ds, lv);
        b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); r.send(i); });
        r.box.appendChild(b);
      });
      fixCur(); applySel();
    }
    function showCards(choices, classChoices) {
      showRow(rows[0], classChoices);
      showRow(rows[1], choices);
      el.levelup.hidden = !(choices || classChoices);
      el.levelup.classList.toggle('two', !!(choices && classChoices));
    }
    function update(st, dt) {
      setText('wn', el.waveN, st.wave.phase === 'intermission' && st.wave.timer > 0 ? 'WAVE ' + st.wave.n + ' IN ' + Math.ceil(st.wave.timer) : 'WAVE ' + st.wave.n);
      setText('wl', el.waveLeft, st.wave.phase === 'fight' ? st.wave.left + ' left' : 'rest a moment');
      setText('fl', el.floorN, 'FLOOR ' + st.floor);
      el.waveN.classList.toggle('boss', !!st.wave.boss);
      setText('lv', el.lvlN, 'LV ' + st.level.n);
      el.xpFill.style.width = (Math.min(1, st.level.xp / st.level.need) * 100).toFixed(1) + '%';
      const showBoss = st.bossBar && st.bossBar.state !== 'guard';   // his bar waits until he wakes, so it does not cover the compass
      el.boss.hidden = !showBoss;
      if (showBoss) { setText('bn', el.bossName, st.bossBar.name); el.bossFill.style.width = (Math.max(0, st.bossBar.hp / st.bossBar.maxHp) * 100).toFixed(1) + '%'; el.boss.classList.toggle('charge', st.bossBar.state === 'windup' || st.bossBar.state === 'charge'); }
      const cl = st.cls, ck = st.skills.map((s) => s.id + s.n).join() + '|' + (cl ? cl.skills.map((s) => s.id + s.lvl).join() : '');
      if (ck !== chipKey) {
        chipKey = ck; el.chips.textContent = '';
        if (cl) for (const s of cl.skills) { const c = document.createElement('span'); c.className = 'cls' + (s.ult ? ' ult' : ''); c.textContent = s.name + ' ' + s.lvl; el.chips.appendChild(c); }
        for (const s of st.skills) { const c = document.createElement('span'); c.textContent = s.name + (s.n > 1 ? ' x' + s.n : ''); el.chips.appendChild(c); }
      }
      setText('cn', el.clsName, cl ? cl.name : '');
      el.ultBox.hidden = !(cl && cl.ult);
      if (cl && cl.ult) { setText('un', el.ultName, cl.ult.name + (cl.ult.active ? ' ACTIVE' : '')); el.ultFill.style.width = (Math.min(1, cl.ult.k) * 100).toFixed(1) + '%'; el.ultBox.classList.toggle('on', cl.ult.active); }
      el.frenzy.hidden = !(st.frenzy > 0);
      if (st.frenzy > 0) setText('fz', el.frenzy, 'BLOODLUST ' + Math.ceil(st.frenzy));
      showCards(st.choices, st.classChoices);
      el.over.hidden = !st.over;
      if (st.over) { const m = Math.floor(st.over.time / 60), s = Math.floor(st.over.time % 60); setText('os', el.overStats, 'You reached wave ' + st.over.wave + '  |  level ' + st.over.level + '  |  ' + st.kills + ' slain  |  ' + m + ':' + (s < 10 ? '0' : '') + s); }
      bannerT -= dt; if (bannerT <= 0) el.banner.classList.remove('show');
    }
    return { update, event, moveSel, moveRow, selected };
  }
  return { create };
})();
