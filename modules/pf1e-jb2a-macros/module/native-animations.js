// Native animation pipeline: plays JB2A animations directly via Sequencer,
// driven by pf1's own `pf1PostActionUse` hook and this module's own
// animations/**/*.json corpus (compiled into module/autorec.json).
//
// This intentionally bypasses Automated Animations' autorec matching and
// settings entirely for lookup/dispatch. AA only needs to remain installed
// because it registers its own "autoanimations" Sequencer database at
// `sequencer.ready` — that registration is static, deterministic data, not
// the unreliable part. We build the same database keys AA's own buildFile()
// uses internally (`autoanimations.<dbSection>.<menuType>.<animation>.<variant>[.<color>]`)
// and hand them straight to Sequencer's .file().
const pf1eNativeAnimations = {};
self.pf1eNativeAnimations = pf1eNativeAnimations;

pf1eNativeAnimations.index = null; // Map<rinsedLabel, entry> per menu, built once autorec.json loads.

pf1eNativeAnimations.rinseName = function rinseName(name) {
  return (name ?? "").replace(/\s+/g, "").toLowerCase();
};

pf1eNativeAnimations.dbKey = function dbKey(video) {
  if (!video) return null;
  if (video.enableCustom && video.customPath) return video.customPath;
  const { dbSection, menuType, animation, variant, color } = video;
  if (!dbSection || !menuType || !animation || !variant) return null;
  const base = `autoanimations.${dbSection}.${menuType}.${animation}.${variant}`;
  return color && color !== "random" ? `${base}.${color}` : base;
};

pf1eNativeAnimations.loadIndex = async function loadIndex() {
  const HANDLED_MENUS = ["melee", "range", "templatefx"];
  let autorec;
  try {
    const response = await fetch("modules/pf1e-jb2a-macros/module/autorec.json");
    autorec = await response.json();
  } catch (err) {
    console.warn(
      "PF1e Animations (Beta) | Native animation index failed to load autorec.json",
      err
    );
    pf1eNativeAnimations.index = new Map();
    return;
  }
  const index = new Map();
  for (const menu of HANDLED_MENUS) {
    for (const entry of autorec[menu] ?? []) {
      if (!entry?.label) continue;
      const key = pf1eNativeAnimations.rinseName(entry.label);
      // First entry for a given rinsed label wins; later duplicates are ignored.
      if (!index.has(key)) index.set(key, entry);
    }
  }
  pf1eNativeAnimations.index = index;
  pf1eNativeAnimations.debug(`Native animation index built: ${index.size} entries`);
};

pf1eNativeAnimations.findEntry = function findEntry(itemName) {
  if (!pf1eNativeAnimations.index || !itemName) return null;
  const rinsed = pf1eNativeAnimations.rinseName(itemName);
  if (pf1eNativeAnimations.index.has(rinsed)) return pf1eNativeAnimations.index.get(rinsed);
  // Fall back to substring match, mirroring Automated Animations' own matcher.
  for (const [key, entry] of pf1eNativeAnimations.index) {
    if (rinsed.includes(key)) return entry;
  }
  return null;
};

pf1eNativeAnimations.debug = function debug(msg, ...args) {
  if (game.settings.get("pf1e-jb2a-macros", "debug")) {
    console.log(`DEBUG | PF1e Animations (Beta) Native | ${msg}`, ...args);
  }
};

// Attaches a Sequencer .effect() section for a slot (primary/secondary/source/target)
// using `positioner(effectSection, slot)` to place it, and appends a .sound()
// section if the slot has sound enabled. Returns the sequence for chaining.
pf1eNativeAnimations.addSlot = function addSlot(sequence, slot, positioner) {
  if (!slot || slot.enable === false) return sequence;
  const key = pf1eNativeAnimations.dbKey(slot.video);
  const opts = slot.options ?? {};
  if (key) {
    let section = sequence.effect().file(key);
    section = positioner(section, slot) ?? section;
    if (opts.opacity != null) section = section.opacity(opts.opacity);
    if (opts.delay) section = section.delay(opts.delay);
    if (opts.repeat > 1) section = section.repeats(opts.repeat, opts.repeatDelay ?? 0);
  }
  if (slot.sound?.enable && slot.sound.file) {
    sequence.sound().file(slot.sound.file).volume(slot.sound.volume ?? 1);
  }
  return sequence;
};

pf1eNativeAnimations.isAttackAction = function isAttackAction(actionUse) {
  const type = actionUse?.shared?.action?.actionType;
  return ["mwak", "rwak", "msak", "rsak", "twak"].includes(type);
};

pf1eNativeAnimations.anyHit = function anyHit(actionUse) {
  const chatAttacks = actionUse?.shared?.chatAttacks ?? [];
  if (!chatAttacks.length) return true;
  return chatAttacks.some((ca) => (ca.hasAttack ? ca.attack : true));
};

pf1eNativeAnimations.resolveTargets = function resolveTargets(actionUse) {
  const targets = actionUse?.shared?.targets ?? [];
  return targets.map((t) => t?.object ?? t).filter(Boolean);
};

