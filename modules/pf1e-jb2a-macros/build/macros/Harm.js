/* {"name":"Harm","img":"systems/pf2e/icons/spells/harm.webp","_id":"kz6IN257FJ58SgmE"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "harm"-named file on disk) and this module ships no icon of its own for Harm.
// Left pointing at the pf2e path rather than inventing an unverified pf1 path —
// needs a human pick. Mirrors the same open judgment call already logged for Heal.js.
if (!scope?.args)
  return ui.notifications.warn(
    "PF1e Animations | Harm macro has been triggered with no arguments. If this was a manual activation, please use the actual spell instead."
  )

// PF1-TODO(undead-detection): the original pf2e-era undead check used
// `actor.modeOfBeing` and `actor.system.attributes.hp.negativeHealing`. Neither
// field exists in pf1 (confirmed: no match in systems/pf1/template.json, and no
// match for "modeOfBeing"/"negativeHealing" in the de-minified systems/pf1/pf1.js.map
// source). pf1 tracks creature type via `creatureTypes`/`creatureSubtypes` (seen on
// race item templates in template.json), which likely aggregates onto the actor at
// a path not yet confirmed here. Failing safe: treat everyone as living (no
// damage/healing reversal) until a human confirms the real pf1 path and decides
// whether "undead" should key off creature type instead. Mirrors the identical
// judgment call already made in Heal.js for consistency.
function undeadOrNot(actor) {
  return false
}

const sourceToken = args[1].sourceToken
const targets = args[1].hitTargets
const seq = new Sequence({ inModuleName: "PF1e Animations", softFail: true })

seq
  .effect()
  .file("jb2a.cast_generic.01.dark_purple.0")
  .atLocation(sourceToken)
  .scaleToObject(1.5)
  .aboveLighting()
  .waitUntilFinished()

if (args[0]?.collectionName === "templates") {
  const template = args[0]

  // Burst
  seq
    .effect()
    .file("jb2a.template_circle.out_pulse.02.burst.purplepink")
    .scaleToObject()
    .atLocation(template, { bindVisibility: false })
    .thenDo(() => {
      if (args[2].deleteTemplate) template.delete()
    })

  // Every Target in Range
  canvas.tokens.placeables
    .filter((x) => x.actor.type === "npc" || x.actor.type === "character")
    .forEach((token) => {
      const ray = new Ray(token.center, template)
      const distance = canvas.grid.measureDistances([{ ray }])

      // Living casters don't want to hurt themselves, do they?
      if (token.id === sourceToken.id && !undeadOrNot(sourceToken.actor)) return

      // Exit early if out of range.
      if (distance > template.distance) return

      seq
        .effect()
        .file("jb2a.magic_missile.dark_red")
        .stretchTo(token, { randomOffset: 0.5 })
        .atLocation(sourceToken)
        .filter("ColorMatrix", {
          hue: 280,
        })
        .randomizeMirrorY()
        .repeats(2)
        .effect()
        .delay(1000)
        .file(
          undeadOrNot(token.actor)
            ? "jb2a.healing_generic.200px.purple"
            : "jb2a.divine_smite.target.dark_purple"
        )
        .scaleToObject(1.5)
        .attachTo(token)
    })
} else {
  targets.forEach((token) => {
    seq
      .effect()
      .stretchTo(token, { randomOffset: 0.5 })
      .atLocation(sourceToken)
      .file(
        sourceToken.distanceTo(token) > sourceToken.actor.system.traits.reach.base
          ? "jb2a.magic_missile.dark_red"
          : "jb2a.unarmed_strike.magical.01.dark_purple"
      )
      .waitUntilFinished(-1000)

    if (
      sourceToken.distanceTo(token) > sourceToken.actor.system.traits.reach.base
    ) {
      seq
        .filter("ColorMatrix", {
          hue: 280,
        })
        .randomizeMirrorY()
        .repeats(2)
    }

    seq
      .effect()
      .file(
        undeadOrNot(token.actor)
          ? "jb2a.healing_generic.200px.purple"
          : "jb2a.divine_smite.target.dark_purple"
      )
      .scaleToObject(1.5)
      .attachTo(token)
  })
}

seq.play()

