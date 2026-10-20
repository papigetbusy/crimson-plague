"""Smoke test for the safe room shop screen on a phone-sized page: gold counter, the merchant's two rows of cards, buying and leaving.
THREE is stubbed (no GPU here), so this checks the HUD and the wiring, not the 3D look. usage: python3 tools/smoke_shop.py [shots_dir]"""
import os, sys, json
from playwright.sync_api import sync_playwright
STUB = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'smoke.py')).read().split('STUB = """')[1].split('"""')[0]
SHOTS = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
SITE = 'file://' + os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'index.html'))
errors, bad = [], []
def check(name, ok):
    print(('ok   ' if ok else 'FAIL ') + name)
    if not ok: bad.append(name)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    page = b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR: ' + str(e)))
    page.route('**/three.min.js', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.goto(SITE + '#wave=11&safe'); page.wait_for_timeout(500)
    page.evaluate("()=>{window.__game.ref.setCfg({playerHp:1e7,regen:0});}")
    page.tap('#play'); page.wait_for_timeout(500)
    q = lambda js: page.evaluate(js)
    check('the gold counter shows the starting gold', q("()=>document.querySelector('#goldN').textContent") == '600 G')
    check('the shop is not open until you walk up to the merchant', q("()=>document.querySelector('#levelup').hidden"))
    q("()=>{const r=window.__game.ref,s=r.snapshot();r.place(s.merchant.x,s.merchant.z+2,0);}"); page.wait_for_timeout(400)
    check('walking up to the merchant opens the shop', not q("()=>document.querySelector('#levelup').hidden"))
    check('the shop says THE MERCHANT with class training and supplies', q("()=>document.querySelector('#luTitle').textContent") == 'THE MERCHANT' and q("()=>document.querySelector('#clsHead').textContent") == 'CLASS TRAINING')
    check('there are class skill cards with prices and two supply cards', q("()=>document.querySelectorAll('#classCards .card3').length") >= 1 and q("()=>document.querySelectorAll('#cards .card3').length") == 2)
    page.screenshot(path=os.path.join(SHOTS, 'shop_open.png'))
    page.tap('#classCards .card3:first-child'); page.wait_for_timeout(300)
    check('buying a class skill takes gold', int(q("()=>document.querySelector('#goldN').textContent").split()[0]) < 600)
    page.tap('#cards .card3:last-child'); page.wait_for_timeout(300)
    check('Leave closes the shop', q("()=>document.querySelector('#levelup').hidden"))
    page.screenshot(path=os.path.join(SHOTS, 'shop_closed.png'))
    b.close()
print('ERRORS:', errors or 'none')
sys.exit(1 if bad or errors else 0)
