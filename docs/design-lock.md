# Crimson Plague: Design Lock (v1, vertical slice)

Decisions from the owner. Paste at the top of every big prompt.

## What the game is
- First-person Vampire Survivors-style horde survival roguelite. Run around a small area, shoot endless monsters. Every 10 waves a boss (later). Upgrades last for the run.
- Feel and controls copy **Hypershot (Roblox)**: snappy camera, sprint, slide, aim down sights, fast shooting. Phone is held **landscape**: left joystick, right-side touch look, Fire / ADS / Run / Slide / Reload buttons.
- Look: chunky voxel/pixel gothic. Dark stone corridors, crimson banners with gold trim, torches, red carpet runner. Crimson and gold. No bright colours.
- The gun is the selling point. Hypershot-quality guns, beautiful and chunky.

## Scope right now (slice)
One small fixed hall. One gun (reload, ADS, red dot). A few respawning monsters. Hit detection, kill counter. **Not yet:** waves, skill screens, inventory, endless generation, bosses. Do not add them until the owner says.

## Architecture (non-negotiable)
1. The **referee** (`src/referee.js`) owns every rule and number. Pure logic: `Referee.create(seed)` returns `step(dt, input) -> {state, events}`, `snapshot()`, `reset()`.
2. The **screen** (`src/screen.js`) draws the snapshot, plays the events (sounds, flashes, particles) and sends the input. It never decides a hit, damage, ammo or reload.
3. Input contract: `{mx,mz,lookX,lookY,touchX,touchY,fire,ads,sprint,slide,reload}`.
4. Gameplay randomness goes through the referee's seeded random. Only cosmetics may use unseeded random.
5. Art never decides a rule: models only play what the referee says (muzzle flash on a shot event, mag drop on a reload event).

## Confirmed
- Red dot sight is slim and low, a thin open frame so the view stays clear when aiming (owner, 2026-10-19: the first one was too clunky).
- Reload animation is signed off (owner, 2026-10-19: "The reload is perfect"). Do not change its feel.
- ADS alignment: the sight dot sits dead centre of the camera when aiming (`SIGHT`, `EYE_RELIEF` in screen.js). Any new gun model must keep its dot on that plane.
- Grok's models are tested privately first and only enter the repo and the public game after the owner signs them off (`docs/sign-off.md`).
- Grok makes the 3D models for the gun and the monsters. Claude wires them in (docs/art-contract.md).

## Clean-code rules
- Neat code, no monolith: small focused files and functions in clear folders. No fixed line limit (owner, 2026-10-19). `screen.js` is due to be split into modules (world, gun, monsters, hud, input) as it is touched.
- Every rule has a test that runs without a screen.
- Changes explainable in one sentence. Bug fixes come with a regression test.
