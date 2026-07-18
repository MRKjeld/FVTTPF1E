/* {"name":"Dazzling Flash","img":"systems/pf2e/icons/spells/dazzling-flash.webp","_id":"PWAdvQ9qxwTcXCsu"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "dazzl"/"flash"-named spell icon exists there) and this module ships no icon of
// its own for Dazzling Flash. Left pointing at the pf2e path rather than inventing an
// unverified pf1 path — see data-model-map.md's icon-path guidance.
const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)
const template =
  args[1]?.templateData ??
  canvas.templates.placeables[canvas.templates.placeables.length - 1]
const [templateX, templateY] = [template.x, template.y]

new Sequence({ moduleName: "PF1e Animations", softFail: true })
  .effect()
  .file("jb2a.thunderwave.center.blue")
  .mask(template)
  .attachTo(tokenD)
  // PF1: spell level is a flat number at item.system.level (pf2e nested it as
  // item.system.level.value) — confirmed via systems/pf1/template.json's "spell" type.
  // Optional-chained/defaulted to 0 since args[1].item is not guaranteed to be populated
  // on every call path (see args-and-hooks.md); fails safe to the smaller scale rather
  // than throwing.
  .scale((args[1]?.item?.system?.level ?? 0) > 2 ? 2 : 1)
  .play()
