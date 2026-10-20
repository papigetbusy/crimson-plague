"""Scale chart: every model at its real in-game size, side by side on one ground line, with the hall's measurements.
Run: python3 tools/scale_chart.py out_dir     (writes scale_chart.png, plan_view.png and sizes.json)
Sizes are world units (1 unit is about 1 metre). The numbers come from src/referee.js and the models, not from this file,
except the screen's look-only numbers (MODEL 0.72, gun scale 1.15) which are copied from src/screen.js."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import preview_models as pm
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
os.makedirs(OUT, exist_ok=True)
MODEL, GUN_SCALE = 0.72, 1.15
EYE, WALL_H, CELL = 1.7, 5.5, 2.0
PPU = 100                                   # pixels per world unit
FONT = lambda n: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', n)
BG, INK, GOLD, RED = (22, 12, 14), (236, 223, 198), (207, 165, 74), (226, 58, 66)

# footprint radius the referee uses (MONSTER_RADIUS 0.5 * monster scale, limited to 0.8..1.4) and the kind's size
KINDS = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('%s/src/referee_data.js').KINDS))" % os.path.join(HERE, '..')]))
def dump(which):
    path = os.path.join(OUT, which + '.json')
    subprocess.check_call(['node', os.path.join(HERE, 'preview_models.js'), which, path])
    return pm.load(path)
def scaled(quads, k): return [(q[0] * k,) + tuple(q[1:]) for q in quads]
def bbox(quads):
    allp = np.concatenate([q[0] for q in quads]); return allp.min(0), allp.max(0)

H_PX = int((WALL_H + 0.6) * PPU)
def shot(quads, view, w_units):
    W = int(w_units * PPU); ortho = H_PX / (2 * PPU); cy = H_PX / (2 * PPU)
    eye, up = ((5, cy, 0), (0, 1, 0)) if view == 'side' else ((0, cy, -5), (0, 1, 0))
    img = pm.render(quads, eye, (0, cy, 0), up, (W, H_PX), ortho=ortho).convert('RGBA')
    px = np.array(img); mask = (px[:, :, 0] == 52) & (px[:, :, 1] == 52) & (px[:, :, 2] == 56); px[mask, 3] = 0
    return Image.fromarray(px)

items = []   # (label, image, height, width)
sizes = {}
# the player: a plain figure, 1.8 tall, eyes at 1.7 (the referee's eyeStand)
fig = Image.new('RGBA', (int(0.9 * PPU), H_PX), (0, 0, 0, 0)); d = ImageDraw.Draw(fig)
base = H_PX; cx = fig.width // 2
d.rectangle([cx - 14, base - int(0.9 * PPU), cx - 4, base], fill=(90, 90, 100)); d.rectangle([cx + 4, base - int(0.9 * PPU), cx + 14, base], fill=(90, 90, 100))
d.rectangle([cx - 20, base - int(1.5 * PPU), cx + 20, base - int(0.85 * PPU)], fill=(110, 110, 122))
d.ellipse([cx - 13, base - int(1.84 * PPU), cx + 13, base - int(1.52 * PPU)], fill=(130, 130, 142))
items.append(('You', fig, 1.8, 0.8)); sizes['You'] = {'height': 1.8, 'width': 0.8, 'eye': EYE, 'collision radius': 0.4}
for name, which, kind, view, w in [('Bone Hound', 'hound2', 'hound', 'side', 1.7), ('Horned Fiend', 'fiend2', 'fiend', 'front', 1.9), ('Rock Golem', 'golem', 'golem', 'front', 2.7), ('Demon Lord (boss)', 'demon2', 'demon', 'front', 4.9)]:
    k = MODEL * KINDS[kind]['size']; q = scaled(dump(which), k); lo, hi = bbox(q)
    items.append((name, shot(q, view, w), float(hi[1]), w))
    sc = KINDS[kind]['size']; rad = 0.5 * min(max(sc, 0.8), 1.4)
    sizes[name] = {'height': round(float(hi[1]), 2), 'width': round(float(hi[0] - lo[0]), 2), 'length': round(float(hi[2] - lo[2]), 2), 'collision radius': round(rad, 2), 'size multiplier': sc}

# the chart: ground line, grid every unit, ceiling line, labels
GAP = int(0.5 * PPU); L = 70
W = L + sum(i[1].width for i in items) + GAP * (len(items) + 1) + int(4.9 * PPU)
IMG_H = H_PX + 90
ch = Image.new('RGB', (W, IMG_H), BG); d = ImageDraw.Draw(ch); ground = 50 + H_PX
for u in range(0, int(WALL_H) + 2):
    y = ground - u * PPU
    if y < 40: break
    d.line([(L, y), (W, y)], fill=(44, 26, 28), width=1); d.text((8, y - 8), '%d' % u, fill=GOLD, font=FONT(14))
yc = ground - WALL_H * PPU; d.line([(L, yc), (W, yc)], fill=RED, width=2); d.text((L + 6, yc - 20), 'ceiling %.1f' % WALL_H, fill=RED, font=FONT(14))
d.line([(L, ground), (W, ground)], fill=GOLD, width=3)
x = L + GAP
for name, img, h, w in items:
    ch.paste(img, (x, ground - H_PX), img)
    cxm = x + img.width // 2
    d.text((cxm - 60, ground + 8), name, fill=INK, font=FONT(15)); d.text((cxm - 30, ground + 28), '%.2f tall' % h, fill=GOLD, font=FONT(13))
    d.line([(x - 2, ground - int(h * PPU)), (x + img.width + 2, ground - int(h * PPU))], fill=(120, 90, 40), width=1)
    x += img.width + GAP
    if name == 'You': d.line([(x - GAP - img.width, ground - int(EYE * PPU)), (x - GAP, ground - int(EYE * PPU))], fill=RED, width=1); d.text((x - GAP - img.width + 30, ground - int(EYE * PPU) - 18), 'eyes 1.7', fill=RED, font=FONT(12))
# the rifle at in-game size (side view), with its length marked
rq = []
rf = os.path.join(OUT, 'rifle.json'); subprocess.check_call(['node', os.path.join(HERE, 'preview_models.js'), 'rifle', rf]); rq = scaled(pm.load(rf), GUN_SCALE); lo, hi = bbox(rq)
gl, gh = float(hi[2] - lo[2]), float(hi[1] - lo[1])
rw = int((gl + 0.2) * PPU); rimg = shot(rq, 'side', gl + 0.2)
# the rifle's own centre is not its middle: shift so it sits in the box
gx = x; ch.paste(rimg, (gx, ground - H_PX - int(1.25 * PPU)), rimg)   # drawn at the height your hands hold it
d.text((gx, ground + 8), 'Rifle (held at hip height)', fill=INK, font=FONT(15)); d.text((gx, ground + 28), '%.2f long, %.2f tall' % (gl, gh), fill=GOLD, font=FONT(13))
sizes['Rifle (in your hands)'] = {'length': round(gl, 2), 'height': round(gh, 2), 'gun scale': GUN_SCALE}
# a proposed door (not built yet), drawn as an outline so the owner can judge it against the monsters
dx0 = gx + rimg.width + GAP; dw, dh = 3.0, 3.8
d.rectangle([dx0, ground - int(dh * PPU), dx0 + int(dw * PPU), ground], outline=GOLD, width=3)
d.text((dx0, ground + 8), 'Door (proposed)', fill=INK, font=FONT(15)); d.text((dx0, ground + 28), '%.1f wide, %.1f tall' % (dw, dh), fill=GOLD, font=FONT(13))
sizes['Door (proposed, not built)'] = {'width': dw, 'height': dh}
ch.save(os.path.join(OUT, 'scale_chart.png'))

# plan view: the corridor from above, with every monster's collision circle
PP = 70; cw = 6.0; pimg = Image.new('RGB', (int((cw + 8) * PP), int(4.2 * PP)), BG); d = ImageDraw.Draw(pimg)
x0, y0 = int(0.4 * PP), int(0.5 * PP)
d.rectangle([x0, y0, x0 + int(cw * PP), y0 + int(3.4 * PP)], fill=(34, 20, 22), outline=GOLD, width=3)
d.text((x0 + 6, y0 - 22), 'Corridor: %.0f units wide (3 cells of %.0f)' % (cw, CELL), fill=GOLD, font=FONT(14))
cx = x0 + 0.12 * PP
for name, r, col in [('You', 0.4, (130, 130, 142)), ('Hound', 0.4, (200, 190, 160)), ('Fiend', 0.5, (180, 60, 50)), ('Golem', 0.625, (90, 90, 100)), ('Demon', 0.7, (110, 30, 50))]:
    cx += r * PP; cy = y0 + 1.7 * PP
    d.ellipse([cx - r * PP, cy - r * PP, cx + r * PP, cy + r * PP], fill=col, outline=INK); d.text((cx - 20, cy + r * PP + 4), name, fill=INK, font=FONT(12))
    cx += r * PP + 0.08 * PP
d.text((x0 + int((cw + 0.5) * PP), y0), 'Open chamber: 38 x 22 units', fill=INK, font=FONT(14))
d.text((x0 + int((cw + 0.5) * PP), y0 + 24), 'Corridor: 6 wide, 36 long', fill=INK, font=FONT(14))
d.text((x0 + int((cw + 0.5) * PP), y0 + 48), 'Circles are the sizes the referee uses', fill=(170, 150, 120), font=FONT(12))
d.text((x0 + int((cw + 0.5) * PP), y0 + 66), 'for walking into walls and each other.', fill=(170, 150, 120), font=FONT(12))
d.text((x0 + int((cw + 0.5) * PP), y0 + 100), 'About %d fiends side by side fit the corridor.' % int(cw / 1.0), fill=INK, font=FONT(14))
pimg.save(os.path.join(OUT, 'plan_view.png'))
json.dump(sizes, open(os.path.join(OUT, 'sizes.json'), 'w'), indent=1)
print(json.dumps(sizes, indent=1))
