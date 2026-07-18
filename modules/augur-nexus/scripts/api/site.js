// Public site contribution API for dependent modules.

import { getSiteGenre } from "../features/site/registry/SiteGenreRegistry.js";
import { registerSiteSceneType } from "../features/site/registry/SiteSceneTypeRegistry.js";
import { SiteJournalManager } from "../features/site/services/SiteJournalManager.js";
import { NexusSceneFolderManager } from "../features/nexus/services/NexusSceneFolderManager.js";
import { NexusSceneNavigationManager } from "../features/nexus/services/NexusSceneNavigationManager.js";

const MODULE_ID = "augur-nexus";
const DEFAULT_SITE_ICON = "modules/augur-nexus/assets/site_icons/scifi/site.png";

export function registerSceneType(definition) {
    return registerSiteSceneType(definition);
}

export async function createLinkedSceneSite(parentScene, linkedScene, siteData = {}) {
    if (!parentScene) throw new Error("No parent scene provided.");
    if (!linkedScene) throw new Error("No linked scene provided.");

    const siteId = siteData.siteId || foundry.utils.randomID();
    const siteName = siteData.siteName || linkedScene.name;
    const iconSrc = siteData.iconSrc || DEFAULT_SITE_ICON;
    const x = Math.round(siteData.x ?? 0);
    const y = Math.round(siteData.y ?? 0);
    const page = await SiteJournalManager.addSitePage(parentScene, {
        siteId,
        siteName,
        siteGenre: siteData.siteGenre || "scifi",
        siteGenreLabel: siteData.siteGenreLabel || "Sci-Fi",
        siteSceneType: siteData.siteSceneType || "augur-scifi-solar-system",
        siteSceneTypeLabel: siteData.siteSceneTypeLabel || "Solar System",
        siteSceneBiomeId: siteData.siteSceneBiomeId || null,
        siteSceneBiomeLabel: siteData.siteSceneBiomeLabel || "",
        linkedSceneId: linkedScene.id,
        linkedSceneName: linkedScene.name,
        iconId: siteData.iconId || null,
        iconSrc,
        siteColor: siteData.siteColor || "#7edcff",
        siteLabelColor: siteData.siteLabelColor || siteData.siteColor || "#7edcff",
        siteTheme: siteData.siteTheme || "space",
        siteThemeLabel: siteData.siteThemeLabel || "Space",
        siteIconRole: siteData.siteIconRole || "system",
        siteIconRoleLabel: siteData.siteIconRoleLabel || "System",
        mapColorId: siteData.mapColorId || "blue",
        mapColorLabel: siteData.mapColorLabel || "Blue",
        siteSize: siteData.siteSize || "small",
        siteSizeLabel: siteData.siteSizeLabel || "Small",
        roomCount: siteData.roomCount || 1,
        autoSortScenes: siteData.autoSortScenes !== false
    });

    if (!page) throw new Error("Failed to create linked site page.");
    const journalEntry = page.parent;
    await SiteJournalManager.updateSitePageSceneLink(journalEntry.id, siteId, linkedScene.id, linkedScene.name);

    const [note] = await parentScene.createEmbeddedDocuments("Note", [{
        entryId: journalEntry.id,
        pageId: page.id,
        x,
        y,
        iconSize: siteData.iconSize ?? 32,
        fontSize: siteData.fontSize ?? 18,
        fontFamily: siteData.fontFamily || "Signika",
        textAnchor: siteData.textAnchor ?? CONST.TEXT_ANCHOR_POINTS.CENTER,
        textColor: siteData.siteLabelColor || siteData.siteColor || "#7edcff",
        text: siteData.noteText ?? "",
        texture: { src: siteData.noteIconSrc || iconSrc },
        global: true,
        flags: {
            [MODULE_ID]: {
                site: true,
                siteId,
                siteName,
                siteGenre: siteData.siteGenre || "scifi",
                siteGenreLabel: siteData.siteGenreLabel || "Sci-Fi",
                siteSceneType: siteData.siteSceneType || "augur-scifi-solar-system",
                siteSceneTypeLabel: siteData.siteSceneTypeLabel || "Solar System",
                siteScenePresetId: siteData.siteScenePresetId || null,
                siteScenePresetLabel: siteData.siteScenePresetLabel || "",
                siteSceneBiomeId: siteData.siteSceneBiomeId || null,
                siteSceneBiomeLabel: siteData.siteSceneBiomeLabel || "",
                siteSceneBiomeFieldLabel: siteData.siteSceneBiomeFieldLabel || "Star Type",
                siteSceneImageSrc: siteData.siteSceneImageSrc || "",
                siteSceneImageName: siteData.siteSceneImageName || "",
                linkedSceneId: linkedScene.id,
                linkedSceneName: linkedScene.name,
                siteTheme: siteData.siteTheme || "space",
                siteThemeLabel: siteData.siteThemeLabel || "Space",
                siteIconRole: siteData.siteIconRole || "system",
                siteIconRoleLabel: siteData.siteIconRoleLabel || "System",
                siteSize: siteData.siteSize || "small",
                siteSizeLabel: siteData.siteSizeLabel || "Small",
                roomCount: siteData.roomCount || 1,
                autoSortScenes: siteData.autoSortScenes !== false,
                siteIcon: siteData.iconId || null,
                siteIconSrc: iconSrc,
                iconSize: siteData.iconSize ?? 32,
                siteColor: siteData.siteColor || "#7edcff",
                siteLabelColor: siteData.siteLabelColor || siteData.siteColor || "#7edcff",
                mapColorId: siteData.mapColorId || "blue",
                mapColorLabel: siteData.mapColorLabel || "Blue",
                journalEntryId: journalEntry.id,
                journalPageId: page.id,
                siteSceneId: linkedScene.id
            }
        }
    }]);

    await NexusSceneNavigationManager.setSceneNavigation(linkedScene, {
        parentSceneId: parentScene.id,
        parentSiteId: siteId,
        transitionStyle: "focus-note",
        transitionContext: {
            noteId: note?.id || null,
            moduleId: MODULE_ID,
            flagKey: "siteId",
            flagValue: siteId
        }
    });
    await NexusSceneFolderManager.placeExistingSceneInParentFolder(parentScene, linkedScene, {
        autoSort: siteData.autoSortScenes !== false
    });
    await linkedScene.update({
        [`flags.${MODULE_ID}.siteScene`]: true,
        [`flags.${MODULE_ID}.site`]: {
            siteId,
            siteName,
            siteGenre: siteData.siteGenre || "scifi",
            siteGenreLabel: siteData.siteGenreLabel || "Sci-Fi",
            siteSceneType: siteData.siteSceneType || "augur-scifi-solar-system",
            siteSceneTypeLabel: siteData.siteSceneTypeLabel || "Solar System",
            linkedSceneId: linkedScene.id,
            linkedSceneName: linkedScene.name,
            siteIconSrc: iconSrc,
            siteColor: siteData.siteColor || "#7edcff",
            journalEntryId: journalEntry.id,
            journalPageId: page.id,
            parentSceneId: parentScene.id,
            parentSceneName: parentScene.name
        }
    });

    Hooks.callAll("augurNexusLineageChanged");
    return { siteId, page, note: note || null, scene: linkedScene };
}

export function getSiteGenerationProfile(genreId, state = {}) {
    const genre = getSiteGenre(genreId);

    return {
        genreId: genre.id,
        requiredPackId: genre.requiredPackId ?? "__default__",
        generationOverrides: genre.resolveGenerationOverrides?.(state) || {}
    };
}

