// Joins src/referee.js + src/screen.js + src/index.template.html into one playable page: site/index.html
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const label = process.argv[2] || 'local';
const models = ['models/voxel.js', 'models/gothic_rifle.js', 'models/horned_fiend.js'].map(read).join('\n');
const html = read('index.template.html')
  .replace('/*__REFEREE__*/', () => read('referee.js'))
  .replace('/*__MODELS__*/', () => models)
  .replace('/*__SCREEN__*/', () => read('screen.js'))
  .replace(/__BUILD__/g, label);
fs.mkdirSync(path.join(root, 'site'), { recursive: true });
fs.writeFileSync(path.join(root, 'site', 'index.html'), html);
// models Grok delivered are served next to the page
const src = path.join(root, 'assets'), dst = path.join(root, 'site', 'assets');
if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true });
console.log('site/index.html', (html.length / 1024).toFixed(0) + ' KB');
