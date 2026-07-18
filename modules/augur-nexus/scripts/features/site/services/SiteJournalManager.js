// Journal helpers for Sites. This keeps note-linked journal records grouped and in sync with their scenes.

import { Log } from "../../../support/utils/Logger.js";
import { getSiteGenre } from "../registry/SiteGenreRegistry.js";
import { getSiteSceneType } from "../registry/SiteSceneTypeRegistry.js";

const MODULE_ID = "augur-nexus";

export class SiteJournalManager {
    static FOLDER_NAME = "Augur Nexus Sites";
    static OPEN_MAP_ACTION_LABEL = "Open Map";

    static async ensureJournalEntry(scene) {
        if (!scene) return null;

        const existingId = scene.getFlag(MODULE_ID, "siteJournalId");
        const existing = existingId ? game.journal.get(existingId) : null;
        if (existing) return existing;

        const folder = await this.#getOrCreateFolder();
        const entry = await JournalEntry.create({
            name: `${scene.name} Sites`,
            folder: folder?.id || null,
            ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER }
        });

        await scene.setFlag(MODULE_ID, "siteJournalId", entry.id);
        return entry;
    }

    static async addSitePage(scene, siteData) {
        const entry = await this.ensureJournalEntry(scene);
        if (!entry) return null;

        const siteId = siteData.siteId || foundry.utils.randomID();
        const [created] = await entry.createEmbeddedDocuments("JournalEntryPage", [{
            name: siteData.siteName,
            type: "text",
            sort: (entry.pages.size + 1) * CONST.SORT_INTEGER_DENSITY,
            flags: {
                [MODULE_ID]: {
                    sitePage: true,
                    siteId,
                    siteName: siteData.siteName,
                    siteGenre: siteData.siteGenre || "fantasy",
                    siteGenreLabel: siteData.siteGenreLabel || "Fantasy",
                    siteSceneType: siteData.siteSceneType || "empty",
                    siteSceneTypeLabel: siteData.siteSceneTypeLabel || "Empty Scene",
                    siteScenePresetId: siteData.siteScenePresetId || null,
                    siteScenePresetLabel: siteData.siteScenePresetLabel || "",
                    siteSceneBiomeId: siteData.siteSceneBiomeId || null,
                    siteSceneBiomeLabel: siteData.siteSceneBiomeLabel || "",
                    siteSceneBiomeFieldLabel: siteData.siteSceneBiomeFieldLabel || "Biome",
                    siteSceneImageSrc: siteData.siteSceneImageSrc || "",
                    siteSceneImageName: siteData.siteSceneImageName || "",
                    linkedSceneId: siteData.linkedSceneId || null,
                    linkedSceneName: siteData.linkedSceneName || "",
                    siteColor: siteData.siteColor || "#ffffff",
                    siteLabelColor: siteData.siteLabelColor || siteData.siteColor || "#ffffff",
                    siteTheme: siteData.siteTheme || "castle",
                    siteThemeLabel: siteData.siteThemeLabel || "Castle",
                    siteIconRole: siteData.siteIconRole || "landmark",
                    siteIconRoleLabel: siteData.siteIconRoleLabel || "Landmark",
                    mapColorId: siteData.mapColorId || "green",
                    mapColorLabel: siteData.mapColorLabel || "Green",
                    siteSize: siteData.siteSize || "small",
                    siteSizeLabel: siteData.siteSizeLabel || "Small",
                    roomCount: siteData.roomCount || 5,
                    autoSortScenes: siteData.autoSortScenes !== false,
                    siteSceneId: null,
                    siteIcon: siteData.iconId || null,
                    siteIconSrc: siteData.iconSrc || "",
                    parentSceneId: scene.id,
                    parentSceneName: scene.name
                }
            },
            text: {
                content: this.buildSitePageHTML({ ...siteData, siteId, parentSceneName: scene.name }),
                format: 1
            }
        }]);

        if (created) {
            Log.info(`Added site page "${siteData.siteName}".`);
        }
        return created || null;
    }

    static async removeSitePage(journalEntryId, pageId) {
        const entry = game.journal.get(journalEntryId);
        if (!entry || !pageId) return;

        const page = entry.pages.get(pageId);
        if (!page) return;

        if (entry.sheet?.rendered) {
            await entry.sheet.close();
        }

        await page.delete();
    }

    static findSitePage(journalEntryId, siteId) {
        const entry = game.journal.get(journalEntryId);
        if (!entry || !siteId) return null;
        return entry.pages.contents.find(page => page.flags?.[MODULE_ID]?.siteId === siteId) || null;
    }

    static async updateSitePageSceneLink(journalEntryId, siteId, sceneId, sceneName = "") {
        const page = this.findSitePage(journalEntryId, siteId);
        if (!page) return null;

        const pageFlags = page.flags?.[MODULE_ID] || {};
        const nextLinkedSceneName = sceneName || pageFlags.linkedSceneName || "";

        await page.update({
            [`flags.${MODULE_ID}.siteSceneId`]: sceneId,
            [`flags.${MODULE_ID}.linkedSceneId`]: sceneId,
            [`flags.${MODULE_ID}.linkedSceneName`]: nextLinkedSceneName
        });
        return page;
    }

    static async updateSitePagePresentation({ journalEntryId, pageId, siteId, siteName, iconSrc, flags = {} } = {}) {
        const entry = journalEntryId ? game.journal.get(journalEntryId) : null;
        const page = entry?.pages?.get(pageId) || this.findSitePage(journalEntryId, siteId);
        if (!page) return null;

        const pageFlags = page.flags?.[MODULE_ID] || {};
        const nextFlags = {
            ...pageFlags,
            ...flags,
            siteId: flags.siteId || pageFlags.siteId || siteId || null,
            siteName: siteName || flags.siteName || page.name,
            siteIconSrc: iconSrc || flags.siteIconSrc || pageFlags.siteIconSrc || ""
        };

        await page.update({
            name: nextFlags.siteName,
            [`flags.${MODULE_ID}`]: nextFlags,
            "text.content": this.buildSitePageHTML({
                ...nextFlags,
                siteId: nextFlags.siteId,
                siteName: nextFlags.siteName,
                iconSrc: nextFlags.siteIconSrc,
                parentSceneName: nextFlags.parentSceneName || ""
            })
        });
        return page;
    }

    static buildSitePageHTML(site) {
        const genre = getSiteGenre(site.siteGenre);
        const sceneType = getSiteSceneType(site.siteSceneType || "empty");
        const showThemeMetadata = sceneType?.showThemeControls === true && (site.siteSceneType || "empty") !== "existing";
        const metadata = [
            { label: "Genre", value: site.siteGenreLabel || "Fantasy" },
            ...(site.siteScenePresetLabel ? [{ label: "Preset", value: site.siteScenePresetLabel }] : []),
            ...(site.siteSceneBiomeLabel ? [{ label: site.siteSceneBiomeFieldLabel || "Biome", value: site.siteSceneBiomeLabel }] : []),
            ...(site.siteSceneImageName ? [{ label: "Image", value: site.siteSceneImageName }] : []),
            ...(showThemeMetadata && site.siteThemeLabel ? [{ label: "Theme", value: site.siteThemeLabel }] : []),
            { label: "Parent Scene", value: site.parentSceneName || "Unknown" }
        ];

        if ((site.siteSceneType || "empty") === "existing" && site.linkedSceneName) {
            metadata.splice(2, 0, { label: "Linked Scene", value: site.linkedSceneName });
        }

        if (genre.supportsMapColorOverrides) {
            metadata.splice(3, 0, { label: "Map Color", value: site.mapColorLabel || "Green" });
        }

        const metadataHtml = metadata.map(entry => `<p><strong>${entry.label}:</strong> ${entry.value}</p>`).join("");

        return `
<div style="padding:10px;">
    <div style="padding:0 0 10px 0; text-align:center;">
        @AugurNexusOpenSiteMap[${site.siteId}]{${this.OPEN_MAP_ACTION_LABEL}}
    </div>
    <div style="margin-bottom:16px; text-align:center;">
        ${site.iconSrc ? `<img src="${site.iconSrc}" style="display:block; margin:0 auto 10px auto; max-width:96px; max-height:96px; border:none; background:transparent;" alt="${site.siteName}">` : ""}
        <h2 style="margin:0 0 6px 0;">${site.siteName}</h2>
        <p style="margin:0; color:#888; font-style:italic;">Site Record</p>
    </div>
    ${metadataHtml}
    <hr style="margin:15px 0; border-color:rgba(255,255,255,0.1);">
    <h3>Description</h3>
    <p>Add site details here.</p>
</div>`;
    }

    static async #getOrCreateFolder() {
        let folder = game.folders.find(folder => folder.name === this.FOLDER_NAME && folder.type === "JournalEntry");
        if (!folder) {
            folder = await Folder.create({
                name: this.FOLDER_NAME,
                type: "JournalEntry",
                color: "#352717"
            });
        }
        return folder;
    }
}




