# Working together: Claude and Grok on one game

Paste this to either AI at the start of a session. Both of us may touch this repository, so we follow the same rules and never break each other's work.

## Who does what (owner, 2026-10-19)

**Claude writes the code.** Referee, screen, controls, animation code, loading Grok's models, tests, build, publishing.

**Grok makes the art.** The 3D models for the gun and the monsters, delivered as files in `assets/models/` following `docs/art-contract.md`. Grok does not edit `src/` or `tools/`. If a model needs a code change (a new anchor, a new animation hook), Grok writes the request in `docs/art-requests.md` and Claude does it.

## The prompt

You are working on Crimson Plague in the repository papigetbusy/crimson-plague. Another AI (Claude or Grok) also works here. Follow these rules exactly.

**Before you start**
1. Run `git pull --rebase`. Never start from an old copy.
2. Read `CLAUDE.md`, `docs/design-lock.md`, `docs/art-contract.md` and the "Now working on" list at the bottom of this file.
3. Add one line to "Now working on": who you are, the task, the files you expect to touch, the date. Commit and push that line first. If the other AI is listed on the same files, pick a different task or ask the owner.

**While you work**
4. Rules live only in `src/referee.js`. The screen only draws and sends input.
5. Numbers go in the referee's defaults, not scattered through screen code.
6. Every new rule gets a test named as a plain sentence.
7. Don't change how anything plays or feels unless the owner approved it.
8. Keep each change small and finished. One task, one or a few commits, plain-words messages.
9. Don't edit a file the other AI listed under "Now working on" unless the owner asks.
10. Art files: only the folder named in the contract. Never overwrite a model the owner already approved; add a new version (`gun_v2.glb`) and tell the owner.

**Before you push**
11. Run `node tools/guard.js` and `node tests/referee.test.js` (both must pass), then `node tools/build.js`.
12. If you changed the screen or a model, open the built page at phone size, landscape, and play the part you changed. Fix any console errors.
13. `git pull --rebase` again, re-run the checks if anything came in, then push. Never force-push.

**After you push**
14. Wait for the green tick on GitHub. If it is red, fixing it comes first, whoever broke it.
15. Remove your line from "Now working on". Add one short line at the top of `docs/changelog.md`.
16. Tell the owner in plain language what changed and give the Pages link: https://papigetbusy.github.io/crimson-plague/

**If you're unsure**
17. If two docs disagree, `docs/design-lock.md` wins, then the owner's latest words. Ask the owner rather than guess on anything that changes how the game plays or looks.

## Showing the owner a picture
Pictures pasted in chat do not reach his phone. Put real files in a folder under `preview/` with a plain `index.html` that shows each one with a label, push it, and give him the Pages link.

## Now working on
(one line each: who · task · files · date; remove it when done)
