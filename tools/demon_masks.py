"""Finds the Demon Lord in Grok's pictures (black armour on a grey background): returns a boolean mask per picture.
The grey background is smooth and neutral, so a pixel is the demon if it has colour (gold, red, glow) or is darker than the background of its row."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def mask_of(path, floor_shadow=False):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    lum = a.mean(2); sat = a.max(2) - a.min(2)
    H, W = lum.shape
    neutral = sat < 7
    # background level of each row: the median of neutral, not-too-dark pixels in the outer 6% of the picture (wings never reach the very corners)
    bg = np.zeros(H)
    edge = np.r_[0:int(W * 0.04), int(W * 0.96):W]
    for y in range(H):
        v = lum[y, edge][neutral[y, edge] & (lum[y, edge] > 26)]
        bg[y] = np.median(v) if len(v) else np.nan
    idx = np.arange(H); good = ~np.isnan(bg); bg = np.interp(idx, idx[good], bg[good]); bg = ndi.uniform_filter1d(bg, 41)
    fg = (sat >= 14) | (np.abs(lum - bg[:, None]) > 8)
    # smooth flat grey (the background, and the floor shadow in the front picture) is not the demon; voxel armour always has block edges
    flat = (sat < 7) & (lum > 29) & (np.abs(lum - ndi.uniform_filter(lum, 9)) < 1.0) & (ndi.maximum_filter(lum, 7) - ndi.minimum_filter(lum, 7) < 4)
    fg &= ~ndi.binary_opening(flat, iterations=2)
    if floor_shadow: fg &= ~(((sat < 7) & (lum >= 29)) & (np.arange(H)[:, None] > 0.42 * H))   # the front picture has a grey floor shadow round the legs, hands and feet
    fg = ndi.binary_closing(ndi.binary_opening(fg, iterations=1), iterations=3)
    fg = ndi.binary_fill_holes(fg)
    lab, n = ndi.label(fg)
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    keep = [i + 1 for i, z in enumerate(sizes) if z > 0.004 * fg.size]   # the body plus any hand or horn tip the thin parts cut off
    return a, np.isin(lab, keep)

if __name__ == '__main__':
    import sys
    out = sys.argv[1]
    for n in ['front', 'side', 'back']:
        a, m = mask_of(f'art-drop/monsters/demon_lord_{n}.jpg', n == 'front')
        ys, xs = np.where(m); print(n, 'bbox x', xs.min(), xs.max(), 'y', ys.min(), ys.max(), 'area', m.sum())
        o = a.copy(); o[~m] = o[~m] * 0.25 + np.array([0, 80, 0])
        Image.fromarray(o.astype('uint8')).resize((392, 584)).save(f'{out}/mask_{n}.png')
