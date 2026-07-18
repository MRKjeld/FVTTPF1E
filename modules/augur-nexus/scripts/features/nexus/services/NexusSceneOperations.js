// Deep scene operations for Nexus. These keep scene rename and delete in sync with site pages, note pins, lineage, and managed folders.

import { NexusLineageManager } from "./NexusLineageManager.js";
import { SiteJournalManager } from "../../site/services/SiteJournalManager.js";
import { LegacySciFiCompatibility } from "../../../support/compatibility/LegacySciFiCompatibility.js";
import { confirmDestructiveAction } from "../../../api/ui.js";

const MODULE_ID = "augur-nexus";

export class NexusSceneOperations {
    static collectSceneBranch(rootScene) {
        if (!rootScene) return [];

        const branch = [];
        const visit = scene => {
            for (const childScene of NexusLineageManager.getChildScenes(scene)) {
                visit(childScene);
            }
            branch.push(scene);
        };

        visit(rootScene);
        return branch;
    }

    static getDeleteBranchImpact(rootScene) {
        if (LegacySciFiCompatibility.isLegacyScene(rootScene)) {
            const branch = this.collectSceneBranch(rootScene);
            const impact = {
                ...LegacySciFiCompatibility.getDeleteBranchImpact(rootScene),
                sceneCount: branch.length
            };
            const legacySceneIds = new Set(LegacySciFiCompatibility.getLegacyBranch(rootScene, branch).map(scene => scene.id));

            for (const scene of branch) {
                if (legacySceneIds.has(scene.id)) continue;

                const parentContext = this.#getParentSiteContext(scene);
                if (parentContext?.note) impact.noteCount += 1;
                if (parentContext?.page) impact.pageCount += 1;
                if (this.#getOwnedSiteJournalEntry(scene)) impact.journalEntryCount += 1;
            }

            return impact;
        }

        const branch = this.collectSceneBranch(rootScene);
        const impact = { sceneCount: branch.length, noteCount: 0, pageCount: 0, journalEntryCount: 0 };

        for (const scene of branch) {
            const parentContext = this.#getParentSiteContext(scene);
            if (parentContext?.note) impact.noteCount += 1;
            if (parentContext?.page) impact.pageCount += 1;
            if (this.#getOwnedSiteJournalEntry(scene)) impact.journalEntryCount += 1;
        }

        return impact;
    }

    static async confirmAndDeleteSceneBranch(rootScene, { bypassHook = false } = {}) {
        if (!rootScene) return false;

        const impact = this.getDeleteBranchImpact(rootScene);
        const confirmed = await confirmDestructiveAction({
            title: "Delete Nexus Branch",
            subject: rootScene.name,
            message: `Delete <strong>${foundry.utils.escapeHTML(rootScene.name)}</strong> and everything below it in the Nexus tree?`,
            impacts: [
                { label: "scene", count: impact.sceneCount },
                { label: "site pin", count: impact.noteCount },
                { label: "journal page", count: impact.pageCount },
                { label: "site journal entry", count: impact.journalEntryCount }
            ],
            confirmLabel: "Delete Branch"
        });

        if (!confirmed) return false;
        const operation = { [MODULE_ID]: { nexusDeleteHandled: true } };
        await this.deleteSceneBranch(rootScene, operation);
        return true;
    }

    static async deleteSceneBranch(rootScene, operation = {}) {
        if (!rootScene) return;

        if (LegacySciFiCompatibility.isLegacyScene(rootScene)) {
            const branch = this.collectSceneBranch(rootScene);
            const managedFolderIds = branch.map(scene => scene.getFlag(MODULE_ID, "siteChildSceneFolderId")).filter(Boolean);
            const legacySceneIds = new Set(LegacySciFiCompatibility.getLegacyBranch(rootScene, branch).map(scene => scene.id));

            await LegacySciFiCompatibility.cleanupLegacyBranchArtifacts(rootScene, branch);

            for (const scene of branch) {
                if (legacySceneIds.has(scene.id)) continue;
                await this.#deleteParentSiteArtifacts(scene);
                await this.#deleteOwnedSiteJournal(scene);
            }

            await Scene.deleteDocuments(branch.map(scene => scene.id), operation);
            await this.#cleanupManagedFolders(managedFolderIds);
            return;
        }

        const branch = this.collectSceneBranch(rootScene);
        const managedFolderIds = branch.map(scene => scene.getFlag(MODULE_ID, "siteChildSceneFolderId")).filter(Boolean);

        for (const scene of branch) {
            await this.#deleteParentSiteArtifacts(scene);
            await this.#deleteOwnedSiteJournal(scene);
        }

        await Scene.deleteDocuments(branch.map(scene => scene.id), operation);
        await this.#cleanupManagedFolders(managedFolderIds);
    }

    static async renameScene(scene, nextName) {
        if (!scene) return null;

        const name = (nextName || "").trim();
        if (!name) throw new Error("Scene name cannot be empty.");
        if (name === scene.name) return scene;

        await scene.update({
            name,
            [`flags.${MODULE_ID}.site.siteName`]: name,
            [`flags.${MODULE_ID}.site.linkedSceneName`]: name
        });

        await this.#renameManagedFolder(scene, name);
        await this.#renameParentSiteArtifacts(scene, name);
        await this.#renameOwnedSiteJournal(scene, name);
        await this.#refreshDirectChildParentMetadata(scene, name);

        return scene;
    }

    static async cleanupDeletedScene(scene) {
        if (!scene) return;

        const managedFolderIds = [scene.getFlag(MODULE_ID, "siteChildSceneFolderId")].filter(Boolean);
        await this.#deleteParentSiteArtifacts(scene);
        await this.#deleteOwnedSiteJournal(scene);
        await this.#cleanupManagedFolders(managedFolderIds);
    }

    static async #renameManagedFolder(scene, nextName) {
        const folderId = scene.getFlag(MODULE_ID, "siteChildSceneFolderId");
        const folder = folderId ? game.folders.get(folderId) : null;
        if (!folder || folder.name === nextName) return;
        await folder.update({ name: nextName });
    }

    static async #renameParentSiteArtifacts(scene, nextName) {
        const context = this.#getParentSiteContext(scene);
        if (!context) return;

        const { parentScene, note, page } = context;

        if (note) {
            await parentScene.updateEmbeddedDocuments("Note", [{
                _id: note.id,
                text: nextName,
                [`flags.${MODULE_ID}.siteName`]: nextName,
                [`flags.${MODULE_ID}.linkedSceneName`]: nextName
            }]);
        }

        if (page) {
            const flags = page.flags?.[MODULE_ID] || {};
            await page.update({
                name: nextName,
                [`flags.${MODULE_ID}.siteName`]: nextName,
                [`flags.${MODULE_ID}.linkedSceneName`]: nextName,
                text: {
                    format: page.text?.format ?? 1,
                    content: SiteJournalManager.buildSitePageHTML({
                        ...flags,
                        siteName: nextName,
                        linkedSceneName: nextName,
                        parentSceneName: parentScene?.name || flags.parentSceneName || "Unknown"
                    })
                }
            });
        }
    }

