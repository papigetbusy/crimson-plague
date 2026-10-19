# Crimson Horned Fiend — Model Sheet Prompt for Claude

**What this is:**  
Reference character sheet for the main melee monster in Crimson Plague.  
Use these locked views (master front, side, back, ¾, head/horns close-up, claws/feet) as the single source of truth. Do not invent a new design.

**Art style lock (must match exactly):**
- Voxel / MagicaVoxel / chunky pixel aesthetic. Solid cubes only, hard edges, no smooth sculpting.
- Palette: deep crimson red body, dark charcoal / black shadows and accents, glowing orange-red eyes and small glowing details.
- Gothic / occult silhouette: large curved horns, spiked shoulders, clawed hands and feet, broad chest.
- Matte voxel shading, no glossy PBR, no transparency except the glow on eyes.
- Orthographic technical model-sheet lighting. Plain neutral dark gray background.

**Functional requirements for the game model:**
- Origin at the feet, centered. Faces -Z. Height ~2.2 units, body radius ~0.5.
- Named nodes: root, torso, head (pivot at neck), arm_l, arm_r, leg_l, leg_r, eyes (separate mesh for glow pulse), hit_head (empty node at head center).
- Keep the silhouette readable at a distance. Horns and shoulders must stay distinct.
- Eyes must be a separate mesh so the game can pulse the glow.

**Prompt to use when generating or rebuilding the model:**
"Orthographic voxel gothic monster character sheet. Deep crimson red body, dark charcoal accents, large curved horns, glowing orange-red eyes, spiked shoulders, clawed hands and feet. MagicaVoxel solid cubes only, hard edges, matte shading. Match the locked master front view exactly. Neutral dark gray background, technical model sheet lighting."

Keep every view consistent with the master front. Do not change proportions, horn shape, or color palette.
