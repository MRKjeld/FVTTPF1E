/* {"name":"Dimension Door","img":"systems/pf2e/icons/spells/dimension-door.webp","_id":"kwbdUhAzZv8mv1cX"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (that tree uses generic effect-themed filenames, not spell-name-based ones — no
// teleport/portal/door match) and this module ships no icon of its own for
// Dimension Door. Left pointing at the pf2e path rather than inventing an
// unverified pf1 path — needs a human pick.
if (!game.modules.get("jb2a_patreon")?.active) {
  return ui.notifications.error(pf1eAnimations.localize("notifications.noPrem"))
}

const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)

// Item comes through args[1] per the macroHelpers options-bag contract (see
// args-and-hooks.md), not args[0] — the crosshairs call below already reads
// args[1]?.item correctly. pf1 spell items expose a flat system.level number
// (data-model-map.md), unlike pf2e's wrapped item.level.value.
let spellLevel = args[1]?.item?.system?.level ?? 11

if (spellLevel === 11 && args.length !== 0)
  pf1eAnimations.debug(
    "Dimension Door Macro",
    "I have args yet I don't have a proper spell level, defaulting to 11, help?"
  )

let range = spellLevel < 5 ? 120 : 1000

const location = await pf1eAnimations.crosshairs(
  { tokenD, item: args[1]?.item },
  { range, openSheet: false, noCollision: spellLevel < 5 }
)

if (!location || location.cancelled) {
  tokenD.actor.sheet.maximize()
  return
}

await Sequencer.Preloader.preloadForClients([
  "jb2a.magic_signs.rune.conjuration.intro.blue",
  "jb2a.portals.vertical.vortex.blue",
])
const portalScale = (tokenD.w / canvas.grid.size) * 0.6
new Sequence({ moduleName: "PF1e Animations", softFail: true })
  .effect()
  .file("jb2a.magic_signs.rune.conjuration.intro.blue")
  .atLocation(tokenD)
  .scale(portalScale * 0.7)
  .opacity(0.7)
  .waitUntilFinished(-200)
  .effect()
  .file("jb2a.portals.vertical.vortex.blue")
  .atLocation(tokenD, { cacheLocation: true })
  .name("Portal In")
  .center()
  .spriteOffset({ y: -0.5 }, { gridUnits: true })
  .rotateTowards(location, { rotationOffset: 90 })
  .scale(portalScale)
  .duration(1200)
  .fadeIn(200)
  .fadeOut(500)
  .belowTokens()
  .effect() //location.rotationFromOrigin
  .copySprite(tokenD)
  .atLocation(tokenD)
  .shape("circle", {
    radius: 0.8,
    gridUnits: true,
    fillColor: "#ffffff",
    isMask: true,
  })
  .rotate(-location.rotationFromOrigin)
  .spriteRotation(-location.rotationFromOrigin)
  .duration(1000)
  .animateProperty("sprite", "position.y", {
    from: 0,
    to: -1,
    duration: 750,
    gridUnits: true,
    fromEnd: true,
  })
  .scale(tokenD.document.toObject().scale)
  .waitUntilFinished(-750)
  .animation()
  .on(tokenD)
  .opacity(0)
  .effect()
  .file("jb2a.portals.vertical.vortex.blue")
  .atLocation(location)
  .name("Portal Out")
  .center()
  .spriteOffset({ y: -0.5 }, { gridUnits: true })
  .rotateTowards(tokenD, { rotationOffset: 90 })
  .scale(portalScale)
  .duration(1200)
  .fadeIn(200)
  .fadeOut(500)
  .belowTokens()
  .effect() //location.rotationFromOrigin
  .copySprite(tokenD)
  .scale(tokenD.document.toObject().scale)
  .atLocation(location)
  .shape("circle", {
    radius: 0.8,
    gridUnits: true,
    fillColor: "#ffffff",
    isMask: true,
  })
  .rotate(-location.rotationFromOrigin)
  .spriteRotation(-location.rotationFromOrigin)
  .animateProperty("sprite", "position.y", {
    from: 1,
    to: 0,
    duration: 750,
    gridUnits: true,
  })
  .duration(1000)
  .waitUntilFinished(-250)
  .animation()
  .teleportTo(location) // Teleport to location
  .snapToGrid()
  .on(tokenD)
  .opacity(1)
  .thenDo(() => {
    tokenD.actor.sheet.maximize()
  })
  .play()
