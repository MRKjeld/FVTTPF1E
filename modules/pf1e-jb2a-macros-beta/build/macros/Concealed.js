/* {"name":"Concealed","img":"systems/pf2e/icons/conditions/concealed.webp","_id":"regre2pHDzP3YCnA"} */
const [tokenD] = pf1eAnimations.macroHelpers(args)
const tokenMagic = game.settings.get("pf1e-jb2a-macros", "tmfx")

if (!args.length)
  args[0] = tokenMagic
    ? TokenMagic.hasFilterId(tokenD, "Concealed")
      ? "off"
      : "on"
    : null

if (
  TokenMagic.hasFilterId(tokenD, "Blur") ||
  TokenMagic.hasFilterId(tokenD, "Heat Haze")
)
  return

const params = [
  {
    filterType: "xfire",
    filterId: "Concealed",
    time: 0,
    color: 0xbbddee,
    blend: 1,
    amplitude: 1,
    dispersion: 0,
    chromatic: false,
    scaleX: 1,
    scaleY: 1,
    inlay: false,
    animated: {
      time: {
        active: true,
        speed: -0.0015,
        animType: "move",
      },
    },
  },
]

pf1eAnimations.applyTokenMagic(args, params)
