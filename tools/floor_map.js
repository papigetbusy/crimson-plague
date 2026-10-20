// Dumps generated floors as JSON for tools/floor_map.py. usage: node tools/floor_map.js out.json seed floor [floor ...]
const FloorGen = require('../src/floorgen.js');
const mk = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const seed = +process.argv[3], floors = process.argv.slice(4).map(Number);
require('fs').writeFileSync(process.argv[2], JSON.stringify(floors.map((n) => FloorGen.generate(n, mk(seed + n * 101)))));
