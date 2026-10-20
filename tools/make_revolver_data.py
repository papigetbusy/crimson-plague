"""Turns Grok's revolver picture (art-drop/gun/revolver_ref.jpg) into voxel rows: src/models/revolver_data.js.
Each voxel is a block of the picture, PX pixels wide. Characters: '.' empty, 'k' black metal, 's' silver trim, 'g' green glow.
The shape is the picture's own silhouette (holes smaller than the trigger guard are filled), so nothing is redrawn by eye.
usage: python3 tools/make_revolver_data.py"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
PX = 11.5                      # picture pixels per voxel (the gun comes out about 75 voxels long, a real revolver next to the 190 voxel rifle)
OX, OY = 675, 270              # picture pixel that becomes the gun's (z = 0, y = 0): the middle of the cylinder
im = np.array(Image.open('art-drop/gun/revolver_ref.jpg').convert('RGB')).astype(int)
lum = im.sum(2) / 3; r, g, b = im[..., 0], im[..., 1], im[..., 2]
green = (g > 140) & (g > r + 40) & (g > b + 40)
silver = lum > 140
dark = lum < 55
mask = ndi.binary_closing(dark | green | silver, iterations=3)
lab, n = ndi.label(~mask)                                   # fill every hole smaller than the trigger guard's opening
for i in range(1, n + 1):
    area = (lab == i).sum()
    if area < 2500: mask[lab == i] = True
Y0, Y1, X0, X1 = [int(v) for v in (np.where(mask.any(1))[0][[0, -1]].tolist() + np.where(mask.any(0))[0][[0, -1]].tolist())]
rows = {}
def cls(y, x):
    ys, xs = int(OY - (y + 1) * PX), int(OX + x * PX)
    blk = (slice(max(0, ys), int(ys + PX)), slice(max(0, xs), int(xs + PX)))
    m = mask[blk]; 
    if m.mean() < 0.5: return '.'
    if green[blk].mean() > 0.12: return 'g'
    if silver[blk].mean() > 0.25: return 's'
    return 'k'
zmin, zmax = int(np.floor((X0 - OX) / PX)), int(np.ceil((X1 - OX) / PX))
ymax, ymin = int(np.ceil((OY - Y0) / PX)), int(np.floor((OY - Y1) / PX))
lines = [''.join(cls(y, x) for x in range(zmin, zmax + 1)) for y in range(ymax, ymin - 1, -1)]
open('src/models/revolver_data.js', 'w').write(
    "/* Grok's black and neon-green revolver (art-drop/gun/revolver_ref.jpg) as voxel rows, made by tools/make_revolver_data.py. Row 0 is the top (y = yMax), the first column is the front (z = zMin).\n   '.' empty, 'k' black metal, 's' silver trim, 'g' green glow. Data only. */\nconst RevolverSheet = { zMin: %d, yMax: %d, rows: [\n%s\n] };\nif (typeof module !== 'undefined') module.exports = RevolverSheet;\n" % (zmin, ymax, ',\n'.join('\'' + l + '\'' for l in lines)))
print('size', len(lines[0]), 'x', len(lines), 'zMin', zmin, 'yMax', ymax)
print('\n'.join(lines))
