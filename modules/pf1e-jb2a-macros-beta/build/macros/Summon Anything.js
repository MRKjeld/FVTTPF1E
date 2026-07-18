/* {"name":"Summon Anything","img":"icons/magic/earth/construct-stone.webp","_id":"emzJwDdpyYpuYkcm"} */
// Exit Early if Impossible to Summon
if (!game.modules.get("foundry-summons")?.active) {
  return console.warn(
    "PF1e Animations | Foundry Summons is not activated, which is required for summoning mechanics!"
  )
}

if (!Object.keys(scope).length) {
  return console.warn(
    "PF1e Animations | This macro cannot be ran by the user, you have to use the spell or action itself to use it!"
  )
}

// PF1-FIX: item-linked invocation shapes scope.args as [handler.workflow, handler, userData]
// (confirmed via modules/autoanimations/dist/autoanimations.js: the AAHandler constructor
// sets `this.workflow`, `this.sourceToken`, `this.item` directly as own properties, and
// macroSection()/runMacro() both build `{ args: [handler.workflow, handler, userData] }`).
// scope.args[0] is the bare workflow value (a string like "on"/"off", or undefined) with no
// `.item` property; the real item lives on scope.args[1] (the handler itself), matching the
// fix already applied in Mirror Reflection.js/Manifest Eidolon.js. scope.args[2] is
// `userData` (the parsed autorec `macro.args` string, e.g. ["summon-spell","trait-or-undead"])
// — that index was already correct, no change needed there.
const animArgs = scope.args[2]
const item = scope.args[1].item
const sourceToken = scope.args[1].sourceToken

const data = {
  flags: { item },
  sourceTokens: [sourceToken],
  filters: [],
  options: {
    autoPick: true,
    defaultSorting: true,
    defaultFilters: true,
  },
}

