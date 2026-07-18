/* {"name":"Manifest Eidolon","img":"systems/pf2e/icons/features/classes/eidolon.webp","_id":"Qyoalm1R3chywfE0"} */
// PF1-TODO(icon): no pf1 equivalent found. systems/pf1/icons has no features/classes tree
// at all (confirmed by directory listing), and the only "summon*" hit anywhere under
// systems/pf1/icons is the unrelated "feats/augument-summoning.jpg" (Augment Summoning
// feat). This module ships no eidolon/summoner icon of its own either. Left pointing at
// the pf2e path rather than inventing an unverified pf1 path — needs a human pick.
// Exit Early if Impossible to Summon
if (!game.modules.get("foundry-summons")?.active) {
  return console.warn(
    "PF1e Animations | Foundry Summons is not activated, which is required for summoning mechanics!"
  )
}

// PF1-TODO(eidolon-detection): pf2e's `actor.class` getter and `Item#slug` used here have
// no pf1 equivalent. Confirmed via systems/pf1/pf1.js.map: actor-pf.mjs has no `class`
// getter, and item-pf.mjs (plus systems/pf1/template.json) has no `slug` field anywhere.
// In pf1, classes are plain Item documents (type "class") living in `actor.items`, not a
// computed actor-level getter, and pf1 has no built-in flag marking "this actor is my
// Eidolon" the way pf2e's Eidolon-class-feature build (or the third-party
// `pf2e-animal-companions` module's companion class feature, referenced by the hardcoded
// pf2e-only sourceIds below) does. Failing safe: this can no longer auto-detect Eidolons
// across the world — a human needs to decide the real pf1-side identification convention
// (e.g. an actor flag set by whatever pf1 Summoner/Eidolon workflow this module targets)
// before this filter can find anything.
let eidolons = []

if (eidolons.length === 0) {
  return ui.notifications.error("No Eidolons Found!")
}

foundrySummons.openMenu({
  creatures: eidolons.map(
    (eido) => new CONFIG.FoundrySummons.docWrapperClasses.DocWrapper(eido)
  ),
  options: {
    autoPick: true,
    defaultSorting: false,
    defaultFilters: false,
  },
  // PF1-FIX: pf1's ChatMessagePF has no `.item` property (confirmed via pf1.js.map's
  // chat-message.mjs) — the real linked item is exposed via the `itemSource` getter. Same
  // fix already applied in module/pf1e-animations.js's getPf1eMacroName/macroArgs.
  flags: { item: scope.args?.[0]?.itemSource },
})
