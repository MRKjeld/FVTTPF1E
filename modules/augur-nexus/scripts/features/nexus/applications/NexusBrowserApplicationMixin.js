// Shared Nexus browser behavior for the floating tool and the sidebar tab.

import { NexusLineageManager } from "../services/NexusLineageManager.js";
import { NexusSceneOperations } from "../services/NexusSceneOperations.js";
import { NexusSceneNavigationManager } from "../services/NexusSceneNavigationManager.js";
import { NexusSceneTransitionEffects } from "../services/NexusSceneTransitionEffects.js";
import { NexusRootSceneCreationManager } from "../services/NexusRootSceneCreationManager.js";
import { NexusFloatingMenu } from "../services/NexusFloatingMenu.js";
import { NexusSceneRenameDialog } from "./NexusSceneRenameDialog.js";
import { SiteMapManager } from "../../site/services/SiteMapManager.js";
import { getSiteSceneType } from "../../site/registry/SiteSceneTypeRegistry.js";
import { LegacySciFiCompatibility } from "../../../support/compatibility/LegacySciFiCompatibility.js";

const ROOT_SCENE_MENU_OPTIONS = [
    { id: "empty", label: "Empty Scene", icon: "fas fa-file", kind: "empty" },
    { id: "image", label: "From Image", icon: "fas fa-image", kind: "image" },
    { id: "instant-dungeons-generator", label: "Dungeon Generator", icon: "fas fa-dungeon", kind: "sceneType" },
    { id: "hexlands-generator", label: "Hexmap Generator", icon: "fas fa-cubes-stacked", kind: "sceneType" },
    { id: "augur-scifi-solar-system", label: "Solar System", icon: "fas fa-solar-system", kind: "sceneType" },
    { id: "augur-scifi-sector", label: "Sector Generator", icon: "fas fa-map", kind: "sceneType" }
];

