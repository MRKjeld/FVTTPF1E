const pf1eAnimations = {};

//#region Hooks
pf1eAnimations.hooks = {};

pf1eAnimations.hooks.ready = Hooks.once("ready", () => {
  console.log(
    "PF1e Animations (Beta) v" +
    game.modules.get("pf1e-jb2a-macros").version +
    " loaded."
  );
  // Warn if no JB2A is found.
  if (
    !game.modules.get("JB2A_DnD5e")?.active &&
    !game.modules.get("jb2a_patreon")?.active
  ) {
    ui.notifications.error(
      pf1eAnimations.localize("pf1e-jb2a-macros.notifications.noJB2A"),
      { permanent: true }
    );
  }

  // Warn if one of the required modules is disabled.
  if (
    !game.modules
      .get("pf1e-jb2a-macros")
      .relationships.requires.toObject()
      .map((i) => i.id)
      .every((i) => game.modules.get(i)?.active)
  ) {
    ui.notifications.error(
      pf1eAnimations.localize("pf1e-jb2a-macros.notifications.noDependencies", {
        modules:
          game.modules
            .get("pf1e-jb2a-macros")
            .relationships.requires.toObject()
            .filter((i) => !game.modules.get(i.id)?.active)
            .map((i) => i.id)
            .join(", ") || "Unknown",
      }),
      { permanent: true }
    );
  } else {
    const wrongVersions = game.modules
      .get("pf1e-jb2a-macros")
      .relationships.requires.toObject()
      .map((i) => {
        return {
          id: i.id,
          title: game.modules.get(i.id).title,
          version: i.compatibility.minimum,
        };
      })
      .filter((i) =>
        foundry.utils.isNewerVersion(
          i.version,
          game.modules.get(i.id).version?.replace(/v|!/g, "")
        )
      );

    if (wrongVersions.length > 0) {
      ui.notifications.error(
        pf1eAnimations.localize("pf1e-jb2a-macros.notifications.wrongVersion", {
          modules:
            wrongVersions.map((i) => `${i.title} v${i.version}`).join(", ") ||
            "Unknown",
        }),
        { permanent: true }
      );
    }
  }

  if (
    game.settings.get("pf1e-jb2a-macros", "version-previous") !==
    game.modules.get("pf1e-jb2a-macros").version
  ) {
    ui.notifications.info(
      pf1eAnimations.localize("pf1e-jb2a-macros.notifications.update", {
        version: game.modules.get("pf1e-jb2a-macros").version,
      })
    );
    game.settings.set(
      "pf1e-jb2a-macros",
      "version-previous",
      game.modules.get("pf1e-jb2a-macros").version
    );
    if (game.user.isGM && game.settings.get("pf1e-jb2a-macros", "autoUpdate"))
      new autorecUpdateFormApplication().render(true);
  }

  // Welcome message for new users.
  if (
    !(game.user.getFlag("pf1e-jb2a-macros", "displayedWelcomeMessage") ?? false)
  ) {
    game.user.setFlag("pf1e-jb2a-macros", "displayedWelcomeMessage", true);
    ChatMessage.implementation.create({
      whisper: [game.user.id],
      speaker: { alias: "PF1e Animations (Beta)" },
      content: `	<div class="pf1e-animations-welcome">
							<h3>${game.i18n.localize("pf1e-jb2a-macros.welcomeMessage.header")}</h3>
							<p>${game.i18n.localize("pf1e-jb2a-macros.welcomeMessage.description")}</p>
							<button class="pf1e-animations-settings-button">
								<i class="fas fa-cogs"></i>
								${game.i18n.localize("pf1e-jb2a-macros.welcomeMessage.settingsButton")}
							</button>
							<p style="text-align: center; margin: 0; margin-top: 5px;"><i>${game.i18n.localize(
        "pf1e-jb2a-macros.welcomeMessage.footer"
      )}</i></p>
						</div>`,
    });
  }

  // GM-Only stuff.
  if (!game.user.isGM) return;
  if (game.settings.get(game.system.id, "tokens.autoscale"))
    game.settings.set("pf1e-jb2a-macros", "smallTokenScale", 0.8);
  if (!game.modules.get("tokenmagic")?.active)
    game.settings.set("pf1e-jb2a-macros", "tmfx", false);
});

// V13 renamed renderChatMessage → renderChatMessageHTML and changed the second
// argument from a jQuery wrapper to a raw HTMLElement. Listen on whichever the
// running version exposes so we work on v11–v14 without tripping deprecations.
pf1eAnimations.hooks.renderChatMessage = Hooks.on(
  foundry.utils.isNewerVersion(game.version ?? "0", "12")
    ? "renderChatMessageHTML"
    : "renderChatMessage",
  async (message, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;
    for (const btn of root.querySelectorAll(
      "button.pf1e-animations-settings-button"
    )) {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        game.settings.sheet.render(true);
      });
    }
  }
);

