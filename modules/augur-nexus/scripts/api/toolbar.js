// Public toolbar API for dependent modules.

import {
    registerToolbarTools as registerToolbarToolsInternal,
    unregisterToolbarTools as unregisterToolbarToolsInternal
} from "../support/toolbar/NexusToolContext.js";

export function registerToolbarTools(moduleId, tools = []) {
    return registerToolbarToolsInternal(moduleId, tools);
}

export function unregisterToolbarTools(moduleId) {
    return unregisterToolbarToolsInternal(moduleId);
}

