/* Crimson Demon Lord v2 (CANDIDATE, not signed off): carved from Grok's front, side and back pictures (art-drop/monsters/demon_lord_*.jpg).
   The body is carved from the front and side silhouettes and every face is painted from the picture that sees it (demon_lord_data.js, made by
   tools/sheets_to_demon.py; the side picture's purple is turned red-orange there). The long cape comes from the back and side pictures.
   The wings are thin sheets: their shape from the front picture, their sweep back from the side picture, their colour from front and back.
   Cut into the same eleven jointed parts as v1 (body, legs, torso, head, arms, wings) so the walk and attack animation do not change.
   Model space: feet at y = 0, +Y up, the face points to -Z, +X is the demon's left as seen from the front picture's left. */
const DemonLordV2 = (function () {
  const D = typeof DemonLordSheet !== 'undefined' ? DemonLordSheet : require('./demon_lord_data.js');
  const H = D.H, XW = D.xw, VOX = 4.2 / H;
  // joints in model voxels, read from the front picture
  const J = { hip: 38, waist: 52, neck: 82, shoulder: 78, elbow: 60, legX: 7, shoulderX: 11, elbowX: 22, wing: [10, 76, 9] };
  const CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const grid = (rows, u0) => (u, y) => { const r = rows[H - 1 - y]; if (!r) return -1; const ch = r[u - u0]; return ch === undefined || ch === '.' ? -1 : CH.indexOf(ch); };
  const F = grid(D.front, -XW), FW = grid(D.frontWing, -XW), B = grid(D.back, -XW), BW = grid(D.backWing, -XW), S = grid(D.side, D.z0);
  const CAPE_Z = 11, TORSO_Z = 10;                                    // the cape starts behind the legs; the torso and head are no deeper than this

  // the arm band round each arm line of the front picture's A-pose (shoulder to hand), and the shoulder
  const SH = [10.9, 78], HAND = [33.2, 42.7], LEN = Math.hypot(HAND[0] - SH[0], HAND[1] - SH[1]);
  function armT(ax, y) {                                              // position along the arm (voxels) and distance from its line
    const dx = (HAND[0] - SH[0]) / LEN, dy = (HAND[1] - SH[1]) / LEN;
    return { t: (ax - SH[0]) * dx + (y - SH[1]) * dy, perp: Math.abs((ax - SH[0]) * -dy + (y - SH[1]) * dx) };
  }
  function partOf(x, y, z) {
    const ax = Math.abs(x + 0.5), yc = y + 0.5;
    if (yc >= J.neck && ax <= 14) return 'head';
    const a = armT(ax, yc), pauldron = Math.hypot(ax - 17.2, yc - 76) < 11;
    if ((pauldron || (a.t > -5 && a.t < LEN + 5 && a.perp < 7.2)) && z >= -8 && z < 11 && yc < 92) return (x >= 0 ? 'armR' : 'armL') + (yc < J.elbow ? 'F' : 'U');
    if (yc < J.hip && z < CAPE_Z) return x >= 0 ? 'legR' : 'legL';
    if (yc < J.waist) return 'body';
    return 'torso';
  }

  // the head: carved twice as fine (2 x 2 x 2 voxels to a body voxel) from the head crops of the three pictures, so the face has room
  const HD = D.head, hgrid = (rows, u0, y1) => (u, y) => { const r = rows[y1 - 1 - y]; if (!r) return -1; const ch = r[u - u0]; return ch === undefined || ch === '.' ? -1 : CH.indexOf(ch); };
  const HF = hgrid(HD.front, -HD.xw, HD.y1), HB = hgrid(HD.back, -HD.xw, HD.y1), HS = hgrid(HD.side, HD.z0, HD.y1);
  function buildHead() {
    const g = new Voxel.Grid(131);
    for (let z = HD.z0; z < HD.z1; z++) for (let y = Math.max(HD.y0, J.neck * 2); y < HD.y1; y++) {
      const s = HS(z, y); if (s < 0) continue;
      for (let x = -HD.xw; x < HD.xw; x++) {
        const f = HF(x, y), b = HB(x, y); if (f < 0 || z >= TORSO_Z * 2) continue;
        const col = (i) => D.palette[i >= 0 ? i : s];
        g.setFaces(x, y, z, [col(s), col(s), col(f), col(f), col(b >= 0 ? b : f), col(f)], D.glow[f] ? 'glow' : 'solid');
      }
    }
    sharpenFace(g);
    return g;
  }
  // the face, cut over Grok's closed helm so he reads as scary: big slanted burning eyes under a heavy brow, and a snarling mouth full of fangs
  const EYE = 0xff5a14, EYE_HOT = 0xffb030, TOOTH = 0xd8cdb0, MOUTH = 0x140606, THROAT = 0xff4500, DARK = 0x15131a;
  function sharpenFace(g) {
    const front = (x, y) => { for (let z = HD.z0; z < TORSO_Z * 2; z++) if (HS(z, y) >= 0 && HF(x, y) >= 0) return z; return null; };
    const paint = (x, y, c, kind, out) => { const z = front(x, y); if (z === null) return; g.setFaces(x, y, z - (out || 0), [c, c, c, c, c, c], kind || 'solid'); };
    for (const sgn of [-1, 1]) {
      for (let k = 0; k < 7; k++) {                                     // eye: a slanted slit, 7 wide, rising towards the outside
        const x = sgn * (4 + k), y = 172 + Math.floor(k / 2);
        paint(x, y, EYE, 'glow'); paint(x, y + 1, k < 5 ? EYE_HOT : EYE, 'glow'); paint(x, y - 1, EYE, 'glow');
        paint(x, y + 3 + Math.floor(k / 3), DARK, 'solid', 1);          // brow ridge above, slanting down towards the nose
      }
    }
    for (let x = -10; x <= 10; x++) {                                    // mouth: a dark gash with a hot throat
      const y0 = 164 - Math.floor(Math.abs(x) / 5);
      for (let y = y0; y <= y0 + 3; y++) paint(x, y, y === y0 + 1 || y === y0 + 2 ? THROAT : MOUTH, y > y0 && y < y0 + 3 ? 'glow' : 'solid');
      if (x % 3 === 0) { for (let d = 0; d < 3; d++) paint(x, y0 + 3 - 0, TOOTH, 'solid', 1); for (let d = 1; d <= 3; d++) paint(x, y0 - d + 1 + 0, TOOTH, 'solid', 1); }
    }
    for (const sgn of [-1, 1]) for (let d = 0; d < 4; d++) paint(sgn * 11, 164 + d, TOOTH, 'solid', 2);   // tusks at the corners
  }
  function build() {
    const names = ['body', 'legR', 'legL', 'torso', 'head', 'armRU', 'armLU', 'armRF', 'armLF', 'wingR', 'wingL'];
    const G = {}; names.forEach((n, i) => { G[n] = new Voxel.Grid(120 + i); });
    const pal = (i, fallback) => D.palette[i >= 0 ? i : fallback];
    // the cape is no wider than the legs and tabard in the front picture, plus a little, so the legs still read from the front
    const capeHalf = []; for (let y = 0; y < H; y++) { let m = 0; for (let x = -XW; x < XW; x++) if (F(x, y) >= 0) m = Math.max(m, Math.abs(x + 0.5)); capeHalf[y] = Math.min(m + 2, 21); }
    for (let z = D.z0; z < D.z1; z++) for (let y = 0; y < H; y++) {
      const s = S(z, y); if (s < 0) continue;
      for (let x = -XW; x < XW; x++) {
        const f = F(x, y), b = B(x, y);
        const cape = z >= CAPE_Z && y < J.waist;
        if (cape ? (b < 0 || Math.abs(x + 0.5) > capeHalf[y]) : (f < 0 || z >= (y < J.waist ? CAPE_Z : TORSO_Z))) continue;
        const col = (i) => pal(i, s);
        // faces: +x, -x, +y, -y, +z, -z
        const fc = cape ? [col(s), col(s), col(b), col(b), col(b), col(b)] : [col(s), col(s), col(f), col(f), col(b >= 0 ? b : f), col(f)];
        const glow = !cape && D.glow[f];
        const part = cape ? 'body' : partOf(x, y, z);
        if (part === 'head') continue;                                  // the head is carved finer, below
        G[part].setFaces(x, y, z, fc, glow ? 'glow' : 'solid');
      }
    }
    G.head = buildHead();
    // wings: a three-voxel sheet that sweeps back the further out and down it goes, as the side picture's wing triangle shows
    for (let y = 0; y < H; y++) for (let x = -XW; x < XW; x++) {
      const f = FW(x, y), b = BW(x, y); if (f < 0 && b < 0) continue;
      const z0 = Math.round(Math.max(11, 12 + 0.3 * (Math.abs(x + 0.5) - 10) + 0.17 * (88 - y)));   // sweeps back the further out and down it goes (the side picture's triangle)
      const col = (i, j) => pal(i, j >= 0 ? j : 0);
      for (let z = z0; z < z0 + 3; z++) {
        const fc = [col(b, f), col(b, f), col(b, f), col(b, f), col(b, f), col(f, b)];
        G[x >= 0 ? 'wingR' : 'wingL'].setFaces(x, y, z, fc, (f >= 0 && D.glow[f]) || (b >= 0 && D.glow[b]) ? 'glow' : 'solid');
      }
    }
    const fine = { head: 2 };
    const joints = {
      legR: [J.legX, J.hip, 0], legL: [-J.legX, J.hip, 0], torso: [0, J.waist, 0], head: [0, J.neck, 0],
      armRU: [J.shoulderX, J.shoulder, 0], armLU: [-J.shoulderX, J.shoulder, 0], armRF: [J.elbowX, J.elbow, 0], armLF: [-J.elbowX, J.elbow, 0],
      wingR: J.wing, wingL: [-J.wing[0], J.wing[1], J.wing[2]],
    };
    const u = (v) => v * VOX;
    const pose = names.map((n) => { const j = joints[n] || [0, 0, 0], f = fine[n] || 1; return { name: n, grid: G[n], pivot: j.map((v) => v * f), off: j.map(u), vox: VOX / f }; });
    return { vox: VOX, grids: G, joints, pose, fine };
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = DemonLordV2;