pf1eAnimations.getPf1eMacroName = function getPf1eMacroName(data) {
  if (!data) return null;

  // PF1-FIX: data.item doesn't exist on pf1's ChatMessagePF; the real linked
  // item is exposed via the `itemSource` getter (see the macroArgs fix above).
  const linkedItem = data.itemSource;
  const sourceText = [
    linkedItem?.name,
    linkedItem?.type,
    data.flavor,
    data.content,
    data.system?.description?.value,
    data.system?.name,
    data.name,
    data?.flags?.item?.name,
    data?.flags?.pf1e?.item?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!sourceText) return null;

  const normalized = sourceText.replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized) return null;

  const macroRules = [
    { pattern: /\b(heal|healing|cure|restoration|remove .+)/, macro: "Heal" },
    { pattern: /\b(harm|inflict|wound|necrotic)/, macro: "Harm" },
    { pattern: /\b(blur)\b/, macro: "Blur" },
    { pattern: /\b(conceal|concealed|invisible|invisibility|disguise)\b/, macro: "Concealed" },
    { pattern: /\b(clumsy|slow)\b/, macro: "Clumsy" },
    { pattern: /\b(confus|confusion)\b/, macro: "Confused" },
    { pattern: /\b(dazzling flash|flash)\b/, macro: "Dazzling Flash" },
    { pattern: /\b(dazzl|dazzled)\b/, macro: "Dazzled" },
    { pattern: /\b(deaf|deafened)\b/, macro: "Deafened" },
    { pattern: /\b(resist(?:ing)? energy|energy resistance)\b/, macro: "Resist Energy" },
    { pattern: /\b(quicken|quickened)\b/, macro: "Quickened" },
    { pattern: /\b(stumbl|stumbling)\b/, macro: "Stumbling Stance" },
    { pattern: /\b(encumber|encumbered)\b/, macro: "Encumbered" },
    { pattern: /\b(petrif|petrified)\b/, macro: "Petrified" },
    { pattern: /\b(mirror image)\b/, macro: "Mirror Image" },
    { pattern: /\b(dancing lights)\b/, macro: "Dancing Lights" },
    { pattern: /\b(web)\b/, macro: "Web" },
    { pattern: /\b(darkness)\b/, macro: "Darkness" },
    { pattern: /\b(lightning bolt|chain lightning|shocking burst)\b/, macro: "Lightning Bolt" },
    { pattern: /\b(dimension door|teleport)\b/, macro: "Dimension Jumps" },
    { pattern: /\b(cone|fireball|burning hands|scorching ray|flame|fire burst|blast)\b/, macro: "Cone Template" },
  ];

  return macroRules.find((rule) => rule.pattern.test(normalized))?.macro ?? null;
};

