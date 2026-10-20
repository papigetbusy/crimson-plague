// Joins src/referee_data.js + src/referee.js + src/screen/*.js + src/screen.js + src/index.template.html into one playable page: site/index.html
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const label = process.argv[2] || 'local';
const cheat = process.argv.includes('--cheat');   // the private cheat build keeps the Effects and Gun menus; the published game never has them
const models = ['models/voxel.js', 'models/voxel_smooth.js', 'models/gothic_rifle_data.js', 'models/gothic_rifle.js', 'models/ember_profile.js', 'models/ember_rifle.js', 'models/revolver_data.js', 'models/revolver.js', 'models/gun_kit.js', 'models/guns_pistol.js', 'models/guns_smg.js', 'models/guns_shotgun.js', 'models/guns_sniper.js', 'models/guns_hmg.js', 'models/gun_catalog.js', 'models/horned_fiend_data.js', 'models/horned_fiend.js', 'models/bestiary_kit.js', 'models/horned_fiend_v2.js', 'models/bone_hound.js', 'models/bone_hound_v2.js', 'models/rock_golem.js', 'models/demon_lord.js', 'models/demon_lord_data.js', 'models/demon_lord_v2.js', 'models/goblin.js', 'models/skeleton.js', 'models/mushroom.js', 'models/eyeball.js', 'models/flame_spirit.js'].map(read).join('\n');
const html = read('index.template.html')
  .replace('/*__REFEREE__*/', () => read('referee_data.js') + '\n' + read('floorgen.js') + '\n' + read('referee_shots.js') + '\n' + read('referee_classes.js') + '\n' + read('referee_class.js') + '\n' + read('referee_affixes.js') + '\n' + read('referee_stash.js') + '\n' + read('referee_mods.js') + '\n' + read('referee_weapons.js') + '\n' + read('referee_gear.js') + '\n' + read('referee_gunfx.js') + '\n' + read('referee.js'))
  .replace('/*__MODELS__*/', () => models)
  .replace('/*__SCREEN__*/', () => 'const CHEATS = ' + cheat + ';\n' + ['screen/world_tex.js', 'screen/world_bake.js', 'screen/world_view.js', 'screen/minimap.js', 'screen/compass.js', 'screen/monster_rigs.js', 'screen/shots_view.js', 'screen/loot_view.js', 'screen/trap_view.js', 'screen/hud.js', 'screen/gun_card.js', 'screen/menu_focus.js', 'screen/stash_menu.js', 'screen/gear_menu.js', 'screen/blueprints.js', 'screen/saves.js', 'screen/codex_text.js', 'screen/codex_pages.js', 'screen/codex.js', 'screen/pad_input.js', 'screen/touch_layout.js', ...(fs.existsSync(path.join(root, 'src', 'screen', 'fx_data.js')) ? ['screen/fx_data.js'] : []), 'screen/fx_plan.js', 'screen/fx_sprites.js', 'screen/fx_picker.js', ...(fs.existsSync(path.join(root, 'src', 'screen', 'wall_data.js')) ? ['screen/wall_data.js'] : []), 'screen/wall_skin.js', 'screen/gun_skins.js', 'screen/gun_look.js', 'screen/gun_list.js', 'screen/gun_skin_picker.js', 'screen/gun_motion.js', 'screen.js'].map(read).join('\n'))
  .replace(/__BUILD__/g, label)
  .replace('<title>Crimson Plague</title>', cheat ? '<title>Crimson Plague CHEAT BUILD</title>' : '<title>Crimson Plague</title>')
  .replace('<h1>Crimson Plague</h1>', cheat ? '<h1>Crimson Plague</h1><p class="cheatTag">CHEAT BUILD (private testing)</p>' : '<h1>Crimson Plague</h1>');
const out = cheat ? 'cheat' : 'site';      // cheat/ is git-ignored and never published
fs.mkdirSync(path.join(root, out), { recursive: true });
fs.writeFileSync(path.join(root, out, 'index.html'), html);
// models Grok delivered are served next to the page
const src = path.join(root, 'assets'), dst = path.join(root, out, 'assets');
if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true });
console.log(out + '/index.html', (html.length / 1024).toFixed(0) + ' KB');
