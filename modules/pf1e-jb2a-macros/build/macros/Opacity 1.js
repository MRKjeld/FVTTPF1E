/* {"name":"Opacity 1","img":"icons/svg/circle.svg","_id":"4iMplY0v8RTHCFgm"} */
pf1eAnimations.debug("Turning a token to opacity 1", args)
new Sequence({ moduleName: "PF1e Animations", softFail: true })
  .animation()
  .on(args[1].allTargets[0])
  .opacity(1)
  .play()

if (game.modules.get("tokenmagic-automatic-wounds")?.active) {
  await TokenMagicAutomaticWounds.removeWoundsOnToken(args[1].allTargets[0])
}
