/* {"name":"Stumbling Stance","img":"systems/pf2e/icons/features/feats/stumbling-stance.webp","_id":"ya0hNKP4l4uOfoGJ"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found. `systems/pf1/icons/conditions/staggered.svg`
// / `systems/pf1/icons/feats/staggering-critical.jpg` are thematically adjacent ("stumbling" vs.
// "staggered") but represent distinct pf1 conditions/feats (mirrors the Concealed.js precedent of
// not substituting a visually-similar-but-mechanically-different icon) — left pointing at the
// pf2e path rather than guessing. Needs a human pick.
if (!args || args.length === 0) {
  const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? [])
  if (actors.length === 0 && game.user.character)
    actors.push(game.user.character)
  if (actors.length === 0) {
    const message = pf1eAnimations.localize("pf1e-jb2a-macros.notifications.noToken")
    return ui.notifications.error(message)
  }

  // PF1-TODO(mechanic): the pf2e original toggled a "Stance: Stumbling Stance" Effect item
  // sourced from Compendium.pf2e.feat-effects.BCyGDKcplkJiSAKJ — the pf2e *system's own* core
  // compendium, not this module's bundled pf1e-actions pack. That compendium doesn't exist under
  // pf1, so fromUuid(ITEM_UUID) would resolve to null and `.toObject()` would throw. Unlike
  // Mirror Image.js/Action Counter.js (whose ITEM_UUID already points at a same-module bundled
  // item), no equivalent "Stumbling Stance" buff item was found in this module's own
  // packs/actions, and systems/pf1/packs/feats is a compressed LevelDB pack not greppable from
  // this environment, so a real pf1 feats-compendium match couldn't be confirmed either way.
  // Pathfinder 1e does have a genuine "Stumbling Stance" feat (Kung Fu Style chain / Drunken
  // Master), so a pf1-native buff item may exist or be worth authoring — but until one is
  // confirmed, this fails safe as a no-op (skips the actor Effect-item toggle) rather than
  // guessing an item UUID or an "effect"→"buff" itemTypes mapping for content that may not exist.
  // Needs a human decision — see CONVERSION_STATUS.md.
  return
}

const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)

const tokenMagic = game.settings.get("pf1e-jb2a-macros", "tmfx")

if (args[0] === "on") {
  let bubbles = args[2]?.bubbles ?? 50
  let sobriety = args[2]?.sobriety ?? 2000

  if (tokenMagic) {
    let params = [
      {
        filterId: "drunk-adjustment",
        filterType: "adjustment",
        brightness: 1.75,
        red: 0.52,
        green: 0.37,
        blue: 0.26,
      },
      {
        filterId: "drunk-transform",
        filterType: "transform",
        animated: {
          rotation: {
            animType: "sinOscillation",
            val1: 356,
            val2: 369,
          },
        },
      },
    ]
    TokenMagic.addFilters(tokenD, params)
  }

  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .name("Stumbling Stance Token")
    .origin(args[1].item.uuid)
    .tieToDocuments([args[1].item])
    .copySprite(tokenD)
    .playIf(!tokenMagic)
    .zIndex(1)
    .scaleToObject(tokenD.document.texture.scaleX)
    .attachTo(tokenD, { followRotation: !tokenD.document.lockRotation })
    .preset("pf1eAnimations.fade")
    .loopProperty("sprite", "rotation", {
      values: [0, -4, 0, 6, 0],
      duration: 1500,
    })
    .persist()
    .wait(500)
    .animation()
    .on(tokenD)
    .playIf(!tokenMagic)
    .opacity(0)
    .effect()
    .name("Stumbling Stance Bubble")
    .zIndex(3)
    .origin(args[1].item.uuid)
    .file("jb2a.markers.bubble.loop.blue")
    .atLocation(tokenD, { randomOffset: 0.5 })
    .repeats(bubbles, 100, sobriety)
    .preset("pf1eAnimations.fade")
    .filter("ColorMatrix", { hue: 210 })
    .duration(3000)
    .tieToDocuments([args[1].item])
    .scaleIn(0, 500)
    .scaleOut(10, 500)
    .loopProperty("sprite", "position.y", { from: 0, to: -50, duration: 3000 })
    .scaleToObject(0.1)
    .effect()
    .name("Stumbling Stance Token Drunk")
    .zIndex(2)
    .origin(args[1].item.uuid)
    .tieToDocuments([args[1].item])
    .copySprite(tokenD)
    .playIf(!tokenMagic)
    .scaleToObject(tokenD.document.texture.scaleX)
    .attachTo(tokenD, { followRotation: !tokenD.document.lockRotation })
    .opacity(0.35)
    .preset("pf1eAnimations.fade")
    .tint("#8B4513")
    .loopProperty("sprite", "rotation", {
      values: [0, -4, 0, 6, 0],
      duration: 1500,
    })
    .persist()
    .waitUntilFinished(-500)
    .animation()
    .on(tokenD)
    .playIf(!tokenMagic)
    .opacity(1)
    .play()
} else if (args[0] == "off" && tokenMagic) {
  await TokenMagic.deleteFilters(tokenD, "drunk-transform")
  await TokenMagic.deleteFilters(tokenD, "drunk-adjustment")
}
