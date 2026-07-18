// Site edit workflow state and persistence helpers. This keeps canvas note edits and linked journal pages in sync.

import { SiteGenerator } from "./SiteGenerator.js";
import { SiteJournalManager } from "./SiteJournalManager.js";
import { NexusSceneOperations } from "../../nexus/services/NexusSceneOperations.js";
import { Log } from "../../../support/utils/Logger.js";

const MODULE_ID = "augur-nexus";

export class SiteEditor {
    static #selectedNoteId = null;
    static #active = false;

    static get isEditMode() {
        return this.#active;
    }

    static activate() {
        this.#active = true;
    }

    static deactivate() {
        this.#active = false;
        this.clearSelection();
    }

    static getSelectedNote() {
        if (!this.#selectedNoteId) return null;
        return canvas.notes?.placeables?.find(note => note.document?.id === this.#selectedNoteId) || null;
    }

    static getSelectedSiteState() {
        const note = this.getSelectedNote();
        if (!note) return null;

        const flags = note.document.flags?.[MODULE_ID] || {};
        const labelColor = flags.siteLabelColor || note.document.textColor || flags.siteColor || "#ffffff";

        return {
            noteId: note.document.id,
            siteId: flags.siteId || null,
            journalEntryId: flags.journalEntryId || null,
            journalPageId: flags.journalPageId || null,
            siteName: flags.siteName || note.document.text || "Site",
            siteGenre: flags.siteGenre || "fantasy",
            siteIconRole: flags.siteIconRole || "landmark",
            siteIconRoleLabel: flags.siteIconRoleLabel || "Landmark",
            siteIcon: flags.siteIcon || null,
            siteIconSrc: flags.siteIconSrc || note.document.texture?.src || "",
            iconSize: Number(note.document.iconSize || flags.iconSize || 100),
            iconColor: flags.siteColor || "#ffffff",
            labelColor,
            mapColorId: flags.mapColorId || "green",
            mapColorLabel: flags.mapColorLabel || "Green",
            parentSceneId: flags.parentSceneId || canvas.scene?.id || null,
            parentSceneName: flags.parentSceneName || canvas.scene?.name || "",
            linkedSceneId: flags.linkedSceneId || null,
            siteSceneId: flags.siteSceneId || null,
            linkedSceneName: flags.linkedSceneName || "",
            siteSceneType: flags.siteSceneType || "empty",
            siteSceneTypeLabel: flags.siteSceneTypeLabel || "Empty Scene",
            siteScenePresetId: flags.siteScenePresetId || null,
            siteScenePresetLabel: flags.siteScenePresetLabel || "",
            siteSceneBiomeId: flags.siteSceneBiomeId || null,
            siteSceneBiomeLabel: flags.siteSceneBiomeLabel || "",
            siteSceneBiomeFieldLabel: flags.siteSceneBiomeFieldLabel || "Biome",
            siteSceneImageSrc: flags.siteSceneImageSrc || "",
            siteSceneImageName: flags.siteSceneImageName || "",
            siteTheme: flags.siteTheme || "castle",
            siteThemeLabel: flags.siteThemeLabel || "Castle",
            siteSize: flags.siteSize || "small",
            siteSizeLabel: flags.siteSizeLabel || "Small",
            roomCount: flags.roomCount || 5,
            autoSortScenes: flags.autoSortScenes !== false
        };
    }

    static isSelectedNote(note) {
        return !!note?.document?.id && note.document.id === this.#selectedNoteId;
    }

    static selectSiteAtPosition(position) {
        const note = SiteGenerator.getSiteNoteAtPosition(position);
        this.#selectedNoteId = note?.document?.id || null;
        Hooks.callAll("augurNexusSiteEditorSelectionChanged");
        return note || null;
    }

    static clearSelection() {
        if (!this.#selectedNoteId) return;
        this.#selectedNoteId = null;
        Hooks.callAll("augurNexusSiteEditorSelectionChanged");
    }

    static async updateSelectedSite(changes = {}) {
        const note = this.getSelectedNote();
        if (!note || !canvas.scene) return false;

        const current = this.getSelectedSiteState();
        if (!current) return false;

        const nextState = {
            ...current,
            ...changes
        };

        const iconSize = Math.max(50, Math.min(256, Math.round(Number(nextState.iconSize) || current.iconSize || 100)));
        const siteName = (nextState.siteName || current.siteName || "Site").trim() || "Site";
        const iconColor = nextState.iconColor || current.iconColor || "#ffffff";
        const labelColor = nextState.labelColor || current.labelColor || iconColor;
        const iconSrc = nextState.siteIconSrc || current.siteIconSrc || "";

        const existingFlags = note.document.flags?.[MODULE_ID] || {};
        const updatedFlags = {
            ...existingFlags,
            siteName,
            siteIconRole: nextState.siteIconRole || existingFlags.siteIconRole || "landmark",
            siteIconRoleLabel: nextState.siteIconRoleLabel || existingFlags.siteIconRoleLabel || "Landmark",
            siteIcon: nextState.siteIcon || existingFlags.siteIcon || null,
            siteIconSrc: iconSrc,
            iconSize,
            siteColor: iconColor,
            siteLabelColor: labelColor
        };

        const linkedSceneId = current.siteSceneId || current.linkedSceneId || null;
        const linkedScene = linkedSceneId ? game.scenes.get(linkedSceneId) : null;

        try {
            if (linkedScene && siteName !== linkedScene.name) {
                await NexusSceneOperations.renameScene(linkedScene, siteName);
            }

            await canvas.scene.updateEmbeddedDocuments("Note", [{
                _id: note.document.id,
                text: siteName,
                iconSize,
                textColor: labelColor,
                texture: {
                    src: iconSrc,
                    tint: iconColor
                },
                flags: {
                    [MODULE_ID]: updatedFlags
                }
            }]);

            await SiteJournalManager.updateSitePagePresentation({
                journalEntryId: current.journalEntryId,
                pageId: current.journalPageId,
                siteId: current.siteId,
                siteName,
                iconSrc,
                flags: updatedFlags
            });

            if (linkedScene) {
                await linkedScene.update({
                    [`flags.${MODULE_ID}.site.siteName`]: siteName,
                    [`flags.${MODULE_ID}.site.linkedSceneName`]: linkedScene.name,
                    [`flags.${MODULE_ID}.site.siteIcon`]: updatedFlags.siteIcon,
                    [`flags.${MODULE_ID}.site.siteIconSrc`]: iconSrc,
                    [`flags.${MODULE_ID}.site.siteColor`]: iconColor,
                    [`flags.${MODULE_ID}.site.siteLabelColor`]: labelColor
                });
            }

            Hooks.callAll("augurNexusLineageChanged");
            Hooks.callAll("augurNexusSiteEditorSelectionChanged");
            return true;
        } catch (err) {
            Log.error("Failed to update site presentation.", err);
            ui.notifications.error("Failed to update the selected site.");
            return false;
        }
    }
}