pf1eAnimations.hooks.createChatMessage = Hooks.on(
  "createChatMessage",
  async (data) => {
    if (game.user.id !== data.author.id) return;
    
    // PF1E: Extract targets from system.targets (array of UUIDs) or use current targets
    let targets = [];
    if (data.system?.targets && data.system.targets.length > 0) {
      // Convert UUIDs to token objects
      for (const uuid of data.system.targets) {
        const targetToken = await fromUuid(uuid);
        if (targetToken?.object) targets.push(targetToken.object);
      }
    }
    if (targets.length === 0) {
      targets = Array.from(game.user.targets);
    }
    targets = [targets].flat();
    
    let token = data.token ?? canvas.tokens.controlled[0];
    let flavor = data.flavor ?? null;
    let args = data ?? null;

    if (!token)
      return pf1eAnimations.debug("No token for the animation.", data);

    // Options bag shape expected by pf1eAnimations.macroHelpers() and by the
    // majority of macros as args[1]. Every macro invoked directly via
    // runMacro() from this hook must receive this as its second args element,
    // not just the raw chat-message data.
    // PF1-FIX: pf1's ChatMessagePF has no `.item` property at all (confirmed via
    // pf1.js.map's chat-message.mjs) — the real linked item is exposed via the
    // `itemSource` getter (resolved from `system.item.id` against the speaking
    // actor's items). Using `data.item` here always evaluated to `undefined`,
    // so every macro reached via this chat-keyword path that reads
    // `args[1].item` (Heal.js, Bardic Cantripry.js, Dimension Jumps.js, etc.)
    // silently no-op'd on this invocation path.
    const linkedItem = data.itemSource;
    const macroArgs = [
      args,
      {
        sourceToken: token,
        allTargets: targets,
        hitTargets: targets,
        item: linkedItem,
        itemUuid: linkedItem?.uuid,
      },
    ];

    // Persistent Damage Matches
    if (
      (data.isDamageRoll && data.rolls[0]?.options?.evaluatePersistent) ||
      flavor?.match(/Received (regeneration|fast healing)/g)
    ) {
      pf1eAnimations.debug("Persistent Damage / Healing", data);
      return pf1eAnimations.runMacro("Persistent Conditions", macroArgs);
    }
    // Default Matches
    if (data.isDamageRoll && /Sneak Attack/.test(flavor)) {
      pf1eAnimations.debug("Sneak Attack", data);
      let [sneak] = data.actor.items.filter((i) => i.name === "Sneak Attack");
      if (sneak) {
        await AutomatedAnimations.playAnimation(token, sneak, {
          targets: targets,
        });
      }
    }
    
    // Attack Matches - PF1E: Check for action type and system.rolls.attacks
    if (
      (data.type === "action" && data.system?.rolls?.attacks?.length > 0) &&
      !game.settings.get("pf1e-jb2a-macros", "disableHitAnims")
    ) {
      const degreeOfSuccess =
        pf1eAnimations.degreeOfSuccessWithRerollHandling(data);

      // PF1-FIX: Automated Animations has no native pf1 attack hook (unlike
      // its built-in dnd5e/pf2e support), so the weapon/attack item must be
      // forwarded explicitly for AA's autorec name-matching (melee/range/etc.)
      // to find a weapon-specific animation. Without this, entries merged via
      // the Update Menu (e.g. "Antler", "Dagger") are registered but never
      // looked up.
      // Superseded by module/native-animations.js's own pf1PostActionUse hook
      // when that pipeline is enabled — skip here to avoid double-playing.
      if (linkedItem && !game.settings.get("pf1e-jb2a-macros", "useNativeAnimations")) {
        const weaponHitTargets =
          ["failure", "criticalFailure"].includes(degreeOfSuccess) &&
          game.settings.get("pf1e-jb2a-macros", "randomHitAnims")
            ? []
            : targets;
        AutomatedAnimations.playAnimation(token, linkedItem, {
          playOnMiss: true,
          targets: targets,
          hitTargets: weaponHitTargets,
        });
      }

      const pack =
        game.packs.get("pf1e-jb2a-macros.pf1e-actions") ||
        game.packs.get("pf1e-jb2a-macros.pf1-actions") ||
        game.packs.get(`pf1e-jb2a-macros.${game.system.id}-actions`);
      if (!pack) {
        ui.notifications.error(
          `PF1e Animations (Beta) | ${pf1eAnimations.localize(
            "notifications.noPack"
          )}`
        );
        return;
      }

      pf1eAnimations.debug("PF1E Attack detected", { degreeOfSuccess, data });

      let items = data.actor.items.filter((i) =>
        i.name.includes("Attack Animation Template")
      );
      if (Object.keys(items).length === 0) {
        items = (await pack.getDocuments()).filter((i) =>
          i.name.includes("Attack Animation Template")
        );
      } else if (Object.keys(items).length < 4) {
        items.push(
          (await pack.getDocuments()).filter((i) =>
            i.name.includes("Attack Animation Template")
          )
        );
      }
      items = items.flat();
      let item = "";
      switch (degreeOfSuccess) {
        case "criticalSuccess":
          item = items.find((i) => i.name.includes("(Critical Success)"));
          pf1eAnimations.debug('"On Hit/Miss" Critical Success animation', {
            token,
            targets,
            item,
          });
          AutomatedAnimations.playAnimation(token, item, {
            playOnMiss: true,
            targets: targets,
            hitTargets: targets,
          });
          break;
        case "criticalFailure":
          item = items.find((i) => i.name.includes("(Critical Failure)"));
          pf1eAnimations.debug('"On Hit/Miss" Critical Failure animation', {
            token,
            targets,
            item,
          });
          AutomatedAnimations.playAnimation(token, item, {
            playOnMiss: true,
            targets: targets,
            hitTargets: !game.settings.get("pf1e-jb2a-macros", "randomHitAnims")
              ? targets
              : [],
          });
          break;
        case "failure":
          item = items.find((i) => i.name.includes("(Failure)"));
          pf1eAnimations.debug('"On Hit/Miss" Failure animation', {
            token,
            targets,
            item,
          });
          AutomatedAnimations.playAnimation(token, item, {
            playOnMiss: true,
            targets: targets,
            hitTargets: !game.settings.get("pf1e-jb2a-macros", "randomHitAnims")
              ? targets
              : [],
          });
          break;
        case "success":
          item = items.find((i) => i.name.includes("(Success)"));
          pf1eAnimations.debug('"On Hit/Miss" Success animation', {
            token,
            targets,
            item,
          });
          AutomatedAnimations.playAnimation(token, item, {
            playOnMiss: true,
            targets: targets,
            hitTargets: targets,
          });
          break;
      }
    }

    const pf1MacroName = pf1eAnimations.getPf1eMacroName(data);
    if (
      pf1MacroName &&
      !game.settings.get("pf1e-jb2a-macros", "disableHitAnims") &&
      (data.type === "spell" ||
        data.itemSource?.type === "spell" ||
        ((data.flavor || data.content) &&
          !data.system?.rolls?.attacks?.length))
    ) {
      pf1eAnimations.debug("PF1E spell/item macro detected", {
        pf1MacroName,
        data,
      });
      return pf1eAnimations.runMacro(pf1MacroName, macroArgs);
    }
  }
);

