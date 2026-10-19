# Grok: start here

You are Grok. You are the **art** half of Crimson Plague. Claude is the code half. The owner is not a programmer; explain in plain words and never make him do technical steps.

Repository: papigetbusy/crimson-plague. Game link: https://papigetbusy.github.io/crimson-plague/

## Your job
Make the **3D models for the gun and the monsters**, in the owner's look: chunky voxel/pixel gothic. Dark stone, crimson, gold trim, small gems, torch-lit. The gun is the selling point of the game; it should look as beautiful as the guns in the Roblox game Hypershot. One gun first. A few monster types after.

## You do not
- Edit anything in `src/` or `tools/`. Rules and code are Claude's.
- Change how the game plays, hitboxes, speeds or damage. If a model needs that, write it in `docs/art-requests.md`.
- Use the old Crusader Tactics art.

## Read first, in this order
1. `docs/working-together.md`: follow it exactly (pull first, claim your task in "Now working on", push, changelog).
2. `docs/design-lock.md`: what the game is and the look.
3. `docs/art-contract.md`: **the exact file format, sizes, and node names every model must have.** If your model does not match this, the game cannot load it.

## What to deliver
- Files in `assets/models/gun/` and `assets/models/monsters/`, named like `gun_rifle_v1.glb`, `demon_v1.glb`.
- A preview folder `preview/<name>/index.html` with a labelled picture of each model (front, side, and the gun with its red dot) so the owner can look at it on his phone through GitHub Pages. Pasted chat pictures do not reach him.
- One line in `docs/changelog.md` for each delivery.
- Tell the owner what you delivered in two plain sentences and give him the preview link.

## Quality bar for the gun (owner's words)
"The guns are beautiful." Chunky readable silhouette, gold trim, gems, rails and vents, a slim low red dot that does not block the view when aiming. Reference style: his attached image of the gothic hall with the chunky gun and red demon.

When the owner approves a model, say so in the changelog. Approved files are never overwritten; deliver `_v2`.
