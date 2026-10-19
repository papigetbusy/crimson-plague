# Crimson Plague

First-person horde survival roguelite, Hypershot-style controls, chunky voxel gothic look. Play it on a phone held sideways: https://papigetbusy.github.io/crimson-plague/

**Claude** writes the code. **Grok** makes the 3D models. The rules for working together are in `docs/working-together.md`; Grok starts at `grok/PROMPT.md`.

| Folder | What lives there |
|---|---|
| `src/referee.js` | every rule and number (movement, hits, ammo, reload, monsters) |
| `src/screen.js` | draws the referee's snapshot, plays sounds, sends input |
| `assets/models/` | Grok's gun and monster models |
| `tests/` | referee tests |
| `tools/` | build, guard, smoke test |
| `docs/` | design lock, art contract, changelog |

Slice scope: one gun, a few respawning monsters, kill counter. No waves, skill screens, inventory or bosses yet.
