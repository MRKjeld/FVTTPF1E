/* {"name":"Unseen Servant","img":"systems/pf2e/icons/spells/unseen-servant.webp","_id":"Qm37tEena7Pm60rS"} */
// PF1-TODO(icon): no confirmed pf1 equivalent found under systems/pf1/icons/ (checked
// spells/, feats/, items/, conditions/ for servant/invisible/force/spectral-themed art;
// only unrelated hits like conditions/invisible.png) and this module ships no icon of
// its own for this macro. Left pointing at the pf2e path rather than inventing an
// unverified pf1 path -- needs a human pick.
// Exit Early if Impossible to Summon
if (!game.modules.get("foundry-summons")?.active) {
  return console.warn(
    "PF1e Animations | Foundry Summons is not activated, which is required for summoning mechanics!"
  )
}

// PF1-TODO(summon-actor): no pf1-native summon-prop Actor found for this macro. The
// pf2e reference (Compendium.pf2e.pathfinder-bestiary.Actor.j7NNPfZwD19BwSEZ) actually
// resolves to an Actor named "Phantasmal Minion" (matching this animation's ontoken
// label), not "Unseen Servant" itself -- checked systems/pf1/packs/basic-monsters,
// monster-templates, and this module's own compendia for an equivalent prop actor and
// found none (pf1 has no official stat block for this spell's summoned force either).
// Left pointing at the pf2e Actor for now (still resolvable cross-system in Foundry,
// though its stat block is pf2e-authored and won't reflect pf1 rules) rather than
// invent a pf1 UUID; failing safe below if it can't be resolved at all.
const summonedActor = await fromUuid(
  "Compendium.pf2e.pathfinder-bestiary.Actor.j7NNPfZwD19BwSEZ"
)
if (!summonedActor) {
  return console.warn(
    "PF1e Animations | Unseen Servant | Could not resolve the summon actor, aborting."
  )
}

foundrySummons.openMenu({
  creatures: [
    new CONFIG.FoundrySummons.docWrapperClasses.DocWrapper(summonedActor),
  ],
  options: {
    autoPick: true,
    defaultSorting: false,
    defaultFilters: false,
  },
  // Fixed: this macro is invoked from animations/ontoken/phantasmal-minion.json's
  // "macro" section with playWhen "2", which traces (via
  // modules/autoanimations/dist/autoanimations.js.map -> router/traffic-cop.js's
  // playMacro() -> workflow-data.js's runMacro()) to
  // `.macro(macro.name, {args: [handler.workflow, handler, userData]})` -- the same
  // shape confirmed for Mirror Reflection.js. `args[0]` is `handler.workflow` (a bare
  // string/undefined with no `.item`), while the real item lives at `handler.item`
  // (set in the handler constructor from `data.ammoItem || data.item`), i.e.
  // `args[1].item`, matching the documented macroHelpers args[1] options-bag contract.
  flags: { item: scope.args?.[1]?.item },
})
