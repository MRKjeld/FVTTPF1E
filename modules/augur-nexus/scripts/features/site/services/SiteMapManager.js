// Scene linkage for Sites. Nexus navigation owns scene transitions and back behavior.

import { Log } from "../../../support/utils/Logger.js";
import { SiteJournalManager } from "./SiteJournalManager.js";
import { SitePanel } from "../applications/SitePanel.js";
import { getSiteSceneType, normalizeResolvedSiteScene } from "../registry/SiteSceneTypeRegistry.js";
import { NexusSceneFolderManager } from "../../nexus/services/NexusSceneFolderManager.js";
import { NexusSceneNavigationManager } from "../../nexus/services/NexusSceneNavigationManager.js";
import { NexusSceneTransitionEffects } from "../../nexus/services/NexusSceneTransitionEffects.js";

const MODULE_ID = "augur-nexus";

export class SiteMapManager {
    static ENRICHER_ID = "augur-nexus-open-site-map";
    static OPEN_MAP_PATTERN = /@AugurNexusOpenSiteMap\[([^\]]+)\]\{([^}]+)\}/g;

    static registerNoteHooks() {
        Hooks.on("refreshNote", note => {
            const flags = note?.document?.flags?.[MODULE_ID] || {};
            if (!flags.site || !note.controlIcon) return;

            note.controlIcon.bg.alpha = 0;
            note.controlIcon.border.alpha = 0;
            if (note.controlIcon.icon) note.controlIcon.icon.alpha = 1;
        });
    }

    static registerJournalEnricher() {
        const enrichers = CONFIG.TextEditor.enrichers;
        if (enrichers.some(entry => entry.id === this.ENRICHER_ID)) return;

        enrichers.push({
            id: this.ENRICHER_ID,
            pattern: this.OPEN_MAP_PATTERN,
            enricher: this._enrichOpenMap.bind(this),
            onRender: this._onRenderOpenMap.bind(this)
        });
    }

    static async _enrichOpenMap(match, options) {
        const [, siteId, label] = match;
        const pageUuid = options.relativeTo?.uuid || "";
        const wrapper = document.createElement("span");
        wrapper.classList.add("augur-nexus-open-site-map");

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.augurNexusOpenSiteMap = "true";
        button.dataset.siteId = siteId;
        button.dataset.pageUuid = pageUuid;
        button.textContent = label || "Open Map";
        button.style.marginTop = "10px";
        button.style.padding = "6px 10px";
        button.style.border = "1px solid rgba(255,255,255,0.2)";
        button.style.borderRadius = "6px";
        button.style.background = "rgba(36, 24, 10, 0.9)";
        button.style.color = "#f4e4c1";
        button.style.cursor = "pointer";

        wrapper.appendChild(button);
        return wrapper;
    }

    static _onRenderOpenMap(element) {
        const button = element.querySelector("button[data-augur-nexus-open-site-map]");
        if (!button || button.dataset.bound === "true") return;
        button.dataset.bound = "true";
        button.addEventListener("click", async event => {
            event.preventDefault();
            event.stopPropagation();

            if (!game.user.isGM) {
                ui.notifications.warn("Only the GM can create or open site scenes.");
                return;
            }

            const pageUuid = button.dataset.pageUuid;
            if (!pageUuid) return;

            const page = await fromUuid(pageUuid);
            if (!page) {
                ui.notifications.error("Could not resolve the site journal page.");
                return;
            }

            page.parent?.sheet?.close();

            const originalLabel = button.textContent;
            button.disabled = true;
            button.textContent = "Opening...";
            try {
                await this.openSite({ page });
            } catch (err) {
                Log.error("Failed to open site map.", err);
                ui.notifications.error("Failed to open the site map.");
            } finally {
                button.disabled = false;
                button.textContent = originalLabel;
            }
        });
    }

    static async openSite({ page = null, journalEntryId = null, pageId = null, parentSceneId = null, siteId = null } = {}) {
        const resolvedPage = page || this._resolveSitePage({ journalEntryId, pageId, parentSceneId, siteId });
        if (!resolvedPage) throw new Error("Could not resolve the site journal page.");
        return this.openFromJournalPage(resolvedPage);
    }

    static async openFromJournalPage(page) {
        SitePanel.dismiss();

        const siteFlags = page?.flags?.[MODULE_ID] || {};
        if (!siteFlags.sitePage || !siteFlags.siteId) {
            throw new Error("Journal page is not a valid Augur Nexus site page.");
        }

        const sceneType = getSiteSceneType(siteFlags.siteSceneType || "empty");
        if (!sceneType) throw new Error(`Unknown site scene type: ${siteFlags.siteSceneType}`);

        const autoSortScenes = siteFlags.autoSortScenes !== false;
        const existing = this._getLinkedScene(siteFlags.siteSceneId || siteFlags.linkedSceneId);
        const parentScene = game.scenes.get(siteFlags.parentSceneId);
        if (!parentScene) throw new Error("No parent scene found for this site.");

        if (sceneType.id === "existing") {
            if (!existing) {
                ui.notifications.error("This site does not have a valid linked scene.");
                throw new Error("The linked scene for this site could not be found.");
            }

            await NexusSceneFolderManager.placeExistingSceneInParentFolder(parentScene, existing, { autoSort: autoSortScenes });
            await this._prepareResolvedScene(existing, parentScene, page, sceneType);
            await this._persistSceneLink(page, existing.id);
            return this._enterScene(existing, { ...siteFlags, siteSceneId: existing.id });
        }

        if (existing) {
            await NexusSceneFolderManager.placeExistingSceneInParentFolder(parentScene, existing, { autoSort: autoSortScenes });
            return this._enterScene(existing, { ...siteFlags, siteSceneId: existing.id });
        }

        let siteScene;
        let afterEnter = null;
        if (typeof sceneType.resolveScene === "function") {
            const resolved = normalizeResolvedSiteScene(await sceneType.resolveScene({
                existingScene: existing,
                parentScene,
                page,
                pageFlags: siteFlags,
                manager: this,
                moduleId: MODULE_ID
            }));
            if (!resolved?.scene) throw new Error(`Scene type '${sceneType.id}' did not return a scene.`);
            siteScene = resolved.scene;
            afterEnter = resolved.afterEnter;
            await NexusSceneFolderManager.placeExistingSceneInParentFolder(parentScene, siteScene, { autoSort: autoSortScenes });
            await this._prepareResolvedScene(siteScene, parentScene, page, sceneType);
        } else {
            siteScene = await this._createSiteScene(parentScene, page, sceneType);
        }

        await this._persistSceneLink(page, siteScene.id);
        await this._enterScene(siteScene, { ...siteFlags, siteSceneId: siteScene.id });
        if (afterEnter) {
            await afterEnter(siteScene, {
                parentScene,
                page,
                pageFlags: siteFlags,
                sceneType,
                manager: this,
                moduleId: MODULE_ID
            });
        }
        return siteScene;
    }

    static _getLinkedScene(sceneId) {
        if (!sceneId) return null;
        return game.scenes.get(sceneId) || null;
    }

    static _resolveSitePage({ journalEntryId = null, pageId = null, parentSceneId = null, siteId = null } = {}) {
        if (journalEntryId && pageId) {
            return game.journal.get(journalEntryId)?.pages.get(pageId) || null;
        }

        if (parentSceneId && siteId) {
            const parentScene = game.scenes.get(parentSceneId);
            const resolvedJournalEntryId = parentScene?.getFlag(MODULE_ID, "siteJournalId") || null;
            if (!resolvedJournalEntryId) return null;
            return SiteJournalManager.findSitePage(resolvedJournalEntryId, siteId);
        }

        return null;
    }

    static async _enterScene(targetScene, siteFlags) {
        const parentScene = siteFlags.parentSceneId ? game.scenes.get(siteFlags.parentSceneId) : null;
        const visibleSiteNote = this._getVisibleSiteNote(siteFlags.siteId, parentScene);
        await NexusSceneTransitionEffects.transitionToScene(targetScene, {
            fromScene: parentScene,
            focusPlaceable: visibleSiteNote
        });
        return targetScene;
    }

    static _getVisibleSiteNote(siteId, scene) {
        if (!siteId || !scene || canvas.scene?.id !== scene.id) return null;
        return canvas.notes.placeables.find(note => note.document.flags?.[MODULE_ID]?.siteId === siteId) || null;
    }

    static async _createSiteScene(parentScene, page, sceneType) {
        const pageFlags = page.flags?.[MODULE_ID] || {};
        const createData = await NexusSceneFolderManager.getChildSceneCreateData(parentScene, {
            autoSort: pageFlags.autoSortScenes !== false
        });
        const scene = await Scene.create({
            name: page.name,
            folder: createData.folderId || null,
            sort: createData.sort
        });
        await this._prepareResolvedScene(scene, parentScene, page, sceneType);
        return scene;
    }

    static async _prepareResolvedScene(scene, parentScene, page, sceneType) {
        const pageFlags = page.flags?.[MODULE_ID] || {};
        const parentNote = this._getSiteNoteDocument(parentScene, pageFlags.siteId);

        await NexusSceneNavigationManager.setSceneNavigation(scene, {
            parentSceneId: parentScene.id,
            parentSiteId: pageFlags.siteId || null,
            transitionStyle: "focus-note",
            transitionContext: {
                noteId: parentNote?.id || null,
                moduleId: MODULE_ID,
                flagKey: "siteId",
                flagValue: pageFlags.siteId || null
            }
        });

        await scene.update({
            flags: {
                [MODULE_ID]: {
                    siteScene: true,
                    site: {
                        siteId: pageFlags.siteId,
                        siteName: page.name,
                        siteGenre: pageFlags.siteGenre || "fantasy",
                        siteGenreLabel: pageFlags.siteGenreLabel || "Fantasy",
                        siteSceneType: sceneType?.id || pageFlags.siteSceneType || "empty",
                        siteSceneTypeLabel: sceneType?.label || pageFlags.siteSceneTypeLabel || "Empty Scene",
                        siteScenePresetId: pageFlags.siteScenePresetId || null,
                        siteScenePresetLabel: pageFlags.siteScenePresetLabel || "",
                        siteSceneBiomeId: pageFlags.siteSceneBiomeId || null,
                        siteSceneBiomeLabel: pageFlags.siteSceneBiomeLabel || "",
                        siteSceneBiomeFieldLabel: pageFlags.siteSceneBiomeFieldLabel || sceneType?.biomeLabel || "Biome",
                        siteSceneImageSrc: pageFlags.siteSceneImageSrc || "",
                        siteSceneImageName: pageFlags.siteSceneImageName || "",
                        linkedSceneId: scene.id,
                        linkedSceneName: scene.name,
                        siteTheme: pageFlags.siteTheme || "castle",
                        siteThemeLabel: pageFlags.siteThemeLabel || "Castle",
                        siteIconRole: pageFlags.siteIconRole || "landmark",
                        siteIconRoleLabel: pageFlags.siteIconRoleLabel || "Landmark",
                        mapColorId: pageFlags.mapColorId || "green",
                        mapColorLabel: pageFlags.mapColorLabel || "Green",
                        siteSize: pageFlags.siteSize || "small",
                        siteSizeLabel: pageFlags.siteSizeLabel || "Small",
                        roomCount: pageFlags.roomCount || 5,
                        autoSortScenes: pageFlags.autoSortScenes !== false,
                        siteIcon: pageFlags.siteIcon || null,
                        siteIconSrc: pageFlags.siteIconSrc || "",
                        siteColor: pageFlags.siteColor || "#ffffff",
                        journalEntryId: page.parent?.id || null,
                        journalPageId: page.id,
                        parentSceneId: parentScene.id,
                        parentSceneName: parentScene.name
                    }
                }
            }
        });
    }

    static async _persistSceneLink(page, sceneId) {
        const pageFlags = page.flags?.[MODULE_ID] || {};
        const linkedScene = sceneId ? game.scenes.get(sceneId) : null;
        await SiteJournalManager.updateSitePageSceneLink(page.parent?.id, pageFlags.siteId, sceneId, linkedScene?.name || "");

        const parentScene = pageFlags.parentSceneId ? game.scenes.get(pageFlags.parentSceneId) : null;
        const note = parentScene ? this._getSiteNoteDocument(parentScene, pageFlags.siteId) : null;
        if (note) {
            await parentScene.updateEmbeddedDocuments("Note", [{
                _id: note.id,
                [`flags.${MODULE_ID}.siteSceneId`]: sceneId,
                [`flags.${MODULE_ID}.linkedSceneId`]: sceneId,
                [`flags.${MODULE_ID}.linkedSceneName`]: linkedScene?.name || ""
            }]);
        }
        Hooks.callAll("augurNexusLineageChanged");
    }

    static _getSiteNoteDocument(scene, siteId) {
        if (!scene || !siteId) return null;
        return scene.notes?.contents?.find(note => note.flags?.[MODULE_ID]?.siteId === siteId) || null;
    }
}


