/* Saves on screen: the list of saves kept in this browser, and the buttons to go back to one or delete it. The rules (what a save holds, that the map seed is kept and the
   damage and item seeds are rolled fresh) live in the referee's saveData / loadData; this file only keeps the list and draws it. html() is pure so a test can check it. */
const Saves = (function () {
  const KEY = 'cp_saves_v1', MAX = 8;
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const read = () => { try { const a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* private window: saves last until the page closes */ } };
  let mem = null;                                     // the list as the page sees it (also kept when storage is blocked)
  const all = () => (mem || (mem = read()));
  // add a save (newest first). Saving the same floor of the same map again replaces the older one, so a safe room never fills the list with copies.
  function add(data, when) {
    const list = all().filter((s) => !(s.data.mapSeed === data.mapSeed && s.data.floor === data.floor && s.data.classId === data.classId));
    list.unshift({ id: String(Date.now()) + Math.floor(Math.random() * 1000), when: when || '', data });
    mem = list.slice(0, MAX); write(mem); return mem[0];
  }
  const remove = (id) => { mem = all().filter((s) => s.id !== id); write(mem); };
  const find = (id) => all().find((s) => s.id === id);
  const label = (s) => 'Floor ' + s.data.floor + ' · Wave ' + s.data.wave + ' · Level ' + s.data.level + (s.data.classId ? ' · ' + s.data.classId[0].toUpperCase() + s.data.classId.slice(1) : '');
  // the list: Continue (same map, new luck) and Delete for each save
  function html(list) {
    if (!list.length) return '<p class="bpnone">Saves: none yet. Press Save game at the stash chest in a safe room.</p>';
    return '<div class="bphead">Saves (same map, new luck every time)</div>' + list.map((s) => '<div class="sv"><button type="button" data-load="' + esc(s.id) + '">Continue<span>' + esc(label(s)) + (s.when ? ' · ' + esc(s.when) : '') + '</span></button><button type="button" class="svdel" data-del="' + esc(s.id) + '">Delete</button></div>').join('');
  }
  return { all, add, remove, find, html, label, MAX };
})();
if (typeof module !== 'undefined') module.exports = Saves;