    static async #renameOwnedSiteJournal(scene, nextName) {
        const entry = this.#getOwnedSiteJournalEntry(scene);
        if (!entry) return;

        await entry.update({ name: `${nextName} Sites` });

        for (const page of entry.pages.contents.filter(candidate => candidate.flags?.[MODULE_ID]?.sitePage)) {
            const flags = page.flags?.[MODULE_ID] || {};
            await page.update({
                [`flags.${MODULE_ID}.parentSceneName`]: nextName,
                text: {
                    format: page.text?.format ?? 1,
                    content: SiteJournalManager.buildSitePageHTML({ ...flags, parentSceneName: nextName })
                }
            });
        }
    }

    static async #refreshDirectChildParentMetadata(scene, nextName) {
        const directChildren = NexusLineageManager.getChildScenes(scene);
        for (const childScene of directChildren) {
            await childScene.update({ [`flags.${MODULE_ID}.site.parentSceneName`]: nextName });
        }
    }

    static #getOwnedSiteJournalEntry(scene) {
        const entryId = scene?.getFlag(MODULE_ID, "siteJournalId");
        return entryId ? game.journal.get(entryId) || null : null;
    }

    static #getParentSiteContext(scene) {
        const siteFlags = scene?.getFlag(MODULE_ID, "site") || {};
        const lineage = NexusLineageManager.getSceneLineage(scene) || {};

        const parentSceneId = siteFlags.parentSceneId || lineage.parentSceneId || null;
        const parentSiteId = siteFlags.siteId || lineage.parentSiteId || null;
        if (!parentSceneId || !parentSiteId) return null;

        const parentScene = game.scenes.get(parentSceneId);
        if (!parentScene) return null;

        const note = parentScene.notes?.contents?.find(candidate => candidate.flags?.[MODULE_ID]?.siteId === parentSiteId) || null;
        const journalEntryId = siteFlags.journalEntryId
            || note?.flags?.[MODULE_ID]?.journalEntryId
            || parentScene.getFlag(MODULE_ID, "siteJournalId")
            || null;
        const pageId = siteFlags.journalPageId || note?.flags?.[MODULE_ID]?.journalPageId || null;
        const page = journalEntryId
            ? (pageId
                ? game.journal.get(journalEntryId)?.pages.get(pageId) || null
                : SiteJournalManager.findSitePage(journalEntryId, parentSiteId))
            : null;

        return { parentScene, note, page, parentSiteId };
    }

    static async #deleteParentSiteArtifacts(scene) {
        const context = this.#getParentSiteContext(scene);
        if (!context) return;

        const { parentScene, note, page } = context;
        if (page) await SiteJournalManager.removeSitePage(page.parent?.id, page.id);
        if (note) await parentScene.deleteEmbeddedDocuments("Note", [note.id]);
    }

    static async #deleteOwnedSiteJournal(scene) {
        const entry = this.#getOwnedSiteJournalEntry(scene);
        if (!entry) return;
        await entry.delete();
    }

    static async #cleanupManagedFolders(folderIds) {
        const folders = [...new Set(folderIds)]
            .map(folderId => game.folders.get(folderId))
            .filter(folder => folder?.type === "Scene");

        folders.sort((a, b) => this.#getFolderDepth(b) - this.#getFolderDepth(a));

        for (const folder of folders) {
            const sceneCount = game.scenes.contents.filter(scene => (scene.folder?.id || scene.folder || null) === folder.id).length;
            const childFolderCount = game.folders.contents.filter(candidate => (candidate.folder?.id || candidate.folder || null) === folder.id).length;
            if (!sceneCount && !childFolderCount) {
                await folder.delete();
            }
        }
    }

    static #getFolderDepth(folder) {
        let depth = 0;
        let current = folder?.folder || null;
        while (current) {
            depth += 1;
            current = current.folder || null;
        }
        return depth;
    }
}

