/* Player skins: seven detailed looks for how you and your friends appear to each other in a room. Look only (no rules): the referee just carries the skin id.
   Each skin is a few dozen chunky boxes, built in the same spirit as the guns: a strong silhouette first, then armour plates, trim, straps and a glowing part or two.
   Body space: y is up, -z is forward (the gun is held out in front), x is to the right. A person is about 2 units tall. */
const SkinsLook = (function () {
  const LIST = [
    { id: 'plague',  name: 'Plague Doctor',   blurb: 'Beaked mask, long coat, vials', tone: '#3a2f28', glow: '#7cff5a' },
    { id: 'crimson', name: 'Crimson Knight',  blurb: 'Red steel plate, plume and cape', tone: '#b8323c', glow: '#d9b24a' },
    { id: 'reaper',  name: 'Bone Reaper',     blurb: 'Ribcage armour, horned skull helm', tone: '#e8e2cc', glow: '#ff7a1a' },
    { id: 'ember',   name: 'Ember Warlord',   blurb: 'Charred plate with glowing lava cracks', tone: '#3a2e2a', glow: '#ff7a1a' },
    { id: 'frost',   name: 'Frost Warden',    blurb: 'Ice crystal armour and a fur mantle', tone: '#7ab0dc', glow: '#bff0ff' },
    { id: 'duelist', name: 'Gilded Duelist',  blurb: 'Tricorn hat, gold buttons, mask', tone: '#1c1c26', glow: '#e0b84a' },
    { id: 'void',    name: 'Void Stalker',    blurb: 'Shadow suit with violet glowing seams', tone: '#201a30', glow: '#8a4aff' }
  ];
  const IDS = LIST.map((s) => s.id);
  const valid = (id) => IDS.indexOf(id) >= 0;
  // a skin id from anything (an old save, a typo, nothing): never fails, falls back by slot
  const pick = (id, slot) => (valid(id) ? id : IDS[Math.abs(slot | 0) % IDS.length]);
  const random = (rng) => IDS[Math.floor((rng || Math.random)() * IDS.length) % IDS.length];

  // THREE is given so the same code builds in the game and in the picture tool
  function create(THREE) {
    const lam = {}, basic = {};
    const M = (c) => lam[c] || (lam[c] = new THREE.MeshLambertMaterial({ color: c }));
    const G = (c) => basic[c] || (basic[c] = new THREE.MeshBasicMaterial({ color: c }));
    function builder(body) {
      const b = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); body.add(m); return m; };
      const g = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), G(c)); m.position.set(x, y, z); body.add(m); return m; };
      // the shared frame: boots and legs, torso, a head, the gun arm out front and the other arm across
      const frame = (o) => {
        for (const s of [-1, 1]) {
          b(0.2, 0.52, 0.24, o.leg, 0.15 * s, 0.5, 0); b(0.22, 0.2, 0.28, o.boot, 0.15 * s, 0.1, -0.02); b(0.22, 0.06, 0.3, o.trim || o.boot, 0.15 * s, 0.22, -0.02);
        }
        b(0.56, 0.8, 0.3, o.torso, 0, 1.15, 0);
        b(0.34, 0.34, 0.34, o.skin, 0, 1.72, 0);
        b(0.18, 0.18, 0.5, o.arm, 0.36, 1.2, -0.22); b(0.19, 0.19, 0.1, o.glove, 0.36, 1.2, -0.5);       // gun arm and its glove
        b(0.18, 0.5, 0.18, o.arm, -0.36, 1.2, -0.02); b(0.19, 0.12, 0.2, o.glove, -0.36, 0.9, -0.02);    // the other arm
      };
      return { b, g, frame };
    }

    const SKIN = {
      // ---- 1 Plague Doctor: dark leather, a long beak, green lenses, a brass-buckled coat, vials on the belt
      plague(body) {
        const { b, g, frame } = builder(body);
        const coat = 0x3a2f28, dark = 0x241c18, leather = 0x6a4e34, brass = 0xd0a84a, bone = 0xd4c8a8;
        frame({ leg: dark, boot: 0x15110f, trim: brass, torso: coat, arm: coat, glove: leather, skin: bone });
        b(0.68, 0.5, 0.42, coat, 0, 0.62, 0); b(0.72, 0.16, 0.46, dark, 0, 0.36, 0);                                  // the long coat skirt and its hem
        b(0.64, 0.08, 0.38, leather, 0, 0.9, 0); b(0.14, 0.12, 0.06, brass, 0, 0.9, -0.2);                            // belt and buckle
        b(0.14, 0.7, 0.04, leather, -0.2, 1.1, -0.17); b(0.14, 0.7, 0.04, leather, 0.2, 1.1, -0.17);                // crossed leather straps
        for (let i = 0; i < 3; i++) b(0.09, 0.09, 0.05, brass, 0, 1.34 - i * 0.2, -0.2);                           // brass buttons
        b(0.78, 0.12, 0.44, dark, 0, 1.55, 0); b(0.6, 0.14, 0.38, coat, 0, 1.46, 0); b(0.2, 0.18, 0.2, leather, 0.42, 1.52, 0); b(0.2, 0.18, 0.2, leather, -0.42, 1.52, 0);   // a high collar and leather shoulder caps
        b(0.12, 0.2, 0.12, 0x3aaa5a, -0.34, 0.82, -0.2); b(0.1, 0.06, 0.1, brass, -0.34, 0.94, -0.2); b(0.12, 0.2, 0.12, 0xaa3a3a, 0.34, 0.82, -0.2); b(0.1, 0.06, 0.1, brass, 0.34, 0.94, -0.2);   // two corked vials on the belt
        b(0.34, 0.4, 0.34, bone, 0, 1.74, 0); b(0.18, 0.18, 0.3, bone, 0, 1.68, -0.28); b(0.14, 0.14, 0.26, bone, 0, 1.6, -0.5); b(0.1, 0.1, 0.2, 0xb8aa88, 0, 1.52, -0.68);   // a pale mask with a long curved beak
        b(0.08, 0.06, 0.4, leather, 0, 1.78, -0.3);                                                                   // a strap across the beak
        g(0.12, 0.12, 0.05, 0x7cff5a, -0.1, 1.8, -0.18); g(0.12, 0.12, 0.05, 0x7cff5a, 0.1, 1.8, -0.18);               // glowing green lenses
        b(0.36, 0.08, 0.06, brass, 0, 1.86, -0.18);                                                                   // a brass brow rim
        b(0.8, 0.06, 0.8, 0x1c1612, 0, 1.94, 0); b(0.42, 0.26, 0.42, 0x1c1612, 0, 2.08, 0); b(0.46, 0.06, 0.46, brass, 0, 1.99, 0);   // a wide-brim hat with a brass band
        b(0.5, 0.74, 0.06, dark, 0, 1.0, 0.2);                                                                        // a short back cloak
      },
      // ---- 2 Crimson Knight: red-lacquered steel plate, gold trim, a plume, a tabard with a gold cross, a flowing cape
      crimson(body) {
        const { b, g, frame } = builder(body);
        frame({ leg: 0x7a1c22, boot: 0x3a0e12, trim: 0xd9b24a, torso: 0x9a2630, arm: 0x7a1c22, glove: 0xc8c8d0, skin: 0x7a7a86 });
        b(0.64, 0.44, 0.38, 0xb8323c, 0, 1.3, 0); b(0.5, 0.08, 0.4, 0xd9b24a, 0, 1.52, 0); b(0.5, 0.08, 0.4, 0xd9b24a, 0, 1.06, 0);   // a bold breastplate with gold edges
        b(0.16, 0.7, 0.04, 0xe8e0d0, 0, 0.98, -0.2); b(0.46, 0.14, 0.04, 0xd9b24a, 0, 1.3, -0.21); b(0.12, 0.54, 0.05, 0xd9b24a, 0, 1.2, -0.22);   // a tabard with a gold cross
        b(0.34, 0.3, 0.34, 0xb8323c, -0.46, 1.5, 0); b(0.34, 0.3, 0.34, 0xb8323c, 0.46, 1.5, -0.02); b(0.36, 0.06, 0.36, 0xd9b24a, -0.46, 1.66, 0); b(0.36, 0.06, 0.36, 0xd9b24a, 0.46, 1.66, -0.02);   // domed pauldrons
        b(0.24, 0.14, 0.26, 0xb8323c, 0.15, 0.62, -0.04); b(0.24, 0.14, 0.26, 0xb8323c, -0.15, 0.62, -0.04);        // knee guards
        b(0.4, 0.4, 0.4, 0x8a8a94, 0, 1.74, 0); b(0.42, 0.12, 0.42, 0xb8323c, 0, 1.96, 0); b(0.3, 0.06, 0.04, 0x15080a, 0, 1.76, -0.21); g(0.22, 0.03, 0.02, 0xff5a3a, 0, 1.76, -0.215);   // a closed helm with a glowing visor slit
        b(0.08, 0.1, 0.4, 0xd9b24a, 0, 2.06, 0); b(0.12, 0.3, 0.12, 0xe23a42, 0, 2.2, 0.06); b(0.1, 0.24, 0.1, 0xe23a42, 0, 2.28, 0.18);   // a gold crest and a swept plume
        b(0.6, 1.1, 0.05, 0x7a1c22, 0, 1.0, 0.22); b(0.64, 0.12, 0.07, 0xd9b24a, 0, 1.56, 0.2); b(0.5, 0.3, 0.05, 0x5a1218, 0, 0.36, 0.24);   // a long cape with a gold collar and a dark hem
      },
      // ---- 3 Bone Reaper: black robe, a white ribcage plate, a horned skull helm with burning eyes, spiked shoulders
      reaper(body) {
        const { b, g, frame } = builder(body);
        frame({ leg: 0x14121a, boot: 0x0c0a10, trim: 0xd8d2bc, torso: 0x1c1a24, arm: 0x1c1a24, glove: 0xd8d2bc, skin: 0xe8e2cc });
        b(0.62, 0.5, 0.4, 0x1c1a24, 0, 0.6, 0); b(0.5, 0.1, 0.36, 0x0c0a10, 0, 0.34, 0);                             // a ragged robe skirt
        for (let i = 0; i < 4; i++) { b(0.46, 0.06, 0.06, 0xe8e2cc, 0, 1.46 - i * 0.14, -0.19); b(0.06, 0.1, 0.05, 0xd8d2bc, 0, 1.4 - i * 0.14, -0.2); }   // a ribcage worn as armour
        b(0.06, 0.62, 0.06, 0xe8e2cc, 0, 1.2, -0.2);                                                                 // the breastbone
        for (const s of [-1, 1]) { b(0.32, 0.12, 0.32, 0xd8d2bc, 0.44 * s, 1.56, 0); b(0.08, 0.3, 0.08, 0xe8e2cc, 0.5 * s, 1.78, 0); b(0.06, 0.2, 0.06, 0xe8e2cc, 0.54 * s, 1.98, 0); }   // bone-spike shoulders
        b(0.4, 0.38, 0.38, 0xe8e2cc, 0, 1.74, 0); b(0.3, 0.1, 0.2, 0xe8e2cc, 0, 1.56, -0.12);                         // a skull helm and jaw
        b(0.12, 0.12, 0.05, 0x0c0a10, -0.1, 1.76, -0.2); b(0.12, 0.12, 0.05, 0x0c0a10, 0.1, 1.76, -0.2);              // eye sockets
        g(0.06, 0.06, 0.03, 0xff7a1a, -0.1, 1.76, -0.215); g(0.06, 0.06, 0.03, 0xff7a1a, 0.1, 1.76, -0.215);          // burning eyes
        b(0.06, 0.1, 0.05, 0x0c0a10, 0, 1.66, -0.2);
        for (const s of [-1, 1]) { b(0.08, 0.34, 0.08, 0xd8d2bc, 0.26 * s, 2.04, 0); b(0.07, 0.3, 0.07, 0xd8d2bc, 0.36 * s, 2.3, 0); b(0.06, 0.22, 0.06, 0xe8e2cc, 0.3 * s, 2.5, 0); }   // two big curved horns
        b(0.5, 0.9, 0.05, 0x0c0a10, 0, 1.0, 0.2); b(0.34, 0.3, 0.05, 0x14121a, 0, 0.44, 0.22);                       // a tattered cloak
      },
      // ---- 4 Ember Warlord: charred black plate, lava cracks that glow, a flame crest, a burning core in the chest
      ember(body) {
        const { b, g, frame } = builder(body);
        frame({ leg: 0x1e1816, boot: 0x120e0c, trim: 0xff7a1a, torso: 0x2a2220, arm: 0x2a2220, glove: 0x120e0c, skin: 0x2a2220 });
        b(0.62, 0.54, 0.38, 0x3a2e2a, 0, 1.28, 0); b(0.4, 0.4, 0.04, 0x15100e, 0, 1.28, -0.2); g(0.22, 0.22, 0.04, 0xff8a2a, 0, 1.3, -0.23); g(0.1, 0.1, 0.05, 0xffe08a, 0, 1.3, -0.25);   // a chest plate with a burning core
        for (const [x, y, w, h] of [[-0.2, 1.52, 0.05, 0.22], [0.22, 1.1, 0.05, 0.26], [-0.22, 1.02, 0.18, 0.04], [0.2, 1.46, 0.16, 0.04]]) g(w, h, 0.04, 0xff5a1a, x, y, -0.21);   // lava cracks across the plate
        b(0.34, 0.34, 0.36, 0x3a2e2a, -0.46, 1.52, 0); b(0.34, 0.34, 0.36, 0x3a2e2a, 0.46, 1.52, 0); g(0.36, 0.05, 0.38, 0xff7a1a, -0.46, 1.7, 0); g(0.36, 0.05, 0.38, 0xff7a1a, 0.46, 1.7, 0);   // heavy pauldrons with glowing edges
        b(0.1, 0.34, 0.1, 0x3a2e2a, -0.5, 1.9, 0); b(0.1, 0.34, 0.1, 0x3a2e2a, 0.5, 1.9, 0);                         // spikes
        b(0.2, 0.12, 0.26, 0x3a2e2a, 0.15, 0.62, -0.05); b(0.2, 0.12, 0.26, 0x3a2e2a, -0.15, 0.62, -0.05); g(0.2, 0.03, 0.26, 0xff7a1a, 0.15, 0.7, -0.05); g(0.2, 0.03, 0.26, 0xff7a1a, -0.15, 0.7, -0.05);   // glowing knee bands
        b(0.4, 0.38, 0.4, 0x3a2e2a, 0, 1.74, 0); b(0.28, 0.06, 0.04, 0x0c0808, 0, 1.76, -0.21); g(0.2, 0.04, 0.02, 0xffb03a, 0, 1.76, -0.215); b(0.16, 0.14, 0.04, 0x15100e, 0, 1.62, -0.2);   // a horned helm with a hot visor
        b(0.08, 0.3, 0.08, 0x3a2e2a, -0.24, 2.0, 0); b(0.08, 0.3, 0.08, 0x3a2e2a, 0.24, 2.0, 0);
        g(0.12, 0.22, 0.12, 0xff5a1a, 0, 2.06, 0.06); g(0.1, 0.24, 0.1, 0xff8a2a, 0, 2.22, 0.02); g(0.08, 0.18, 0.08, 0xffd05a, 0.02, 2.4, 0.0);   // a crest of flame
        b(0.52, 0.8, 0.05, 0x15100e, 0, 1.0, 0.2); g(0.4, 0.05, 0.05, 0xff5a1a, 0, 0.62, 0.23);                      // a scorched cloak with an ember hem
      },
      // ---- 5 Frost Warden: pale blue plate, white fur mantle, glowing ice crystal pauldrons, a crown of ice
      frost(body) {
        const { b, g, frame } = builder(body);
        frame({ leg: 0x3a5a7a, boot: 0x24384c, trim: 0xe8f4ff, torso: 0x4a78a8, arm: 0x3a5a7a, glove: 0xe8f4ff, skin: 0xb8d8ec });
        b(0.62, 0.5, 0.38, 0x7ab0dc, 0, 1.3, 0); b(0.5, 0.08, 0.4, 0xe8f4ff, 0, 1.06, 0); b(0.4, 0.4, 0.04, 0x4a78a8, 0, 1.3, -0.2); g(0.1, 0.3, 0.04, 0xbff0ff, 0, 1.3, -0.23); g(0.26, 0.08, 0.04, 0xbff0ff, 0, 1.3, -0.23);   // a plate with a glowing ice rune
        b(0.8, 0.22, 0.46, 0xf4f8ff, 0, 1.58, 0); b(0.7, 0.12, 0.5, 0xdce8f4, 0, 1.5, 0); b(0.18, 0.2, 0.16, 0xf4f8ff, 0.42, 1.44, 0); b(0.18, 0.2, 0.16, 0xf4f8ff, -0.42, 1.44, 0);   // a thick white fur mantle
        for (const s of [-1, 1]) { g(0.14, 0.42, 0.14, 0x9fe8ff, 0.5 * s, 1.84, 0); g(0.1, 0.3, 0.1, 0xcff4ff, 0.58 * s, 2.06, 0.02); g(0.08, 0.24, 0.08, 0x9fe8ff, 0.42 * s, 2.0, -0.08); }   // ice crystals growing from the shoulders
        b(0.4, 0.4, 0.4, 0x8ab8dc, 0, 1.74, 0); b(0.28, 0.06, 0.04, 0x15283a, 0, 1.76, -0.21); g(0.07, 0.05, 0.03, 0xdff8ff, -0.08, 1.77, -0.215); g(0.07, 0.05, 0.03, 0xdff8ff, 0.08, 1.77, -0.215);   // a frosted helm and pale eyes
        for (let i = -2; i <= 2; i++) g(0.07, 0.22 + (2 - Math.abs(i)) * 0.1, 0.07, 0xbff0ff, i * 0.09, 2.04 + (2 - Math.abs(i)) * 0.05, 0.0);   // a crown of ice spikes
        b(0.5, 0.75, 0.05, 0xdce8f4, 0, 1.0, 0.2); b(0.54, 0.14, 0.06, 0xf4f8ff, 0, 1.5, 0.22);                      // a pale cloak with a fur edge
        b(0.22, 0.12, 0.28, 0x7ab0dc, 0.15, 0.62, -0.05); b(0.22, 0.12, 0.28, 0x7ab0dc, -0.15, 0.62, -0.05);
      },
      // ---- 6 Gilded Duelist: a black and gold coat, a tricorn hat with a feather, a half mask, a cravat and a sash
      duelist(body) {
        const { b, g, frame } = builder(body);
        frame({ leg: 0x14141c, boot: 0x2a1a10, trim: 0xe0b84a, torso: 0x1c1c26, arm: 0x1c1c26, glove: 0xf0e8d8, skin: 0xe0c4a8 });
        b(0.62, 0.46, 0.4, 0x1c1c26, 0, 0.62, 0); b(0.5, 0.2, 0.36, 0x1c1c26, 0, 0.4, 0.04); b(0.66, 0.05, 0.42, 0xe0b84a, 0, 0.34, 0);   // coat tails with gold trim
        b(0.6, 0.12, 0.34, 0xe0b84a, 0, 1.54, 0); b(0.2, 0.52, 0.04, 0x8a1a2a, 0.04, 1.2, -0.2); b(0.62, 0.1, 0.05, 0x8a1a2a, 0, 0.94, -0.2);   // a gold-edged collar and a red sash
        for (let i = 0; i < 4; i++) { g(0.06, 0.06, 0.04, 0xffd86a, -0.14, 1.48 - i * 0.16, -0.19); g(0.06, 0.06, 0.04, 0xffd86a, 0.14, 1.48 - i * 0.16, -0.19); }   // two rows of gold buttons
        b(0.26, 0.14, 0.12, 0xf8f4ec, 0, 1.52, -0.18);                                                               // a white cravat
        b(0.12, 0.14, 0.34, 0xe0b84a, 0.36, 1.34, -0.2);                                                             // a gold cuff
        b(0.34, 0.1, 0.06, 0x0c0c12, 0, 1.76, -0.18); g(0.06, 0.04, 0.03, 0xffffff, -0.08, 1.76, -0.215); g(0.06, 0.04, 0.03, 0xffffff, 0.08, 1.76, -0.215);   // a half mask over bright eyes
        b(0.78, 0.07, 0.78, 0x14141c, 0, 1.94, 0); b(0.4, 0.2, 0.4, 0x14141c, 0, 2.06, 0);                           // the tricorn hat
        b(0.8, 0.06, 0.08, 0xe0b84a, 0, 1.97, -0.38); b(0.08, 0.06, 0.8, 0xe0b84a, 0.38, 1.97, 0); b(0.08, 0.06, 0.8, 0xe0b84a, -0.38, 1.97, 0);   // gold hat edging
        b(0.06, 0.34, 0.14, 0xc83a4a, -0.3, 2.2, 0.1); b(0.06, 0.26, 0.12, 0xe85a6a, -0.34, 2.4, 0.18);              // a long red feather
        b(0.5, 0.74, 0.05, 0x1c1c26, 0, 0.94, 0.2); b(0.4, 0.06, 0.06, 0xe0b84a, 0, 0.58, 0.22);
      },
      // ---- 7 Void Stalker: matte black stealth suit, violet glowing seams and visor, floating shard pauldrons, a long scarf
      void(body) {
        const { b, g, frame } = builder(body);
        frame({ leg: 0x14101e, boot: 0x0a0812, trim: 0x8a4aff, torso: 0x1a1428, arm: 0x1a1428, glove: 0x0a0812, skin: 0x14101e });
        b(0.58, 0.82, 0.32, 0x201a30, 0, 1.15, 0);
        g(0.05, 0.7, 0.04, 0x8a4aff, 0, 1.15, -0.17); g(0.4, 0.05, 0.04, 0x8a4aff, 0, 1.4, -0.17); g(0.3, 0.04, 0.04, 0x6a2aef, 0, 0.9, -0.17);     // glowing seams on the chest
        g(0.04, 0.5, 0.04, 0x8a4aff, -0.2, 0.5, -0.12); g(0.04, 0.5, 0.04, 0x8a4aff, 0.2, 0.5, -0.12); g(0.04, 0.4, 0.04, 0x6a2aef, 0.36, 1.2, -0.3);   // along the legs and the gun arm
        for (const s of [-1, 1]) { b(0.2, 0.34, 0.14, 0x2a2240, 0.52 * s, 1.74, 0); b(0.16, 0.26, 0.12, 0x2a2240, 0.6 * s, 1.98, 0.02); g(0.06, 0.2, 0.06, 0x8a4aff, 0.54 * s, 1.82, -0.06); }   // floating shards above the shoulders
        b(0.36, 0.38, 0.36, 0x1a1428, 0, 1.74, 0); b(0.4, 0.2, 0.4, 0x14101e, 0, 1.86, 0.04); b(0.34, 0.5, 0.1, 0x14101e, 0, 1.6, 0.2);             // a deep hood
        g(0.3, 0.07, 0.04, 0xb07aff, 0, 1.76, -0.19); g(0.1, 0.1, 0.04, 0xffffff, -0.08, 1.76, -0.2); g(0.1, 0.1, 0.04, 0xffffff, 0.08, 1.76, -0.2);   // a glowing visor
        b(0.5, 0.12, 0.34, 0x201a30, 0, 1.54, 0); b(0.12, 0.1, 0.3, 0x201a30, 0, 1.6, -0.12);                       // a mask scarf
        b(0.14, 0.8, 0.05, 0x2a2240, -0.18, 1.0, 0.22); b(0.12, 0.6, 0.05, 0x201a30, -0.28, 0.9, 0.26); b(0.1, 0.4, 0.05, 0x2a2240, -0.34, 0.8, 0.3);   // a long streaming scarf
        b(0.5, 0.7, 0.05, 0x14101e, 0.04, 1.0, 0.2);
      }
    };
    // build a person's body into the group; unknown ids fall back to the slot's own skin
    function build(id, body, slot) { (SKIN[pick(id, slot)])(body); }
    return { build };
  }
  return { LIST, IDS, valid, pick, random, create };
})();
if (typeof module !== 'undefined') module.exports = SkinsLook;
