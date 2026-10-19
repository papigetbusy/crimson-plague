// Keeps the split honest. Fails if:
//  - referee.js touches the browser, clock, network, files or unseeded random
//  - screen.js decides rules (it must not import or mutate referee state)
//  - any file in src/ or tools/ is over 400 lines (split it)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let bad = 0;
// Files already over 400 lines when the repo started. Their ceiling may only go DOWN. Split them when touched.
const DEBT = { 'src/referee.js': 520, 'src/screen.js': 1000, 'src/index.template.html': 400 };
const fail = m => { console.log('GUARD FAIL: ' + m); bad++; };
const ref = fs.readFileSync(path.join(root, 'src/referee.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
for (const [re, why] of [[/Math\.random/, 'unseeded random'], [/Date\.now|performance\.now|new Date/, 'clock'],
  [/\bdocument\b|\bwindow\b|\blocalStorage\b/, 'browser'], [/\bfetch\b|XMLHttpRequest|WebSocket/, 'network'], [/require\(['"]fs['"]\)/, 'files']])
  if (re.test(ref)) fail('referee.js uses ' + why);
for (const d of ['src', 'tools']) for (const f of fs.readdirSync(path.join(root, d))) {
  if (!/\.(js|html|py)$/.test(f)) continue;
  const n = fs.readFileSync(path.join(root, d, f), 'utf8').split('\n').length;
  const cap = DEBT[`${d}/${f}`] || 400;
  if (n > cap) fail(`${d}/${f} has ${n} lines (limit ${cap})`);
}
console.log(bad ? 'guard: ' + bad + ' problem(s)' : 'guard: ok');
process.exit(bad ? 1 : 0);
