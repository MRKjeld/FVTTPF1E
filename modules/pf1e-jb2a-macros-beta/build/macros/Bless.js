/* {"name":"Bless","img":"systems/pf2e/icons/spells/bless.webp","_id":"y2Hundr4PzbGNeys"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "bless"-named file exists there) and this module ships no icon of its own for
// Bless. Left pointing at the pf2e path rather than inventing an unverified pf1 path —
// needs a human pick.
const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)

if (!args.length)
  args[0] = (await Sequencer.EffectManager.getEffects({
    origin: "aura-effect-bless",
    name: "PF1e x JB2A Aura - Bless*",
    source: tokenD,
  }).length)
    ? "off"
    : "on"

// PF1-TODO(auras): pf2e's TokenDocumentPF2e exposes a `.auras` Collection (aura
// effects with a dynamically computed radius) that pf1 has no equivalent for —
// confirmed via systems/pf1/pf1.js.map: module/documents/token.mjs's sourcesContent
// has no "auras" concept at all. Failing safe with optional chaining so this reads
// as "unknown radius" (falls back to the 1x multiplier below) instead of throwing.
const auraRadius = tokenD.auras?.get("aura-effect-bless")?.radius
const gridUnits = 1.5 + 3 * (isNaN(auraRadius) ? 1 : auraRadius / 5)

if (args[0] == "on") {
  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .file("jb2a.bless.400px.intro.yellow")
    .scaleIn(0, 1000, { ease: "easeInBounce" })
    .atLocation(tokenD)
    .attachTo(tokenD)
    .name("PF1e x JB2A Aura - Bless Intro")
    .origin("aura-effect-bless")
    .opacity(0.9)
    .size(gridUnits, { gridUnits: true })
    .waitUntilFinished(-2000)
    .effect()
    .delay(1500)
    .file("jb2a.bless.400px.loop.yellow")
    .atLocation(tokenD)
    .fadeOut(500)
    .persist(true, { persistTokenPrototype: true })
    .attachTo(tokenD)
    .belowTokens(true)
    .origin("aura-effect-bless")
    .name("PF1e x JB2A Aura - Bless")
    .scaleOut(2, 2500, { ease: "easeOutCubic" })
    .fadeOut(1000)
    .size(gridUnits, { gridUnits: true })
    .play()
} else if (args[0] == "off") {
  await Sequencer.EffectManager.endEffects({
    origin: "aura-effect-bless",
    name: "PF1e x JB2A Aura - Bless*",
    source: tokenD,
  })
}