// Create a hook for updating inventory.
pf1eAnimations.hooks.equipOrInvestItem = Hooks.on(
  "pf1eAnimations.equipOrInvestItem",
  (status, data) => {
    // If the item is an Aeon Stone, run the Aeon Stone macro.
    if (data.name.includes("Aeon Stone"))
      AutomatedAnimations.playAnimation(data.actor.getActiveTokens()[0], data, {
        workflow: status,
      });
  }
);

// Call the above hook with updateItem.
// PF1-FIX: the original pf2e-era code read `data.isInvested`/`data.isEquipped`,
// neither of which exists on pf1 Item documents (confirmed absent from
// systems/pf1/pf1.js.map and systems/pf1/template.json) — status was always
// `false`, so the equip-triggered animation path (e.g. Aeon Stone) could never
// fire. pf1 has no "invested" concept at all; the real equipped flag lives at
// `item.system.equipped`.
pf1eAnimations.hooks.updateItem = Hooks.on("updateItem", (data, changes) => {
  const status = data.system?.equipped ? "equipped" : false;
  Hooks.call("pf1eAnimations.equipOrInvestItem", status, data);
});

// Remove the PF1e Animations (Beta) Dummy NPC folder, unless the debug mode is on AND the user is a GM.
pf1eAnimations.hooks.renderActorDirectory = Hooks.on(
  "renderActorDirectory",
  (app, html, data) => {
    if (!(game.user.isGM && game.settings.get("pf1e-jb2a-macros", "debug"))) {
      const $html = html instanceof jQuery ? html : $(html);
      const folder = $html.find(
        `.folder[data-folder-id="${game.folders.get(
          game.settings.get("pf1e-jb2a-macros", "dummyNPCId-folder")
        )?.id
        }"]`
      );
      folder.remove();
    }
  }
);

// Create a hook for metadata modification menu.
pf1eAnimations.hooks.AutomatedAnimations = {};
pf1eAnimations.hooks.AutomatedAnimations.metaData = Hooks.on(
  "AutomatedAnimations.metaData",
  async (data) => {
    let metaData = data.metaData;
    if (game.settings.get("pf1e-jb2a-macros", "debug")) {
      pf1eAnimations.debug("'AutomatedAnimations.metaData' hook", data);
      await warpgate.menu(
        {
          inputs: [
            {
              label: `name${metaData.name ? "" : " (auto)"}`,
              type: "text",
              options: metaData.name || "PF1e Animations (Beta)",
            },
            {
              label: `moduleVersion${metaData.moduleVersion ? "" : " (auto)"}`,
              type: "text",
              options:
                metaData.moduleVersion ||
                game.modules.get("pf1e-jb2a-macros").version,
            },
            {
              label: `version${metaData.version ? "" : " (auto)"}`,
              type: "number",
              options:
                metaData.version ||
                Number(
                  game.modules
                    .get("pf1e-jb2a-macros")
                    .version.replaceAll(".", "")
                ),
            },
          ],
          buttons: [
            {
              label: "Apply",
              value: 1,
              callback: async (options) => {
                let settings = await game.settings.get(
                  "autoanimations",
                  `aaAutorec-${data.menu}`
                );
                let entry = settings.findIndex(
                  (obj) => obj.label === data.label
                );
                settings[entry].metaData.name =
                  options.inputs[0] ?? settings[entry].metaData.name;
                settings[entry].metaData.moduleVersion =
                  options.inputs[1] ?? settings[entry].metaData.moduleVersion;
                settings[entry].metaData.version =
                  options.inputs[2] ?? settings[entry].metaData.version;
                await AutomatedAnimations.AutorecManager.overwriteMenus(
                  JSON.stringify({
                    version: await game.settings.get(
                      "autoanimations",
                      "aaAutorec"
                    ).version,
                    [data.menu]: settings,
                  }),
                  { [data.menu]: true }
                );
              },
            },
            {
              label: "Update",
              value: 1,
              callback: async (options) => {
                let settings = await game.settings.get(
                  "autoanimations",
                  `aaAutorec-${data.menu}`
                );
                let entry = settings.findIndex(
                  (obj) => obj.label === data.label
                );
                settings[entry].metaData.name = "PF1e Animations (Beta)";
                settings[entry].metaData.moduleVersion =
                  game.modules.get("pf1e-jb2a-macros").version;
                settings[entry].metaData.version =
                  (options.inputs[2] ?? settings[entry].metaData.version) + 1;
                await AutomatedAnimations.AutorecManager.overwriteMenus(
                  JSON.stringify({
                    version: await game.settings.get(
                      "autoanimations",
                      "aaAutorec"
                    ).version,
                    [data.menu]: settings,
                  }),
                  { [data.menu]: true }
                );
              },
            },
            {
              label: "Delete MetaData",
              value: 1,
              callback: async (options) => {
                let settings = await game.settings.get(
                  "autoanimations",
                  `aaAutorec-${data.menu}`
                );
                let entry = settings.findIndex(
                  (obj) => obj.label === data.label
                );
                settings[entry].metaData = {};
                await AutomatedAnimations.AutorecManager.overwriteMenus(
                  JSON.stringify({
                    version: await game.settings.get(
                      "autoanimations",
                      "aaAutorec"
                    ).version,
                    [data.menu]: settings,
                  }),
                  { [data.menu]: true }
                );
              },
            },
          ],
        },
        {
          title: `DEBUG | Add Metadata to ${data.label}.`,
        }
      );
    } else if (metaData.name === "PF1e Animations (Beta)") {
      ui.notifications.notify(
        `${metaData.name} (v${metaData.moduleVersion}) | Animation Version: ${metaData.version
        }<hr>${pf1eAnimations.localize(
          "pf1e-jb2a-macros.notifications.metaData"
        )}`
      );
    }
  }
);

