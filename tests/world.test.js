// Hall look checks: the baked hall (src/screen/world_bake.js) has what the look pass promised. Plain sentences. Run: node tests/world.test.js
const WorldBake = require('../src/screen/world_bake.js'), Referee = require('../src/referee.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const map = Referee.create(1).map, world = WorldBake.bake(map), B = world.buckets;
const n = (k) => (B[k] ? B[k].pos.length / 3 : 0);

t('Every texture kind the hall uses has geometry (stone, cloth, panel, pillar, gold, three floor sets, worn edge, carpet, ceiling)', ['stone', 'cloth', 'panel', 'pillar', 'gold', 'floor', 'floor2', 'floor3', 'floorEdge', 'carpet', 'ceil'].every((k) => n(k) > 0));
t('Banners are raised cloth slabs: cloth quads exist and the wall behind them is plain stone, not a flat banner picture', n('cloth') > 0 && !B.banner);
t('Every vertex has a position, a texture coordinate and a colour, in matching counts', Object.values(B).every((b) => b.pos.length / 3 === b.uv.length / 2 && b.pos.length === b.col.length));
t('No wall, rib or banner reaches above the ceiling', Object.values(B).every((b) => { for (let i = 1; i < b.pos.length; i += 3) if (b.pos[i] > map.WALL_H + 1e-6) return false; return true; }));
t('The torch light never exceeds the light cap', Object.values(B).every((b) => b.col.every((v) => v <= 2.0 + 1e-6)));
t('The same map bakes to the same hall every time', JSON.stringify(WorldBake.bake(map).buckets.floor.col) === JSON.stringify(B.floor.col));
t('Light for things that move is the same torch light, and is brighter beside a torch than far from it', (() => { const tr = map.torches[0], near = world.light(tr.x + tr.nx, 1.5, tr.z + tr.nz, 0, 1, 0), far = world.light(21, 1.5, 58, 0, 1, 0); return near[1] > far[1]; })());
console.log(bad ? bad + ' failed' : 'all ok'); process.exit(bad ? 1 : 0);
