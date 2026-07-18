/* {"name":"Pummeling Rubble","img":"systems/pf2e/icons/spells/pummeling-rubble.webp","_id":"nlYSBFttAhdWpyla"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "rubble"/"pummel"-named file exists there; the "rock-*.jpg" files present are
// unreferenced anywhere in systems/pf1's own packs, so their intended subject is
// unconfirmed) and this module ships no icon of its own for Pummeling Rubble. Left
// pointing at the pf2e path rather than inventing an unverified pf1 path — needs a
// human pick.
const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)
const template =
  args[1]?.templateData ??
  canvas.templates.placeables[canvas.templates.placeables.length - 1]
const [templateX, templateY] = [template.x, template.y]
new Sequence({ moduleName: "PF1e Animations", softFail: true })
  .effect()
  .file("jb2a.falling_rocks.side.1x1")
  .mask(template)
  .atLocation(tokenD)
  .stretchTo(template, { offset: { x: 100 } })
  .fadeOut(400)
  .scale({ x: 0.7, y: 1.0 })
  .play()
