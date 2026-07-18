# pf2e → pf1 data model map

## Resolving pf1 field paths with confidence

1. **Static schema first**: `systems/pf1/template.json` is the canonical base data shape for every actor/item type. Grep it for the type name (e.g. `"spell":`) to get the full default `system` shape.
2. **Derived/computed fields**: not everything an actor/item exposes at runtime is in `template.json` — things like reach, CMB, or other prepared/derived data are computed in system source. `systems/pf1/pf1.js` is minified, but `systems/pf1/pf1.js.map` embeds the full, readable original source for every `module/**/*.mjs` file in its `sourcesContent` array. Recipe:
   - Parse `pf1.js.map` as JSON.
   - Find the index of the source file you want in the `sources` array (substring match, e.g. `"actor-pf.mjs"`).
   - Read the same index in `sourcesContent` — that's the full, unminified original file.
   - Grep that content for the field name (e.g. `reach`).
3. Never guess a field path from pf2e naming conventions alone — pf1 and pf2e were written independently and only sometimes rhyme.

## Confirmed mappings

| Concept | pf2e | pf1 |
|---|---|---|
| Spell level | `spell.system.level.value` (wrapped) | `spell.system.level` (flat number) |
| Damage/trait tags | `spell.system.traits.value` (array — traditions, damage types, rarity all mixed together) | No single equivalent. Splits across: `spell.system.school` (string, e.g. `"evocation"`), `spell.system.subschool` (array), `spell.system.descriptors` (array — closest analog to pf2e's damage/alignment/mind-affecting tags) |
| Magic tradition (arcane/divine/primal/occult) | `spell.system.traits.traditions` | **No equivalent concept.** pf1 spells belong to a `spellbook` (a loose string identifying which class's spell list they're prepared from), which is not a 1:1 substitute. Do not silently map tradition → spellbook; treat tradition-dependent logic (e.g. animation color selection) as a judgment call (see SKILL.md Step 4) unless there's an obvious pf1-native axis to key off instead (e.g. `school`). |
| Actor reach | `actor.attributes.reach` (pf2e) — and *incorrectly assumed* in the unconverted `Heal.js` as `actor.attributes.reach.base` | Confirmed via `pf1.js.map` → `actor-pf.mjs` → `_prepareNaturalReach()`: real path is **`actor.system.traits.reach.base`** |
| Icon paths | `systems/pf2e/icons/{spells,equipment,...}/...webp` | A parallel tree exists at `systems/pf1/icons/{actions,conditions,feats,items,misc,races,skills,spells}/...`, but filenames are **not guaranteed to match 1:1**. Search for a same/similar-named file before repointing. If none exists, fall back to the module's own `assets/` directory and flag it — never invent a path that doesn't exist on disk. |
| Compendium doc-link ids | Macros embed hardcoded entity-link HTML like `data-pack="pf2e.classfeatures" data-id="<id>"` for tooltips (e.g. `Acid Flask.js`'s "Bomber" feat link) | These ids are pf2e-specific and have no pf1 equivalent. Search `systems/pf1/packs` for an equivalent document if one exists; otherwise strip the link (keep the plain text) rather than leaving a dangling/wrong reference. |

## Already handled — out of scope for this doc

The scaffold layer (`module.json` module id, system dependency, and compendium pack `system` pointers, all repointed to `pf1`) is already correct in the target module. This doc is about **macro-body** field references specifically, not module manifest structure.
