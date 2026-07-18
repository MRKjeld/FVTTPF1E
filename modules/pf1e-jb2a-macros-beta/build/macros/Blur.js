/* {"name":"Blur","img":"systems/pf2e/icons/spells/blur.webp","_id":"FBgkeey7TaMLkegd"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/spells/
// (no "blur"-named file exists there) and this module ships no icon of its own for
// Blur. Left pointing at the pf2e path rather than inventing an unverified pf1 path —
// needs a human pick.
const [tokenD] = pf1eAnimations.macroHelpers(args)
const tokenMagic = game.settings.get("pf1e-jb2a-macros", "tmfx")
if (!args.length)
  args[0] = tokenMagic
    ? TokenMagic.hasFilterId(tokenD, "Blur")
      ? "off"
      : "on"
    : null

const params = [
  {
    filterType: "blur",
    filterId: "Blur",
    padding: 10,
    quality: 4.0,
    blur: 0,
    blurX: 0,
    blurY: 0,
    animated: {
      blurX: {
        animType: "syncCosOscillation",
        loopDuration: 500,
        val1: 0.5,
        val2: 6,
      },
      blurY: {
        animType: "syncCosOscillation",
        loopDuration: 750,
        val1: 0.5,
        val2: 6,
      },
    },
  },
]

pf1eAnimations.applyTokenMagic(args, params)
