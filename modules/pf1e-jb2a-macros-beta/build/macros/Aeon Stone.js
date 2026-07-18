/* {"name":"Aeon Stone","img":"icons/commodities/gems/gem-faceted-diamond-silver-.webp","_id":"8M1lDOo679Hsj80q"} */
// Cannot be used standalone.

const tokenD = args[1].sourceToken

if (!tokenD)
  return console.warn(
    "PF1e Animations | Can't find token for Aeon Stone animation, exiting early."
  )

let stone = "jb2a.ioun_stones.01"
let colors = {}
// PF1-TODO(aeon-stone-name-key): pf2e Aeon Stones expose a system-generated
// `item.slug` (e.g. "aeon-stone-clear-spindle") that pf1 items do not have
// (confirmed: no `slug` field/getter anywhere in systems/pf1/pf1.js.map's
// item-*.mjs sources or template.json). Falling back to `item.name`, since
// that's the only universal identifier pf1 items expose. The exact naming
// convention used by real pf1 "Aeon Stone" items (Ultimate Equipment/Distant
// Worlds content) was not available to verify in this repo's compendiums
// (LevelDB blocks are compressed and not greppable as plain text), so this
// match is best-effort: unmatched names safely fall through to the
// `default:` case below (random ioun stone animation) instead of throwing.
let stoneType = (args[1].item?.name ?? "")
  .toLowerCase()
  .replace(/aeon stone/g, "")
  .replace(/[(),]/g, "")
  .replace(/\s+/g, " ")
  .trim()
let stoneScale = 0.15

// pf1 has no pf2e-style "invested" mechanic (data-model-map.md: no equivalent
// concept). The item-update hook (module/pf1e-animations.js, off-limits here)
// only ever reports "equipped" or false for pf1 items, so "equipped" is the
// closest pf1-native analog to pf2e's "invested" activation state and is used
// here instead.
if (args[0] === "equipped") {
  switch (stoneType) {
    case "clear spindle":
      stone = "jb2a.ioun_stones.01.white.regeneration"
      break
    case "dull grey":
      colors = { brightness: 0.9, saturate: -1 }
      break
    case "agate ellipsoid":
      stone = "jb2a.ioun_stones.02.purple.absorption"
      colors = { hue: 200 }
      break
    case "azure briolette":
      stone = "jb2a.ioun_stones.02.purple.absorption"
      colors = { hue: 670 }
      break
    case "black pearl":
      stone = "jb2a.ioun_stones.01.blue.insight"
      colors = { brightness: 0.2 }
      break
    case "orange prism":
      stone = "jb2a.ioun_stones.02.pink.fortitude"
      colors = { hue: 95 }
      break
    case "gold nodule":
      stone = "jb2a.ioun_stones.01.blue.awareness"
      colors = { hue: 525 }
      break
    case "clear quartz octagon":
      stone = "jb2a.ioun_stones.01.pink.protection"
      colors = { brightness: 1, saturate: -1 }
      break
    case "pearlescent pyramid":
      stone = "jb2a.ioun_stones.02.pink.fortitude"
      colors = { brightness: 1, saturate: -1 }
      break
    case "dusty rose prism":
      stone = "jb2a.ioun_stones.01.pink.fortitude"
      colors = { saturate: -0.2 }
      break
    case "lavender and green ellipsoid":
      stone = "jb2a.ioun_stones.02.purple.absorption"
      colors = { hue: 200 }
      break
    case "pale orange rhomboid":
      stone = "jb2a.ioun_stones.01.blue.strength"
      colors = { saturate: -0.2, hue: 200 }
      break
    case "pink rhomboid":
      stone = "jb2a.ioun_stones.01.blue.strength"
      colors = { hue: 490 }
      break
    case "tourmaline sphere":
      stone = "jb2a.ioun_stones.02.red.intellect"
      colors = { brightness: 1.6, hue: -60 }
      break
    case "western star":
      stone = "jb2a.twinkling_stars.points04.orange"
      stoneScale = 0.6
      break
    case "pale lavender ellipsoid":
      stone = "jb2a.ioun_stones.01.purple.absorption"
      colors = { brightness: 1.3 }
      break
    case "pearly white spindle":
      stone = "jb2a.ioun_stones.02.white.sustenance"
      break

    default:
      console.warn(
        "PF1e Animations | Cannot find '" +
          stoneType +
          "', picking a random ioun stone animation."
      )
      break
  }

  await Sequencer.Preloader.preloadForClients(stone)

  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .file(stone)
    .attachTo(tokenD, { followRotation: false })
    .scale(stoneScale)
    .spriteOffset({ y: 0.5 }, { gridUnits: true })
    .filter("ColorMatrix", colors)
    .zeroSpriteRotation()
    .animateProperty("sprite", "position.y", {
      from: 0,
      to: 0.5,
      duration: 3000,
      gridUnits: true,
    })
    .animateProperty("sprite", "position.y", {
      from: 0.5,
      to: 0,
      duration: 3000,
      gridUnits: true,
      fromEnd: true,
    })
    .loopProperty("spriteContainer", "rotation", {
      from: 0,
      to: 360,
      duration: 6000,
    })
    .loopProperty("sprite", "rotation", {
      values: [0, -30, 0, 30],
      duration: 1500,
      pingPong: true,
    })
    .scaleOut(0, 800)
    .scaleIn(0, 800)
    .tieToDocuments(args[1].item)
    .persist(true, { persistTokenPrototype: true })
    .name(`${args[1].sourceToken.name} - Aeon Stone - ${stoneType}`)
    .extraEndDuration(3000)
    .play()
} else {
  await Sequencer.EffectManager.endEffects({
    name: `${args[1].sourceToken.name} - Aeon Stone - ${stoneType}`,
    object: tokenD,
  })
}
