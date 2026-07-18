# pf1e-jb2a-macros-beta conversion status

Tracks per-macro conversion progress for the pf2e-jb2a-macros → pf1e-jb2a-macros-beta port, maintained by the `pf2e-to-pf1-content-port` Claude Code skill (`.claude/skills/pf2e-to-pf1-content-port/`).

## Status values

- `not-started` — still an unconverted copy of the pf2e original.
- `converted-pending-review` — a conversion pass has been done and statically verified, but not yet manually tested in a running Foundry instance.
- `blocked` — conversion can't proceed without a decision recorded in "Needs human judgment" below.
- `done` — manually confirmed working in Foundry. Only a human sets this; the skill never marks a row `done` on its own.

`next` (see SKILL.md Step 1) picks the first `not-started` row below, top to bottom, skipping any marked `blocked`.

## Macros (63)

| Macro | Status | Notes |
|---|---|---|
| Acid Flask | converted-pending-review | Icon repointed to `systems/pf1/icons/items/inventory/flask.jpg`; pf2e-only alchemist feat checks (Bomber/Expanded Splash/Directional Bombs) disabled and flagged |
| Action Counter | converted-pending-review | Fixed icon paths, hardcoded pack name (`pf1e-actions`), i18n key, `hideFromToken`, `itemTypes.effect` guard; badge-stacking flagged |
| Add Effect | converted-pending-review | Fixed `itemTypes.effect`→`itemTypes.buff` (pf1 has no "effect" item type); badge-stacking logic flagged |
| Aeon Stone | converted-pending-review | Fixed slug lookup and `"invested"`→`"equipped"` check; surfaced a separate hook-level bug (see below) |
| Arcane Cascade | blocked | pf2e magus stance with no pf1 mechanical equivalent; crash-prone pf2e flag read made fail-safe in the meantime |
| Bane | converted-pending-review | Aura-radius API (pf2e-only) made fail-safe; icon and aura-radius flagged |
| Bardic Cantripry | converted-pending-review | Clean conversion (slug→name-derived key); no judgment calls — good candidate content match for pf1 Bardic Performance |
| Blacklist Animations | not-applicable | Already clean UI-only utility macro, no pf2e-specific content |
| Bless | converted-pending-review | Same aura pattern as Bane; icon and aura-radius flagged |
| Blur | converted-pending-review | Has a `getPf1eMacroName` regex rule already; icon flagged; pre-existing on/off-toggle quirk noted (not pf1-related) |
| Bombs | converted-pending-review | No functional changes needed; PF1-TODO comment added matching Acid Flask precedent |
| Bouncing Lightning | converted-pending-review | Icon fixed (themed match) |
| Brain Drain | converted-pending-review | Icon fixed; noted a pre-existing non-pf2e `args[2].length` bug out of scope |
| Brain Response | converted-pending-review | Only a debug leftover removed; otherwise already clean |
| Clumsy | converted-pending-review | Debug leftover removed; macro body is a pre-existing WIP stub (`return // WIP`) inherited from pf2e, left as-is |
| Concealed | converted-pending-review | Has a `getPf1eMacroName` regex rule already; icon flagged as judgment call |
| Cone Hands | converted-pending-review | Icon flagged; debug leftover removed; helper macro, no other changes |
| Cone Template | converted-pending-review | Fixed a real args[0] shape mismatch between two call sites (token vs. chat data) via duck-typing |
| Dancing Lights | converted-pending-review | Fixed checklist-11 pack-name bug; possible third args-shape crash risk via `animations/ontoken/light.json` flagged, not fixed |
| Darkness | converted-pending-review | Icon flagged; fixed a real args-contract bug (templateData access) that would have thrown |
| Dazzling Flash | converted-pending-review | Fixed item.level→item.system.level; icon flagged |
| Dimension Door | converted-pending-review | Fixed `args[0]?.item?.level`→`args[1]?.item?.system?.level`; icon flagged |
| Dimension Jumps | converted-pending-review | Fixed speed/slug/level field paths; surfaced the `data.item`/`itemSource` hook bug (now fixed) |
| Dismiss Selected Token | not-applicable | Already clean utility macro |
| Drain Bonded Item | converted-pending-review | Already clean, no changes needed |
| Encumbered | converted-pending-review | Has a `getPf1eMacroName` regex rule already; already clean, same on/off toggle cross-cutting quirk noted |
| Export Autorec JSON | not-applicable | Utility macro, not chat-triggered; already clean |
| Feral Shades | converted-pending-review | Icon flagged, otherwise clean |
| Grim Tendrils | converted-pending-review | Already clean, no changes needed |
| Harm | converted-pending-review | Fixed reach field path; undead detection made fail-safe; icon flagged (mirrors Heal.js) |
| Haunting Hymn | converted-pending-review | Icon flagged, otherwise already clean |
| Heal | converted-pending-review | Converted 2026-07-18 as the skill's dry-run exercise; 3 open judgment calls below |
| Heat Haze | converted-pending-review | Already clean, no changes needed |
| Humanoid Form | converted-pending-review | Icon fixed, debug removed, invented pf2e autoscale flag dropped and flagged |
| Illusory Disguise | converted-pending-review | Icon flagged, branding string fixed |
| Lightning Bolt | converted-pending-review | Icon fixed, otherwise already clean |
| Manifest Eidolon | converted-pending-review | Fixed `.item`→`.itemSource`; eidolon-detection made fail-safe (no pf1 equivalent) and flagged; icon flagged; see discrepancy note below re: args index |
| Mirror Image | converted-pending-review | Fixed checklist-11 pack-name bug, i18n key, itemTypes guard; icon and badge-stacking flagged |
| Mirror Reflection | converted-pending-review | Fixed a real args-index bug (scope.args[0].item→scope.args[1].item, confirmed via autoanimations source); icon flagged; same bug pattern confirmed in Manifest Eidolon/Unseen Servant/Summon Anything |
| Mirror Reflection Animation | converted-pending-review | Already clean |
| Opacity 1 | converted-pending-review | Already clean utility macro |
| Open AA | not-applicable | Utility macro, not chat-triggered; already clean |
| Overdrive | converted-pending-review | Icon fixed; confirmed correct args[1].item usage via real autoanimations source; pre-existing OFF-branch bug flagged |
| Panache | converted-pending-review | No actual pf2e mechanic logic present (purely cosmetic toggle); icon flagged |
| Persistent Conditions | converted-pending-review | Fixed a real args[0].token bug via macroHelpers; dead-but-nonthrowing branch flagged |
| Petrified | converted-pending-review | Icon fixed, bare token→tokenD bug fixed, cross-cutting toggle quirk confirmed |
| Protective Ward | converted-pending-review | Same aura pattern as Bane/Bless; icon and aura-radius flagged |
| Pummeling Rubble | converted-pending-review | Icon flagged, otherwise already clean |
| Quickened | converted-pending-review | Icon flagged; cross-cutting toggle quirk confirmed |
| Rage | converted-pending-review | Already clean; no pf1 rage system hook exists but not needed (purely cosmetic macro) |
| Rebounding Toss | converted-pending-review | Fixed isHeld→system.equipped; Strike-API second-throw block flagged fail-safe; macro is author-disabled WIP |
| Resist Energy | converted-pending-review | Fixed itemTypes.buff, i18n key; icon/compendium-id/energy-type flagged; shares cross-cutting toggle quirk |
| Scorching Ray | converted-pending-review | Icon fixed; dead pf2e/sf2e system-id branch documented (harmless) |
| Soul Siphon | converted-pending-review | Fixed bare token→tokenD bug (like Petrified); icon flagged |
| Spiritual Weapon | converted-pending-review | Text fix, icon flagged; args confirmed correct via real autoanimations source |
| Stumbling Stance | converted-pending-review | Fixed i18n key; disabled pf2e-only compendium toggle (fail-safe); icon flagged; cross-cutting toggle quirk confirmed |
| Sudden Charge | converted-pending-review | No actual pf2e mechanic logic present; debug leftover removed |
| Summon Anything | converted-pending-review | Fixed real args[0]→args[1] bug; fixed item.level/CR field paths; creature-trait filters disabled (fail-safe) and flagged |
| Tanglefoot | converted-pending-review | Icon fixed, otherwise already clean |
| Unleash Psyche | converted-pending-review | No actual pf2e mechanic logic present; icon flagged |
| Unseen Servant | converted-pending-review | Confirmed and fixed real scope.args[0].item→scope.args[1].item bug; icon and summon-actor UUID flagged (fail-safe) |
| Variable Templates | converted-pending-review | Debug leftover removed; noted pre-existing non-port typo |
| Web | converted-pending-review | Icon flagged; validated template-args pattern |

