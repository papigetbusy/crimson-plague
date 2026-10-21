/* Effect plans: what to show for a shot, a hit, a kill or a blast, for each look preset. Look only: it never decides a rule.
   The referee sends events (shot, hit, kill, blast); the screen asks plan(preset, kind, info) and gets a list of sprite animations to play.
   Muzzle sizes are small because the muzzle sits under the player's nose; everything else is in world units around a 2.4 tall monster.
   A preset is a tier (common, rare, epic, legendary) and an optional element (fire, ice, storm, void, plague) that recolours it and adds extras.
   Real guns get a tier from the loot phase; until then the tune panel lets the owner preview each one.
   Pure logic, no THREE and no DOM, so tests can check it. The sprite art itself comes from fx_data.js (built by tools/pack_fx.py). */
const FxPlan = (function () {
  // one animation: fx = sheet name, size in world units (before scaling), dur in seconds, tint = colour or null,
  // add = glows (additive), ground = bottom of the sprite sits on the spot (for explosions that rise), delay = seconds, tintable = the element may recolour it
  const E = (fx, size, dur, o) => Object.assign({ fx, size, dur, tint: null, add: false, ground: false, delay: 0, tintable: false }, o || {});

  const ASH = '#8a8078';      // a dull ash grey: smoke, dust and skulls stay gothic, never bright. Blood uses the sheets' own red, never tinted
  // what each tier does for each kind of event. kill sizes are multiplied by the monster's scale, boss kills are bigger again
  const TIERS = {
    common: {
      tracer: { color: 0xffd27a, width: 0.03, life: 0.07, trail: 0 },
      muzzle: [E('scifi_muzzle_flash_003', 0.2, 0.08, { add: true, tintable: true })],
      wall: [E('directional_impact_002', 0.9, 0.26), E('ts_dust1', 0.6, 0.3, { tint: ASH })],
      flesh: [E('burst_splatter_001', 0.9, 0.3)],
      crit: [E('symmetrical_impact_001', 1.1, 0.3, { add: true, tintable: true })],
      kill: [E('directional_splatter_003', 2.0, 0.5, { ground: true }), E('stylized_skull_smoke_burst_001', 1.7, 0.7, { delay: 0.05, tint: ASH })],
      blast: [E('stylized_explosion_001', 2.2, 0.5, { ground: true })],
      shake: 0,
    },
    rare: {
      tracer: { color: 0xff9a40, width: 0.04, life: 0.08, trail: 0 },
      muzzle: [E('scifi_muzzle_flash_003', 0.26, 0.09, { add: true, tintable: true, tint: '#ff8a3a' })],
      wall: [E('symmetrical_impact_001', 1.1, 0.3, { add: true, tintable: true, tint: '#ff9a3a' }), E('directional_impact_004', 0.9, 0.3), E('ts_dust1', 0.7, 0.3, { tint: ASH })],
      flesh: [E('symmetrical_impact_003', 1.1, 0.3, { add: true, tintable: true, tint: '#ff7a2e' }), E('burst_splatter_001', 1.0, 0.3)],
      crit: [E('symmetrical_impact_002', 1.5, 0.35, { add: true, tintable: true, tint: '#ffb040' })],
      kill: [E('stylized_explosion_001', 2.8, 0.55, { tintable: true }), E('directional_splatter_003', 2.2, 0.5, { ground: true }), E('directional_smoke_burst_001', 1.8, 0.8, { delay: 0.1, tint: ASH, ground: true })],
      blast: [E('stylized_explosion_003', 3.0, 0.7, { ground: true }), E('directional_smoke_burst_001', 2.6, 0.9, { delay: 0.1, tint: ASH, ground: true })],
      shake: 0,
    },
    epic: {
      tracer: { color: 0xa8ddff, width: 0.05, life: 0.1, trail: 4 },
      muzzle: [E('scifi_muzzle_flash_003', 0.34, 0.1, { add: true, tintable: true, tint: '#9fd8ff' }), E('lightning_burst_001', 0.3, 0.12, { add: true, tintable: true, tint: '#9fd8ff' })],
      wall: [E('lightning_burst_002', 1.5, 0.3, { add: true, tintable: true, tint: '#9fd8ff' }), E('symmetrical_impact_004', 1.4, 0.3, { add: true, tintable: true, tint: '#9fd8ff' }), E('ts_dust1', 0.8, 0.3, { tint: ASH })],
      flesh: [E('lightning_burst_003', 1.6, 0.32, { add: true, tintable: true, tint: '#9fd8ff' }), E('burst_splatter_001', 1.1, 0.3)],
      crit: [E('symmetrical_explosion_004', 2.0, 0.4, { add: true, tintable: true, tint: '#cfeaff' })],
      kill: [E('lightning_strike_001', 3.6, 0.45, { add: true, ground: true, tintable: true, tint: '#9fd8ff' }), E('symmetrical_explosion_004', 3.0, 0.5, { add: true, tintable: true, tint: '#9fd8ff', delay: 0.05 }), E('directional_splatter_003', 2.4, 0.5, { ground: true }), E('round_sparkle_burst_003', 2.2, 0.6, { add: true, tintable: true, tint: '#cfeaff', delay: 0.1 })],
      blast: [E('symmetrical_explosion_004', 4.0, 0.6, { add: true, tintable: true, tint: '#9fd8ff' }), E('lightning_strike_001', 4.5, 0.5, { add: true, ground: true, tintable: true, tint: '#9fd8ff' })],
      shake: 0.05,
    },
    legendary: {
      tracer: { color: 0xfff0b0, width: 0.07, life: 0.14, trail: 6 },
      muzzle: [E('scifi_muzzle_flash_003', 0.5, 0.12, { add: true, tintable: true, tint: '#ffd45a' }), E('round_firework_burst_001', 0.6, 0.25, { add: true, tintable: true, tint: '#ffd45a' }), E('scifi_warp_003', 0.5, 0.25, { add: true, tintable: true, tint: '#ffe9a0' })],
      wall: [E('symmetrical_impact_001', 2.0, 0.35, { add: true, tintable: true, tint: '#ffd45a' }), E('stylized_explosion_002', 1.7, 0.4, { add: true, tintable: true }), E('directional_impact_004', 1.4, 0.3, { tintable: true }), E('round_sparkle_burst_002', 1.8, 0.5, { add: true, tintable: true, tint: '#fff0a0', delay: 0.05 })],
      flesh: [E('stylized_explosion_001', 2.0, 0.45, { add: true, tintable: true }), E('symmetrical_impact_002', 1.8, 0.35, { add: true, tintable: true, tint: '#ffd45a' }), E('burst_splatter_001', 1.2, 0.3), E('round_sparkle_burst_001', 1.6, 0.45, { add: true, tintable: true, tint: '#fff0a0', delay: 0.04 })],
      crit: [E('round_firework_burst_002', 3.0, 0.5, { add: true, tintable: true, tint: '#ffd45a' }), E('symmetrical_explosion_004', 2.6, 0.45, { add: true, tintable: true, tint: '#ffe9a0' })],
      kill: [E('epic_explosion_001', 4.4, 0.8, { ground: true, tintable: true }), E('stylized_explosion_003', 3.4, 0.7, { ground: true, tintable: true, delay: 0.08 }), E('symmetrical_explosion_004', 4.2, 0.55, { add: true, tintable: true, tint: '#ffd45a', delay: 0.02 }), E('round_firework_burst_002', 4.0, 0.7, { add: true, tintable: true, tint: '#ffd45a', delay: 0.1 }), E('epic_explosion_002', 3.6, 0.8, { ground: true, tintable: true, delay: 0.2 }), E('directional_splatter_003', 2.6, 0.5, { ground: true })],
      blast: [E('epic_explosion_002', 5.0, 0.9, { ground: true, tintable: true }), E('epic_explosion_001', 4.0, 0.8, { ground: true, tintable: true, delay: 0.1 }), E('symmetrical_explosion_004', 5.0, 0.6, { add: true, tintable: true, tint: '#ffd45a' })],
      shake: 0.12,
    },
  };

  // elements recolour every tintable animation and add a signature extra to hits and kills
  const ELEMENTS = {
    fire: { tint: '#ff7a2e', tracer: 0xff6a20, extra: { flesh: [E('fire_looping_004A', 1.2, 0.6, { ground: true, add: true })], kill: [E('fire_looping_003B', 2.6, 1.1, { ground: true, add: true, delay: 0.25 }), E('ts_fire2', 2.4, 0.9, { ground: true, delay: 0.1 })] } },
    ice: { tint: '#7fd8ff', tracer: 0x9fe8ff, extra: { flesh: [E('round_sparkle_burst_003', 1.4, 0.45, { add: true, tint: '#bfefff' })], kill: [E('ts_splash', 3.0, 0.7, { ground: true }), E('round_sparkle_burst_002', 3.0, 0.7, { add: true, tint: '#bfefff', delay: 0.1 })] } },
    storm: { tint: '#ffe45c', tracer: 0xffe45c, extra: { flesh: [E('lightning_burst_001', 1.4, 0.3, { add: true, tint: '#ffe45c' })], kill: [E('lightning_strike_001', 4.2, 0.45, { add: true, ground: true, tint: '#ffe45c', delay: 0.1 }), E('scifi_spark_burst_001', 3.0, 0.5, { add: true, tint: '#ffe45c', delay: 0.15 })] } },
    void: { tint: '#9a5aff', tracer: 0xb07aff, extra: { flesh: [E('scifi_warp_002', 1.4, 0.4, { add: true, tint: '#b07aff' })], kill: [E('scifi_warp_001', 3.6, 0.7, { add: true, tint: '#b07aff' }), E('spell_death_001', 3.0, 0.9, { tint: '#b07aff', delay: 0.15 })] } },
    plague: { tint: '#7cff5a', tracer: 0x8cff6a, extra: { flesh: [E('directional_bubble_burst_001', 1.4, 0.6, { tint: '#8cff6a' })], kill: [E('spell_poison_001', 3.0, 0.9, { tint: '#8cff6a' }), E('status_poison_001', 2.4, 1.0, { ground: true, tint: '#8cff6a', delay: 0.2 })] } },
  };
  // the three colours the old five did not cover, built from the same sheets: poison is purple, dark magic is a black-violet, light magic is warm white
  const recolor = (extra, tint, add) => { const out = {}; for (const k in extra) out[k] = extra[k].map((e) => Object.assign({}, e, { tint: e.tint ? tint : e.tint, add: add === undefined ? e.add : add && e.add })); return out; };
  ELEMENTS.toxin = { tint: '#c04cff', tracer: 0xc04cff, extra: recolor(ELEMENTS.plague.extra, '#c04cff') };
  ELEMENTS.dark = { tint: '#5a4a8a', tracer: 0x6a5a9a, extra: recolor(ELEMENTS.void.extra, '#4a3a78', false) };
  ELEMENTS.light = { tint: '#fff2c8', tracer: 0xfff6d8, extra: recolor(ELEMENTS.ice.extra, '#fff2c8') };
  // which element each gun status uses (radiation green, poison purple, electric yellow, ice blue, fire red, dark black-violet, light white)
  const STATUS_EL = { radiation: 'plague', poison: 'toxin', electric: 'storm', ice: 'ice', fire: 'fire', dark: 'dark', light: 'light' };
  // the look for a gun: its rarity picks the tier (common and uncommon share one) and each status colour it carries adds an element; a legendary shows both
  const TIER_OF = ['common', 'common', 'rare', 'epic', 'legendary'];
  const lookFor = (rarity, statuses) => TIER_OF[Math.max(0, Math.min(4, rarity | 0))] + (statuses && statuses.length ? ':' + statuses.map((st) => STATUS_EL[st]).filter(Boolean).join('+') : '');

  // the preset list shown in the tune panel
  const PRESETS = [
    { id: 'original', label: 'Original', tier: null },
    { id: 'common', label: 'Common', tier: 'common' },
    { id: 'rare', label: 'Rare', tier: 'rare' },
    { id: 'epic', label: 'Epic', tier: 'epic' },
    { id: 'legendary', label: 'Legendary', tier: 'legendary' },
    { id: 'hellfire', label: 'Hellfire', tier: 'legendary', element: 'fire' },
    { id: 'frostbite', label: 'Frostbite', tier: 'legendary', element: 'ice' },
    { id: 'stormcaller', label: 'Stormcaller', tier: 'legendary', element: 'storm' },
    { id: 'voidmaw', label: 'Voidmaw', tier: 'legendary', element: 'void' },
    { id: 'plague', label: 'Plague', tier: 'legendary', element: 'plague' },
  ];
  // a preset id is a name from the list, or a gun look 'tier:element+element' made by lookFor
  function presetOf(id) {
    const named = PRESETS.find((p) => p.id === id);
    if (named) return Object.assign({ elements: named.element ? [named.element] : [] }, named);
    const m = /^(common|rare|epic|legendary)(?::([a-z+]*))?$/.exec(String(id));
    if (m) return { id, tier: m[1], elements: (m[2] || '').split('+').filter((e) => ELEMENTS[e]), element: (m[2] || '').split('+')[0] || undefined };
    return Object.assign({ elements: [] }, PRESETS[1]);
  }

  // the legendary look was too much to see through, so everything it draws is 15% smaller (owner, 2026-10-20)
  const LEGEND_CUT = 0.85;
  const hexNum = (s) => parseInt(String(s).replace('#', ''), 16);

  // the animations to play, already scaled to the event: kind = muzzle | wall | flesh | kill | blast; info = { scale, boss, crit, r }
  function plan(id, kind, info) {
    const pr = presetOf(id), tier = pr.tier && TIERS[pr.tier];
    if (!tier) return [];
    const els = pr.elements.map((n) => ELEMENTS[n]), el = els[0], inf = info || {};
    let list = (kind === 'flesh' && inf.crit ? tier.flesh.concat(tier.crit) : tier[kind] || []).slice();
    for (const x of els) if (x.extra[kind]) list = list.concat(x.extra[kind]);
    let mul = 1;
    if (kind === 'kill') mul = (inf.scale || 1) * (inf.boss ? 1.8 : 1);
    else if (kind === 'blast') mul = Math.max(0.6, (inf.r || 2) / 2.5);
    const cut = pr.tier === 'legendary' ? LEGEND_CUT : 1;
    return list.map((e) => Object.assign({}, e, { size: e.size * mul * cut, tint: el && e.tintable ? el.tint : e.tint }));
  }
  // how the bullet streak looks: colour, thickness, life, and how many sparkles it sheds along the way
  // n is the shot count: a gun with two colours alternates its streak between them
  function tracer(id, n) {
    const pr = presetOf(id), tier = pr.tier && TIERS[pr.tier];
    if (!tier) return { color: 0xffd27a, width: 0.03, life: 0.07, trail: 0 };
    const el = pr.elements.length ? ELEMENTS[pr.elements[(n | 0) % pr.elements.length]] : null;
    const tr = Object.assign({}, tier.tracer, el ? { color: el.tracer } : {});
    if (pr.tier === 'legendary') { tr.width *= LEGEND_CUT; tr.trail = Math.round(tr.trail * LEGEND_CUT); }
    return tr;
  }
  const shake = (id, kind) => { const pr = presetOf(id), tier = pr.tier && TIERS[pr.tier]; return tier && (kind === 'kill' || kind === 'blast') ? tier.shake * (pr.tier === 'legendary' ? LEGEND_CUT : 1) : 0; };
  // the sparkle that rides the bullet streak (one per trail point), tinted to the element
  function trailSprite(id, n) {
    const pr = presetOf(id), el = pr.elements.length ? ELEMENTS[pr.elements[(n | 0) % pr.elements.length]] : null;
    return pr.tier ? E('round_sparkle_burst_001', 0.55, 0.35, { add: true, tint: el ? el.tint : pr.tier === 'epic' ? '#cfeaff' : '#fff0a0' }) : null;
  }
  // every sheet any preset can ask for (tools/pack_fx.py packs exactly these)
  function needed() {
    const set = new Set(['round_sparkle_burst_001']);
    const add = (l) => (l || []).forEach((e) => set.add(e.fx));
    for (const t of Object.values(TIERS)) for (const k of ['muzzle', 'wall', 'flesh', 'crit', 'kill', 'blast']) add(t[k]);
    for (const el of Object.values(ELEMENTS)) for (const k of Object.keys(el.extra)) add(el.extra[k]);
    return Array.from(set).sort();
  }
  // which frame of an n-frame animation to show at this age (0..dur)
  const frameIndex = (n, age, dur) => Math.max(0, Math.min(n - 1, Math.floor(age / dur * n)));
  return { plan, tracer, shake, trailSprite, needed, frameIndex, PRESETS, presetOf, hexNum, lookFor, STATUS_EL, ELEMENTS };
})();
if (typeof module !== 'undefined') module.exports = FxPlan;