if (animArgs.length) {
  if (animArgs.includes("summon-spell")) {
    // PF1-FIX: pf2e spells expose level via the `item.level` getter; pf1 spells store it
    // flat at `item.system.level` (confirmed via systems/pf1/template.json's "spell" type).
    let multiplier = -1
    if (item.system.level >= 2) multiplier = 1
    if (item.system.level >= 3) multiplier = 2
    if (item.system.level >= 4) multiplier = 3
    if (item.system.level >= 5) multiplier = 5
    if (item.system.level >= 6) multiplier = 7
    if (item.system.level >= 7) multiplier = 9
    if (item.system.level >= 8) multiplier = 11
    if (item.system.level >= 9) multiplier = 13
    if (item.system.level >= 10) multiplier = 15
    // level equal or less filter
    data.filters.push({
      name: game.i18n.format(
        "pf1e-jb2a-macros.macro.summoning.player.summonArg",
        { multiplier: multiplier, spellLevel: item.system.level }
      ),
      locked: true,
      // PF1-FIX: pf2e creature "level" (system.details.level.value) has no equivalent on
      // pf1 actors; pf1's closest analog for a summonable creature's power is Challenge
      // Rating. Confirmed via systems/pf1/pf1.js.map: ActorNPCPF derives a runtime
      // `system.details.cr.total` (via getCR()) from the stored `system.details.cr.base`.
      // Falls back to `.base` in case these are lightweight compendium index entries that
      // never ran prepareData (and so never got `.total` computed).
      function: (index) =>
        index.filter(
          (x) => (x.system.details.cr?.total ?? x.system.details.cr?.base) <= multiplier
        ),
    })
  }

  // PF1-TODO(creature-traits): pf2e NPC actors carry a flat `system.traits.value` tag array
  // (celestial/monitor/fiend/undead/construct/etc.) that this trait-or/trait-and filtering
  // is built on. pf1 has no equivalent: confirmed via systems/pf1/template.json — the pf1
  // actor "traits" template only holds size/senses/resistances/languages, no creature-type
  // tag list. The closest pf1-side concept (`system.creatureTypes`/`system.creatureSubtypes`)
  // lives on an embedded "race" Item, not summarized onto the actor or its compendium index,
  // so there's no safe 1:1 field to substitute without inventing a mapping. Failing safe:
  // these two filters are not registered at all (rather than crash on `x.system.traits.value`
  // being undefined, or silently matching/excluding everything) — animations driven by
  // trait-or-*/trait-and-* autorec args (e.g. summon-undead.json, summon-fiend.json) will
  // fall through to an unfiltered creature list until a human decides the real pf1 axis.
  if (animArgs.find((x) => x.includes("trait-or"))) {
    const traitsOr = animArgs
      .find((x) => x.includes("trait-or-"))
      ?.replace("trait-or-", "")
      .split("-")

    pf1eAnimations.debug(
      `Summon Anything: trait-or-${traitsOr?.join("-")} filter skipped — no pf1 creature-trait equivalent (see PF1-TODO(creature-traits)).`
    )
  }

  if (animArgs.find((x) => x.includes("trait-and"))) {
    const traitsAnd = animArgs
      .find((x) => x.includes("trait-and"))
      ?.replace("trait-and-", "")
      .split("-")

    pf1eAnimations.debug(
      `Summon Anything: trait-and-${traitsAnd?.join("-")} filter skipped — no pf1 creature-trait equivalent (see PF1-TODO(creature-traits)).`
    )
  }

  if (animArgs.find((x) => x.includes("name"))) {
    const name = animArgs
      .find((x) => x.includes("name"))
      ?.replace("name-", "")
      .split("|")
      .map((x) => x.trim()) // separate by | for multiple names

    data.filters.push({
      name: game.i18n.format(
        "pf1e-jb2a-macros.macro.summoning.player.nameArg",
        { name: name.join(", ") }
      ),
      locked: true,
      function: (index) => index.filter((x) => name.some((n) => x.name === n)),
    })
  }

  if (
    animArgs.find((x) => x.includes("level") && !x.includes("exact-level"))
  ) {
    const level = animArgs
      .find((x) => x.includes("level") && !x.includes("exact-level"))
      ?.replace("level-", "")
      .replaceAll("-1", "~1")
      .split("-")

    data.filters.push({
      name: game.i18n.format(
        "pf1e-jb2a-macros.macro.summoning.player.levelArg",
        {
          level1: level[0].replace("~", "-"),
          level2:
            level[1]?.replace("~", "-") ??
            '<span style="font-size:18px">∞</span>',
        }
      ),
      // PF1-FIX: same CR substitution as the summon-spell filter above — pf2e creature
      // "level" (system.details.level.value) has no pf1 equivalent; pf1's closest analog is
      // Challenge Rating (system.details.cr.total, falling back to .base for compendium
      // index entries — see systems/pf1/pf1.js.map's ActorNPCPF.getCR()).
      locked: true,
      function: (index) => {
        index = index.filter(
          (x) =>
            (x.system.details.cr?.total ?? x.system.details.cr?.base) >=
            Number(level[0].replace("~", "-"))
        )

        if (level[1]) {
          index = index.filter(
            (x) =>
              (x.system.details.cr?.total ?? x.system.details.cr?.base) <=
              Number(level[1].replace("~", "-"))
          )
        }

        return index
      },
    })
  }

  if (animArgs.find((x) => x.includes("exact-level"))) {
    const exactLevel = animArgs
      .find((x) => x.includes("exact-level"))
      ?.replace("exact-level-", "")

    data.filters.push({
      name: game.i18n.format(
        "pf1e-jb2a-macros.macro.summoning.player.levelArg",
        {
          level1: exactLevel,
          level2: exactLevel,
        }
      ),
      // PF1-FIX: same CR substitution as above (system.details.level.value has no pf1
      // equivalent; closest analog is Challenge Rating). exactLevel is a string from the
      // autorec arg, so compare against `.total`/`.base` coerced with Number() rather than
      // the original strict `===` (which would never match a numeric CR field).
      locked: true,
      function: (index) =>
        index.filter(
          (x) =>
            (x.system.details.cr?.total ?? x.system.details.cr?.base) ===
            Number(exactLevel)
        ),
    })
  }

  if (animArgs.find((x) => x.includes("unique"))) {
    let unique = animArgs
      .find((x) => x.includes("unique-"))
      ?.replace("unique-", "")
    if (unique && animArgs.length > 1)
      return ui.notifications.error(
        "You can only select one unique summon type."
      )
    switch (unique) {
      case "lesser-servitor": {
        data.filters.push({
          name: game.i18n.format(
            "pf1e-jb2a-macros.macro.summoning.player.unique",
            {
              // PF1-TODO(compendium-link): pf2e-only "Summon Lesser Servitor" spell link
              // (Compendium.pf2e.spells-srd.B0FZLkoHsiRgw7gv) has no pf1 equivalent spell —
              // checked systems/pf1/packs for a matching spell, none found. Stripped the
              // dangling entity-link HTML down to plain text per conversion-checklist.md #6.
              unique: "Summon Lesser Servitor",
            }
          ),
          locked: true,
          function: (packs) => {
            // PF1-FIX: item.level (pf2e spell-level getter) -> item.system.level (pf1's flat
            // spell.system.level field, per systems/pf1/template.json).
            let multiplier = -1
            if (item.system.level >= 2) multiplier = 1
            if (item.system.level >= 3) multiplier = 2
            if (item.system.level >= 4) multiplier = 3
            // PF1-FIX: same CR substitution as the summon-spell filter above (see that
            // comment for the systems/pf1/pf1.js.map trace).
            packs = packs.filter(
              (x) =>
                (x.system.details.cr?.total ?? x.system.details.cr?.base) <=
                multiplier
            )
            // PF1-TODO(creature-traits): the celestial/monitor/fiend trait check has no pf1
            // equivalent (see the trait-or/trait-and PF1-TODO above for the full trace).
            // Guarded with optional chaining so it evaluates to `false` instead of throwing
            // on `x.system.traits.value` being undefined — this safely falls through to the
            // name-based animal list below rather than breaking the whole filter.
            packs = packs.filter(
              (x) =>
                // celestial, monitor, or fiend
                ["celestial", "monitor", "fiend"].some((traitOr) =>
                  x.system.traits?.value?.includes(traitOr)
                ) ||
                // or any of the below animal names
                [
                  "Eagle",
                  "Guard Dog",
                  "Raven",
                  "Black Bear",
                  "Giant Bat",
                  "Leopard",
                  "Tiger",
                  "Great White Shark",
                ].some((v) => x.name === v)
            )

            return packs
          },
        })
        break
      }
    }
  }
}

foundrySummons.openMenu(data)
