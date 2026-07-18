/* {"name":"Haunting Hymn","img":"systems/pf2e/icons/spells/haunting-hymn.webp","_id":"OOYnWts6o8nGdhC6"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "hymn"/"haunt"/"song"/"bard"/"perform"-named file exists there) and this module
// ships no icon of its own for this. Left pointing at the pf2e path rather than
// inventing an unverified pf1 path — needs a human pick.
const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)
const template =
  args[1]?.templateData ??
  canvas.templates.placeables[canvas.templates.placeables.length - 1]
const [templateX, templateY] = [template.x, template.y]
new Sequence({ moduleName: "PF1e Animations", softFail: true })
  .effect()
  .file("jb2a.template_circle.out_pulse.01.burst")
  .mask(template)
  .atLocation(tokenD)
  .randomRotation()
  .play()
