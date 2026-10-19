"""Pulls the free art packs the owner already uses in Crusader Tactics (Tiny Swords by Pixel Frog, Super Pixel Effects by Will Tice /
unTied Games, Raven Fantasy Icons by Clockwork Raven) out of that game's single page into assets-private/ct/.
That folder is git-ignored on purpose: the packs' licences allow using them in a game but not handing out the raw files, so they stay local
until the owner decides how to ship them. Run it again any time to refresh.
usage: python3 tools/extract_ct_assets.py path/to/crusader-tactics/index.html"""
import re, base64, os, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets-private', 'ct')
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'papigetbusy', 'crusader-tactics', 'index.html')
t = open(src, encoding='utf8').read()

# every   "name": "data:image/png;base64,..."   goes in a folder named after the object it sits in
pat = re.compile(r'["\']?([A-Za-z0-9_\-\. ]+)["\']?\s*:\s*["\'](data:image/(?:png|webp|jpeg|gif);base64,([A-Za-z0-9+/=]+))["\']')
seen, cats = set(), collections.Counter()
for m in pat.finditer(t):
    objs = re.findall(r'const\s+([A-Za-z0-9_]+)\s*=\s*\{', t[max(0, m.start() - 400000):m.start()])
    grp = objs[-1] if objs else 'misc'
    d = os.path.join(OUT, grp); os.makedirs(d, exist_ok=True)
    fn = os.path.join(d, re.sub(r'[^A-Za-z0-9_\-\.]', '_', m.group(1)) + '.png')
    if fn in seen: continue
    open(fn, 'wb').write(base64.b64decode(m.group(3))); seen.add(fn); cats[grp] += 1
# border and button pictures used by the CSS skin
d = os.path.join(OUT, 'css_ui'); os.makedirs(d, exist_ok=True)
css = re.findall(r'url\((data:image/png;base64,([A-Za-z0-9+/=]+))\)', t)
for i, m in enumerate(css): open(os.path.join(d, 'ui_%02d.png' % i), 'wb').write(base64.b64decode(m[1]))

# the frame tables for the effect sheets (where each animation frame sits)
flat = re.sub(r'data:image/[a-z]+;base64,[A-Za-z0-9+/=]+', '<b64>', t)
def balanced(s, i):
    depth = 0
    for j in range(i, len(s)):
        if s[j] == '{': depth += 1
        elif s[j] == '}':
            depth -= 1
            if depth == 0: return s[i:j + 1]
efx = json.loads(balanced(flat, flat.find('{', flat.find('"efx"'))))
json.dump({'efx': efx}, open(os.path.join(OUT, 'fx_meta.json'), 'w'))
print('extracted', len(seen) + len(css), 'images and', len(efx), 'effect frame tables into', os.path.normpath(OUT), dict(cats))
