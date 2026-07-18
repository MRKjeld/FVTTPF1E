/* {"name":"Dancing Lights","img":"icons/magic/fire/projectile-fireball-orange-green.webp","_id":"Y5ZQ659Z4oV552Z9"} */
// Exit Early if Impossible to Summon
if (!game.modules.get("foundry-summons")?.active) {
  return console.warn(
    "PF1e Animations | Foundry Summons is not activated, which is required for summoning mechanics!"
  )
}

// PF1 fix: hardcoded `${game.system.id}-actors` resolved to the nonexistent
// pack `pf1-actors`. Real pack name (per module.json) is `pf1e-actors` — use
// the same fallback-chain pattern as the Attack Matches branch in
// module/pf1e-animations.js.
const dancingLightPack =
  game.packs.get("pf1e-jb2a-macros.pf1e-actors") ||
  game.packs.get("pf1e-jb2a-macros.pf1-actors") ||
  game.packs.get(`pf1e-jb2a-macros.${game.system.id}-actors`)
if (!dancingLightPack) {
  return ui.notifications.error(
    "PF1e Animations (Beta) | Could not find the pf1e-actors compendium pack."
  )
}
const dancingLight = await dancingLightPack.getDocument("teCoIt8sjArsIl4D")
const dancingLightObj = { ...dancingLight.toObject(), uuid: dancingLight.uuid }

const DancingLight = CONFIG.FoundrySummons.docWrapperClasses.DancingLight

foundrySummons.openMenu({
  creatures: [
    new DancingLight(dancingLightObj, "Blue-Teal"),
    new DancingLight(dancingLightObj, "Blue-Yellow"),
    new DancingLight(dancingLightObj, "Green"),
    new DancingLight(dancingLightObj, "Pink"),
    new DancingLight(dancingLightObj, "Purple-Green"),
    new DancingLight(dancingLightObj, "Red"),
    new DancingLight(dancingLightObj, "Yellow"),
  ],
  amount: { value: 4, locked: true },
  options: {
    defaultFilters: false,
    defaultSorting: false,
  },
  flags: scope?.args?.[0].toObject(),
})
