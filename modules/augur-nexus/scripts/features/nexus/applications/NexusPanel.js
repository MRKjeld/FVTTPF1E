// Main Nexus window. This anchors the campaign root and shows the lineage tree without exposing the folder layer underneath it.

import { NexusTool } from "../../../support/utils/NexusTool.js";
import { NexusBrowserApplicationMixin } from "./NexusBrowserApplicationMixin.js";

export class NexusPanel extends NexusBrowserApplicationMixin(NexusTool) {
    static TOOL_NAME = "nexus-browser";
    static #instance = null;

    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        id: "augur-nexus-browser-panel",
        classes: ["augur-nexus", "nexus-browser-panel"],
        tag: "div",
        window: {
            title: "Nexus",
            resizable: true,
            minimizable: true
        },
        position: {
            width: 380,
            height: "auto",
            left: 120,
            top: 60
        }
    };

    static show() {
        if (!this.#instance) this.#instance = new this();
        this.#instance.render(true, { focus: true });
        return this.#instance;
    }

    static dismiss() {
        if (!this.#instance) return;
        const app = this.#instance;
        this.#instance = null;
        app.resetNexusBrowserState();
        app.close();
    }

    static refresh() {
        this.#instance?.render();
    }

    async close(options) {
        NexusPanel.#instance = null;
        this.resetNexusBrowserState();
        return super.close(options);
    }
}
