# Crimson Plague in VR (Meta Quest 3): how other VR shooters do it, and what we copied

Grok's research notes, 2026-11-04 (sources: Half-Life: Alyx guides, the Half-Life 2: VR mod manual, Lambda1VR's Quest controls, Pavlov player tips; Contractors, Onward, H3VR, Into the Radius, Pistol Whip and Arizona Sunshine follow the same patterns).

## Conventions most VR shooters share
- **Move with the left stick, turn with the right stick.** Snap turn (30 or 45 degrees) is the comfort default; smooth turn is offered, usually with a speed setting. Movement can follow the head or the off hand (Pavlov, HL2VR let you pick).
- **Sprint = click the left stick** (HL2VR: stays on until the stick returns to centre). Pavlov's "auto sprint" adds running without the click.
- **Jump = right stick up, crouch = right stick down** (HL2VR) or B/Y (Lambda1VR). Physically ducking also works.
- **Triggers fire, grips grab.** The gun hand's grip holds the gun; the off hand's grip holds the foregrip.
- **Two-handed aim:** put the off hand at the gun's front and hold its grip; the barrel then runs from the back hand through the front hand, which is far steadier. Lambda1VR only turns it on when the hands are 15cm+ apart, so one-handed pistols are not spoiled.
- **Hand reload (Alyx, Pavlov, HL2VR "manual"):** press A on the gun hand to drop the magazine, reach to the hip / behind the shoulder and grip to take a new one, push it into the magwell, then rack the slide (pull it back) **only if the chamber was empty**. Haptic ticks confirm each step.
- **Easy reload option:** HL2VR's "quick reload" and Pavlov settings let players skip the hand steps; we keep that as `?easyreload` (A reloads).
- **Menus:** a laser from the controller, point and pull the trigger. Panels float in the world (not stuck to your face), big enough to read, so you can turn your head to look around them.
- **Comfort:** a vignette while moving is optional; no camera shake or head bob.

## Reloading in other VR shooters, per weapon type

| Weapon type | Pavlov / Onward / Contractors | Half-Life: Alyx | H3VR / Into the Radius | Arizona Sunshine |
|---|---|---|---|---|
| Pistol | A (or a button) drops the mag; grab one from the belt or chest; push it into the grip; rack the slide if the gun was empty | Flick the hand to drop, grab from over the shoulder, push in, rack | The same, but you must find, seat and rack by hand | Grab from the hip, touch the gun |
| SMG / rifle | Mag release, new mag from the chest pouch, seat, pull the charging handle only if empty | Mag into the well, pull the bolt | Fully manual: every step, including slide lock | Auto chamber |
| Sniper (bolt) | Mag or rounds, then work the bolt after each shot | n/a | Bolt up, back, forward, down | Simplified |
| Shotgun (pump) | Shells one at a time into the loading port, then pump | Shells one at a time (up to 6), then pump | Shells by hand, pump | One shell per touch |
| HMG / LMG | Box mag, open the top cover, seat the belt | n/a | Fully manual | Auto |

What they agree on: big, forgiving snap zones; the magazine visibly drops out; a haptic click on every step; the gun will not fire while empty (dry click). Casual games (Arizona Sunshine, Contractors casual mode) also offer a one-button or touch reload. We follow the casual path: everything is optional and forgiving.

## Crimson Plague reload, per weapon (animation on the gun)

The hand reload (grabbing magazines and shells, racking, two-handed support grip) was **removed** at the owner's request. Now the reload works like Arizona Sunshine's or a flat shooter's: you press X, or empty the gun, and the gun model plays the reload itself. The timing follows the game's own reload duration (`reloadK` from the referee), so the rules don't change. Each gun uses the anchors from its own model: magazine pivot `magPivot`, bolt or slide `boltRest`, and the loading port.

- **Pistol, SMG, rifle, HMG:** the gun tips toward you, the magazine slides out of the magwell, and a copy drops from the gun and tumbles to the floor. Then the new magazine slides up into the real magwell and seats with a click and a left-hand buzz. On an empty reload the slide or bolt racks, with a right-hand buzz.
- **Sniper:** same as above, and the bolt is worked after every magazine.
- **Shotgun (all four):** a red shell rides from the belt into the loading port four times, with a buzz per shell. Then the pump racks.
- An empty gun still reloads by itself, as in the flat game. Arms and hands stay hidden: you see only the gun.

