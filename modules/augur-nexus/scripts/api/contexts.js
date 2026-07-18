// Public scene-context API for dependent modules.

import {
    registerSceneContext as registerSceneContextInternal,
    unregisterSceneContext as unregisterSceneContextInternal,
    sceneHasContext as sceneHasContextInternal
} from "../support/scene/NexusSceneContextRegistry.js";

export function registerSceneContext(contextId, matchesScene) {
    return registerSceneContextInternal(contextId, matchesScene);
}

export function unregisterSceneContext(contextId) {
    return unregisterSceneContextInternal(contextId);
}

export function sceneHasContext(scene, contextId) {
    return sceneHasContextInternal(scene, contextId);
}
