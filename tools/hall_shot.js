// Dumps the hall exactly as the game bakes it (merged quads with torch light) plus the torch list, for tools/hall_shot.py to draw with no GPU.
// usage: node tools/hall_shot.js out.json
const Referee = require('../src/referee.js'), WorldBake = require('../src/screen/world_bake.js');
const ref = Referee.create(1), map = ref.map, world = WorldBake.bake(map);
require('fs').writeFileSync(process.argv[2], JSON.stringify({ buckets: world.buckets, torches: map.torches, wallH: map.WALL_H, cell: map.CELL, start: ref.snapshot().player }));
