"""Desktop mouse check: the mouse is captured while playing, a level-up lets go of it so a real click picks a card, number keys (row and pad) pick too, and the mouse is taken back after.
Needs Playwright. Run: python3 tools/smoke_mouse.py   (reads the cheat build, so run `node tools/build.js x --cheat` first)"""
import os, re, sys
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
STUB = re.search(r'STUB\s*=\s*(r?""".*?""")', open(os.path.join(here, 'smoke.py')).read(), re.S).group(1)
STUB = eval(STUB)
errors, bad = [], []
def check(name, ok):
    print(('ok   ' if ok else 'FAIL ') + name)
    if not ok: bad.append(name)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_context(viewport={'width': 1100, 'height': 620}).new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.route('**/three.min.js', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + os.path.join(here, '..', 'cheat', 'index.html')); pg.wait_for_timeout(800)
    pg.evaluate("document.getElementById('play').click()"); pg.wait_for_timeout(500)
    pg.mouse.click(550, 310); pg.wait_for_timeout(400)
    g = 'window.__game.ref'
    pend = lambda: pg.evaluate('(() => { const s = %s.snapshot(); return !!(s.choices || s.classChoices); })()' % g)
    both = lambda: pg.evaluate('JSON.stringify([%s.snapshot().choices, %s.snapshot().classChoices].map(x => (x || []).map(c => c.id)))' % (g, g))
    locked = lambda: pg.evaluate('!!document.pointerLockElement')
    check('the mouse is captured while playing', locked())
    pg.evaluate(g + '.giveXp(300)'); pg.wait_for_timeout(500)
    check('a level-up lets go of the mouse', pend() and not locked())
    box = pg.evaluate("(() => { const r = document.querySelector('#levelup .card3').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()")
    before = both(); pg.mouse.click(box[0], box[1]); pg.wait_for_timeout(300)
    check('a real mouse click picks a card', both() != before)
    for _ in range(10):
        if not pend(): break
        pg.keyboard.press('Numpad1'); pg.wait_for_timeout(120); pg.keyboard.press('Digit4'); pg.wait_for_timeout(120)
    check('number pad and number row keys pick too', not pend())
    pg.wait_for_timeout(600)
    check('the mouse is taken back and the game is not paused', locked() and pg.evaluate("document.getElementById('start').hidden"))
    # both buttons: hold right to aim, then also press left to shoot, in either order
    pg.mouse.move(550, 310)
    held = lambda: pg.evaluate('[window.__game.mouse.fire, window.__game.mouse.ads]')
    pg.mouse.down(button='right'); pg.wait_for_timeout(120); pg.mouse.down(button='left'); pg.wait_for_timeout(150)
    check('aim first, then shoot: both are on', held() == [True, True])
    pg.mouse.up(button='left'); pg.wait_for_timeout(120)
    check('letting go of shoot keeps aiming', held() == [False, True])
    pg.mouse.up(button='right'); pg.wait_for_timeout(120)
    check('letting go of aim turns it off', held() == [False, False])
    pg.mouse.down(button='left'); pg.wait_for_timeout(120); pg.mouse.down(button='right'); pg.wait_for_timeout(150)
    check('shoot first, then aim: both are on', held() == [True, True])
    pg.mouse.up(button='right'); pg.wait_for_timeout(120)
    check('letting go of aim keeps shooting', held() == [True, False])
    pg.mouse.up(button='left'); pg.wait_for_timeout(120)
    check('everything off when both are released', held() == [False, False])
    # tabbing out and back in: the game pauses, RESUME works, and a refused mouse capture never switches capture off for good
    state = lambda: pg.evaluate("[!!document.pointerLockElement, document.getElementById('start').hidden]")
    pg.evaluate("document.exitPointerLock(); Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('blur'))"); pg.wait_for_timeout(300)
    check('tabbing out pauses the game and shows RESUME', state() == [False, False])
    pg.evaluate("Object.defineProperty(document, 'hidden', {value: false, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus'))")
    pg.evaluate("document.dispatchEvent(new Event('pointerlockerror'))")           # the browser refuses the mouse for a moment
    pg.evaluate("document.getElementById('play').click()"); pg.wait_for_timeout(400)
    check('RESUME after tabbing back puts you back in the game with the mouse', state() == [True, True])
    pg.evaluate("document.exitPointerLock()"); pg.wait_for_timeout(100); pg.evaluate("document.dispatchEvent(new Event('pointerlockerror'))")
    pg.evaluate("document.getElementById('play').click()"); pg.wait_for_timeout(300)
    pg.evaluate("document.exitPointerLock()"); pg.wait_for_timeout(100)
    pg.evaluate("document.getElementById('play').click()"); pg.wait_for_timeout(300)
    pg.mouse.down(button='left'); pg.wait_for_timeout(150); pg.mouse.up(button='left'); pg.wait_for_timeout(150)
    check('after a refused capture, a click takes the mouse again', pg.evaluate("!!document.pointerLockElement"))
    # tabbing out while a level-up is open: the RESUME card must be on top and the level-up must still be pickable after it
    pg.evaluate(g + '.giveXp(300)'); pg.wait_for_timeout(400)
    pg.evaluate("document.exitPointerLock(); Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('blur'))"); pg.wait_for_timeout(300)
    pg.evaluate("Object.defineProperty(document, 'hidden', {value: false, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus'))")
    top = pg.evaluate("(() => { const r = document.getElementById('play').getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e && (e.id === 'play' || !!e.closest('#play')); })()")
    check('with a level-up open, tabbing out still shows a clickable RESUME on top', top)
    pg.evaluate("document.getElementById('play').click()"); pg.wait_for_timeout(400)
    for _ in range(10):
        if not pend(): break
        pg.keyboard.press('1'); pg.wait_for_timeout(120); pg.keyboard.press('4'); pg.wait_for_timeout(120)
    check('and the level-up can be picked after resuming', not pend())
    check('no page errors', not errors)
    b.close()
sys.exit(1 if bad else 0)
