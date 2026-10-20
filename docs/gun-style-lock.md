# Gun style lock (owner, 2026-10-20: "so much better, keep these design ideas locked")

Every new gun follows what worked on the Ember Rifle (src/models/ember_rifle.js):
1. **Realistic shape, not a dragon or a slab.** Upper and lower receiver, vented handguard, slim barrel and muzzle brake, shaped stock, angled grip, box magazine. Rounded edges, no flat blocks.
2. **Colour comes from the skin system.** The gun is dark iron with a few plate and trim cells; skins recolour it. No colour is baked in beyond that.
3. **Glow accents only.** Thin seams, vents, stripes, brake slits. They flash when you shoot and burn brighter and faster when you run (gun_skins.js glowAt / flowAt). No big fire effects.
4. **Red dot sight: thin open frame, one floating dot, nothing else in the window.** Same dot position (0, 27, -4 voxels) on every gun, so aiming never changes. A test checks the view stays clear.
5. **Compare with the original silhouette every time.** `node tools/gun_silhouette.js <gun> out.json` then `python3 tools/gun_silhouette.py out.json out.png`. A gun must keep the grip joined to the receiver (no floating grip or magazine) and overlap the original (or its own agreed reference outline) by at least 92% in side view.
6. Same anchors as the rifle (muzzle, sightDot, magPivot, boltRest, handGrip, handFore, handMag, dotWindow) so reload, aim and inspect work unchanged.
7. Pictures for the owner before anything goes in the game. Private link first, nothing pushed until he says so.