## Known plumbing bugs (module/pf1e-animations.js, not per-macro)

- **Fixed 2026-07-18**: both `runMacro()` call sites in `createChatMessage` passed a one-element `args` array instead of the two-element `[data, optionsBag]` shape `macroHelpers` expects. Now share a `macroArgs` array.
- **Fixed 2026-07-18**: the `updateItem` hook computed `status` from `data.isInvested`/`data.isEquipped` — neither field exists on pf1 Item documents (confirmed via `pf1.js.map`; pf1 uses `item.system.equipped`). Now reads `data.system?.equipped` directly.
- **Fixed 2026-07-18**: pf1's `ChatMessagePF` has no `.item` property at all (confirmed via `pf1.js.map`'s `chat-message.mjs` — the real linked item is exposed via the `itemSource` getter, resolved from `system.item.id` against the speaking actor's items). All three uses of `data.item` in the hook (`macroArgs[1].item`, `getPf1eMacroName`'s `sourceText` array, and the spell-type gate condition) always evaluated to `undefined`, meaning every macro reached via the chat-keyword path that reads `args[1].item` (Heal.js, Bardic Cantripry.js, Dimension Jumps.js, and others) silently no-op'd. Now reads `data.itemSource` throughout. Found while converting Dimension Jumps.

## Known per-macro bug pattern (check every macro, not yet swept)

