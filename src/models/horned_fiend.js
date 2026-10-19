/* Crimson Horned Fiend (Grok's model sheets, art-drop/monsters).
   The body is carved from the three silhouettes (front, side, back) and every face is painted from the
   picture that sees it (horned_fiend_data.js, made by tools/sheets_to_fiend.py). Then it is cut into jointed
   parts so the screen can swing the legs, arms and head.
   Model space: feet at y = 0, +Y up, the face points to -Z, +X is the fiend's left as seen from the front picture's left. */
const HornedFiend = (function () {
  const D = typeof HornedFiendSheet !== 'undefined' ? HornedFiendSheet : require('./horned_fiend_data.js');
  const VOX = 3.4 / D.H;
  const H = D.H, XW = D.xw;
  // joints, in model voxels (read from the front picture's proportions)
  const J = { hip: 31, waist: 40, neck: 58, shoulder: 56, elbow: 40, legX: 8, shoulderX: 14 };

  const lookup = (rows, u0) => (u, y) => { const r = rows[H - 1 - y]; if (!r) return -1; const ch = r[u - u0]; return ch === undefined || ch === '.' ? -1 : parseInt(ch, 36 + 0) >= 0 ? CH.indexOf(ch) : -1; };
  const CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const F = lookup(D.front, -XW), B = lookup(D.back, -XW), Sd = lookup(D.side, D.z0);

  function partOf(x, y, z) {
    const ax = Math.abs(x + 0.5), yp = (y + 0.5) / H;
    const armCut = yp < 0.39 ? 14 : yp < 0.62 ? 11.2 : 13;
    if (yp >= 0.25 && yp < 0.74 && ax >= armCut) return (x >= 0 ? 'armR' : 'armL') + (y < J.elbow ? 'F' : 'U');
    if (y >= 64 || (y >= 58.4 && ax <= 13)) return 'head';
    if (y < J.hip && z < 12) return x >= 0 ? 'legR' : 'legL';
    if (y < J.waist) return 'body';
    return 'torso';
  }

  function build() {
    const names = ['body', 'legR', 'legL', 'torso', 'head', 'armRU', 'armLU', 'armRF', 'armLF'];
    const G = {}; names.forEach((n, i) => { G[n] = new Voxel.Grid(30 + i); });
    // tail: the front and back pictures hide it between the legs, so it is cut from the side picture alone
    const tailHalf = {};
    for (let z = 12; z < D.z1; z++) { let lo = 99, hi = -1; for (let y = 0; y < J.waist; y++) if (Sd(z, y) >= 0) { lo = Math.min(lo, y); hi = Math.max(hi, y); } tailHalf[z] = hi < 0 ? 0 : (hi - lo + 1) * 0.42; }
    for (let z = D.z0; z < D.z1; z++) for (let y = 0; y < H; y++) {
      const sIdx = Sd(z, y); if (sIdx < 0) continue;
      for (let x = -XW; x < XW; x++) {
        const f = F(x, y), b = B(x, y);
        const body = f >= 0 && b >= 0;
        const tail = !body && z >= 12 && y < J.waist && Math.abs(x + 0.5) <= (tailHalf[z] || 0);
        if (!body && !tail) continue;
        const colOf = (i) => (i >= 0 ? D.palette[i] : D.palette[sIdx]);
        // faces: +x, -x, +y, -y, +z, -z
        const fc = [D.palette[sIdx], D.palette[sIdx], colOf(f), colOf(f), colOf(b), colOf(f)];
        const lit = (f >= 0 && D.glow[f]) || D.glow[sIdx];
        const part = partOf(x, y, z);
        if (part.startsWith('arm') && (z < -14 || z >= 8)) continue;     // an arm is only as deep as an arm: the side picture's tail and thigh must not be extruded into it
        G[part].setFaces(x, y, z, fc, lit && f >= 0 && D.glow[f] ? 'glow' : 'solid');
      }
    }
    const joints = {
      legR: [J.legX, J.hip, 0], legL: [-J.legX, J.hip, 0], torso: [0, J.waist, 0], head: [0, J.neck, 0],
      armRU: [J.shoulderX, J.shoulder, 0], armLU: [-J.shoulderX, J.shoulder, 0], armRF: [J.shoulderX, J.elbow, 0], armLF: [-J.shoulderX, J.elbow, 0],
    };
    const u = (v) => v * VOX;
    const pose = names.map((n) => { const j = joints[n] || [0, 0, 0]; return { name: n, grid: G[n], pivot: j, off: j.map(u) }; });
    return { vox: VOX, grids: G, joints, pose };
  }
  return { build, VOX, J };
})();
if (typeof module !== 'undefined') module.exports = HornedFiend;