## Menus: what each one is for, and how VR handles it

In VR every menu is a copy of the game's own panel, hung in front of you on a world-locked board. Point the right controller's laser at it and pull the trigger. **Only real buttons light up.** That means buttons, whole cards (a level-up or shop card is one button, so it lights up as one tile), gear and stash actions, blueprints, and save entries. Headings, descriptions and other words are never highlighted, and the trigger does nothing on them. When buttons sit inside other buttons, the smallest one under the laser wins.

| Menu | What it is for | Elements | In VR |
|---|---|---|---|
| Start | Pick a class and begin | Class buttons, Play, Codex, Co-op | Laser and trigger on a class, then Play |
| Codex | Reading about enemies and items | Text and a close button | Laser on the close button |
| Level-up | Choose upgrades on level-up | A class card row and a gift row (take one of each) | Each card is one tile; trigger picks it |
| Merchant (shop) | Spend gold on class training and supplies | Cards and your gold; the flat game leaves with Back | Laser picks cards; **Y leaves the merchant** (the hint is shown under the board) |
| Gear | Fit or remove weapon mods and see your gear | Fit / Remove / Close buttons (`data-act`) | Laser on the buttons; right stick click opens or closes it |
| Stash chest | Store items between runs | Put in, Take, Rename, Save game, "Enter the hall" | Laser on the buttons. Renaming needs the Quest keyboard (untested) |
| Game over | See the run summary, keep stash items as blueprints, load or delete saves, rise again | Keep, blueprint and save buttons, and RISE AGAIN | Laser on any of them |
| Pause | Stop the game | Y | Y again resumes |
| Map | Overview of the floor | Flat overlay (M / Back) | Hold the left grip: the map is in your left hand |

## What Crimson Plague does in VR
| Control | Action |
|---|---|
| Left stick | Move (toward where your head faces; `?aimmove` = toward the gun) |
| Left stick click / stick fully forward | Sprint |
| Left trigger | Aim down sights |
| **Left grip (hold)** | **Map**: the whole floor map appears in your left hand, live, for as long as you hold it. A small corner map is always in the HUD, bottom left |
| X | Reload (animation on the gun) |
| Y | Pause / resume (at the merchant: leave) |
| Right stick left/right | Smooth turn, 4.5 rad/s with a curve (`?turn=6`), or snap (`?snap` = 45 degrees, `?snap=30`) |
| Right stick up | Jump |
| Right stick down | Second action at a gold gate / boss door puzzle |
| Right stick click | Gear menu |
| Right trigger | Fire. In menus: press what the laser points at |
| Right grip | Pick up the gun at your feet, open the stash, use a gold gate |
| A | Swap guns |
| B | Slide |

Why this layout: shooters like Pavlov, Contractors and Onward keep the face buttons for the most frequent actions (reload, swap) and put the map or wristwatch on the off hand. With the hand reload gone, the left grip is free, so it shows the map while held. A, which used to drop the magazine, now swaps guns, which is easier to reach than the stick click. Gear moved to the right stick click, so the X+Y combo is gone. There is no D-pad anywhere.

**VR test map:** open the game with `?sandbox`, or press **VR TEST MAP** on the start card. You get a small 44x44 floor (the normal first floor is 80x80) with all the normal systems, only 2 weak monsters at a time, 400 HP and the gold gates open. One of each gun type lies at your feet (pump shotgun, rifle, SMG, bolt sniper, belt HMG, hand cannon), along with 500 gold, two mods and a helmet. Press the button again to go back to the normal game.

Reload: see "Crimson Plague reload, per weapon" above. An empty gun dry-clicks until you reload (by hand, or with X). Ammo still comes back on the game's own timer, so the rules and numbers do not change.

Other options: `?perf` (fps counter), `?xrscale=0.6..1` (render resolution, default 0.8), `?vignette`, `?gaze` (aim with the head).
