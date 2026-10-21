"""Draws the player skins from tools/skin_dump.js output with a painter's-algorithm box renderer (no GPU).
usage: python3 tools/skin_sheet.py dump.json out.png [view]     view: front | three | back | all (default all: a contact sheet, three views per skin)
       add a skin id after the view to draw just that one large: python3 tools/skin_sheet.py dump.json out.png three plague"""
import json, math, sys
import numpy as np
from PIL import Image, ImageDraw
D = json.load(open(sys.argv[1])); OUT = sys.argv[2]; VIEW = sys.argv[3] if len(sys.argv) > 3 else 'all'; ONLY = sys.argv[4] if len(sys.argv) > 4 else None
LIGHT = np.array([-0.35, 0.7, -0.75]); LIGHT /= np.linalg.norm(LIGHT)
FACES = [((1, 0, 0), [(1,0,0),(1,1,0),(1,1,1),(1,0,1)]), ((-1, 0, 0), [(0,0,0),(0,0,1),(0,1,1),(0,1,0)]),
         ((0, 1, 0), [(0,1,0),(0,1,1),(1,1,1),(1,1,0)]), ((0, -1, 0), [(0,0,0),(1,0,0),(1,0,1),(0,0,1)]),
         ((0, 0, 1), [(0,0,1),(1,0,1),(1,1,1),(0,1,1)]), ((0, 0, -1), [(0,0,0),(0,1,0),(1,1,0),(1,0,0)])]
def render(boxes, yaw_deg, size=(300, 560), scale=None):
    scale = (size[1] - 50) / 2.7 * 2
    yaw = math.radians(yaw_deg); c, s = math.cos(yaw), math.sin(yaw)
    W, H = size; img = Image.new('RGB', size, (40, 38, 46)); dr = ImageDraw.Draw(img)
    def rot(p): return np.array([p[0]*c + p[2]*s, p[1], -p[0]*s + p[2]*c])          # turn the person about the y axis
    polys = []
    for b in boxes:
        w, h, d = b['d']; px, py, pz = b['p']; col = np.array([(b['c'] >> 16) & 255, (b['c'] >> 8) & 255, b['c'] & 255], float)
        for n, vs in FACES:
            wn = rot(n)
            if wn[2] > 0.001: continue                                                # faces turned away from the camera (camera at -z looking +z)
            pts = [rot((px + (v[0]-0.5)*w, py + (v[1]-0.5)*h, pz + (v[2]-0.5)*d)) for v in vs]
            ctr = sum(pts) / 4
            lit = 1.0 if b['glow'] else 0.62 + 0.75 * max(0.0, float(np.dot(wn, LIGHT)))
            col2 = np.clip(col * lit if not b['glow'] else col, 0, 255)
            polys.append((ctr[2], pts, tuple(int(v) for v in col2), b['glow']))
    polys.sort(key=lambda t: -t[0])
    for z, pts, col, glow in polys:
        xy = [(W/2 - p[0]*scale*0.5, H - 22 - p[1]*scale*0.5) for p in pts]
        dr.polygon(xy, fill=col, outline=(max(0, col[0]-40), max(0, col[1]-40), max(0, col[2]-40)))
    return img
views = {'front': 0, 'three': 35, 'back': 180}
names = {n['id']: n['name'] for n in D['names']}
ids = [ONLY] if ONLY else list(D['boxes'])
vs = list(views) if VIEW == 'all' else [VIEW]
tile = (300, 560) if not ONLY else (520, 960)
if VIEW != 'all' and not ONLY:      # one view, every skin side by side (easy to compare)
    tile = (260, 520); sheet = Image.new('RGB', (tile[0]*len(ids), tile[1]+34), (28, 26, 34)); dr = ImageDraw.Draw(sheet)
    for k, i in enumerate(ids):
        sheet.paste(render(D['boxes'][i], views[VIEW], tile), (k*tile[0], 34)); dr.text((k*tile[0]+8, 10), '%d  %s' % (k+1, names.get(i, i)), fill=(240, 220, 160))
    sheet.save(OUT); print(sheet.size); sys.exit(0)
sheet = Image.new('RGB', (tile[0]*len(vs), (tile[1]+34)*len(ids)), (28, 26, 34)); dr = ImageDraw.Draw(sheet)
for r, i in enumerate(ids):
    for k, v in enumerate(vs):
        sheet.paste(render(D['boxes'][i], views[v], tile), (k*tile[0], r*(tile[1]+34)+34))
    dr.text((8, r*(tile[1]+34)+10), '%d  %s' % (r+1, names.get(i, i)), fill=(240, 220, 160))
sheet.save(OUT); print(sheet.size)
