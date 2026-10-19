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
    { id: 'prism', name: 'Prismatic', hue: 0, sat: 0.12, val: 1.5, metal: [1.25, 1.25, 1.4], glow: 0, mode: 'prism', shine: 90, spec: 0xffffff, light: 0xffffff },
  ];
  const byId = (id) => SKINS.find((s) => s.id === id) || SKINS[0];

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
      if (kind === 'glow') o = hsv2rgb(skin.glow === null ? h : skin.glow + (h > 25 ? 8 : 0), skin.id === 'prism' ? 0.1 : s, v);
      else if (s > 0.35 && v > 0.12) o = hsv2rgb(skin.hue === null ? h : skin.hue + (h - 355 > -20 ? 0 : 0), Math.min(1, s * skin.sat), Math.min(1, v * skin.val));
      else o = [r * skin.metal[0] * (skin.val > 1 ? 1.15 : 1), g * skin.metal[1] * (skin.val > 1 ? 1.15 : 1), b * skin.metal[2] * (skin.val > 1 ? 1.15 : 1)];
      out[i] = Math.min(1, o[0]); out[i + 1] = Math.min(1, o[1]); out[i + 2] = Math.min(1, o[2]);
    }
    return out;
  }

  // how bright and which colour the glow cells and the light in the hall are at time t (seconds); firing adds a flash (0..1)
  function glowAt(skin, t, flash) {
    let k = 1, tint = [1, 1, 1];
    if (skin.mode === 'pulse') k = 0.8 + 0.3 * Math.sin(t * 3);
    else if (skin.mode === 'flicker') k = 0.85 + 0.2 * Math.sin(t * 13) + 0.1 * Math.sin(t * 31 + 1);
    else if (skin.mode === 'prism') { tint = hsv2rgb((t * 90) % 360, 0.85, 1); k = 1.1; }
    k += (flash || 0) * 0.5;
    return { k, tint, light: skin.mode === 'prism' ? hsv2rgb((t * 90) % 360, 0.7, 1) : [((skin.light >> 16) & 255) / 255, ((skin.light >> 8) & 255) / 255, (skin.light & 255) / 255] };
  }
  return { SKINS, byId, recolor, glowAt, rgb2hsv, hsv2rgb };
})();
if (typeof module !== 'undefined') module.exports = GunSkins;
