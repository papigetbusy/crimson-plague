// Dumps the hall exactly as the game bakes it (merged quads with torch light) plus the torch list, for tools/hall_shot.py to draw with no GPU.
// usage: node tools/hall_shot.js out.json [safe]   (safe draws the safe room instead of floor 1)
const Referee = require('../src/referee.js'), WorldBake = require('../src/screen/world_bake.js');
const ref = Referee.create(+process.env.SEED || 1); if (process.env.TIER || process.env.FLOOR) { ref.setCfg({ trapTier: process.env.TIER ? +process.env.TIER : undefined, startWave: process.env.FLOOR ? (+process.env.FLOOR - 1) * 10 + 1 : undefined }); ref.reset(); }
const map = process.argv[3] === 'safe' ? require('../src/floorgen.js').safeRoom(1) : ref.map; if (!map.WALL_H) map.WALL_H = ref.map.WALL_H; const world = WorldBake.bake(map);
require('fs').writeFileSync(process.argv[2], JSON.stringify({ buckets: world.buckets, torches: map.torches, traps: map.traps || [], wallH: map.WALL_H, cell: map.CELL, locks: process.argv[3] === 'safe' ? null : ref.snapshot().locks, mapId: map.id, start: process.argv[3] === 'safe' ? { x: map.start.x, z: map.start.z, yaw: 0 } : ref.snapshot().player }));
