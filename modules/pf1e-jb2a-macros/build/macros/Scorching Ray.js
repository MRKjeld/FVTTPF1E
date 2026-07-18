/* {"name":"Scorching Ray","img":"systems/pf1/icons/spells/fire-arrows-1.jpg","_id":"OOKf1Stu6m8HZNWA"} */
// Original Author: EskieMoh#2969
// Remastered by: MrVauxs#8622
// PF1E: header icon repointed to systems/pf1/icons/spells/fire-arrows-1.jpg (no
// "scorching"/"ray"-named file exists under systems/pf1/icons/spells/, and this module
// ships no icon of its own for Scorching Ray; fire-arrows is the closest thematic match).

const assets = game.modules.get("JB2A_DnD5e")?.active
  ? ["jb2a.particles.outward.greenyellow.02.05", { saturate: -1 }]
  : ["jb2a.particles.outward.orange.02.05", {}]

const [tokenD, tokenScale] = await pf1eAnimations.macroHelpers(args)
let targets = Array.from(game.user.targets)

if (!tokenD) {
  ui.notifications.error("No token found.")
  return
}

let targetDialogue = []
let rayCount = []

// PF1E: game.system.id is "pf1" here (systems/pf1/system.json), so this branch is
// never taken under this fork — execution always falls to the `else` below, which
// prompts (via warpgate) for how many rays to send at each target. That matches pf1's
// actual Scorching Ray mechanic (caster picks ray distribution across targets, unlike
// pf2e's fixed one-ray-per-target auto behavior), so no functional change is needed;
// left intact rather than deleted since this file is still shared/dual-system-aware
// upstream and the branch is harmless dead code under pf1.
if (game.system.id === "pf2e" || game.system.id === "sf2e") {
  for (let i of targets.keys()) {
    rayCount.push(1)
  }
} else {
  targetDialogue.push({
    type: "info",
    label: `Up to 10 each.`,
  })
  for (let i of targets.keys()) {
    targetDialogue.push({
      type: "number",
      label: `Rays to ${targets[i].name}`,
    })
  }
  pf1eAnimations.requireModule("warpgate")
  rayCount = await warpgate.dialog(targetDialogue, "🔥Scorching Ray🔥", "Cast!")
}

rayCount = rayCount.filter(Number).map((x) => Math.min(x, 10))

rayCount.map((ray, index) => {
  let target = targets[index]

  new Sequence({ moduleName: "PF1e Animations", softFail: true })
    .effect()
    .file("jb2a.magic_signs.circle.02.evocation.loop.yellow")
    .attachTo(tokenD, { offset: { x: -0.5 }, gridUnits: true, local: true })
    .fadeIn(500)
    .fadeOut(500)
    .scaleToObject(2.25)
    .rotateTowards(target, { attachTo: true })
    .duration(5000)
    .scale({ x: 1, y: 2 })
    .rotateIn(360, 2000, { ease: "easeInOutBack" })
    .scaleOut(0.2, 2000, { ease: "easeOutQuint", delay: -4000 })
    .effect()
    .filter("ColorMatrix", assets[1])
    .file(assets[0])
    .attachTo(tokenD, { offset: { x: -0.5 }, gridUnits: true, local: true })
    .fadeIn(500)
    .fadeOut(500)
    .scaleToObject(2.25)
    .rotateTowards(target, { attachTo: true })
    .duration(5000)
    .scale({ x: 1, y: 2 })
    .rotateIn(360, 2000, { ease: "easeInOutBack" })
    .scaleOut(0.3, 2000, { ease: "easeOutQuint", delay: -4000 })
    .wait(3000)
    .effect()
    .copySprite(tokenD)
    .filter("ColorMatrix", { contrast: 1, saturate: 1 })
    .attachTo(tokenD)
    .duration(1500 + Math.abs(ray) * 300)
    .fadeIn(500)
    .scaleToObject(1, { considerTokenScale: true })
    .fadeOut(500)
    .opacity(0.3)
    .filter("Blur", { blurX: 10, blurY: 20 })
    .tint("#ffbd2e")
    .effect()
    .file("jb2a.scorching_ray.orange")
    .attachTo(tokenD, { offset: { x: 0.4 }, gridUnits: true, local: true })
    .stretchTo(target, { attachTo: true })
    .repeats(Math.abs(ray), 250, 250)
    .randomizeMirrorY()
    .wait(200)
    .effect()
    .copySprite(target)
    .filter("ColorMatrix", { contrast: 1, saturate: 1 })
    .attachTo(target)
    .duration(1500)
    .fadeIn(500)
    .fadeOut(500)
    .scaleToObject(1, { considerTokenScale: true })
    .opacity(0.3)
    .filter("Blur", { blurX: 10, blurY: 20 })
    .tint("#ffbd2e")
    .play()
})
