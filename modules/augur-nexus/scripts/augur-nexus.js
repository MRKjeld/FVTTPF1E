// Nexus bootstrap. This wires the shared toolbar, layer, settings, and Sites feature into Foundry.

import { Log } from "./support/utils/Logger.js";
import { registerAugurLayer } from "./support/canvas/registerAugurLayer.js";
import { registerSiteCanvasHooks } from "./features/site/hooks/registerSiteCanvasHooks.js";
import { SiteMapManager } from "./features/site/services/SiteMapManager.js";
import { registerSceneHooks } from "./features/nexus/hooks/registerSceneHooks.js";
import { registerNexusSettings } from "./support/settings/registerSettings.js";
import { registerNexusToolbarHooks } from "./support/toolbar/NexusToolContext.js";
import { registerSceneContext } from "./api/contexts.js";
import { NexusSidebarTab } from "./features/nexus/applications/NexusSidebarTab.js";

const MODULE_ID = "augur-nexus";

function registerNexusSidebarTab() {
    CONFIG.ui.nexus = NexusSidebarTab;
    foundry.applications.sidebar.Sidebar.TABS.nexus = {
        tooltip: "Nexus",
        icon: "fa-solid fa-infinity",
        gmOnly: true
    };
}

Hooks.on("init", () => {
    Log.info("Initializing Augur: Nexus");

    registerNexusSidebarTab();

    registerSceneContext("augur-nexus:navigation-scene", scene =>
        !!scene?.notes?.contents?.some(note => note?.flags?.[MODULE_ID]?.site === true)
    );

    registerAugurLayer();

    registerNexusSettings();
    registerNexusToolbarHooks();
    registerSiteCanvasHooks();
    registerSceneHooks();

    SiteMapManager.registerNoteHooks();
    SiteMapManager.registerJournalEnricher();
});

