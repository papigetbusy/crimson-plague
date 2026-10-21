/* How Ember, Frost and Venom monsters look, and how a boss that is open to your shots looks. Presentation only (look numbers live here). */
const VariantLook = (function () {
  const GLOW = { ember: [0.38, 0.12, 0.0], frost: [0.06, 0.24, 0.45], venom: [0.1, 0.36, 0.05] };       // body glow colour
  const BURST = { ember: [0xff8a1c, 0xff4500, 0xffd060], frost: [0x7ac8ff, 0xc8ecff, 0x3a88e0], venom: [0x6be03a, 0xb8ff90, 0x2a9a1a] };
  const RING = { ember: 0xff6a1a, frost: 0x7ac8ff, venom: 0x6be03a };                                    // the marked floor circle
  const OPEN = [0.5, 0.42, 0.1];                                                                           // a boss left open pulses gold
  function glow(m, t) {
    const o = [0, 0, 0], g = m.variant && GLOW[m.variant], k = 0.75 + 0.25 * Math.sin(t * 4 + m.id);
    if (g) { o[0] += g[0] * k; o[1] += g[1] * k; o[2] += g[2] * k; }
    if (m.exposed) { const p = 0.6 + 0.4 * Math.sin(t * 16); o[0] += OPEN[0] * p; o[1] += OPEN[1] * p; o[2] += OPEN[2] * p; }
    return o;
  }
  return { GLOW, BURST, RING, glow };
})();
if (typeof module !== 'undefined') module.exports = VariantLook;
