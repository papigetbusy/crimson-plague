/* Floor generator: rooms joined by winding corridors, from a seed. Pure (no browser, no clock, no unseeded random):
   the referee hands in its seeded rng, so the same seed gives the same floor.
   Grid characters (same as the old hall): '#' stone (flavoured later), '.' floor, 'c' carpet, 'P' pillar, 'D' the locked door.
   You spawn in one corner room; the door is in the opposite corner room, on the outer wall. Short carpet runners lie in the corner rooms and in some others; the one in the door room leads up to the door. */
const FloorGen = (function () {
  const CELL = 2;
  const open = (c) => c === '.' || c === 'c';

  // how big floor n is, in cells (floor 1 smallest, +grow each floor, then it stops at max)
  const SIZES = { first: 80, grow: 10, max: 140 };
  const sizeFor = (floor) => Math.min(SIZES.max, SIZES.first + SIZES.grow * (floor - 1));

  // tier is how advanced the traps are (the floor number unless a test asks for more)
  function generate(floor, rng, tier) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const f = tryGenerate(floor, rng, tier || floor);
      if (f) return f;
    }
    throw new Error('floor generator could not connect a floor');
  }

  function tryGenerate(floor, rng, tier) {
    const W = sizeFor(floor), H = W;
    const g = []; for (let z = 0; z < H; z++) g.push(new Array(W).fill('#'));
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const rooms = [];
    const carveRoom = (r) => { for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) g[z][x] = '.'; rooms.push(r); };
    const centre = (r) => [r.x + (r.w >> 1), r.z + (r.h >> 1)];

    // the two corner rooms: where you spawn, and the room with the door in the opposite corner
    const corner = ri(0, 3), left = corner % 2 === 0, top = corner < 2;
    const startW = 9, doorW = 13;
    const start = { x: left ? 1 : W - 1 - startW, z: top ? 1 : H - 1 - startW, w: startW, h: startW, kind: 'start' };
    const door = { x: left ? W - 1 - doorW : 1, z: top ? H - 1 - doorW : 1, w: doorW, h: doorW, kind: 'door' };
    carveRoom(start); carveRoom(door);

    // the other rooms: random rectangles that keep two cells of rock between each other
    const target = Math.round(W * H / 190), apart = (a, b, pad) => a.x - pad < b.x + b.w && b.x - pad < a.x + a.w && a.z - pad < b.z + b.h && b.z - pad < a.z + a.h;
    for (let tries = 0; tries < 900 && rooms.length < target; tries++) {
      const w = ri(5, 13), h = ri(5, 13), r = { x: ri(1, W - w - 1), z: ri(1, H - h - 1), w, h, kind: 'room' };
      if (rooms.some((o) => apart(r, o, 3))) continue;
      carveRoom(r);
    }

    // winding corridors, three cells wide: a spanning tree over the rooms, then a few extra loops
    const carveRun = (x0, z0, x1, z1) => {
      const sx = Math.sign(x1 - x0), sz = Math.sign(z1 - z0);
      let x = x0, z = z0;
      const dot = () => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const cx = x + dx, cz = z + dz; if (cx >= 1 && cz >= 1 && cx < W - 1 && cz < H - 1 && g[cz][cx] === '#') g[cz][cx] = '.'; } };
      dot();
      while (x !== x1) { x += sx; dot(); }
      while (z !== z1) { z += sz; dot(); }
    };
    const clampXZ = (x, z) => [Math.max(3, Math.min(W - 4, x)), Math.max(3, Math.min(H - 4, z))];
    const link = (a, b) => {
      const pts = [centre(a)], n = ri(1, 2);
      for (let i = 0; i < n; i++) { const [ax, az] = centre(a), [bx, bz] = centre(b); const t = (i + 1) / (n + 1); pts.push(clampXZ(Math.round(ax + (bx - ax) * t) + ri(-9, 9), Math.round(az + (bz - az) * t) + ri(-9, 9))); }
      pts.push(centre(b));
      for (let i = 0; i + 1 < pts.length; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        if (rng() < 0.5) { carveRun(x0, z0, x1, z0); carveRun(x1, z0, x1, z1); } else { carveRun(x0, z0, x0, z1); carveRun(x0, z1, x1, z1); }
      }
    };
    const dist = (a, b) => { const p = centre(a), q = centre(b); return Math.hypot(p[0] - q[0], p[1] - q[1]); };
    const inTree = [rooms[0]], edges = [], used = new Set();
    while (inTree.length < rooms.length) {
      let best = null;
      for (const a of inTree) for (const b of rooms) { if (inTree.includes(b)) continue; const d = dist(a, b) * (0.85 + rng() * 0.3); if (!best || d < best.d) best = { a, b, d }; }
      inTree.push(best.b); edges.push(best); used.add(rooms.indexOf(best.a) + '-' + rooms.indexOf(best.b));
    }
    for (const e of edges) link(e.a, e.b);
    for (let i = 0, extra = Math.floor(rooms.length * 0.3); i < extra; i++) {
      const a = rooms[ri(0, rooms.length - 1)], near = rooms.filter((o) => o !== a).sort((p, q) => dist(a, p) - dist(a, q)).slice(0, 3), b = near[ri(0, near.length - 1)];
      if (!used.has(rooms.indexOf(a) + '-' + rooms.indexOf(b)) && !used.has(rooms.indexOf(b) + '-' + rooms.indexOf(a))) link(a, b);
    }

    // the door: two cells wide, in the outer wall of the corner room, on a side that faces the map edge
    const dc = centre(door), horizontal = rng() < 0.5;
    const doorCells = horizontal ? [[dc[0] - 1, top ? H - 1 : 0], [dc[0], top ? H - 1 : 0]] : [[left ? W - 1 : 0, dc[1] - 1], [left ? W - 1 : 0, dc[1]]];
    const dn = horizontal ? { nx: 0, nz: top ? -1 : 1 } : { nx: left ? -1 : 1, nz: 0 };
    for (const [x, z] of doorCells) g[z][x] = 'D';

    // is everything joined up? (the door cells count as reachable from the room beside them)
    const sc = centre(start), seen = reach(g, W, H, sc[0], sc[1]);
    if (rooms.some((r) => !seen[centre(r)[1] * W + centre(r)[0]])) return null;
    const beside = doorCells.map(([x, z]) => [x + dn.nx, z + dn.nz]);
    if (beside.some(([x, z]) => !seen[z * W + x])) return null;

    // short carpet runners: one through your spawn room, one leading up to the door, and one in about a third of the other big rooms
    const runner = (cells) => { for (const [x, z] of cells) if (g[z][x] === '.') g[z][x] = 'c'; };
    const line = (x, z, dx, dz, n) => { const out = []; for (let i = 0; i < n; i++) out.push([x + dx * i, z + dz * i]); return out; };
    const inRoom = (r, x, z) => x >= r.x && z >= r.z && x < r.x + r.w && z < r.z + r.h;
    const toDoor = beside.flatMap(([x, z]) => line(x, z, dn.nx, dn.nz, 8)).filter(([x, z]) => inRoom(door, x, z));   // two cells wide, like the door, running into the room
    runner(toDoor);
    runner(horizontal ? line(sc[0], start.z + 1, 0, 1, start.h - 2) : line(start.x + 1, sc[1], 1, 0, start.w - 2));
    for (const r of rooms) if (r.kind === 'room' && r.w >= 7 && r.h >= 7 && rng() < 0.35) { const c = centre(r); runner(rng() < 0.5 ? line(r.x + 1, c[1], 1, 0, r.w - 2) : line(c[0], r.z + 1, 0, 1, r.h - 2)); }
    let carpetCount = 0; for (const row of g) for (const c of row) if (c === 'c') carpetCount++;
    const carpet = { size: carpetCount };

    // pillars in the big rooms, on a loose grid, never on the carpet and never touching a wall
    for (const r of rooms) {
      if (r.w < 8 || r.h < 8) continue;
      for (let z = r.z + 2; z < r.z + r.h - 2; z += 4) for (let x = r.x + 2; x < r.x + r.w - 2; x += 4) {
        let ok = true;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (g[z + dz][x + dx] !== '.') ok = false;
        if (ok) g[z][x] = 'P';
      }
    }
    // pillars must not cut the floor in two
    const seen2 = reach(g, W, H, sc[0], sc[1]);
    if (rooms.some((r) => !seen2[centre(r)[1] * W + centre(r)[0]])) return null;

    // wall flavours, as before: B banner, W window panel, # plain stone
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (g[z][x] === '#') { const k = (x + z) % 3; g[z][x] = k === 0 ? 'B' : k === 1 ? 'W' : '#'; }
    for (const [x, z] of doorCells) g[z][x] = 'D';

    const torches = placeTorches(g, W, H, rooms, doorCells, dn, rng);
    const traps = placeTraps(g, rooms, tier, rng);          // last, so the hall itself is the same as before traps existed
    const yaw = Math.atan2(dc[0] - sc[0], -(dc[1] - sc[1]));
    return {
      W, H, CELL, floor, rows: g.map((r) => r.join('')), torches, rooms, traps,
      start: { x: (sc[0] + 0.5) * CELL, z: (sc[1] + 0.5) * CELL, yaw },
      door: { cells: doorCells, nx: dn.nx, nz: dn.nz, x: (doorCells[0][0] + doorCells[1][0] + 1) / 2 * CELL, z: (doorCells[0][1] + doorCells[1][1] + 1) / 2 * CELL },
      carpetLength: carpet.size, doorRunner: toDoor
    };
  }


  // traps, from the seed, in the ordinary rooms only (never your spawn room or the door room).
  // 'spike' is always up and is the only kind on the first floors; 'vent' (a jet of flame on a beat) comes in at tier 3; 'pulse' (spikes that rise and sink) at tier 5.
  // More rooms get one and the spike patches get bigger as the tier climbs. x, z, w, h are in cells; phase offsets the beat.
  function placeTraps(g, rooms, tier, rng) {
    const traps = [], chance = Math.min(0.65, 0.2 + 0.05 * tier);
    const taken = (x, z, w, h) => traps.some((t) => x < t.x + t.w + 1 && t.x < x + w + 1 && z < t.z + t.h + 1 && t.z < z + h + 1);
    for (const r of rooms) {
      if (r.kind !== 'room' || r.w < 6 || r.h < 6 || rng() > chance) continue;
      const roll = rng();
      const kind = tier >= 5 ? (roll < 0.3 ? 'spike' : roll < 0.65 ? 'vent' : 'pulse') : tier >= 3 ? (roll < 0.6 ? 'spike' : 'vent') : 'spike';
      const size = kind === 'vent' ? [1, 1] : tier >= 5 ? [3, 3] : tier >= 3 ? [2, 3] : [2, 2];
      const count = kind === 'vent' ? 1 + (rng() < 0.5 ? 1 : 0) : 1;
      for (let n = 0; n < count; n++) for (let tries = 0; tries < 12; tries++) {
        const w = size[0], h = size[1];
        const x = r.x + 1 + Math.floor(rng() * (r.w - 2 - w + 1)), z = r.z + 1 + Math.floor(rng() * (r.h - 2 - h + 1));
        let ok = !taken(x, z, w, h);
        for (let dz = 0; dz < h && ok; dz++) for (let dx = 0; dx < w; dx++) if (g[z + dz][x + dx] !== '.') ok = false;
        if (!ok) continue;
        traps.push({ id: traps.length, kind, x, z, w, h, phase: Math.round(rng() * 30) / 10 });
        break;
      }
    }
    return traps;
  }

  // the safe room after a boss: one calm hall with a merchant, carpet up to the door, and no monsters. Same shape as a floor so the rest of the game treats it as one.
  function safeRoom(floor) {
    const W = 26, H = 26, g = [];
    for (let z = 0; z < H; z++) g.push(new Array(W).fill('#'));
    const room = { x: 6, z: 6, w: 14, h: 14, kind: 'start' };
    for (let z = room.z; z < room.z + room.h; z++) for (let x = room.x; x < room.x + room.w; x++) g[z][x] = '.';
    for (let z = room.z; z < room.z + room.h; z++) { g[z][12] = 'c'; g[z][13] = 'c'; }       // carpet from where you arrive up to the door
    const doorCells = [[12, 5], [13, 5]];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (g[z][x] === '#') { const k = (x + z) % 3; g[z][x] = k === 0 ? 'B' : k === 1 ? 'W' : '#'; }
    for (const [x, z] of doorCells) g[z][x] = 'D';
    const torches = [];
    for (const [cx, cz] of [[7, 7], [18, 7], [7, 18], [18, 18], [10, 7], [15, 7]]) torches.push({ x: (cx + 0.5) * CELL, y: 1.75, z: (cz + 0.5) * CELL, nx: 0, nz: 0, kind: 'brazier' });
    return {
      W, H, CELL, floor, safe: true, rows: g.map((r) => r.join('')), torches, rooms: [room], traps: [],
      start: { x: 13 * CELL, z: 18 * CELL, yaw: 0 },
      door: { cells: doorCells, nx: 0, nz: -1, x: 13 * CELL, z: 11 },
      merchant: { x: 17.5 * CELL, z: 9.5 * CELL },
      carpetLength: room.h * 2, doorRunner: []
    };
  }

  function reach(g, W, H, sx, sz) {
    const seen = new Uint8Array(W * H), q = [[sx, sz]]; seen[sz * W + sx] = 1;
    for (let i = 0; i < q.length; i++) {
      const [x, z] = q[i];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= H || seen[nz * W + nx] || !(open(g[nz][nx]) || g[nz][nx] === 'P')) continue;
        seen[nz * W + nx] = 1; q.push([nx, nz]);
      }
    }
    return seen;
  }
  // sconces along the walls with a gap between them, braziers in the corner rooms, and a pair of sconces beside the door
  function placeTorches(g, W, H, rooms, doorCells, dn, rng) {
    const torches = [], gap = 9;
    const near = (x, z) => torches.some((t) => Math.hypot(t.x - x, t.z - z) < gap);
    const wallCell = (c) => c !== '.' && c !== 'c' && c !== 'P' && c !== 'D';
    for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
      if (!open(g[z][x]) || rng() > 0.35) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!wallCell(g[z + dz][x + dx])) continue;
        const px = (x + 0.5) * CELL + dx * (CELL / 2 - 0.28), pz = (z + 0.5) * CELL + dz * (CELL / 2 - 0.28);
        if (near(px, pz)) continue;
        torches.push({ x: px, y: 2.85, z: pz, nx: -dx, nz: -dz, kind: 'sconce' }); break;
      }
    }
    for (const r of rooms) if (r.kind !== 'room') for (const [cx, cz] of [[r.x + 1, r.z + 1], [r.x + r.w - 2, r.z + 1], [r.x + 1, r.z + r.h - 2], [r.x + r.w - 2, r.z + r.h - 2]]) torches.push({ x: (cx + 0.5) * CELL, y: 1.75, z: (cz + 0.5) * CELL, nx: 0, nz: 0, kind: 'brazier' });
    return torches;
  }

  return { generate, safeRoom, sizeFor, SIZES, CELL };
})();
if (typeof module !== 'undefined') module.exports = FloorGen;
