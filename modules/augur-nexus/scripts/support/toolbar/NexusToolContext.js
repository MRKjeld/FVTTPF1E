// Scene-aware visibility rules and toolbar hook wiring for Nexus tools.

import { AugurControls } from "../utils/AugurControls.js";
import { SitePanel } from "../../features/site/applications/SitePanel.js";
import { SiteEditPanel } from "../../features/site/applications/SiteEditPanel.js";
import { SiteEditor } from "../../features/site/services/SiteEditor.js";
import { SiteGenerator } from "../../features/site/services/SiteGenerator.js";
import { NexusPanel } from "../../features/nexus/applications/NexusPanel.js";
import { LegacySciFiCompatibility } from "../compatibility/LegacySciFiCompatibility.js";
import { NexusSceneNavigationManager } from "../../features/nexus/services/NexusSceneNavigationManager.js";

let nexusPanelInstance = null;
let sitePanelInstance = null;
let siteEditPanelInstance = null;
const toolbarContributions = new Map();

export function registerToolbarTools(moduleId, tools = []) {
    if (!moduleId) throw new Error("A module id is required to register toolbar tools.");
    toolbarContributions.set(moduleId, Array.isArray(tools) ? tools : []);
}

export function unregisterToolbarTools(moduleId) {
    if (!moduleId) return;
    toolbarContributions.delete(moduleId);
}

export function isNexusSiteToolSuppressedScene(scene = canvas.scene) {
    return !scene;
}

export function getNexusBackTarget(scene = canvas.scene) {
    if (!scene) return null;

    const navigation = NexusSceneNavigationManager.getSceneNavigation(scene);
    if (navigation) return navigation;

    return LegacySciFiCompatibility.getBackTarget(scene);
}

export function reconcileNexusActiveToolForScene(scene = canvas.scene) {
    if (!isNexusSiteToolSuppressedScene(scene)) return;

    const activeControl = ui.controls.control?.name || ui.controls.activeControl;
    const activeTool = ui.controls.tool?.name || ui.controls.tool;
    if (activeControl !== "augurTools") return;
    if (!["nexus-sites", "nexus-back"].includes(activeTool)) return;
    ui.controls.activate({ control: "augurTools", tool: "augur-select" });
}

export function populateNexusTools({
    augur,
    scene = canvas.scene,
    handlers = {}
} = {}) {
    if (!augur) return;

    augur.tools["nexus-browser"] = {
        name: "nexus-browser",
        title: "Nexus",
        icon: "fas fa-infinity",
        onChange: handlers.onNexusChange
    };

    const backTarget = getNexusBackTarget(scene);
    if (backTarget) {
        augur.tools["nexus-back"] = {
            name: "nexus-back",
            title: "Back",
            icon: "fas fa-circle-arrow-left",
            button: true,
            onChange: handlers.onBackChange
        };
    }

    if (!isNexusSiteToolSuppressedScene(scene)) {
        augur.tools["nexus-sites"] = {
            name: "nexus-sites",
            title: "Sites",
            icon: "fas fa-location-dot",
            onChange: handlers.onSitesChange
        };
    }

    applyRegisteredToolbarTools(augur, scene);

    AugurControls.prioritizeTools(augur, [
        "augur-select",
        "nexus-browser",
        "nexus-back",
        "nexus-sites"
    ]);
}

function applyRegisteredToolbarTools(augur, scene = canvas.scene) {
    for (const tools of toolbarContributions.values()) {
        for (const tool of tools) {
            if (!tool?.name) continue;
            if (typeof tool.isVisible === "function" && !tool.isVisible(scene)) continue;

            const { isVisible, ...toolData } = tool;
            augur.tools[tool.name] = toolData;
        }
    }
}

function openNexusSitesTool() {
    if (isNexusSiteToolSuppressedScene(canvas.scene)) {
        ui.notifications.warn("Sites are not available in this scene.");
        return;
    }

    if (canvas.ready && canvas.augur && !canvas.augur.active) {
        canvas.augur.activate();
    }

    SiteEditor.deactivate();
    SiteGenerator.resetGhost();

    if (ui.controls) {
        ui.controls.activate({ control: "augurTools", tool: "nexus-sites" });
    }

    if (siteEditPanelInstance) {
        const app = siteEditPanelInstance;
        siteEditPanelInstance = null;
        app.close({ skipToolDeactivate: true });
    }

    if (!sitePanelInstance) {
        sitePanelInstance = SitePanel.show();
    } else {
        sitePanelInstance.render(true, { focus: true });
    }
}

