# Brief for Grok: the hero gun (original design, Hypershot-style feel)

Owner's ask (2026-10-20): a showpiece gun that feels like the glowing legendary skins in Hypershot. It must be an ORIGINAL design: do not copy any one Hypershot weapon, only the feel (glow, flow, fire, tracers, inspect).

## Deliver (pictures first, into art-drop/gun/)
1. Side view, 3/4 front, 3/4 rear, top view, one flat background. Same camera angles as the current rifle sheets so Claude can build it voxel by voxel.
2. A "dark" paint pass (near-black metal) and a separate "glow map": the same picture with ONLY the glowing parts lit, so Claude knows which cells glow.
3. Close-ups: muzzle, receiver core, magazine, sight window.

## Shape rules
- Same size and holding position as the current rifle: stock to muzzle about 1.5 units, red dot sight window kept clear and centred (ADS depends on it).
- A strong silhouette that reads from the first-person view: one big feature at the muzzle (a creature head, a flared maw, a crown of blades, your choice) and one big glowing core on the receiver.
- Separate parts: body, magazine (slides out), bolt/charging handle (slides back). Anchors as in docs/art-contract.md (muzzle, sight_dot at x = 0, hand_grip, hand_fore, hand_mag).
- Chunky voxel look, face budget the same as the rifle.

## Glow rules (what Claude animates)
- Glow cells are few, bright and bold: a core, vein lines along the barrel and rails, slits on the magazine. Glow flows along the vein lines (Claude moves a bright band down them).
- Everything else is dark metal with thin trim, so the glow carries the gun.

## Effects (Claude builds in code, Grok just says what he wants)
- Idle: slow pulse in the core, a few tiny sparks. Not a fire show.
- Running: glow brightens and a short trail streams from the muzzle feature.
- Firing: muzzle flash and tracer in the gun's colour. Pick ONE colour family and say it.
- Inspect: gun turns to show both sides, then the magazine.
