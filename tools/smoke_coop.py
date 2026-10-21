"""Playing with friends, end to end in a real browser: two pages (a host and a friend) find each other through a fake matchmaker (BroadcastChannel stands in for the internet),
join by room code, start together, see each other's world, and revive a downed friend. Needs Playwright.
Run: python3 tools/smoke_coop.py   (reads the cheat build, so run `node tools/build.js x --cheat` first)"""
import os, re, sys, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.join(here, '..')
STUB = eval(re.search(r'STUB\s*=\s*(r?""".*?""")', open(os.path.join(here, 'smoke.py')).read(), re.S).group(1))
FAKE_PEER = """
(function(){
  const bc = new BroadcastChannel('fakepeer');
  const rid = () => Math.random().toString(36).slice(2, 10);
  class Em { constructor(){ this.h = {}; } on(e, f){ (this.h[e] = this.h[e] || []).push(f); } emit(e, ...a){ (this.h[e] || []).forEach((f) => f(...a)); } }
  class Conn extends Em { constructor(peer, remote, cid){ super(); this.peer = remote; this.pr = peer; this.cid = cid; this.open = false; } send(d){ bc.postMessage({ to: this.peer, from: this.pr.id, k: 'data', cid: this.cid, d: JSON.parse(JSON.stringify(d)) }); } }
  window.Peer = class Peer extends Em {
    constructor(id){ super(); this.id = id || 'anon-' + rid(); this.conns = {}; setTimeout(() => this.emit('open', this.id), 20);
      bc.addEventListener('message', (ev) => { const m = ev.data; if (m.to !== this.id) return;
        if (m.k === 'connect') { const c = new Conn(this, m.from, m.cid); c.open = true; this.conns[m.cid] = c; this.emit('connection', c); setTimeout(() => c.emit('open'), 0); bc.postMessage({ to: m.from, from: this.id, k: 'accepted', cid: m.cid }); }
        else if (m.k === 'accepted') { const c = this.conns[m.cid]; if (c) { c.open = true; c.emit('open'); } }
        else if (m.k === 'data') { const c = this.conns[m.cid]; if (c) c.emit('data', m.d); }
        else if (m.k === 'bye') { const c = this.conns[m.cid]; if (c) { c.open = false; c.emit('close'); } } }); }
    connect(id){ const cid = rid(), c = new Conn(this, id, cid); this.conns[cid] = c; bc.postMessage({ to: id, from: this.id, k: 'connect', cid }); return c; }
    destroy(){ for (const c of Object.values(this.conns)) bc.postMessage({ to: c.peer, from: this.id, k: 'bye', cid: c.cid }); }
  };
})();
"""
errors, bad = [], []
def check(name, ok):
    print(('ok   ' if ok else 'FAIL ') + name)
    if not ok: bad.append(name)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory=os.path.join(root, 'cheat')))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True)
    ctx.add_init_script(FAKE_PEER)
    ctx.route('**/three.min.js', lambda r: r.fulfill(body=STUB, content_type='application/javascript'))
    ctx.route('**/peerjs.min.js', lambda r: r.fulfill(body='/* fake peer is injected */', content_type='application/javascript'))
    ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    H, G = ctx.new_page(), ctx.new_page()
    for n, pg in (('host', H), ('friend', G)):
        pg.on('pageerror', lambda e, n=n: errors.append(n + ' PAGEERROR: ' + str(e)))
        pg.on('console', lambda m, n=n: errors.append(n + ' CONSOLE: ' + m.text) if m.type == 'error' and 'Failed to load' not in m.text and 'ERR_' not in m.text else None)
        pg.goto(url); pg.wait_for_timeout(700)
    snap = lambda pg: pg.evaluate('(() => { const s = window.__game.ref.snapshot(); return { peers: s.coop.peers.length, on: s.coop.on, mons: s.monsters.map(m => m.id), wave: s.wave.n, floor: s.floor, down: s.coop.down, hp: s.player.hp, t: s.t }; })()')
    H.click('#coopBtn'); H.fill('#coopName', 'Hosty'); H.click('#coopHost'); H.wait_for_timeout(500)
    info = H.inner_text('#coopInfo'); m = re.search(r'ROOM CODE\s+([A-Z0-9]{5})', info)
    check('the host gets a 5 letter room code', bool(m))
    code = m.group(1) if m else 'AAAAA'
    G.click('#coopBtn'); G.fill('#coopName', 'Friendo'); G.fill('#coopCode', code.lower()); G.click('#coopJoin'); G.wait_for_timeout(900)
    check('the friend joins with the code (typed in small letters)', 'Joined room' in G.inner_text('#coopInfo'))
    check('the host sees who joined', 'Friendo' in H.inner_text('#coopInfo'))
    check('the friend can not enter before the host does', G.evaluate("document.getElementById('play').disabled"))
    H.evaluate("document.getElementById('play').click()"); H.wait_for_timeout(700)
    check('when the host enters, the friend is let in', not G.evaluate("document.getElementById('play').disabled"))
    G.evaluate("document.getElementById('play').click()"); G.wait_for_timeout(2500)
    a, c = snap(H), snap(G)
    check('both games are in co-op and see one friend each', a['on'] and c['on'] and a['peers'] == 1 and c['peers'] == 1)
    # a monster for the host appears on the friend's page too
    H.evaluate("(() => { const r = window.__game.ref, m = r.map.start; r.spawnAt('fiend', m.x + 6, m.z); })()"); H.wait_for_timeout(600)
    a, c = snap(H), snap(G)
    check('the friend sees the host\'s monsters', len(a['mons']) > 0 and sorted(a['mons']) == sorted(c['mons']))
    check('both are on the same wave and floor', a['wave'] == c['wave'] and a['floor'] == c['floor'])
    # the friend goes down, the host walks over and revives them
    G.evaluate("(() => { const r = window.__game.ref; r.setCfg({ regen: 0 }); r.setHp(1); })()")
    G.evaluate("window.__game.ref.place(window.__game.ref.map.start.x + 3, window.__game.ref.map.start.z, 0)"); G.wait_for_timeout(300)
    H.evaluate("(() => { const r = window.__game.ref, m = r.map.start; r.setCfg({ playerHp: 100 }); r.place(m.x - 10, m.z, 0); r.spawnAt('fiend', m.x + 3.2, m.z); })()"); 
    for _ in range(40):
        if snap(G)['down']: break
        G.wait_for_timeout(250)
    check('a friend with 1 health who is hit goes down (not game over)', snap(G)['down'] and not G.evaluate("!!window.__game.ref.snapshot().over"))
    check('the down message shows on the friend\'s screen', G.evaluate("!document.getElementById('downMsg').hidden"))
    H.evaluate("(() => { const r = window.__game.ref, s = r.snapshot(); r.clearWave(); })()")
    G.wait_for_timeout(300)
    fp = G.evaluate("(() => { const p = window.__game.ref.snapshot().player; return [p.x, p.z]; })()")
    H.evaluate("window.__game.ref.place(%f, %f, 0)" % (fp[0] + 1, fp[1])); 
    for _ in range(60):
        if not snap(G)['down']: break
        G.wait_for_timeout(250)
    check('a friend standing close brings them back up', not snap(G)['down'])
    check('no page errors on either side', not errors)
    for e in errors[:8]: print('   ', e)
    b.close()
srv.shutdown()
print('FAILED: ' + ', '.join(bad) if bad else 'all co-op smoke checks passed')
sys.exit(1 if bad else 0)
