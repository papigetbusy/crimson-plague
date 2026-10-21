// Floor generator checks (src/floorgen.js): plain sentences. Run: node tests/floor.test.js
global.FloorGenGates = require('../src/floorgen_gates.js'); const FloorGen = require('../src/floorgen.js');
let bad = 0;
const t = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
const mk = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
const walk = (c) => c === '.' || c === 'c';
function flood(f, sx, sz) {
  const seen = new Set([sz * f.W + sx]), q = [[sx, sz]], gate = new Set(f.gates.flatMap((g) => g.cells.map(([a, b]) => b * f.W + a)));   // the locked gates count as open here: every part of the floor can be reached once they are paid for
  for (let i = 0; i < q.length; i++) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = q[i][0] + dx, z = q[i][1] + dz;
    if (x < 0 || z < 0 || x >= f.W || z >= f.H || seen.has(z * f.W + x) || !(walk(f.rows[z][x]) || gate.has(z * f.W + x))) continue;
    seen.add(z * f.W + x); q.push([x, z]);
  }
  return seen;
}
const SEEDS = [1, 7, 42, 1337, 99999], FLOORS = [1, 2, 3, 5, 8, 12];
const all = []; for (const s of SEEDS) for (const n of FLOORS) all.push({ s, n, f: FloorGen.generate(n, mk(s + n * 101)) });

