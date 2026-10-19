import os, sys, json
from playwright.sync_api import sync_playwright

STUB = """
(function(){
  const D = new Proxy(function(){}, {
    get(t,k){ if(k===Symbol.toPrimitive) return ()=>0; if(k==='then') return undefined; return D; },
    apply(){ return D; }, construct(){ return D; }, set(){ return true; }
  });
  window.THREE = new Proxy({}, { get(_,k){ return D; } });
})();
"""
desktop = len(sys.argv) > 1 and sys.argv[1] == 'desktop'
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    if desktop:
        ctx = b.new_context(viewport={'width':1280,'height':720})
    else:
        ctx = b.new_context(viewport={'width':844,'height':390}, has_touch=True, is_mobile=True, device_scale_factor=2)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR: '+str(e)))
    page.on('console', lambda m: errors.append('CONSOLE.'+m.type+': '+m.text) if m.type in ('error',) and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    page.route('**/three.min.js', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.goto('file://' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'index.html') + '')
    page.wait_for_timeout(600)
    page.screenshot(path='/home/claude/hordegame/shot_overlay_%s.png' % ('desk' if desktop else 'phone'))
    if desktop:
        page.click('#play')
        page.wait_for_timeout(200)
        page.keyboard.down('KeyW'); page.keyboard.down('ShiftLeft')
        page.mouse.move(640,360); page.mouse.down(); page.wait_for_timeout(800)
        page.keyboard.press('KeyC'); page.wait_for_timeout(600)
        page.keyboard.press('KeyR'); page.wait_for_timeout(500)
        page.mouse.up(); page.keyboard.up('KeyW')
        page.keyboard.press('Tab'); page.wait_for_timeout(200)
        page.fill('#tune_walkSpeed','8'); page.dispatch_event('#tune_walkSpeed','input')
        page.screenshot(path='/home/claude/hordegame/shot_panel_desk.png')
        page.click('#tuneReset'); page.click('#tuneCopy'); page.click('#panelClose')
    else:
        page.tap('#play'); page.wait_for_timeout(300)
        # drive pointer events on the touch zones
        def ev(sel, typ, x, y, pid):
            page.evaluate("""([sel,typ,x,y,pid])=>{const el=document.querySelector(sel);
              el.dispatchEvent(new PointerEvent(typ,{pointerId:pid,pointerType:'touch',clientX:x,clientY:y,bubbles:true,isPrimary:true}));}""",[sel,typ,x,y,pid])
        ev('#joyZone','pointerdown',120,300,1); ev('#joyZone','pointermove',130,230,1)
        ev('#lookZone','pointerdown',500,200,2); ev('#lookZone','pointermove',540,190,2)
        ev('#bFire','pointerdown',760,320,3); ev('#bFire','pointermove',770,315,3)
        ev('#bSprint','pointerdown',0,0,4); ev('#bAds','pointerdown',0,0,5); ev('#bSlide','pointerdown',0,0,6); ev('#bReload','pointerdown',0,0,7)
        page.wait_for_timeout(900)
        page.screenshot(path='/home/claude/hordegame/shot_touch.png')
        ev('#bFire','pointerup',770,315,3); ev('#joyZone','pointerup',130,230,1); ev('#lookZone','pointerup',540,190,2)
        page.tap('#gear'); page.wait_for_timeout(200)
        page.screenshot(path='/home/claude/hordegame/shot_panel_phone.png')
    print('hud', page.evaluate("()=>({ammo:document.getElementById('ammoN').textContent, cls:document.getElementById('ammo').className, rl:document.getElementById('rlFill').style.width})"))
    st = page.evaluate("()=>{const s=window.__game.ref.snapshot(); return {kills:s.kills,px:s.player.x,pz:s.player.z,mon:s.monsters.length,fov:s.player.fov}}")
    print('state', json.dumps(st))
    b.close()
print('ERRORS:', errors if errors else 'none')
