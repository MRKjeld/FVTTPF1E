Hooks.once("ready", async function () {
  if (game.modules.get("pf1-statblock-converter")?.active) {
    if (game.modules.get("pf1-statblock-converter").version.startsWith("5")) return;

    Hooks.on("sbc.loadCustomCompendiums", function (packs) {
      packs.push(
        ...[
          "pf1e-archetypes.pf-arch-features",
          "pf1e-archetypes.pf-archetypes",
          "pf1e-archetypes.pf-prestige-classes",
          "pf1e-archetypes.pf-prestige-features",
        ]
      );
    });
  }
});
