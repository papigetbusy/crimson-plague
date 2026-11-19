#!/usr/bin/env python3
"""Upscale the three gothic pistols' 256 px painted albedos to 1024 with Wrok's own smooth-label hd_upscale (the same one the other 14 remakes used;
the helpers below are copied verbatim from gun_gothic_common.py, which needs Blender to import), then rewrite the albedo PNG and the albedo embedded in
each GLB (UVs are unchanged) with a LINEAR + mip-linear sampler. Run from the repo root: python3 tools/hd_pistol_albedos.py"""
import io, json, struct, sys
import numpy as np
from PIL import Image

def _cr_up2(a, axis):
    """Catmull-Rom 2x upsample along an axis (edge clamped)."""
    a = a.astype(np.float32)
    n = a.shape[axis]
    idx = np.arange(n)
    def take(off):
        return np.take(a, np.clip(idx + off, 0, n - 1), axis=axis)
    p0, p1, p2, p3 = take(-1), take(0), take(1), take(2)
    def cr(t):
        return (0.5 * (-t ** 3 + 2 * t ** 2 - t) * p0 + 0.5 * (3 * t ** 3 - 5 * t ** 2 + 2) * p1 +
                0.5 * (-3 * t ** 3 + 4 * t ** 2 + t) * p2 + 0.5 * (t ** 3 - t ** 2) * p3)
    lo, hi = cr(0.75), cr(0.25)       # samples at -0.25 / +0.25 of the source pixel (centres)
    # output sample k=2i is at source i-0.25 (between i-1 and i, t=0.75 of p_{i-1}), k=2i+1 at i+0.25
    lo = _shift_cr(a, axis, -1, 0.75)
    hi = _shift_cr(a, axis, 0, 0.25)
    shp = list(a.shape); shp[axis] *= 2
    out = np.empty(shp, dtype=np.float32)
    sl = [slice(None)] * 3
    sl[axis] = slice(0, None, 2); out[tuple(sl)] = lo
    sl[axis] = slice(1, None, 2); out[tuple(sl)] = hi
    return out


def _shift_cr(a, axis, base, t):
    n = a.shape[axis]; idx = np.arange(n)
    g = lambda off: np.take(a, np.clip(idx + base + off, 0, n - 1), axis=axis)
    p0, p1, p2, p3 = g(-1), g(0), g(1), g(2)
    return (0.5 * (-t ** 3 + 2 * t ** 2 - t) * p0 + 0.5 * (3 * t ** 3 - 5 * t ** 2 + 2) * p1 +
            0.5 * (-3 * t ** 3 + 4 * t ** 2 + t) * p2 + 0.5 * (t ** 3 - t ** 2) * p3)


def _gblur(f, sig):
    r = max(1, int(sig * 3))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sig) ** 2); k /= k.sum()
    for ax in (0, 1):
        pad = [(r, r) if d == ax else (0, 0) for d in range(f.ndim)]
        p = np.pad(f, pad, mode='edge')
        out = np.zeros_like(f)
        for t, w in enumerate(k):
            sl = [slice(None)] * f.ndim; sl[ax] = slice(t, t + f.shape[ax]); out += w * p[tuple(sl)]
        f = out
    return f


def hd_upscale(arr, sig=0.55, beta=12.0):
    """256 logical painter grid -> 1024 smooth, anti-aliased albedo.
    Smooth-label upscale: every palette colour becomes a soft mask (gaussian + Catmull-Rom x4); each output texel is the
    softmax blend of the colours, so contours become clean curves with a ~1px anti-aliased edge and NO stair-steps,
    thin engraving lines stay crisp. A faint fine grain keeps flat areas from looking like plastic."""
    h, w, _ = arr.shape
    cols, inv = np.unique(arr.reshape(-1, 3), axis=0, return_inverse=True)
    inv = inv.reshape(h, w)
    num = np.zeros((h * 4, w * 4, 3), np.float32); den = np.zeros((h * 4, w * 4), np.float32)
    for k, c in enumerate(cols):
        s = _gblur((inv == k).astype(np.float32), sig)
        s = np.repeat(s[..., None], 3, 2)
        for _ in range(2):
            s = _cr_up2(_cr_up2(s, 0), 1)
        e = np.exp(beta * np.clip(s[..., 0], 0, 1))
        num += e[..., None] * c.astype(np.float32); den += e
    f = num / den[..., None]
    rng = np.random.RandomState(7)
    g = rng.normal(0.0, 1.0, f.shape[:2]).astype(np.float32)[..., None]
    f = f * (1.0 + 0.02 * g)
    return np.clip(f + 0.5, 0, 255).astype(np.uint8)


def hd_round(src, s1=0.55, b1=12.0, s2=3.0, b2=14.0):
    """Second smoothing stage for chunky pixel-art paintings (skull, scrollwork): take hd_upscale's result, snap it back to hard palette labels at 1024,
    blur each label mask (s2 px) and softmax again (steep b2), so the 1-logical-pixel stair-steps become round curves while thin engraving stays."""
    cols = np.unique(src.reshape(-1, 3), axis=0)
    hd = hd_upscale(src, s1, b1).astype(np.float32)
    lab = np.zeros(hd.shape[:2], np.int32); best = np.full(hd.shape[:2], 1e18, np.float32)
    for k, c in enumerate(cols):
        d = ((hd - c.astype(np.float32)) ** 2).sum(2)
        m = d < best; lab[m] = k; best[m] = d[m]
    num = np.zeros(hd.shape, np.float32); den = np.zeros(hd.shape[:2], np.float32)
    for k, c in enumerate(cols):
        e = np.exp(b2 * _gblur((lab == k).astype(np.float32), s2)); num += e[..., None] * c.astype(np.float32); den += e
    f = num / den[..., None]
    g = np.random.RandomState(7).normal(0.0, 1.0, f.shape[:2]).astype(np.float32)[..., None]
    return np.clip(f * (1.0 + 0.02 * g) + 0.5, 0, 255).astype(np.uint8)


def rewrite(glb_path, png_bytes):
    f = open(glb_path, 'rb').read()
    jl = struct.unpack('<I', f[12:16])[0]
    j = json.loads(f[20:20 + jl])
    bl = struct.unpack('<I', f[20 + jl:24 + jl])[0]
    bin0 = f[28 + jl:28 + jl + bl]
    img_bv = j['images'][0]['bufferView']
    out = bytearray()
    for i, bv in enumerate(j['bufferViews']):
        data = png_bytes if i == img_bv else bin0[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        while len(out) % 4: out += b'\x00'
        bv['byteOffset'] = len(out); bv['byteLength'] = len(data); out += data
    while len(out) % 4: out += b'\x00'
    j['buffers'][0]['byteLength'] = len(out)
    for s in j.get('samplers', []): s['magFilter'] = 9729; s['minFilter'] = 9987
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(out)
    open(glb_path, 'wb').write(struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out))


if __name__ == '__main__':
    d = 'assets/models/gun/'
    for n in sys.argv[1:] or ['pistol_cannon', 'pistol_machine', 'pistol_duelist']:
        src = np.array(Image.open(d + n + '_base_albedo.png').convert('RGB'))
        if src.shape[0] != 256: print(n, 'already', src.shape); continue
        hd = hd_round(src)   # these three were painted as chunky pixel art, so a second smoothing stage rounds the stair-steps
        buf = io.BytesIO(); Image.fromarray(hd).save(buf, 'PNG', optimize=True)
        open(d + n + '_base_albedo.png', 'wb').write(buf.getvalue())
        rewrite(d + n + '_base.glb', buf.getvalue())
        print(n, hd.shape, len(buf.getvalue()))
