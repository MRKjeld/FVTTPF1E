/* {"name":"Clumsy","img":"icons/skills/movement/feet-winged-boots-brown.webp","_id":"XSlxNRM032wVYBBw"} */
// PF1-TODO(clumsy-wip): Inherited from the pf2e original as an unfinished stub (hard `return`
// before any logic runs) — this predates the pf1 fork and isn't a pf1-specific defect. Unlike its
// sibling condition macros (Encumbered.js, Petrified.js), it never implements the args[0]
// on/off-detection pattern, and it's unclear how args[0] should resolve to "on"/"off" here: when
// reached via the getPf1eMacroName chat-keyword fallback (module/pf1e-animations.js's
// createChatMessage hook), args[0] is the raw chat-message data, not a literal "on"/"off" string —
// only the Automated Animations "aefx" active-effect-toggle call path
// (animations/aefx/clumsy.json) passes args[0] as one of those. Needs a human decision on whether
// to finish this the way Encumbered/Petrified do, and how to reconcile the two call sites' args[0]
// shapes. Left as a fail-safe no-op rather than guessing.
return
let token = args[1].sourceToken
let conditionOverhead = Sequencer.EffectManager.getEffects({
  name: `${token.name} - Conditions Overhead*`,
  object: token,
})

if (args[0] == "on") {
  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .name(`${token.name} - Conditions Overhead - Clumsy`)
    .attachTo(token, { bindAlpha: false })
    .copySprite(token)
    .loopProperty("spriteContainer", "rotation", {
      values: [0, 5, 0, -5],
      duration: 2000,
      pingPong: true,
    })
    .persist()
    .fadeOut(500)
    .animation()
    .on(token)
    .fadeOut(100)
    .play()
} else if (args[0] == "off") {
  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .animation()
    .fadeIn(100)
    .on(token)
    .play()
  await Sequencer.EffectManager.endEffects({
    name: `${token.name} - Conditions Overhead - Clumsy`,
    object: token,
  })
}
