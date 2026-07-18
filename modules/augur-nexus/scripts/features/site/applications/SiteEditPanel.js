// Compact editor for existing site notes. This keeps edit mode separate from the placement workflow.

import { NexusTool } from "../../../support/utils/NexusTool.js";
import { SitePanel } from "./SitePanel.js";
import { SiteIconPicker } from "./SiteIconPicker.js";
import { SiteEditor } from "../services/SiteEditor.js";

export class SiteEditPanel extends NexusTool {
    static TOOL_NAME = "nexus-sites";
    static #instance = null;

    static DEFAULT_OPTIONS = {
        id: "augur-nexus-site-edit-panel",
        classes: ["augur-nexus", "site-edit-panel"],
        tag: "div",
        window: {
            title: "Edit Site",
            resizable: false,
            minimizable: true
        },
        position: {
            width: 400,
            height: "auto"
        }
    };

    static PARTS = {
        main: {
            template: "modules/augur-nexus/templates/site/site-edit-panel.hbs"
        }
    };

    static show() {
        if (!this.#instance) this.#instance = new this();
        this.#instance.render(true);
        return this.#instance;
    }

    static dismiss(options) {
        if (!this.#instance) return;
        const app = this.#instance;
        this.#instance = null;
        app.close(options);
    }

    static refreshIfOpen() {
        this.#instance?.render();
    }

    async _prepareContext() {
        const selectedSite = SiteEditor.getSelectedSiteState();
        const selectedIcon = selectedSite?.siteIconSrc
            ? { src: selectedSite.siteIconSrc, label: selectedSite.siteName || "Selected Site" }
            : null;

        if (selectedSite?.siteGenre) {
            await SitePanel.getIconCatalog(selectedSite.siteGenre);
        }

        return {
            hasSelection: !!selectedSite,
            selectedSiteName: selectedSite?.siteName || "No site selected",
            selectedSiteIconSrc: selectedIcon?.src || "",
            siteName: selectedSite?.siteName || "",
            selectedIconLabel: selectedIcon?.label || "Select Icon",
            selectedIconSrc: selectedIcon?.src || "",
            selectedIconRole: selectedSite?.siteIconRole || "landmark",
            selectedIconColor: selectedSite?.iconColor || SitePanel.DEFAULT_COLOR,
            selectedLabelColor: selectedSite?.labelColor || selectedSite?.iconColor || SitePanel.DEFAULT_COLOR,
            selectedIconSize: selectedSite?.iconSize || 100,
            iconRoles: SitePanel.ICON_ROLE_OPTIONS,
            colors: SitePanel.COLOR_OPTIONS
        };
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        const el = htmlElement instanceof HTMLElement ? htmlElement : htmlElement[0];
        if (!el) return;

        const nameInput = el.querySelector("input[name='siteName']");
        const applyNameButton = el.querySelector("[data-action='applySiteName']");
        const iconSizeInput = el.querySelector("input[name='iconSize']");
        const iconSizeValue = el.querySelector("[data-site-icon-size-value]");

        const syncApplyNameButton = () => {
            if (!nameInput || !applyNameButton) return;
            const baselineValue = nameInput.dataset.initialValue ?? "";
            const currentValue = nameInput.value ?? "";
            applyNameButton.hidden = currentValue === baselineValue;
        };

        const applySiteName = () => {
            if (!nameInput) return;
            const nextName = nameInput.value || "";
            void SiteEditor.updateSelectedSite({ siteName: nextName }).then(updated => {
                if (updated) this.render();
                else syncApplyNameButton();
            });
        };

        if (nameInput) {
            nameInput.dataset.initialValue = nameInput.value || "";
            syncApplyNameButton();

            nameInput.addEventListener("input", () => {
                syncApplyNameButton();
            });

            nameInput.addEventListener("keydown", event => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                applySiteName();
            });

            nameInput.addEventListener("change", () => {
                syncApplyNameButton();
                applySiteName();
            });

            nameInput.addEventListener("blur", () => {
                if (applyNameButton?.hidden !== false) return;
                applySiteName();
            });
        }

        if (applyNameButton) {
            applyNameButton.addEventListener("click", event => {
                event.preventDefault();
                applySiteName();
            });
        }

        if (iconSizeInput) {
            iconSizeInput.dataset.appliedValue = String(iconSizeInput.value || "");

            iconSizeInput.addEventListener("input", event => {
                const nextSize = Math.max(SitePanel.MIN_ICON_SIZE, Math.min(SitePanel.MAX_ICON_SIZE, Math.round(Number(event.currentTarget.value) || 100)));
                if (iconSizeValue) iconSizeValue.textContent = String(nextSize);
            });

            const applyIconSize = event => {
                const nextSize = Math.max(SitePanel.MIN_ICON_SIZE, Math.min(SitePanel.MAX_ICON_SIZE, Math.round(Number(event.currentTarget.value) || 100)));
                if (event.currentTarget.dataset.appliedValue === String(nextSize)) return;
                event.currentTarget.dataset.appliedValue = String(nextSize);
                if (iconSizeValue) iconSizeValue.textContent = String(nextSize);
                void SiteEditor.updateSelectedSite({ iconSize: nextSize }).then(updated => {
                    if (updated) this.render();
                });
            };

            iconSizeInput.addEventListener("change", applyIconSize);
            iconSizeInput.addEventListener("mouseup", applyIconSize);
            iconSizeInput.addEventListener("touchend", applyIconSize);
            iconSizeInput.addEventListener("keyup", event => {
                if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) return;
                applyIconSize(event);
            });
        }

        el.querySelectorAll("[data-site-icon-role]").forEach(button => {
            button.addEventListener("click", event => {
                const site = SiteEditor.getSelectedSiteState();
                if (!site) return;

                const nextRole = event.currentTarget.dataset.siteIconRole || "landmark";
                void SiteEditor.updateSelectedSite({
                    siteIconRole: nextRole,
                    siteIconRoleLabel: SitePanel.getIconRoleLabel(nextRole)
                }).then(updated => {
                    if (updated) this.render();
                });
            });
        });

        const iconPickerButton = el.querySelector("[data-action='pickSiteIcon']");
        if (iconPickerButton) {
            iconPickerButton.addEventListener("click", event => {
                event.preventDefault();
                const site = SiteEditor.getSelectedSiteState();
                if (!site) return;

                const icons = Promise.all([
                    SitePanel.getIconCatalog(site.siteGenre),
                    SitePanel.getAllBuiltInIcons()
                ]).then(([catalog, allBuiltInIcons]) => {
                        new SiteIconPicker(catalog?.icons || [], site.siteIcon, site.siteIconRole, selection => {
                            if (typeof selection === "object" && selection?.id === "custom") {
                                void SiteEditor.updateSelectedSite({
                                    siteIcon: "custom",
                                    siteIconSrc: selection.src || ""
                                }).then(updated => {
                                    if (updated) this.render();
                                });
                                return;
                            }

                            const nextIcon = allBuiltInIcons.find(icon => icon.id === selection && (icon.role || "landmark") === site.siteIconRole) || null;
                            void SiteEditor.updateSelectedSite({
                                siteIcon: selection || null,
                                siteIconSrc: nextIcon?.src || site.siteIconSrc || ""
                            }).then(updated => {
                                if (updated) this.render();
                            });
                        }, {
                            currentCustomIconSrc: site.siteIcon === "custom" ? site.siteIconSrc || "" : "",
                            allBuiltInIcons,
                            themeIconsOnlyLabel: "Show Theme Icons Only"
                        }).render(true);
                    });

                void icons;
            });
        }

        el.querySelectorAll("[data-site-icon-color]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                const nextColor = event.currentTarget.dataset.siteIconColor || SitePanel.DEFAULT_COLOR;
                void SiteEditor.updateSelectedSite({ iconColor: nextColor }).then(updated => {
                    if (updated) this.render();
                });
            });
        });

        el.querySelectorAll("[data-site-label-color]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                const nextColor = event.currentTarget.dataset.siteLabelColor || SitePanel.DEFAULT_COLOR;
                void SiteEditor.updateSelectedSite({ labelColor: nextColor }).then(updated => {
                    if (updated) this.render();
                });
            });
        });

        const doneEditingButton = el.querySelector("[data-action='doneEditing']");
        if (doneEditingButton) {
            doneEditingButton.addEventListener("click", event => {
                event.preventDefault();
                Hooks.callAll("augurNexusOpenSitesTool");
            });
        }
    }

    async close(options) {
        SiteEditPanel.#instance = null;
        return super.close(options);
    }
}

Hooks.on("augurNexusSiteEditorSelectionChanged", () => {
    SiteEditPanel.refreshIfOpen();
});
