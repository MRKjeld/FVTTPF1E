/* {"name":"Cone Hands","img":"systems/pf2e/icons/spells/burning-hands.webp","_id":"0O8rNzIVLo8p3tXj"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "burning-hands"/"cone"/"fire-hand"-named file exists there) and this module
// ships no icon of its own for Cone Hands (a generic cone-template FX launcher used
// by multiple spells). Left pointing at the pf2e path rather than inventing an
// unverified pf1 path — needs a human pick.
const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)
const template =
  args[1]?.templateData ??
  canvas.templates.placeables[canvas.templates.placeables.length - 1]
const [templateX, templateY] = [template.x, template.y]

let file = args[2]?.[0]

if (file === "rainbow") {
  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .file("jb2a.cone_of_cold.green")
    .mask(template)
    .atLocation(template)
    .stretchTo(template)
    .scale({ y: 2 })
    .filter("ColorMatrix", { hue: 50 }, "light")
    .loopProperty("effectFilters.light", "hue", {
      from: 0,
      to: 360,
      duration: 1500,
    })
    .effect()
    .file("jb2a.cone_of_cold.green")
    .mask(template)
    .atLocation(template)
    .stretchTo(template)
    .scale({ y: 2 })
    .opacity(0.8)
    .effect()
    .file("jb2a.cone_of_cold.orange")
    .mask(template)
    .atLocation(template)
    .stretchTo(template)
    .rotate(20)
    .opacity(0.8)
    .effect()
    .file("jb2a.cone_of_cold.purple")
    .mask(template)
    .atLocation(template)
    .stretchTo(template)
    .rotate(-20)
    .opacity(0.8)
    .effect()
    .file("jb2a.cone_of_cold.purple")
    .mask(template)
    .atLocation(template)
    .stretchTo(template)
    .rotate(-10)
    .filter("ColorMatrix", { contrast: 2, hue: -60 })
    .opacity(0.8)
    .effect()
    .file("jb2a.cone_of_cold.orange")
    .mask(template)
    .atLocation(template)
    .stretchTo(template)
    .rotate(10)
    .filter("ColorMatrix", { contrast: 2, hue: 120 })
    .opacity(0.8)
    .play()
} else {
  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .file(file)
    .mask(template)
    .atLocation(template)
    .stretchTo(template)
    .scale({ y: 2 })
    .effect()
    .file(file)
    .mask(template)
    .atLocation(template)
    .stretchTo(template)
    .rotate(20)
    .effect()
    .file(file)
    .mask(template)
    .atLocation(template)
    .stretchTo(template)
    .rotate(-20)
    .play()
}
