"""Draws converted gun profiles (from tools/mesh_to_gun.js) side-on, with a 10-voxel grid, so the muzzle direction, grip and mag can be picked by eye.
usage: profile_sheet.py data.json out.png [name ...]"""
import json, sys
from PIL import Image, ImageDraw
COL = [(70, 70, 78), (28, 28, 32), (150, 150, 165), (200, 60, 60), (170, 110, 60), (230, 90, 90)]
d = json.load(open(sys.argv[1])); names = sys.argv[3:] or list(d)
import os
S = int(os.environ.get("S", 5)); cols = 2; cells = []
for n in names:
    r = d[n]; zs = [r[i + 1] + r[i + 2] for i in range(0, len(r), 5)]; ys = [r[i] for i in range(0, len(r), 5)]
    cells.append((n, r, max(zs) + 4, max(ys) + 4))
W = max(c[2] for c in cells) * S + 20; H = max(c[3] for c in cells) * S + 30
rows = (len(cells) + cols - 1) // cols
img = Image.new('RGB', (W * cols, H * rows), (40, 40, 44)); dr = ImageDraw.Draw(img)
for k, (n, r, w, h) in enumerate(cells):
    ox, oy = (k % cols) * W + 10, (k // cols) * H + H - 10
    dr.text((ox, oy - H + 12), n + '  (muzzle = left, z=0)', fill=(255, 255, 255))
    for z in range(0, w, 10): dr.line([ox + z * S, oy, ox + z * S, oy - h * S], fill=(60, 60, 66)); dr.text((ox + z * S + 1, oy - h * S - 8), str(z), fill=(120, 120, 130))
    for y in range(0, h, 10): dr.line([ox, oy - y * S, ox + w * S, oy - y * S], fill=(60, 60, 66)); dr.text((ox - 9, oy - y * S - 5), str(y), fill=(120, 120, 130))
    for i in range(0, len(r), 5):
        y, z0, ln, hw, role = r[i:i + 5]; c = COL[role]
        dr.rectangle([ox + z0 * S, oy - (y + 1) * S, ox + (z0 + ln) * S - 1, oy - y * S - 1], fill=c)
img.save(sys.argv[2])
