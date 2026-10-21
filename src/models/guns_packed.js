/* Guns made from the free pack models (Quaternius Ultimate Gun Pack and Kenney Blaster Kit, both CC0, see docs/credits.md).
   The pack shapes were flattened into side-view profiles by tools/mesh_to_gun.js (data in guns_packed_data.js). Here a profile is rebuilt as
   voxels (every side-view cell is extruded sideways to its half width, so barrels stay round), then given this game's look:
   colour roles (so skins and status colours paint it), glow strips, a clear red-dot window, a magazine that comes out, and details that make each gun its own.
   A spec says which profile, where the sight, hands, magazine and muzzle are, which patches to repaint, and a detail function with the extras. */
const GunsPacked = (function () {
  const K = typeof GunKit !== 'undefined' ? GunKit : require('./gun_kit.js'), C = K.C;
  const DATA = typeof GunsPackedData !== 'undefined' ? GunsPackedData : require('./guns_packed_data.js');
  const ROLE = [C.IRON, C.DARK, C.STEEL, C.PLATE, C.PLATE2, C.TRIM];            // the numbers in the data
  const R = { IRON: 0, DARK: 1, STEEL: 2, PLATE: 3, PLATE2: 4, TRIM: 5 };

  // the profile as cells: key 'y,z' -> { y, z, hw, role }
  function cells(key) {
    const a = DATA[key], m = new Map();
    if (!a) throw new Error('no packed gun data: ' + key);
    for (let i = 0; i < a.length; i += 5) for (let z = a[i + 1]; z < a[i + 1] + a[i + 2]; z++) m.set(a[i] + ',' + z, { y: a[i], z, hw: a[i + 3], role: a[i + 4] });
    return m;
  }
  const inBox = (c, b) => c.y >= b[0] && c.y < b[1] && c.z >= b[2] && c.z < b[3];
  const each = (m, b, fn) => { for (const c of [...m.values()]) if (inBox(c, b)) fn(c); };
  const drop = (m, b) => each(m, b, (c) => m.delete(c.y + ',' + c.z));
  // repaint every cell in box b = [y0, y1, z0, z1] with a role (only cells that now have role "from" when given)
  const paint = (m, b, role, from) => each(m, b, (c) => { if (from === undefined || c.role === from) c.role = role; });
  const topOf = (m, z) => { let t = -1; for (const c of m.values()) if (c.z === z && c.y > t) t = c.y; return t + 1; };
  function put(g, m) { for (const c of m.values()) g.box(-c.hw, c.y, c.z, c.hw, c.y + 1, c.z + 1, ROLE[c.role], 0.05); }

  // surface work on the extruded body. box = [y0, y1, z0, z1] picks side-view cells; col is a name from the kit's palette (GL and GH are glow).
  //  'inlay' paints the outermost layer of those cells (flush, like an inlaid strip or a vent slot); 'plate' sticks a 1-voxel plate out of both sides
  //  (armour panels, barrel bands, ribs); 'top' sticks a rib out of the top of the cells. Both sides at once, since the guns are symmetrical.
  function surface(b, m, op) {
    const type = op[0], box = op.slice(1, 5), col = C[op[5]], kind = op[5] === 'GL' || op[5] === 'GH' ? 'glow' : undefined, t = op[6] || 1;
    if (col === undefined) throw new Error('unknown colour ' + op[5]);
    each(m, box, (c) => {
      if (type === 'top') { const above = m.get((c.y + 1) + ',' + c.z); if (!above) b.box(-Math.min(t, c.hw), c.y + 1, c.z, Math.min(t, c.hw), c.y + 2, c.z + 1, col, 0.04, kind); return; }
      if (type === 'inlay') { b.set(c.hw - 1, c.y, c.z, col, 0.04, kind); b.set(-c.hw, c.y, c.z, col, 0.04, kind); return; }
      for (let i = 0; i < t; i++) { b.set(c.hw + i, c.y, c.z, col, 0.04, kind); b.set(-c.hw - 1 - i, c.y, c.z, col, 0.04, kind); }
    });
  }
  // a round drum (disc standing across the gun): centre height cy, centre z cz, radius r, half width hw, with a glowing hub
  function drum(g, cy, cz, r, hw, col, hub) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
      const dd = Math.hypot(y + 0.5 - cy, z + 0.5 - cz); if (dd > r) continue;
      g.box(-hw, y, z, hw, y + 1, z + 1, dd > r - 1.5 ? C.STEEL : col, 0.05);
      if (hub && dd < r * 0.4) { g.box(hw, y, z, hw + 1, y + 1, z + 1, hub, 0.04, 'glow'); g.box(-hw - 1, y, z, -hw, y + 1, z + 1, hub, 0.04, 'glow'); }
    }
  }
  // spec: { key, name, kind, skin, seed, sight: [z, halfW] (its base sits on the profile's top there), mag: [y0,y1,z0,z1] or null, magPivot: [y,z],
  //         chop: [[y0,y1,z0,z1]], paint: [[y0,y1,z0,z1,role,from]], A: { muzzle: [y,z], grip: [y,z], fore: [y,z], magHand: [y,z] }, detail(d, b, m, K) }
  function make(s) {
    const d = K.start(s.seed); d.kind = s.kind; d.skin = s.skin; const b = d.body, m = cells(s.key);
    for (const c of s.chop || []) drop(m, c);
    for (const p of s.paint || []) paint(m, p.slice(0, 4), p[4], p[5]);
    let top = s.top !== undefined ? s.top : topOf(m, s.sight[0]);
    const want = s.A.grip[0] + (s.dotDy || 27) - 5;                                // the red dot sits about the same height above the hand on every gun: a low receiver gets a raised rail
    if (top < want && !s.noRail) { const rt = Math.min(want, top + (s.rail || 3)); d.body.box(-2, top, s.sight[0] - 1, 2, rt, s.sight[0] + 3, C.DARK, 0.04); top = rt; }
    drop(m, [top + 2, 400, s.sight[0] - 60, s.sight[0] + 40]);                      // the red-dot window: nothing above the sight base within reach of the dot
    if (s.mag) { const mm = new Map(); each(m, s.mag, (c) => { mm.set(c.y + ',' + c.z, c); m.delete(c.y + ',' + c.z); }); put(d.mag, mm); d.magPivot = [0, s.magPivot[0], s.magPivot[1]]; }
    else if (s.magPivot) d.magPivot = [0, s.magPivot[0], s.magPivot[1]];
    if (s.bolt) { const bm = new Map(); each(m, s.bolt, (c) => { bm.set(c.y + ',' + c.z, c); m.delete(c.y + ',' + c.z); }); put(d.bolt, bm); d.boltPivot = [0, s.boltPivot[0], s.boltPivot[1]]; }
    put(b, m);
    for (const op of s.ops || []) surface(b, m, op);
    if (s.detail) s.detail(d, b, m, K);
    const sg = K.sight(b, top, s.sight[0], s.sight[1]);
    const P = (p) => [0, p[0], p[1]];
    d.A = { muzzle: P(s.A.muzzle), grip: P(s.A.grip), fore: P(s.A.fore), magHand: P(s.A.magHand || s.A.fore), dot: sg.dot, win: sg.win };
    return K.finish(d, s.name);
  }
  return { make, cells, surface, drum, R, ROLE };
})();
if (typeof module !== 'undefined') module.exports = GunsPacked;
