// Shared Scene Controls wiring for the Augur toolbar. This keeps Nexus and any future modules speaking the same control shape.
// This was the main reason I developed this central module, as this was getting out of hand to maintain.

import { Log } from "./Logger.js";

export class AugurControls {
    static CATEGORY_ID = "augurTools";
    static CATEGORY_TITLE = "Augur Tools";
    static CATEGORY_ICON = "fas fa-infinity";
    static DEFAULT_LAYER = "augur";

    static getOrCreate(controls) {
        if (!game.user.isGM) return null;

        if (Array.isArray(controls)) {
            let existing = controls.find(control => control.name === this.CATEGORY_ID);
            if (!existing) {
                existing = this._createCategory();
                controls.push(existing);
            } else {
                existing.layer = this.DEFAULT_LAYER;
            }
            return existing;
        }

        if (typeof controls === "object" && controls !== null) {
            if (!controls[this.CATEGORY_ID]) {
                controls[this.CATEGORY_ID] = this._createCategory();
            } else {
                controls[this.CATEGORY_ID].layer = this.DEFAULT_LAYER;
            }
            return controls[this.CATEGORY_ID];
        }

        Log.warn("Unknown scene controls structure for Augur tools.", controls);
        return null;
    }

    static prioritizeTools(augur, leadingToolIds = []) {
        if (!augur?.tools || typeof augur.tools !== "object") return augur;

        const nextTools = {};
        for (const toolId of leadingToolIds) {
            if (augur.tools[toolId]) {
                nextTools[toolId] = augur.tools[toolId];
            }
        }

        for (const [toolId, tool] of Object.entries(augur.tools)) {
            if (!nextTools[toolId]) {
                nextTools[toolId] = tool;
            }
        }

        augur.tools = nextTools;
        return augur;
    }

    static _createCategory() {
        return {
            name: this.CATEGORY_ID,
            title: this.CATEGORY_TITLE,
            layer: this.DEFAULT_LAYER,
            icon: this.CATEGORY_ICON,
            activeTool: "augur-select",
            tools: {
                "augur-select": {
                    name: "augur-select",
                    title: "Pan",
                    icon: "fas fa-hand",
                    onChange: () => {
                        const layer = canvas.augur || canvas.layers?.augur;
                        if (canvas.ready && layer) {
                            layer.activate();
                        }
                    }
                }
            }
        };
    }
}




