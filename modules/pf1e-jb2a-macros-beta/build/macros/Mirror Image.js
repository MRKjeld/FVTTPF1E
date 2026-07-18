/* {"name":"Mirror Image","img":"systems/pf2e/icons/spells/mirror-image.webp","_id":"QNZOHlyOqO58lVdZ"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "mirror"/"image"/"illusion"-named file exists there) and this module ships no
// icon of its own for Mirror Image. Left pointing at the pf2e path rather than
// inventing an unverified pf1 path — needs a human pick.
const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)

if (args.length === 0) {
  const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? [])
  if (actors.length === 0 && game.user.character)
    actors.push(game.user.character)
  if (actors.length === 0) {
    const message = pf1eAnimations.localize("pf1e-jb2a-macros.notifications.noToken")
    return ui.notifications.error(message)
  }

  // PF1-TODO(pack-name): checklist item 11 — `${game.system.id}-actions` evaluates to
  // the nonexistent pack `pf1-actions`; the real pack name per module.json is
  // `pf1e-actions`. Hardcoded below.
  const ITEM_UUID = `Compendium.pf1e-jb2a-macros.pf1e-actions.15XurJzUEax6FhA7` // Mirror Image
  const source = (await fromUuid(ITEM_UUID)).toObject()
  source.flags = mergeObject(source.flags ?? {}, {
    core: { sourceId: ITEM_UUID },
  })

  for (const actor of actors) {
    // PF1-TODO(item-type): pf2e's "effect" item type has no pf1 equivalent — pf1's Item
    // types are weapon/equipment/consumable/loot/class/spell/feat/buff/attack/race/implant/container
    // (systems/pf1/template.json), so `actor.itemTypes.effect` is undefined in pf1 and would
    // throw on `.find(...)`. The closest analog is "buff" (see Add Effect.js/Action
    // Counter.js precedent), but not confirmed 1:1 until the compendium item at ITEM_UUID
    // is reauthored as a pf1 buff. Guarding with optional chaining so this fails safe
    // (always falls through to "create new item") instead of throwing.
    const existing = actor.itemTypes.effect?.find(
      (e) => e.flags.core?.sourceId === ITEM_UUID
    )
    if (existing) {
      await existing.delete()
    } else {
      await actor.createEmbeddedDocuments("Item", [source])
    }
  }
  return
}

if (args[0] === "off") return

function amountOfImages() {
  return Sequencer.EffectManager.getEffects({ origin: args[1].item.uuid })
    .length
}

Hooks.off("preUpdateItem", pf1eAnimations.hooks.mirrorImage ?? 123)

async function updateImages(data, changes) {
  // PF1-TODO(item-type): pf2e's Effect-item `system.badge.value` counter has no pf1
  // equivalent field (pf1 buffs use `system.resource.uses.value` — a "charges" concept,
  // not a simple stack counter; see Action Counter.js/Add Effect.js precedent and
  // data-model-map.md). Until the ITEM_UUID compendium item is reauthored for pf1, this
  // optional-chained check just never matches and the hook no-ops, rather than throwing.
  if (!changes?.system?.badge?.value) return
  if (!(data.name === "Mirror Image")) return

  let badgeValue = changes.system.badge.value

  pf1eAnimations.debug("Mirror Image", {
    badgeValue,
    imagesOnScreen: amountOfImages(),
  })

  if (badgeValue < amountOfImages()) {
    Sequencer.EffectManager.endEffects(
      Sequencer.EffectManager.getEffects({ origin: data.uuid }).at(-1).data
    )
  } else if (badgeValue > amountOfImages()) {
    new Sequence({ moduleName: "PF1e Animations", softFail: true })
      .addSequence(mirrorImage(amountOfImages(), data))
      .play()
  }
}

const mirrorImage = (number, origin) =>
  new Sequence({ moduleName: "PF1e Animations", softFail: false })
    .effect()
    .name("Mirror Image Nr." + (1 + number))
    .copySprite(tokenD)
    .origin(origin.uuid)
    .fadeIn(1000)
    .tieToDocuments([origin])
    .fadeOut(1000)
    .attachTo(tokenD, { followRotation: !tokenD.document.lockRotation })
    .persist(true, { persistTokenPrototype: true })
    .loopProperty("spriteContainer", "rotation", {
      from: 0,
      to: 360,
      duration: 4000,
    })
    .loopProperty("sprite", "position.x", {
      values: [0, -1],
      duration: Sequencer.Helpers.random_int_between(500, 4000),
      gridUnits: true,
      pingPong: true,
    })
    .spriteOffset({ x: 0.5 }, { gridUnits: true })
    .rotate(120 * (1 + number))
    .spriteRotation(120 * (1 + number))
    .zeroSpriteRotation()
    .scaleToObject(1 * tokenD.document.texture.scaleX)
    .opacity(0.5)

const seq = new Sequence({ moduleName: "PF1e Animations", softFail: true })
  // Blast
  .effect()
  .file("jb2a.impact.004.blue")
  .atLocation(tokenD)
  .fadeIn(500)
  .tieToDocuments([args[1].item])
  .randomRotation()
  .fadeOut(1500)
  // Illusion Mark
  .effect()
  .file("jb2a.extras.tmfx.runes.circle.simple.illusion")
  .atLocation(tokenD)
  .duration(2000)
  .fadeIn(500)
  .fadeOut(1500)
  .tieToDocuments([args[1].item])
  .scale(0.5)
  .filter("Glow", {
    color: 0x0096ff,
  })
  .scaleIn(0, 500, {
    ease: "easeOutCubic",
  })
  .waitUntilFinished(-1000)

for (let i = 0; i < 3; i++) {
  seq.addSequence(mirrorImage(i, args[1].item))
}

seq.thenDo(async () => {
  pf1eAnimations.hooks.mirrorImage = Hooks.on("preUpdateItem", updateImages)
})

seq.play()
