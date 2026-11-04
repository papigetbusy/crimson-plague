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

## What Crimson Plague does in VR
| Control | Action |
|---|---|
| Left stick | Move (toward where your head faces; `?aimmove` = toward the gun) |
| Left stick click / stick fully forward | Sprint |
| Left trigger | Aim down sights |
| Left grip | Support hand: hold the foregrip (two-handed aim), take a magazine at the hip or over the shoulder, rack the slide |
| X | Swap guns |
| Y | Pause / resume; X + Y = big map |
| Right stick left/right | Smooth turn, 4.5 rad/s with a curve (`?turn=6`), or snap (`?snap` = 45 degrees, `?snap=30`) |
| Right stick up | Jump |
| Right stick down | Second action at a gold gate / boss door puzzle |
| Right stick click | Gear menu |
| Right trigger | Fire. In menus: press what the laser points at |
| Right grip | Grab: pick up the gun at your feet, open the stash, use a gold gate |
| A | Drop the magazine (hand reload). `?easyreload`: A reloads |
| B | Slide |

Hand reload, step by step: **A** (magazine drops, the game's normal reload timer starts) -> **left grip at your belt or over your shoulder** (a magazine appears in your hand) -> **touch it to the bottom of the gun** -> if the gun was empty, **left grip on the back of the gun and pull back 7cm**. The trigger is held until the steps are done; an empty gun clicks (no auto reload). Ammo still comes back on the game's timer, so the rules and numbers do not change.

Other options: `?perf` (fps counter), `?xrscale=0.6..1` (render resolution, default 0.8), `?vignette`, `?gaze` (aim with the head).
