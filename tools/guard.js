// Keeps the split honest. Fails if:
//  - referee.js touches the browser, clock, network, files or unseeded random
//  - screen.js decides rules (it must not import or mutate referee state)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let bad = 0;
const fail = m => { console.log('GUARD FAIL: ' + m); bad++; };
const ref = ['src/referee.js', 'src/referee_data.js'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
for (const [re, why] of [[/Math\.random/, 'unseeded random'], [/Date\.now|performance\.now|new Date/, 'clock'],
  [/\bdocument\b|\bwindow\b|\blocalStorage\b/, 'browser'], [/\bfetch\b|XMLHttpRequest|WebSocket/, 'network'], [/require\(['"]fs['"]\)/, 'files']])
  if (re.test(ref)) fail('referee code uses ' + why);
console.log(bad ? 'guard: ' + bad + ' problem(s)' : 'guard: ok');
process.exit(bad ? 1 : 0);
