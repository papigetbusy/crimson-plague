/* Locked gates: doors across the corridors that cut the way from your spawn room to the boss's door.
   Pure (no browser, no clock, no unseeded random). A gate is only put where it really cuts the floor in two: with the gate shut, the boss's door can not be reached from where you spawn.
   A gate is three cells wide (the width of a corridor), marked 'D' in the rows like the boss door; the referee keeps it shut until it is paid for. */
const FloorGenGates = (function () {
  const open = (c) => c === '.' || c === 'c';
  const GAP = 14;                                           // gates stay this many cells from each other and from your spawn room

  // how many gates a floor gets: one on the first floors, more as the floors grow
  const countFor = (floor) => floor <= 2 ? 1 : floor <= 5 ? 2 : 3;

  // can you still walk from (sx, sz) to any of the target cells when the blocked cells are shut? Returns the walking distance field (-1 where you can not go)
  function field(g, W, H, sx, sz, blocked) {
    const d = new Int16Array(W * H).fill(-1), q = [sz * W + sx]; d[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % W, z = (c / W) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const n = nz * W + nx; if (d[n] >= 0 || blocked.has(n)) continue;
        const ch = g[nz][nx]; if (!(open(ch) || ch === 'P')) continue;
        d[n] = d[c] + 1; q.push(n);
      }
    }
    return d;
  }

  // g: the rows as arrays of characters; rooms: [{x,z,w,h,kind}]; start: [cx, cz]; beside: the cells just inside the boss door; returns [{cells, nx, nz}] and marks them 'D' in g
  function place(g, W, H, rooms, start, beside, floor, rng) {
    const want = countFor(floor);
    const nearRoom = (x, z) => rooms.some((r) => x >= r.x - 1 && z >= r.z - 1 && x <= r.x + r.w && z <= r.z + r.h);
    const base = field(g, W, H, start[0], start[1], new Set());
    const found = [];
    for (let z = 2; z < H - 2; z++) for (let x = 2; x < W - 2; x++) {
      for (const horiz of [true, false]) {
        // a run of three open cells with rock at both ends and open cells straight through the middle one (the corridor runs the other way)
        const cells = horiz ? [[x - 1, z], [x, z], [x + 1, z]] : [[x, z - 1], [x, z], [x, z + 1]];
        if (!cells.every(([a, b]) => open(g[b][a]) && !nearRoom(a, b))) continue;
        const e1 = horiz ? g[z][x - 2] : g[z - 2][x], e2 = horiz ? g[z][x + 2] : g[z + 2][x];
        if (open(e1) || open(e2) || e1 === 'P' || e2 === 'P' || e1 === 'D' || e2 === 'D') continue;
        const a = horiz ? g[z - 1][x] : g[z][x - 1], b = horiz ? g[z + 1][x] : g[z][x + 1];
        if (!open(a) || !open(b)) continue;
        if (!cells.every(([cx, cz]) => (horiz ? open(g[cz - 1][cx]) && open(g[cz + 1][cx]) : open(g[cz][cx - 1]) && open(g[cz][cx + 1])))) continue;   // the whole run sits across the corridor
        const dist = base[z * W + x]; if (dist < GAP) continue;
        found.push({ cells, horiz, x, z, dist });
      }
    }
    // keep only the ones that really cut the boss off
    const cuts = found.filter((c) => { const set = new Set(c.cells.map(([a, b]) => b * W + a)); const f = field(g, W, H, start[0], start[1], set); return beside.every(([a, b]) => f[b * W + a] < 0); });
    if (!cuts.length) return [];
    cuts.sort((p, q) => p.dist - q.dist);
    const picked = [];
    for (let i = 0; i < want; i++) {                         // spread along the way: the n-th gate near the n-th slice of the walk
      const target = cuts[0].dist + (cuts[cuts.length - 1].dist - cuts[0].dist) * (i + 0.5) / want;
      const best = cuts.filter((c) => picked.every((p) => Math.hypot(p.x - c.x, p.z - c.z) >= GAP)).sort((p, q) => Math.abs(p.dist - target) - Math.abs(q.dist - target))[0];
      if (!best) break; picked.push(best);
    }
    picked.sort((p, q) => p.dist - q.dist);
    return picked.map((c) => { for (const [a, b] of c.cells) g[b][a] = 'D'; return { cells: c.cells, nx: c.horiz ? 0 : 1, nz: c.horiz ? 1 : 0, x: (c.cells[1][0] + 0.5), z: (c.cells[1][1] + 0.5) }; });   // x, z are in cells here; floorgen turns them into world units
  }
  return { place, countFor, field, GAP };
})();
if (typeof module !== 'undefined') module.exports = FloorGenGates;
