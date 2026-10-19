// Joins src/referee_data.js + src/referee.js + src/screen/*.js + src/screen.js + src/index.template.html into one playable page: site/index.html
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const label = process.argv[2] || 'local';
const models = ['models/voxel.js', 'models/gothic_rifle_data.js', 'models/gothic_rifle.js', 'models/horned_fiend_data.js', 'models/horned_fiend.js', 'models/bestiary_kit.js', 'models/horned_fiend_v2.js', 'models/bone_hound.js', 'models/bone_hound_v2.js', 'models/rock_golem.js', 'models/demon_lord.js'].map(read).join('\n');
const html = read('index.template.html')
  .replace('/*__REFEREE__*/', () => read('referee_data.js') + '\n' + read('referee.js'))
  .replace('/*__MODELS__*/', () => models)
  .replace('/*__SCREEN__*/', () => ['screen/monster_rigs.js', 'screen/loot_view.js', 'screen/hud.js', 'screen/pad_input.js', 'screen/touch_layout.js', ...(fs.existsSync(path.join(root, 'src', 'screen', 'fx_data.js')) ? ['screen/fx_data.js'] : []), 'screen/fx_plan.js', 'screen/fx_sprites.js', 'screen/fx_picker.js', ...(fs.existsSync(path.join(root, 'src', 'screen', 'wall_data.js')) ? ['screen/wall_data.js'] : []), 'screen/wall_skin.js', 'screen.js'].map(read).join('\n'))
  .replace(/__BUILD__/g, label);
fs.mkdirSync(path.join(root, 'site'), { recursive: true });
fs.writeFileSync(path.join(root, 'site', 'index.html'), html);
// models Grok delivered are served next to the page
const src = path.join(root, 'assets'), dst = path.join(root, 'site', 'assets');
if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true });
console.log('site/index.html', (html.length / 1024).toFixed(0) + ' KB');
