/* The gold trail: the way from you to the Demon Lord, as a list of world points the minimap can draw.
   Pure function. It reads the referee's flow field (each cell holds its walking distance from the player, -1 for walls) and walks downhill from the boss. */
const RefereeTrail = (function () {
  const MAX = 600;                                           // longest trail, so a broken field can never loop for ever
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  // flow: Int16Array(GW*GH) of walking distances from the player; (bx, bz): the boss's world spot; solid(cx, cz): is that cell a wall
  function walk(flow, GW, GH, CELL, solid, bx, bz) {
    let cx = Math.floor(bx / CELL), cz = Math.floor(bz / CELL);
    if (cx < 0 || cz < 0 || cx >= GW || cz >= GH || flow[cz * GW + cx] < 0) return [];
    const out = [[bx, bz]];
    while (out.length < MAX) {
      const here = flow[cz * GW + cx];
      if (here <= 0) break;
      let best = here, nx = -1, nz = -1;
      for (const [ox, oz] of NB) {
        const x = cx + ox, z = cz + oz;
        if (solid(x, z)) continue;
        if (ox !== 0 && oz !== 0 && (solid(cx + ox, cz) || solid(cx, cz + oz))) continue;
        const v = flow[z * GW + x];
        if (v >= 0 && v < best) { best = v; nx = x; nz = z; }
      }
      if (nx < 0) break;
      cx = nx; cz = nz; out.push([(cx + 0.5) * CELL, (cz + 0.5) * CELL]);
    }
    return out;                                              // from the boss to the cell you stand in
  }
  return { walk, MAX };
})();
if (typeof module !== 'undefined') module.exports = RefereeTrail;
