"""Draws the wall textures of every wall set (stone, panel, pillar, floor, ceiling) side by side, large, so the little painted details can be checked.
usage: python3 tools/wall_sets_sheet.py out.png"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
read = lambda p: open(os.path.join(ROOT, 'src', p)).read()
PAGE = """<body style='margin:0;background:#1c1a22'><canvas id=o width=860 height=1330></canvas><script>
const THREE = { CanvasTexture: function (c) { this.image = c; }, NearestFilter: 1, RepeatWrapping: 2 };
""" + read('screen/world_tex.js') + read('screen/wall_materials.js') + read('screen/wall_sets.js') + """
const out = document.getElementById('o').getContext('2d'); out.imageSmoothingEnabled = false; out.font = '14px sans-serif';
const S = 3;
WallSets.LIST.forEach((set, row) => {
  const T = WorldTex.create(THREE); WallSets.create(T).apply(set.id);
  const y = row * 220 + 4; out.fillStyle = '#e8d8a0'; out.fillText((row + 1) + ' ' + set.name, 6, y + 12);
  let x = 6;
  for (const [n, w, h] of [['texStone', 32, 64], ['texPanel', 32, 64], ['texPillar', 32, 64], ['texFloor', 32, 32], ['texFloor2', 32, 32], ['texFloor3', 32, 32], ['texCeil', 32, 32]]) {
    out.drawImage(T[n].image, 0, 0, w, h, x, y + 18, w * S, h * S); x += w * S + 8;
    if (n === 'texStone') { out.drawImage(T[n].image, 0, 0, w, h, x, y + 18, w * S, h * S); x += w * S + 8; }
  }
});
</script>"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 860, 'height': 1330}); pg.set_content(PAGE); pg.wait_for_timeout(300)
    pg.screenshot(path=sys.argv[1]); b.close()
print('wrote', sys.argv[1])
