/* {"name":"Soul Siphon","img":"systems/pf2e/icons/spells/soul-siphon.webp","_id":"KXoNTv1YkjM3D9NI"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "soul"/"siphon"/"drain"-named spell icon exists there) and this module ships no
// icon of its own for this. Left pointing at the pf2e path rather than inventing an
// unverified pf1 path — see data-model-map.md's icon-path guidance.
const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)
let target = Array.from(game.user.targets)[0]
new Sequence({ moduleName: "PF1e Animations", softFail: true })
  .effect()
  .atLocation(tokenD)
  .stretchTo(target)
  .origin("soul siphon")
  .name("Soul Siphon")
  .file("jb2a.energy_strands.range.standard.dark_red")
  .waitUntilFinished(-1500)
  .effect()
  .atLocation(target)
  .stretchTo(tokenD)
  .origin("soul siphon")
  .name("Soul Siphon")
  .file("jb2a.energy_strands.range.standard.dark_red")
  .waitUntilFinished(-1500)
  .effect()
  .randomRotation()
  .scaleToObject(2)
  .origin("soul siphon")
  .name("Soul Siphon")
  .atLocation(tokenD)
  .file("jb2a.energy_strands.in.red.01.2")
  .play()
