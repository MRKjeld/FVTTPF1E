/* {"name":"Heal","img":"systems/pf2e/icons/spells/heal.webp","_id":"BTiU7cD7DOpDFIWQ"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (only unrelated card-art variants "heal-jade/royal/sky-*.jpg" exist, not a generic
// spell icon) and this module ships no icon of its own for Heal. Left pointing at the
// pf2e path rather than inventing an unverified pf1 path — needs a human pick.
if (!scope?.args)
  return ui.notifications.warn(
    "PF1e Animations | Heal macro has been triggered with no arguments. If this was a manual activation, please use the actual spell instead."
  )

// PF1-TODO(undead-detection): the original pf2e-era undead check used
// `actor.modeOfBeing` and `actor.system.attributes.hp.negativeHealing`. Neither
// field exists in pf1 (confirmed: no match in systems/pf1/template.json, and no
// match for "modeOfBeing" in the de-minified systems/pf1/pf1.js.map source).
// pf1 tracks creature type via `creatureTypes`/`creatureSubtypes` (seen on race
// item templates in template.json), which likely aggregates onto the actor at
// a path not yet confirmed here. Failing safe: treat everyone as living (no
// negative-healing reversal) until a human confirms the real pf1 path and
// decides whether "undead" should key off creature type instead.
function undeadOrNot(actor) {
  return false
}

const sourceToken = args[1].sourceToken
const targets = args[1].hitTargets
const seq = new Sequence({ inModuleName: "PF1e Animations", softFail: true })
const spell = args[1].item
// PF1-TODO(tradition): pf2e's `spell.system.traits.value` (magic tradition tags
// like "primal"/"divine") has no pf1 equivalent — pf1 spells have no tradition
// concept, only `system.school`/`system.subschool`/`system.descriptors` and a
// loose `system.spellbook` string. Failing safe: always use the "divine"
// (yellow) animation variant rather than guessing a mapping. A human should
// decide whether to key this off `spell.system.school` (e.g. conjuration/
// healing-flavored schools) or drop the color variation entirely.
let tradition = "divine"

seq
  .effect()
  .file(
    `jb2a.cast_shape.circle.01.${tradition === "divine" ? "yellow" : "green"}`
  )
  .atLocation(sourceToken)
  .scaleToObject(2.5)
  .aboveLighting()
  .zIndex(2)
  .effect()
  .file(
    `jb2a.divine_smite.caster.${
      tradition === "divine" ? "blueyellow" : "greenorange"
    }`
  )
  .atLocation(sourceToken)
  .scaleToObject(2)
  .aboveLighting()
  .zIndex(1)
  .waitUntilFinished()

// Note: this branch is reached via a different invocation path than the rest of
// this macro. animations/templatefx/heal.json wires this macro directly by name
// with args: "{ deleteTemplate: true }" (matches args[2] below) — i.e. it's
// triggered through Automated Animations' own template-linked playback, not
// through pf1e-animations.js's createChatMessage hook. args[0] here is a
// MeasuredTemplateDocument, not the chat-message data used elsewhere in this
// file. Confirmed by tracing call sites (SKILL.md Step 2); not verified against
// the (minified) autoanimations module's exact invocation behavior.
if (args[0]?.collectionName === "templates") {
  const template = args[0]

  // Burst
  seq
    .effect()
    .file(
      `jb2a.template_circle.out_pulse.02.burst.${
        tradition === "divine" ? "yellowwhite" : "greenorange"
      }`
    )
    .scaleToObject()
    .atLocation(template, { bindVisibility: false })
    .thenDo(() => {
      if (args[2].deleteTemplate) template.delete()
    })

  // Every Target in Range
  canvas.tokens.placeables
    .filter((x) => x.actor.type === "npc" || x.actor.type === "character")
    .forEach((token) => {
      // Undead casters don't want to hurt themselves, do they?
      if (token.id === sourceToken.id && undeadOrNot(sourceToken.actor)) return

      const ray = new Ray(token.center, template)
      const distance = canvas.grid.measureDistances([{ ray }])

      // Exit early if out of range.
      if (distance > template.distance) return

      seq
        .effect()
        .file(
          `jb2a.magic_missile.${tradition === "divine" ? "yellow" : "green"}`
        )
        .stretchTo(token, { randomOffset: 0.5 })
        .atLocation(sourceToken)
        .randomizeMirrorY()
        .repeats(2)
        .effect()
        .delay(1000)
        .file(
          undeadOrNot(token.actor)
            ? `jb2a.divine_smite.target.${
                tradition === "divine" ? "blueyellow" : "greenyellow"
              }`
            : `jb2a.healing_generic.200px.${
                tradition === "divine" ? "yellow02" : "green"
              }`
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
          ? `jb2a.magic_missile.${tradition === "divine" ? "yellow" : "green"}`
          : undeadOrNot(token.actor)
          ? `jb2a.unarmed_strike.magical.01.${
              tradition === "divine" ? "yellow" : "green"
            }`
          : `jb2a.bullet.01.${tradition === "divine" ? "orange" : "green"}`
      )
      .waitUntilFinished(-1000)

    if (
      sourceToken.distanceTo(token) > sourceToken.actor.system.traits.reach.base
    ) {
      seq.randomizeMirrorY().repeats(2)
    }

    seq
      .effect()
      .file(
        undeadOrNot(token.actor)
          ? `jb2a.divine_smite.target.${
              tradition === "divine" ? "blueyellow" : "greenyellow"
            }`
          : `jb2a.healing_generic.200px.${
              tradition === "divine" ? "yellow02" : "green"
            }`
      )
      .scaleToObject(1.5)
      .attachTo(token)
  })
}

seq.play()