export function NexusBrowserApplicationMixin(Base) {
    return class NexusBrowserApplication extends Base {
        static PARTS = {
            main: {
                template: "modules/augur-nexus/templates/nexus/nexus-panel.hbs"
            }
        };

        #expandedSceneIds = new Set();
        #searchQuery = "";
        #wasSearchFocused = false;
        #siteSceneTypesChangedHook = null;

        resetNexusBrowserState() {
            this.#searchQuery = "";
            this.#wasSearchFocused = false;
        }

        #normalizeSearchQuery(query) {
            return (query || "").trim().toLocaleLowerCase();
        }

        #pruneExpandedSceneIds(rows) {
            const rowIds = new Set(rows.map(row => row.id));
            for (const sceneId of [...this.#expandedSceneIds]) {
                if (!rowIds.has(sceneId)) this.#expandedSceneIds.delete(sceneId);
            }
        }

        #getDescendantIds(sceneId, rows) {
            if (!sceneId) return [];
            const descendants = [];
            const childIdsByParent = new Map();
            for (const row of rows) {
                if (!row.parentNodeId) continue;
                const childIds = childIdsByParent.get(row.parentNodeId) || [];
                childIds.push(row.id);
                childIdsByParent.set(row.parentNodeId, childIds);
            }

            const visit = parentId => {
                for (const childId of childIdsByParent.get(parentId) || []) {
                    descendants.push(childId);
                    visit(childId);
                }
            };
            visit(sceneId);
            return descendants;
        }

        #isSceneCollapsed(row) {
            return !!row?.hasChildren && !this.#expandedSceneIds.has(row.id);
        }

        #getCurrentSceneAncestorIds(currentScene, rows) {
            if (!currentScene) return new Set();

            const rowsById = new Map(rows.map(row => [row.id, row]));
            const ancestorIds = new Set();
            let parentId = rowsById.get(`scene:${currentScene.id}`)?.parentNodeId || null;
            while (parentId) {
                ancestorIds.add(parentId);
                parentId = rowsById.get(parentId)?.parentNodeId || null;
            }
            return ancestorIds;
        }

        #toggleSceneCollapse(sceneId, rows) {
            if (!sceneId) return;
            const row = rows.find(candidate => candidate.id === sceneId);
            if (!row?.hasChildren) return;

            if (this.#expandedSceneIds.has(sceneId)) {
                this.#expandedSceneIds.delete(sceneId);
                for (const descendantId of this.#getDescendantIds(sceneId, rows)) {
                    this.#expandedSceneIds.delete(descendantId);
                }
            } else {
                this.#expandedSceneIds.add(sceneId);
            }
        }

        #collapseAllScenes() {
            this.#expandedSceneIds.clear();
        }

        #closeSceneOptionsMenus(rootElement) {
            rootElement?.querySelectorAll("[data-action='toggleSceneOptions'][aria-expanded='true']").forEach(button => {
                button.setAttribute("aria-expanded", "false");
            });
            NexusFloatingMenu.close();
        }

        #closeFloatingMenus(rootElement) {
            this.#closeSceneOptionsMenus(rootElement);
            rootElement?.querySelector("[data-action='toggleRootSceneMenu']")?.setAttribute("aria-expanded", "false");
        }

        async #renameLineageScene(sceneId) {
            const scene = sceneId ? game.scenes.get(sceneId) : null;
            if (!scene) return;
            NexusSceneRenameDialog.show(scene);
        }

        async #configureLineageScene(sceneId) {
            const scene = sceneId ? game.scenes.get(sceneId) : null;
            if (!scene?.sheet) return;
            scene.sheet.render({ force: true });
        }

        async #deleteLineageScene(sceneId) {
            const scene = sceneId ? game.scenes.get(sceneId) : null;
            if (!scene) return;

            try {
                await NexusSceneOperations.confirmAndDeleteSceneBranch(scene);
            } catch (err) {
                console.error(err);
                ui.notifications.error("Failed to delete the selected Nexus branch.");
            }
        }

        #openSceneOptionsMenu(button, rootElement) {
            const sceneId = button.dataset.sceneId;
            const items = [];

            if (button.dataset.canRename === "true") {
                items.push({
                    id: "rename",
                    label: "Rename",
                    icon: "fas fa-pen",
                    onSelect: () => this.#renameLineageScene(sceneId)
                });
            }
            if (button.dataset.canConfigure === "true") {
                items.push({
                    id: "configure",
                    label: "Configure",
                    icon: "fas fa-cog",
                    onSelect: () => this.#configureLineageScene(sceneId)
                });
            }
            if (button.dataset.canDelete === "true") {
                items.push({
                    id: "delete",
                    label: "Delete Branch",
                    icon: "fas fa-trash",
                    danger: true,
                    onSelect: () => this.#deleteLineageScene(sceneId)
                });
            }

            if (!items.length) return;
            this.#closeFloatingMenus(rootElement);
            button.setAttribute("aria-expanded", "true");
            NexusFloatingMenu.open({
                anchor: button,
                items,
                className: "nexus-scene-options-menu",
                onClose: () => button.setAttribute("aria-expanded", "false")
            });
        }

        async #createRootSceneFromMenuOption(option, anchor) {
            const rect = anchor.getBoundingClientRect();
            const position = {
                width: 320,
                left: Math.max(20, window.innerWidth - 630),
                top: Math.max(20, rect.top - 80)
            };

            if (!option.available) {
                await this.#showRootSceneRequirementDialog(option);
            } else if (option.kind === "empty") {
                await NexusRootSceneCreationManager.createEmptyScene({ position });
            } else if (option.kind === "image") {
                NexusRootSceneCreationManager.openImagePicker({
                    position: {
                        left: Math.max(20, window.innerWidth - 660),
                        top: Math.max(20, rect.top - 260)
                    }
                });
            } else if (option.kind === "sceneType" && option.id) {
                await NexusRootSceneCreationManager.createGeneratedScene(option.id);
            }
        }

        #openRootSceneMenu(button, rootElement) {
            const options = this.#getRootSceneMenuOptions();
            if (!options.length) return;

            this.#closeFloatingMenus(rootElement);
            button.setAttribute("aria-expanded", "true");
            NexusFloatingMenu.open({
                anchor: button,
                className: "nexus-root-scene-menu",
                onClose: () => button.setAttribute("aria-expanded", "false"),
                items: options.map(option => ({
                    id: option.id,
                    label: option.label,
                    icon: option.icon,
                    status: option.status,
                    unavailable: option.available === false,
                    onSelect: async () => {
                        try {
                            await this.#createRootSceneFromMenuOption(option, button);
                        } catch (err) {
                            console.error(err);
                            ui.notifications.error("Failed to create the root scene.");
                        } finally {
                            this.render();
                        }
                    }
                }))
            });
        }

        #getBackTarget(scene) {
            if (!scene) return null;
            return NexusSceneNavigationManager.getSceneNavigation(scene)
                || LegacySciFiCompatibility.getBackTarget(scene);
        }

        #getRootSceneMenuOptions() {
            return ROOT_SCENE_MENU_OPTIONS.map(option => {
                if (option.kind !== "sceneType") return { ...option, available: true };

                const sceneType = getSiteSceneType(option.id);
                const isRegistered = sceneType?.id === option.id;
                const isAvailable = isRegistered
                    && sceneType.available !== false
                    && typeof sceneType.resolveScene === "function";
                return {
                    ...option,
                    label: isRegistered ? sceneType.label : option.label,
                    available: isAvailable,
                    status: isAvailable ? "" : (sceneType?.requiresLabel ? `Requires ${sceneType.requiresLabel}` : "Unavailable"),
                    requiresLabel: sceneType?.requiresLabel || "",
                    requiresUrl: sceneType?.requiresUrl || "",
                    requiresVersion: sceneType?.minimumModuleVersion || ""
                };
            });
        }

        async #showRootSceneRequirementDialog(option) {
            const label = option?.requiresLabel || option?.label || "the required module";
            const version = option?.requiresVersion ? ` ${option.requiresVersion}+` : "";
            const url = option?.requiresUrl || "";
            const safeLabel = foundry.utils.escapeHTML(label);
            const safeVersion = foundry.utils.escapeHTML(version);

            await foundry.applications.api.DialogV2.wait({
                window: {
                    title: "Module Required",
                    icon: "fa-solid fa-circle-info"
                },
                position: {
                    width: 420
                },
                content: `<p><strong>${safeLabel}${safeVersion}</strong> is required to create this root scene type.</p>`,
                buttons: [
                    {
                        action: "close",
                        label: "Close",
                        icon: "fa-solid fa-xmark"
                    },
                    {
                        action: "viewModule",
                        label: "View Module",
                        icon: "fa-solid fa-up-right-from-square",
                        default: true,
                        callback: () => {
                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                        }
                    }
                ]
            });
        }

        async _prepareContext(options) {
            const context = super._prepareContext ? await super._prepareContext(options) : {};
            const { rootScene, rows } = NexusLineageManager.getLineageRows();
            const currentScene = canvas.scene || null;
            const parentScene = currentScene ? NexusLineageManager.getParentScene(currentScene) : null;
            const backTarget = this.#getBackTarget(currentScene);
            const currentAncestorIds = this.#getCurrentSceneAncestorIds(currentScene, rows);
            const showSceneIcons = game.settings.get("augur-nexus", "nexusBrowserShowIcons") !== false;
            this.#pruneExpandedSceneIds(rows);

            return {
                ...context,
                currentSceneName: currentScene?.name || "No active scene",
                rootSceneId: rootScene?.id || "",
                rootSceneName: rootScene?.name || "No Nexus scene set",
                rootSceneThumb: rootScene?.thumb || "",
                hasRootScene: !!rootScene,
                canOpenRootScene: !!rootScene && rootScene.id !== currentScene?.id,
                parentSceneName: parentScene?.name || "",
                hasParentScene: !!parentScene,
                hasBackTarget: !!backTarget,
                canOpenSitesTool: !!currentScene,
                searchQuery: this.#searchQuery,
                showSceneIcons,
                isSearching: !!this.#normalizeSearchQuery(this.#searchQuery),
                hasRows: rows.length > 0,
                rows: rows.map(row => ({
                    ...row,
                    isPending: row.nodeKind !== "scene",
                    isCollapsed: this.#isSceneCollapsed(row),
                    isCurrentAncestor: currentAncestorIds.has(row.id),
                    hasIcon: !!row.iconSrc,
                    hasOptions: !!(row.canRename || row.canConfigure || row.canDelete),
                    indent: `${row.depth * 15}px`,
                    openLabel: row.nodeKind === "pending-site" ? "Open site" : row.nodeKind.startsWith("legacy-scifi-pending-") ? "Generate scene" : "Open scene",
                    nodeTypeLabel: row.nodeKind !== "scene"
                        ? row.typeLabel
                        : row.isRoot
                            ? "Nexus"
                            : row.isCurrent
                                ? `Current ${row.typeLabel || "Scene"}`
                                : (row.typeLabel || (row.hasChildren ? "Parent Scene" : "Scene"))
                }))
            };
        }

        #applyLineageFilter(rootElement) {
            const tree = rootElement.querySelector(".nexus-browser-tree");
            const emptyState = rootElement.querySelector(".nexus-browser-empty");
            if (!tree || !emptyState) return;

            const query = this.#normalizeSearchQuery(this.#searchQuery);
            const rowElements = [...tree.querySelectorAll(".nexus-browser-pill-shell")];
            const rows = rowElements.map(element => ({
                element,
                id: element.dataset.nodeId || "",
                parentNodeId: element.dataset.parentNodeId || "",
                depth: Number(element.dataset.depth || 0),
                name: (element.dataset.name || "").toLocaleLowerCase(),
                hasChildren: element.dataset.hasChildren === "true"
            }));

            const rowsById = new Map(rows.map(row => [row.id, row]));
            const childrenByParent = new Map();
            for (const row of rows) {
                if (!row.parentNodeId) continue;
                const bucket = childrenByParent.get(row.parentNodeId) || [];
                bucket.push(row);
                childrenByParent.set(row.parentNodeId, bucket);
            }

            let visibleIds = new Set();
            if (query) {
                const matchingRows = rows.filter(row => row.name.includes(query));
                for (const row of matchingRows) {
                    visibleIds.add(row.id);

                    let parentId = row.parentNodeId || null;
                    while (parentId) {
                        visibleIds.add(parentId);
                        parentId = rowsById.get(parentId)?.parentNodeId || null;
                    }

                    for (const childRow of childrenByParent.get(row.id) || []) {
                        visibleIds.add(childRow.id);
                    }
                }
            } else {
                const collapsedDepths = [];
                for (const row of rows) {
                    while (collapsedDepths.length && row.depth <= collapsedDepths.at(-1)) {
                        collapsedDepths.pop();
                    }

                    const hiddenByAncestor = collapsedDepths.length > 0;
                    if (!hiddenByAncestor) visibleIds.add(row.id);
                    if (row.hasChildren && !this.#expandedSceneIds.has(row.id)) collapsedDepths.push(row.depth);
                }
            }

            let visibleCount = 0;
            for (const row of rows) {
                const isVisible = visibleIds.has(row.id);
                row.element.hidden = !isVisible;
                row.element.classList.toggle("search-match", !!query && row.name.includes(query));
                const collapseButton = row.element.querySelector("[data-action='toggleLineageBranch']");
                if (collapseButton) {
                    collapseButton.disabled = !!query;
                    collapseButton.classList.toggle("search-disabled", !!query);
                    collapseButton.tabIndex = query ? -1 : 0;
                }
                if (isVisible) visibleCount += 1;
            }

            tree.classList.toggle("search-active", !!query);
            tree.hidden = visibleCount === 0;
            emptyState.hidden = visibleCount > 0;
            emptyState.textContent = query ? "No scenes match this search." : "No lineage data yet. Use Sites or set the current scene as the Nexus scene.";
        }

        _onFirstRender(context, options) {
            if (super._onFirstRender) super._onFirstRender(context, options);
            this.#siteSceneTypesChangedHook = Hooks.on("augurNexusSiteSceneTypesChanged", () => this.render());
        }

        async close(options) {
            if (this.#siteSceneTypesChangedHook) {
                Hooks.off("augurNexusSiteSceneTypesChanged", this.#siteSceneTypesChangedHook);
                this.#siteSceneTypesChangedHook = null;
            }
            return super.close ? super.close(options) : undefined;
        }

        _attachPartListeners(partId, htmlElement, options) {
            if (super._attachPartListeners) super._attachPartListeners(partId, htmlElement, options);
            const el = htmlElement instanceof HTMLElement ? htmlElement : htmlElement[0];
            if (!el) return;

            const searchInput = el.querySelector("[name='nexusSceneSearch']");
            const clearSearchButton = el.querySelector("[data-action='clearSceneSearch']");
            const collapseAllButton = el.querySelector("[data-action='collapseAllScenes']");
            if (searchInput) {
                if (this.#wasSearchFocused) {
                    requestAnimationFrame(() => {
                        searchInput.focus({ preventScroll: true });
                        const end = searchInput.value.length;
                        searchInput.setSelectionRange(end, end);
                    });
                }

                searchInput.addEventListener("focus", () => {
                    this.#wasSearchFocused = true;
                });

                searchInput.addEventListener("blur", () => {
                    this.#wasSearchFocused = false;
                });

                searchInput.addEventListener("input", event => {
                    const input = event.currentTarget;
                    this.#searchQuery = input.value || "";
                    this.#wasSearchFocused = true;
                    clearSearchButton?.toggleAttribute("hidden", !this.#searchQuery);
                    this.#applyLineageFilter(el);
                });
            }

            if (clearSearchButton) {
                clearSearchButton.toggleAttribute("hidden", !this.#searchQuery);
                clearSearchButton.addEventListener("click", event => {
                    event.preventDefault();
                    this.#searchQuery = "";
                    this.#wasSearchFocused = true;
                    if (searchInput) searchInput.value = "";
                    clearSearchButton.hidden = true;
                    this.#applyLineageFilter(el);
                    searchInput?.focus({ preventScroll: true });
                });
            }

            collapseAllButton?.addEventListener("click", event => {
                event.preventDefault();
                this.#collapseAllScenes();
                this.render();
            });

            const showIconsToggle = el.querySelector("[name='nexusBrowserShowIcons']");
            showIconsToggle?.addEventListener("change", async event => {
                await game.settings.set("augur-nexus", "nexusBrowserShowIcons", event.currentTarget.checked);
                this.render();
            });

            const toggleRootSceneMenuButton = el.querySelector("[data-action='toggleRootSceneMenu']");
            toggleRootSceneMenuButton?.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                this.#openRootSceneMenu(event.currentTarget, el);
            });

            const setRootButton = el.querySelector("[data-action='setCurrentAsNexus']");
            if (setRootButton) {
                setRootButton.addEventListener("click", async event => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!canvas.scene) return;

                    const sceneName = foundry.utils.escapeHTML(canvas.scene.name);
                    const confirmed = await foundry.applications.api.DialogV2.confirm({
                        window: {
                            title: "Change Campaign Nexus"
                        },
                        content: `<p>Set <strong>${sceneName}</strong> as the campaign Nexus scene?</p>`,
                        rejectClose: false,
                        modal: true,
                        yes: {
                            label: "Set Nexus"
                        },
                        no: {
                            label: "Cancel"
                        }
                    });
                    if (!confirmed) return;

                    await NexusLineageManager.setRootScene(canvas.scene);
                    ui.notifications.info(`Set "${canvas.scene.name}" as the Nexus scene.`);
                    this.render();
                });
            }

            const openRootButton = el.querySelector("[data-action='openRootScene']");
            if (openRootButton) {
                openRootButton.addEventListener("click", async event => {
                    event.preventDefault();
                    const rootScene = NexusLineageManager.getRootScene();
                    if (!rootScene) return;
                    await NexusSceneTransitionEffects.transitionToScene(rootScene, { transitionStyle: "none" });
                });
            }

            const goBackButton = el.querySelector("[data-action='returnToParentScene']");
            if (goBackButton) {
                goBackButton.addEventListener("click", async event => {
                    event.preventDefault();
                    const returned = await NexusSceneNavigationManager.returnToParent(canvas.scene)
                        || await LegacySciFiCompatibility.returnToParent(canvas.scene);
                    if (!returned) {
                        ui.notifications.warn("No parent scene was found for this view.");
                    }
                });
            }

            const openSitesButton = el.querySelector("[data-action='openSitesTool']");
            if (openSitesButton) {
                openSitesButton.addEventListener("click", event => {
                    event.preventDefault();
                    Hooks.callAll("augurNexusOpenSitesTool");
                });
            }

            el.querySelectorAll("[data-action='toggleLineageBranch']").forEach(button => {
                button.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const sceneId = event.currentTarget.dataset.sceneId;
                    const { rows } = NexusLineageManager.getLineageRows();
                    this.#toggleSceneCollapse(sceneId, rows);
                    this.render();
                });
            });

            el.querySelectorAll("[data-action='openLineageScene']").forEach(button => {
                button.addEventListener("click", async event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.#closeFloatingMenus(el);
                    const buttonEl = event.currentTarget;
                    const nodeKind = buttonEl.dataset.nodeKind || "scene";

                    if (nodeKind === "pending-site") {
                        try {
                            await SiteMapManager.openSite({
                                journalEntryId: buttonEl.dataset.journalEntryId || null,
                                pageId: buttonEl.dataset.pageId || null,
                                parentSceneId: buttonEl.dataset.parentSceneId || null,
                                siteId: buttonEl.dataset.siteId || null
                            });
                        } catch (err) {
                            console.error(err);
                            ui.notifications.error("Failed to open the selected site.");
                        }
                        return;
                    }

                    if (nodeKind.startsWith("legacy-scifi-pending-")) {
                        try {
                            const opened = await LegacySciFiCompatibility.openPendingNode({
                                nodeKind,
                                journalEntryId: buttonEl.dataset.journalEntryId || null,
                                pageId: buttonEl.dataset.pageId || null,
                                parentSceneId: buttonEl.dataset.parentSceneId || null
                            });
                            if (!opened) {
                                ui.notifications.warn("Could not resolve the selected Sci-Fi scene.");
                            }
                        } catch (err) {
                            console.error(err);
                            ui.notifications.error("Failed to open the selected Sci-Fi scene.");
                        }
                        return;
                    }

                    const sceneId = buttonEl.dataset.sceneId;
                    const scene = sceneId ? game.scenes.get(sceneId) : null;
                    if (!scene) return;
                    await NexusSceneTransitionEffects.transitionToScene(scene, { transitionStyle: "none" });
                });
            });

            el.querySelectorAll("[data-action='toggleSceneOptions']").forEach(button => {
                button.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.#openSceneOptionsMenu(event.currentTarget, el);
                });
            });

            el.querySelectorAll("[data-action='renameLineageScene']").forEach(button => {
                button.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.#closeFloatingMenus(el);
                    void this.#renameLineageScene(event.currentTarget.dataset.sceneId);
                });
            });

            el.querySelectorAll("[data-action='configureLineageScene']").forEach(button => {
                button.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.#closeFloatingMenus(el);
                    void this.#configureLineageScene(event.currentTarget.dataset.sceneId);
                });
            });

            el.querySelectorAll("[data-action='deleteLineageScene']").forEach(button => {
                button.addEventListener("click", async event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.#closeFloatingMenus(el);
                    await this.#deleteLineageScene(event.currentTarget.dataset.sceneId);
                });
            });

            this.#applyLineageFilter(el);
        }
    };
}
