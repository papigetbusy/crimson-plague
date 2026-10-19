# Sign-off: nothing Grok makes goes into the repo or the public game until the owner says so

Owner rule (2026-10-19): a new gun or monster is **tested first, then signed off, then added to the repo**. Until the owner writes "signed off", it stays out of `main`, out of GitHub Pages, and out of the manifest.

## The steps
1. **Arrive.** Grok sends the owner's chat the model (`.glb`) or pictures. Claude receives them in the session. They are *candidates*. They are not committed.
2. **Test.** Claude builds a private test page (a Claude artifact, private to the owner) with the candidate embedded. Old gun/monster stay in the public game. The owner plays it on his phone.
3. **Fix.** The owner says what to change. Claude changes the code and the look; Grok changes the art. Repeat from step 2. Versions are named `_v1`, `_v2`.
4. **Sign-off.** The owner says "signed off" about one named version. Only then does Claude: copy that file into `assets/models/gun/` or `assets/models/monsters/`, set it in `assets/models/manifest.json`, add a line to the table below and to `docs/changelog.md`, run guard and tests, push, and check the green tick.
5. **Old art stays** as the fallback until a signed-off model replaces it.

Candidates that are not signed off are never pushed. If a candidate must be shared between sessions, it goes on a branch named `candidate/<name>` (never `main`; Pages only publishes `main`).

## Signed off
| Model | Version | Date | Owner's words |
|---|---|---|---|
| Gothic assault rifle (voxel, from Grok's side-view master and detail sheet) | candidate v6 | 2026-10-19 | "The hordes look so much better!!! ... gameplay is good, push it to the repo as the first version" |
| Crimson Horned Fiend (voxel, from Grok's front/side/back pictures) | candidate v6 | 2026-10-19 | same message |
| Bone Hound, Rock Golem, Demon Lord boss (voxel, drawn after the Crusader Tactics sprites) | first version | 2026-10-19 | same message |
| Bone Hound v2 (hand-built at twice the detail: ribs with ember glow, fangs, spiked collar) | v2 | 2026-10-19 | "Push the fix and both the hound and fiend v2 they look a lot better" |
| Crimson Horned Fiend v2 (v1 body, hand-sculpted horns, face with fangs, thicker arms; `src/models/horned_fiend_v2.js`) | v2 | 2026-10-19 | same message |
