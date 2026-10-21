/* Wall materials: what each wall set's wall is MADE of, so they are not all brick.
   Each painter fills a small canvas a pixel at a time (seeded random from the caller) and leaves the set's own details (drips, runes, cracks) to wall_sets.js.
     bones   stacked leg bones and skulls            (Blood Catacombs)
     planks  rotten upright wooden planks            (Rotting Bog Vault)
     shards  big cracked ice facets, no straight seams (Frozen Ossuary)
     columns tall rounded basalt columns             (Ashen Forge)
     slabs   huge smooth polished slabs              (Void Cathedral)
   Look only. */
const WallMaterials = (function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const put = (g, x, y, c, k) => {
    if (x < 0 || y < 0) return; const n = k || 0;
    g.fillStyle = 'rgb(' + (clamp(c[0] + n, 0, 255) | 0) + ',' + (clamp(c[1] + n, 0, 255) | 0) + ',' + (clamp(c[2] + n, 0, 255) | 0) + ')'; g.fillRect(x | 0, y | 0, 1, 1);
  };
  const fill = (g, w, h, c) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(g, x, y, c); };

  // rows of horizontal bones packed tight, each with a knob at both ends, over a dark red-black backing
  function bones(g, w, h, r, o) {
    fill(g, w, h, o.back);
    for (let row = 0, y = 0; y < h; row++, y += 5) {
      const off = (row % 3) * 5 - 6;
      for (let x0 = off; x0 < w; x0 += 17 + (row % 2) * 3) {
        const len = 15 + (row % 2) * 3, tone = (r() - 0.5) * 22;
        for (let i = 0; i < len; i++) { const x = x0 + i; if (x < 0 || x >= w) continue; for (let j = 1; j <= 3; j++) put(g, x, y + j, o.bone, tone + (j === 1 ? 14 : j === 3 ? -22 : 0) + (r() - 0.5) * 10); }
        for (const ex of [x0, x0 + len - 1]) for (const ey of [0, 4]) { if (ex >= 0 && ex < w) { put(g, ex, y + ey, o.bone, tone - 6); put(g, ex + (ex === x0 ? 1 : -1), y + ey, o.bone, tone - 14); } }   // the knobbly ends
      }
    }
  }
  // upright planks with grain, nail heads, a few knots and a dark gap between each
  function planks(g, w, h, r, o) {
    const pw = o.pw || 7;
    for (let p = 0, x0 = 0; x0 < w; p++, x0 += pw) {
      const tone = (r() - 0.5) * 26, shift = Math.floor(r() * 9);
      for (let i = 0; i < pw; i++) for (let y = 0; y < h; y++) {
        const x = x0 + i; if (x >= w) continue;
        if (i === 0) { put(g, x, y, o.gap); continue; }
        const grain = ((y + shift + i * 3) % 9 === 0 ? -14 : 0) + (r() - 0.5) * 8;
        put(g, x, y, o.wood, tone + grain + (i === 1 ? 10 : i === pw - 1 ? -10 : 0));
      }
      for (const ny of [3, h - 12]) { put(g, x0 + 3, ny, o.gap); put(g, x0 + 3, ny - 1, o.wood, 30); }                                          // nail heads
      if (r() < 0.7) { const ky = 8 + Math.floor(r() * (h - 24)); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(g, x0 + 3 + i, ky + j, o.gap, i === 0 && j === 0 ? 8 : 0); }   // a knot
      for (let j = 0; j < 2 + Math.floor(r() * 6); j++) put(g, x0 + 1 + Math.floor(r() * (pw - 1)), h - 9 - j, o.wood, -34);              // rot creeping up from the foot
    }
  }
  // big irregular facets of ice: each point owns the area nearest to it, edges are bright cracks
  function shards(g, w, h, r, o) {
    const pts = []; for (let n = 0; n < 9; n++) pts.push([r() * w, r() * h, (r() - 0.5) * 30]);
    const near = (x, y) => { let a = 1e9, b = 1e9, ai = 0; for (let i = 0; i < pts.length; i++) for (const dx of [-w, 0, w]) { const d = (pts[i][0] + dx - x) ** 2 + (pts[i][1] - y) ** 2; if (d < a) { b = a; a = d; ai = i; } else if (d < b) b = d; } return [ai, Math.sqrt(b) - Math.sqrt(a)]; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [i, edge] = near(x, y);
      if (edge < 1.3) put(g, x, y, o.crack, (r() - 0.5) * 24);
      else put(g, x, y, o.ice, pts[i][2] + (y / h) * 16 - 8 + Math.sin((x + y * 1.6) * 0.5) * 4 + (r() - 0.5) * 8);   // a soft diagonal sheen across each facet
    }
  }
  // tall rounded columns: dark at the sides, lit in the middle, with a deep gap between them
  function columns(g, w, h, r, o) {
    const cw = o.cw || 8;
    for (let c = 0, x0 = 0; x0 < w; c++, x0 += cw) {
      const tone = (r() - 0.5) * 12;
      for (let i = 0; i < cw; i++) for (let y = 0; y < h; y++) {
        const x = x0 + i; if (x >= w) continue;
        if (i === 0) { put(g, x, y, o.gap); continue; }
        const t = (i - 1) / (cw - 2), round = Math.sin(t * Math.PI);                                                                            // 0 at the sides, 1 in the middle
        put(g, x, y, o.rock, tone + (round - 0.55) * 46 + (((y + c * 7) % 21) === 0 ? -14 : 0) + (r() - 0.5) * 8);
      }
      for (let y0 = 6 + (c % 3) * 5; y0 < h; y0 += 22) for (let i = 1; i < cw; i++) put(g, x0 + i, y0, o.gap, 6);                                // a horizontal break where the column was cut
    }
  }
  // two huge smooth polished slabs with a beveled seam, a faint sheen and almost no grain
  function slabs(g, w, h, r, o) {
    const sh = h / 2;
    for (let s = 0; s < 2; s++) {
      const y0 = Math.floor(s * sh), tone = (r() - 0.5) * 8;
      for (let y = 0; y < sh; y++) for (let x = 0; x < w; x++) {
        let k = tone + (r() - 0.5) * 4 + Math.sin((x - y) * 0.35) * 3;
        if (y === 0 || x === 0) { put(g, x, y0 + y, o.gap); continue; }
        if (y === 1 || x === 1) k += 16; else if (y === sh - 1 || x === w - 1) k -= 10;
        put(g, x, y0 + y, o.stone, k);
      }
    }
  }
  return { bones, planks, shards, columns, slabs };
})();
if (typeof module !== 'undefined') module.exports = WallMaterials;
