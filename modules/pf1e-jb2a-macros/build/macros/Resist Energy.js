/* {"name":"Resist Energy","img":"systems/pf2e/icons/spells/resist-energy.webp","_id":"b8famAvfE5pMj2TM"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/ (no
// "resist"/"energy"-named file exists there). The closest thematic matches —
// shielding-fire-1.jpg, shielding-acid-1.jpg, etc. — are single-element variants and would
// misrepresent this macro, which covers all five energy types. Left pointing at the pf2e
// path rather than guessing — needs a human pick.
if (!args.length) {
  const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? [])
  if (actors.length === 0 && game.user.character)
    actors.push(game.user.character)
  if (actors.length === 0) {
    return ui.notifications.error(
      pf1eAnimations.localize("pf1e-jb2a-macros.notifications.noToken")
    )
  }

  // PF1-TODO(compendium-id): the original pf2e ITEM_UUID pointed at "Spell Effect: Resist
  // Energy" in pf2e's own system compendium (pf2e.spell-effects). pf1 ships no equivalent
  // system-provided spell-effects compendium, and this module's own pf1e-actions pack
  // (packs/actions, LevelDB) can't be inspected from this environment to confirm a real item
  // id exists for "Resist Energy" the way Mirror Image.js's conversion assumed one did for
  // Mirror Image (`15XurJzUEax6FhA7`, itself unverified). Rather than repeat an unverified
  // guess, ITEM_UUID is left unset and this toggle branch fails safe (no-op) until a human
  // confirms the right pf1 buff/action item to add/remove here.
  const ITEM_UUID = null
  const sourceDoc = ITEM_UUID ? await fromUuid(ITEM_UUID) : null
  if (!sourceDoc) {
    return pf1eAnimations.debug(
      "Resist Energy",
      "no verified pf1 toggle-item UUID configured; skipping add/remove"
    )
  }
  const source = sourceDoc.toObject()
  source.flags = mergeObject(source.flags ?? {}, {
    core: { sourceId: ITEM_UUID },
  })

  for (const actor of actors) {
    // PF1-TODO(item-type): pf2e's "effect" item type has no pf1 equivalent — pf1's item
    // types are weapon/equipment/consumable/loot/class/spell/feat/buff/attack/race/implant/
    // container (systems/pf1/template.json), so `actor.itemTypes.effect` is undefined in pf1
    // and would throw on `.find(...)`. Closest analog is "buff" (see Add Effect.js/Action
    // Counter.js/Mirror Image.js precedent), not confirmed 1:1. Optional-chained so this
    // fails safe (dead code anyway while ITEM_UUID above is null).
    const existing = actor.itemTypes.buff?.find(
      (e) => e.flags.core?.sourceId === ITEM_UUID
    )
    if (existing) {
      await existing.delete()
    } else {
      await actor.createEmbeddedDocuments("Item", [source])
    }
  }
} else {
  if (args[0] === "off") return

  const colors = {
    acid: -80,
    cold: 45,
    electricity: -130,
    fire: -150,
    sonic: 0,
  }

  const item = args[1].item
  // PF1-TODO(descriptor): pf2e stored the player's chosen resisted-energy type via a
  // rule-element selection (`item.flags.pf2e.rulesSelections.resistEnergyType`). pf1 has no
  // equivalent flag/rule-element convention for this kind of per-cast runtime choice
  // (confirmed absent from `systems/pf1/pf1.js.map`'s item-spell.mjs and from
  // template.json's spell/buff schemas — `spell.system.descriptors` is the closest analog
  // but is a fixed authoring-time array, not a per-cast player choice). Left optional-chained
  // to undefined so every elemental-specific overlay below (`playIf(type === ...)`) simply
  // skips and only the generic shield effects play, rather than guessing a mapping.
  const type = item.flags?.pf2e?.rulesSelections?.resistEnergyType
  const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)
  const color = colors[type]

  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .origin(item.uuid)
    .tieToDocuments(item)
    .attachTo(tokenD)
    .persist()
    .fadeIn(500)
    .fadeOut(500)
    .file("jb2a.energy_field.01.blue")
    .mask()
    .scaleToObject(1.6 * tokenScale)
    .loopProperty("spriteContainer", "scale.x", {
      from: 0.9,
      to: 1.1,
      duration: 3000,
      pingPong: true,
      ease: "easeInOutSine",
    })
    .loopProperty("spriteContainer", "scale.y", {
      from: 0.9,
      to: 1.1,
      duration: 3000,
      pingPong: true,
      ease: "easeInOutSine",
    })
    .filter("ColorMatrix", { hue: color })
    .effect()
    .origin(item.uuid)
    .attachTo(tokenD)
    .persist()
    .fadeIn(500)
    .fadeOut(500)
    .tieToDocuments(item)
    .file("jb2a.energy_field.01.blue")
    .mask()
    .scaleToObject(1.5 * tokenScale)
    .filter("ColorMatrix", { hue: color })
    .effect()
    .origin(item.uuid)
    .attachTo(tokenD)
    .persist()
    .fadeIn(500)
    .playIf(type === "electricity")
    .fadeOut(500)
    .tieToDocuments(item)
    .file("jb2a.static_electricity.01.yellow")
    .mask()
    .scaleToObject(1.2 * tokenScale)
    .effect()
    .origin(item.uuid)
    .attachTo(tokenD)
    .persist()
    .fadeIn(500)
    .playIf(type === "cold")
    .fadeOut(500)
    .tieToDocuments(item)
    .loopProperty("sprite", "rotation", {
      values: [0, 20, 0, -20, 0],
      duration: 2500,
    })
    .file("jb2a.shield_themed.above.ice.03.blue")
    .mask()
    .scaleToObject(1.5 * tokenScale)
    .effect()
    .origin(item.uuid)
    .attachTo(tokenD)
    .persist()
    .fadeIn(500)
    .belowTokens()
    .playIf(type === "cold")
    .loopProperty("sprite", "rotation", {
      values: [0, 20, 0, -20, 0],
      duration: 2500,
    })
    .fadeOut(500)
    .tieToDocuments(item)
    .file("jb2a.shield_themed.below.ice.03.blue")
    .mask()
    .scaleToObject(1.5 * tokenScale)
    .effect()
    .origin(item.uuid)
    .attachTo(tokenD)
    .persist()
    .fadeIn(500)
    .repeats(3, 3000)
    .playIf(type === "acid")
    .loopProperty("sprite", "rotation", { from: 0, to: 360, duration: 4000 })
    .loopProperty("spriteContainer", "rotation", {
      from: 0,
      to: 360,
      duration: 9000,
    })
    .spriteOffset({ x: 0.6 }, { gridUnits: true })
    .fadeOut(500)
    .zeroSpriteRotation()
    .tieToDocuments(item)
    .file("jb2a.liquid.blob.green")
    .scaleToObject(0.2 * tokenScale)
    .waitUntilFinished(-500)
    .effect()
    .origin(item.uuid)
    .attachTo(tokenD)
    .fadeIn(500)
    .playIf(type === "acid")
    .fadeOut(500)
    .belowTokens()
    .zeroSpriteRotation()
    .tieToDocuments(item)
    .file("jb2a.liquid.splash.green")
    .scaleToObject(2 * tokenScale)
    .waitUntilFinished()
    .effect()
    .origin(item.uuid)
    .attachTo(tokenD, { align: "top-right" })
    .fadeIn(500)
    .persist()
    .playIf(type === "fire")
    .fadeOut(500)
    .belowTokens()
    .tieToDocuments(item)
    .file("jb2a.fumes.fire.orange")
    .scaleToObject(1.5 * tokenScale)
    .effect()
    .origin(item.uuid)
    .attachTo(tokenD)
    .fadeIn(500)
    .persist()
    .playIf(type === "sonic")
    .fadeOut(500)
    .tieToDocuments(item)
    .file("jb2a.extras.tmfx.border.circle.outpulse.02.normal")
    .scaleToObject(1.2 * tokenScale)
    .play()
}
