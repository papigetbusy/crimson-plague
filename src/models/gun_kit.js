/* Gun kit: the building blocks every code-made gun uses (Ember Rifle style, see docs/gun-style-lock.md).
   A gun is written in its own frame (voxel units, 1 voxel = 0.0065, +Y up, muzzle toward -Z) as a function that fills a body grid,
   a magazine grid and a bolt grid and says where the anchors are. finish() then shifts everything so the right hand's grip is in the same
   spot on every gun (so the gun sits in the view where the rifle does) and turns the anchors into world units, the same answer gothic_rifle.js gives.
   Colour rules: IRON is the dark metal, PLATE/PLATE2/TRIM are the skin-coloured accents, GL/GH are glow (they react to running and shooting). */
const GunKit = (function () {
  const VOX = 0.0065;
  const C = { IRON: 0x2c2c30, DARK: 0x1c1c20, STEEL: 0x44444c, PLATE: 0x8b1a22, PLATE2: 0x651018, TRIM: 0xa82a32, GL: 0xff4d14, GH: 0xff9a2a, CORE: 0x0b0a0b };
  const GRIP_TARGET = [0, -21, 16];                 // where the right hand sits on every gun (the rifle's grip)

  const grid = (seed) => new Voxel.Grid(seed);
  // rounded slab: z0..z1, y0..y1, half width hw; cut = how many voxels are cut off every long edge
  function slab(g, z0, z1, y0, y1, hw, col, cut, kind) {
    const c = Math.min(cut === undefined ? 2 : cut, hw - 1, (y1 - y0) >> 1);
    g.box(-hw, y0 + c, z0, hw, y1 - c, z1, col, 0.05, kind);
    if (c > 0) { g.box(-hw + c, y0, z0, hw - c, y0 + c, z1, col, 0.05, kind); g.box(-hw + c, y1 - c, z0, hw - c, y1, z1, col, 0.05, kind); }
  }
  // a run of slices along z: f(z) -> { y0, y1, hw, col, cut }
  function run(g, z0, z1, f) {
    for (let z = z0; z < z1; z++) { const o = f(z); slab(g, z, z + 1, o.y0, o.y1, o.hw, o.col === undefined ? C.IRON : o.col, o.cut); }
  }
  // a slanted slab: the bottom and top edges move linearly from (ya0, yb0) at z0 to (ya1, yb1) at z1 (stocks, grips, magazines)
  function wedge(g, z0, z1, a0, b0, a1, b1, hw, col, cut) {
    const n = z1 - z0 || 1;
    run(g, z0, z1, (z) => { const t = (z - z0) / n; return { y0: Math.round(a0 + (a1 - a0) * t), y1: Math.round(b0 + (b1 - b0) * t), hw, col, cut }; });
  }
  // a round tube along z, centre height cy, radius r
  function tube(g, z0, z1, cy, r, col, kind) {
    for (let z = z0; z < z1; z++) for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = -r - 1; x <= r; x++) if ((x + 0.5) * (x + 0.5) + (y + 0.5 - cy) * (y + 0.5 - cy) <= r * r) g.set(x, y, z, col, 0.05, kind);
  }
  // a thin raised ring round a tube
  const ring = (g, z, cy, r, col, th) => tube(g, z, z + (th || 1), cy, r, col);
  // a slanted grip: top at yTop, bottom at yBot, leaning back by lean voxels over its whole height, depth in z. hi/lo cut it to one stretch (the magazine part of a grip)
  function grip(g, zTop, yTop, yBot, depth, lean, hw, col, hi, lo) {
    for (let y = yTop - 1; y >= yBot; y--) {
      if ((hi !== undefined && y >= hi) || (lo !== undefined && y < lo)) continue;
      const k = Math.round((yTop - 1 - y) * lean / (yTop - yBot));
      slab(g, zTop + k, zTop + k + depth, y, y + 1, hw, col === undefined ? C.IRON : col, 1);
    }
  }
  // glow strips on both sides at x (outside a body of half width x)
  const glowSide = (g, x, y0, y1, z0, z1, col) => { g.box(x, y0, z0, x + 1, y1, z1, col || C.GL, 0.04, 'glow'); g.box(-x - 1, y0, z0, -x, y1, z1, col || C.GL, 0.04, 'glow'); };
  const glowTop = (g, y, z0, z1, hw, col) => g.box(-(hw || 1), y, z0, hw || 1, y + 1, z1, col || C.GL, 0.04, 'glow');
  // thin open red-dot frame sitting on a flat top at topY, with its rear post at z. Returns the red dot spot. The window is empty.
  function sight(g, topY, z, halfW) {                 // as thin and small as it can be: a one-voxel border, one voxel deep
    const hw = halfW || 6, y0 = topY + 1, y1 = topY + 7;
    g.box(-hw - 1, topY, z, hw + 1, y0, z + 2, C.DARK, 0.04);
    g.box(-hw - 1, y0, z, -hw, y1 + 1, z + 1, C.DARK, 0.04); g.box(hw, y0, z, hw + 1, y1 + 1, z + 1, C.DARK, 0.04);
    g.box(-hw - 1, y1, z, hw + 1, y1 + 1, z + 1, C.DARK, 0.04);
    g.box(-hw - 1, y1, z, -hw + 1, y1 + 1, z + 1, C.TRIM, 0.05); g.box(hw - 1, y1, z, hw + 1, y1 + 1, z + 1, C.TRIM, 0.05);
    g.erase(-hw, y0, z, hw, y1, z + 1);
    return { dot: [0, topY + 5, z], win: { y0, y1, halfW: hw } };
  }

  // a gun starts here: grids plus an empty anchors object the design fills in (all in voxels, in the gun's own frame)
  function start(seed) { return { body: grid(seed), mag: grid(seed + 1), bolt: grid(seed + 2), A: {}, magPivot: [0, 0, 0], boltPivot: [0, 0, 0] }; }

  // shift every grid so the right hand's grip is at GRIP_TARGET, and turn the anchors into world units
  function finish(d, name) {
    const A = d.A, dx = GRIP_TARGET[0] - A.grip[0], dy = GRIP_TARGET[1] - A.grip[1], dz = GRIP_TARGET[2] - A.grip[2];
    const mv = (p) => [p[0] + dx, p[1] + dy, p[2] + dz], u = (p) => mv(p).map((v) => v * VOX);
    const mp = mv(d.magPivot), bp = mv(d.boltPivot);
    const sh = (g, pv) => g.shifted(dx, dy, dz);
    const dot = u(A.dot);
    return {
      name, vox: VOX,
      parts: { body: { grid: sh(d.body), pivot: [0, 0, 0], scale: 1 }, mag: { grid: sh(d.mag), pivot: mp, scale: 1 }, bolt: { grid: sh(d.bolt), pivot: bp, scale: 1 } },
      anchors: {
        muzzle: u(A.muzzle), sightDot: dot, magPivot: mp.map((v) => v * VOX), boltRest: bp.map((v) => v * VOX),
        handGrip: u(A.grip), handFore: u(A.fore), handMag: u(A.magHand || A.fore),
        dotWindow: { y0: (A.win.y0 + dy) * VOX, y1: (A.win.y1 + dy) * VOX, halfW: A.win.halfW * VOX },
      },
      // the hands in world units (screen.js poses the gloves here): right on the grip, left on the support spot, and where the left hand grabs the magazine
      hands: { grip: u(A.grip), fore: u(A.fore), mag: u(A.magHand || A.fore) },
      // look: the skin this gun is shown in (colour = what it does), and its kind, for the weapon system
      kind: d.kind, skin: d.skin,
    };
  }
  return { VOX, C, grid, slab, run, wedge, tube, ring, grip, glowSide, glowTop, sight, start, finish, GRIP_TARGET };
})();
if (typeof module !== 'undefined') module.exports = GunKit;
