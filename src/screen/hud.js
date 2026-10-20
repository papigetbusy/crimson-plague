/* HUD for the core loop: wave counter, level and XP bar, boss bar, banners, the level-up cards and the game-over card.
   Presentation only: everything shown comes from the referee's snapshot; clicks are sent back through the callbacks. */
const Hud = (function () {
  function create($, cb) {
    const el = {
      waveN: $('waveN'), floorN: $('floorN'), waveLeft: $('waveLeft'), lvlN: $('lvlN'), xpFill: $('xpFill'), boss: $('boss'), bossName: $('bossName'), bossFill: $('bossFill'),
      banner: $('banner'), bannerT: $('bannerT'), bannerS: $('bannerS'), chips: $('chips'), frenzy: $('frenzy'),
      levelup: $('levelup'), cards: $('cards'), over: $('gameover'), overStats: $('overStats'), restart: $('restart')
    };
    let last = {}, chipKey = '', cardKey = '', bannerT = 0, sel = 0, cardN = 0;   // sel: the card a controller has highlighted
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
      else if (e.type === 'floorChange') banner('FLOOR ' + e.floor, 'The Plague runs deeper');
    }
    const applySel = () => Array.from(el.cards.children).forEach((b, i) => b.classList.toggle('sel', i === sel));
    function moveSel(d) { if (cardN) { sel = (sel + d + cardN) % cardN; applySel(); } }
    function selected() { return cardN ? sel : -1; }
    function showCards(choices) {
      const key = choices ? choices.map((c) => c.id + c.stack).join() : '';
      if (key === cardKey) return;
      cardKey = key; el.levelup.hidden = !choices;
      el.cards.textContent = '';
      cardN = choices ? choices.length : 0; sel = 0;
      if (!choices) return;
      choices.forEach((c, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'card3';
        const hint = document.createElement('i'); hint.textContent = String(i + 1);
        const nm = document.createElement('b'); nm.textContent = c.name;
        const ds = document.createElement('span'); ds.textContent = c.desc;
        const lv = document.createElement('em'); lv.textContent = c.stack ? 'Level ' + (c.stack + 1) + ' of ' + c.max : 'New';
        b.append(hint, nm, ds, lv);
        b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); cb.pick(i); });
        el.cards.appendChild(b);
      });
      applySel();
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
      const ck = st.skills.map((s) => s.id + s.n).join();
      if (ck !== chipKey) { chipKey = ck; el.chips.textContent = ''; for (const s of st.skills) { const c = document.createElement('span'); c.textContent = s.name + (s.n > 1 ? ' x' + s.n : ''); el.chips.appendChild(c); } }
      el.frenzy.hidden = !(st.frenzy > 0);
      if (st.frenzy > 0) setText('fz', el.frenzy, 'BLOODLUST ' + Math.ceil(st.frenzy));
      showCards(st.choices);
      el.over.hidden = !st.over;
      if (st.over) { const m = Math.floor(st.over.time / 60), s = Math.floor(st.over.time % 60); setText('os', el.overStats, 'You reached wave ' + st.over.wave + '  |  level ' + st.over.level + '  |  ' + st.kills + ' slain  |  ' + m + ':' + (s < 10 ? '0' : '') + s); }
      bannerT -= dt; if (bannerT <= 0) el.banner.classList.remove('show');
    }
    return { update, event, moveSel, selected };
  }
  return { create };
})();
