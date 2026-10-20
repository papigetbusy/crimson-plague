/* Maps: a small corner map that follows you and a big map of the whole floor you open on demand. Both fill in as you explore.
   Presentation only: the walls come from the referee's map, what you have seen from the snapshot's `explored` list.
   Look-only numbers (colours, sizes) live here. */
const Minimap = (function () {
  const COL = { wall: [30, 22, 26], floor: [96, 78, 70], carpet: [150, 40, 48], door: [226, 176, 60], unseen: [0, 0, 0] };
  const CORNER_CELLS = 34;                                              // how many cells wide the corner map looks

  function create($, getMap) {
    const small = $('miniMap'), big = $('bigMap'), bigBox = $('mapOverlay');
    const sctx = small.getContext('2d'), bctx = big.getContext('2d');
    const tile = document.createElement('canvas'), tctx = tile.getContext('2d');   // one pixel per cell, scaled up when drawn
    let img = null, floorId = -1, timer = 0, open = false, lastDoorOpen = null;

    function cellColour(ch, seen) {
      if (!seen) return COL.unseen;
      if (ch === 'c') return COL.carpet;
      if (ch === 'D' || ch === 'd') return COL.door;
      if (ch === '.') return COL.floor;
      return COL.wall;
    }
    function repaint(map, st) {                                         // rebuild the one-pixel-per-cell picture
      const W = map.W, H = map.H;
      if (floorId !== st.floorId) { tile.width = W; tile.height = H; img = tctx.createImageData(W, H); floorId = st.floorId; }
      const d = img.data;
      for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
        const i = z * W + x, c = cellColour(map.rows[z][x], st.explored && st.explored[i]);
        d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = st.explored && st.explored[i] ? 255 : 0;
      }
      tctx.putImageData(img, 0, 0);
    }
    function arrow(ctx, x, y, yaw, r) {                                 // you: a pointed marker facing the way you look
      const fx = Math.sin(yaw), fz = -Math.cos(yaw);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + fx * r * 1.5, y + fz * r * 1.5);
      ctx.lineTo(x - fx * r + fz * r, y - fz * r - fx * r);
      ctx.lineTo(x - fx * r * 0.4, y - fz * r * 0.4);
      ctx.lineTo(x - fx * r - fz * r, y - fz * r + fx * r);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    function marker(ctx, x, y, r, colour) {
      ctx.fillStyle = colour; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // draws the window [cx0, cz0, cw] (in cells) of the tile onto a square canvas
    function draw(ctx, cv, map, st, cx0, cz0, cw) {
      const s = cv.width / cw, CELL = map.CELL;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(8,4,5,0.78)'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tile, cx0, cz0, cw, cw, 0, 0, cv.width, cv.height);
      const px = (wx) => (wx / CELL - cx0) * s, pz = (wz) => (wz / CELL - cz0) * s;
      // traps you have seen: a small mark on each cell of the patch (vents orange, spikes red)
      if (map.traps && st.explored) for (const t of map.traps) {
        if (!st.explored[(t.z + (t.h >> 1)) * map.W + t.x + (t.w >> 1)]) continue;
        ctx.fillStyle = t.kind === 'vent' ? 'rgba(255,140,30,0.9)' : 'rgba(210,50,60,0.85)';
        ctx.fillRect((t.x - cx0) * s, (t.z - cz0) * s, Math.max(2, t.w * s), Math.max(2, t.h * s));
      }
      if (st.door) marker(ctx, px(st.door.x), pz(st.door.z), Math.max(3, s * 1.2), st.door.open ? '#6fe08a' : '#e2b03c');
      if (st.compass) marker(ctx, px(st.compass.x), pz(st.compass.z), Math.max(3, s * 1.4), '#e23a42');   // the Demon Lord, from the moment he appears until he wakes
      // every monster alive, so you can find the last one or see where to run; with only a few left, ones off the edge of the small map are pinned to its rim
      const few = st.monsters.length <= 6;
      for (const m of st.monsters) {
        let mx = px(m.x), mz = pz(m.z), r = Math.max(2, s * (m.kind === 'demon' ? 1.6 : 0.8));
        const out = mx < 3 || mz < 3 || mx > cv.width - 3 || mz > cv.height - 3;
        if (out) { if (!few || cv === big) continue; mx = Math.max(4, Math.min(cv.width - 4, mx)); mz = Math.max(4, Math.min(cv.height - 4, mz)); r = 3; }
        marker(ctx, mx, mz, r, m.kind === 'demon' ? '#ff2a2a' : m.elite && m.elite.length ? '#ff9a2a' : '#c8202a');
      }
      arrow(ctx, px(st.player.x), pz(st.player.z), st.player.yaw, Math.max(3, s * 1.1));
    }
    function setOpen(v) { open = v; bigBox.hidden = !v; timer = 0; }
    function toggle() { setOpen(!open); }
    small.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
    bigBox.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); });

    function update(st, dt) {
      const map = getMap(); if (!map) return;
      timer -= dt;
      if (timer > 0 && floorId === st.floorId) return;                  // the picture only changes as you explore, a few times a second is plenty
      timer = 0.2;
      repaint(map, st);
      const half = CORNER_CELLS / 2;
      const cx0 = Math.max(0, Math.min(map.W - CORNER_CELLS, st.player.x / map.CELL - half)), cz0 = Math.max(0, Math.min(map.H - CORNER_CELLS, st.player.z / map.CELL - half));
      draw(sctx, small, map, st, Math.floor(cx0), Math.floor(cz0), Math.min(CORNER_CELLS, map.W));
      if (open) draw(bctx, big, map, st, 0, 0, map.W);
    }
    return { update, toggle, setOpen, get isOpen() { return open; } };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = Minimap;