pf1eAnimations.hooks.updateCombatant = Hooks.on(
  "updateCombatant",
  (combatant, changes, options, userId) => {
    if (
      game.settings.get("pf1e-jb2a-macros", "killAnimationsOnKill") &&
      changes.defeated
    ) {
      if (
        Sequencer.EffectManager.getEffects({ object: combatant.token }).length
      )
        if (
          game.settings.get("pf1e-jb2a-macros", "killAnimationsOnKillNotify")
        ) {
          ui.notifications.info(
            `PF1e Animations (Beta) | ${pf1eAnimations.localize(
              "pf1e-jb2a-macros.notifications.killAnimationsOnKill",
              { name: combatant.name }
            )}`
          );
        }
      Sequencer.EffectManager.endEffects({ object: combatant.token });
    }
  }
);

pf1eAnimations.hooks.foundrySummons = Hooks.on(
  "fs-postSummon",
  (postSummon) => {
    let { tokenDoc, sourceData } = postSummon;
    if (!postSummon.animated) {
      postSummon.animated = true;
      let items =
        sourceData.summonerTokenDocument?.actor?.itemTypes?.action.filter(
          (item) => {
            return item.name.includes("Summoning Animation Template");
          }
        );
      let item;

      if (items?.length > 0) {
        item =
          items.find((i) =>
            i.name.includes(`Summoning Animation Template (${tokenDoc.name})`)
          ) ??
          items.find((i) =>
            i.name.includes(
              `Summoning Animation Template (${sourceData?.flags?.item?.name})`
            )
          ) ??
          items.find((i) => i.name === `Summoning Animation Template`);
      }

      setTimeout(() => {
        AutomatedAnimations.playAnimation(
          canvas.tokens.get(sourceData.summonerTokenDocument._id),
          item ?? {
            name: `Summoning Animation Template (${sourceData?.flags?.item?.name})`,
          },
          {
            targets: [tokenDoc.object],
            hitTargets: [tokenDoc.object],
          }
        );
      }, 100);
    }
  }
);

pf1eAnimations.hooks.foundrySummonsWrapper = Hooks.on(
  "fs-addWrapperClasses",
  (wrappers) => {
    class DancingLight extends CONFIG.FoundrySummons.docWrapperClasses
      .DocWrapper {
      constructor(indexItem, variant) {
        super(indexItem);
        this.variant = this.variant ?? variant;
        this.img = this.getLamp(this.variant, true);
        this.texture = this.getLamp(this.variant, false);
        this.id = variant;
        this.name = variant + " " + indexItem.name;
      }

      getLamp(color, isThumb) {
        return `modules/${game.modules.get("jb2a_patreon") ? "jb2a_patreon" : "JB2A_DnD5e"
          }/Library/Cantrip/Dancing_Lights/DancingLights_01_${color.replaceAll(
            "-",
            ""
          )}_${isThumb ? "Thumb.webp" : "200x200.webm"}`;
      }

      async loadDocument() {
        let document = await fromUuid(this.uuid);
        document = document.clone({
          img: this.img,
          prototypeToken: {
            texture: { src: this.texture },
          },
        });

        return document;
      }
    }

    wrappers.DancingLight = DancingLight;
  }
);

//#endregion

pf1eAnimations.debug = function debug(msg, args) {
  [msg, ...args] = arguments;
  if (game.settings.get("pf1e-jb2a-macros", "debug"))
    console.log(`DEBUG | PF1e Animations (Beta) | ${msg}`, args);
};