- `` `Compendium.pf1e-jb2a-macros.${game.system.id}-actions...` `` / `-actors` template literals resolve to the nonexistent pack `pf1-actions`/`pf1-actors` (real names are `pf1e-actions`/`pf1e-actors`). Confirmed present in `Mirror Image.js` and `Dancing Lights.js` (not yet converted). Added as checklist item 11 in `reference/conversion-checklist.md` so every subsequent macro conversion checks for it.

## Cross-cutting design question (not fixed, flagged for human review)

`Clumsy.js`'s conversion surfaced an `args[0]` shape mismatch affecting several "condition toggle" macros (confirmed present in: Blur, Concealed, Clumsy, Encumbered, Petrified, Quickened, Resist Energy — likely also Stumbling Stance): these macros use a pattern like `if (!args.length) args[0] = <hasFilter> ? "off" : "on"`, so `args[0]` is only set to the literal `"on"`/`"off"` string when the macro is run manually from the hotbar with zero args. When reached via the chat-keyword fallback (`getPf1eMacroName` → `runMacro` → the fixed two-element `macroArgs`), `args.length` is 2, so that assignment is skipped and `args[0]` is instead the raw chat-message data object — meaning the `"on"`/`"off"` branches never match and the toggle silently no-ops on that path. This predates the pf1 port (same shape likely existed for pf2e) and may mean these macros were never intended to be reached via the chat-keyword path at all, despite having `getPf1eMacroName` entries. Not fixed — needs a human decision on whether to (a) remove these macros' chat-keyword rules since AEFX active-effect toggling is the real intended path, or (b) make the macros branch on additional signal when `args[0]` isn't a literal string.

## Needs human judgment

