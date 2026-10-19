# Gothic Assault Rifle — Model Sheet Prompt for Claude

**What this is:**  
Reference model sheet for the primary first-person gun in Crimson Plague.  
Use the locked functional views (front, side, back, top, sights/muzzle detail) as the single source of truth. The gun must be usable in first-person: clear sights, proper barrel, magazine, grip, and stock.

**Art style lock (must match exactly):**
- Voxel / MagicaVoxel / chunky pixel aesthetic. Solid cubes only, hard edges, no smooth sculpting.
- Palette: deep crimson red and dark charcoal / black, glowing orange-red accents on muzzle, receiver, and sight.
- Gothic / occult details: angular spikes, subtle runes or cross motifs, but keep the silhouette functional and readable.
- Matte voxel shading, no glossy PBR. Glow is limited to the orange-red emissive accents.
- Orthographic technical model-sheet lighting. Plain neutral dark gray background.

**Functional requirements for the game model (from art-contract.md):**
- Origin at the center of the receiver (where grip meets body). Length ~1.5 units stock to muzzle. Faces -Z.
- Required named nodes: body, mag (pivot at top), bolt, sight, muzzle (empty at barrel tip), sight_dot (empty, must be at x=0), eject, hand_grip, hand_fore, hand_mag.
- Iron sights or compact scope must stay clear. When aiming down sights, the player must be able to see over the receiver. Nothing blocks the lower half of the screen.
- Magazine must be separate so it can drop and insert. Muzzle empty node is where flash and tracers start.
- Do not model the hands. The game draws gloved hands from the hand anchors.

**Prompt to use when generating or rebuilding the model:**
"Orthographic voxel gothic functional assault rifle. Deep crimson red and dark charcoal, glowing orange-red accents on muzzle and receiver. Clear iron sights or compact scope, proper barrel, magazine, pistol grip, stock. MagicaVoxel solid cubes only, hard edges, matte shading. Match the locked master front view exactly. Neutral dark gray background, technical model sheet lighting for game viewmodel."

Keep every view consistent with the master front. Do not change the functional silhouette, sight placement, or color palette.
