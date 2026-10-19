# Crimson Plague roadmap

The plan for everything the game still needs, in phases. Agreed with the owner on 2026-10-19. **Work only on the current phase.** A phase is finished when the owner plays it on his iPhone (landscape) and says so; then we move to the next one. Update the status line below and tick steps as they are done.

**Current phase: 1 — Look and scale** (status: started 2026-10-19, step 1 scale chart; the first version, with the core loop, is on `main`)

## How we work through each phase
1. Claude writes the phase's steps into a private test link (never `main` until signed off, see `docs/sign-off.md`).
2. The owner plays it on his phone and says what to change.
3. Fix, retest, repeat until the owner says the phase is signed off.
4. Claude merges to `main`, checks the green tick, ticks the phase here and logs it in `docs/changelog.md`.

## Decisions locked (owner, 2026-10-19)
- **Floors:** big floors with twists and turns. Every 10 waves a door unlocks and leads to the next floor. Each floor is bigger than the last until a maximum floor size; after that every floor is still a new random layout but stays the same size.
- **Wave count keeps going across floors** (floor 1 is waves 1-10, floor 2 is waves 11-20, and so on; one boss per floor).
- **Compass:** on big floors a compass points to the door, and it only appears once the door is open (after the floor's boss falls).
- **No win condition yet.** Pure survival. We come back to this once everything else is done.
- **Look before feel.** Feel depends on floor size, monster count and effects, so we settle how everything looks and how big it is first, and tune feel after the content exists.
- **No permanent progression.** Everything resets on death.
- Claude writes code, Grok makes art, the referee owns every rule and number (`CLAUDE.md`).

## Phase 1 — Look and scale
What the game looks like and how big everything is.
- [ ] Scale chart (built 2026-10-19 with `python3 tools/scale_chart.py out_dir`, waiting on the owner's answers): one picture showing the player, gun, hands, every monster, doors, corridor width and ceiling height side by side; the owner picks what is too big or too small.
- [ ] Environment look: stone, floor, ceiling, banners, torches, lighting and fog, decided on the phone.
- [ ] Monster look pass: Bone Hound claws, Rock Golem facets, Demon Lord bulk, and the Horned Fiend's face (owner decides which head picture is the master; Grok's hands and feet sheet).
- [ ] Effects look: muzzle flash, hit and blood bursts, orbs, pickups, level-up cards, wave banners.
- [ ] HUD look on the phone, landscape.
- [ ] Performance budget measured on the owner's real iPhone (frame rate with a full wave), and a face budget per monster if it stutters.
- **Gate:** the owner signs off the look on his phone.

## Phase 2 — Floors
- [ ] Floor generator in the referee: seeded rooms joined by winding corridors, always fully connected.
- [ ] Floor size table: floor 1 is the smallest, each floor bigger, up to the maximum size; after that random layouts of the same size.
- [ ] The locked door: it unlocks when the wave-10 boss falls, and walking through it starts the next floor (waves keep counting across floors).
- [ ] Monsters spawn across the whole floor and find their way around bends; pathing stays fast on the biggest floor.
- [ ] Compass to the door: appears only once the door is open, points to it from anywhere on the floor.
- [ ] Floor counter on the HUD and a short floor-change moment.
- [ ] Tests: every generated floor is connected, the door is reachable, the same seed gives the same floor, floors reach the maximum size and then stop growing.
- **Gate:** running a floor feels good and nobody gets stuck.

## Phase 3 — Arsenal
- [ ] The black neon-green revolver (Grok's art), built to look exactly like the pictures.
- [ ] Picking up and swapping guns; each gun has its own fire rate, damage, reload and animations.
- [ ] A tier system: guns improve through skills and pickups during the run.
- **Gate:** each gun feels different and the owner likes using it.

## Phase 4 — Bestiary and bosses
- [ ] More monsters from the Crusader Tactics sprites (ranged and special attackers, elites).
- [ ] A different boss each boss wave, with its own patterns, instead of only the Demon Lord.
- [ ] Monster mix per floor that keeps waves interesting.
- **Gate:** floors 3, 4 and 5 still feel fresh.

## Phase 5 — Progression depth
- [ ] Many more skills, skill rarity, combinations that stack.
- [ ] Stronger temporary power-ups and pickups.
- [ ] XP curve and level-up pacing tuned across many floors.
- **Gate:** no two runs feel the same.

## Phase 6 — Feel pass
With the content in place, tune how it feels: movement, shooting, spread and recoil, monster speed and damage, wave pacing, floor pacing, XP speed. This is where the TUNE panel numbers get locked.
- **Gate:** the owner says the feel is right.

## Phase 7 — Polish
- [ ] Music and a fuller sound set, stronger hit feedback.
- [ ] Real menu, short tutorial, settings.
- [ ] Clean up the leftover "Crimson Hall" names.
- **Gate:** it feels like a finished game.

## Phase 8 — Release
- [ ] Performance pass on real devices.
- [ ] Home-screen app, like Crusader Tactics.
- [ ] Saved best floor and wave; leaderboards only if the owner wants them.
- **Gate:** friends can play it without help.

## Parked (not forgotten)
- Win condition (decided later, after everything else).
- Splitting `src/screen.js` into more modules when it is next touched (no monolith rule in `CLAUDE.md`).
- Grok's `assets/models/gun/gun_rifle_v1.glb` and the `.glb` loader: only if Grok delivers real `.glb` files and the owner signs them off.
- Multiplayer or meta-progression: not planned.
