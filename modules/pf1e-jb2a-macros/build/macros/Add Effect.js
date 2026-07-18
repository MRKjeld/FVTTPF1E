/* {"name":"Add Effect","img":"icons/svg/daze.svg","_id":"x3ZaL34wkz4LljPo"} */
pf1eAnimations.debug("Add Effect Macro", args)

let effect
let deleteTemplate = false

if (args[2].on) effect = args[2].on
if (args[2].on && args[2].deleteTemplate === "on") deleteTemplate = true

if (args[2].off && args[0] === "off") effect = args[2].off
if (args[2].off && args[2].deleteTemplate === "off") deleteTemplate = true

if (!effect) return
const ITEM_UUID = effect

let source = await fromUuid(ITEM_UUID)

if (!source) {
  if (args[2]?.deleteTemplate?.includes("alt")) {
    deleteTemplate = true
  } else {
    deleteTemplate = false
  }
  if (
    (args[2].altOff && effect === args[2].off) ||
    (args[2].altOn && effect === args[2].on)
  ) {
    source = await fromUuid(
      effect === args[2].altOn ? args[2].altOn : args[2].altOff
    )
  } else {
    return pf1eAnimations.debug("Add Effect - No Effect Found", args)
  }
}

source = (await fromUuid(ITEM_UUID)).toObject()
source.flags = mergeObject(source.flags ?? {}, {
  core: { sourceId: ITEM_UUID },
})

// PF1-TODO(item-type): pf2e's "effect" item type has no pf1 equivalent — pf1 has no
// "effect" entry in systems/pf1/template.json's Item.types list. The confirmed pf1
// analog for a toggleable/temporary condition-style item is the "buff" item type
// (template.json Item.buff has active/duration/hideFromToken fields matching this
// use case, and `itemTypes.buff` is used the same way in systems/pf1/pf1.js.map).
const existing = await args[1].sourceToken.actor.itemTypes.buff.find(
  (e) => e.flags.core?.sourceId === ITEM_UUID
)

await ask(source, deleteTemplate)

async function ask(source, deleteTemplate) {
  async function add() {
    // PF1-TODO(badge-stacking): pf2e's `system.badge.value` stacking-counter (used to
    // increment an existing effect instead of adding a duplicate) has no confirmed pf1
    // equivalent — pf1's "buff" item only exposes a charges-style `system.uses.value`
    // (template.json), which is not confirmed to carry the same "stack count"
    // semantics. Failing safe: skip re-adding/incrementing if a matching buff already
    // exists, rather than guess a stacking field.
    if (!existing) {
      await args[1].sourceToken.actor.createEmbeddedDocuments("Item", [source])
    } else {
      pf1eAnimations.debug("Add Effect - Effect already exists, skipping", args)
    }
    if (deleteTemplate && args[0].documentName === "MeasuredTemplate")
      args[0].delete()
  }

  if (!args[2].ask || game.settings.get("pf1e-jb2a-macros", "autoAccept")) {
    add()
    return
  } else {
    await Dialog.wait({
      title: "Add Effect?",
      content: `
			<p>Do you want to add <b>"${source.name}"</b> to your character, <b>${args[1].sourceToken.actor.name}</b>?</p>
			<p><i>You can automatically accept these in PF1e Animations settings.</i></p>
					`,
      buttons: {
        button1: {
          label: "Accept",
          callback: async () => {
            add()
          },
          icon: `<i class="fas fa-check"></i>`,
        },
        button2: {
          label: "Decline",
          icon: `<i class="fas fa-times"></i>`,
        },
      },
    }).render(true)
  }
}
