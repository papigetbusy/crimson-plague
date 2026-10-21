/* Every code-made gun by id. build(id) gives the same shape of answer as gothic_rifle.js (parts, anchors) plus name, kind, skin and hands. */
const GunCatalog = (function () {
  const sets = [typeof GunsPackedPistol !== 'undefined' ? GunsPackedPistol : require('./guns_packed_pistol.js')];
  if (typeof GunsPackedSmg !== 'undefined') sets.push(GunsPackedSmg); else try { sets.push(require('./guns_packed_smg.js')); } catch (e) { /* not built yet */ }
  if (typeof GunsPackedShotgun !== 'undefined') sets.push(GunsPackedShotgun); else try { sets.push(require('./guns_packed_shotgun.js')); } catch (e) { /* not built yet */ }
  if (typeof GunsPackedSniper !== 'undefined') sets.push(GunsPackedSniper); else try { sets.push(require('./guns_packed_sniper.js')); } catch (e) { /* not built yet */ }
  if (typeof GunsPackedHmg !== 'undefined') sets.push(GunsPackedHmg); else try { sets.push(require('./guns_packed_hmg.js')); } catch (e) { /* not built yet */ }
  const LIST = [].concat(...sets.map((s) => s.LIST));
  const IDS = LIST.map((g) => g.id);
  function build(id) { const g = LIST.find((x) => x.id === id); if (!g) throw new Error('no gun ' + id); return g.build(); }
  return { IDS, build, LIST };
})();
if (typeof module !== 'undefined') module.exports = GunCatalog;
