/* {"name":"Humanoid Form","img":"systems/pf1/icons/races/creature-types/humanoid.jpg","_id":"7nrt0AppNUZDPmYk"} */
// Original Author: EskieMoh#2969
// Rebuilt 1 by: MrVauxs#8622
// Rebuild 2 by: Amayori
// To go back to your original form, click the Revert button at the top of the sheet that's been transformed.

const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args);

if (args[0] !== "off") {
  // Store original token data
  const originalData = {
    name: tokenD.name,
    texture: {
      src: tokenD.document.texture.src,
      scaleX: tokenD.document.texture.scaleX,
      scaleY: tokenD.document.texture.scaleY,
    },
    ring: {
      enabled: tokenD.document.ring.enabled,
    },
  };

  let disguise;
  if (args[2].name || args[2].image || args[2].scale) {
    disguise = [
      args[2].name ?? tokenD.name,
      args[2].image ?? tokenD.document.texture.src,
      args[2].scale ?? tokenD.document.texture.scaleX,
    ];
  } else {
    let tokenName = tokenD.name.toLowerCase().split("").reverse().join("");
    tokenName = tokenName[0].toUpperCase() + tokenName.slice(1);

    let disguiseDefault = [
      tokenName,
      tokenD.document.texture.src,
      tokenD.document.texture.scaleX,
    ];

    if (Array.from(game.user.targets).length) {
      disguiseDefault = [
        Array.from(game.user.targets)[0].name,
        Array.from(game.user.targets)[0].document.texture.src,
        Array.from(game.user.targets)[0].document.texture.scaleX,
      ];
    }

    disguise = await Dialog.prompt({
      title: game.i18n.localize("pf1e-jb2a-macros.macro.disguise.humanoidForm"),
      content: `
        <form>
          <div class="form-group">
            <label>${game.i18n.localize("pf1e-jb2a-macros.macro.disguise.name")}</label>
            <input type="text" name="disguiseName" value="${disguiseDefault[0]}">
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("pf1e-jb2a-macros.macro.disguise.tokenImage")}</label>
            <input type="text" name="disguiseImage" value="${disguiseDefault[1]}">
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("pf1e-jb2a-macros.macro.disguise.tokenScale")}</label>
            <input type="text" name="disguiseScale" value="${disguiseDefault[2]}">
          </div>
        </form>
      `,
      buttons: {
        ok: {
          icon: "<i class='fas fa-check'></i>",
          label: "OK",
          callback: (html) => {
            return [
              html.find('input[name="disguiseName"]').val(),
              html.find('input[name="disguiseImage"]').val(),
              html.find('input[name="disguiseScale"]').val(),
            ];
          },
        },
        cancel: {
          icon: "<i class='fas fa-times'></i>",
          label: "Cancel",
          callback: () => null,
        },
      },
      default: "ok",
    });

    if (!disguise) return;

    disguise = disguise.map((x, index) =>
      x.length === 0 ? disguiseDefault[index] : x
    );
  }

  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .origin("Humanoid Form")
    .name("Humanoid Form - Intro (Casting)")
    .attachTo(tokenD)
    .file("jb2a.magic_signs.circle.02.transmutation.intro")
    .scaleToObject(1 * tokenScale)
    .waitUntilFinished(-500)
    .animateProperty("sprite", "rotation", {
      from: 0,
      to: 360,
      duration: 3000,
      ease: "easeOutExpo",
    })
    .effect()
    .origin("Humanoid Form")
    .name("Humanoid Form - Intro (Transformation)")
    .file(disguise[1])
    .scaleToObject(Number(disguise[2]))
    .fadeIn(800)
    .attachTo(tokenD)
    .thenDo(async () => {
      await tokenD.document.update({
        name: disguise[0],
        texture: {
          src: disguise[1],
          scaleX: Number(disguise[2]),
          scaleY: Number(disguise[2]),
        },
        ring: {
          enabled: false,
        },
        // PF1-TODO(autoscale-flag): pf2e's `flags.pf2e.autoscale` toggled off a
        // pf2e-system-specific per-token auto-resize behavior tied to creature
        // size; pf1 has no equivalent concept (confirmed: no "autoscale" hit
        // anywhere in systems/pf1), so this flag write is dropped rather than
        // invented. If pf1 gains an analogous token-scale-lock flag later,
        // wire it here.
      });
    })
    .play();

  // Store original data on the token for later use
  tokenD.document.setFlag(game.system.id, "originalData", originalData);

} else if (args[0] === "off") {
  // Retrieve original token data
  const originalData = tokenD.document.getFlag(game.system.id, "originalData");

  Sequencer.EffectManager.endEffects({
    origin: "Humanoid Form",
    object: tokenD,
  });

  if (originalData) {
    await tokenD.document.update({
      name: originalData.name,
      texture: {
        src: originalData.texture.src,
        scaleX: originalData.texture.scaleX,
        scaleY: originalData.texture.scaleY,
      },
      ring: {
        enabled: originalData.ring.enabled,
      },
    });

    // Remove the flag after reverting
    tokenD.document.unsetFlag(game.system.id, "originalData");
  }
}