# Stash at the hall door: the stash is kept in the browser; pressing Enter the hall opens it when it holds something, you can take one gun and mods, and closing it starts the run.
# usage: python3 tools/smoke_stash.py seed.json   (seed.json = a list of stash entries; see tests/stash.test.js)
import os, sys, json
from playwright.sync_api import sync_playwright
STUB = "(function(){const D=new Proxy(function(){},{get(t,k){if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;return D;},apply(){return D;},construct(){return D;},set(){return true;}});window.THREE=new Proxy({},{get(_,k){return D;}});})();"
seed = open(sys.argv[1]).read() if len(sys.argv) > 1 else '[]'
errors, bad = [], 0
def check(name, ok):
    global bad
    print(('ok   ' if ok else 'FAIL ') + name)
    if not ok: bad += 1
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 720})
    ctx.add_init_script("if(!localStorage.getItem('cp_stash_v1')) localStorage.setItem('cp_stash_v1', %s);" % json.dumps(seed))
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/three.min.js', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.goto('file://' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'index.html'))
    page.wait_for_timeout(500)
    page.click('#play'); page.wait_for_timeout(600)
    check('the stash menu opens by itself at the door of the hall', page.is_visible('#stashMenu') and 'Your stash' in page.inner_text('#stashMenu'))
    check('it offers a Take this gun button and Take to my mod bag buttons', page.locator('#stashMenu button[data-act^="take"]').count() == 3)
    page.locator('#stashMenu button[data-act^="take"]').first.dispatch_event('pointerdown'); page.wait_for_timeout(200)
    txt = page.inner_text('#stashMenu')
    check('after taking one gun it shows Taken and the stash still keeps its gun', 'TAKEN' in txt.upper() and 'GUNS 1/3' in txt.upper())
    page.locator('#stashMenu button[data-act^="take"]:not([disabled])').first.dispatch_event('pointerdown'); page.wait_for_timeout(200)
    page.locator('#stashMenu button[data-act^="take"]:not([disabled])').first.dispatch_event('pointerdown'); page.wait_for_timeout(200)
    check('both mods can be taken and the stash still keeps them', page.inner_text('#stashMenu').upper().count('TAKEN') == 3 and 'MODS 2/3' in page.inner_text('#stashMenu').upper())
    saved = page.evaluate("JSON.parse(localStorage.getItem('cp_stash_v1')).length")
    check('the browser copy of the stash still holds all three things', saved == 3)
    page.dispatch_event('#stashMenu [data-act="close"]', 'pointerdown'); page.wait_for_timeout(300)
    check('closing it enters the hall', not page.is_visible('#stashMenu'))
    check('no page errors', not errors)
    if errors: print(errors)
    b.close()
sys.exit(1 if bad else 0)
