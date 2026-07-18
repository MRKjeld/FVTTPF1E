# Compatibility Notes

The rule is simple: keep version checks out of the generator, editor, and UI code whenever possible. If Foundry changed how something/anything behaves between versions, the adaptation belongs here.

- `FoundryVersion.js`
  - Small helper for checking the current Foundry generation.
  - Everything else should depend on this instead of rolling its own version checks.

- `TileCompatibility.js`
  - Handles the V14 tile anchor change.
  - Internally, the module still treats tile document coordinates as the top-left of the grid cell.
  - On V14+, tile texture anchors are pinned to `(0, 0)` so placement stays aligned without changing the rest of the grid math.

- `SceneBackgroundCompatibility.js`
  - Handles the V14 scene background move.
  - V13 still uses `Scene#backgroundColor`.
  - V13 still uses `Scene#background.src` for image backgrounds.
  - V14 stores the effective color and image values on the scene's initial level background instead.

The goal here is to avoid scattering `if (isV14OrNewer())` branches all over the module.

If I decide to drop V13 support later or add support for say V15, V16 and so on. This folder is the place to tackle it all.
