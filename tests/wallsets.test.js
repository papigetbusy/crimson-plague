// Wall set checks: six wall looks that cycle by floor, each its own colours, painted the same way every time. Plain sentences. Run: node tests/wallsets.test.js
global.WallMaterials = require('../src/screen/wall_materials.js'); const WallSets = require('../src/screen/wall_sets.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
// a pretend canvas that remembers every pixel painted on it
function canvas(w, h) { const px = new Array(w * h).fill('start'); const g = { fillStyle: '', fillRect(x, y, a, b) { for (let j = 0; j < b; j++) for (let i = 0; i < a; i++) if (x + i >= 0 && x + i < w && y + j >= 0 && y + j < h) px[(y + j) * w + x + i] = this.fillStyle; }, getImageData() { return px.slice(); }, putImageData(d) { for (let i = 0; i < d.length; i++) px[i] = d[i]; } }; return { width: w, height: h, px, getContext: () => g }; }
const NAMES = { texStone: [32, 64], texPanel: [32, 64], texPillar: [32, 64], texFloor: [32, 32], texFloor2: [32, 32], texFloor3: [32, 32], texFloorEdge: [32, 32], texCeil: [32, 32] };
const makeT = () => { const T = {}; for (const n in NAMES) T[n] = { image: canvas(NAMES[n][0], NAMES[n][1]), needsUpdate: false }; return T; };
const paint = (id) => { const T = makeT(), s = WallSets.create(T); s.apply(id); return T; };
const sig = (T) => Object.keys(NAMES).map((n) => T[n].image.px.join('|')).join('#');

t('There are six wall sets, each with its own name, fog colour and torch colours', WallSets.LIST.length === 6 && new Set(WallSets.LIST.map((s) => s.name)).size === 6 && new Set(WallSets.LIST.map((s) => s.fog.join())).size === 6 && new Set(WallSets.LIST.map((s) => s.flame.join())).size === 6);
t('Floor 1 is the Gothic Crypt and floor 2 is the Blood Catacombs', WallSets.forFloor(1).id === 'crypt' && WallSets.forFloor(2).id === 'blood');
t('The sets cycle: floor 7 is the Crypt again and floor 12 is the Void Cathedral', WallSets.forFloor(7).id === 'crypt' && WallSets.forFloor(12).id === 'void');
t('A strange floor number (0, negative or missing) still gives a set', [0, -3, undefined, NaN].every((f) => WallSets.IDS.includes(WallSets.forFloor(f).id)));
const sigs = WallSets.IDS.slice(1).map((id) => sig(paint(id)));
t('Every set paints different walls, panels, pillars, floors and ceilings', new Set(sigs).size === 5 && WallSets.IDS.slice(1).every((id, i) => { const a = paint(id), b = paint('crypt'); return ['texStone', 'texPanel', 'texPillar', 'texFloor', 'texCeil'].every((n) => a[n].image.px.join() !== b[n].image.px.join()); }));
t('A set paints exactly the same pixels every time', WallSets.IDS.slice(1).every((id) => sig(paint(id)) === sig(paint(id))));
t('Every pixel of every painted texture is painted (nothing left blank)', WallSets.IDS.slice(1).every((id) => { const T = paint(id); return Object.keys(NAMES).every((n) => !T[n].image.px.includes('start')); }));
t('Every painted texture is marked to be re-uploaded to the screen', Object.values(paint('void')).every((x) => x.needsUpdate));
{ const T = makeT(); for (const n in T) { const g = T[n].image.getContext(); g.fillStyle = 'orig'; g.fillRect(0, 0, 32, 64); }
  const s = WallSets.create(T); s.apply('frost'); const changed = T.texStone.image.px[5] !== 'orig' || T.texStone.image.px.join() !== new Array(2048).fill('orig').join(); s.apply('crypt');
  t('Going back to the Crypt puts the original paint back exactly', changed && Object.keys(NAMES).every((n) => T[n].image.px.every((p) => p === 'orig'))); }
t('The five new walls are made of different things: bones, planks, ice, columns, slabs', ['bones', 'planks', 'shards', 'columns', 'slabs'].every((k) => typeof WallMaterials[k] === 'function'));
process.exit(bad ? 1 : 0);