// Thanks @ xdy for this function.
pf1eAnimations.runMacro = async function runJB2Apf1eMacro(
  macroName,
  args,
  compendiumName = "pf1e-jb2a-macros.Macros"
) {
  const pack = game.packs.get(compendiumName);
  if (pack) {
    const macro_data = (await pack.getDocuments()).find(
      (i) => i.name === macroName
    );

    if (macro_data) {
      if (foundry.utils.isNewerVersion(game.version, "11")) {
        await macro_data.execute({ args });
      } else {
        const temp_macro = new Macro(macro_data.toObject());
        temp_macro.ownership.default = CONST.DOCUMENT_PERMISSION_LEVELS.OWNER;
        pf1eAnimations.debug(`Running ${macroName} macro`, {
          macro_data,
          temp_macro,
          args,
        });
        // https://github.com/MrVauxs/FoundryVTT-Sequencer/blob/4d1c63102f4f40878a6c13224918d499a6390547/scripts/module/sequencer.js#L109
        const version = game.modules.get("advanced-macros")?.version;
        const bugAdvancedMacros =
          game.modules.get("advanced-macros")?.active &&
          foundry.utils.isNewerVersion(
            version.startsWith("v") ? version.slice(1) : version,
            "1.18.2"
          ) &&
          !foundry.utils.isNewerVersion(
            version.startsWith("v") ? version.slice(1) : version,
            "1.19.1"
          );
        if (bugAdvancedMacros) {
          await temp_macro.execute([...args]);
        } else {
          await temp_macro.execute(...args);
        }
      }
    } else {
      ui.notifications.error(
        "PF1e Animations (Beta) | Macro " +
        macroName +
        " not found in " +
        compendiumName +
        "."
      );
    }
  } else {
    ui.notifications.error(
      "PF1e Animations (Beta) | Compendium " + compendiumName + " not found"
    );
  }
};

// As above @ xdy.
pf1eAnimations.degreeOfSuccessWithRerollHandling =
  function degreeOfSuccessWithRerollHandling(message) {
    // PF1E: Extract degree of success from system.rolls.attacks
    if (!message.system?.rolls?.attacks || message.system.rolls.attacks.length === 0) {
      return "";
    }
    
    const attackRoll = message.system.rolls.attacks[0];
    
    // If it's a Roll object, check its properties
    if (attackRoll.isSuccess !== undefined) {
      if (attackRoll.isCritical || attackRoll.isNat20) {
        return "criticalSuccess";
      } else if (attackRoll.isNat1 || attackRoll.isFailure) {
        return "criticalFailure";
      } else if (attackRoll.isSuccess) {
        return "success";
      } else {
        return "failure";
      }
    }
    
    // Fallback: try to determine from roll data
    if (attackRoll.total !== undefined && attackRoll.dc !== undefined) {
      if (attackRoll.total - attackRoll.dc >= 10) {
        return "criticalSuccess";
      } else if (attackRoll.total - attackRoll.dc <= -10) {
        return "criticalFailure";
      } else if (attackRoll.total >= attackRoll.dc) {
        return "success";
      } else {
        return "failure";
      }
    }
    
    return "";
  };

// Get token data and token scale.
/**
 * @param {Array} args Array of arguments.
 * @returns {Array} tokenD and tokenScale.
 */
pf1eAnimations.macroHelpers = function vauxsMacroHelpers(
  args = [],
  _callback = () => { }
) {
  pf1eAnimations.debug("Vaux's Macro Helpers | Args", args);
  let token = args[1]?.sourceToken ?? canvas.tokens.controlled[0];
  if (!token) {
    ui.notifications.error(
      pf1eAnimations.localize("pf1e-jb2a-macros.notifications.noToken")
    );
    return;
  }

  let tokenScale =
    token.actor.size === "sm"
      ? game.settings.get("pf1e-jb2a-macros", "smallTokenScale")
      : 1.0;
  let allTargets = args[1]?.allTargets ?? [...game.user.targets];
  let hitTargets = args[1]?.hitTargets ?? allTargets;
  let targets = hitTargets;
  let target = hitTargets[0];
  let origin = args[1]?.itemUuid ?? args[1]?.item?.uuid ?? token.actor.uuid;
  let actor = token.actor;

  pf1eAnimations.debug("Vauxs Macro Helpers | Results", {
    token,
    tokenScale,
    allTargets,
    hitTargets,
    targets,
    target,
    origin,
    actor,
  });
  // Don't delete it, even though it's just a legacy thing by this point.
  _callback();
  return [
    token,
    tokenScale,
    allTargets,
    hitTargets,
    targets,
    target,
    origin,
    actor,
  ];
};

pf1eAnimations.requireModule = function (id) {
  if (!game.modules.get(id)?.active) {
    throw new Error(
      `PF1e Animations (Beta) | Macro requires module ${id} to be enabled.`
    );
  }
};