pf1eNativeAnimations.playMelee = function playMelee(entry, sourceToken, targetToken) {
  const sequence = new Sequence({ moduleName: "PF1e Animations (Beta)", softFail: true });
  pf1eNativeAnimations.addSlot(sequence, entry.primary, (fx) =>
    fx.atLocation(sourceToken).rotateTowards(targetToken ?? sourceToken).scaleToObject(1)
  );
  if (targetToken) {
    pf1eNativeAnimations.addSlot(sequence, entry.secondary, (fx) =>
      fx.atLocation(targetToken).scaleToObject(entry.secondary?.options?.size ?? 1)
    );
    pf1eNativeAnimations.addSlot(sequence, entry.target, (fx) =>
      fx.atLocation(targetToken).scaleToObject(entry.target?.options?.size ?? 1)
    );
  }
  sequence.play();
};

pf1eNativeAnimations.playRange = function playRange(entry, sourceToken, targetToken) {
  const sequence = new Sequence({ moduleName: "PF1e Animations (Beta)", softFail: true });
  pf1eNativeAnimations.addSlot(sequence, entry.primary, (fx) =>
    fx.atLocation(sourceToken).stretchTo(targetToken ?? sourceToken)
  );
  if (targetToken) {
    pf1eNativeAnimations.addSlot(sequence, entry.secondary, (fx) =>
      fx.atLocation(targetToken).scaleToObject(entry.secondary?.options?.size ?? 1)
    );
    pf1eNativeAnimations.addSlot(sequence, entry.target, (fx) =>
      fx.atLocation(targetToken).scaleToObject(entry.target?.options?.size ?? 1)
    );
  }
  sequence.play();
};

// Approximate: anchors at the template's placed location/rotation and sizes
// off its measured distance. Circle/emanation templates size by diameter;
// cone/ray templates stretch along their length. Not pixel-perfect — flagged
// in the implementation plan as needing visual tuning once seen in Foundry.
pf1eNativeAnimations.playTemplateFx = function playTemplateFx(entry, template, sourceToken) {
  if (!template) return;
  const gridRatio = canvas.dimensions.size / canvas.dimensions.distance;
  const pixelDistance = (template.distance ?? 0) * gridRatio;
  const sequence = new Sequence({ moduleName: "PF1e Animations (Beta)", softFail: true });
  const menuType = entry.primary?.video?.menuType;
  pf1eNativeAnimations.addSlot(sequence, entry.primary, (fx) => {
    fx = fx.atLocation(template).rotate(template.direction ?? 0);
    if (menuType === "circle" || menuType === "emanation") {
      return pixelDistance ? fx.size(pixelDistance * 2) : fx;
    }
    // cone / ray / line: stretch along the template's measured length.
    return pixelDistance ? fx.size(pixelDistance) : fx;
  });
  sequence.play();
};

pf1eNativeAnimations.handleActionUse = async function handleActionUse(actionUse) {
  try {
    if (!pf1eNativeAnimations.index) return;
    const itemName = actionUse?.item?.name;
    const entry = pf1eNativeAnimations.findEntry(itemName);
    if (!entry) {
      pf1eNativeAnimations.debug(`No native animation match for "${itemName}"`);
      return;
    }
    const sourceToken = actionUse.shared?.token;
    if (!sourceToken) return;

    const targets = pf1eNativeAnimations.resolveTargets(actionUse);
    const targetToken = targets[0];
    const isAttack = pf1eNativeAnimations.isAttackAction(actionUse);
    const shouldShowImpact = !isAttack || pf1eNativeAnimations.anyHit(actionUse);

    pf1eNativeAnimations.debug(`Matched "${itemName}" -> "${entry.label}" (${entry.menu})`, {
      isAttack,
      shouldShowImpact,
      targetCount: targets.length,
    });

    if (entry.menu === "melee") {
      pf1eNativeAnimations.playMelee(entry, sourceToken, shouldShowImpact ? targetToken : null);
    } else if (entry.menu === "range") {
      pf1eNativeAnimations.playRange(entry, sourceToken, shouldShowImpact ? targetToken : null);
    } else if (entry.menu === "templatefx") {
      const template = actionUse.shared?.template ?? actionUse.shared?.templateData;
      pf1eNativeAnimations.playTemplateFx(entry, template, sourceToken);
    } else {
      pf1eNativeAnimations.debug(`Native playback for menu "${entry.menu}" not yet implemented`);
    }
  } catch (err) {
    console.error("PF1e Animations (Beta) | Native animation playback failed", err);
  }
};

Hooks.once("ready", async () => {
  if (!game.settings.get("pf1e-jb2a-macros", "useNativeAnimations")) return;
  await pf1eNativeAnimations.loadIndex();
  Hooks.on("pf1PostActionUse", (actionUse) => {
    if (!game.settings.get("pf1e-jb2a-macros", "useNativeAnimations")) return;
    pf1eNativeAnimations.handleActionUse(actionUse);
  });
});
