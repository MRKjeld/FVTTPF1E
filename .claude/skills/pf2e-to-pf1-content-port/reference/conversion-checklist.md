# Per-macro conversion checklist

Each check: what to look for → what "pass" looks like → what to do on failure.

1. **Header metadata & icon path** — the `/* {"name":...,"img":...} */` comment on line 1. Pass: `img` points to a real file (pf1 equivalent found in `systems/pf1/icons/...`, or the module's own `assets/`). Fail: fix mechanically if an equivalent exists; if none found, flag (`PF1-TODO`) rather than invent a path.
2. **Debug leftovers** — `console.log(...)`, stray `debugger`, commented-out pf2e-era code. Pass: none present (or intentionally kept behind `pf1eAnimations.debug(...)`, which is the module's real debug logger and should stay). Fail: remove mechanically.
3. **`args[]` contract usage** — every `args[0]`/`args[1]`/`args[2]` access. Pass: matches the contract in `args-and-hooks.md` for every call site the macro is actually reached from (see SKILL.md Step 2). Fail: fix mechanically once all call sites are traced; if call sites disagree on shape, flag rather than pick one arbitrarily.
4. **`.system.*` / `.actor.*` field paths** — every property access into an item or actor's data. Pass: path confirmed to exist via `template.json` or `pf1.js.map`-extracted source (see `data-model-map.md`). Fail: fix mechanically if a confirmed pf1 equivalent exists; flag if the underlying concept doesn't exist in pf1 at all.
5. **Tradition/descriptor/school logic** — any branching on pf2e magic tradition (arcane/divine/primal/occult) or pf2e trait tags. Pass: replaced with a pf1-native axis (`school`, `subschool`, `descriptors`) where a sensible one-to-one mapping exists. Fail: flag as a judgment call (SKILL.md Step 4) — do not invent a mapping.
6. **Hardcoded pf2e compendium references** — entity-link HTML (`data-pack="pf2e...."`) or direct `fromUuid("Compendium.pf2e...")` calls. Pass: re-pointed to a real pf1 equivalent, or stripped to plain text if none exists. Fail: never leave a dangling/wrong pf2e reference.
7. **Feat/feature-existence checks by name** — code that does `actor.items.filter(i => i.name === "<pf2e feat name>")` (e.g. `Acid Flask.js`'s "Bomber" check). Pass criterion doesn't really apply here — **name equality across systems is not mechanical equality**. Always flag these as judgment calls; a pf1 feat with a similar name may have entirely different mechanics, or may not exist.
8. **JB2A animation file-path keys** — strings like `"jb2a.cast_shape.circle.01.yellow"` passed to `.file(...)`. These are system-agnostic asset keys (JB2A doesn't know or care what game system is running) — leave them as-is. But re-check the *logic that picks between them* (e.g. tradition-based color selection) per check 5.
9. **Localization keys** — `pf1eAnimations.localize("pf1e-jb2a-macros.xxx")` calls. Pass: the key exists in `languages/en.json` (and ideally other locale files). Fail: flag if referencing a key that was never added for pf1 (a leftover from a pf2e-only notification string).
10. **Literal "pf2e"/"PF2e" strings in user-facing text** — chat flavor text, notification strings, dialog labels. Pass: none remain. Fail: fix mechanically (straightforward text substitution, not a judgment call).
11. **Own-module compendium pack name references** — watch for `` `Compendium.pf1e-jb2a-macros.${game.system.id}-actions...` `` / `-actors` template literals (a leftover pf2e-era pattern that happened to work there). `game.system.id` evaluates to `"pf1"`, but this module's actual pack names (per `module.json`) are `pf1e-actions`/`pf1e-actors` — the interpolated form silently resolves to a nonexistent pack (`pf1-actions`). Confirmed present in `Mirror Image.js` and `Dancing Lights.js`; check every macro for this pattern. Pass: hardcode the real pack name (`pf1e-actions`/`pf1e-actors`) or use the already-correct fallback chain pattern seen in `module/pf1e-animations.js`'s Attack Matches branch (`game.packs.get("pf1e-jb2a-macros.pf1e-actions") || ...`). Fix mechanically — this is a confirmed, unambiguous bug, not a judgment call.

## Syntax verification caveat

Plain `node --check <file>` will report a false failure on most of these macros — they use top-level `await`/`return`, which is invalid outside Foundry's implicit async macro-execution wrapper but is exactly what Foundry expects at runtime. Confirmed on 20+ files (`Add Effect.js`, `Acid Flask.js`, `Aeon Stone.js`, `Action Counter.js`, `Bardic Cantripry.js`, and others). To actually check syntax, wrap the file's contents in an async shim before checking, e.g.:
```js
// wrap.js
const fs = require('fs');
const body = fs.readFileSync(process.argv[2], 'utf8');
new Function('args', 'canvas', 'game', 'ui', 'Sequence', 'pf1eAnimations', 'warpgate', 'token', 'scope',
  `return (async () => { ${body} })();`);
console.log('WRAPPED_OK');
```
A bare `node --check` failure on a lone `await`/`return`-outside-function `SyntaxError` is expected and not a regression; only trust the wrapped check (or a genuine unrelated syntax error like a mismatched brace) as a real failure.
