/* {"name":"Acid Flask","img":"systems/pf1/icons/items/inventory/flask.jpg","_id":"SaXHztUmj7Fh9G58"} */
// Can be used standalone!

let tokenD = args[1]?.sourceToken ?? canvas.tokens.controlled[0]
let targets = args[1]?.allTargets ?? Array.from(game.user.targets)
let target = targets[0]

if (!tokenD || !target) {
  return ui.notifications.error(
    `Missing a ${!tokenD ? "selected token" : ""}${
      !tokenD && !target ? " and " : ""
    }${!target ? "target" : ""}.`
  )
}

let projectile = ""
let explosion = [""]
let explosionRemains = [""]
let seqe = new Sequence({ moduleName: "PF1e Animations", softFail: true })
let splashBonus = 3
let mods = [{ label: `No Modifications`, value: 0 }]
let options

// Special feats
// PF1-TODO(alchemist-feats): pf2e alchemist feats "Bomber", "Expanded Splash",
// and "Directional Bombs" (matched here by exact item name, and linked via
// hardcoded pf2e compendium ids data-pack="pf2e.classfeatures"/"pf2e.feats-srd")
// have no confirmed pf1 equivalent feat/class feature/discovery. Name equality
// across systems is not mechanical equality (conversion-checklist.md #7), so
// rather than guess a pf1 mapping this whole modifier-picker branch is
// disabled below: `mods` always stays at its single "No Modifications" entry,
// the warpgate dialog never opens, and `options` stays undefined, so the
// Directional Bombs/Cone Template branch further down never triggers. A human
// should decide whether/how to re-key this off a real pf1 alchemist
// discovery/feat before re-enabling.
// if (tokenD.actor.items.filter((x) => x.name === "Bomber").length)
//   mods.push({
//     label: `<a class="entity-link content-link" data-pack="pf2e.classfeatures" data-id="7JbiaZ8bxODM5mzS"><i class="fas fa-suitcase"></i> Bomber</a>`,
//     value: "Bomber",
//   })
// if (tokenD.actor.items.filter((x) => x.name === "Expanded Splash").length)
//   mods.push({
//     label: `<a class="entity-link content-link" data-pack="pf2e.feats-srd" data-id="gyVcJfZTmBytLsXq"><i class="fas fa-suitcase"></i> Expanded Splash</a>`,
//     value: "Expanded",
//   })
// if (
//   tokenD.actor.items.filter((x) => x.name === "Directional Bombs").length
// )
//   mods.push({
//     label: `<a class="entity-link content-link" data-pack="pf2e.feats-srd" data-id="ozvYhY4hG1deXly8"><i class="fas fa-suitcase"></i> Directional Bombs</a>`,
//     value: "Directional",
//   })

if (mods.length > 1) {
  pf1eAnimations.requireModule("warpgate")
  options = await warpgate.buttonDialog({ buttons: mods }, "column")
}
// check for Expanded Splash and Bomber's singular splash feature and add 3 to splashBonus

seqe
  .effect()
  .file("jb2a.throwable.throw.flask.03.green")
  .atLocation(tokenD)
  .stretchTo(target)
  .fadeIn(300)
  .waitUntilFinished(-200)
  .macro(
    options == "Directional"
      ? "Compendium.pf1e-jb2a-macros.Macros.Cone Template"
      : "",
    target,
    {},
    [
      "jb2a.liquid.splash_side.bright_green",
      "jb2a.explosion.side_fracture.flask.03",
    ]
  )
  .effect()
  .playIf(options !== "Directional")
  .file("jb2a.liquid.splash.bright_green")
  .atLocation(target)
  .size({ width: 3.5, height: 3.5 }, { gridUnits: true })
  .effect()
  .playIf(options !== "Directional")
  .file("jb2a.explosion.side_fracture.flask.03")
  .offset({ x: 0.5, y: 0.5 }, { gridUnits: true })
  .atLocation(target)
  .rotate(180)
  .rotateTowards(token)
  .play()