| Macro | Question | Notes |
|---|---|---|
| Heal | What icon should replace `systems/pf2e/icons/spells/heal.webp`? | No matching file under `systems/pf1/icons/spells/` (only unrelated card-art variants) and no bundled module asset. Left pointing at the pf2e path rather than guessing. |
| Heal | Should undead detection use a real pf1 field? | Original code used `actor.modeOfBeing` and `actor.system.attributes.hp.negativeHealing` — neither exists in pf1 (no match in `template.json` or de-minified `pf1.js.map`). pf1 has `creatureTypes`/`creatureSubtypes` (seen on race templates) that likely determine "undead" status via some actor-level aggregation not yet traced. Currently fails safe as "never undead" (no healing/harm reversal). |
| Heal | How should the "tradition" (arcane/divine/primal) color variant be chosen? | pf1 has no magic-tradition concept. Currently hardcoded to "divine" (yellow) as a safe default. Could instead key off `spell.system.school` if a sensible mapping exists. |
| Acid Flask | What icon should represent it? | `systems/pf1/icons/items/inventory/flask.jpg` used as closest generic on-disk match (not acid/bomb-specific). |
| Acid Flask | Is there a real pf1 alchemist discovery equivalent to pf2e's Bomber/Expanded Splash/Directional Bombs? | Modifier-picker branch disabled entirely rather than guessing a mapping. |
| Add Effect | Does pf1's buff `system.uses` mean the same thing as pf2e's stacking `system.badge.value`? | Not confirmed — stacking/re-increment behavior currently skipped (no-op) rather than guessed. |
| Aeon Stone | What's the real pf1 item-name format for Aeon Stones (e.g. "Aeon Stone, Clear Spindle" vs "Aeon Stone (Clear Spindle)")? | Compendium pack is compressed LevelDB, not greppable from this environment — per-stone switch-case strings are unverified pf2e-slug-derived guesses. |
| Arcane Cascade | Should this macro be kept as a generic elemental-FX macro, repurposed for a real pf1 magus mechanic, or dropped? | pf2e magus stance mechanic (rule-element-driven damage-type choice) has no pf1 equivalent — pf1 magus uses Spell Combat/Spellstrike instead. |
| Arcane Cascade | What icon should replace `systems/pf2e/icons/features/classes/arcane-cascade.webp`? | No equivalent found under `systems/pf1/icons/feats/` or `features/`. |
| Bane | What icon should replace `systems/pf2e/icons/spells/bane.webp`? | No `bane`-named file under `systems/pf1/icons/spells/`. |
| Bane | Should aura size be driven by a fixed pf1 spell-radius value instead of a live token-aura lookup? | pf2e's `token.auras` API has no pf1 equivalent (confirmed absent from `pf1.js.map`'s `token.mjs`); currently falls back to a fixed default radius. |
| Bless | What icon should replace `systems/pf2e/icons/spells/bless.webp`? | Same aura-radius/icon situation as Bane. |
| Bless | Should aura size be driven by a fixed pf1 spell-radius value instead of a live token-aura lookup? | Same as Bane — `tokenD.auras` has no pf1 equivalent. |
| Blur | What icon should replace `systems/pf2e/icons/spells/blur.webp`? | No pf1/core equivalent found on disk. |
| Brain Drain | (bug report, not a judgment call) `args[2].length` check is always true since `args[2]` is a plain object, not an array — the "purple" color choice from `animations/range/brain-drain.json` is silently ignored. | Pre-existing, system-agnostic bug unrelated to the pf2e→pf1 port; left unfixed as out of scope for this conversion pass. |
| Concealed | What icon should replace `systems/pf2e/icons/conditions/concealed.webp`? | `systems/pf1/icons/conditions/invisible.png` is visually similar but represents a distinct pf1 condition — left flagged rather than substituted. |
| Cone Hands | What icon should replace `systems/pf2e/icons/spells/burning-hands.webp`? | No matching file under `systems/pf1/icons/spells/`. |
| Dancing Lights | Should `animations/ontoken/light.json`'s `args: ""` invocation be fixed? | A third, undocumented invocation shape (empty-string args) would make `scope?.args?.[0].toObject()` throw. Out of scope for a `.js`-only conversion pass (the bug is in the JSON config), flagged for awareness. |
| Dimension Door | What icon should replace `systems/pf2e/icons/spells/dimension-door.webp`? | No teleport/portal/door-themed pf1 icon found on disk. |
| Cone Template | (design note, not blocking) `args[0]` shape now duck-typed (`.center` presence) between two call sites rather than picking one canonical shape. | Both concrete shapes were confirmed by tracing real callers, not a guess — flagged for awareness/review, not blocking. |
| Cone Template | Pre-existing, non-pf1-specific dead code: `t.actor.data.data.size <= 4` size comparison is a string-vs-number mismatch that predates the port (confirmed same issue exists in pf2e). | Left unchanged as out of scope, matching the Brain Drain precedent for pre-existing non-port bugs. |
| Feral Shades | What icon should replace `systems/pf2e/icons/spells/feral-shades.webp`? | No feral/shade-themed pf1 icon found on disk. |
| Harm | What icon should replace `systems/pf2e/icons/spells/harm.webp`? | Same open question as Heal. |
| Harm | Should undead detection use a real pf1 field? | Same unresolved question as Heal — affects the self-harm-avoidance check and healing-vs-damage animation branch, currently always resolves to "living." |
| Haunting Hymn | What icon should replace `systems/pf2e/icons/spells/haunting-hymn.webp`? | No hymn/haunt/song/bard-performance-themed pf1 icon found on disk. |
| Lightning Bolt | Which pf1 lightning icon variant is preferred? | `lightning-blue-2.jpg` chosen to avoid colliding with Bouncing Lightning's `-1`; a human may prefer differently. |
| Illusory Disguise | What icon should replace `systems/pf2e/icons/spells/illusory-disguise.webp`? | No disguise/mask/illusion-themed pf1 icon found on disk. |
| Mirror Image | What icon should replace `systems/pf2e/icons/spells/mirror-image.webp` (or similar)? | No mirror/image/illusion-named pf1 icon found on disk. |
| Mirror Image | Does pf1's buff `system.resource.uses` mean the same thing as pf2e's stacking `system.badge.value`? | Same open question as Add Effect/Action Counter — currently fails safe (no-op). |
| Mirror Image | Should Mirror Image be added to the cross-cutting args[0] toggle question list? | A third call path via `animations/aefx/mirror-image.json` may pass a single-element array where `args[1].item` would be undefined — not confirmed, flagged for awareness. |
| Mirror Reflection | What icon should replace `systems/pf2e/icons/features/classes/Mirror.webp`? | No pf1 equivalent found; module ships only sound assets for this content. |
| Humanoid Form | Which pf1 icon best represents this? | `systems/pf1/icons/races/creature-types/humanoid.jpg` chosen (a race-type icon, not spell art) since no pf1 spell compendium item uses a vendored icon for Alter Self/Disguise Self/Polymorph-style effects — a human may prefer a core Foundry icon instead once testable in a live instance. |
| Humanoid Form | Is there a pf1 equivalent to the dropped `flags.pf2e.autoscale` token-update write? | No "autoscale" concept found anywhere in `systems/pf1` — dropped rather than inventing a `flags.pf1` equivalent. |
| Manifest Eidolon | Is there a real pf1 way to identify an actor's Eidolon? | pf2e used `actor.class?.slug === "eidolon"` plus a compendium sourceId check — pf1 has no `actor.class` getter or `item.slug` field. Currently always resolves zero eidolons (fails safe). A human needs to define the real pf1-side identification convention (e.g. an item flag, name match, or actor type). |
| Manifest Eidolon | What icon should represent it? | No `systems/pf1/icons/features/classes/` tree exists at all; no module-native eidolon/summoner icon either. |
| Manifest Eidolon | **Discrepancy needing resolution**: does this macro read the linked item from `scope.args[0].item` or `scope.args[1].item`? | Mirror Reflection's conversion (a structurally similar summon-menu macro) found via tracing `autoanimations`' actual `runMacro()` source that the real item lives at `args[1].item`, not `args[0]` — and flagged this exact same `scope.args?.[0].item` pattern as present, byte-for-byte, in Manifest Eidolon.js. But the Manifest Eidolon conversion pass (run in parallel, without that finding) only changed `.item`→`.itemSource` at index `[0]`, not the index itself. These two fixes may be in tension — needs a human (or a follow-up pass with both pieces of context at once) to reconcile which index is actually correct for this macro's real call site. Note: Overdrive's conversion separately confirmed that for *aefx-toggle*-invoked macros, `args[1].item` is correct (per real autoanimations source: `args = [handler.workflow, handler, macro.args]`) — but summon-menu-invoked macros like Mirror Reflection/Manifest Eidolon may go through a different `scope.args` convention entirely (foundry-summons menu callback, not autoanimations directly), so the two findings may not actually be in conflict — still needs a human/follow-up pass to confirm which convention applies to Manifest Eidolon specifically. |
| Overdrive | What icon should represent it? | `icons/magic/lightning/bolt-beam-strike-blue.webp` chosen as a plausible core-Foundry asset (already referenced by Variable Templates.js) but not verified to exist on disk since core Foundry icons aren't vendored in this repo. |
| Overdrive | Is the OFF-branch bug (`testArgs == "off"` checked but `testArgs` only ever assigned when `!args.length`) worth fixing now? | Likely pre-existing, predates the pf1 port — left unfixed, flagged for awareness. |
| Protective Ward | What icon should replace `systems/pf2e/icons/spells/protective-ward.webp` (or similar)? | No protect/ward/shield-themed pf1 icon found on disk. |
| Protective Ward | Should aura size be driven by a fixed pf1 spell-radius value instead of a live token-aura lookup? | Same as Bane/Bless — `tokenD.auras` has no pf1 equivalent. |
| Protective Ward | (bug report, not blocking) Aura-radius lookup keys off `"aura-effect-bless"` instead of a Protective-Ward-specific key. | Pre-existing pf2e-era copy/paste artifact from Bless.js, predates this port — left unfixed, flagged for awareness. |
| Soul Siphon | What icon should represent it? | No soul/drain-themed pf1 icon found on disk. |
| Resist Energy | Does a real pf1 "Resist Energy" item exist in this module's own `pf1e-actions` compendium? | Compendium is a compressed LevelDB pack, not greppable from this environment — `ITEM_UUID` set to `null` and the whole toggle branch fails safe rather than guessing an id. |
| Resist Energy | What icon should represent it (covers 5 energy types)? | No generic "resist all energies" pf1 icon found on disk. |
| Resist Energy | Is there a pf1 equivalent to pf2e's per-cast energy-type rule-element selection? | No equivalent found in template.json or pf1.js.map's item-spell.mjs — downstream color/type branches simply skip. |
| Spiritual Weapon | What icon should represent it? | Could not confirm the real pf1 "Spiritual Weapon" spell item's icon (LevelDB pack not readable from this environment; a `classic-level` install attempt was blocked by the sandbox). Left pointing at the pf2e path. |
| Stumbling Stance | Should the disabled pf2e-only actor-Effect-item toggle be rebuilt as a real pf1 buff? | pf1 does have a real "Stumbling Stance" feat (Kung Fu Style/Drunken Master chain) — this may be worth authoring as a pf1 buff item, rather than leaving disabled. |
| Stumbling Stance | What icon should represent it? | `staggered.svg`/`staggering-critical.jpg` are thematically close but represent distinct pf1 conditions/feats — left flagged rather than substituted. |
| Rebounding Toss | Should the second-throw re-attack logic be rebuilt using pf1's per-item `weapon.use()`? | pf2e's `actor.system.actions` Strikes array has no pf1 actor-level equivalent — currently fails safe (no-op) via existing optional chaining. Note: this macro is also still author-disabled (pre-existing `// WIP!` early return), untestable either way until that's addressed separately. |
| Tanglefoot | Which pf1 icon is preferred — the thrown-bomb item or the resulting condition? | `bomb.jpg` (thrown item) chosen; `entangled.png` (condition) was also considered. |
| Unleash Psyche | What icon should represent it? | No psyche/psychic/mind/mental-themed pf1 icon found on disk. |
| Web | What icon should replace `systems/pf2e/icons/spells/web.webp`? | No pf1 spell icon found; closest hit was an unrelated inventory item icon. |
| Unseen Servant | What icon should represent it? | No pf1 equivalent found under spells/feats/items/conditions. |
| Unseen Servant | Should the summon-actor UUID (`Compendium.pf2e.pathfinder-bestiary...`) be replaced with a pf1-native prop actor? | Resolves to a pf2e "Phantasmal Minion" actor; pf1 has no official stat block for this summon and no equivalent found in this module's own compendia or `systems/pf1/packs`. Left pointing at the pf2e actor (cross-system resolvable but pf2e-authored stats), made fail-safe if unresolvable. |
| Summon Anything | Is CR (`system.details.cr.total`/`.base`) the right pf1 substitute for pf2e's "creature level" filter? | Reasonable field-level correspondence, but unverified against the third-party `foundry-summons` module's actual compendium-index shape (not vendored in this repo). |
| Summon Anything | Is there a real pf1 way to filter summons by creature trait (undead/fiend/etc.)? | pf2e's `system.traits.value` creature-tag array has no pf1 equivalent — pf1's closest analog lives on an embedded race Item, not summarized onto the actor/compendium index. Trait-or/trait-and filters currently skipped entirely (unfiltered results) rather than guessed. |
