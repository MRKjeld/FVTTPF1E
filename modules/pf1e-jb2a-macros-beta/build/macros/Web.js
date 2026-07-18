/* {"name":"Web","img":"systems/pf2e/icons/spells/web.webp","_id":"X6PZ0lboOsQSY8KO"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "web"/"entangle"/"spider"-named spell icon exists there; the closest hit,
// systems/pf1/icons/items/inventory/webs.jpg, is an inventory-item icon, not a
// spell icon) and this module ships no icon of its own for Web. Left pointing
// at the pf2e path rather than inventing an unverified pf1 path — needs a
// human pick.
const template =
  args[1]?.templateData ??
  canvas.templates.placeables[canvas.templates.placeables.length - 1]
new Sequence({ moduleName: "PF1e Animations", softFail: true })
  .effect()
  .file("jb2a.web.01")
  .mask(template)
  .attachTo(template)
  .persist()
  .scaleToObject()
  .belowTokens()
  .name("Web Spell")
  .effect()
  .file("jb2a.web.01")
  .mask(template)
  .attachTo(template)
  .persist()
  .opacity(0.3)
  .scaleToObject()
  .name("Web Spell")
  .play()
