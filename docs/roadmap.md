# Crimson Plague roadmap

The plan for everything the game still needs, in phases. Rewritten with the owner on 2026-10-19 (it replaces the first 8-phase plan and borrows the way Crusader Tactics was built). **Work only on the current phase.**

**Current phase: 1 — Art lock (look and scale)** (status: not started; the first version with the core loop is on `main`)

## How we build (every phase works this way)
- **Every phase starts rough and ugly on purpose** (grey boxes, placeholder shapes, plain text menus) and is built out step by step. Nothing is pretty until its phase says so.
- **Phone first.** Every phase must play on the owner's iPhone (landscape) before the next system is built. If it is not playable on the phone, the next phase does not start. PC and controller support come at the end (Phase 9).
- **Regular checks.** The owner plays a private test link (never `main` until signed off, see `docs/sign-off.md`), says what to change, we fix and retest.
- **Gate.** A phase is finished only when the owner plays it and says it is signed off. Then Claude merges to `main`, checks the green tick, ticks the phase here and logs it in `docs/changelog.md`.
- **Talk first, push nothing until the owner says.**
- Claude writes code, Grok makes art, the referee owns every rule and number (`CLAUDE.md`). Every rule gets a test.

## Decisions locked (owner, 2026-10-19)
- **Floors:** big floors with twists and turns, big enough to get lost in. Every 10 waves a door unlocks to the next floor. Each floor is bigger than the last until a maximum size; after that every floor is a new random layout of the same size.
- **Wave count keeps going across floors** (floor 1 is waves 1-10, floor 2 is waves 11-20, and so on; one boss per floor).
- **Minimap:** shows where you are and the floor layout, and fills in as you explore.
- **Compass:** on big floors a compass points to the door, and it only appears once the door is open.
- **Difficulty to infinity:** waves scale with floor. Monster variants unlock on certain floors. Each floor has a monster cap. After the cap, monsters hit harder, have more health, and gain skills and abilities, forever.
- **Choices are the heart of the game:** level-ups build your run. Classes and skills are chosen in tandem, like Crusader Tactics. Power creep is slow and rewards good picks; weapon affixes and loot tiers carry players into the late game.
- **Loot:** guns drop from monsters and bosses (bosses give the best). Shop floors sell better gear.
- **Saves:** after death you can go back to a save. Many save slots, and saves can be deleted, so a bad roll can never lock a run. **Three seeds:** one for the map, one for damage, one for loot drops (the Crusader Tactics seed idea).
- **Stash:** beating the boss gives the stash, which lets you bring a loadout into new runs (owner will explain more in Phase 8).
- **Look:** the owner's reference picture (dark stone corridor, crimson banners with gold trim, torches, red carpet, chunky voxel). The world look is good; the gun and monsters get better in Phase 1 (art lock comes first, before anything else is added). **Grok's side-view gun master stays the gun** (signed off); the screenshot guides the world, monsters and lighting.
- **No win condition yet** and the ending is held until the owner is ready; pure survival for now.
- **Look before feel.** Settle how everything looks and how big it is first; tune feel after the content exists.
- Replaces the old "no permanent progression" rule: saves, the stash and loadouts are now planned.

