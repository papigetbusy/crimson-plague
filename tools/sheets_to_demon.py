"""Turns Grok's front, side and back pictures of the Demon Lord into voxel colour maps (src/models/demon_lord_data.js).
Each picture is scaled so the demon stands H voxels tall and sampled into a grid. The game carves the body from the silhouettes and paints every
face from the picture that sees it; the wings are kept apart (a thin sheet, see demon_lord_v2.js). The side picture is purple; it is turned red-orange here.
usage: python3 tools/sheets_to_demon.py art-drop/monsters src/models/demon_lord_data.js [debug_dir]"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from demon_masks import mask_of

H = 104
XW = 48
Z0, Z1 = -16, 46
src, out = sys.argv[1], sys.argv[2]
dbg = sys.argv[3] if len(sys.argv) > 3 else None

def load(name):
    a, m = mask_of(f'{src}/demon_lord_{name}.jpg', name == 'front')
    ys, xs = np.where(m)
    return dict(a=a, m=m, top=ys.min(), bot=ys.max(), x0=xs.min(), x1=xs.max())

F, S, B = load('front'), load('side'), load('back')
pf = (F['bot'] - F['top']) / H                      # picture pixels per voxel in the front picture
F.update(pxv=pf, yb=F['bot'], cx=(F['x0'] + F['x1']) / 2)
S.update(pxv=pf * 1.165, yb=S['bot'], cx=330.0)    # the side picture is a bigger shot (eyes-to-feet 875 px against 751); z = 0 is the torso's middle
B.update(pxv=pf * 1.04, yb=F['bot'] + (225 - 205) * 0 + 40, cx=(B['x0'] + B['x1']) / 2)   # the back picture is lined up by its crown gem

def wing_region(v, front):
    a = v['a']; r, g, b = a[..., 0], a[..., 1], a[..., 2]
    red = (r > 70) & (g < 48) & (b < 48) & (r > 1.8 * g)
    red = ndi.binary_opening(red, iterations=2)
    w = ndi.binary_dilation(red, iterations=22) & v['m']
    # the outer rim (black bone, gold edge) is beyond the red; keep everything outside the body column that touches the wing
    return w

WF, WB = wing_region(F, True), wing_region(B, False)
# arms in the front picture (A-pose) win over the wing where they cross: a band round each arm line, and the shoulder
def arm_band(v):
    cx, yb, pxv = v['cx'], v['yb'], v['pxv']
    band = np.zeros_like(v['m'])
    yy, xx = np.mgrid[0:band.shape[0], 0:band.shape[1]]
    for s in (-1, 1):
        sh = np.array([cx + s * 95, 340.0]); hand = np.array([cx + s * 290, 650.0])
        d = hand - sh; L = np.hypot(*d); d /= L
        t = ((xx - sh[0]) * d[0] + (yy - sh[1]) * d[1])
        perp = np.abs((xx - sh[0]) * -d[1] + (yy - sh[1]) * d[0])
        band |= (t > -50) & (t < L + 50) & (perp < 62)
        band |= ((xx - (cx + s * 150)) ** 2 + (yy - 355) ** 2) < 95 ** 2          # the pauldron
    return band
AB = arm_band(F)
WF &= ~AB
BODY_F = F['m'] & ~WF

def sample(v, px, py, region=None):
    h = v['pxv'] / 2
    x0, x1, y0, y1 = int(round(px - h)), int(round(px + h)), int(round(py - h)), int(round(py + h))
    if x0 < 0 or y0 < 0 or x1 > v['m'].shape[1] or y1 > v['m'].shape[0] or x1 <= x0 or y1 <= y0: return None
    msk = v['m'] if region is None else region
    if msk[y0:y1, x0:x1].mean() < 0.5: return None
    cx, cy = int(round(px)), int(round(py))
    blk = v['a'][max(cy - 1, 0):cy + 2, max(cx - 1, 0):cx + 2].reshape(-1, 3)
    return np.median(blk, axis=0)

cells = {}
def fill(tag, v, u_range, to_px, region=None):
    for y in range(H):
        for u in u_range:
            px = to_px(u); py = v['yb'] - (y + 0.5) * v['pxv']
            c = sample(v, px, py, region)
            if c is not None: cells[(tag, u, y)] = c
fill('f', F, range(-XW, XW), lambda x: F['cx'] - (x + 0.5) * F['pxv'], BODY_F)       # front picture: its right is -x
fill('fw', F, range(-XW, XW), lambda x: F['cx'] - (x + 0.5) * F['pxv'], WF)
fill('b', B, range(-XW, XW), lambda x: B['cx'] + (x + 0.5) * B['pxv'], B['m'] & ~WB)  # back picture: its right is +x
fill('bw', B, range(-XW, XW), lambda x: B['cx'] + (x + 0.5) * B['pxv'], WB)
fill('s', S, range(Z0, Z1), lambda z: S['cx'] + (z + 0.5) * S['pxv'])                  # side picture (faces left): its right is +z
# the head is sampled twice as fine (2 x 2 x 2 voxels to one body voxel) so the face has room for eyes, brow and teeth
HY0, HY1, HX, HZ0, HZ1 = 160, 208, 28, -24, 24
def fill_head(tag, v, urange, to_px, region):
    for y in range(HY0, HY1):
        for u in urange:
            px = to_px(u); py = v['yb'] - (y + 0.5) * v['pxv'] / 2
            h = v['pxv'] / 4
            x0, x1, y0, y1 = int(round(px - h)), int(round(px + h)), int(round(py - h)), int(round(py + h))
            if x0 < 0 or y0 < 0 or x1 > region.shape[1] or y1 > region.shape[0] or x1 <= x0 or y1 <= y0 or region[y0:y1, x0:x1].mean() < 0.5: continue
            cx, cy = int(round(px)), int(round(py))
            cells[(tag, u, y)] = np.median(v['a'][max(cy - 1, 0):cy + 2, max(cx - 1, 0):cx + 2].reshape(-1, 3), axis=0)
fill_head('hf', F, range(-HX, HX), lambda x: F['cx'] - (x + 0.5) * F['pxv'] / 2, BODY_F)
fill_head('hb', B, range(-HX, HX), lambda x: B['cx'] + (x + 0.5) * B['pxv'] / 2, B['m'] & ~WB)
fill_head('hs', S, range(HZ0, HZ1), lambda z: S['cx'] + (z + 0.5) * S['pxv'] / 2, S['m'])

def is_glow(c): return (c[0] >= 200 and 20 <= c[1] <= 175 and c[2] < 90)
def is_purple(c): return c[2] > c[1] + 35 and c[2] > 55
def fix(k, c):
    if k[0] == 's' and is_purple(c):                  # purple glow -> hot red-orange glow
        return np.array([255.0, 90.0 if c[2] < 160 else 150.0, 30.0])
    return c
cells = {k: fix(k, c) for k, c in cells.items()}
glow_keys = {k for k, c in cells.items() if is_glow(c)}
cols = np.array([c for k, c in cells.items() if k not in glow_keys])
rng = np.random.default_rng(7); K = 48
cent = cols[rng.choice(len(cols), K, replace=False)]
for _ in range(25):
    asg = ((cols[:, None, :] - cent[None]) ** 2).sum(2).argmin(1)
    for k in range(K):
        if (asg == k).any(): cent[k] = cols[asg == k].mean(0)
pal = [int(c[0]) << 16 | int(c[1]) << 8 | int(c[2]) for c in cent] + [0xff4500, 0xffa01c]
CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
def pick(k):
    c = cells[k]
    if k in glow_keys: return CH[K + (1 if c[1] > 125 else 0)]
    return CH[int(((c - cent) ** 2).sum(1).argmin())]
def rows(tag, urange, ys=None): return [''.join(pick((tag, u, y)) if (tag, u, y) in cells else '.' for u in urange) for y in (ys or range(H - 1, -1, -1))]
data = {'H': H, 'xw': XW, 'z0': Z0, 'z1': Z1, 'palette': pal, 'glow': [0] * K + [1, 1],
        'front': rows('f', range(-XW, XW)), 'frontWing': rows('fw', range(-XW, XW)), 'back': rows('b', range(-XW, XW)), 'backWing': rows('bw', range(-XW, XW)), 'side': rows('s', range(Z0, Z1)),
        'head': {'y0': HY0, 'y1': HY1, 'xw': HX, 'z0': HZ0, 'z1': HZ1, 'front': rows('hf', range(-HX, HX), range(HY1 - 1, HY0 - 1, -1)), 'back': rows('hb', range(-HX, HX), range(HY1 - 1, HY0 - 1, -1)), 'side': rows('hs', range(HZ0, HZ1), range(HY1 - 1, HY0 - 1, -1))}}
open(out, 'w').write('/* Generated by tools/sheets_to_demon.py from art-drop/monsters/demon_lord_{front,back,side}.jpg. Do not edit by hand.\n   Rows run top to bottom. front/back columns run -x to +x; side columns run -z (face) to +z (back). "." is empty. */\n'
                     'const DemonLordSheet = ' + json.dumps(data) + ';\nif (typeof module !== \'undefined\') module.exports = DemonLordSheet;\n')
print('cells', len(cells), 'glow', len(glow_keys), 'pxv', round(F['pxv'], 2), round(S['pxv'], 2), round(B['pxv'], 2), 'cx', round(F['cx']), round(S['cx']), round(B['cx']))
if dbg:
    def show(tag, urange, name):
        im = np.zeros((H, len(list(urange)), 3), 'uint8')
        for y in range(H):
            for i, u in enumerate(urange):
                for t in tag:
                    if (t, u, y) in cells: im[H - 1 - y, i] = cells[(t, u, y)]
        Image.fromarray(im).resize((im.shape[1] * 6, H * 6), Image.NEAREST).save(f'{dbg}/{name}.png')
    show(['bw', 'b'], range(-XW, XW), 'g_back'); show(['fw', 'f'], range(-XW, XW), 'g_front'); show(['s'], range(Z0, Z1), 'g_side')
