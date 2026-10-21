// Draws catalog guns as one picture each (side + three-quarter), no GPU. usage: node tools/gun_sheet.js out.png ext cy id [id ...]
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const [out, ext, cy, ...ids] = process.argv.slice(2), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-')), pngs = [];
for (const id of ids) {
  const j = path.join(tmp, id + '.json'); execFileSync('node', [path.join(__dirname, 'preview_models.js'), 'gun:' + id, j], { env: Object.assign({}, process.env, { HANDS: '0' }) });
  for (const v of ['side', 'three']) { const p = path.join(tmp, id + '_' + v + '.png'); execFileSync('python3', ['-I', path.join(__dirname, 'preview_models.py'), j, p, v, ext, cy]); pngs.push(p); }
}
execFileSync('python3', ['-I', '-c', 'import sys\nfrom PIL import Image, ImageDraw\nout=sys.argv[1]; ps=sys.argv[2:]; ims=[Image.open(p).crop((100,70,900,630)) for p in ps]\nw,h=ims[0].size; sh=Image.new("RGB",(w*2,h*(len(ims)//2)),(40,40,44))\nfor i,im in enumerate(ims): sh.paste(im,((i%2)*w,(i//2)*h))\nsh.save(out)', out, ...pngs]);
