/* Guns lying on the floor: one plain default model for each gun type, so you can tell what a gun is at a glance (a small pistol, a long sniper with a scope, a stubby SMG
   with a stick magazine, a pump shotgun, a heavy machine gun with an ammo box). Every part is a box; main parts take the rarity colour and the `dark` parts a deeper shade of it.
   These are look-only stand-ins until Grok's own pickup models exist. Pure data: the barrel points along +x. Each part is [length, height, width, x, y, z, dark?]. */
const FloorGunShapes = (function () {
  const SHAPES = {
    pistol: [                                   // short and small: slide over a grip
      [0.40, 0.11, 0.10, 0.00, 0.10, 0], [0.12, 0.22, 0.10, -0.14, -0.06, 0, 1], [0.10, 0.07, 0.08, 0.05, 0.0, 0, 1]],
    smg: [                                      // compact body, long stick magazine, short stock
      [0.62, 0.13, 0.12, 0.00, 0.10, 0], [0.10, 0.30, 0.09, 0.08, -0.12, 0, 1], [0.11, 0.20, 0.10, -0.18, -0.06, 0, 1], [0.18, 0.06, 0.06, 0.38, 0.10, 0, 1]],
    rifle: [                                    // body, stock, long barrel, curved magazine block
      [0.50, 0.13, 0.12, 0.00, 0.10, 0], [0.26, 0.17, 0.10, -0.38, 0.05, 0, 1], [0.40, 0.05, 0.05, 0.44, 0.12, 0, 1], [0.12, 0.22, 0.09, 0.02, -0.10, 0, 1], [0.10, 0.18, 0.09, -0.12, -0.08, 0, 1]],
    shotgun: [                                  // long thin barrel with a fat pump under it and a wide stock
      [0.80, 0.07, 0.07, 0.05, 0.12, 0], [0.30, 0.10, 0.12, 0.18, 0.02, 0, 1], [0.30, 0.18, 0.12, -0.46, 0.05, 0, 1], [0.34, 0.12, 0.10, -0.20, 0.08, 0], [0.10, 0.17, 0.09, -0.22, -0.07, 0, 1]],
    sniper: [                                   // the longest: a long barrel, a scope on top and a big stock
      [1.10, 0.06, 0.06, 0.15, 0.12, 0], [0.34, 0.15, 0.11, -0.18, 0.09, 0], [0.32, 0.19, 0.10, -0.52, 0.04, 0, 1], [0.34, 0.09, 0.09, -0.02, 0.26, 0, 1], [0.05, 0.10, 0.07, -0.12, 0.19, 0, 1], [0.05, 0.10, 0.07, 0.10, 0.19, 0, 1], [0.09, 0.17, 0.09, -0.24, -0.08, 0, 1]],
    hmg: [                                      // the heaviest: a tall body, an ammo box hanging underneath, a carry handle and a short thick barrel
      [0.62, 0.24, 0.20, 0.00, 0.12, 0], [0.26, 0.22, 0.22, -0.02, -0.12, 0, 1], [0.40, 0.09, 0.09, 0.50, 0.16, 0, 1], [0.34, 0.05, 0.06, -0.02, 0.30, 0, 1], [0.20, 0.18, 0.12, -0.38, 0.06, 0, 1]]
  };
  // the size of a type's whole model: length along the barrel, height, and the biggest width
  function extent(type) {
    const parts = SHAPES[type] || SHAPES.rifle; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, w = 0;
    for (const [l, h, d, x, y] of parts) { x0 = Math.min(x0, x - l / 2); x1 = Math.max(x1, x + l / 2); y0 = Math.min(y0, y - h / 2); y1 = Math.max(y1, y + h / 2); w = Math.max(w, d); }
    return { len: x1 - x0, height: y1 - y0, width: w, parts: parts.length };
  }
  // a deeper shade of a rarity colour (0xRRGGBB) for the secondary parts
  const darker = (c, k) => ((((c >> 16) & 255) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k);
  return { SHAPES, TYPES: Object.keys(SHAPES), extent, darker: (c, k) => darker(c, k === undefined ? 0.55 : k) & 0xffffff };
})();
if (typeof module !== 'undefined') module.exports = FloorGunShapes;
