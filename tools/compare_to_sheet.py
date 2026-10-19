"""Renders the rifle from the exact side camera of Grok's picture and writes a side-by-side image,
so a model can be signed off against the picture. usage: compare_to_sheet.py dump.json sheet.jpg out.png"""
import sys, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import preview_models as pm
from PIL import Image
q = pm.load(sys.argv[1]); sheet = Image.open(sys.argv[2]).convert('RGB'); W, H = sheet.size
PX = 0.0885 * 0.013                         # world units per picture pixel
cx, cy = (W / 2 - 430) * PX, (395 - H / 2) * PX
mine = pm.render(q, (5, cy, -cx), (0, cy, -cx), (0, 1, 0), (W, H), ortho=H / 2 * PX)
out = Image.new('RGB', (W * 2, H)); out.paste(sheet, (0, 0)); out.paste(mine, (W, 0)); out.save(sys.argv[3])
