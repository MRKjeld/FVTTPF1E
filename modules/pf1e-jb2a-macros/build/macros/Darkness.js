/* {"name":"Darkness","img":"systems/pf2e/icons/spells/darkness.webp","_id":"ooHL5fVdUQbWIlIh"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "darkness"-named file exists there) and this module ships no icon of its own
// for Darkness. Left pointing at the pf2e path rather than inventing an unverified
// pf1 path — needs a human pick.
// Just updates the template with perfect vision data.
// If used standalone, it updates the latest placed template.

const flag = {
  "perfect-vision": {
    visionLimitation: {
      enabled: true,
      sight: 0,
      sound: null,
      move: null,
      other: null,
      detection: {
        basicSight: 0,
        feelTremor: null,
        hearing: null,
        seeAll: 0,
        seeInvisibility: 0,
        senseAll: null,
        senseInvisibility: null,
      },
    },
  },
}

// Fixed args[] contract usage: the only confirmed call site (the
// getPf1eMacroName chat-keyword rule in module/pf1e-animations.js) always
// passes a 2-element macroArgs array, so the old `args.length` truthy check
// always took the args[1].templateData branch — but the hook's options bag
// (per args-and-hooks.md) never actually sets templateData, so this would
// always throw. Matches the `args[1]?.templateData ?? <last placed template>`
// fallback pattern already used by Web.js/Dazzling Flash.js/Lightning Bolt.js
// and others in this module.
const template =
  args[1]?.templateData ??
  canvas.templates.placeables[canvas.templates.placeables.length - 1].document

await template.update({ flags: flag })
