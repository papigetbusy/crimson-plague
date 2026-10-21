/* Monster rigs: turns each model (fiend, hound, golem, demon lord, goblin, skeleton, mushroom, eyeball, flame spirit) into a jointed THREE group and animates it.
   Presentation only: where a monster is and what it is doing (state, phase) comes from the referee's snapshot.
   Sizes: every model is drawn at MODEL (0.72) times the referee's monster scale. */
const MonsterRigs = (function () {
  const MODEL = 0.72;
  function create(THREE) {
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    const SOURCES = { fiend: HornedFiendV2, golem: RockGolem, demon: DemonLordV3, hound: BoneHoundV2, goblin: Goblin, skeleton: Skeleton, mushroom: Mushroom, eyeball: Eyeball, flame: FlameSpirit, bat: BatLord, lich: LichKing, dragon: ElderDragon };   // the signed-off versions (the demon lord v2 is a candidate until the owner signs it off); horned_fiend.js, bone_hound.js and demon_lord.js stay as the fallback
    const SMOOTH = { relax: 0.6, passes: 5, soft: 0.9 };
    const cache = {};       // kind -> { model, geo: { part: { solid, glow } } }  (built once, shared by every monster of that kind)
    // a kind's geometry is cut part by part, so a kind can be prepared a slice at a time in the background (warmStep) or all at once when its first monster appears
    function start(kind) { if (!cache[kind]) { const model = SOURCES[kind].build(); cache[kind] = { model, geo: {}, todo: Object.keys(model.grids) }; } return cache[kind]; }
    function cutPart(c, name) {
      const model = c.model, geo = c.geo[name] = {};
      const fine = (model.fine && model.fine[name]) || 1;             // a part built finer than the rest (the demon lord's head is 2x), its joint given in the body's voxels
      const piv = (model.joints[name] || [0, 0, 0]).map((v) => v * fine);
      let ms = ['solid', 'glow'].map((k) => Voxel.mesh(model.grids[name], k, model.vox / fine, piv));
      if (model.smooth) ms = VoxelSmooth.smooth(ms, model.vox / fine, SMOOTH);      // the placeholder roster is cut fine and smoothed: rounded shapes, soft light
      ['solid', 'glow'].forEach((k, i) => { if (ms[i].faces) geo[k] = Voxel.toGeometry(THREE, ms[i]); });
    }
    function prepare(kind) { const c = start(kind); while (c.todo.length) cutPart(c, c.todo.shift()); return c; }
    function warmStep(kind) { const c = start(kind); if (c.todo.length) cutPart(c, c.todo.shift()); return c.todo.length > 0; }   // true while parts are left
    function build(kind) {
      const c = prepare(kind), V = c.model.vox, FJ = c.model.joints;
      const skin = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x000000 });   // one per monster, so hit flashes stay separate
      const root = new THREE.Group(); root.rotation.order = 'YXZ';
      const body = new THREE.Group(); root.add(body);
      // a jointed part: a group at its joint (placed relative to its parent's joint) holding the lit mesh and the glowing mesh
      const joint = (name, parent, parentName) => {
        const j = FJ[name] || [0, 0, 0], pj = parentName ? FJ[parentName] || [0, 0, 0] : [0, 0, 0];
        const grp = new THREE.Group(); grp.position.set((j[0] - pj[0]) * V, (j[1] - pj[1]) * V, (j[2] - pj[2]) * V); parent.add(grp);
        if (c.geo[name].solid) grp.add(new THREE.Mesh(c.geo[name].solid, skin));
        if (c.geo[name].glow) grp.add(new THREE.Mesh(c.geo[name].glow, glowMat));
        return grp;
      };
      const en = { kind, root, body, skin };
      joint('body', body);
      const rig = c.model.rig;
      if (rig === 'biped1') {                                          // goblin, skeleton: legs, torso, head, a weapon arm and a free arm
        en.legs = [joint('legR', body), joint('legL', body)]; en.torso = joint('torso', body); en.head = joint('head', en.torso, 'torso');
        en.armW = joint('armR', en.torso, 'torso'); en.armF = joint('armL', en.torso, 'torso');
        return en;
      }
      if (rig === 'shroom') { en.cap = joint('cap', body); return en; }
      if (rig === 'floater') {                                          // eyeball (wings, tendrils) and flame spirit (arms)
        for (const n of ['wingR', 'wingL', 'tendrils', 'armR', 'armL']) if (c.geo[n]) en[n] = joint(n, body);
        return en;
      }
      if (kind === 'hound') {
        en.head = joint('head', body); en.jaw = joint('jaw', en.head, 'head');
        en.legs = { FR: joint('legFR', body), FL: joint('legFL', body), BR: joint('legBR', body), BL: joint('legBL', body) };
        return en;
      }
      en.legs = [joint('legR', body), joint('legL', body)];
      en.torso = joint('torso', body);
      en.head = joint('head', en.torso, 'torso');
      en.arms = [];
      for (const side of ['R', 'L']) { const up = joint('arm' + side + 'U', en.torso, 'torso'); en.arms.push({ sh: up, fore: joint('arm' + side + 'F', up, 'arm' + side + 'U') }); }
      if (kind === 'demon') en.wings = [joint('wingR', en.torso, 'torso'), joint('wingL', en.torso, 'torso')];
      return en;
    }

    // one pose per frame. m = the referee's monster (state, phase, id), t = clock seconds
    function animate(en, m, t) {
      const rig = en.kind in LIGHT ? LIGHT[en.kind] : null;
      if (rig) return animateLight(en, m, t, rig);
      const sw = Math.sin(m.phase), atk = m.state === 'attack', k = Math.sin(t * 11 + m.id);
      if (en.kind === 'hound') {
        en.legs.FR.rotation.x = en.legs.BL.rotation.x = sw * 0.95; en.legs.FL.rotation.x = en.legs.BR.rotation.x = -sw * 0.95;
        en.body.position.y = Math.abs(sw) * 0.05; en.body.rotation.x = Math.sin(m.phase * 2) * 0.03;
        en.head.rotation.x = atk ? 0.18 : Math.sin(t * 3 + m.id) * 0.05;
        en.jaw.rotation.x = atk ? 0.35 + 0.3 * Math.abs(k) : 0.05;
        return;
      }
      if (en.kind === 'golem') {
        en.legs[0].rotation.x = sw * 0.5; en.legs[1].rotation.x = -sw * 0.5;
        en.body.position.y = Math.abs(sw) * 0.05; en.torso.rotation.z = sw * 0.04; en.torso.rotation.x = -0.1;
        if (atk) { const s = Math.max(0, Math.sin(t * 5 + m.id)); en.arms[0].sh.rotation.x = en.arms[1].sh.rotation.x = 0.9 + 1.6 * s; en.arms[0].fore.rotation.x = en.arms[1].fore.rotation.x = 0.3; en.torso.rotation.x = -0.1 + s * 0.15; }
        else { en.arms[0].sh.rotation.x = -sw * 0.3 + 0.1; en.arms[1].sh.rotation.x = sw * 0.3 + 0.1; en.arms[0].fore.rotation.x = en.arms[1].fore.rotation.x = 0.2; }
        en.head.rotation.x = Math.sin(t * 2 + m.id) * 0.03;
        return;
      }
      // fiend and demon lord share the biped walk
      en.legs[0].rotation.x = sw * 0.7; en.legs[1].rotation.x = -sw * 0.7;
      en.body.position.y = Math.abs(sw) * 0.07;
      en.torso.rotation.z = sw * 0.05; en.torso.rotation.x = -0.06;
      if (atk) {
        en.arms[0].sh.rotation.x = 1.3 + k * 0.8; en.arms[1].sh.rotation.x = 1.3 - k * 0.8;
        en.arms[0].fore.rotation.x = en.arms[1].fore.rotation.x = 0.5;
      } else {
        en.arms[0].sh.rotation.x = -sw * 0.55 + 0.1; en.arms[1].sh.rotation.x = sw * 0.55 + 0.1;
        en.arms[0].fore.rotation.x = en.arms[1].fore.rotation.x = 0.35;
      }
      en.head.rotation.x = Math.sin(t * 3 + m.id) * 0.04;
      if (en.wings) {
        let flap = Math.sin(t * 2.6 + m.id) * 0.28 - 0.05;
        if (m.state === 'windup') {                                   // rears back, arms up, wings flung wide
          en.torso.rotation.x = 0.4; en.arms[0].sh.rotation.x = en.arms[1].sh.rotation.x = 2.5; flap = -0.5 + Math.sin(t * 30) * 0.04;
        } else if (m.state === 'charge') {                            // leans into the run, wings tucked back
          en.torso.rotation.x = -0.5; en.arms[0].sh.rotation.x = en.arms[1].sh.rotation.x = -0.7; flap = 0.35;
          en.legs[0].rotation.x = Math.sin(t * 20) * 0.9; en.legs[1].rotation.x = -Math.sin(t * 20) * 0.9;
        }
        en.wings[0].rotation.z = flap; en.wings[1].rotation.z = -flap;
      }
    }
    const LIGHT = { goblin: 'biped1', skeleton: 'biped1', mushroom: 'shroom', eyeball: 'floater', flame: 'floater', bat: 'floater', lich: 'floater', dragon: 'floater' };
    // the placeholder roster. atkK / castK (0 to 1) come from the referee: how far a blow or a throw has wound up, so the pose is the warning
    function animateLight(en, m, t, rig) {
      const sw = Math.sin(m.phase), a = m.atkK || 0, c = m.castK || 0, id = m.id;
      if (rig === 'biped1') {
        const slow = en.kind === 'skeleton' ? 0.7 : 1;
        en.legs[0].rotation.x = sw * 0.75 * slow; en.legs[1].rotation.x = -sw * 0.75 * slow;
        en.body.position.y = Math.abs(sw) * 0.05; en.torso.rotation.z = sw * 0.06; en.torso.rotation.x = -0.1 - a * 0.35;
        en.armF.rotation.x = -sw * 0.6 * slow + 0.1 + (en.kind === 'skeleton' ? a * 0.6 : 0);          // the skeleton raises its shield a little as it swings
        en.armW.rotation.x = a > 0 ? 0.2 + 2.6 * a : (m.state === 'attack' ? 1.0 : 0.5 + sw * 0.35);   // weapon arm: held out, hauled up overhead as the blow winds up, down on the strike
        en.head.rotation.x = Math.sin(t * 3 + id) * 0.04 + a * 0.2;
      } else if (rig === 'shroom') {
        en.body.position.y = Math.abs(sw) * 0.06 + c * 0.04; en.body.rotation.z = sw * 0.08; en.body.scale.set(1 + c * 0.1, 1 - c * 0.12, 1 + c * 0.1);
        en.cap.rotation.x = c * 0.7 + Math.sin(t * 4 + id) * 0.03; en.cap.rotation.z = Math.sin(t * 2.2 + id) * 0.05;   // rears back as it fills, snaps forward when it spits
      } else {
        const fly = Math.sin(t * 2.4 + id * 1.7);
        en.body.position.y = fly * 0.09; en.body.rotation.x = -c * 0.35; en.body.rotation.z = Math.sin(t * 1.5 + id) * 0.06;
        const grow = 1 + c * 0.22; en.body.scale.set(grow, grow, grow);
        if (en.wingR) { const f = Math.sin(t * (en.kind === 'dragon' ? 3 : en.kind === 'bat' ? 6 : 9) + id) * (en.kind === 'dragon' ? 0.35 : 0.55) + 0.2; en.wingR.rotation.z = f; en.wingL.rotation.z = -f; }
        if (m.state === 'dash') { en.body.rotation.x = 0.9; if (en.wingR) { en.wingR.rotation.z = 0.9; en.wingL.rotation.z = -0.9; } if (en.armR) { en.armR.rotation.x = en.armL.rotation.x = 1.6; } }       // the Bat Lord dives nose first, wings swept back, talons out
        if (en.tendrils) { en.tendrils.rotation.x = Math.sin(t * 2 + id) * 0.2; en.tendrils.rotation.z = Math.cos(t * 1.7 + id) * 0.2; }
        if (en.armR) { const r = 0.5 + c * 1.5 + Math.sin(t * 3 + id) * 0.1; en.armR.rotation.x = r; en.armL.rotation.x = r; en.armR.rotation.z = -c * 0.5; en.armL.rotation.z = c * 0.5; }
      }
    }
    return { build, animate, warmStep, MODEL };
  }
  return { create, MODEL };
})();
if (typeof module !== 'undefined') module.exports = MonsterRigs;
