/* Gun skins: look-only paint jobs for the rifle (colours, shine, glow behaviour). The rifle's shape never changes.
   recolor() turns the red and orange of Grok's rifle into the skin's colours and leaves the dark metal dark (tinted).
   Pure data and maths, no THREE: runs in node tests and in the screen. */
const GunSkins = (function () {
  // hue = degrees for the coloured plates, sat/val scale them, metal = tint for the dark metal, glow = glow cell hue (null = keep),
  // mode = how the glow behaves over time (steady, pulse, prism = cycles through every colour), shine = highlight sharpness, spec = highlight colour
  const SKINS = [
    { id: 'crimson', name: 'Crimson', hue: null, sat: 1, val: 1, metal: [1, 1, 1], glow: null, mode: 'steady', shine: 22, spec: 0x553030, light: 0xff5030 },
    { id: 'gilded', name: 'Gilded', hue: 43, sat: 0.9, val: 1.25, metal: [1.05, 1, 0.9], glow: 38, mode: 'steady', shine: 60, spec: 0xffd070, light: 0xffc040 },
    { id: 'frost', name: 'Frostbite', hue: 198, sat: 0.65, val: 1.35, metal: [0.85, 1, 1.25], glow: 188, mode: 'pulse', shine: 70, spec: 0xb8e8ff, light: 0x60c8ff },
    { id: 'venom', name: 'Venom', hue: 112, sat: 0.85, val: 1.05, metal: [0.9, 1.05, 0.9], glow: 96, mode: 'pulse', shine: 40, spec: 0x80ff70, light: 0x70ff40 },
    { id: 'void', name: 'Voidlight', hue: 276, sat: 0.75, val: 1.1, metal: [1, 0.85, 1.25], glow: 300, mode: 'pulse', shine: 50, spec: 0xd090ff, light: 0xb050ff },
    { id: 'hellforge', name: 'Hellforged', hue: 22, sat: 1, val: 1.35, metal: [1.25, 0.9, 0.75], glow: 42, mode: 'flicker', shine: 35, spec: 0xff9040, light: 0xff7a18 },
    { id: 'infernal', name: 'Infernal', hue: 356, sat: 1, val: 1.12, metal: [1.15, 0.65, 0.65], glow: 8, mode: 'flicker', shine: 45, spec: 0xff5030, light: 0xff2810, embers: true },
    // status colours (the weapon system: colour = what the gun does). Each normal gun has one; legendaries will mix two (plate colour from one, glow from the other)
    { id: 'silver', name: 'Silver', hue: 0, sat: 0, val: 0.78, metal: [3.4, 3.4, 3.6], glow: null, mode: 'steady', shine: 80, spec: 0xffffff, light: 0xffffff },
    // the plain common look: dull gunmetal with a quiet steel glow, no colour and no effects, for every common gun of every type (a status colour has to be earned)
    { id: 'plain', name: 'Plain steel', hue: 0, sat: 0, val: 0.6, metal: [1.5, 1.5, 1.55], glow: null, glowSat: 0, glowVal: 0.55, mode: 'steady', shine: 22, spec: 0x707070, light: 0xd0d0d0 },
    { id: 'radiation', name: 'Radiation', hue: 105, sat: 0.9, val: 1.05, metal: [0.8, 1.15, 0.8], glow: 108, mode: 'pulse', shine: 45, spec: 0x90ff60, light: 0x60ff30 },
    { id: 'poison', name: 'Poison', hue: 285, sat: 0.8, val: 1.0, metal: [1.05, 0.8, 1.2], glow: 290, mode: 'pulse', shine: 45, spec: 0xd070ff, light: 0xb040ff },
    { id: 'shock', name: 'Shock', hue: 52, sat: 0.95, val: 1.25, metal: [1.1, 1.05, 0.8], glow: 55, mode: 'flicker', shine: 70, spec: 0xfff070, light: 0xffe040 },
    { id: 'flame', name: 'Flame', hue: 4, sat: 1, val: 1.1, metal: [1.15, 0.75, 0.7], glow: 22, mode: 'flicker', shine: 45, spec: 0xff6030, light: 0xff5020 },
    { id: 'dark', name: 'Dark Magic', hue: 270, sat: 0.35, val: 0.3, metal: [0.75, 0.65, 0.85], glow: 275, mode: 'pulse', shine: 55, spec: 0x9050d0, light: 0x8030ff },
    { id: 'light', name: 'Light Magic', hue: 48, sat: 0.12, val: 1.45, metal: [1.7, 1.7, 1.75], glow: 50, glowSat: 0.18, mode: 'pulse', shine: 90, spec: 0xffffff, light: 0xfff4c0 },
    // Hellfire: near-black plates with a molten orange-yellow glow that flows along the gun, brighter and faster when you run, red tracer bullets
    { id: 'hellfire', name: 'Hellfire', hue: 18, sat: 0.4, val: 0.4, metal: [0.8, 0.68, 0.7], glow: 36, glowVal: 1.25, trim: 32, mode: 'flow', shine: 60, spec: 0xff9a40, light: 0xff7a18, tracer: 0xff2418 },
    { id: 'prism', name: 'Prismatic', hue: 0, sat: 0.12, val: 1.5, metal: [1.25, 1.25, 1.4], glow: 0, mode: 'prism', shine: 90, spec: 0xffffff, light: 0xffffff },
  ];
  // a legendary carries two statuses: the plates and metal keep the first one's paint, the glow, light, tracer and glow behaviour take the second one's
  const STATUS_SKIN = { radiation: 'radiation', poison: 'poison', electric: 'shock', fire: 'flame', ice: 'frost', dark: 'dark', light: 'light' };
  function mix(a, b) {
    const A = SKINS.find((s) => s.id === a) || SKINS[0], B = SKINS.find((s) => s.id === b) || SKINS[0];
    return Object.assign({}, A, { id: 'mix:' + a + ':' + b, name: A.name + ' + ' + B.name, glow: B.glow !== null && B.glow !== undefined ? B.glow : A.glow, glowSat: B.glowSat, glowVal: B.glowVal, mode: B.mode, light: B.light, tracer: B.tracer || A.tracer, flame: B.flame || A.flame, embers: B.embers || A.embers });
  }
  const byId = (id) => (typeof id === 'string' && id.indexOf('mix:') === 0 ? mix(id.split(':')[1], id.split(':')[2]) : SKINS.find((s) => s.id === id) || SKINS[0]);
  // which skin a gun wears: its own paint, or the two-colour mix when it is a legendary with two statuses
  const forGun = (base, status, rarity) => (rarity < 1 && !(status && status.length) && base !== 'silver' ? 'plain' : rarity >= 4 && status && status.length >= 2 && STATUS_SKIN[status[0]] && STATUS_SKIN[status[1]] ? 'mix:' + STATUS_SKIN[status[0]] + ':' + STATUS_SKIN[status[1]] : base);

  function rgb2hsv(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
    if (d > 0) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx];
  }
  function hsv2rgb(h, s, v) {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; h = ((h % 360) + 360) % 360;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [r + m, g + m, b + m];
  }

  // a new colour array for the skin. col = Voxel.mesh colours (r,g,b per vertex); kind = 'solid' or 'glow'
  function recolor(col, kind, skin) {
    const out = new Float32Array(col.length);
    for (let i = 0; i < col.length; i += 3) {
      const r = col[i], g = col[i + 1], b = col[i + 2];
      if (skin.id === 'crimson') { out[i] = r; out[i + 1] = g; out[i + 2] = b; continue; }
      const [h, s, v] = rgb2hsv(Math.min(1, r), Math.min(1, g), Math.min(1, b));
      let o;
      if (kind === 'glow') o = hsv2rgb(skin.glow === null ? h : skin.glow + (h > 25 ? 8 : 0), skin.id === 'prism' ? 0.1 : skin.glowSat !== undefined ? skin.glowSat : s, Math.min(1, v * (skin.glowVal || 1)));
      else if (skin.trim && s > 0.35 && v >= 0.55) o = hsv2rgb(skin.trim, 0.92, 1);     // the bright plate edges become molten trim
      else if (s > 0.35 && v > 0.12) o = hsv2rgb(skin.hue === null ? h : skin.hue + (h - 355 > -20 ? 0 : 0), Math.min(1, s * skin.sat), Math.min(1, v * skin.val));
      else o = [r * skin.metal[0] * (skin.val > 1 ? 1.15 : 1), g * skin.metal[1] * (skin.val > 1 ? 1.15 : 1), b * skin.metal[2] * (skin.val > 1 ? 1.15 : 1)];
      out[i] = Math.min(1, o[0]); out[i + 1] = Math.min(1, o[1]); out[i + 2] = Math.min(1, o[2]);
    }
    return out;
  }

  // how bright and which colour the glow cells and the light in the hall are at time t (seconds); firing adds a flash (0..1)
  function glowAt(skin, t, flash, run) {
    let k = 1, tint = [1, 1, 1];
    if (skin.mode === 'pulse') k = 0.8 + 0.3 * Math.sin(t * 3);
    else if (skin.mode === 'flicker') k = 0.85 + 0.2 * Math.sin(t * 13) + 0.1 * Math.sin(t * 31 + 1);
    else if (skin.mode === 'prism') { tint = hsv2rgb((t * 90) % 360, 0.85, 1); k = 1.1; }
    k += (flash || 0) * 0.5 + (run || 0) * 0.3;      // firing flashes the glow, running makes it burn brighter
    return { k, tint, light: skin.mode === 'prism' ? hsv2rgb((t * 90) % 360, 0.7, 1) : [((skin.light >> 16) & 255) / 255, ((skin.light >> 8) & 255) / 255, (skin.light & 255) / 255] };
  }
  // flowing glow: how bright a glow cell at position z (gun units, forward is negative) is at time t. A bright band runs from the stock out to the muzzle, over a low flicker
  function flowAt(z, t, run) {
    const band = Math.pow(Math.max(0, Math.sin(-z * 14 - t * (5 + 7 * (run || 0)))), 3);
    return 0.5 + 0.9 * band + 0.1 * Math.sin(t * 17 + z * 40);
  }
  // how much fire to make: running (0..1.6 of walking pace) feeds it, standing still keeps a small flicker. Returns flames per second
  function flameRate(skin, speed) { return skin.flame ? 2 + 12 * Math.min(1.6, Math.max(0, speed)) : 0; }
  return { SKINS, STATUS_SKIN, byId, forGun, recolor, glowAt, flowAt, flameRate, rgb2hsv, hsv2rgb };
})();
if (typeof module !== 'undefined') module.exports = GunSkins;
