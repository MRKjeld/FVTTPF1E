/* {"name":"Persistent Conditions","img":"icons/skills/wounds/blood-drip-droplet-red.webp","_id":"Q0hKSbLmADnVbKQB"} */
// PF1-FIX: pf1's ChatMessagePF has no `.token` property at all (confirmed via
// pf1.js.map's chat-message.mjs — only `speaker`, `itemSource`, `targets`, and
// `measureTemplate` getters exist, no `.token`). args[0].token always evaluated
// to undefined here, so use the shared macroHelpers contract (args[1].sourceToken,
// falling back to canvas.tokens.controlled[0]) like every other macro in this
// module, instead of the pf2e-era args[0].token access.
const [tokenD] = pf1eAnimations.macroHelpers(args)
// PF1-TODO(persistent-damage): pf2e's ChatMessage exposes `isDamageRoll` /
// `rolls[0].options.evaluatePersistent` flags that don't exist anywhere in pf1
// (confirmed absent from every file embedded in pf1.js.map). Under pf1's hook,
// this macro is only ever reached via the "Received regeneration/fast healing"
// flavor match, so the formula-parsing fallback below is effectively unreachable
// today. Left in place — with defensive fallbacks so it fails safe (falls through
// to the existing `default:` notification below) instead of throwing — in case a
// future pf1 hook update starts feeding real persistent-damage rolls through here.
// The "last word of the formula is the damage type" parsing itself is an unverified
// carryover from pf2e's roll-formula shape and has not been confirmed against pf1's.
let type = (args[0].flavor ?? "").match(/Received (regeneration|fast healing)/g)
  ? "healing"
  : (args[0].rolls[0]?.formula ?? "").replaceAll(/.+ /g, "").trim()
let color = "jb2a.liquid.splash.red"
let scale = 1.5
let below = false

switch (type.toLowerCase()) {
  case "piercing":
  case "slashing":
  case "bleed":
    color = "jb2a.liquid.splash.red"
    break
  case "acid":
    color = "jb2a.liquid.splash.green"
    break
  case "bludgeoning":
    below = true
    scale = 2.5
    color = "jb2a.impact.ground_crack.blue.03"
    break
  case "good":
    color = "jb2a.divine_smite.caster.yellowwhite"
    break
  case "evil":
    color = "jb2a.divine_smite.caster.dark_red"
    break
  case "lawful":
    color = "jb2a.divine_smite.caster.orange"
    break
  case "chaotic":
    color = "jb2a.divine_smite.caster.purplepink"
    break
  case "sonic":
    color = "jb2a.thunderwave.center.blue"
    break
  case "electricity":
    scale = 2
    color = "jb2a.token_border.circle.static.blue.003"
    break
  case "cold":
    scale = 2
    color = "jb2a.impact_themed.ice_shard.blue"
    break
  case "force":
    below = true
    scale = 3
    color = "jb2a.impact.ground_crack.blue.01"
    break
  case "mental":
    color = "jb2a.magic_signs.rune.enchantment.intro.purple"
    break
  case "poison":
    color = "jb2a.icon.poison.dark_green"
    break
  case "negative":
    color = "jb2a.healing_generic.200px.purple"
    break
  case "positive":
    color = "jb2a.healing_generic.400px.yellow"
    break
  case "healing":
    color = "jb2a.healing_generic.400px.green"
    break
  case "fire":
    color = "jb2a.shield_themed.below.fire.02.orange"
    break
  default:
    ui.notifications.error(`Can't find animation for ${type}`)
}

new Sequence({ moduleName: "PF1e Animations", softFail: true })
  .effect()
  .belowTokens(below)
  .fadeIn(500)
  .fadeOut(500)
  .attachTo(tokenD)
  .scaleToObject(scale)
  .file(color)
  .duration(1200)
  .play()
