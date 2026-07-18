// Scene background color compatibility helpers. This keeps the V13 and V14 document differences out of feature code.

import { isV14OrNewer } from "./FoundryVersion.js";

function getInitialSceneLevel(scene) {
    return scene?.initialLevel ?? scene?.firstLevel ?? scene?.levels?.contents?.[0] ?? null;
}

/**
 * Read the effective scene background color.
 */
export function getSceneBackgroundColor(scene, fallback = "#1a1a1a") {
    if (!scene) return fallback;

    if (isV14OrNewer()) {
        const level = getInitialSceneLevel(scene);
        const levelColor = foundry.utils.getProperty(level, "background.color");
        if (levelColor) return levelColor;
    }

    return scene.backgroundColor || fallback;
}

/**
 * Read the effective scene background source.
 */
export function getSceneBackgroundSource(scene, fallback = "") {
    if (!scene) return fallback;

    if (isV14OrNewer()) {
        const level = getInitialSceneLevel(scene);
        const levelSource = foundry.utils.getProperty(level, "background.src");
        if (levelSource !== undefined && levelSource !== null) return levelSource;
    }

    return scene.background?.src || fallback;
}

/**
 * Persist the scene background color across V13 and V14+.
 */
export async function setSceneBackgroundColor(scene, color) {
    if (!scene || !color) return;

    if (isV14OrNewer()) {
        const level = getInitialSceneLevel(scene);
        if (level) {
            await level.update({ "background.color": color });
            return;
        }
    }

    await scene.update({ backgroundColor: color });
}

/**
 * Persist the scene background source across V13 and V14+.
 */
export async function setSceneBackgroundSource(scene, source) {
    if (!scene || source === undefined) return;

    if (isV14OrNewer()) {
        const level = getInitialSceneLevel(scene);
        if (level) {
            await level.update({ "background.src": source });
            return;
        }
    }

    await scene.update({ "background.src": source });
}

/**
 * Persist scene background fields across V13 and V14+.
 */
export async function setSceneBackground(scene, { color, src } = {}) {
    if (!scene) return;

    if (isV14OrNewer()) {
        const level = getInitialSceneLevel(scene);
        if (level) {
            const updateData = {};
            if (color !== undefined) updateData["background.color"] = color;
            if (src !== undefined) updateData["background.src"] = src;
            if (!foundry.utils.isEmpty(updateData)) await level.update(updateData);
            return;
        }
    }

    const updateData = {};
    if (color !== undefined) updateData.backgroundColor = color;
    if (src !== undefined) updateData["background.src"] = src;
    if (!foundry.utils.isEmpty(updateData)) await scene.update(updateData);
}


