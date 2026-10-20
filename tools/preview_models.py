"""Draws a model's mesh dump (from preview_models.js) from a chosen camera with a painter's-algorithm
rasteriser, so a voxel model can be checked without a GPU or THREE.
usage: preview_models.py dump.json out.png view   (view: side | front | back | three | top)"""
import json, sys, math
import numpy as np
from PIL import Image, ImageDraw

def load(path):
    quads = []
    for part in json.load(open(path)):
        off = np.array(part['off'])
        for m in part['meshes']:
            pos = np.array(m['pos']).reshape(-1, 3) + off
            col = np.array(m['col']).reshape(-1, 3)
            nor = np.array(m['nor']).reshape(-1, 3) if 'nor' in m else None
            idx = np.array(m['idx']).reshape(-1, 6)
            for i in idx:
                q = [i[0], i[1], i[2], i[5]]
                quads.append((pos[q], col[i[0]], m['kind'] == 'glow', nor[q].mean(axis=0) if nor is not None else None))
    return quads

def render(quads, eye, target, up, size, ortho=None, fov=40):
    eye, target, up = map(np.array, (eye, target, up))
    f = target - eye; f = f / np.linalg.norm(f)
    r = np.cross(f, up); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    W, H = size
    img = Image.new('RGB', size, (52, 52, 56)); d = ImageDraw.Draw(img)
    items = []
    for P, c, glow, nm in quads:
        rel = P - eye
        x, y, z = rel @ r, rel @ u, rel @ f
        if (z <= 0.01).any() and ortho is None: continue
        n = np.cross(P[1] - P[0], P[2] - P[0])
        if np.dot(n, eye - P[0]) <= 0 and ortho is None: continue
        if ortho is not None:
            sx = W / 2 + x / ortho * H / 2; sy = H / 2 - y / ortho * H / 2
            if np.dot(n, -f) <= 0: continue
        else:
            t = 1 / math.tan(math.radians(fov) / 2)
            sx = W / 2 + x / z * t * H / 2; sy = H / 2 - y / z * t * H / 2
        items.append((z.mean(), list(zip(sx, sy)), c, glow, nm))
    items.sort(key=lambda a: -a[0])
    L = np.array([0.4, 0.8, 0.5]); L /= np.linalg.norm(L); H = L + f * -1; H /= np.linalg.norm(H)
    for _, pts, c, glow, nm in items:
        if nm is not None and not glow:
            nm = nm / (np.linalg.norm(nm) or 1)     # lit preview: soft normals, a shiny highlight (only when the dump has normals)
            lit = 0.9 + 0.55 * max(0, nm @ L) + 0.9 * max(0, nm @ H) ** 24
            c = np.array(c) * lit
        col = tuple(int(min(1, v) * 255) for v in c)
        d.polygon(pts, fill=col, outline=None)
    return img

if __name__ == '__main__':
    q = load(sys.argv[1]); out = sys.argv[2]; view = sys.argv[3] if len(sys.argv) > 3 else 'side'
    ext = float(sys.argv[4]) if len(sys.argv) > 4 else 0.7
    cy = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
    cz = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
    tgt = (0, cy, cz)
    cams = {'side': ((5, cy, cz), (0, 1, 0)), 'back': ((0, cy, 5 + cz), (0, 1, 0)), 'front': ((0, cy, -5 + cz), (0, 1, 0)),
            'three': ((3, cy + 1.2, cz + 3.5), (0, 1, 0)), 'fthree': ((-3, cy + 1.2, cz - 4.5), (0, 1, 0)), 'top': ((0, 5, cz + 0.001), (0, 0, -1))}
    eye, up = cams[view]
    img = render(q, eye, tgt, up, (1000, 700), ortho=ext)
    img.save(out)
