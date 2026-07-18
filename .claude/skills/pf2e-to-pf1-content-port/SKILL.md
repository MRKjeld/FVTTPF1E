---
name: pf2e-to-pf1-content-port
description: Converts individual pieces of pf2e-authored Foundry VTT module content (starting with pf2e-jb2a-macros → pf1e-jb2a-macros-beta Sequencer/JB2A macros) to the pf1 system's data model, one unit at a time, flagging judgment calls inline instead of guessing, and running static-only verification. Use when asked to convert/port a macro from pf2e to pf1, continue the pf1e-jb2a-macros-beta port, or adapt any other pf2e-oriented module content in this repo to pf1.
---

# pf2e → pf1 content port

## Purpose and scope

Converts **one content unit** — by default, one file in `build/macros/*.js` — from a pf2e-oriented source module to a pf1-targeting fork of it. This is a code-conversion skill, not a Foundry-runtime test tool: there is no way to load Foundry VTT and click-test from this environment. Every invocation ends with static verification only (see Step 6), and is honest about what it did *not* check.

## Defaults

- Source module: `modules/pf2e-jb2a-macros`
- Target module: `modules/pf1e-jb2a-macros-beta`
- Content-unit glob: `build/macros/*.js`

These are defaults, not hardcoded assumptions — see "Reusability" below for pointing this at a different module pair or content type.

## Step 0 — Plumbing gate check (run every invocation, cheap)

Grep the target's `module/*-animations.js` for how macros are invoked from the `createChatMessage` hook. Confirm every `pf1eAnimations.runMacro(name, X)` call passes `X` as a **two-element** array whose second element is an options bag `{ sourceToken, allTargets, hitTargets, item, itemUuid }` — never a bare one-element `[data]`. (This bug was found and fixed in `module/pf1e-animations.js` on 2026-07-18: both the "Persistent Conditions" and the `getPf1eMacroName`-driven "spell/item macro detected" call sites now build a shared `macroArgs` two-element array. If this check ever fails again — e.g. after an upstream re-sync from pf2e reintroduces the bug — do **not** work around it per-macro. Fix it once, at the hook, the same way.)

## Step 1 — Pick the unit

