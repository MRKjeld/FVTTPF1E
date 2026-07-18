// Scene lifecycle hooks for Nexus. This owns browser refresh, branch delete interception, and post-delete cleanup.

import { NexusPanel } from "../applications/NexusPanel.js";
import { NexusLineageManager } from "../services/NexusLineageManager.js";
import { NexusSceneOperations } from "../services/NexusSceneOperations.js";

const MODULE_ID = "augur-nexus";

function refreshNexusBrowsers() {
    NexusPanel.refresh();
    ui.nexus?.render?.();
}

function isNexusSiteDocument(document) {
    return !!document?.flags?.[MODULE_ID]?.site || !!document?.flags?.[MODULE_ID]?.sitePage;
}

export function registerSceneHooks() {
    for (const hookName of ["createScene", "updateScene", "deleteScene"]) {
        Hooks.on(hookName, refreshNexusBrowsers);
    }

    Hooks.on("augurNexusLineageChanged", refreshNexusBrowsers);

    for (const hookName of ["createNote", "updateNote", "deleteNote", "createJournalEntryPage", "updateJournalEntryPage", "deleteJournalEntryPage"]) {
        Hooks.on(hookName, document => {
            if (isNexusSiteDocument(document)) refreshNexusBrowsers();
        });
    }

    Hooks.on("preDeleteScene", (scene, options, userId) => {
        if (userId !== game.user.id) return;
        if (options?.[MODULE_ID]?.nexusDeleteHandled) return;

        const childScenes = NexusLineageManager.getChildScenes(scene);
        if (!childScenes.length) return;

        NexusSceneOperations.confirmAndDeleteSceneBranch(scene, { bypassHook: true }).catch(err => {
            console.error(err);
            ui.notifications.error("Failed to delete the selected Nexus branch.");
        });

        return false;
    });

    Hooks.on("deleteScene", (scene, options, userId) => {
        if (userId !== game.user.id) return;
        if (options?.[MODULE_ID]?.nexusDeleteHandled) return;

        NexusSceneOperations.cleanupDeletedScene(scene).catch(err => {
            console.error(err);
            ui.notifications.error("Failed to clean Nexus records for the deleted scene.");
        });
    });
}