t('Floor 1 is the smallest, each floor is 10 cells bigger, and from floor 7 on every floor is the same maximum size', FloorGen.sizeFor(1) === 80 && FloorGen.sizeFor(2) === 90 && FloorGen.sizeFor(6) === 130 && FloorGen.sizeFor(7) === 140 && FloorGen.sizeFor(8) === 140 && FloorGen.sizeFor(40) === 140);
t('Every generated floor is square and matches its size', all.every(({ n, f }) => f.W === FloorGen.sizeFor(n) && f.H === f.W && f.rows.length === f.H && f.rows.every((r) => r.length === f.W)));
t('The same seed gives the same floor, and a different seed gives a different one', JSON.stringify(FloorGen.generate(3, mk(5)).rows) === JSON.stringify(FloorGen.generate(3, mk(5)).rows) && JSON.stringify(FloorGen.generate(3, mk(5)).rows) !== JSON.stringify(FloorGen.generate(3, mk(6)).rows));
t('Every floor is joined up: from where you spawn you can walk to every open cell of every room', all.every(({ f }) => { const sx = Math.floor(f.start.x / 2), sz = Math.floor(f.start.z / 2), seen = flood(f, sx, sz); return f.rooms.every((r) => { for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) if (walk(f.rows[z][x]) && !seen.has(z * f.W + x)) return false; return true; }); }));
t('You spawn on open floor, never inside a wall', all.every(({ f }) => walk(f.rows[Math.floor(f.start.z / 2)][Math.floor(f.start.x / 2)])));
t('The edge of the map is always wall, apart from the door', all.every(({ f }) => { for (let i = 0; i < f.W; i++) for (const [x, z] of [[i, 0], [i, f.H - 1], [0, i], [f.W - 1, i]]) { const c = f.rows[z][x]; if (c === '.' || c === 'c' || c === 'P') return false; } return true; }));
t('The door is two cells wide and sits in the outer wall, and the floor in front of it is open', all.every(({ f }) => f.door.cells.length === 2 && f.door.cells.every(([x, z]) => f.rows[z][x] === 'D' && (x === 0 || z === 0 || x === f.W - 1 || z === f.H - 1) && walk(f.rows[z + f.door.nz][x + f.door.nx]))));
t('The door is in the far corner: the opposite corner from where you spawn, at least 70% of the map across', all.every(({ f }) => { const d = Math.hypot(f.door.x - f.start.x, f.door.z - f.start.z); return d >= f.W * 2 * 0.7 && Math.sign(f.door.x - f.W) !== Math.sign(f.start.x - f.W) && Math.sign(f.door.z - f.H) !== Math.sign(f.start.z - f.H); }));
t('You can walk from your spawn to the door', all.every(({ f }) => { const seen = flood(f, Math.floor(f.start.x / 2), Math.floor(f.start.z / 2)); return f.door.cells.every(([x, z]) => seen.has((z + f.door.nz) * f.W + x + f.door.nx)); }));
t('Carpet is short: a runner through your spawn room and one leading up to the door, but no long runner across the map', all.every(({ f }) => { let n = 0; for (const r of f.rows) for (const c of r) if (c === 'c') n++; const rr = f.doorRunner, sx = Math.floor(f.start.x / 2), sz = Math.floor(f.start.z / 2); return n === f.carpetLength && n > 15 && n < f.W * 2 && rr.length >= 8 && rr.every(([x, z]) => f.rows[z][x] === 'c') && f.rows[sz][sx] === 'c'; }));
t('Pillars never block the carpet and never touch a wall', all.every(({ f }) => { for (let z = 1; z < f.H - 1; z++) for (let x = 1; x < f.W - 1; x++) if (f.rows[z][x] === 'P') for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!(dx === 0 && dz === 0) && !walk(f.rows[z + dz][x + dx]) && f.rows[z + dz][x + dx] !== 'P') return false; return true; }));
t('Torches stand beside open floor, are at least 4 units apart, and the corner rooms have braziers', all.every(({ f }) => f.torches.length > 10 && f.torches.every((tc) => walk(f.rows[Math.floor(tc.z / 2)][Math.floor(tc.x / 2)])) && f.torches.some((tc) => tc.kind === 'brazier')));
t('Floors have plenty of rooms, and the biggest floors have more rooms than floor 1', all.every(({ f }) => f.rooms.length >= 8) && SEEDS.every((sd) => all.find((x) => x.s === sd && x.n === 12).f.rooms.length > all.find((x) => x.s === sd && x.n === 1).f.rooms.length));
console.log(bad ? bad + ' failed' : 'all ok'); // ---- locked gates
const openOthers = (f, keep) => { const g = new Set(f.gates.filter((q, i) => i !== keep).flatMap((q) => q.cells.map(([a, b]) => b * f.W + a))); return g; };   // every gate except one stays shut
const reachShut = (f, others) => { const seen = new Set([Math.floor(f.start.z / 2) * f.W + Math.floor(f.start.x / 2)]), q = [...seen]; for (let i = 0; i < q.length; i++) { const x = q[i] % f.W, z = (q[i] / f.W) | 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz, n = nz * f.W + nx; if (seen.has(n) || nx < 0 || nz < 0 || nx >= f.W || nz >= f.H || !(walk(f.rows[nz][nx]) || others.has(n))) continue; seen.add(n); q.push(n); } } return seen; };
t('Every floor has at least one locked gate, and no more than three', all.every(({ f }) => f.gates.length >= 1 && f.gates.length <= 3));
t('The first two floors have one gate, floors 3 to 5 up to two, and later floors up to three', all.every(({ n, f }) => f.gates.length <= FloorGenGates.countFor(n)) && FloorGenGates.countFor(1) === 1 && FloorGenGates.countFor(4) === 2 && FloorGenGates.countFor(9) === 3);
t('A gate is three cells wide, marked as a door in the rows, and sits across a corridor', all.every(({ f }) => f.gates.every((g) => g.cells.length === 3 && g.cells.every(([x, z]) => f.rows[z][x] === 'D') && Math.abs(g.nx) + Math.abs(g.nz) === 1)));
t('With any one gate shut (and the others open) you can not walk from your spawn to the boss door: every gate really cuts the way', all.every(({ f }) => f.gates.every((g, i) => { const seen = reachShut(f, openOthers(f, i)); return f.door.cells.every(([x, z]) => !seen.has((z + f.door.nz) * f.W + x + f.door.nx)); })));
t('Gates keep their distance from each other and from your spawn room', all.every(({ f }) => f.gates.every((g, i) => f.gates.every((h, j) => i === j || Math.hypot(g.x - h.x, g.z - h.z) >= FloorGenGates.GAP * 2) && Math.hypot(g.x - f.start.x, g.z - f.start.z) >= 10)));
t('The same seed puts the gates in the same places', JSON.stringify(FloorGen.generate(4, mk(5)).gates) === JSON.stringify(FloorGen.generate(4, mk(5)).gates));
t('The safe room has no gates', FloorGen.safeRoom(1).gates.length === 0);
process.exit(bad ? 1 : 0);
