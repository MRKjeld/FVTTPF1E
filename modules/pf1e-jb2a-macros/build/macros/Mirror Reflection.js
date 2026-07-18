/* {"name":"Mirror Reflection","img":"systems/pf2e/icons/features/classes/Mirror.webp","_id":"4RJ2Whuc6uwQXJx1"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/ (checked
// spells/, feats/, items/ for mirror/reflect/duplicate/decoy-themed art; only unrelated
// hit "four-mirror.PNG" armor icon exists) and this module ships no icon of its own for
// this macro (only mirror_*.wav sounds). Left pointing at the pf2e path rather than
// inventing an unverified pf1 path — needs a human pick.
// Exit Early if Impossible to Summon
if (!game.modules.get("foundry-summons")?.active) {
  return console.warn(
    "PF1e Animations | Foundry Summons is not activated, which is required for summoning mechanics!"
  )
}

const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)

foundrySummons.openMenu({
  creatures: [
    new CONFIG.FoundrySummons.docWrapperClasses.DocWrapper(tokenD.actor),
  ],
  options: {
    autoPick: true,
    defaultSorting: false,
    defaultFilters: false,
  },
  // Fixed: item-linked invocation shapes args as [handler.workflow, handler, userData]
  // (traced via modules/autoanimations/dist/autoanimations.js.map -> workflow-data.js
  // `runMacro()`: `.macro(macro.name, {args: [handler.workflow, handler, userData]})`,
  // and `handler.item` is set in the handler constructor from `data.ammoItem || data.item`).
  // `args[0]` is `handler.workflow` (a bare string/undefined), which has no `.item` and
  // could throw on `.item` access when workflow is undefined; the real item lives at
  // `args[1].item`, matching the documented macroHelpers args[1] options-bag contract.
  flags: { item: scope.args?.[1]?.item },
})
