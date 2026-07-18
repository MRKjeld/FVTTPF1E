/* {"name":"Protective Ward","img":"systems/pf2e/icons/spells/protective-ward.webp","_id":"IaIxaOh0D7roiQz1"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "protective-ward"/"ward"-named file exists there) and this module ships no icon
// of its own for Protective Ward. Left pointing at the pf2e path rather than inventing
// an unverified pf1 path — needs a human pick.
const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)

if (!args.length)
  args[0] = (await Sequencer.EffectManager.getEffects({
    origin: "protective-ward-aura",
    source: tokenD,
  }).length)
    ? "off"
    : "on"

// PF1-TODO(auras): pf2e's TokenDocumentPF2e exposes a `.auras` Collection (aura
// effects with a dynamically computed radius) that pf1 has no equivalent for —
// confirmed via systems/pf1/pf1.js.map: module/documents/token.mjs's sourcesContent
// has no "auras" concept at all. Failing safe with optional chaining so this reads
// as "unknown radius" (falls back to the 1x multiplier below) instead of throwing.
// (Note: the source key here, "aura-effect-bless", also looks like a pre-existing
// pf2e-era copy/paste artifact from Bless.js rather than something pf1-specific —
// left unchanged since it predates this port and isn't a pf1 data-model issue.)
const auraRadius = tokenD.auras?.get("aura-effect-bless")?.radius
const gridUnits = 1.5 + 3 * (isNaN(auraRadius) ? 1 : auraRadius / 5)

if (args[0] == "on") {
  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .file("jb2a.shield.01.complete.01.yellow")
    .attachTo(tokenD)
    .origin("protective-ward-aura")
    .name("PF1e x JB2A Aura - Protective Ward")
    .persist()
    .opacity(0.8)
    .size(4.5, { gridUnits: true })
    .play()
} else if (args[0] == "off") {
  await Sequencer.EffectManager.endEffects({
    origin: "protective-ward-aura",
    source: tokenD,
  })
}
