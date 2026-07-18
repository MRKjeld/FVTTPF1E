// Shared scene-context registry for dependent modules to describe scene identity
// without reading each other's flags directly.

const sceneContexts = new Map();

export function registerSceneContext(contextId, matchesScene) {
    if (!contextId) throw new Error("A scene context id is required.");
    if (typeof matchesScene !== "function") {
        throw new Error(`Scene context "${contextId}" requires a predicate function.`);
    }

    sceneContexts.set(contextId, matchesScene);
}

export function unregisterSceneContext(contextId) {
    if (!contextId) return;
    sceneContexts.delete(contextId);
}

export function sceneHasContext(scene, contextId) {
    if (!scene || !contextId) return false;

    const matchesScene = sceneContexts.get(contextId);
    if (typeof matchesScene !== "function") return false;

    try {
        return matchesScene(scene) === true;
    } catch (_err) {
        return false;
    }
}
