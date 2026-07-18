// Canvas-side Sites behavior. This owns preview, placement, dragging, and deletion for site notes.

import { SitePanel } from "../applications/SitePanel.js";
import { SiteJournalManager } from "./SiteJournalManager.js";
import { Log } from "../../../support/utils/Logger.js";
import { getSiteSceneType } from "../registry/SiteSceneTypeRegistry.js";
import { isNexusSiteToolSuppressedScene } from "../../../support/toolbar/NexusToolContext.js";
import { NexusSceneFolderManager } from "../../nexus/services/NexusSceneFolderManager.js";
import { NexusLineageManager } from "../../nexus/services/NexusLineageManager.js";
import { NexusSceneNavigationManager } from "../../nexus/services/NexusSceneNavigationManager.js";

const MODULE_ID = "augur-nexus";

export class SiteGenerator {
    static NOTE_FONT_SIZE = 38;
    static NOTE_FONT_FAMILY = "Bruno Ace";
    static NOTE_TEXT_ANCHOR = CONST.TEXT_ANCHOR_POINTS.RIGHT;
    static #dragState = null;
    static #ghostContainer = null;
    static #ghostSignature = null;

    static async syncGhost(position, { shiftKey = false } = {}) {
        if (shiftKey) {
            this.clearGhost();
            return;
        }

        const state = SitePanel.getState();
        if (!state?.iconSrc) {
            this.clearGhost();
            return;
        }

        const signature = ["place", state.iconSrc, state.iconColor, state.iconSize, state.siteName || "Site"].join("|");
        if (!this.#ghostContainer || this.#ghostSignature !== signature) {
            await this.#ensureGhostContainer(state, signature);
        }

        if (!this.#ghostContainer) return;
        const ghostPosition = this.#getPlacementPosition(position, state);
        this.#ghostContainer.position.set(Math.round(ghostPosition.x), Math.round(ghostPosition.y));
        this.#ghostContainer.visible = true;
    }

    static clearGhost() {
        if (this.#ghostContainer) this.#ghostContainer.visible = false;
    }

    static resetGhost() {
        if (this.#ghostContainer?.parent) this.#ghostContainer.parent.removeChild(this.#ghostContainer);
        this.#ghostContainer?.destroy({ children: true });
        this.#ghostContainer = null;
        this.#ghostSignature = null;
    }

    static async handleCanvasClick(position, { shiftKey = false } = {}) {
        const siteNote = this.getSiteNoteAtPosition(position);
        if (shiftKey) {
            if (siteNote) await this.deleteSite(siteNote);
            return;
        }
        if (siteNote) return;
        await this.createSite(position);
    }

    static async createSite(position) {
        const scene = canvas.scene;
        if (!scene || isNexusSiteToolSuppressedScene(scene)) {
            ui.notifications.warn("Sites are not available in this scene.");
            return;
        }

        const state = SitePanel.getState();
        const selectedIcon = SitePanel.getSelectedIcon();
        if (!selectedIcon?.src) {
            ui.notifications.warn("No site icon is currently available.");
            return;
        }
        if (state.sceneTypeAvailable === false) {
            const requirement = state.sceneTypeRequiresText || `${state.sceneTypeRequiresLabel || "This scene type"} required`;
            ui.notifications.warn(requirement);
            return;
        }
        if (state.sceneType === "existing" && !state.linkedSceneId) {
            ui.notifications.warn("Choose a linked scene before placing an Existing Scene site.");
            return;
        }
        if (state.showImageControls && !state.sceneImageSrc) {
            ui.notifications.warn("Choose an image before placing a From Image site.");
            return;
        }

        const siteName = (state.siteName || SitePanel.DEFAULT_NAME || "Site").trim() || "Site";
        const siteId = foundry.utils.randomID();
        const placement = this.#getPlacementPosition(position, state);
        const page = await SiteJournalManager.addSitePage(scene, {
            siteId,
            siteName,
            siteGenre: state.genreId,
            siteGenreLabel: state.genreLabel,
            siteSceneType: state.sceneType,
            siteSceneTypeLabel: state.sceneTypeLabel,
            siteScenePresetId: state.sceneTypePresetId || null,
            siteScenePresetLabel: state.sceneTypePresetLabel || "",
            siteSceneBiomeId: state.sceneTypeBiomeId || null,
            siteSceneBiomeLabel: state.sceneTypeBiomeLabel || "",
            siteSceneBiomeFieldLabel: state.sceneTypeBiomeFieldLabel || "Biome",
            siteSceneImageSrc: state.sceneImageSrc || "",
            siteSceneImageName: state.sceneImageName || "",
            linkedSceneId: state.linkedSceneId,
            linkedSceneName: state.linkedSceneName,
            siteIconRole: state.iconRole,
            siteIconRoleLabel: state.iconRoleLabel,
            iconId: state.iconId,
            iconSrc: selectedIcon.src,
            siteColor: state.iconColor,
            siteLabelColor: state.iconColor,
            siteTheme: state.themeId,
            siteThemeLabel: state.themeLabel,
            mapColorId: state.mapColorId,
            mapColorLabel: state.mapColorLabel,
            siteSize: state.sizeId,
            siteSizeLabel: state.sizeLabel,
            roomCount: state.roomCount,
            autoSortScenes: state.autoSortScenes
        });

        if (!page) {
            ui.notifications.error("Failed to create the linked site journal page.");
            return;
        }

        const journalEntry = page.parent;
        const [createdNote] = await scene.createEmbeddedDocuments("Note", [{
            entryId: journalEntry.id,
            pageId: page.id,
            x: Math.round(placement.x),
            y: Math.round(placement.y),
            iconSize: state.iconSize,
            fontSize: this.NOTE_FONT_SIZE,
            fontFamily: this.NOTE_FONT_FAMILY,
            textAnchor: this.NOTE_TEXT_ANCHOR,
            textColor: state.iconColor || "#ffffff",
            text: siteName,
            texture: { src: selectedIcon.src, tint: state.iconColor || "#ffffff" },
            global: true,
            flags: {
                [MODULE_ID]: {
                    site: true,
                    siteId,
                    siteName,
                    siteGenre: state.genreId,
                    siteGenreLabel: state.genreLabel,
                    siteSceneType: state.sceneType,
                    siteSceneTypeLabel: state.sceneTypeLabel,
                    siteScenePresetId: state.sceneTypePresetId || null,
                    siteScenePresetLabel: state.sceneTypePresetLabel || "",
                    siteSceneBiomeId: state.sceneTypeBiomeId || null,
                    siteSceneBiomeLabel: state.sceneTypeBiomeLabel || "",
                    siteSceneBiomeFieldLabel: state.sceneTypeBiomeFieldLabel || "Biome",
                    siteSceneImageSrc: state.sceneImageSrc || "",
                    siteSceneImageName: state.sceneImageName || "",
                    linkedSceneId: state.linkedSceneId,
                    linkedSceneName: state.linkedSceneName,
                    siteTheme: state.themeId,
                    siteThemeLabel: state.themeLabel,
                    siteIconRole: state.iconRole,
                    siteIconRoleLabel: state.iconRoleLabel,
                    siteSize: state.sizeId,
                    siteSizeLabel: state.sizeLabel,
                    roomCount: state.roomCount,
                    autoSortScenes: state.autoSortScenes,
                    siteIcon: selectedIcon.id,
                    siteIconSrc: selectedIcon.src,
                    iconSize: state.iconSize,
                    siteColor: state.iconColor,
                    siteLabelColor: state.iconColor,
                    mapColorId: state.mapColorId,
                    mapColorLabel: state.mapColorLabel,
                    journalEntryId: journalEntry.id,
                    journalPageId: page.id,
                    siteSceneId: null
                }
            }
        }]);

        if (!createdNote) {
            await SiteJournalManager.removeSitePage(journalEntry.id, page.id);
            ui.notifications.error("Failed to place the site note.");
            return;
        }

        if (state.sceneType === "existing" && state.linkedSceneId) {
            const linkedScene = game.scenes.get(state.linkedSceneId);
            if (linkedScene) {
                await NexusSceneNavigationManager.setSceneNavigation(linkedScene, {
                    parentSceneId: scene.id,
                    parentSiteId: siteId,
                    transitionStyle: "focus-note",
                    transitionContext: {
                        noteId: createdNote.id,
                        moduleId: MODULE_ID,
                        flagKey: "siteId",
                        flagValue: siteId
                    }
                });
                await NexusSceneFolderManager.placeExistingSceneInParentFolder(scene, linkedScene, {
                    autoSort: state.autoSortScenes !== false
                });
            }
            SitePanel.clearLinkedSceneSelection();
        }

        if (state.randomizeAfterPlacement) {
            await SitePanel.randomizeNextSite();
        }

        Hooks.callAll("augurNexusLineageChanged");
        ui.notifications.info(`Created site "${siteName}".`);
    }

    static async deleteSite(note) {
        const flags = note?.document?.flags?.[MODULE_ID] || {};
        if (!flags.site) return;

        const journalId = flags.journalEntryId;
        const pageId = flags.journalPageId;
        const linkedScene = flags.siteSceneId ? game.scenes.get(flags.siteSceneId) : null;
        const sceneType = getSiteSceneType(flags.siteSceneType || "empty");
        const deleteLinkedScene = linkedScene && sceneType?.deletesLinkedSceneOnSiteDelete !== false;

        try {
            if (linkedScene && !deleteLinkedScene) {
                await NexusLineageManager.clearSceneParent(linkedScene, {
                    expectedParentSceneId: canvas.scene?.id || null,
                    expectedParentSiteId: flags.siteId || null
                });
            }
            if (journalId && pageId) await SiteJournalManager.removeSitePage(journalId, pageId);
            if (deleteLinkedScene) await linkedScene.delete();
            await canvas.scene.deleteEmbeddedDocuments("Note", [note.document.id]);
            Hooks.callAll("augurNexusLineageChanged");
            const deletedThing = deleteLinkedScene ? "site and its scene" : "site";
            ui.notifications.info(`Deleted ${deletedThing} "${flags.siteName || "Site"}".`);
        } catch (err) {
            Log.error("Failed to delete site.", err);
            ui.notifications.error("Failed to delete the selected site.");
        }
    }

    static beginDrag(position, { noteId = null } = {}) {
        const note = this.getSiteNoteAtPosition(position);
        if (!note) return false;
        if (noteId && note.document.id !== noteId) return false;
        this.#dragState = { note, origin: { x: note.document.x, y: note.document.y } };
        return true;
    }

    static updateDrag(position) {
        if (!this.#dragState?.note) return false;
        const note = this.#dragState.note;
        const dragPosition = this.#getPlacementPosition(position);
        note.document.updateSource({ x: Math.round(dragPosition.x), y: Math.round(dragPosition.y) });
        note.refresh();
        return true;
    }

    static async endDrag() {
        if (!this.#dragState?.note) return false;
        const note = this.#dragState.note;
        this.#dragState = null;
        await canvas.scene.updateEmbeddedDocuments("Note", [{ _id: note.document.id, x: Math.round(note.document.x), y: Math.round(note.document.y) }]);
        return true;
    }

    static cancelDrag() {
        if (!this.#dragState?.note) return false;
        const { note, origin } = this.#dragState;
        note.document.updateSource(origin);
        note.refresh();
        this.#dragState = null;
        return true;
    }

    static get isDragging() {
        return !!this.#dragState?.note;
    }

    static getSiteNoteAtPosition(position) {
        return canvas.notes.placeables.find(note => {
            const flags = note.document.flags?.[MODULE_ID] || {};
            if (!flags.site) return false;
            const radius = (note.document.iconSize || flags.iconSize || 100) / 2;
            return Math.hypot(position.x - note.document.x, position.y - note.document.y) <= radius;
        }) || null;
    }

    static #getPlacementPosition(position, state = SitePanel.getState()) {
        if (!state?.snapToGrid) return { x: position.x, y: position.y };
        const gridSize = canvas.grid?.size ?? canvas.dimensions?.size ?? 0;
        if (!gridSize) return { x: position.x, y: position.y };
        const halfGrid = gridSize / 2;
        return {
            x: Math.round(position.x / halfGrid) * halfGrid,
            y: Math.round(position.y / halfGrid) * halfGrid
        };
    }

    static async #ensureGhostContainer(state, signature) {
        const layer = canvas.stage;
        if (!layer) return;

        if (!this.#ghostContainer) {
            this.#ghostContainer = new PIXI.Container();
            this.#ghostContainer.eventMode = "none";
            this.#ghostContainer.zIndex = 999999;
            this.#ghostContainer.visible = false;
            layer.sortableChildren = true;
            layer.addChild(this.#ghostContainer);
        } else {
            this.#ghostContainer.removeChildren().forEach(child => child.destroy?.());
        }

        this.#ghostSignature = signature;
        const texture = await foundry.canvas.loadTexture(state.iconSrc);
        if (!texture) return;
        if (this.#ghostSignature !== signature || !this.#ghostContainer) return;

        const iconSprite = new PIXI.Sprite(texture);
        iconSprite.anchor.set(0.5, 0.5);
        iconSprite.width = state.iconSize || 100;
        iconSprite.height = state.iconSize || 100;
        iconSprite.tint = PIXI.utils.string2hex(state.iconColor || "#ffffff");
        iconSprite.alpha = 0.85;
        this.#ghostContainer.addChild(iconSprite);

        const textStyle = new PIXI.TextStyle({
            fontFamily: this.NOTE_FONT_FAMILY,
            fontSize: 28,
            fill: state.iconColor || "#ffffff",
            stroke: "#000000",
            strokeThickness: 4,
            align: "left"
        });
        const label = new PIXI.Text(state.siteName || "Site", textStyle);
        label.anchor.set(0, 0.5);
        label.position.set(((state.iconSize || 100) / 2) + 10, 0);
        this.#ghostContainer.addChild(label);
    }
}




