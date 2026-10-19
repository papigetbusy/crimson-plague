/* Monster rigs: turns each voxel model (fiend, hound, golem, demon lord) into a jointed THREE group and animates it.
   Presentation only: where a monster is and what it is doing (state, phase) comes from the referee's snapshot.
   Sizes: every model is drawn at MODEL (0.72) times the referee's monster scale. */
const MonsterRigs = (function () {
  const MODEL = 0.72;
  function create(THREE) {
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    const SOURCES = { fiend: HornedFiendV2, golem: RockGolem, demon: DemonLord, hound: BoneHoundV2 };   // the signed-off versions; horned_fiend.js and bone_hound.js stay as the fallback
    const cache = {};       // kind -> { model, geo: { part: { solid, glow } } }  (built once, shared by every monster of that kind)
    function prepare(kind) {
      if (cache[kind]) return cache[kind];
      const model = SOURCES[kind].build(), geo = {};
      for (const name in model.grids) {
        geo[name] = {};
        for (const k of ['solid', 'glow']) { const m = Voxel.mesh(model.grids[name], k, model.vox, model.joints[name] || [0, 0, 0]); if (m.faces) geo[name][k] = Voxel.toGeometry(THREE, m); }
      }
      return (cache[kind] = { model, geo });
    }
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
    return { build, animate, MODEL };
  }
  return { create, MODEL };
})();
