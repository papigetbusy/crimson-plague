/* The Codex screen: a book of everything in the game, opened from the start card (so also from pause). Tabs on the left, a search box on top, the page on the right.
   Presentation only: the pages come from CodexPages (built from the referee's own data). */
const Codex = (function () {
  function create($, data) {
    const el = $('codex'); let built = false, pgs = null, cur = 0;
    const tabs = el.querySelector('.cxtabs'), body = el.querySelector('.cxbody'), q = el.querySelector('input');
    function show(i) {
      cur = i; q.value = '';
      Array.from(tabs.children).forEach((b, k) => b.classList.toggle('on', k === i));
      body.innerHTML = '<h2>' + pgs[i].title + '</h2>' + pgs[i].sections.map((s) => '<section><h3>' + s.title + '</h3>' + s.html + '</section>').join('');
      body.scrollTop = 0;
    }
    function results(text) {
      if (!text.trim()) { show(cur); return; }
      const r = CodexPages.search(pgs, text);
      Array.from(tabs.children).forEach((b) => b.classList.remove('on'));
      body.innerHTML = '<h2>Search: ' + text.replace(/[<>&]/g, '') + '</h2>' + (r.length ? r.map((s) => '<section><h3>' + s.title + ' <small>' + s.page + '</small></h3>' + s.html + '</section>').join('') : '<p>Nothing found. Try another word, like a gun, monster, class, status or affix name.</p>');
      body.scrollTop = 0;
    }
    function build() {
      pgs = CodexPages.pages(data());
      tabs.innerHTML = '';
      pgs.forEach((pg, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = pg.title; b.addEventListener('click', () => show(i)); tabs.appendChild(b); });
      built = true;
    }
    const open = () => { if (!built) build(); el.hidden = false; show(cur); };
    const close = () => { el.hidden = true; };
    q.addEventListener('input', () => results(q.value));
    el.querySelector('.cxclose').addEventListener('click', close);
    for (const ev of ['keydown', 'keyup']) el.addEventListener(ev, (e) => { if (ev === 'keydown' && e.code === 'Escape') close(); e.stopPropagation(); });   // typing in the search box must not start the game or move you
    return { open, close, get isOpen() { return !el.hidden; } };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = Codex;
