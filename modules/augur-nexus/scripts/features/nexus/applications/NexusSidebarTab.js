// Sidebar copy of the Nexus browser. The floating scene-control window remains available.

import { NexusBrowserApplicationMixin } from "./NexusBrowserApplicationMixin.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { AbstractSidebarTab } = foundry.applications.sidebar;

export class NexusSidebarTab extends NexusBrowserApplicationMixin(HandlebarsApplicationMixin(AbstractSidebarTab)) {
    static tabName = "nexus";

    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        id: "nexus",
        classes: ["tab", "sidebar-tab", "augur-nexus", "nexus-browser-sidebar-tab"],
        window: {
            title: "Nexus"
        }
    };
}
