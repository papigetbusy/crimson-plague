# Crimson Plague roadmap

The plan for everything the game still needs, in phases. Rewritten with the owner on 2026-10-19 (it replaces the first 8-phase plan and borrows the way Crusader Tactics was built). **Work only on the current phase.**

**Current phase: 6 — Loot, shops, saves and seeds** (status: first batch built for private testing: silver pistol start, gun drops, carry two guns; Phases 1 to 5 are signed off)

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

## Phase 1 — Art lock (look and scale) — SIGNED OFF 2026-10-19
Locked first, before anything else is added. The world stays as it is.
- [x] Scale chart (`python3 tools/scale_chart.py out_dir`): player, gun, hands, every monster, doors, corridor width and ceiling height side by side; the owner picks what is too big or small.
- [x] Better 3D modelling for the monsters (and how the gun looks in game: lighting, view-model): build from front, side and top views, silhouette first, one voxel size, palette limited to the gothic colours, a turntable sheet next to Grok's pictures before anything goes in the game.
- [x] Monster look pass: Bone Hound claws, Rock Golem facets, Demon Lord bulk, Horned Fiend face (owner picks the master head picture; Grok's hands and feet sheet).
- [x] Environment look from the reference picture: stone, floor, ceiling, banners with gold trim, torches, red carpet, lighting and fog, decided on the phone.
- [x] Effects look: muzzle flash, hit and blood bursts, orbs, pickups, level-up cards, wave banners.
- [x] HUD look on the phone, landscape.
- [x] Performance budget measured on the owner's real iPhone (frame rate with a full wave) and a face budget per monster if it stutters.
- **Gate:** the owner signs off the look on his phone. Nothing new is built until then.

## Phase 2 — Floors and minimap — SIGNED OFF 2026-10-19
Starts as plain grey-box floors. The goal is the shape and size of the world.
- [x] Floor generator in the referee: seeded rooms joined by winding corridors, always fully connected.
- [x] Floor size table: floor 1 smallest, each floor bigger, up to the maximum size, then random layouts of the same size.
- [x] The locked door: unlocks every 10 waves (when the floor's boss falls); walking through starts the next floor and waves keep counting.
- [x] Monsters spawn across the whole floor and find their way around bends; pathing stays fast on the biggest floor.
- [x] Compass: points at the boss guarding the door from when he appears until the fight starts (owner change).
- [x] Minimap: player arrow and floor layout, filling in as you explore; door marker once open.
- [x] Floor counter on the HUD and a short floor-change moment.
- [x] Tests: every floor is connected, the door is reachable, the same seed gives the same floor, floors reach the maximum size and then stop growing.
- **Check:** you can get lost on a floor but find your way with the minimap, and it runs on the phone.
- **Gate:** running a floor feels good and nobody gets stuck.

## Phase 3 — Monsters and waves — SIGNED OFF 2026-10-19
- [x] Part of the Crusader Tactics roster is in: Goblin, Skeleton, Mushroom, Eyeball, Flame Spirit, with ranged attackers and elites. **The rest of the roster (Orc Brute, Shadow Assassin, Dark Knight, Golden Drake and more) and Grok's art for each monster moved to Phase 9 (owner, 2026-10-19).**
- [ ] Waves scale with floor; variants unlock on set floors; a monster mix per floor that keeps waves interesting.
- [x] A monster cap per floor. After the cap: more damage, more health, skills and abilities, with no upper limit. (Built: past the cap every wave adds health and damage, and elites appear with abilities Armored, Swift, Brutal, Volatile; more abilities stack on the further you go. Owner to feel it on the phone.)
- **Check:** difficulty keeps climbing past the cap and fights stay readable on the phone.
- **Gate:** floors 3, 4 and 5 still feel fresh.

## Phase 4 — Classes, skills and level-ups — SIGNED OFF 2026-10-20 (first batch; unbuilt pieces move to Phase 9)
The most important choices in the game.
- [ ] A class system like Crusader Tactics; classes and skills are chosen in tandem. (First batch built: Gunslinger, Assassin, Witch, picked before a run; every level-up gives one class skill and one regular card.)
- [ ] 4 skills plus 1 ultimate per run (first batch: all passive, the ultimate charges from kills and fires by itself), a replace-skill menu, skills that level with use, perk picks at set levels.
- [ ] Skill rarity and combinations that stack; stronger temporary power-ups and pickups.
- [ ] XP curve and level-up pacing tuned across many floors.
- **Check:** different class and skill picks make runs feel different.
- **Gate:** no two runs feel the same.

## Phase 5 — Floor features and shop floors — SIGNED OFF 2026-10-20 (weather and key-gated doors move to Phase 9)
One feature at a time, each tested on the phone. The safe room and the shop floor are the same place (owner, 2026-10-20).
- [x] Fog waves: some ordinary waves from wave 3 roll in fog that cuts the view to about 30%; your gun lights a small circle and monsters show glowing eyes. (Built; owner to judge the look.)
- [x] Gold: monsters drop coins, a gold counter on the HUD, gold carries across floors. (Built.)
- [x] Safe room after each boss: a calm hall with a merchant; the boss door leads in, its own far door leads on to the next floor. The merchant sells class skill levels and a full heal for gold. (Built, placeholder look.)
- [x] Traps: spike patches (always up), flame vents (on a beat) and rising spikes; they hurt monsters too, and get more advanced and harder-hitting the deeper the floor. Monsters show as dots on the minimap. (Built; owner to judge.)
- Weather (falling embers or ash in the halls, light on the phone) moved to Phase 9 with the key-gated doors (owner, 2026-10-20).
- [x] Merchant sells real gear once guns exist (Phase 6): two guns on the shelf in each safe room (built 2026-10-20, not pushed).
- **Check:** each feature adds tension without hurting phone performance.
- **Gate:** per feature.

## Phase 6 — Loot, shops, saves and seeds
- [ ] Guns drop from monsters and bosses (bosses best); rarity tiers with a 1% legendary; weapon affixes; gun mods (rules below). Each gun has its own fire rate, damage, reload and animations.
- [ ] **Gun mods (owner's rules, 2026-10-20; not built yet).** Mods are separate items you attach to a gun. (1) A mod has its own affixes, never the ordinary gun or gear ones: magazine size, fire rate, aim-down-sights speed and things of that nature. (2) Mods follow the same rarity rules as everything else: a common mod carries 1 affix, an uncommon mod 2, and so on up the same ladder. (3) A mod must match its gun: it can be at most one rarity above the gun and at most one below it. A common gun takes common or uncommon mods; an uncommon gun takes common, uncommon or rare; an epic (purple) gun takes only rare (blue) or better, never a common one; a legendary gun takes epic or legendary. (4) Mods drop on the same wave bands as guns, so a legendary mod can only turn up where legendary guns exist and you are never left holding a mod with nothing it can go on. (5) How many mod slots a gun has, and how mods are put on and taken off, are still to be decided with the owner.
- [x] Grok's black neon-green revolver, built from the picture's own silhouette (src/models/revolver.js; model done 2026-10-20, owner liked the shape).
- [~] **The weapon system (owner, 2026-10-20).** First batch built (not pushed): silver Service Pistol start, 20 guns drop by wave rarity (a boss always drops one a band higher), two carried guns, per-gun damage / fire rate / magazine / reload, damage rises with the drop's wave and its rarity. Status effects built (2026-10-20, not pushed; src/referee_gunfx.js). Legendary two-colour gun looks built. Still to do: Crusader Tactics effects and projectile art, rarity colours confirmed, the cap, per-gun reload animations. Rules:
- [x] Gun affixes (owner, 2026-10-20, built, not pushed): counts by rarity as in Crusader Tactics (common 0-1, uncommon 1-2, rare 2-3, epic 3, legendary 3-4), ten plain lines plus six class-only lines (Gunslinger, Assassin, Witch) that only drop for the class you play, and a floor card showing a gun's numbers, status and affixes against your own gun.
- [ ] **Next (owner, 2026-10-20), in order:** (DONE, built not pushed: gear drops head, chest, boots, two charms with piece-fitting affixes, Gear menu on the GEAR button / G / RB; merchant does not sell gear yet); merchant gear (DONE); the Codex first pages (DONE: how to play, classes, monsters, guns, rarities, status effects, affixes, gear, merchant; button on the start card; search; a test fails if something in the game has no entry) and each new system adds its page as it lands; Phase 8 stash: gear and guns can be put in a safe-room stash (not usable that run), at the run's end make them blueprints you start future runs with (limit 3 per type to begin with); solo stash unlocks after the wave 100 boss, multiplayer can stash from the start.
  - Everyone starts with the same plain silver handgun (the base weapon).
  - You can hold two guns at once: carry two and swap (owner chose this, 2026-10-20). Built: Q, the controller's Y, or tapping the gun box swaps; walking over a gun takes it (it fills the free slot, or replaces the gun in your hands and that one drops at your feet).
  - Monsters drop guns. The rarity of drops follows the wave: waves 1-10 mostly common with a few uncommon (green); 11-20 mostly uncommon with a few rare (blue); 21-30 mostly rare with a few epic (purple); 31 and up mostly epic, with a chance of legendary. Rarity colours to confirm with the owner.
  - Gun types: pistol, SMG, shotgun, sniper, heavy machine gun, four versions of each (models done, see below). Each type reads at a glance by its shape, each version is distinct in shape detail, colour, glow and effects.
  - Status effects, shown by colour: green = radiation, purple = poison, yellow = electric, blue = ice, red = fire, black = dark magic, white = light magic. A normal gun carries one; only legendaries carry two (that is what makes them special).
  - Effects and projectiles come from the owner's Crusader Tactics packs (effects and projectile assets).
  - Damage keeps growing with the waves until the cap (the owner will pick the cap later).
  - Each gun has its own hands (hold) and reload; the hands follow the gun's anchors (done in screen.js).
- [x] Save slots: saved only by pressing Save game at the chest in a safe room, no autosave (newest 8), delete saves, go back to a save from the start or game over card.
- [x] Three seeds: the map seed is kept in a save; the damage and item seeds are rolled fresh every time you enter, all through the referee's seeded random.
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
- [ ] **Consumables (owner, 2026-10-20):** moved here from Phase 6.
- [ ] **Damage cap (owner, 2026-10-20):** guns gain damage every wave they drop; decide the cap here, once the numbers can be tested properly. Moved from Phase 6.
- [ ] The rest of the Crusader Tactics monster roster (Orc Brute, Shadow Assassin, Dark Knight, Golden Drake and more): placeholders first, then Grok's art one monster at a time. Moved here from Phase 3.
- [ ] Feel pass: movement, shooting, spread and recoil, monster speed and damage, wave and floor pacing, XP speed; this is where the TUNE panel numbers get locked.
- [ ] Key-gated doors, moved here from Phase 5 (owner, 2026-10-20). Plan: a few rooms per floor (one on floors 1 to 3, two from floor 4) are shut by a heavy door; one glowing key-carrying monster on the floor drops the key; walking into the door with the key opens it and uses the key up; locked doors show as gold bars on the minimap and the key carrier as a gold dot. Until Phase 6 gives real loot, a locked room holds a pile of gold and a full heal; after it, the real chests and guns.
- [ ] Weather: falling embers or ash in the halls, light on the phone. Moved here from Phase 5.
- [ ] Music, a fuller sound set, stronger hit feedback.
- [ ] Real menu, short tutorial, settings; clean up the leftover "Crimson Hall" names.
- [ ] Controller support, then PC.
- [ ] Performance pass on real devices; home-screen app like Crusader Tactics; saved best floor and wave (leaderboards only if the owner wants them).
- [ ] **Reminder for the owner (asked 2026-10-20): when the game is done, try Meshy (the 3D model plugin) on Grok's two best gun pictures, `art-drop/gun/gun_side_master.jpg` and `gun_three_quarter_rear.jpg`. Claude's workspace cannot reach Meshy, so the owner runs Image to 3D on meshy.ai (PBR off, low or medium polygons), downloads a `.glb` and sends it; Claude then compares it with the voxel gun.**
- **Gate:** friends can play it without help.

## Parked (not forgotten)
- **Endgame multiplayer (what the owner is most excited about):** guns stashed from solo runs, and the mods you added, become blueprints for fully kitted guns that drop in friend sessions. Everyone picks a class and survives as long as possible. Stashes appear after a certain boss or an easter egg.
- Win condition and the ending (decided later, after everything else).
- Splitting `src/screen.js` into more modules when it is next touched (no monolith rule in `CLAUDE.md`).
- Grok's `assets/models/gun/gun_rifle_v1.glb` and the `.glb` loader: only if Grok delivers real `.glb` files and the owner signs them off.


## Stash and blueprints: built as a first demo (2026-10-20)
- Built: 6-place run stash in safe rooms (Gear menu), blueprints saved in the browser (3 per gun type / gear place / mods), pick blueprints on the start or game over card, runs start with them. Gun mods are built too (see Phase 6 rules).
- Still to do later: solo unlock after the wave-100 boss, multiplayer stash from the start, bigger endgame stash, blueprint trading rules.
