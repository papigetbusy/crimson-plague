/* Every code-made gun by id. build(id) gives the same shape of answer as gothic_rifle.js (parts, anchors) plus name, kind, skin and hands. */
const GunCatalog = (function () {
  const sets = [typeof GunsPistol !== 'undefined' ? GunsPistol : require('./guns_pistol.js')];
  if (typeof GunsSmg !== 'undefined') sets.push(GunsSmg); else try { sets.push(require('./guns_smg.js')); } catch (e) { /* not built yet */ }
  if (typeof GunsShotgun !== 'undefined') sets.push(GunsShotgun); else try { sets.push(require('./guns_shotgun.js')); } catch (e) { /* not built yet */ }
  if (typeof GunsSniper !== 'undefined') sets.push(GunsSniper); else try { sets.push(require('./guns_sniper.js')); } catch (e) { /* not built yet */ }
  if (typeof GunsHmg !== 'undefined') sets.push(GunsHmg); else try { sets.push(require('./guns_hmg.js')); } catch (e) { /* not built yet */ }
  const LIST = [].concat(...sets.map((s) => s.LIST));
  const IDS = LIST.map((g) => g.id);
  function build(id) { const g = LIST.find((x) => x.id === id); if (!g) throw new Error('no gun ' + id); return g.build(); }
  return { IDS, build, LIST };
})();
if (typeof module !== 'undefined') module.exports = GunCatalog;
