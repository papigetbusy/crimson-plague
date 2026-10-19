# Art contract: what Grok delivers, what Claude does with it

Grok makes the art. Claude wires it in. This file is the handoff, so nothing gets guessed.
Rule: **a model never decides a rule.** It only looks right and exposes named anchor points. The referee says when a shot, reload or hit happens; the screen plays the model.

## Pictures first (current way of working)
Grok drops reference pictures in `art-drop/gun/` and `art-drop/monsters/` (see `art-drop/README.md`). Claude builds the 3D models from them in code, following the anchors below, and puts the results in `assets/models/`. Finished `.glb` files from Grok are also welcome, same rules.

## Format (all models)
- **glTF Binary (`.glb`)**, one file per model, textures embedded. Under 1 MB each.
- **Voxel / chunky pixel look** matching the reference: dark iron, crimson, gold trim, small gems. Boxes and blocky shapes, hard edges, no smooth sculpting.
- Textures: PNG, **128 x 128 or smaller**, hand-pixeled look. Claude renders them with nearest-neighbour filtering, so pixels stay crisp.
- Materials: plain base-colour texture or vertex colours. No PBR tricks, no transparency except where listed. Claude lights them with simple Lambert shading and torch light.
- No lights, cameras or animations baked in. Claude animates in code (recoil, reload, walk).
- Units: **1 unit = 1 metre as the game uses it** (see sizes below). +Y up, the model **faces -Z** (muzzle / front points to -Z). Origin as listed per model.
- Triangle budget: gun up to 3,000; monster up to 1,500.
- File names: lowercase, underscores, versioned when changed: `gun_rifle_v1.glb`. Never overwrite an approved file; add `_v2`.

## Gun: `assets/models/gun/<name>.glb`
Origin: the centre of the receiver, where the grip meets the body. Gun length about **1.5 units** from stock to muzzle.

Separate named nodes (empty or mesh), so Claude can move them:
| Node name | What it is |
|---|---|
| `body` | everything that stays still (receiver, barrel, stock, handguard, grip) |
| `mag` | the magazine alone, its top at the mag well, so it can slide out and in. Pivot at its top centre |
| `bolt` | charging handle / bolt. It slides back and forward on an empty reload. Pivot at rest position |
| `sight` | the red dot housing. Slim and low: open frame, thin posts, small hood. The view through it must stay clear |
| `muzzle` | empty node at the barrel tip, where the flash and tracer start |
| `sight_dot` | empty node exactly where the red dot shows, centred left-right. **Must sit at x = 0** |
| `eject` | empty node at the ejection port (shells, optional) |
| `hand_grip` | empty node where the right hand holds the pistol grip |
| `hand_fore` | empty node where the left hand holds the handguard |
| `hand_mag` | empty node at the mag's lower half, where the left hand grabs it on reload |

Aim-down-sights rule: Claude lines `sight_dot` up with the centre of the screen. Keep the top of the sight low enough that the shooter sees over the receiver, and keep nothing in the middle of the screen's lower half when aiming. Do not model the hands. Claude draws gloved hands from the three hand anchors.

Hypershot-style quality target: chunky, readable silhouette, gold trim, gems, small details (rails, vents, a gem in the grip). One gun first. More guns later, each its own file following this same table, so the code never changes per gun.

## Monsters: `assets/models/monsters/<name>.glb`
Origin: **at the feet, centred**. Facing -Z. Height about **2.2 units**, body radius about **0.5**. These sizes match the referee's hit shapes (body, chest, head); if a model must be taller or wider, write it in `docs/art-requests.md` and Claude changes the hit shapes. Art never changes hitboxes by itself.

Named nodes (all optional but wanted, so Claude can animate):
| Node name | What it is |
|---|---|
| `root` | the whole monster |
| `torso`, `head` | torso, head (head pivot at the neck) |
| `arm_l`, `arm_r` | arms, pivot at the shoulder |
| `leg_l`, `leg_r` | legs, pivot at the hip |
| `eyes` | glowing eyes, a separate mesh so Claude can pulse it |
| `hit_head` | empty node at the head centre, where crit numbers appear |

If a monster has no limbs (a floating thing), only `root`, `head`, `eyes`.

## How Claude loads them (not Grok's job)
- `GLTFLoader` from `cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js`, files served from the Pages site (`/assets/models/...`).
- If a file is missing, the game falls back to the built-in blocky gun or demon, so the game always runs.
- A small manifest, `assets/models/manifest.json`, lists the active files:
  `{ "gun": "gun/gun_rifle_v1.glb", "monsters": ["monsters/demon_v1.glb"] }`
  Claude reads it at start. To switch models, change the manifest.

## Checklist before Grok pushes a model
- [ ] `.glb`, under 1 MB, textures 128px or smaller
- [ ] Faces -Z, +Y up, origin as listed
- [ ] All required node names present, exactly spelled
- [ ] `sight_dot` at x = 0
- [ ] A `preview/<name>/index.html` with a labelled picture so the owner can see it on his phone
- [ ] A line in `docs/changelog.md`
