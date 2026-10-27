# Eldervale — art direction

## Mood

A lived-in woodland, seen in the warm light between morning and afternoon. This is a world of timber, soft stone, moss, woven cloth, and small acts of kindness. Magic is luminous but restrained. Silhouettes and materials remain readable at gameplay scale.

## Common palette

| Role                             | Colors                                     |
| -------------------------------- | ------------------------------------------ |
| Outlines / deepest forest        | `#233d36`, `#203e34`                       |
| Forest shadows                   | `#2d553b`, `#36593c`                       |
| Leaves / grass                   | `#416d42`, `#527b45`, `#5a8549`, `#72944f` |
| Leaf highlights                  | `#7b9c54`, `#9aac64`                       |
| Autumn foliage                   | `#69723f`, `#8b8c49`, `#b0a257`, `#c5b369` |
| Wood                             | `#725340`, `#a17a50`, `#c6a16a`            |
| Terracotta                       | `#794438`, `#b36543`, `#d38a57`            |
| Stone                            | `#596e64`, `#889383`, `#b2b29a`            |
| Water                            | `#34747a`, `#43868a`, `#6ba5a0`            |
| Warm highlights / metal fittings | `#c8a66a`, `#dfc181`, `#efe0b6`            |

Light comes from the upper left. Shadows lean cool and green; highlights lean cream and ochre. Avoid pure black, pure white, heavily saturated colors, and indiscriminate noise.

## Scale and construction

- **Terrain grid:** 16 × 16 source pixels.
- **Characters:** 32 × 40 source pixels. Feet sit on a consistent baseline. Heads are large enough for hair, skin, and expressions to remain legible.
- **Ordinary creatures:** 32–40 pixels wide. The guardian is 64 × 80.
- **UI item icons:** 24 × 24 pixels, with the same materials and outline colors as world equipment.
- **Buildings:** 80–128 pixels wide, with coordinated plaster, structural timber, roof tiles, window boxes, and warm interior light.
- **Trees:** 64 × 88, built from asymmetrical nested leaf clusters. Their shadows, bark, roots, and leaf light all follow the common palette.

Display raster assets with nearest-neighbor sampling. High-resolution text is a separate rendering layer so readable names do not compromise the pixel art.

The illustrated field map is exported by Aseprite from the same terrain and object sprites, at half scale. `scripts/export-world.mjs` supplies the authoritative map layout before the art build so the illustration and walkable world stay aligned.

## Character materials and customization

Three exact three-color ramps identify recolorable materials:

| Material | Base      | Highlight | Shadow    |
| -------- | --------- | --------- | --------- |
| Skin     | `#e8bc94` | `#f3d7b0` | `#b88062` |
| Hair     | `#87603e` | `#b08a5b` | `#594431` |
| Cloth    | `#73916a` | `#a0b181` | `#4a6950` |

`src/game/assets.ts` replaces these exact ramps once per appearance and caches the result. Outlines, weapons, armor, and jewelry retain their material colors.

- **Warrior:** muted steel, broad shoulder plates, a shield, visible blade, and compact sturdy posture.
- **Archer:** leather, green cloth, a quiver and bow, with a lighter silhouette.
- **Mage:** a long, trimmed robe, circlet, and a crystal-tipped staff.

Skin color, hair color, hairstyle, and silhouette do not affect combat statistics.

## Animation

Character sheets have eight columns and twelve rows. Row index is `action * 4 + direction`:

- Actions: idle, walk, attack.
- Directions: south, east, north, west.
- Eight frames per row, with identically named frame tags in each source document.

Idle animation is a subtle breathing shift. Walk cycles transfer weight between the legs and continue that movement through the torso and cloth. Attack poses carry weapon motion and are supplemented with separately authored visual effects.

Slimes squash and stretch. Mushrooms bob with their steps. Wolves alternate their legs and carry weight through the body. The guardian breathes heavily, with branches and moss moving together. Water, motes, spell bursts, and arcs use eight-frame loops or short one-shot sequences.

## Adding assets

1. Add a drawing function or curated shape in `art/build.lua` using the existing palette and primitives.
2. Use `save()` to write both an editable source and a runtime sheet. Register animation tags for animated sprites.
3. Run `npm run assets` with Aseprite.
4. Inspect at both native resolution and normal gameplay zoom.
5. Add map placement or metadata in `shared/world.js` / `shared/data.js` where appropriate.

The generator is deterministic. Procedural scatter adds restrained texture, while key silhouettes, architecture, characters, equipment, and scene composition are explicitly authored.
