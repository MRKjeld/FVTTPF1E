// Public compatibility helpers for dependent modules.

import { isV14OrNewer as isV14OrNewerInternal } from "../support/compatibility/FoundryVersion.js";
import {
    getSceneBackgroundColor as getSceneBackgroundColorInternal,
    getSceneBackgroundSource as getSceneBackgroundSourceInternal,
    setSceneBackground as setSceneBackgroundInternal,
    setSceneBackgroundColor as setSceneBackgroundColorInternal,
    setSceneBackgroundSource as setSceneBackgroundSourceInternal
} from "../support/compatibility/SceneBackgroundCompatibility.js";
import { LegacySciFiCompatibility } from "../support/compatibility/LegacySciFiCompatibility.js";

export function isV14OrNewer() {
    return isV14OrNewerInternal();
}

export function getSceneBackgroundColor(scene, fallback) {
    return getSceneBackgroundColorInternal(scene, fallback);
}

export function getSceneBackgroundSource(scene, fallback) {
    return getSceneBackgroundSourceInternal(scene, fallback);
}

export function setSceneBackgroundColor(scene, color) {
    return setSceneBackgroundColorInternal(scene, color);
}

export function setSceneBackgroundSource(scene, source) {
    return setSceneBackgroundSourceInternal(scene, source);
}

export function setSceneBackground(scene, background) {
    return setSceneBackgroundInternal(scene, background);
}

export function getLegacySciFiSiteScenesForBody(rootScene, bodyType, designation) {
    return LegacySciFiCompatibility.getSiteScenesForBody(rootScene, bodyType, designation);
}

