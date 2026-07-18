// Small rename window for Nexus scenes. This keeps the rename flow explicit without turning it into a destructive confirmation loop.

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

import { NexusSceneOperations } from "../services/NexusSceneOperations.js";

export class NexusSceneRenameDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    static #instance = null;

    static DEFAULT_OPTIONS = {
        tag: "div",
        id: "augur-nexus-scene-rename",
        classes: ["augur-nexus", "nexus-scene-rename"],
        window: { title: "Rename Scene", resizable: false, minimizable: false },
        position: { width: 360, height: "auto", left: 180, top: 100 }
    };

    static PARTS = {
        main: { template: "modules/augur-nexus/templates/nexus/nexus-scene-rename.hbs" }
    };

    static show(scene) {
        if (this.#instance) this.#instance.close();
        this.#instance = new this(scene);
        this.#instance.render(true, { focus: true });
        return this.#instance;
    }

    #scene = null;

    constructor(scene, options = {}) {
        super(options);
        this.#scene = scene || null;
    }

    async _prepareContext() {
        return { sceneName: this.#scene?.name || "", hasScene: !!this.#scene };
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        const el = htmlElement instanceof HTMLElement ? htmlElement : htmlElement[0];
        if (!el) return;

        const input = el.querySelector("[name='sceneName']");
        if (input) {
            requestAnimationFrame(() => {
                input.focus({ preventScroll: true });
                input.select();
            });
        }

        el.querySelector("form")?.addEventListener("submit", async event => {
            event.preventDefault();
            await this.#submit(el);
        });

        el.querySelector("[data-action='saveRename']")?.addEventListener("click", async event => {
            event.preventDefault();
            await this.#submit(el);
        });

        el.querySelector("[data-action='cancelRename']")?.addEventListener("click", event => {
            event.preventDefault();
            this.close();
        });
    }

    async #submit(rootElement) {
        if (!this.#scene) return;

        const input = rootElement.querySelector("[name='sceneName']");
        const nextName = input?.value?.trim() || "";
        if (!nextName) {
            ui.notifications.warn("Scene name cannot be empty.");
            input?.focus({ preventScroll: true });
            return;
        }

        try {
            await NexusSceneOperations.renameScene(this.#scene, nextName);
            this.close();
        } catch (err) {
            console.error(err);
            ui.notifications.error("Failed to rename the selected Nexus scene.");
        }
    }

    async close(options) {
        NexusSceneRenameDialog.#instance = null;
        return super.close(options);
    }
}