pf1eAnimations.applyTokenMagic = function tokenMagicHelpers(args, params) {
  const [token] = pf1eAnimations.macroHelpers(args);
  pf1eAnimations.debug("Token Magic Helpers | Args | Params", args, params);

  const tokenMagic = game.settings.get("pf1e-jb2a-macros", "tmfx");
  if (!tokenMagic) return this.debug("Token Magic FX has been Disabled!");

  if (args[0] === "on") {
    TokenMagic.addFilters(token, params);
  } else if (args[0] == "off") {
    params.every((param) => {
      TokenMagic.deleteFilters(token, param.filterId);
    });
  }
};

/**
 * @param {string} alignment Alignment as a String ex. CG.
 * @param {boolean} reverse Reverse the alignment, ex. CG to LE.
 * @returns {Array} traits Array of traits.
 */
pf1eAnimations.alignmentStringToTraits = function alignmentStringToTraits(
  alignment,
  reverse = false
) {
  // returns an array of traits for the alignment string
  // e.g. "LG" -> ["lawful", "good"]

  // reverse = true will return the opposite traits (note that N becomes nothing)
  // e.g. "LG" -> ["chaotic", "evil"]
  if (reverse) {
    alignment = alignment
      .split("")
      .map((a) =>
        a === "L"
          ? "C"
          : a === "C"
            ? "L"
            : a === "G"
              ? "E"
              : a === "E"
                ? "G"
                : a === "N"
                  ? ""
                  : a
      )
      .join("");
  }
  let traits = [];
  if (alignment.includes("L")) traits.push("lawful");
  if (alignment.includes("N")) traits.push("neutral");
  if (alignment.includes("C")) traits.push("chaotic");
  if (alignment.includes("G")) traits.push("good");
  if (alignment.includes("E")) traits.push("evil");
  return traits;
};

pf1eAnimations.crosshairs = async function crosshairs(
  args = {
    tokenD,
    token,
    item,
  },
  opts = {
    range,
    crosshairConfig,
    openSheet,
    noCollision,
    noCollisionType,
  }
) {
  pf1eAnimations.requireModule("warpgate");
  opts = foundry.utils.mergeObject(
    {
      openSheet: true,
      noCollision: true,
      range: 999999,
      noCollisionType: "sight",
    },
    opts
  );

  if (!CONST.WALL_RESTRICTION_TYPES.includes(opts.noCollisionType)) {
    throw new Error(
      "A valid wall restriction type is required for testCollision. Passed " +
      opts.noCollisionType
    );
  }

  if (canvas.scene.grid.type === 0) {
    ui.notifications.warn(
      pf1eAnimations.localize("pf1e-jb2a-macros.notifications.gridless")
    );
  }

  if (canvas.scene.grid.size % 2) {
    ui.notifications.warn(
      pf1eAnimations.localize("pf1e-jb2a-macros.notifications.unevenGrid", {
        grid: canvas.scene.grid.size,
      })
    );
  }

  const tokenDoc = args?.token?.document ?? args?.tokenD?.document;
  const callbacks = {};

  const crosshairConfig = {
    label: "0 ft.",
    label: tokenDoc.name,
    interval: tokenDoc.height < 1 ? 4 : tokenDoc.height % 2 === 0 ? 1 : -1,
    lockSize: true,
    drawIcon: false,
    drawOutline: false,
    size: tokenDoc.height,
    icon: tokenDoc.texture.src,
    ogIcon: tokenDoc.texture.src,
    rememberControlled: true,
  };

  foundry.utils.mergeObject(crosshairConfig, opts.crosshairConfig);

  crosshairConfig.ogIcon = crosshairConfig.icon;

  let cachedDistance = 0;
  callbacks.show = async (crosshairs) => {
    crosshairs.ogIcon = crosshairs.icon;
    if (!crosshairConfig.drawIcon) {
      await new Sequence("PF1e Animations (Beta)")
        .effect()
        .file(crosshairConfig.icon)
        .attachTo(crosshairs)
        .persist()
        .name("Crosshairs")
        .scaleToObject(crosshairConfig.size * (tokenDoc?.texture?.scaleX ?? 1))
        .opacity(0.5)
        .play();
    }

    // V13 namespaced Ray under foundry.canvas.geometry; v15 will remove the
    // global. Prefer the namespaced class but fall back for v11/v12.
    const RayClass = foundry.canvas?.geometry?.Ray ?? Ray;

    while (crosshairs.inFlight) {
      // make it wait or go into an unescapable infinite loop of pain
      await warpgate.wait(50);

      const ray = new RayClass((args.token ?? args.tokenD).center, crosshairs);

      // V12 deprecated grid.measureDistances in favour of measurePath; V14 removed it.
      const distance = canvas.grid.measurePath
        ? canvas.grid.measurePath([ray.A, ray.B]).distance
        : canvas.grid.measureDistances([{ ray }], { gridSpaces: true })[0];

      // Only update if the distance has changed
      if (cachedDistance !== distance) {
        cachedDistance = distance;
        crosshairs.label = `${distance} ft.`;
        // V13 removed canvas.walls.checkCollision; collision checks now go
        // through CONFIG.Canvas.polygonBackends.<type>.testCollision.
        const collides = (() => {
          if (!opts.noCollision) return false;
          const backend = CONFIG.Canvas?.polygonBackends?.[opts.noCollisionType];
          if (backend) {
            return backend.testCollision(ray.A, ray.B, {
              type: opts.noCollisionType,
              mode: "any",
            });
          }
          return canvas.walls.checkCollision(ray, { type: opts.noCollisionType }).length > 0;
        })();
        if (distance > opts.range || collides) {
          crosshairs.icon = "icons/svg/hazard.svg";
          await crosshairs.document.updateSource({
            flags: {
              "pf1e-jb2a-macros": {
                outOfRange: true,
              },
            },
          });

          crosshairs.label += ` (${pf1eAnimations.localize(
            "pf1e-jb2a-macros.macro.outOfRange"
          )})`;

          await new Sequence("PF1e Animations (Beta)")
            .effect()
            .file("icons/svg/cancel.svg")
            .attachTo(crosshairs)
            .persist()
            .zIndex(100)
            .tint("#ff0000")
            .scaleToObject(
              crosshairConfig.size * (tokenDoc?.texture?.scaleX ?? 1) + 0.5
            )
            .name("Out of Range!")
            .play();
        } else {
          crosshairs.icon = crosshairs.ogIcon;
          await crosshairs.document.updateSource({
            flags: {
              "pf1e-jb2a-macros": {
                outOfRange: false,
              },
            },
          });

          await Sequencer.EffectManager.endEffects({ name: "Out of Range!" });
        }

        if (opts.crosshairConfig?.label)
          crosshairs.label += `\n${opts.crosshairConfig.label}`;

        crosshairs.draw();
      }
    }
  };

  tokenDoc.actor.sheet.minimize();
  const location = await warpgate.crosshairs.show(crosshairConfig, callbacks);
  if (opts.openSheet === true) {
    tokenDoc.actor.sheet.maximize();
  }

  // Calculate the rotation from the origin in degrees, up = 0
  const RayClass = foundry.canvas?.geometry?.Ray ?? Ray;
  location.rotationFromOrigin =
    (new RayClass(tokenDoc.center, location).angle * 180) / Math.PI + 90;
  if (location.rotationFromOrigin < 0) location.rotationFromOrigin += 360;

  pf1eAnimations.debug("Crosshairs", args, opts, location);
  if (location.flags["pf1e-jb2a-macros"]?.outOfRange === "outOfRange") {
    ui.notifications.error(
      "PF1e Animations (Beta) | " +
      pf1eAnimations.localize("pf1e-jb2a-macros.notifications.outOfRange")
    );
    location = { cancelled: true };
  }
  return location;
};

