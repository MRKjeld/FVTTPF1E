# Macro invocation contract: args, hooks, and coverage

## Two invocation paths into a macro

`modules/pf1e-jb2a-macros-beta/module/pf1e-animations.js`'s `createChatMessage` hook can trigger a macro two ways:

1. **Automated Animations item-linked path** (the "Attack Matches" branch): calls `AutomatedAnimations.playAnimation(token, item, { targets, hitTargets, ... })`. This delegates to the third-party `autoanimations` module, which resolves the item → animation/macro linkage itself (via its own `autorec.json`-style recognition data and the `packs/actions` compendium) and builds a correctly-shaped `args` array before invoking the macro. **Most macros are reached this way**, not through the hook below.
2. **Chat-keyword fallback path** (`getPf1eMacroName` + `pf1eAnimations.runMacro(name, macroArgs)`): used when there's no clean item link (e.g. a condition applied by flavor text alone). This calls `runMacro` directly with an explicit `macroArgs` array built in the hook itself.

**Fixed 2026-07-18:** both `runMacro` call sites in the hook used to pass `[args]` — a **one-element** array where `args` was just the raw chat-message `data`. Every macro invoked through `pf1eAnimations.macroHelpers()` expects a **second** element shaped as an options bag. The hook now builds one shared `macroArgs = [data, { sourceToken, allTargets, hitTargets, item, itemUuid }]` and passes that to both `runMacro` calls ("Persistent Conditions" and the `getPf1eMacroName`-resolved macro). If you ever see a bare `[args]`/`[data]` passed to `runMacro` again (e.g. after re-syncing from an upstream pf2e update), fix it at the hook — never per-macro.

## `macroHelpers` contract

`pf1eAnimations.macroHelpers(args)` (in `module/pf1e-animations.js`, function `vauxsMacroHelpers`) reads from `args[1]`:

| Field | Source | Fallback |
|---|---|---|
| `sourceToken` | `args[1].sourceToken` | `canvas.tokens.controlled[0]` |
| `allTargets` | `args[1].allTargets` | `[...game.user.targets]` |
| `hitTargets` | `args[1].hitTargets` | `allTargets` |
| `item`/`itemUuid` | `args[1].itemUuid ?? args[1].item?.uuid` | `token.actor.uuid` |

It returns `[token, tokenScale, allTargets, hitTargets, targets, target, origin, actor]` (destructure only what you need — most macros only take `const [tokenD, tokenScale] = ...`).

## Multi-call-site warning — worked example: `Heal.js`

`Heal.js` reads `args[1].sourceToken`/`args[1].hitTargets`/`args[1].item` (the options-bag convention, when invoked as a top-level macro from the hook), **and separately** checks `args[0]?.collectionName === "templates"` (treating `args[0]` as a template document, when re-entered via a different call path — likely a Sequencer `.effect().macro()` callback that re-invokes the same macro name with a different `args[0]`). Before changing any `args[n]` access in a macro:

1. Grep the whole repo for the macro's bare name and its `Compendium.<module>.Macros.<Name>` form.
2. Check every match — other macros' `.macro("Name", ...)` calls, and any hook that calls `runMacro("Name", ...)`.
3. Only then decide what each `args[n]` element actually is at each call site.

## `getPf1eMacroName` coverage

The regex table in `getPf1eMacroName` (module/pf1e-animations.js) currently has 20 entries, but **3 point to macro names that don't exist as files in `build/macros/`** (`Confused`, `Dazzled`, `Deafened` — dangling, presumably meant for macros not yet created, or renamed). Of the 63 real macro files, only these 18 have a working chat-keyword rule today:

`Heal, Harm, Blur, Concealed, Clumsy, Dazzling Flash, Resist Energy, Quickened, Stumbling Stance, Encumbered, Petrified, Mirror Image, Dancing Lights, Web, Darkness, Lightning Bolt, Dimension Jumps, Cone Template`

The other 45 macros have no chat-keyword rule. **This is not automatically a gap to fill** — many of them (`Action Counter`, `Add Effect`, `Blacklist Animations`, `Dismiss Selected Token`, `Export Autorec JSON`, `Open AA`, `Variable Templates`, `Cone Hands`, `Mirror Reflection Animation`, etc.) are utility/helper macros invoked internally by other macros or by UI, not meant to be triggered by matching chat-message text at all. Others (most spells/conditions/attacks) are likely intended to be reached via the standard Automated Animations item-name path instead. Only propose a new regex rule (SKILL.md Step 5) after confirming the macro genuinely needs the chat-keyword fallback and isn't already covered by item-linkage.
