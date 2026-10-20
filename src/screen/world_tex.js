/* World textures: the small painted canvases (stone, banners, floor, carpet ...) the hall and the monsters are drawn with.
   Presentation only. Chunky pixels: every texture is a tiny canvas with a nearest-neighbour filter. */
const WorldTex = (function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function create(THREE) {
    function mulberry(seed) {
      let a = seed >>> 0;
      return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    const rgb = (r, g, b) => 'rgb(' + (clamp(r, 0, 255) | 0) + ',' + (clamp(g, 0, 255) | 0) + ',' + (clamp(b, 0, 255) | 0) + ')';
    function makeTex(w, h, seed, paint) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      paint(g, w, h, mulberry(seed));
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    }
    function nrect(g, x, y, w, h, r, gg, b, v, rng) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const n = (rng() - 0.5) * v;
        g.fillStyle = rgb(r + n, gg + n * 0.7, b + n * 0.7); g.fillRect(x + i, y + j, 1, 1);
      }
    }
    function outline(g, x, y, w, h, r, gg, b, rng) {
      for (let i = 0; i < w; i++) for (const yy of [y, y + h - 1]) { const n = (rng() - 0.5) * 24; g.fillStyle = rgb(r + n, gg + n, b + n * 0.5); g.fillRect(x + i, yy, 1, 1); }
      for (let j = 1; j < h - 1; j++) for (const xx of [x, x + w - 1]) { const n = (rng() - 0.5) * 24; g.fillStyle = rgb(r + n, gg + n, b + n * 0.5); g.fillRect(xx, y + j, 1, 1); }
    }
    const GOLD = [205, 160, 64];
    function paintStone(g, w, h, rng, shade) {
      shade = shade || 1;
      const bh = 8, bw = 16;
      for (let by = 0; by * bh < h; by++) {
        const off = (by % 2) * 8;
        for (let bx = -1; bx * bw < w; bx++) {
          const x0 = bx * bw + off, y0 = by * bh, tone = (rng() - 0.5) * 14;
          for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
            const x = x0 + i, y = y0 + j;
            if (x < 0 || x >= w || y >= h) continue;
            let v = (46 + tone + (rng() - 0.5) * 14) * shade;
            if (i === 0 || j === 0) v = 18 * shade;
            else if (i === 1 || j === 1) v += 10 * shade;
            g.fillStyle = rgb(v, v, v + 3); g.fillRect(x, y, 1, 1);
          }
        }
      }
    }
    function plinth(g, w, h, rng) {
      nrect(g, 0, h - 7, w, 7, 20, 18, 20, 8, rng);
      for (let x = 0; x < w; x += 2) { g.fillStyle = rgb(150, 115, 48); g.fillRect(x, h - 7, 1, 1); }
    }
    const texStone = makeTex(32, 64, 11, (g, w, h, r) => { paintStone(g, w, h, r); plinth(g, w, h, r); });
    const texBanner = makeTex(32, 64, 12, (g, w, h, r) => {
      paintStone(g, w, h, r);
      const x0 = 5, x1 = 26, y0 = 4, y1 = 52;
      nrect(g, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 112, 16, 22, 18, r);
      outline(g, x0 + 2, y0 + 2, x1 - x0 - 3, y1 - y0 - 3, 62, 6, 10, r);
      outline(g, x0, y0, x1 - x0 + 1, y1 - y0 + 1, GOLD[0], GOLD[1], GOLD[2], r);
      for (let x = x0; x <= x1; x += 2) { g.fillStyle = rgb(GOLD[0], GOLD[1], GOLD[2]); g.fillRect(x, y1 + 1, 1, (x % 4) ? 2 : 4); }
      const gp = (x, y) => { const n = (r() - 0.5) * 30; g.fillStyle = rgb(GOLD[0] + n, GOLD[1] + n, GOLD[2] + n * 0.5); g.fillRect(x, y, 1, 1); };
      for (let i = 0; i < 13; i++) { const x = 9 + Math.floor(i * 0.5); gp(x, 14 + i); gp(x + 1, 14 + i); gp(22 - Math.floor(i * 0.5), 14 + i); gp(21 - Math.floor(i * 0.5), 14 + i); }
      for (let y = 27; y <= 44; y++) { gp(15, y); gp(16, y); }
      for (let x = 11; x <= 20; x++) { gp(x, 45); gp(x, 46); }
      for (let a = 0; a < 16; a++) gp(Math.round(15.5 + Math.cos(a / 16 * 6.283) * 3), Math.round(9 + Math.sin(a / 16 * 6.283) * 3));
      gp(15, 49); gp(16, 49); gp(14, 50); gp(17, 50); gp(15, 51); gp(16, 51);
      plinth(g, w, h, r);
    });
    // a hanging cloth for the banner walls: its own texture, drawn as a raised slab in front of plain stone (see world_bake.js)
    const texCloth = makeTex(32, 64, 22, (g, w, h, r) => {
      const x0 = 2, x1 = 29, y0 = 2, y1 = 58, dy = 3;
      g.fillStyle = rgb(30, 4, 8); g.fillRect(0, 0, w, h);            // the margin round the cloth is deep shadow, never see-through
      nrect(g, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 112, 16, 22, 18, r);
      outline(g, x0 + 2, y0 + 2, x1 - x0 - 3, y1 - y0 - 3, 62, 6, 10, r);
      outline(g, x0, y0, x1 - x0 + 1, y1 - y0 + 1, GOLD[0], GOLD[1], GOLD[2], r);
      for (let x = x0; x <= x1; x += 2) { g.fillStyle = rgb(GOLD[0], GOLD[1], GOLD[2]); g.fillRect(x, y1 + 1, 1, (x % 4) ? 2 : 4); }
      const gp = (x, y) => { const n = (r() - 0.5) * 30; g.fillStyle = rgb(GOLD[0] + n, GOLD[1] + n, GOLD[2] + n * 0.5); g.fillRect(x, y + dy, 1, 1); };
      for (let i = 0; i < 13; i++) { const x = 9 + Math.floor(i * 0.5); gp(x, 14 + i); gp(x + 1, 14 + i); gp(22 - Math.floor(i * 0.5), 14 + i); gp(21 - Math.floor(i * 0.5), 14 + i); }
      for (let y = 27; y <= 44; y++) { gp(15, y); gp(16, y); }
      for (let x = 11; x <= 20; x++) { gp(x, 45); gp(x, 46); }
      for (let a = 0; a < 16; a++) gp(Math.round(15.5 + Math.cos(a / 16 * 6.283) * 3), Math.round(9 + Math.sin(a / 16 * 6.283) * 3));
      gp(15, 49); gp(16, 49); gp(14, 50); gp(17, 50); gp(15, 51); gp(16, 51);
    });
    const texPanel = makeTex(32, 64, 13, (g, w, h, r) => {
      paintStone(g, w, h, r);
      nrect(g, 7, 6, 18, 46, 96, 14, 18, 16, r);
      for (let x = 8; x < 25; x += 5) { g.fillStyle = rgb(40, 6, 10); g.fillRect(x, 7, 1, 44); }
      for (let y = 7; y < 52; y += 5) { g.fillStyle = rgb(40, 6, 10); g.fillRect(8, y, 16, 1); }
      outline(g, 7, 6, 18, 46, 60, 8, 12, r);
      outline(g, 5, 4, 22, 50, GOLD[0], GOLD[1], GOLD[2], r);
      plinth(g, w, h, r);
    });
    const texPillar = makeTex(32, 64, 14, (g, w, h, r) => {
      paintStone(g, w, h, r, 0.8);
      nrect(g, 0, 3, w, 3, GOLD[0], GOLD[1], GOLD[2], 30, r);
      nrect(g, 0, 56, w, 3, GOLD[0], GOLD[1], GOLD[2], 30, r);
      for (const x of [3, 9, 22, 28]) for (let y = 8; y < 54; y++) {      // carved fluting: a dark groove with a lit edge beside it
        g.fillStyle = rgb(20 + (r() - 0.5) * 6, 18, 20); g.fillRect(x, y, 1, 1); g.fillStyle = rgb(66 + (r() - 0.5) * 8, 62, 64); g.fillRect(x + 1, y, 1, 1);
      }
      for (let y = 10; y < 52; y++) for (let x = 12; x < 20; x++) { g.fillStyle = rgb(12 + (r() - 0.5) * 6, 8, 10); g.fillRect(x, y, 1, 1); }   // a dark inset down the middle
      for (let y = 10; y < 52; y++) for (const x of [11, 20]) { g.fillStyle = rgb(GOLD[0] - 10, GOLD[1] - 10, GOLD[2] - 10); g.fillRect(x, y, 1, 1); }
      nrect(g, 11, 27, 10, 3, GOLD[0], GOLD[1], GOLD[2], 30, r); nrect(g, 11, 38, 10, 2, GOLD[0], GOLD[1], GOLD[2], 30, r);   // gold rings round the inset
      for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) {        // a red gem, diamond-cut, with a bright corner
        const d = Math.abs(i) + Math.abs(j); if (d > 4) continue;
        g.fillStyle = d === 4 ? rgb(GOLD[0], GOLD[1], GOLD[2]) : rgb(190 - d * 14, 20, 28); g.fillRect(16 + i, 33 + j, 1, 1);
      }
      g.fillStyle = rgb(255, 130, 120); g.fillRect(15, 31, 2, 2);
    });
    const texGold = makeTex(16, 16, 15, (g, w, h, r) => {
      nrect(g, 0, 0, w, h, GOLD[0] - 10, GOLD[1] - 10, GOLD[2] - 8, 36, r);
      for (let i = 0; i < w; i++) { g.fillStyle = rgb(110, 80, 30); g.fillRect(i, 0, 1, 1); g.fillRect(0, i, 1, 1); }
    });
    // floor variety: three tile sets (plain, cracked, warm-stained) mixed by cell, and a worn strip beside the carpet
    function paintFloor(g, w, h, r, kind) {
      for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
        const tone = (r() - 0.5) * 10, warm = kind === 'warm' && r() < 0.6 ? 7 : 0;
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
          let v = 38 + tone + (r() - 0.5) * (kind === 'worn' ? 18 : 12);
          if (i === 0 || j === 0) v = 15; else if (i === 1 || j === 1) v += 6;
          g.fillStyle = rgb(v + warm * 1.6, v - warm * 0.3, v + 3 - warm); g.fillRect(tx * 16 + i, ty * 16 + j, 1, 1);
        }
      }
      if (kind === 'cracked') for (let k = 0; k < 2; k++) {              // a hairline crack wandering across one tile
        let x = 2 + Math.floor(r() * 26), y = 2 + Math.floor(r() * 26);
        for (let n = 0; n < 11; n++) { g.fillStyle = rgb(14, 12, 14); g.fillRect(x, y, 1, 1); x += r() < 0.6 ? 1 : 0; y += r() < 0.6 ? 1 : 0; if (r() < 0.2) x -= 1; }
      }
      if (kind === 'worn') for (let n = 0; n < 40; n++) { g.fillStyle = rgb(70 + r() * 20, 58 + r() * 14, 52); g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1); }   // scuffs and dust
    }
    const texFloor = makeTex(32, 32, 16, (g, w, h, r) => paintFloor(g, w, h, r, 'plain'));
    const texFloor2 = makeTex(32, 32, 23, (g, w, h, r) => paintFloor(g, w, h, r, 'cracked'));
    const texFloor3 = makeTex(32, 32, 24, (g, w, h, r) => paintFloor(g, w, h, r, 'warm'));
    const texFloorEdge = makeTex(32, 32, 25, (g, w, h, r) => paintFloor(g, w, h, r, 'worn'));
    const texCarpet = makeTex(32, 32, 17, (g, w, h, r) => {
      nrect(g, 0, 0, w, h, 104, 14, 20, 20, r);
      for (let y = 0; y < h; y++) {
        for (const x of [1, 2, 29, 30]) { const n = (r() - 0.5) * 30; g.fillStyle = rgb(GOLD[0] + n, GOLD[1] + n, GOLD[2] + n * 0.5); g.fillRect(x, y, 1, 1); }
        for (const x of [3, 4, 5, 26, 27, 28]) { g.fillStyle = rgb(58 + (r() - 0.5) * 12, 7, 11); g.fillRect(x, y, 1, 1); }
        for (let x = 7; x < 25; x++) {
          const d = Math.abs(x - 15.5) + Math.abs((y % 16) - 7.5);
          if (d > 5 && d < 6.6) { g.fillStyle = rgb(60, 8, 12); g.fillRect(x, y, 1, 1); }
          else if (d < 1.6) { g.fillStyle = rgb(GOLD[0] - 20, GOLD[1] - 20, GOLD[2] - 20); g.fillRect(x, y, 1, 1); }
        }
      }
    });
    const texCeil = makeTex(32, 32, 18, (g, w, h, r) => paintStone(g, w, h, r, 0.6));
    const texSkin = makeTex(8, 8, 19, (g, w, h, r) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const n = (r() - 0.5) * 34, q = r();
        if (q < 0.14) g.fillStyle = rgb(48, 12, 12);
        else if (q > 0.92) g.fillStyle = rgb(150, 62, 46);
        else g.fillStyle = rgb(112 + n, 30 + n * 0.5, 26 + n * 0.4);
        g.fillRect(x, y, 1, 1);
      }
    });
    const texBone = makeTex(4, 4, 20, (g, w, h, r) => nrect(g, 0, 0, w, h, 188, 168, 128, 34, r));
    const texDark = makeTex(4, 4, 21, (g, w, h, r) => nrect(g, 0, 0, w, h, 38, 22, 22, 14, r));

    return { texStone, texBanner, texPanel, texPillar, texGold, texFloor, texFloor2, texFloor3, texFloorEdge, texCarpet, texCeil, texCloth, texSkin, texBone, texDark };
  }
  return { create };
})();
