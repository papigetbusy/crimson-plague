/* Crimson Horned Fiend v2 (CANDIDATE, not signed off: the game still uses horned_fiend.js until the owner says so).
   Starts from the v1 body (carved from Grok's front, side and back pictures, so the pose, chest, back spikes and tail stay right)
   and sculpts by hand what carving from a flat picture cannot give: thick curved horns, a heavy brow over slit eyes, a snout with an
   open snarl and teeth, swept-back ear spikes, a crest, and thicker arms with dark claws (Grok's head close-up and back view are the guide).
   Same nine parts and the same joints as v1, so the walk and attack animation do not change.
   Model space: feet at y = 0, +Y up, the face points to -Z. */
const HornedFiendV2 = (function () {
  const V1 = typeof HornedFiend !== 'undefined' ? HornedFiend : require('./horned_fiend.js');
  const K = typeof BestiaryKit !== 'undefined' ? BestiaryKit : require('./bestiary_kit.js');
  const RED = 0x8b1a22, RED_D = 0x651018, RED_L = 0xa82a32, RED_X = 0x3a0c10;
  const HORN = 0x9c2430, TOOTH = 0xd8cdb0, MOUTH = 0x2a0808, EYE = 0xff5a14, EYE_HOT = 0xffa01e, CLAW = 0x2a1416;

  // a horn: a chain of cubes that thins out toward the tip. pts are [x, y, z]; the sizes are in voxels
  function horn(g, side, pts, sizes) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], r = sizes[i];
      K.line(g, [side * a[0] - (r >> 1), a[1], a[2]], [side * b[0] - (r >> 1), b[1], b[2]], r, i === 0 ? RED_D : HORN, undefined, 0.1);
    }
  }

  const toHex = (c) => (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255);
  function buildHead() {
    const g = new Voxel.Grid(131);
    // neck and skull (chipped facets, like the other hand-built monsters, so it reads as carved)
    K.rock(g, 0, 70, -1, 8.5, 6.5, 8, [RED_D, RED, RED_L], 7);            // the skull
    // brow: a heavy ridge that shades the eyes
    g.mbox(1, 71, -11, 9, 73, -8, RED_D);
    g.mbox(0, 73, -10, 8, 74, -7, RED);
    // face plane, cheeks and the snout (upper jaw)
    g.box(-8, 66, -10, 8, 71, -7, RED);                                   // face under the brow
    g.mbox(5, 65, -11, 9, 69, -7, RED_L);                                 // cheek bones
    g.box(-4, 66, -15, 4, 70, -10, RED);                                  // snout
    g.box(-3, 69, -15, 3, 71, -11, RED_L);                                // bridge of the nose
    g.mbox(1, 67, -16, 3, 69, -15, RED_D);                                // nostrils
    // open mouth: a dark gap between the snout and the lower jaw, teeth top and bottom, a hot glow at the back of the throat
    g.box(-4, 60, -15, 4, 64, -9, RED);                                   // lower jaw
    g.box(-3, 64, -14, 3, 66, -10, MOUTH);                                // the open mouth
    g.box(-2, 64, -10, 2, 66, -9, EYE, 0, 'glow');                        // throat glow
    for (const x of [-3, -1, 1, 2]) g.box(x, 65, -15, x + 1, 66, -14, TOOTH, 0.04);      // upper teeth hang from the snout
    for (const x of [-3, -2, 1, 2]) g.box(x, 64, -15, x + 1, 65, -14, TOOTH, 0.04);      // lower teeth stand on the jaw
    g.mbox(3, 64, -15, 4, 67, -14, TOOTH, 0.04);                          // long fangs at the corners
    g.mbox(3, 62, -15, 4, 65, -14, TOOTH, 0.04);
    g.box(-4, 59, -14, 4, 61, -11, RED_D);                                // chin
    // eyes: angled slits under the brow, the outer end sits higher
    g.mbox(2, 69, -11, 5, 70, -10, EYE, 0, 'glow');
    g.mbox(4, 70, -11, 7, 71, -10, EYE_HOT, 0, 'glow');
    // swept-back jaw spikes
    g.mbox(8, 64, -4, 11, 66, -1, RED_D); g.mbox(10, 63, -2, 13, 65, 1, RED_D); g.mbox(12, 62, -1, 14, 64, 2, RED);
    // crest: little spikes down the back of the skull
    for (const [y, z, h] of [[74, 1, 4], [72, 5, 4], [69, 7, 3]]) g.box(-1, y, z, 1, y + h, z + 2, RED_D);
    // the horns: out wide and up from the brow, then curling in toward the tip, thick at the base and thinning to a point
    for (const side of [1, -1]) horn(g, side, [[5, 73, -1], [8, 74, -2], [11, 76, -3], [12, 79, -4], [11, 82, -6]], [4, 4, 3, 2]);
    return g;
  }
  // the head thrusts forward of the chest, like the side picture
  function moveForward(g, dz) {
    const out = new Voxel.Grid(131);
    for (const kind of ['solid', 'glow']) for (const v of g[kind].values()) out.set(v.x, v.y, v.z + dz, toHex(v.c), 0, kind);
    return out;
  }

  // thicker arms: grow the carved arms by one voxel on every side (keeps the picture's texture), then dark claws on the fists
  function grow(g) {
    const add = [];
    for (const v of g.solid.values()) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!g.has(v.x + dx, v.y, v.z + dz)) add.push([v.x + dx, v.y, v.z + dz, toHex(v.c)]);
    for (const [x, y, z, c] of add) g.set(x, y, z, c, 0.04);
  }
  function bulkArms(G) {
    for (const s of [1, -1]) {
      const U = G[s > 0 ? 'armRU' : 'armLU'], F = G[s > 0 ? 'armRF' : 'armLF'];
      grow(U); grow(F);
      K.rock(U, s * 17, 53, -1, 5, 5, 5.5, [RED_D, RED, RED_L], 11);    // a rounded shoulder cap
      for (const dx of [-3, 0, 3]) F.box(s * 19 + dx - 1, 22, -9, s * 19 + dx + 1, 25, -6, CLAW);   // claws
    }
  }

  function build() {
    const m = V1.build();
    const G = m.grids;
    const head = moveForward(buildHead(), -3);
    head.ell(0, 62, 0, 8, 4.5, 7, RED_D);                                  // thick neck, blends into the shoulders
    G.head.solid = head.solid; G.head.glow = head.glow;
    bulkArms(G);
    return m;
  }
  return { build, VOX: V1.VOX, J: V1.J };
})();
if (typeof module !== 'undefined') module.exports = HornedFiendV2;
