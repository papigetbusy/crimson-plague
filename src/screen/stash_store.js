/* The stash kept in this browser, so what you put in the chest is still there on your next run. The referee owns the rules (3 gun places, 3 mod places);
   this only reads and writes the list. If the browser will not save (a private window) the stash lasts until the page closes. */
const StashStore = (function () {
  const KEY = 'cp_stash_v1';
  function read() { try { const a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function write(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* nothing to do */ } }
  return { read, write };
})();
if (typeof module !== 'undefined') module.exports = StashStore;
