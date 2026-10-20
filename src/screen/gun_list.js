/* Every gun you can hold, in the order the Tune panel shows them: the three hand-made guns, then the 20 from the gun catalog. find(id) gives { id, name, build }. */
const GunList = (function () {
  const nice = (id) => id.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  const LIST = [
    { id: 'rifle', name: 'Gothic Rifle', build: () => GothicRifle.build(), hands: { grip: [0, -0.15, 0.15], fore: [0, -0.12, -0.45], mag: [0, -0.15, -0.13] } },   // the rifle keeps the hand spots it always had
    { id: 'ember', name: 'Ember Rifle', build: () => EmberRifle.build() },
    { id: 'revolver', name: 'Revolver', build: () => Revolver.build() },
  ].concat(GunCatalog.LIST.map((g) => ({ id: g.id, name: nice(g.id), build: g.build })));
  const find = (id) => LIST.find((g) => g.id === id) || LIST[0];
  return { LIST, find };
})();
if (typeof module !== 'undefined') module.exports = GunList;
