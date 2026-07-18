/* {"name":"Panache","img":"systems/pf2e/icons/features/classes/panache.webp","_id":"6yeZBx2HjHHrQIRp"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found — systems/pf1/icons has no
// features/classes/ tree at all (same gap noted for Manifest Eidolon), and this
// module ships no swashbuckler/panache-themed icon of its own. Left pointing at
// the pf2e path rather than inventing an unverified pf1 path — needs a human pick.
// PF1-TODO(mechanic): this file itself contains no pf2e "Panache" resource logic
// (no reads of any panache point-pool, no swashbuckler feat checks) — it is a pure
// token-border/wind toggle animation keyed off an arbitrary Sequencer effect
// `origin: "panache"` string, triggered externally (via animations/aefx/panache.json,
// out of scope for this .js-only pass) whenever a linked buff/effect is
// applied/removed. Since pf1 has no Panache mechanic, nothing in this specific
// module actually calls this macro today; it remains usable as a generic
// on/off toggle animation if a GM links a custom pf1 buff item to it.
const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)

let testArgs

if (!args.length)
  testArgs = (await Sequencer.EffectManager.getEffects({
    origin: "panache",
    source: tokenD,
  }).length)
    ? "off"
    : "on"

const assets = game.modules.get("JB2A_DnD5e")?.active
  ? ["jb2a.token_border.circle.static.blue.004"]
  : ["jb2a.token_border.circle.static.blue.008"]

if (args[0] == "on" || testArgs === "on") {
  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .file("jb2a.antilife_shell.blue_no_circle")
    .origin("panache")
    .name(tokenD.name + "'s Panache")
    .attachTo(tokenD)
    .tieToDocuments(args.length ? args[1].item : [])
    .filter("ColorMatrix", {
      hue: 190,
    })
    .scaleToObject(2 * tokenScale)
    .waitUntilFinished(-1500)
    .effect()
    .file("jb2a.wind_stream.white")
    .origin("panache")
    .name(tokenD.name + "'s Panache")
    .attachTo(tokenD)
    .tieToDocuments(args.length ? args[1].item : [])
    .scaleToObject(tokenScale)
    .rotate(90)
    .fadeOut(1500)
    .mask()
    .fadeIn(700)
    .persist(true, { persistTokenPrototype: true })
    .effect()
    .file(assets[0])
    .origin("panache")
    .name(tokenD.name + "'s Panache")
    .attachTo(tokenD)
    .tieToDocuments(args.length ? args[1].item : [])
    .filter("ColorMatrix", {
      hue: 190,
    })
    .fadeOut(3000)
    .scaleToObject(2 * tokenScale)
    .fadeIn(700)
    .persist(true, { persistTokenPrototype: true })
    .play()
} else if (testArgs === "off") {
  await Sequencer.EffectManager.endEffects({
    origin: "panache",
    object: tokenD,
  })
}