pf1eAnimations.localize = function localize(string = String, format = Object) {
  if (!string.includes("pf1e-jb2a-macros."))
    string = "pf1e-jb2a-macros." + string;
  if (Object.keys(format).length > 0) {
    return game.i18n.format(string, format);
  } else {
    return game.i18n.localize(string);
  }
};

pf1eAnimations.screenshake = function screenshake({
  intensity = 1,
  duration = 500,
  iterations = 1,
} = {}) {
  if (!(Number.isInteger(intensity) && Number.isInteger(duration))) {
    return ui.notifications.error(
      "PF1e Animations (Beta) | Either Intensity or Duration is not an integer."
    );
  }
  const a = 1 * intensity;
  const b = 2 * intensity;
  const c = 3 * intensity;
  return document
    .getElementById("board")
    .animate(
      [
        { transform: `translate(${a}px, ${a}px) rotate(0deg)` },
        { transform: `translate(-${a}px, -${b}px) rotate(-${a}deg)` },
        { transform: `translate(-${c}px, 0px) rotate(${a}deg)` },
        { transform: `translate(${c}px, ${b}px) rotate(0deg)` },
        { transform: `translate(${a}px, -${a}px) rotate(${a}deg)` },
        { transform: `translate(-${a}px, ${b}px) rotate(-${a}deg)` },
        { transform: `translate(-${c}px, ${a}px) rotate(0deg)` },
        { transform: `translate(${c}px, ${a}px) rotate(-${a}deg)` },
        { transform: `translate(-${a}px, -${a}px) rotate(${a}deg)` },
        { transform: `translate(${a}px, ${b}px) rotate(0deg)` },
        { transform: `translate(${a}px, -${b}px) rotate(-${a}deg)` },
      ],
      {
        duration,
        iterations,
      }
    );
};

self.pf1eAnimations = pf1eAnimations;