function openNexusSiteEditorTool() {
    if (isNexusSiteToolSuppressedScene(canvas.scene)) {
        ui.notifications.warn("Sites are not available in this scene.");
        return;
    }

    if (canvas.ready && canvas.augur && !canvas.augur.active) {
        canvas.augur.activate();
    }

    SiteEditor.activate();
    SiteGenerator.resetGhost();

    if (ui.controls) {
        ui.controls.activate({ control: "augurTools", tool: "nexus-sites" });
    }

    if (sitePanelInstance) {
        const app = sitePanelInstance;
        sitePanelInstance = null;
        app.close({ skipToolDeactivate: true });
    }

    if (!siteEditPanelInstance) {
        siteEditPanelInstance = SiteEditPanel.show();
    } else {
        siteEditPanelInstance.render(true, { focus: true });
    }
}

export function registerNexusToolbarHooks() {
    Hooks.on("augurNexusOpenSitesTool", openNexusSitesTool);
    Hooks.on("augurNexusOpenSiteEditorTool", openNexusSiteEditorTool);

    Hooks.on("renderSceneControls", controls => {
        const activeName = controls.control?.name || controls.activeControl;
        if (activeName !== "augurTools") return;

        const layer = canvas.augur;
        if (canvas.ready && layer && !layer.active) {
            layer.activate();
        }
    });

    Hooks.on("getSceneControlButtons", controls => {
        const augur = AugurControls.getOrCreate(controls);
        if (!augur) return;

        populateNexusTools({
            augur,
            scene: canvas.scene,
            handlers: {
                onNexusChange: (event, active) => {
                    if (active) {
                        if (!nexusPanelInstance) {
                            nexusPanelInstance = NexusPanel.show();
                        } else {
                            nexusPanelInstance.render(true, { focus: true });
                        }
                    } else if (nexusPanelInstance) {
                        const app = nexusPanelInstance;
                        nexusPanelInstance = null;
                        app.close();
                    }
                },
                onSitesChange: (event, active) => {
                    if (active) {
                        if (SiteEditor.isEditMode) {
                            if (!siteEditPanelInstance) {
                                siteEditPanelInstance = SiteEditPanel.show();
                            } else {
                                siteEditPanelInstance.render(true, { focus: true });
                            }
                        } else if (!sitePanelInstance) {
                            sitePanelInstance = SitePanel.show();
                        } else {
                            sitePanelInstance.render(true, { focus: true });
                        }
                    } else if (sitePanelInstance || siteEditPanelInstance) {
                        SiteGenerator.resetGhost();
                        SiteEditor.deactivate();
                        const siteApp = sitePanelInstance;
                        const siteEditApp = siteEditPanelInstance;
                        sitePanelInstance = null;
                        siteEditPanelInstance = null;
                        siteApp?.close();
                        siteEditApp?.close();
                    } else {
                        SiteGenerator.resetGhost();
                        SiteEditor.deactivate();
                    }
                },
                onBackChange: async (event, active) => {
                    if (!active) return;

                    ui.controls.activate({ control: "augurTools", tool: "augur-select" });
                    const returned = await NexusSceneNavigationManager.returnToParent(canvas.scene)
                        || await LegacySciFiCompatibility.returnToParent(canvas.scene);
                    if (!returned) {
                        ui.notifications.warn("No parent scene was found for this view.");
                    }
                }
            }
        });
    });
}

export function refreshNexusToolbarForScene(scene = canvas.scene) {
    reconcileNexusActiveToolForScene(scene);
    nexusPanelInstance?.render();
    ui.nexus?.render?.();

    if (sitePanelInstance && isNexusSiteToolSuppressedScene(scene)) {
        const app = sitePanelInstance;
        sitePanelInstance = null;
        app.close();
    }

    if (siteEditPanelInstance && isNexusSiteToolSuppressedScene(scene)) {
        const app = siteEditPanelInstance;
        siteEditPanelInstance = null;
        SiteEditor.deactivate();
        app.close();
    }
}

