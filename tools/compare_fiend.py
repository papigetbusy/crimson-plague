"""Renders the fiend from the camera of each of Grok's pictures (front, side, back) and writes them side by side.
usage: compare_fiend.py dump.json art-drop/monsters out.png"""
import sys, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import preview_models as pm
from PIL import Image
VOX = 3.4 / 80
q = pm.load(sys.argv[1]); d = sys.argv[2]
views = {'front': dict(yb=1037, pxv=11.96, cx=395), 'side': dict(yb=1044, pxv=11.9, cx=403), 'back': dict(yb=1079, pxv=12.76, cx=389)}
tiles = []
for name in ['front', 'side', 'back']:
    v = views[name]; sheet = Image.open(f'{d}/fiend_{name}.jpg').convert('RGB'); W, H = sheet.size
    upp = VOX / v['pxv']; yt = (v['yb'] - H / 2) * upp; off = (W / 2 - v['cx']) * upp
    if name == 'front': eye, tgt = (-off, yt, -6), (-off, yt, 0)
    elif name == 'back': eye, tgt = (off, yt, 6), (off, yt, 0)
    else: eye, tgt = (-6, yt, off), (0, yt, off)
    mine = pm.render(q, eye, tgt, (0, 1, 0), (W, H), ortho=H / 2 * upp)
    tile = Image.new('RGB', (W * 2, H)); tile.paste(sheet, (0, 0)); tile.paste(mine, (W, 0)); tiles.append(tile.resize((W, H // 2 + H // 2)))
out = Image.new('RGB', (sum(t.size[0] for t in tiles), tiles[0].size[1]))
x = 0
for t in tiles: out.paste(t, (x, 0)); x += t.size[0]
out.save(sys.argv[3])
