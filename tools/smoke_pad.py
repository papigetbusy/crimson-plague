"""Smoke test for controller support, with a fake gamepad: it connects (touch controls hide), plays (A starts, RT fires,
right stick turns), picks a level-up card with the D-pad and A, pauses with Start, then disconnects (touch controls return).
THREE is stubbed (no GPU here), so this checks the wiring, not the 3D look. usage: python3 tools/smoke_pad.py"""
import os, sys, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
STUB = open(os.path.join(HERE, 'smoke.py')).read().split('STUB = """')[1].split('"""')[0]
BOT = open(os.path.join(HERE, 'smoke_loop.py')).read().split('BOT = """')[1].split('"""')[0]
SITE = 'file://' + os.path.abspath(os.path.join(HERE, '..', 'site', 'index.html'))
FAKE = """(()=>{ window.__pad = null;
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__pad, null, null, null] });
  window.__setPad = (axes, held) => { window.__pad = { connected: true, id: 'Fake Xbox Controller', index: 0, mapping: 'standard', axes: axes || [0,0,0,0],
    buttons: Array.from({length: 16}, (_, i) => ({ pressed: (held||[]).includes(i), value: (held||[]).includes(i) ? 1 : 0 })) }; };
})();"""
errors, fails = [], []
def check(name, ok, extra=''):
    print(('ok   ' if ok else 'FAIL ') + name + (' ' + str(extra) if extra != '' else ''))
    if not ok: fails.append(name)
def shown(page, sel):
    return page.evaluate("(s)=>{const e=document.querySelector(s);return !!e&&!e.hidden&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'}", sel)
def hasClass(page, cls): return page.evaluate("(c)=>document.body.classList.contains(c)", cls)
def pad(page, axes=None, held=None): page.evaluate("(a)=>window.__setPad(a[0],a[1])", [axes, held])
def wait(page, ms=120): page.wait_for_timeout(ms)
A, B_, X, LT, RT, START, RIGHT = 0, 1, 2, 6, 7, 9, 15

