# Crimson Horned Fiend v2 — Locked Design

**Status:** Approved mockups. Use these as the master reference.

## Reference images (upload these into art-drop/monsters/)
- fiend_v2_front.jpg  (master front, A-pose)
- fiend_v2_side.jpg   (side profile, locked proportions)
- fiend_v2_back.jpg   (back view, locked proportions)

## Palette (locked)
- Body: deep crimson `#8b1a22` / `#651018` / `#a82a32`
- Horns / claws / spikes: dark charcoal `#2a2420` / `#1c1c20`
- Eyes / mouth: glowing orange-red `#ff4d14`

## Code
See `horned_fiend_v2.js` in this folder. It follows the same pattern as the existing hand-built monsters (Bone Hound, Rock Golem, Demon Lord):
- Uses `Voxel.Grid` + `BestiaryKit` helpers
- Jointed parts: body, torso, head, upper/lower arms, legs
- Feet at y=0, face points to -Z
- Drop into `src/models/` and wire the same way as `horned_fiend.js`

## Notes for Claude
- Match the silhouette and density of the three reference images.
- Keep the joint layout so the existing animation system still works.
- Do not invent new colors or proportions. The front image is the source of truth.
