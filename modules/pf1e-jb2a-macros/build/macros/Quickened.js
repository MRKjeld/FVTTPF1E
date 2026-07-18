/* {"name":"Quickened","img":"systems/pf2e/icons/conditions/quickened.webp","_id":"E1eKr1GPbMu11gDZ"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found. pf1's condition registry
// (systems/pf1/module/registry/conditions.mjs, confirmed via pf1.js.map) has no
// "quickened"/"haste" entry at all — pf1 models Haste as a spell buff, not a discrete
// status condition, so there's no systems/pf1/icons/conditions/ file to repoint to.
// systems/pf1/icons/spells/haste-*.jpg exist but represent the Haste spell's own art,
// not a generic "quickened" marker — left pointing at the pf2e path rather than
// guessing which one a human would prefer.
const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)

let testArgs

if (!args.length)
  testArgs = (await Sequencer.EffectManager.getEffects({
    origin: "quickened",
    source: tokenD,
  }).length)
    ? "off"
    : "on"

if (args[0] === "on" || testArgs === "on") {
  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .file("jb2a.wind_stream.white")
    .origin("quickened")
    .name("Quickened" + tokenD.name)
    .attachTo(tokenD)
    .tieToDocuments(args.length ? args[1].item : [])
    .scaleToObject(tokenScale)
    .rotate(90)
    .tint("#00FFFF")
    .fadeOut(1500)
    .mask()
    .fadeIn(700)
    .persist(true, { persistTokenPrototype: true })
    .effect()
    .file("jb2a.token_border.circle.static.blue.003")
    .origin("quickened")
    .name("Quickened" + tokenD.name)
    .attachTo(tokenD)
    .tieToDocuments(args.length ? args[1].item : [])
    .fadeOut(3000)
    .scaleToObject(2 * tokenScale)
    .fadeIn(700)
    .persist(true, { persistTokenPrototype: true })
    .play()
} else if (testArgs === "off") {
  await Sequencer.EffectManager.endEffects({
    origin: "quickened",
    object: tokenD,
  })
}
