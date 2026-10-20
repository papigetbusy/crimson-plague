"""Draws the two silhouettes from gun_silhouette.js: the original rifle in blue, the new gun in orange, where they overlap in grey.
usage: python3 tools/gun_silhouette.py in.json out.png"""
import json, sys
from PIL import Image
d = json.load(open(sys.argv[1])); S = 5
pts = d['a'] + d['b']
z0, z1 = min(p[0] for p in pts), max(p[0] for p in pts); y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
W, H = (z1 - z0 + 3) * S, (y1 - y0 + 3) * S
im = Image.new('RGB', (W, H), (24, 24, 28)); px = im.load()
A = set(map(tuple, d['a'])); B = set(map(tuple, d['b']))
for (z, y) in A | B:
    col = (150, 150, 155) if (z, y) in A and (z, y) in B else (70, 120, 255) if (z, y) in A else (255, 140, 40)
    for i in range(S):
        for j in range(S):
            px[(z - z0 + 1) * S + i, (y1 - y + 1) * S + j] = col
im.save(sys.argv[2])