Invocation is **one macro per call**. The argument is either:
- an exact macro name matching a `build/macros/<name>.js` filename, or
- the literal `next`, which reads `<target module>/CONVERSION_STATUS.md` (create it from a `build/macros/*.js` directory listing if it doesn't exist yet — see its own header for the schema) and picks the first `not-started` row that isn't marked `blocked`.

There is **no bulk/"convert everything" mode**. Each macro's conversion is a human-reviewable unit of change and may surface a judgment call that needs a decision before the user wants to move on. To process many macros, invoke this skill repeatedly (or drive it via the `loop` skill if the user wants unattended iteration with review gates).

## Step 2 — Read source + trace all call sites

1. Read the target macro file in full.
2. Grep the whole repo for the macro's exact name — both the bare name and its `Compendium.<module>.Macros.<Name>` form — across `module/*-animations.js` and other macros' `.macro(...)` chained calls.

Do this **before** assuming a single `args` shape. Some macros are invoked from more than one call site with different `args[0]`/`args[1]` shapes — e.g. `Heal.js` reads `args[1].item` (the options bag, when invoked as a top-level macro) *and* `args[0]?.collectionName === "templates"` (a template document, when re-entered from a different call path). Fixing one call site's field access while breaking another is a regression, not a conversion.

## Step 3 — Convert

Full checklist: `reference/conversion-checklist.md`. Field-mapping ground truth: `reference/data-model-map.md`. Args contract details: `reference/args-and-hooks.md`.

Short summary of what changes in nearly every macro:
- Header comment `img` path and any in-body icon references (pf2e path → verified pf1 path, or module's own `assets/`).
- `args[]` usage — must match the two-element contract from Step 0/`args-and-hooks.md`.
- Every `.system.*` / `.actor.*` field path touched (cross-check against `data-model-map.md`).
- pf2e magic-tradition-based logic (arcane/divine/primal/occult) — pf1 has no such concept; replace with a pf1-appropriate axis (school, descriptor, or spellbook) or flag as a judgment call.
- Hardcoded pf2e compendium references (e.g. `data-pack="pf2e.classfeatures"` doc-link ids).
- Leftover debug (`console.log(args)` and similar).

## Step 4 — Judgment calls: flag, never guess

When a macro depends on a pf2e-only mechanic with no clean pf1 equivalent (e.g. `Acid Flask.js`'s "Bomber"/"Expanded Splash"/"Directional Bombs" feat checks — these are pf2e alchemist feats that don't exist in pf1; or `Heal.js`/`Harm.js`'s tradition-to-color animation logic), do not invent a pf1 rules mapping. Instead:

1. Insert `// PF1-TODO(<tag>): <one-line reason>` directly above the affected code.
2. Make the branch fail safe — skip the bonus/effect/variant, don't throw — rather than guess.
3. Add a row to the target's `CONVERSION_STATUS.md` "Needs human judgment" table describing the decision needed.

## Step 5 — Optional: propose a chat-trigger rule

Check `reference/args-and-hooks.md`'s coverage table for whether this macro's name already has a `getPf1eMacroName` regex rule. If not, first check whether it's actually meant to be reached via the standard Automated Animations item-name-matching path (`packs/actions` compendium + `autorec.json`) instead — most macros are triggered that way, not through the chat-keyword fallback. Only if genuinely needed, **propose** (as a diff, not auto-applied) a new regex rule — this edits a file shared by every macro, so it needs explicit confirmation.

## Step 6 — Static verification

Run and report these concrete checks (all are actually executable in this environment; none are a substitute for loading Foundry):

1. `grep -i "pf2e"` and the pf2e icon-path pattern (`systems/pf2e/`) against the converted file — must return nothing, or only lines already covered by an intentional `PF1-TODO`.
2. Cross-check every touched `.system.*`/`.actor.*` path against `systems/pf1/template.json`, and for anything not in `template.json` (derived/computed fields), against source extracted from `systems/pf1/pf1.js.map` (see `data-model-map.md` for the extraction recipe).
3. Diff the macro's `args[0]`/`args[1]`/`args[2]` usage against the `macroHelpers` contract in `args-and-hooks.md`.
4. Syntax validation — **not** bare `node --check` (it false-fails on the top-level `await`/`return` every macro legitimately uses inside Foundry's async macro wrapper). Wrap the file body in an async shim first; see `reference/conversion-checklist.md`'s "Syntax verification caveat" for the exact recipe.
5. Confirm any compendium/pack name strings referenced match the actual pack names in `module.json`.

Always close with an explicit statement in this shape:
> Static checks passed: [list]. NOT verified: in-Foundry rendering/behavior — requires manual test in a running Foundry instance.

## Step 7 — Rebuild reminder

Note (don't silently run) that `build/macros/*.js` only takes effect inside Foundry after the target module's build step (`npm run pack`, which invokes `build/pack.mjs` to rewrite the `packs/macros` LevelDB) runs. Mention this to the user; don't run it for them unless asked.

## Step 8 — Update tracker

Mark the macro's row in `CONVERSION_STATUS.md` as `converted-pending-review` — never `done`; only a human clicking through it in Foundry earns that status. Summarize the diff and any judgment-call rows added.

## Reusability / extending to other content

- Source/target module paths and the content-unit glob (default `build/macros/*.js`) are parameters. If the user names a different module pair under `modules/`, use that instead.
- `reference/data-model-map.md` documents pf2e→pf1 *data-model* differences generally — it's reusable even for non-macro content (e.g. converting a compendium item, a journal-linked script call, etc.).
- `reference/args-and-hooks.md` is scoped specifically to the Sequencer + Automated Animations + `pf1eAnimations.macroHelpers` invocation convention used by this macro library.
- To port a different *kind* of pf2e content later (not a Sequencer macro), add a new `reference/<content-type>-contract.md` describing that content type's invocation/data contract, and add a matching discovery rule to Step 1 — don't write a whole new skill for it.

## References

- [`reference/data-model-map.md`](reference/data-model-map.md) — pf2e→pf1 field/path mappings, with a recipe for resolving fields not in `template.json`.
- [`reference/args-and-hooks.md`](reference/args-and-hooks.md) — the macro invocation contract, call-site quirks, and the `getPf1eMacroName` coverage table.
- [`reference/conversion-checklist.md`](reference/conversion-checklist.md) — the full per-macro checklist.
