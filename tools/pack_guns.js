// Writes src/models/guns_packed_data.js: the side-view profiles of the 20 catalog guns, flattened from the CC0 pack models.
// usage: node tools/pack_guns.js <Quaternius OBJ dir>        (the pack lives outside the repo; only these small profiles are committed)
const fs = require('fs'), path = require('path'), M = require('./mesh_to_gun.js');
// key: [pack model file, length in voxels]
const SOURCES = {
  Pistol_2: 40, Revolver_3: 44, Pistol_5: 40, Revolver_5: 52,
  SubmachineGun_4: 70, SubmachineGun_3: 84, Bullpup_2: 90, SubmachineGun_5: 104,
  Shotgun_3: 118, Shotgun_SawedOff: 84, Shotgun_1: 112, Shotgun_ShortStock: 96,
  SniperRifle_6: 160, SniperRifle_5: 150, SniperRifle_3: 158, SniperRifle_1: 156,
  AssaultRifle2_1: 120, Bullpup_1: 118, AssaultRifle_5: 122, AssaultRifle2_2: 116,
};
const dir = process.argv[2], out = {};
for (const k in SOURCES) out[k] = M.pack(M.convert(path.join(dir, k + '.obj'), SOURCES[k], false));
const lines = Object.keys(out).map((k) => '  ' + k + ': [' + out[k].join(',') + '],');
fs.writeFileSync(path.join(__dirname, '../src/models/guns_packed_data.js'),
  '/* Side-view profiles of the pack guns (CC0: Quaternius Ultimate Gun Pack). Made by tools/pack_guns.js, do not edit by hand.\n   Each gun is rows of [y, z start, run length, half width, colour role] (z = 0 is the muzzle). */\nconst GunsPackedData = {\n' + lines.join('\n') + '\n};\nif (typeof module !== \'undefined\') module.exports = GunsPackedData;\n');
console.log('wrote', Object.keys(out).length, 'guns');
