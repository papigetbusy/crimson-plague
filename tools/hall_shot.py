"""Draws pictures of the hall the way the game does (same textures, same baked torch light, same fog), with no GPU.
Run: python3 tools/hall_shot.py out_dir [view ...]      views: corridor, hall, torch, banner, ceiling  (or x,z,yaw_degrees,pitch_degrees)
Writes out_dir/hall_<view>.png at phone-landscape size, nearest-neighbour doubled like the game's chunky look.
Torches and braziers are drawn as simple boxes plus glow here; the hall itself is the game's own bake."""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
PRESETS = {                     # x, z, yaw (deg, 0 = facing the hall), pitch (deg)
    'corridor': (21, 56.6, 0, 0), 'hall': (21, 20, 0, 0), 'torch': (21, 40, 90, 0),
    'banner': (21, 30, -90, 0), 'ceiling': (21, 36, 0, 40), 'carpet': (21, 14, 180, -10),
}
views = sys.argv[2:] or list(PRESETS)
dump = os.path.join(OUT, 'hall.json'); subprocess.check_call(['node', os.path.join(HERE, 'hall_shot.js'), dump] + (['safe'] if os.environ.get('SAFE') else []))
read = lambda p: open(os.path.join(ROOT, 'src', p)).read()
PAGE = """<canvas id=c width=650 height=300 style='width:1300px;height:600px;image-rendering:pixelated'></canvas><script>
const THREE = { CanvasTexture: function (c) { this.image = c; }, NearestFilter: 1, RepeatWrapping: 2 };
""" + read('screen/world_tex.js') + """
const D = @@DATA@@, FOG = [12 / 255, 4 / 255, 6 / 255], FOGFAR = 34, VIEWS = @@VIEWS@@;
const T = WorldTex.create(THREE), gl = document.getElementById('c').getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o); return o; };
const pr = gl.createProgram();
gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec3 p;attribute vec2 u;attribute vec3 c;uniform mat4 m;uniform mat4 v;varying vec2 vu;varying vec3 vc;varying float d;void main(){vec4 q=v*vec4(p,1.);d=-q.z;vu=u;vc=c;gl_Position=m*vec4(p,1.);}'));
gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, 'precision mediump float;uniform sampler2D t;uniform vec3 fog;uniform float far;uniform float nofog;varying vec2 vu;varying vec3 vc;varying float d;void main(){vec4 x=texture2D(t,vu);vec3 col=x.rgb*vc;float f=clamp((d-5.)/(far-5.),0.,1.)*(1.-nofog);gl_FragColor=vec4(mix(col,fog,f),nofog>.5?x.a:1.);}'));
gl.linkProgram(pr); gl.useProgram(pr);
const tex = (img) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); return t; };
const white = (() => { const c = document.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1, 1); return tex(c); })();
const glowT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,190,90,0.95)'); gr.addColorStop(0.35, 'rgba(255,120,40,0.35)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return tex(c); })();
const KEY = { stone: 'texStone', cloth: 'texCloth', panel: 'texPanel', pillar: 'texPillar', gold: 'texGold', floor: 'texFloor', floor2: 'texFloor2', floor3: 'texFloor3', floorEdge: 'texFloorEdge', carpet: 'texCarpet', ceil: 'texCeil' };
const buf = (a) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); return b; };
const draws = [];
for (const k in D.buckets) { const b = D.buckets[k]; draws.push({ t: tex(T[KEY[k]].image), p: buf(b.pos), u: buf(b.uv), c: buf(b.col), n: b.pos.length / 3 }); }
// torch props as plain coloured boxes, flame on top
function boxes(list) { const pos = [], uv = [], col = []; for (const [x0, y0, z0, x1, y1, z1, c] of list) { const f = (a, b, d, e, g, h, s) => { for (const q of [[a, b, d], [e, b, d], [e, g, h], [a, b, d], [e, g, h], [a, g, h]]) { }; }; const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]; for (const [a, b, d, e, s] of [[0, 1, 2, 3, 0.7], [5, 4, 7, 6, 0.7], [4, 0, 3, 7, 0.55], [1, 5, 6, 2, 0.85], [3, 2, 6, 7, 1], [4, 5, 1, 0, 0.4]]) for (const i of [a, b, d, a, d, e]) { pos.push(...P[i]); uv.push(0, 0); col.push(c[0] * s, c[1] * s, c[2] * s); } } return { p: buf(pos), u: buf(uv), c: buf(col), n: pos.length / 3 }; }
const props = [], flames = [];
for (const t of D.torches) {
  if (t.kind === 'brazier') { props.push([t.x - .275, 0, t.z - .275, t.x + .275, 1.2, t.z + .275, [.18, .1, .1]], [t.x - .42, 1.2, t.z - .42, t.x + .42, 1.36, t.z + .42, [.8, .62, .25]], [t.x - .35, 1.36, t.z - .35, t.x + .35, 1.66, t.z + .35, [.18, .1, .1]]); flames.push([t.x, t.y + .1, t.z, 1.6]); }
  else { const wx = t.x - t.nx * .28, wz = t.z - t.nz * .28; props.push([t.x - t.nx * .12 - .1, t.y - .63, t.z - t.nz * .12 - .1, t.x - t.nx * .12 + .1, t.y - .13, t.z - t.nz * .12 + .1, [.18, .1, .1]], [t.x - .17, t.y - .19, t.z - .17, t.x + .17, t.y - .09, t.z + .17, [.8, .62, .25]]); flames.push([t.x, t.y + .1, t.z, 1]); }
}
// traps as plain boxes: spike patches are a plate with thin steel spikes, vents a grate with a flame column
for (const t of (D.traps || [])) {
  const x0 = t.x * 2, z0 = t.z * 2, w = t.w * 2, h = t.h * 2;
  if (t.kind === 'vent') { props.push([x0 + .2, 0, z0 + .2, x0 + w - .2, .06, z0 + h - .2, [.08, .06, .06]]); flames.push([x0 + w / 2, .06, z0 + h / 2, 5], [x0 + w / 2, .5, z0 + h / 2, 4]); continue; }
  props.push([x0 + .05, 0, z0 + .05, x0 + w - .05, .05, z0 + h - .05, [.14, .06, .07]]);
  for (let ix = 0; ix < t.w * 2; ix++) for (let iz = 0; iz < t.h * 2; iz++) { const cx = x0 + (ix + .5) * 1, cz = z0 + (iz + .5) * 1, hh = t.kind === 'pulse' ? .3 : .62; props.push([cx - .07, .05, cz - .07, cx + .07, .05 + hh, cz + .07, (ix + iz) % 3 === 0 ? [.7, .12, .16] : [.66, .66, .72]]); }
}
const fl = []; for (const [x, y, z, s] of flames) { fl.push([x - .1 * s, y, z - .1 * s, x + .1 * s, y + .34 * s, z + .1 * s, [1, .54, .15]], [x - .055 * s, y + .02 * s, z - .055 * s, x + .055 * s, y + .24 * s, z + .055 * s, [1, .86, .48]]); }
const propsDraw = boxes(props), flameDraw = boxes(fl);
const mul = (a, b) => { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; };
function shot(V) {
  const [x, z, yawD, pitD] = V, yaw = -yawD * Math.PI / 180, pit = pitD * Math.PI / 180, ey = 1.7, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
  // camera rotation YXZ (as the game): R = Ry(yaw) * Rx(pitch); view = inverse
  const R = [cy, 0, -sy, 0, sy * sp, cp, cy * sp, 0, sy * cp, -sp, cy * cp, 0, 0, 0, 0, 1];     // columns: right, up, back
  const right = [R[0], R[1], R[2]], up = [R[4], R[5], R[6]], back = [R[8], R[9], R[10]], pos = [x, ey, z];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const view = [right[0], up[0], back[0], 0, right[1], up[1], back[1], 0, right[2], up[2], back[2], 0, -dot(right, pos), -dot(up, pos), -dot(back, pos), 1];
  const f = 1 / Math.tan(64 * Math.PI / 360), a = 650 / 300, n = .05, fa = 120, proj = [f / a, 0, 0, 0, 0, f, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0];
  gl.viewport(0, 0, 650, 300); gl.clearColor(FOG[0], FOG[1], FOG[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
  gl.uniformMatrix4fv(gl.getUniformLocation(pr, 'm'), false, mul(proj, view)); gl.uniformMatrix4fv(gl.getUniformLocation(pr, 'v'), false, view);
  gl.uniform3fv(gl.getUniformLocation(pr, 'fog'), FOG); gl.uniform1f(gl.getUniformLocation(pr, 'far'), FOGFAR);
  const L = (n) => gl.getAttribLocation(pr, n), bind = (d, tx, nofog) => { gl.uniform1f(gl.getUniformLocation(pr, 'nofog'), nofog ? 1 : 0); gl.bindTexture(gl.TEXTURE_2D, tx); for (const [nm, b, s] of [['p', d.p, 3], ['u', d.u, 2], ['c', d.c, 3]]) { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(L(nm)); gl.vertexAttribPointer(L(nm), s, gl.FLOAT, false, 0, 0); } gl.drawArrays(gl.TRIANGLES, 0, d.n); };
  for (const d of draws) bind(d, d.t, false);
  bind(propsDraw, white, false); bind(flameDraw, white, true);
  // glow sprites, additive, no depth write
  const sp2 = [], su = [], sc = []; for (const [fx, fy, fz, s] of flames) { const r = (s > 1 ? 1.6 : 1.05); for (const [qx, qy, ux, uy] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, -1, 0, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) { const cx = fx + (right[0] * qx + up[0] * qy) * r, cyy = fy + .15 + (right[1] * qx + up[1] * qy) * r, czz = fz + (right[2] * qx + up[2] * qy) * r; sp2.push(cx, cyy, czz); su.push(ux, uy); sc.push(1, 1, 1); } }
  const g = { p: buf(sp2), u: buf(su), c: buf(sc), n: sp2.length / 3 }; gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); bind(g, glowT, true); gl.disable(gl.BLEND); gl.depthMask(true);
}
window.shot = shot; window.VIEWS = VIEWS;
</script>""" 
views_json = json.dumps({v: (PRESETS[v] if v in PRESETS else [float(x) for x in v.split(',')]) for v in views})
with open(dump) as f: data = f.read()
html = PAGE.replace('@@DATA@@', data).replace('@@VIEWS@@', views_json)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1300, 'height': 600}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.set_content(html)
    if errs: print('page errors:', errs); sys.exit(1)
    for name, v in json.loads(views_json).items():
        pg.evaluate('shot(%s)' % json.dumps(v)); pg.locator('#c').screenshot(path=os.path.join(OUT, 'hall_%s.png' % name.replace(',', '_')))
    print('errors:', errs or 'none'); b.close()
