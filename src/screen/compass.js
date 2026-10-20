/* Compass: an arrow under the wave counter that points at the Demon Lord guarding the door.
   Shown from the moment he appears until the fight with him starts. Presentation only: the position comes from the snapshot's `compass`. */
const Compass = (function () {
  function create($) {
    const box = $('compass'), arrow = $('compassArrow'), dist = $('compassDist');
    let lastTxt = '';
    function update(st) {
      box.hidden = !st.compass || !!st.over;
      if (box.hidden) return;
      const dx = st.compass.x - st.player.x, dz = st.compass.z - st.player.z;
      const toward = Math.atan2(dx, -dz);                                // world angle of the boss, same turn as the player's yaw
      const rel = toward - st.player.yaw;
      arrow.style.transform = 'rotate(' + (rel * 180 / Math.PI).toFixed(1) + 'deg)';
      const txt = Math.round(Math.hypot(dx, dz)) + ' m';
      if (txt !== lastTxt) { dist.textContent = txt; lastTxt = txt; }
    }
    return { update };
  }
  return { create };
})();
if (typeof module !== 'undefined') module.exports = Compass;
