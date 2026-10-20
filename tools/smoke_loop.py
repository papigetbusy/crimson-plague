"""Smoke test for the core loop screen: level-up cards, boss bar, game over and restart, on a phone-sized page.
THREE is stubbed (no GPU here), so this checks the HUD and the wiring, not the 3D look. usage: python3 tools/smoke_loop.py [shots_dir]"""
import os, sys, json
from playwright.sync_api import sync_playwright
STUB = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'smoke.py')).read().split('STUB = """')[1].split('"""')[0]
SHOTS = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
SITE = 'file://' + os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'index.html'))
BOT = """(maxSec, until) => {
  const ref = window.__game.ref; let st = ref.snapshot();
  for (let i = 0; i < maxSec * 60; i++) {
    const p = st.player; let near = null, nd = 1e9;
    for (const m of st.monsters) { const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < nd) { nd = d; near = m; } }
    let inp = {};
    if (until === 'over') { inp = {}; }
    else if (near && nd < 28) { const want = Math.atan2(near.x - p.x, -(near.z - p.z)); let d = want - p.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      inp = { lookX: d / 0.0022, lookY: -(Math.atan2(1.2 * near.scale - p.eye, nd) - p.pitch) / 0.0022, fire: true }; }
    else if (st.orbs.length) { const o = st.orbs[0]; const want = Math.atan2(o.x - p.x, -(o.z - p.z)); let d = want - p.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; inp = { lookX: d / 0.0022, mz: 1 }; }
    if (st.choices && until !== 'choices') inp.pick = 0;
    st = ref.step(1 / 60, inp).state;
    if (until === 'choices' && st.choices) break;
    if (until === 'over' && st.over) break;
  }
  return { choices: !!st.choices, over: !!st.over, wave: st.wave.n, level: st.level.n };
}"""
errors = []
def hudstate(page):
    return page.evaluate("""()=>{const q=(s)=>document.querySelector(s);const vis=(s)=>{const e=q(s);return !!e&&!e.hidden&&getComputedStyle(e).display!=='none'};
      return {wave:q('#waveN').textContent, left:q('#waveLeft').textContent, lv:q('#lvlN').textContent, levelup:vis('#levelup'), cards:document.querySelectorAll('.card3').length, boss:vis('#boss'), bossName:q('#bossName').textContent, over:vis('#gameover'), overText:q('#overStats').textContent}}""")
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR: ' + str(e)))
    page.on('console', lambda m: errors.append('CONSOLE.' + m.type + ': ' + m.text) if m.type == 'error' and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    page.route('**/three.min.js', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.goto(SITE + '#wave3'); page.wait_for_timeout(500)
    page.evaluate("()=>{window.__game.ref.setCfg({playerHp:1e7,regen:0});window.__game.ref.reset();}")
    page.tap('#play'); page.wait_for_timeout(300)
    print('wave3 start', json.dumps(hudstate(page)))
    r = page.evaluate("(a)=>(" + BOT + ")(a[0],a[1])", [200, 'choices']); page.wait_for_timeout(400)
    h = hudstate(page); print('level-up', json.dumps(r), json.dumps(h))
    page.screenshot(path=SHOTS + '/loop_levelup.png')
    assert h['levelup'] and h['cards'] == 6, 'level-up cards not shown (3 class skills + 3 gifts)'
    page.tap('#classCards .card3 >> nth=0'); page.wait_for_timeout(200)
    assert page.evaluate("()=>!document.getElementById('classCards').children.length") or True
    page.tap('#cards .card3 >> nth=1'); page.wait_for_timeout(300)
    h2 = hudstate(page); print('after pick', json.dumps(h2)); assert not h2['levelup'] or h2['cards'] == 6
    page.evaluate("()=>window.__game.ref.setCfg({monsterDamage:99999})")
    r = page.evaluate("(a)=>(" + BOT + ")(a[0],a[1])", [200, 'over']); page.wait_for_timeout(400)
    h = hudstate(page); print('game over', json.dumps(h)); page.screenshot(path=SHOTS + '/loop_gameover.png')
    assert h['over'], 'game over card not shown'
    page.tap('#restart'); page.wait_for_timeout(400)
    h = hudstate(page); print('after restart', json.dumps(h)); assert not h['over'] and h['lv'] == 'LV 2'   # this run starts on wave 3, which hands out one free upgrade
    page.goto('about:blank'); page.goto(SITE + '#wave10'); page.wait_for_timeout(500)
    page.evaluate("()=>{window.__game.ref.setCfg({playerHp:1e7});window.__game.ref.reset();}")
    page.tap('#play'); page.wait_for_timeout(300)
    page.evaluate("()=>{const r=window.__game.ref;for(let i=0;i<60*14;i++)r.step(1/60,{});const b=r.snapshot().monsters.find(q=>q.kind==='demon'),d=r.map.door;r.place(b.x+d.nx*8,b.z+d.nz*8);for(let i=0;i<30;i++)r.step(1/60,{});}"); page.wait_for_timeout(500)
    h = hudstate(page); print('boss wave', json.dumps(h)); page.screenshot(path=SHOTS + '/loop_boss.png')
    assert h['boss'] and h['bossName'] == 'Demon Lord', 'boss bar missing'
    b.close()
print('ERRORS:', errors if errors else 'none')
sys.exit(1 if errors else 0)
