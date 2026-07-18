/* {"name":"Rebounding Toss","img":"icons/skills/ranged/shuriken-thrown-orange.webp","_id":"1SwXNmbriolNG2ap"} */
// WIP!
return // Comment me out to test

pf1eAnimations.requireModule("warpgate")

// PF1-VERIFIED-CALLSITE: repo-wide grep for "Rebounding Toss" /
// "Compendium.pf1e-jb2a-macros.Macros.Rebounding Toss" (build/macros/*.js,
// module/pf1e-animations.js, animations/ontoken/rebounding-toss.json) shows
// this macro's only call site is the autorec "ontoken" macro binding, resolved
// by the third-party Automated Animations module via its own
// AutomatedAnimations.playAnimation()-driven pipeline (args-and-hooks.md's
// "path 1") — NOT module/pf1e-animations.js's createChatMessage hook/runMacro
// path (path 2, where args[0] is raw chat-message data). So args[0].token here
// is that third-party module's own args shape, unaffected by the pf1
// ChatMessagePF `.token`-less bug fixed elsewhere in Persistent Conditions.js;
// left unchanged.
let targets = Array.from(game.user.targets)
let token = args[0].token
// PF1-FIX: pf2e's `WeaponPF2e#isHeld` getter (drawn/wielded check) has no pf1
// equivalent (confirmed absent from template.json and pf1.js.map). pf1's
// closest analog for "usable weapon" is the general physical-item flag
// `system.equipped` (systems/pf1/template.json `physical.equipped`; same
// mapping already used for the isInvested/isEquipped fix in
// module/pf1e-animations.js's `updateItem` hook). Not identical semantics
// (pf1 has no separate "equipped but sheathed" state), but the nearest
// confirmed field.
let items = args[0].token._actor.items.filter(
  (i) => i.type === "weapon" && i.system.equipped === true
)
let weapons = []

token.actor.sheet.minimize()

let imageProperties = [
  "padding: 1em 1em",
  "border: none",
  "width: 10em",
  "height: auto",
]

items.forEach((x) =>
  weapons.push({
    label: `<img src="${x.img}" style="${imageProperties.join(";")}"><p>${
      x.name
    }</p>`,
    value: x,
  })
)

let weaponSelection = await warpgate.menu(
  {
    inputs: [
      {
        type: "info",
        label: "Which weapon are you attacking with?",
      },
      {
        type: "info",
        label:
          "Only Equipped Weapons are shown, draw your weapon first if you want to attack with it!",
      },
    ],
    buttons: weapons,
  },
  {
    title: "Rebounding Toss",
  }
)

// Second Throw BS
let distanceLimit = 10
const tokenCenter = targets[0]
let cachedDistance = 0

const checkDistance = async (crosshairs) => {
  while (crosshairs.inFlight) {
    //wait for initial render
    await warpgate.wait(100)

    const ray = new Ray(tokenCenter, crosshairs)

    const distance = canvas.grid.measureDistances([{ ray }], {
      gridSpaces: true,
    })[0]

    //only update if the distance has changed
    if (cachedDistance !== distance) {
      cachedDistance = distance
      if (distance > distanceLimit) {
        crosshairs.icon = "icons/svg/hazard.svg"
      } else {
        crosshairs.icon = weaponSelection.buttons.img
      }
      crosshairs.draw()
      crosshairs.label = `${distance} ft`
    }
  }
}

const callbacks = {
  show: checkDistance,
}

if (weaponSelection.buttons) {
  // PF1-TODO(strike-api): pf2e's `actor.system.actions` "Strikes" array (each
  // entry a `{ type: "strike", name, attack() }` object used to roll a named
  // weapon's attack programmatically) has no pf1 equivalent — confirmed
  // absent from template.json and not present as an actor-level derived
  // getter in pf1.js.map. pf1 attacks are rolled per-Item (e.g. an "attack"
  // or "weapon" type Item's own roll method), not looked up from a flat
  // per-actor strikes list keyed by name, so this lookup can't be mechanically
  // ported without redesigning how "the second throw" re-attacks with the
  // same weapon. Left as `actor.data.data.actions ?? []`, which already
  // fails safe: pf1 actors have no `.actions` array, so this always resolves
  // to `[]`, `weaponOfChoice` stays `undefined`, and `weaponOfChoice?.attack()`
  // below no-ops instead of throwing. pf1's closest native pattern (per
  // module/documents/item/item-pf.mjs extracted from pf1.js.map) is
  // per-Item: look the weapon up by name (`actor.items.getName(name)` /
  // `actor.itemTypes.weapon.find(...)`) and call `await weapon.use({ ... })`
  // — there is no actor-level name-indexed strikes list to query. Needs a
  // human design decision (see CONVERSION_STATUS.md) before this macro's
  // second-throw attack can actually roll in pf1.
  let weaponOfChoice = (actor.data.data.actions ?? [])
    .filter((action) => action.type === "strike")
    .find((strike) => strike.name === weaponSelection.buttons.data.name)

  if (targets.length === 1) {
    // Roll attack
    weaponOfChoice?.attack()

    // Check if attack hit
    const secondThrowLocation = warpgate.crosshairs.show(
      { size: token.data.width, icon: token.data.img, label: "0 ft." },
      callbacks
    )

    // Handle fuckups
    if (location.cancelled) {
      ui.notifications.error("Cancelled Rebounding Toss's second throw.")
      return
    }
    if (cachedDistance > distanceLimit) {
      ui.notifications.error(
        "Your Rebounding Toss can only attack a second target within 10 feet of the first one."
      )
      return
    }

    const boundsContains = (bounds, point) =>
      bounds.left <= point.x &&
      point.x <= bounds.right &&
      bounds.top <= point.y &&
      point.y <= bounds.bottom

    const found = !!canvas.tokens.placeables
      .map((x) => x.bounds)
      .find((b) => boundsContains(b, secondThrowLocation))
  } else if (targets.length > 1) ui.notifications.info("Too many targets!")
  else ui.notifications.info("No Targets!")
}

token.actor.sheet.maximize()