def newpage(b, touch):
    ctx = b.new_context(viewport={'width': 844, 'height': 390} if touch else {'width': 1280, 'height': 720}, has_touch=touch, is_mobile=touch, device_scale_factor=2 if touch else 1)
    page = ctx.new_page()
    page.add_init_script(FAKE)
    page.on('pageerror', lambda e: errors.append('PAGEERROR: ' + str(e)))
    page.on('console', lambda m: errors.append('CONSOLE.' + m.type + ': ' + m.text) if m.type == 'error' and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    page.route('**/three.min.js', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    return page

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])

    # ---------- phone ----------
    page = newpage(b, True)
    page.goto(SITE + '#wave3'); wait(page, 500)
    page.evaluate("()=>{window.__game.ref.setCfg({playerHp:1e7,regen:0});window.__game.ref.reset();}")
    check('phone, no controller: touch controls show', shown(page, '#bFire') and shown(page, '#joyZone') and not hasClass(page, 'pad'))
    pad(page); wait(page, 250)
    check('phone: a connected controller is picked up by itself', hasClass(page, 'pad'))
    check('phone: the touch controls hide while it is connected', not shown(page, '#bFire') and not shown(page, '#joyZone') and not shown(page, '#lookZone') and not shown(page, '#bReload'))
    check('phone: a "Controller connected" note shows', page.evaluate("()=>document.getElementById('padToast').textContent") == 'Controller connected' and hasClass(page, 'pad'))
    check('phone: the start card shows the controller layout', shown(page, '.padhelp') and not shown(page, '.touchhelp'))
    pad(page, held=[A]); wait(page); pad(page); wait(page, 200)
    check('phone: A starts the game', not shown(page, '#start'))
    ammo0 = page.evaluate("()=>window.__game.ref.snapshot().player.ammo")
    pad(page, held=[RT]); wait(page, 500); pad(page); wait(page)
    ammo1 = page.evaluate("()=>window.__game.ref.snapshot().player.ammo")
    check('phone: the right trigger fires', ammo1 < ammo0, '%s -> %s' % (ammo0, ammo1))
    pad(page, held=[X]); wait(page, 200); pad(page); wait(page, 100)
    check('phone: X reloads', page.evaluate("()=>window.__game.ref.snapshot().player.reloading"))
    wait(page, 2400)
    yaw0 = page.evaluate("()=>window.__game.ref.snapshot().player.yaw")
    pad(page, axes=[0, 0, 1, 0]); wait(page, 400); pad(page); wait(page)
    yaw1 = page.evaluate("()=>window.__game.ref.snapshot().player.yaw")
    check('phone: the right stick turns the view', yaw1 - yaw0 > 0.5, '%.2f -> %.2f' % (yaw0, yaw1))
    z0 = page.evaluate("()=>window.__game.ref.snapshot().player")
    pad(page, axes=[0, -1, 0, 0]); wait(page, 500); pad(page); wait(page)
    z1 = page.evaluate("()=>window.__game.ref.snapshot().player")
    check('phone: the left stick moves the player', abs(z1['x'] - z0['x']) + abs(z1['z'] - z0['z']) > 0.5)
    # level-up with the controller
    page.evaluate("(a)=>(" + BOT + ")(a[0],a[1])", [200, 'choices']); wait(page, 400)
    check('phone: level-up cards show, with the first one highlighted', shown(page, '#levelup') and page.evaluate("()=>document.querySelectorAll('.card3.sel').length===1&&document.querySelector('.card3').classList.contains('sel')"))
    pad(page, held=[RIGHT]); wait(page); pad(page); wait(page)
    check('phone: D-pad right moves the highlight to the second card', page.evaluate("()=>Array.from(document.querySelectorAll('.card3')).findIndex(b=>b.classList.contains('sel'))") == 1)
    pad(page, held=[A]); wait(page, 200); pad(page); wait(page, 300)
    check('phone: A takes the highlighted card', not shown(page, '#levelup'))
    # pause and resume with Start
    pad(page, held=[START]); wait(page); pad(page); wait(page, 200)
    check('phone: Start pauses', shown(page, '#start'))
    pad(page, held=[START]); wait(page); pad(page); wait(page, 200)
    check('phone: Start resumes', not shown(page, '#start'))
    # unplug
    page.evaluate("()=>{window.__pad=null}"); wait(page, 250)
    check('phone: when the controller goes, the touch controls come back', not hasClass(page, 'pad') and shown(page, '#bFire') and shown(page, '#joyZone') and shown(page, '#lookZone'))
    check('phone: a "touch controls are back" note shows', 'Touch controls are back' in page.evaluate("()=>document.getElementById('padToast').textContent"))
    pad(page); wait(page, 250)
    check('phone: plugging it back in hides them again', hasClass(page, 'pad') and not shown(page, '#bFire'))
    page.context.close()

    # ---------- touch settings (phone, no controller) ----------
    page = newpage(b, True)
    page.goto(SITE); wait(page, 500)
    page.evaluate("()=>{try{localStorage.clear()}catch(e){}}")
    page.reload(); wait(page, 500)
    w0 = page.evaluate("()=>document.getElementById('bFire').getBoundingClientRect().width")
    page.evaluate("()=>{const e=document.getElementById('touch_tFire');e.value=1.5;e.dispatchEvent(new Event('input'))}"); wait(page, 100)
    w1 = page.evaluate("()=>document.getElementById('bFire').getBoundingClientRect().width")
    check('touch settings: the Fire size slider makes the button bigger', w1 > w0 * 1.3, '%.0f -> %.0f' % (w0, w1))
    page.evaluate("()=>{const e=document.getElementById('touch_showAds');e.checked=false;e.dispatchEvent(new Event('change'))}"); wait(page, 100)
    check('touch settings: switching off Show Aim hides the Aim button', not shown(page, '#bAds') and shown(page, '#bFire') and shown(page, '#bReload'))
    page.reload(); wait(page, 500)
    check('touch settings: sizes and hidden buttons are remembered after a reload', not shown(page, '#bAds') and page.evaluate("()=>document.getElementById('bFire').getBoundingClientRect().width") > w0 * 1.3)
    page.evaluate("()=>document.getElementById('tuneReset').click()"); wait(page, 150)
    check('touch settings: Reset brings every button back at normal size', shown(page, '#bAds') and abs(page.evaluate("()=>document.getElementById('bFire').getBoundingClientRect().width") - w0) < 2)
    # effects: the preset buttons, saved choice, and the sprite effects starting on a shot
    nb = page.evaluate("()=>document.querySelectorAll('.fxb').length")
    check('effects: the settings panel has a button for every look preset when the art is in the build', nb == 10, nb)
    page.evaluate("()=>document.querySelector('.fxb[data-fx=legendary]').click()"); wait(page, 100)
    check('effects: picking Legendary is remembered', page.evaluate("()=>window.__game.view.fxPreset") == 'legendary' and page.evaluate("()=>document.querySelector('.fxb.on').dataset.fx") == 'legendary')
    page.reload(); wait(page, 700)
    check('effects: the choice is still Legendary after a reload', page.evaluate("()=>window.__game.view.fxPreset") == 'legendary')
    page.evaluate("()=>{window.__game.ref.setCfg({playerHp:1e7,regen:0});window.__game.ref.reset();}")
    pad(page, held=[A]); wait(page); pad(page); wait(page, 200)
    s0 = page.evaluate("()=>window.__game.fx.spawned()")
    pad(page, held=[RT]); wait(page, 600); pad(page); wait(page)
    s1 = page.evaluate("()=>window.__game.fx.spawned()")
    check('effects: firing starts sprite effects (muzzle, hits)', s1 > s0, '%s -> %s' % (s0, s1))
    page.evaluate("()=>document.querySelector('.fxb[data-fx=original]').click()"); wait(page, 100)
    s2 = page.evaluate("()=>window.__game.fx.spawned()")
    pad(page, held=[RT]); wait(page, 600); pad(page); wait(page)
    check('effects: Original starts no sprite effects', page.evaluate("()=>window.__game.fx.spawned()") == s2)
    page.evaluate("()=>document.getElementById('tuneReset').click()"); wait(page, 150)
    check('effects: Reset goes back to Common', page.evaluate("()=>window.__game.view.fxPreset") == 'common')
    check('gun: 8 skin buttons and two inspect buttons are in the panel', page.evaluate("()=>document.querySelectorAll('.gunset .fxb[data-skin]').length") == 8 and page.evaluate("()=>document.querySelectorAll('.gunset .fxb[data-inspect]').length") == 2)
    page.evaluate("()=>document.querySelector('.gunset .fxb[data-skin=infernal]').click()"); wait(page, 100)
    check('gun: picking Infernal is remembered and marked', page.evaluate("()=>window.__game.view.gunSkin") == 'infernal' and page.evaluate("()=>document.querySelector('.gunset .fxb.on').dataset.skin") == 'infernal')
    for kind in ('sides', 'mag'):
        page.evaluate("(k)=>document.querySelector('.gunset .fxb[data-inspect='+k+']').click()", kind); wait(page, 100)
    page.evaluate("()=>document.getElementById('tuneReset').click()"); wait(page, 150)
    check('gun: Reset goes back to the Crimson skin', page.evaluate("()=>window.__game.view.gunSkin") == 'crimson')
    # no two visible touch buttons may overlap, whatever is hidden and however big they are
    OVERLAP = """(sizes)=>{
      const view = window.__game.view, ids = ['bFire','bAds','bSlide','bSprint','bReload'], out = [];
      for (let m = 0; m < 16; m++) {
        for (const s of sizes) {
          const set = (k, v) => { const e = document.getElementById('touch_' + k); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event(e.type === 'checkbox' ? 'change' : 'input')); };
          set('showAds', !(m & 1)); set('showSlide', !(m & 2)); set('showSprint', !(m & 4)); set('showReload', !(m & 8));
          for (const k of ['tFire','tAds','tSlide','tSprint','tReload']) set(k, s);
          const r = ids.map(i => { const e = document.getElementById(i); return getComputedStyle(e).display === 'none' ? null : [i, e.getBoundingClientRect()]; }).filter(Boolean);
          for (let a = 0; a < r.length; a++) for (let b = a + 1; b < r.length; b++) {
            const A = r[a][1], B = r[b][1];
            const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
            if (w > 2 && h > 2) out.push(r[a][0] + '+' + r[b][0] + ' hidden=' + m + ' size=' + s);
          }
        }
      }
      return out;
    }"""
    clashes = page.evaluate(OVERLAP, [1, 1.3])
    check('touch settings: no two visible buttons overlap in any hide combination (normal and 1.3x sizes)', not clashes, clashes[:4])
    page.context.close()

    # ---------- desktop ----------
    page = newpage(b, False)
    page.goto(SITE); wait(page, 500)
    check('desktop, no controller: keyboard hints show', shown(page, '.keys') and not shown(page, '.padhelp') and not hasClass(page, 'pad'))
    pad(page); wait(page, 250)
    check('desktop: a controller is picked up by itself and its hints replace the keyboard ones', hasClass(page, 'pad') and shown(page, '.padhelp') and not shown(page, '.keys'))
    pad(page, held=[A]); wait(page); pad(page); wait(page, 200)
    check('desktop: A starts the game without needing the mouse', not shown(page, '#start'))
    pad(page, held=[START]); wait(page); pad(page); wait(page, 200)
    check('desktop: the game pauses with Start', shown(page, '#start'))
    page.evaluate("()=>{window.__pad=null}"); wait(page, 250)
    check('desktop: unplugging puts the keyboard hints back', not hasClass(page, 'pad') and shown(page, '.keys'))
    page.context.close()
    b.close()
print('ERRORS: ' + ('none' if not errors else '\n'.join(errors)))
sys.exit(1 if fails or errors else 0)
