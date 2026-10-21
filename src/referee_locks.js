/* Locks: the gold doors on a floor and the boss door's puzzle. Pure (no browser, no clock, no unseeded random): everything is worked out from the map and the floor number,
   so a host and every friend get the same layout; only what has been paid or shot (the state) travels between them.
     Gold Toll       every gate across the corridors: walk up and pay the price.
     The Scale       boss door: pay gold onto the pan until it weighs what the wall says. Take gold back if you overpay.
     Coin Sockets    boss door: shoot the three gold sockets hidden in the halls.
     Fortune Wheels  boss door: spend gold to spin three wheels; a wheel that shows the door's symbol locks; lock all three.
     Key Gate        from floor 3 the last gate before the boss needs a key instead of gold: a Key Keeper (a mini boss) sleeps in a room on your side of that gate, and carries it.
   The boss door opens when the boss is down AND the puzzle is solved. The referee lets the player act through one door at a time (use(0) is the first action, use(1) the second). */
const RefereeLocks = (function () {
  const RULES = {
    tollBase: 80, tollPerFloor: 30,                   // a gate's price: this plus a bit more each floor
    panStep: 20, scaleBase: 4, scalePerFloor: 1,      // the pan moves 20 gold at a time; the wall asks for 20 x (4 + floor) gold
    spinBase: 20, spinPerFloor: 5, symbols: 4,        // a wheel spin's price; four symbols on each wheel
    reach: 4,                                         // how close you stand to a gate or the boss door's pan or wheels
    socketR: 0.55, socketY: 2.1,                      // a socket is a ball this big, this high on the wall
    sockets: 3,
    keyFloor: 3, keeperMinRoom: 7, keeperFar: 18       // key gates start on this floor; the keeper's room is at least this big and this many cells from your spawn
  };
  const KINDS = ['scale', 'sockets', 'wheels'];
  const SYMBOLS = ['Skull', 'Crown', 'Flame', 'Eye'];
  const lcg = (seed) => { let a = seed >>> 0; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; };
  const tollFor = (floor) => RULES.tollBase + RULES.tollPerFloor * (Math.max(1, floor) - 1);
  const targetFor = (floor) => RULES.panStep * (RULES.scaleBase + RULES.scalePerFloor * Math.max(1, floor));
  const spinFor = (floor) => RULES.spinBase + RULES.spinPerFloor * (Math.max(1, floor) - 1);

  // the layout of a floor's locks, from its map: gates, the boss puzzle's kind, where the sign, pan/wheels and sockets are
  function layout(map, floor) {
    const r = lcg((floor * 2654435761 + map.W * 40503 + map.rooms.length * 977 + map.door.cells[0][0] * 31 + map.door.cells[0][1]) >>> 0), C = map.CELL, d = map.door;
    const gates = (map.gates || []).map((g) => ({ id: g.id, cells: g.cells, x: g.x, z: g.z, nx: g.nx, nz: g.nz, price: tollFor(floor), type: 'toll' }));
    if (map.safe) return { gates, boss: null, keeper: null };
    // from floor 3 the last gate before the boss wants a key, and a Key Keeper holds it in a room you can reach without that gate
    let keeper = null;
    if (floor >= RULES.keyFloor && gates.length >= 2) {
      const last = gates[gates.length - 1], W = map.W, H = map.H, ok = (ch) => ch === '.' || ch === 'c' || ch === 'P';
      const pass = new Set(); gates.slice(0, -1).forEach((g) => g.cells.forEach(([x, z]) => pass.add(z * W + x)));
      const dist = new Int16Array(W * H).fill(-1), sx = Math.floor(map.start.x / C), sz = Math.floor(map.start.z / C), q = [sz * W + sx]; dist[q[0]] = 0;
      for (let i = 0; i < q.length; i++) { const x = q[i] % W, z = (q[i] / W) | 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue; const n = nz * W + nx; if (dist[n] >= 0 || !(ok(map.rows[nz][nx]) || pass.has(n))) continue; dist[n] = dist[q[i]] + 1; q.push(n); } }
      const rooms = map.rooms.filter((q2) => q2.kind === 'room' && q2.w >= RULES.keeperMinRoom && q2.h >= RULES.keeperMinRoom).map((q2) => ({ q2, c: [q2.x + (q2.w >> 1), q2.z + (q2.h >> 1)] })).filter((o) => dist[o.c[1] * W + o.c[0]] >= RULES.keeperFar);
      if (rooms.length) {
        const pick = rooms[Math.floor(r() * rooms.length)], spot = (() => { for (let rad = 0; rad < 5; rad++) for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) { const x = pick.c[0] + dx, z = pick.c[1] + dz; let free = true; for (let a = -1; a <= 1 && free; a++) for (let b2 = -1; b2 <= 1; b2++) if (map.rows[z + a][x + b2] !== '.' && map.rows[z + a][x + b2] !== 'c') free = false; if (free) return [x, z]; } return pick.c; })();
        keeper = { x: (spot[0] + 0.5) * C, z: (spot[1] + 0.5) * C, kind: floor % 2 ? 'golem' : 'fiend' };
        last.type = 'key'; last.price = 0;
      }
    }
    const kind = KINDS[Math.floor(r() * KINDS.length)];
    // beside the boss door, on the wall face that looks into the room: the sign with the rules on one side, the pan or wheels on the other
    const px = d.nz !== 0 ? 1 : 0, pz = d.nz !== 0 ? 0 : 1;               // along the wall
    const face = (off) => ({ x: d.x + d.nx * (C / 2 - 0.02) + px * off, z: d.z + d.nz * (C / 2 - 0.02) + pz * off, nx: d.nx, nz: d.nz });
    const sign = face(C * 3.4), station = face(-C * 3.4);
    const sockets = [];
    if (kind === 'sockets') {
      const rooms = map.rooms.filter((q) => q.kind === 'room' && q.w >= 6 && q.h >= 6);
      const pool = rooms.slice(); const chosen = [];
      while (chosen.length < RULES.sockets && pool.length) chosen.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      for (const room of chosen) {
        const side = Math.floor(r() * 4), t = 2 + Math.floor(r() * Math.max(1, (side < 2 ? room.w : room.h) - 4));
        let x, z, nx = 0, nz = 0;
        if (side === 0) { x = room.x + t; z = room.z; nz = 1; } else if (side === 1) { x = room.x + t; z = room.z + room.h; nz = -1; } else if (side === 2) { x = room.x; z = room.z + t; nx = 1; } else { x = room.x + room.w; z = room.z + t; nx = -1; }
        sockets.push({ x: (x + (side < 2 ? 0.5 : 0)) * C + nx * 0.35, y: RULES.socketY, z: (z + (side < 2 ? 0 : 0.5)) * C + nz * 0.35, nx, nz });
      }
    }
    return { gates, keeper, boss: { kind, sign, station, sockets, target: targetFor(floor), spin: spinFor(floor), sym: Math.floor(r() * RULES.symbols), seed: Math.floor(r() * 4294967296) } };
  }

  // what is written on the wall beside the boss door (the screen paints it onto the sign)
  function signText(b) {
    if (!b) return null;
    if (b.kind === 'scale') return { title: 'THE SCALE', lines: ['Pay gold onto the pan', 'until it weighs ' + b.target + '.', 'Overpaid? Take some back.'] };
    if (b.kind === 'sockets') return { title: 'THE COIN SOCKETS', lines: ['Three gold sockets', 'are hidden in the halls.', 'Shoot all three.'] };
    return { title: 'THE FORTUNE WHEELS', lines: ['Spin for ' + b.spin + ' gold.', 'A wheel showing the ' + SYMBOLS[b.sym], 'locks. Lock all three.'] };
  }
  const dist = (x, z, o) => Math.hypot(x - o.x, z - o.z);
  // the state of a floor's locks. gold is checked by the caller's numbers: act() returns how much the player pays (positive) or gets back (negative), or null when nothing happened
  function create(lay) {
    const S = { open: lay.gates.map(() => false), solved: false, pan: 0, hit: lay.boss ? lay.boss.sockets.map(() => false) : [], wheels: [0, 0, 0], locked: [false, false, false], spins: 0, rs: lay.boss ? lay.boss.seed : 1 };
    const next = () => { S.rs = (Math.imul(S.rs, 1664525) + 1013904223) >>> 0; return S.rs / 4294967296; };
    const b = lay.boss;
    const check = () => {
      if (!b || S.solved) return;
      if (b.kind === 'scale' && S.pan === b.target) S.solved = true;
      if (b.kind === 'sockets' && S.hit.every(Boolean)) S.solved = true;
      if (b.kind === 'wheels' && S.locked.every(Boolean)) S.solved = true;
    };
    // what the player at (x, z) with this much gold could do right now: null, or { what, i, text, actions: [{ label, afford }] }
    function near(x, z, gold, keys) {
      for (const g of lay.gates) if (!S.open[g.id] && g.type === 'key' && dist(x, z, g) < RULES.reach + 1) return { what: 'key', i: g.id, text: 'Key Gate: it needs the Key Keeper\'s key', actions: [{ label: 'Use key', afford: (keys | 0) > 0 }] };
      for (const g of lay.gates) if (!S.open[g.id] && dist(x, z, g) < RULES.reach + 1) return { what: 'toll', i: g.id, text: 'Gold Toll: ' + g.price + ' gold', price: g.price, actions: [{ label: 'Pay ' + g.price + ' gold', afford: gold >= g.price }] };
      if (b && !S.solved && (b.kind === 'scale' || b.kind === 'wheels') && dist(x, z, b.station) < RULES.reach + 1) {
        if (b.kind === 'scale') return { what: 'scale', text: 'The Scale: ' + S.pan + ' of ' + b.target, actions: [{ label: 'Add ' + RULES.panStep + ' gold', afford: gold >= RULES.panStep }, { label: 'Take back ' + RULES.panStep, afford: S.pan >= RULES.panStep }] };
        return { what: 'wheels', text: 'Fortune Wheels: match the ' + SYMBOLS[b.sym], price: b.spin, actions: [{ label: 'Spin ' + b.spin + ' gold', afford: gold >= b.spin }] };
      }
      return null;
    }
    // do a thing. a = { k: 'toll', i } | { k: 'pan', d: 1|-1 } | { k: 'spin' } | { k: 'sock', i }; gold is what the player holds. Returns { cost, ev } or null
    function act(a, gold, keys) {
      if (!a) return null;
      if (a.k === 'key') { const g = lay.gates[a.i]; if (!g || g.type !== 'key' || S.open[g.id] || !((keys | 0) > 0)) return null; S.open[g.id] = true; return { cost: 0, key: 1, ev: { type: 'gateOpen', i: g.id, x: g.x, z: g.z, key: true } }; }
      if (a.k === 'toll') { const g = lay.gates[a.i]; if (!g || g.type !== 'toll' || S.open[g.id] || gold < g.price) return null; S.open[g.id] = true; return { cost: g.price, ev: { type: 'gateOpen', i: g.id, x: g.x, z: g.z } }; }
      if (!b || S.solved) return null;
      if (a.k === 'pan' && b.kind === 'scale') {
        if (a.d > 0) { if (gold < RULES.panStep) return null; S.pan += RULES.panStep; check(); return { cost: RULES.panStep, ev: { type: S.solved ? 'lockSolved' : 'panAdd', pan: S.pan } }; }
        if (S.pan < RULES.panStep) return null; S.pan -= RULES.panStep; return { cost: -RULES.panStep, ev: { type: 'panTake', pan: S.pan } };
      }
      if (a.k === 'spin' && b.kind === 'wheels') {
        if (gold < b.spin) return null;
        S.spins++; for (let i = 0; i < 3; i++) if (!S.locked[i]) { S.wheels[i] = Math.floor(next() * RULES.symbols); if (S.wheels[i] === b.sym) S.locked[i] = true; }
        check(); return { cost: b.spin, ev: { type: S.solved ? 'lockSolved' : 'spin', wheels: S.wheels.slice(), locked: S.locked.slice() } };
      }
      if (a.k === 'sock' && b.kind === 'sockets') { if (!(a.i >= 0 && a.i < S.hit.length) || S.hit[a.i]) return null; S.hit[a.i] = true; check(); return { cost: 0, ev: { type: S.solved ? 'lockSolved' : 'socket', i: a.i } }; }
      return null;
    }
    // the first action of whatever is near (use(0)) or the second (use(1)): the action to send
    function use(x, z, gold, idx, keys) {
      const n = near(x, z, gold, keys); if (!n) return null;
      if (n.what === 'key') return idx === 0 ? { k: 'key', i: n.i } : null;
      if (n.what === 'toll') return idx === 0 ? { k: 'toll', i: n.i } : null;
      if (n.what === 'scale') return { k: 'pan', d: idx === 0 ? 1 : -1 };
      if (n.what === 'wheels') return idx === 0 ? { k: 'spin' } : null;
      return null;
    }
    // a ray from (ox,oy,oz) along (dx,dy,dz): the nearest closed socket it hits before maxT, or null
    function socketHit(ox, oy, oz, dx, dy, dz, maxT) {
      if (!b || b.kind !== 'sockets' || S.solved) return null;
      let best = null;
      b.sockets.forEach((s, i) => {
        if (S.hit[i]) return;
        const lx = s.x - ox, ly = s.y - oy, lz = s.z - oz, tca = lx * dx + ly * dy + lz * dz; if (tca < 0) return;
        const d2 = lx * lx + ly * ly + lz * lz - tca * tca; if (d2 > RULES.socketR * RULES.socketR) return;
        const t = tca - Math.sqrt(RULES.socketR * RULES.socketR - d2); if (t >= 0 && t < maxT && (!best || t < best.t)) best = { i, t };
      });
      return best;
    }
    const gateOpenIds = () => S.open.map((o, i) => o ? i : -1).filter((i) => i >= 0);
    const state = () => ({ o: S.open.map((v) => (v ? 1 : 0)), s: S.solved ? 1 : 0, p: S.pan, h: S.hit.map((v) => (v ? 1 : 0)), w: S.wheels.slice(), l: S.locked.map((v) => (v ? 1 : 0)), n: S.spins, r: S.rs });
    function load(v) {
      if (!v) return;
      if (Array.isArray(v.o)) v.o.forEach((x, i) => { if (i < S.open.length) S.open[i] = !!x; });
      S.solved = !!v.s; S.pan = +v.p || 0; if (Array.isArray(v.h)) v.h.forEach((x, i) => { if (i < S.hit.length) S.hit[i] = !!x; });
      if (Array.isArray(v.w)) S.wheels = v.w.slice(0, 3); if (Array.isArray(v.l)) S.locked = v.l.slice(0, 3).map(Boolean); S.spins = v.n | 0; S.rs = v.r >>> 0;
    }
    return { layout: lay, S, near, act, use, socketHit, state, load, gateOpenIds, solved: () => !b || S.solved };
  }
  return { RULES, KINDS, SYMBOLS, layout, create, signText, tollFor, targetFor, spinFor };
})();
if (typeof module !== 'undefined') module.exports = RefereeLocks;