## Phase 1 — Art lock (look and scale)
Locked first, before anything else is added. The world stays as it is.
- [ ] Scale chart (`python3 tools/scale_chart.py out_dir`): player, gun, hands, every monster, doors, corridor width and ceiling height side by side; the owner picks what is too big or small.
- [ ] Better 3D modelling for the monsters (and how the gun looks in game: lighting, view-model): build from front, side and top views, silhouette first, one voxel size, palette limited to the gothic colours, a turntable sheet next to Grok's pictures before anything goes in the game.
- [ ] Monster look pass: Bone Hound claws, Rock Golem facets, Demon Lord bulk, Horned Fiend face (owner picks the master head picture; Grok's hands and feet sheet).
- [ ] Environment look from the reference picture: stone, floor, ceiling, banners with gold trim, torches, red carpet, lighting and fog, decided on the phone.
- [ ] Effects look: muzzle flash, hit and blood bursts, orbs, pickups, level-up cards, wave banners.
- [ ] HUD look on the phone, landscape.
- [ ] Performance budget measured on the owner's real iPhone (frame rate with a full wave) and a face budget per monster if it stutters.
- **Gate:** the owner signs off the look on his phone. Nothing new is built until then.

## Phase 2 — Floors and minimap
Starts as plain grey-box floors. The goal is the shape and size of the world.
- [ ] Floor generator in the referee: seeded rooms joined by winding corridors, always fully connected.
- [ ] Floor size table: floor 1 smallest, each floor bigger, up to the maximum size, then random layouts of the same size.
- [ ] The locked door: unlocks every 10 waves (when the floor's boss falls); walking through starts the next floor and waves keep counting.
- [ ] Monsters spawn across the whole floor and find their way around bends; pathing stays fast on the biggest floor.
- [ ] Compass to the door, only once the door is open.
- [ ] Minimap: player arrow and floor layout, filling in as you explore; door marker once open.
- [ ] Floor counter on the HUD and a short floor-change moment.
- [ ] Tests: every floor is connected, the door is reachable, the same seed gives the same floor, floors reach the maximum size and then stop growing.
- **Check:** you can get lost on a floor but find your way with the minimap, and it runs on the phone.
- **Gate:** running a floor feels good and nobody gets stuck.

## Phase 3 — Monsters and waves
- [ ] The Crusader Tactics monster list as the base roster (ranged and special attackers, elites), each with its own behaviour, first as simple placeholder shapes, then Grok's art one monster at a time.
- [ ] Waves scale with floor; variants unlock on set floors; a monster mix per floor that keeps waves interesting.
- [ ] A monster cap per floor. After the cap: more damage, more health, skills and abilities, with no upper limit.
- **Check:** difficulty keeps climbing past the cap and fights stay readable on the phone.
- **Gate:** floors 3, 4 and 5 still feel fresh.

## Phase 4 — Classes, skills and level-ups
The most important choices in the game.
- [ ] A class system like Crusader Tactics; classes and skills are chosen in tandem.
- [ ] 4 skills plus 1 ultimate per run, a replace-skill menu, skills that level with use, perk picks at set levels.
- [ ] Skill rarity and combinations that stack; stronger temporary power-ups and pickups.
- [ ] XP curve and level-up pacing tuned across many floors.
- **Check:** different class and skill picks make runs feel different.
- **Gate:** no two runs feel the same.

## Phase 5 — Floor features and shop floors
One feature at a time, each tested on the phone.
- [ ] Key-gated doors, traps, darkness and fog, weather, a safe room between floors.
- [ ] Shop floors that let you buy better gear.
- **Check:** each feature adds tension without hurting phone performance.
- **Gate:** per feature.

## Phase 6 — Loot, shops, saves and seeds
- [ ] Guns drop from monsters and bosses (bosses best); rarity tiers with a 1% legendary; weapon affixes; consumables; relics or gun mods. Each gun has its own fire rate, damage, reload and animations.
- [ ] Grok's black neon-green revolver, built to look exactly like the pictures.
- [ ] Save slots: save often, delete saves, go back to a save after death.
- [ ] Three seeds (map, damage, loot) so a bad roll never locks a save; all randomness through the referee's seeded random.
- **Check:** a save is never a dead end, and drops feel earned.
- **Gate:** each gun feels different and the owner likes using it.

## Phase 7 — Bosses and lore
- [ ] A different boss each floor with its own patterns and unique abilities; bosses drop the best loot.
- [ ] The Hundred Gates story (catacombs under a holy city), smarter enemies.
- [ ] The ending stays held until the owner says.
- **Gate:** each boss plays differently.

## Phase 8 — Stash and loadouts
- [ ] Beating the boss unlocks the stash, which lets you bring a loadout into new runs. **The owner will explain the details when we get here; this phase is a placeholder until then.**
- **Gate:** owner signs off the stash.

## Phase 9 — Feel, polish, controller, PC and release
- [ ] Feel pass: movement, shooting, spread and recoil, monster speed and damage, wave and floor pacing, XP speed; this is where the TUNE panel numbers get locked.
- [ ] Music, a fuller sound set, stronger hit feedback.
- [ ] Real menu, short tutorial, settings; clean up the leftover "Crimson Hall" names.
- [ ] Controller support, then PC.
- [ ] Performance pass on real devices; home-screen app like Crusader Tactics; saved best floor and wave (leaderboards only if the owner wants them).
- **Gate:** friends can play it without help.

## Parked (not forgotten)
- **Endgame multiplayer (what the owner is most excited about):** guns stashed from solo runs, and the mods you added, become blueprints for fully kitted guns that drop in friend sessions. Everyone picks a class and survives as long as possible. Stashes appear after a certain boss or an easter egg.
- Win condition and the ending (decided later, after everything else).
- Splitting `src/screen.js` into more modules when it is next touched (no monolith rule in `CLAUDE.md`).
- Grok's `assets/models/gun/gun_rifle_v1.glb` and the `.glb` loader: only if Grok delivers real `.glb` files and the owner signs them off.
