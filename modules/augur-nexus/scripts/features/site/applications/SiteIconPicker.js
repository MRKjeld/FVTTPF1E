// Small picker app for choosing a site icon. This keeps built-in and custom icons separate.

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const FilePicker = foundry.applications.apps.FilePicker.implementation;

const MODULE_ID = "augur-nexus";
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif"];

export class SiteIconPicker extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "augur-nexus-site-icon-picker",
        classes: ["augur-nexus", "site-icon-picker-dialog"],
        tag: "div",
        window: {
            title: "Select Site Icon",
            resizable: true,
            minimizable: false
        },
        position: {
            width: 860,
            height: 620
        }
    };

    static PARTS = {
        main: {
            template: "modules/augur-nexus/templates/site/site-icon-picker.hbs"
        }
    };

    constructor(icons, currentSelection, currentRole, onSelect, options = {}) {
        super();
        this.icons = icons;
        this.allBuiltInIcons = options.allBuiltInIcons || icons;
        this.currentSelection = currentSelection;
        this.currentRole = currentRole || "landmark";
        this.onSelect = onSelect;
        this.currentCustomIconSrc = options.currentCustomIconSrc || "";
        this.currentTab = options.currentTab || (currentSelection === "custom" ? "custom" : "built-in");
        this.showThemeIconsOnly = options.showThemeIconsOnly !== false;
        this.themeIconsOnlyLabel = options.themeIconsOnlyLabel || "Show Theme Icons Only";
    }

    async _prepareContext() {
        const builtInSource = this.showThemeIconsOnly ? this.icons : this.allBuiltInIcons;
        const filteredIcons = builtInSource.filter(icon => (icon.role || "landmark") === this.currentRole);
        const customFolder = this.#getCustomFolderSetting();
        const customIcons = await this.#getCustomFolderIcons(customFolder);

        return {
            icons: filteredIcons,
            selected: this.currentSelection,
            currentCustomIconSrc: this.currentCustomIconSrc,
            currentTab: this.currentTab,
            customFolderPath: customFolder.path || "",
            hasCustomFolder: !!customFolder.path,
            customIcons,
            pickerLabel: this.currentTab === "custom"
                ? "Custom"
                : (this.showThemeIconsOnly ? (this.currentRole === "entrance" ? "Theme Entrance" : "Theme Landmark") : (this.currentRole === "entrance" ? "All Entrance" : "All Landmark")),
            showThemeIconsOnly: this.showThemeIconsOnly,
            themeIconsOnlyLabel: this.themeIconsOnlyLabel
        };
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        const el = htmlElement instanceof HTMLElement ? htmlElement : htmlElement[0];
        if (!el) return;

        el.querySelectorAll("[data-icon-tab]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                const nextTab = event.currentTarget.dataset.iconTab;
                if (!nextTab || nextTab === this.currentTab) return;
                this.currentTab = nextTab;
                this.render();
            });
        });

        const themeIconsOnlyToggle = el.querySelector("[name='showThemeIconsOnly']");
        if (themeIconsOnlyToggle) {
            themeIconsOnlyToggle.addEventListener("change", event => {
                this.showThemeIconsOnly = !!event.currentTarget.checked;
                this.render();
            });
        }

        el.querySelectorAll("[data-site-icon-id]").forEach(card => {
            card.addEventListener("click", event => this.#handleIconCardClick(event.currentTarget));
            card.addEventListener("keydown", event => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                this.#handleIconCardClick(event.currentTarget);
            });
        });

        const chooseFolderButton = el.querySelector("[data-action='chooseCustomIconFolder']");
        if (chooseFolderButton) {
            chooseFolderButton.addEventListener("click", event => {
                event.preventDefault();
                this.#openCustomFolderPicker();
            });
        }

        const clearFolderButton = el.querySelector("[data-action='clearCustomIconFolder']");
        if (clearFolderButton) {
            clearFolderButton.addEventListener("click", async event => {
                event.preventDefault();
                await game.settings.set(MODULE_ID, "siteCustomIconFolder", {
                    source: "data",
                    path: ""
                });
                this.render();
            });
        }
    }

    #handleIconCardClick(card) {
        const iconId = card.dataset.siteIconId;
        if (iconId === "custom-folder") {
            const src = card.dataset.siteIconSrc;
            if (!src) return;
            this.onSelect?.({ id: "custom", src });
            this.close();
            return;
        }

        if (!iconId) return;
        this.onSelect?.(iconId);
        this.close();
    }


    #openCustomFolderPicker() {
        const currentFolder = this.#getCustomFolderSetting();
        const picker = new FilePicker({
            type: "folder",
            current: currentFolder.path || "",
            activeSource: currentFolder.source || "data",
            callback: async (path, pickerApp) => {
                await game.settings.set(MODULE_ID, "siteCustomIconFolder", {
                    source: pickerApp.activeSource || currentFolder.source || "data",
                    path: path || ""
                });
                this.currentTab = "custom";
                this.render();
            },
            top: (this.position?.top ?? 100) + 40,
            left: (this.position?.left ?? 100) + 10
        });

        picker.render({ force: true });
    }

    #getCustomFolderSetting() {
        const stored = game.settings.get(MODULE_ID, "siteCustomIconFolder") || {};
        return {
            source: stored.source || "data",
            path: stored.path || ""
        };
    }

    async #getCustomFolderIcons(folder) {
        if (!folder?.path) return [];

        try {
            const browseResult = await FilePicker.browse(folder.source || "data", folder.path, {
                extensions: IMAGE_EXTENSIONS
            });

            return (browseResult.files || []).map(src => ({
                id: src,
                src,
                label: this.#getFileLabel(src)
            }));
        } catch (err) {
            console.warn("Augur: Nexus | Failed to browse custom icon folder.", err);
            return [];
        }
    }

    #getFileLabel(src) {
        return String(src || "")
            .split(/[\/]/)
            .pop()
            ?.replace(/\.[^.]+$/, "") || "Custom Icon";
    }
}
