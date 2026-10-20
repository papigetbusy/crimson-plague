"""Draws generated floors from above (the way the minimap will).  Run: python3 tools/floor_map.py out.png seed floor [floor ...]
Grey = rock, dark = floor, red = carpet, gold = pillar, green square = where you spawn, red square = the door, orange dots = torches."""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
out, seed, floors = sys.argv[1], sys.argv[2], sys.argv[3:]
tmp = out + '.json'; subprocess.check_call(['node', os.path.join(HERE, 'floor_map.js'), tmp, seed] + floors)
data = json.load(open(tmp)); os.remove(tmp)
S = 6                                              # pixels per cell
COL = {'.': (64, 58, 66), 'c': (170, 30, 40), 'P': (205, 160, 64), 'D': (226, 58, 66)}
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
panels = []
for f in data:
    W, H = f['W'], f['H']; im = Image.new('RGB', (W * S, H * S + 26), (18, 10, 12)); d = ImageDraw.Draw(im)
    for z, row in enumerate(f['rows']):
        for x, ch in enumerate(row):
            d.rectangle([x * S, z * S + 26, x * S + S - 1, z * S + 26 + S - 1], fill=COL.get(ch, (30, 26, 32)))
    for t in f['torches']: d.ellipse([t['x'] / 2 * S - 1, t['z'] / 2 * S + 25, t['x'] / 2 * S + 2, t['z'] / 2 * S + 28], fill=(255, 150, 40))
    sx, sz = f['start']['x'] / 2 * S, f['start']['z'] / 2 * S + 26; d.rectangle([sx - 7, sz - 7, sx + 7, sz + 7], fill=(60, 220, 90))
    dx, dz = f['door']['x'] / 2 * S, f['door']['z'] / 2 * S + 26; d.rectangle([dx - 8, dz - 8, dx + 8, dz + 8], fill=(240, 60, 70), outline=(255, 255, 255))
    d.text((6, 4), 'Floor %d: %d x %d cells (%d x %d units), %d rooms' % (f['floor'], W, H, W * 2, H * 2, len(f['rooms'])), fill=(236, 223, 198), font=font)
    panels.append(im)
Wt = sum(p.width for p in panels) + 10 * (len(panels) - 1); Ht = max(p.height for p in panels)
sheet = Image.new('RGB', (Wt, Ht), (0, 0, 0)); x = 0
for p in panels: sheet.paste(p, (x, 0)); x += p.width + 10
sheet.save(out); print(out, sheet.size)
