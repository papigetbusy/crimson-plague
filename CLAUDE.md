# Working on Crimson Plague

Keep the code neat: small focused files and functions in clear folders, never one long tangled monolith (owner, 2026-10-19: no fixed line limit, but no monolith). Read `docs/design-lock.md`, `docs/art-contract.md` and `docs/roadmap.md` before changing anything. They are the rules of this project. **Work only on the current phase in the roadmap**; if the owner asks for something from a later phase, say so and ask before jumping ahead.

- The owner is not a programmer. Explain in plain language, one sentence per choice. He checks work on his iPhone: the green tick on GitHub and the published link (landscape phone).
- **Claude writes code. Grok makes art** (3D models for the gun and monsters). Claude never invents final art once Grok's models are in; Grok never edits `src/`. The handoff is `docs/art-contract.md`.
- `src/referee.js` owns every rule and number: movement, hits, damage, monster AI, ammo, reload timing, kills. It may not use the browser, clock, network, files or unseeded random (`tools/guard.js` enforces this).
- `src/screen.js` only draws the referee's snapshot and sends inputs. No rules, no game state of its own.
- Numbers live in the referee's `cfg` / defaults, never buried in screen code. Look-only numbers (colours, model offsets) live in screen.js.
- Every referee rule gets a test in `tests/` named as a plain sentence.
- Log every finished piece of work as one plain line at the top of `docs/changelog.md`.
- Push only when the owner has asked for the work. Commit messages say what changed in plain words.
- Claude and Grok both touch this repo: follow `docs/working-together.md` (pull first, claim the task, checks before and after pushing).

## If your turn was restarted
- **Start of every turn:** run `git status` and read `.claude-wip.md` if it exists, before changing anything.
- **`.claude-wip.md` exists:** an earlier run of you started this task. Its uncommitted changes are yours. Read them, run the checks, carry on from the steps not ticked.
- **Uncommitted changes but no `.claude-wip.md`:** they may be Grok's or the owner's. Look before touching them, ask if unsure.
- **Before your first edit on a task,** write `.claude-wip.md`: the request in the owner's words, the time, the plan as `- [ ]` steps, the files you expect to touch. Delete it once the push is green.
- **Never commit with `git commit -a` or `-am`.** `git status`, then `git add` only this task's files.

## Commands
- `node tests/referee.test.js` : referee tests
- `node tests/loop.test.js` : core loop checks (waves, xp, skills, boss, game over)
- `python3 tools/smoke_loop.py` : level-up / game over / boss HUD on a phone-sized page
- `node tests/models.test.js` : model checks (sight clear, anchors, face budget)
- `node tests/pad.test.js` : controller checks (Hypershot layout, dead zones, right-stick turn)
- `node tests/touch.test.js` : touch button settings checks (size range, what can be hidden)
- `python3 tools/smoke_pad.py` : fake-controller run on phone and desktop sizes (connect, play, level-up, pause, unplug)
- `node tools/preview_models.js rifle|fiend out.json` then `python3 tools/preview_models.py out.json out.png side|front|back|three|top` : draws a model with no GPU
- `node tools/guard.js` : architecture guard
- `node tools/build.js` : builds `site/index.html` (one playable page)
- `python3 tools/smoke.py` : phone/desktop smoke test (needs Playwright)
