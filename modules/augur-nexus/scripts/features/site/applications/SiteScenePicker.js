// Small picker app for linking an existing world scene to a site. This keeps scene selection out of the main panel.

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SiteScenePicker extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "augur-nexus-site-scene-picker",
        classes: ["augur-nexus", "site-scene-picker-dialog"],
        tag: "div",
        window: {
            title: "Select Scene",
            resizable: true,
            minimizable: false
        },
        position: {
            width: 420,
            height: 520
        }
    };

    static PARTS = {
        main: {
            template: "modules/augur-nexus/templates/site/site-scene-picker.hbs"
        }
    };

    constructor(currentSelection, onSelect) {
        super();
        this.currentSelection = currentSelection || null;
        this.onSelect = onSelect;
    }

    async _prepareContext() {
        const currentSceneId = canvas.scene?.id || null;
        const scenes = game.scenes.contents
            .filter(scene => scene.id !== currentSceneId)
            .sort((a, b) => (a.folder?.sort ?? 0) - (b.folder?.sort ?? 0) || a.sort - b.sort || a.name.localeCompare(b.name))
            .map(scene => ({
                id: scene.id,
                name: scene.name,
                folderName: scene.folder?.name || "",
                thumb: scene.thumb || "",
                isActive: scene.active,
                isSelected: scene.id === this.currentSelection
            }));

        return { scenes };
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        const el = htmlElement instanceof HTMLElement ? htmlElement : htmlElement[0];
        if (!el) return;

        const searchInput = el.querySelector("input[name='sceneSearch']");
        const cards = [...el.querySelectorAll("[data-scene-id]")];

        const applyFilter = () => {
            const query = (searchInput?.value || "").trim().toLowerCase();
            for (const card of cards) {
                const haystack = `${card.dataset.sceneName || ""} ${card.dataset.sceneFolder || ""}`.toLowerCase();
                card.hidden = !!query && !haystack.includes(query);
            }
        };

        searchInput?.addEventListener("input", applyFilter);

        for (const card of cards) {
            const choose = () => {
                const sceneId = card.dataset.sceneId;
                if (!sceneId) return;
                this.onSelect?.(sceneId);
                this.close();
            };

            card.addEventListener("click", choose);
            card.addEventListener("keydown", event => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                choose();
            });
        }
    }
}



