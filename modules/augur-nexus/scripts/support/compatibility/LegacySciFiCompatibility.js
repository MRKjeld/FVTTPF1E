// Legacy Augur Sci-Fi compatibility layer.
// This is intentionally module-specific and exists so Nexus can recognize,
// navigate, and safely delete pre-Nexus Sci-Fi scene hierarchies.

import { NexusSceneTransitionEffects } from "../../features/nexus/services/NexusSceneTransitionEffects.js";

const NEXUS_MODULE_ID = "augur-nexus";
const SCIFI_MODULE_ID = "augur-scifi";

const KIND_LABELS = {
    system: "Solar System",
    planet: "Planet Scene",
    moon: "Moon Scene",
    site: "Site Scene"
};

function getModule() {
    return game.modules.get(SCIFI_MODULE_ID) || null;
}

function isActive() {
    return getModule()?.active === true;
}

function hasNexusLineage(scene) {
    return !!(
        scene?.getFlag(NEXUS_MODULE_ID, "lineage")
        || scene?.getFlag(NEXUS_MODULE_ID, "site")
        || scene?.getFlag(NEXUS_MODULE_ID, "nexusRoot") === true
    );
}

function getJournalEntry(journalId) {
    return journalId ? game.journal.get(journalId) || null : null;
}

function getRootSystemScene(rootSystemSceneId) {
    return rootSystemSceneId ? game.scenes.get(rootSystemSceneId) || null : null;
}

function findSystemSceneByJournalId(journalId) {
    if (!journalId) return null;
    return game.scenes.contents.find(scene => scene.getFlag(SCIFI_MODULE_ID, "journalId") === journalId) || null;
}

function getPlanetLinks(rootScene) {
    return rootScene?.getFlag(SCIFI_MODULE_ID, "planetScenes") || {};
}

function getMoonLinks(rootScene) {
    return rootScene?.getFlag(SCIFI_MODULE_ID, "moonScenes") || {};
}

function findPlanetScene(rootScene, designation) {
    if (!rootScene || !designation) return null;

    const linkedSceneId = getPlanetLinks(rootScene)?.[designation]?.sceneId || null;
    if (linkedSceneId) {
        const linkedScene = game.scenes.get(linkedSceneId) || null;
        if (linkedScene) return linkedScene;
    }

    return game.scenes.contents.find(scene => {
        const flags = scene.getFlag(SCIFI_MODULE_ID, "planetScene") || {};
        return flags.parentSceneId === rootScene.id && flags.planetDesignation === designation;
    }) || null;
}

function findMoonScene(rootScene, designation) {
    if (!rootScene || !designation) return null;

    const linkedSceneId = getMoonLinks(rootScene)?.[designation]?.sceneId || null;
    if (linkedSceneId) {
        const linkedScene = game.scenes.get(linkedSceneId) || null;
        if (linkedScene) return linkedScene;
    }

    return game.scenes.contents.find(scene => {
        const flags = scene.getFlag(SCIFI_MODULE_ID, "moonScene") || {};
        return flags.rootSystemSceneId === rootScene.id && flags.moonDesignation === designation;
    }) || null;
}

function getSceneKind(scene) {
    if (!isActive() || !scene) return null;
    if (scene.getFlag(SCIFI_MODULE_ID, "siteScene")) return "site";
    if (scene.getFlag(SCIFI_MODULE_ID, "moonScene")) return "moon";
    if (scene.getFlag(SCIFI_MODULE_ID, "planetScene")) return "planet";
    if (scene.getFlag(SCIFI_MODULE_ID, "system")) return "system";
    return null;
}

function isLegacyScene(scene) {
    return !!(getSceneKind(scene) && !hasNexusLineage(scene));
}

function getSceneLabel(scene) {
    return KIND_LABELS[getSceneKind(scene)] || "Scene";
}

function getTileTextureSrc(tile) {
    return tile?.texture?.src || tile?.document?.texture?.src || "";
}

function findTileByDesignation(scene, designation, type = null) {
    if (!scene || !designation) return null;
    return scene.tiles?.contents?.find(tile => {
        const flags = tile.flags?.[SCIFI_MODULE_ID] || {};
        if (type && flags.type !== type) return false;
        return flags.designation === designation;
    }) || null;
}

function getSceneIconSrc(scene) {
    const kind = getSceneKind(scene);
    if (!kind) return "";

    if (kind === "system") {
        const starTile = scene.tiles?.contents?.find(tile => tile.flags?.[SCIFI_MODULE_ID]?.type === "star") || null;
        return getTileTextureSrc(starTile);
    }

    if (kind === "planet") {
        const designation = scene.getFlag(SCIFI_MODULE_ID, "planetScene.planetDesignation") || null;
        const localTile = findTileByDesignation(scene, designation, "planet");
        if (localTile) return getTileTextureSrc(localTile);

        const rootScene = getRootSceneForScene(scene);
        return getTileTextureSrc(findTileByDesignation(rootScene, designation, "planet"));
    }

    if (kind === "moon") {
        const moonTileId = scene.getFlag(SCIFI_MODULE_ID, "moonScene.moonTileId") || null;
        const directTile = moonTileId ? scene.tiles?.get(moonTileId) || null : null;
        if (directTile) return getTileTextureSrc(directTile);

        const designation = scene.getFlag(SCIFI_MODULE_ID, "moonScene.moonDesignation") || null;
        const localTile = findTileByDesignation(scene, designation, "moon");
        if (localTile) return getTileTextureSrc(localTile);

        const rootScene = getRootSceneForScene(scene);
        return getTileTextureSrc(findTileByDesignation(rootScene, designation, "moon"));
    }

    return "";
}

function getRootSceneForScene(scene) {
    const kind = getSceneKind(scene);
    if (!kind) return null;
    if (kind === "system") return scene;

    if (kind === "planet") {
        const parentSceneId = scene.getFlag(SCIFI_MODULE_ID, "planetScene.parentSceneId") || null;
        return parentSceneId ? game.scenes.get(parentSceneId) || null : null;
    }

    if (kind === "moon") {
        const rootSystemSceneId = scene.getFlag(SCIFI_MODULE_ID, "moonScene.rootSystemSceneId") || null;
        return getRootSystemScene(rootSystemSceneId);
    }

    const rootSystemSceneId = scene.getFlag(SCIFI_MODULE_ID, "siteScene.rootSystemSceneId") || null;
    return getRootSystemScene(rootSystemSceneId);
}

function getParentScene(scene) {
    const kind = getSceneKind(scene);
    if (!kind || kind === "system") return null;

    if (kind === "planet") {
        const parentSceneId = scene.getFlag(SCIFI_MODULE_ID, "planetScene.parentSceneId") || null;
        return parentSceneId ? game.scenes.get(parentSceneId) || null : null;
    }

    if (kind === "moon") {
        const parentPlanetSceneId = scene.getFlag(SCIFI_MODULE_ID, "moonScene.parentPlanetSceneId") || null;
        if (parentPlanetSceneId) return game.scenes.get(parentPlanetSceneId) || null;

        const rootScene = getRootSceneForScene(scene);
        const parentPlanetDesignation = scene.getFlag(SCIFI_MODULE_ID, "moonScene.parentPlanetDesignation") || null;
        return parentPlanetDesignation ? findPlanetScene(rootScene, parentPlanetDesignation) : null;
    }

    const siteFlags = scene.getFlag(SCIFI_MODULE_ID, "siteScene") || {};
    const rootScene = getRootSceneForScene(scene);
    if (!rootScene) return null;

    if (siteFlags.parentBodyType === "planet") {
        return findPlanetScene(rootScene, siteFlags.parentDesignation);
    }

    if (siteFlags.parentBodyType === "moon") {
        return findMoonScene(rootScene, siteFlags.parentDesignation);
    }

    return null;
}

function getBackTarget(scene = canvas.scene) {
    if (!isActive() || !scene) return null;

    const backTarget = scene.getFlag(SCIFI_MODULE_ID, "backTarget") || null;
    if (!backTarget?.sceneId) return null;
    if (!game.scenes.get(backTarget.sceneId)) return null;
    return backTarget;
}

function getChildScenes(scene) {
    const kind = getSceneKind(scene);
    if (!kind) return [];

    if (kind === "system") {
        const linkedScenes = Object.keys(getPlanetLinks(scene))
            .map(designation => findPlanetScene(scene, designation))
            .filter(Boolean);
        const generatedScenes = game.scenes.contents.filter(candidate => {
            const flags = candidate.getFlag(SCIFI_MODULE_ID, "planetScene") || {};
            return flags.parentSceneId === scene.id;
        });
        const seen = new Set();
        return [...linkedScenes, ...generatedScenes]
            .filter(candidate => {
                if (!candidate || seen.has(candidate.id)) return false;
                seen.add(candidate.id);
                return true;
            })
            .sort(sortScenes);
    }

    if (kind === "planet") {
        const rootScene = getRootSceneForScene(scene);
        if (!rootScene) return [];

        const designation = scene.getFlag(SCIFI_MODULE_ID, "planetScene.planetDesignation") || null;
        if (!designation) return [];

        const moons = game.scenes.contents
            .filter(candidate => {
                const flags = candidate.getFlag(SCIFI_MODULE_ID, "moonScene") || {};
                return flags.rootSystemSceneId === rootScene.id && flags.parentPlanetDesignation === designation;
            });

        const sites = game.scenes.contents
            .filter(candidate => candidate.id !== scene.id)
            .filter(candidate => candidate.getFlag(SCIFI_MODULE_ID, "siteScene.rootSystemSceneId") === rootScene.id)
            .filter(candidate => candidate.getFlag(SCIFI_MODULE_ID, "siteScene.parentBodyType") === "planet")
            .filter(candidate => candidate.getFlag(SCIFI_MODULE_ID, "siteScene.parentDesignation") === designation);

        return [...moons, ...sites].sort(sortScenes);
    }

    if (kind === "moon") {
        const rootScene = getRootSceneForScene(scene);
        if (!rootScene) return [];

        const designation = scene.getFlag(SCIFI_MODULE_ID, "moonScene.moonDesignation") || null;
        if (!designation) return [];

        return game.scenes.contents
            .filter(candidate => candidate.id !== scene.id)
            .filter(candidate => candidate.getFlag(SCIFI_MODULE_ID, "siteScene.rootSystemSceneId") === rootScene.id)
            .filter(candidate => candidate.getFlag(SCIFI_MODULE_ID, "siteScene.parentBodyType") === "moon")
            .filter(candidate => candidate.getFlag(SCIFI_MODULE_ID, "siteScene.parentDesignation") === designation)
            .sort(sortScenes);
    }

    return [];
}

function getSiteScenesForBody(rootScene, bodyType, designation) {
    if (!isActive() || !rootScene || !bodyType || !designation) return [];

    return game.scenes.contents.filter(scene => {
        const siteFlags = scene.getFlag(SCIFI_MODULE_ID, "siteScene") || {};
        if (siteFlags.rootSystemSceneId !== rootScene.id) return false;
        return siteFlags.parentBodyType === bodyType && siteFlags.parentDesignation === designation;
    });
}

function getPendingNodes(parentScene) {
    const kind = getSceneKind(parentScene);
    if (!kind) return [];

    if (kind === "system") {
        const journalEntry = getJournalEntry(parentScene.getFlag(SCIFI_MODULE_ID, "journalId"));
        if (!journalEntry) return [];

        return journalEntry.pages.contents
            .filter(page => page.flags?.[SCIFI_MODULE_ID]?.bodyPage)
            .filter(page => page.flags?.[SCIFI_MODULE_ID]?.bodyType === "planet")
            .filter(page => {
                const designation = page.flags?.[SCIFI_MODULE_ID]?.designation || null;
                return !designation || !findPlanetScene(parentScene, designation);
            })
            .sort(sortPages)
            .map(page => {
                const designation = page.flags?.[SCIFI_MODULE_ID]?.designation || null;
                return {
                    id: `legacy-scifi-pending-planet:${page.id}`,
                    nodeKind: "legacy-scifi-pending-planet",
                    sceneId: null,
                    siteId: null,
                    pageId: page.id,
                    journalEntryId: page.parent?.id || null,
                    parentNodeId: `scene:${parentScene.id}`,
                    parentSceneId: parentScene.id,
                    name: page.name,
                    thumb: "",
                    iconSrc: getTileTextureSrc(findTileByDesignation(parentScene, designation, "planet")),
                    sort: page.sort ?? 0,
                    isCurrent: false,
                    isActive: false,
                    isRoot: false,
                    canOpen: true,
                    canRename: false,
                    canDelete: false,
                    typeLabel: "Planet Pending"
                };
            });
    }

    const rootScene = getRootSceneForScene(parentScene);
    const journalEntry = getJournalEntry(rootScene?.getFlag(SCIFI_MODULE_ID, "journalId"));
    if (!rootScene || !journalEntry) return [];

    if (kind === "planet") {
        const designation = parentScene.getFlag(SCIFI_MODULE_ID, "planetScene.planetDesignation") || null;
        const pendingMoons = journalEntry.pages.contents
            .filter(page => page.flags?.[SCIFI_MODULE_ID]?.bodyPage)
            .filter(page => page.flags?.[SCIFI_MODULE_ID]?.bodyType === "moon")
            .filter(page => page.flags?.[SCIFI_MODULE_ID]?.parentDesignation === designation)
            .filter(page => {
                const moonDesignation = page.flags?.[SCIFI_MODULE_ID]?.designation || null;
                return !moonDesignation || !findMoonScene(rootScene, moonDesignation);
            })
            .sort(sortPages)
            .map(page => {
                const moonDesignation = page.flags?.[SCIFI_MODULE_ID]?.designation || null;
                return {
                    id: `legacy-scifi-pending-moon:${page.id}`,
                    nodeKind: "legacy-scifi-pending-moon",
                    sceneId: null,
                    siteId: null,
                    pageId: page.id,
                    journalEntryId: page.parent?.id || null,
                    parentNodeId: `scene:${parentScene.id}`,
                    parentSceneId: parentScene.id,
                    name: page.name,
                    thumb: "",
                    iconSrc: getTileTextureSrc(findTileByDesignation(rootScene, moonDesignation, "moon")),
                    sort: page.sort ?? 0,
                    isCurrent: false,
                    isActive: false,
                    isRoot: false,
                    canOpen: true,
                    canRename: false,
                    canDelete: false,
                    typeLabel: "Moon Pending"
                };
            });
        return pendingMoons;
    }

    return [];
}

async function openPendingNode({ nodeKind, journalEntryId = null, pageId = null, parentSceneId = null } = {}) {
    if (!isActive() || !nodeKind || !journalEntryId || !pageId) return false;

    const page = game.journal.get(journalEntryId)?.pages.get(pageId) || null;
    if (!page) return false;

    if (nodeKind === "legacy-scifi-pending-planet") {
        const { PlanetSceneGenerator } = await import("/modules/augur-scifi/scripts/features/planet/services/PlanetSceneGenerator.js");
        const parentScene = parentSceneId ? game.scenes.get(parentSceneId) || null : null;
        const designation = page.flags?.[SCIFI_MODULE_ID]?.designation || page.name;
        const scene = parentScene
            ? await PlanetSceneGenerator.getOrCreateFromSystemScene(parentScene, designation)
            : await PlanetSceneGenerator.getOrCreateFromJournalPage(page, designation);
        if (scene) await scene.activate();
        return !!scene;
    }

    if (nodeKind === "legacy-scifi-pending-moon") {
        const { MoonSceneGenerator } = await import("/modules/augur-scifi/scripts/features/planet/services/MoonSceneGenerator.js");
        const parentScene = parentSceneId ? game.scenes.get(parentSceneId) || null : null;
        const rootScene = getRootSceneForScene(parentScene);
        const designation = page.flags?.[SCIFI_MODULE_ID]?.designation || page.name;
        const scene = rootScene
            ? await MoonSceneGenerator.getOrCreateFromSystemScene(rootScene, designation)
            : await MoonSceneGenerator.getOrCreateFromJournalPage(page, designation);
        if (scene) await scene.activate();
        return !!scene;
    }

    return false;
}

async function returnToParent(scene = canvas.scene) {
    const backTarget = getBackTarget(scene);
    if (!backTarget?.sceneId) return false;

    const targetScene = game.scenes.get(backTarget.sceneId);
    if (!targetScene) return false;

    if (backTarget.transition === "planet") {
        return NexusSceneTransitionEffects.returnToParent(scene, {
            parentSceneId: targetScene.id,
            transitionStyle: "scene-default",
            transitionContext: {}
        });
    }

    if (backTarget.transition === "orbit") {
        const siteId = backTarget.siteId || scene?.getFlag(SCIFI_MODULE_ID, "siteScene.siteId");
        const siteNote = siteId
            ? targetScene.notes?.contents?.find(note => note.flags?.[SCIFI_MODULE_ID]?.siteId === siteId) || null
            : null;
        return NexusSceneTransitionEffects.returnToParent(scene, {
            parentSceneId: targetScene.id,
            transitionStyle: "focus-note",
            transitionContext: {
                noteId: siteNote?.id || null,
                moduleId: SCIFI_MODULE_ID,
                flagKey: "siteId",
                flagValue: siteId || null
            }
        });
    }

    return NexusSceneTransitionEffects.returnToParent(scene, {
        parentSceneId: targetScene.id,
        transitionStyle: "scene-default",
        transitionContext: {}
    });
}

function collectLegacyBranch(rootScene) {
    if (!isLegacyScene(rootScene)) return [];

    const branch = [];
    const visited = new Set();
    const visit = scene => {
        if (!scene || visited.has(scene.id)) return;
        visited.add(scene.id);
        for (const childScene of getChildScenes(scene)) {
            visit(childScene);
        }
        branch.push(scene);
    };

    visit(rootScene);
    return branch;
}

function getLegacyBranch(rootScene, branch = null) {
    if (!rootScene) return [];
    const sourceBranch = branch || collectLegacyBranch(rootScene);
    return sourceBranch.filter(scene => !!getSceneKind(scene));
}

function getDeleteBranchImpact(rootScene) {
    const branch = collectLegacyBranch(rootScene);
    const impact = {
        sceneCount: branch.length,
        noteCount: 0,
        pageCount: 0,
        journalEntryCount: 0
    };

    for (const scene of branch) {
        const kind = getSceneKind(scene);
        if (kind === "site") {
            const context = getLegacySiteContext(scene);
            if (context?.note) impact.noteCount += 1;
            if (context?.page) impact.pageCount += 1;
        }
    }

    if (getSceneKind(rootScene) === "system" && getJournalEntry(rootScene.getFlag(SCIFI_MODULE_ID, "journalId"))) {
        impact.journalEntryCount = 1;
    }

    return impact;
}

async function deleteLegacyBranch(rootScene, operation = {}) {
    const kind = getSceneKind(rootScene);
    if (!kind) return false;

    const branch = collectLegacyBranch(rootScene);
    await cleanupLegacyBranchArtifacts(rootScene, branch);
    await Scene.deleteDocuments(branch.map(scene => scene.id), operation);
    return true;
}

async function cleanupLegacyBranchArtifacts(rootScene, branch = null) {
    const kind = getSceneKind(rootScene);
    if (!kind) return false;

    const legacyBranch = getLegacyBranch(rootScene, branch);
    const rootSystemScene = kind === "system" ? rootScene : getRootSceneForScene(rootScene);
    await deleteLegacyBranchSitePages(rootSystemScene, rootScene, legacyBranch);

    for (const scene of legacyBranch) {
        if (getSceneKind(scene) === "site") {
            await deleteLegacySiteArtifacts(scene);
        }
    }

    if (kind === "planet") {
        await unlinkLegacyPlanetBranch(rootSystemScene, rootScene, legacyBranch);
    } else if (kind === "moon") {
        await unlinkLegacyMoonBranch(rootSystemScene, rootScene);
    }

    if (kind === "system") {
        const journalEntry = getJournalEntry(rootScene.getFlag(SCIFI_MODULE_ID, "journalId"));
        if (journalEntry) await journalEntry.delete();
    }

    return true;
}

async function deleteLegacyBranchSitePages(rootSystemScene, rootScene, branch) {
    if (!rootSystemScene) return;

    const journalId = rootSystemScene.getFlag(SCIFI_MODULE_ID, "journalId") || null;
    if (!journalId) return;

    const { JournalGenerator } = await import("/modules/augur-scifi/scripts/features/star-system/journal/JournalGenerator.js");
    const targets = [];
    const addTarget = (designation, bodyType) => {
        if (!designation || !bodyType) return;
        if (targets.some(target => target.designation === designation && target.bodyType === bodyType)) return;
        targets.push({ designation, bodyType });
    };

    const rootKind = getSceneKind(rootScene);
    if (rootKind === "planet") {
        addTarget(rootScene.getFlag(SCIFI_MODULE_ID, "planetScene.planetDesignation"), "planet");
    } else if (rootKind === "moon") {
        addTarget(rootScene.getFlag(SCIFI_MODULE_ID, "moonScene.moonDesignation"), "moon");
    }

    for (const scene of branch) {
        const kind = getSceneKind(scene);
        if (kind === "moon") {
            addTarget(scene.getFlag(SCIFI_MODULE_ID, "moonScene.moonDesignation"), "moon");
        }
    }

    const entry = getJournalEntry(journalId);
    if (!entry) return;

    if (entry.sheet?.rendered) await entry.sheet.close();

    const deletedPages = [];
    for (const target of targets) {
        const sitePages = entry.pages.contents
            .filter(page => page.flags?.[SCIFI_MODULE_ID]?.sitePage)
            .filter(page => page.flags?.[SCIFI_MODULE_ID]?.parentDesignation === target.designation)
            .filter(page => page.flags?.[SCIFI_MODULE_ID]?.parentBodyType === target.bodyType);

        for (const page of sitePages) {
            deletedPages.push({
                parentDesignation: page.flags?.[SCIFI_MODULE_ID]?.parentDesignation || null,
                parentBodyType: page.flags?.[SCIFI_MODULE_ID]?.parentBodyType || null
            });
            await page.delete();
        }
    }

    for (const page of deletedPages) {
        await JournalGenerator.refreshParentBodyPage(journalId, page.parentDesignation, page.parentBodyType);
    }
}

async function deleteLegacySiteArtifacts(scene) {
    const context = getLegacySiteContext(scene);
    if (!context) return;

    const { note, page, journalEntryId, parentDesignation, parentBodyType } = context;

    if (page) {
        if (page.parent?.sheet?.rendered) await page.parent.sheet.close();
        await page.delete();
    }

    if (note && context.parentScene) {
        await context.parentScene.deleteEmbeddedDocuments("Note", [note.id]);
    }

    if (!page && journalEntryId && parentDesignation && parentBodyType) {
        const { JournalGenerator } = await import("/modules/augur-scifi/scripts/features/star-system/journal/JournalGenerator.js");
        await JournalGenerator.refreshParentBodyPage(journalEntryId, parentDesignation, parentBodyType);
    }
}

function getLegacySiteContext(scene) {
    const siteFlags = scene?.getFlag(SCIFI_MODULE_ID, "siteScene") || null;
    if (!siteFlags?.siteId) return null;

    const rootScene = getRootSystemScene(siteFlags.rootSystemSceneId);
    if (!rootScene) return null;

    const parentSceneId = siteFlags.parentBodyType === "planet"
        ? getPlanetLinks(rootScene)?.[siteFlags.parentDesignation]?.sceneId || null
        : getMoonLinks(rootScene)?.[siteFlags.parentDesignation]?.sceneId || null;
    const parentScene = parentSceneId ? game.scenes.get(parentSceneId) || null : null;
    const note = parentScene?.notes?.contents?.find(candidate => candidate.flags?.[SCIFI_MODULE_ID]?.siteId === siteFlags.siteId) || null;
    const journalEntryId = siteFlags.journalEntryId || rootScene.getFlag(SCIFI_MODULE_ID, "journalId") || null;
    const page = journalEntryId ? getJournalEntry(journalEntryId)?.pages?.get(siteFlags.journalPageId) || null : null;

    return {
        rootScene,
        parentScene,
        note,
        page,
        journalEntryId,
        parentDesignation: siteFlags.parentDesignation || null,
        parentBodyType: siteFlags.parentBodyType || null
    };
}

async function unlinkLegacyPlanetBranch(rootSystemScene, planetScene, branch) {
    if (!rootSystemScene) return;

    const designation = planetScene.getFlag(SCIFI_MODULE_ID, "planetScene.planetDesignation") || null;
    if (!designation) return;

    const planetLinks = foundry.utils.deepClone(getPlanetLinks(rootSystemScene));
    const moonLinks = foundry.utils.deepClone(getMoonLinks(rootSystemScene));

    delete planetLinks[designation];

    for (const scene of branch) {
        if (getSceneKind(scene) !== "moon") continue;
        const moonDesignation = scene.getFlag(SCIFI_MODULE_ID, "moonScene.moonDesignation") || null;
        if (moonDesignation) delete moonLinks[moonDesignation];
    }

    await rootSystemScene.update({
        [`flags.${SCIFI_MODULE_ID}.planetScenes`]: planetLinks,
        [`flags.${SCIFI_MODULE_ID}.moonScenes`]: moonLinks
    });
}

async function unlinkLegacyMoonBranch(rootSystemScene, moonScene) {
    if (!rootSystemScene) return;

    const designation = moonScene.getFlag(SCIFI_MODULE_ID, "moonScene.moonDesignation") || null;
    if (!designation) return;

    const moonLinks = foundry.utils.deepClone(getMoonLinks(rootSystemScene));
    delete moonLinks[designation];

    await rootSystemScene.update({
        [`flags.${SCIFI_MODULE_ID}.moonScenes`]: moonLinks
    });
}

function sortScenes(a, b) {
    const sortA = a?.sort ?? 0;
    const sortB = b?.sort ?? 0;
    if (sortA !== sortB) return sortA - sortB;
    return (a?.name || "").localeCompare(b?.name || "", game.i18n.lang);
}

function sortPages(a, b) {
    const sortA = a?.sort ?? 0;
    const sortB = b?.sort ?? 0;
    if (sortA !== sortB) return sortA - sortB;
    return (a?.name || "").localeCompare(b?.name || "", game.i18n.lang);
}

export const LegacySciFiCompatibility = {
    isActive,
    getSceneKind,
    isLegacyScene,
    getSceneLabel,
    getSceneIconSrc,
    getBackTarget,
    getRootSceneForScene,
    getParentScene,
    getChildScenes,
    getSiteScenesForBody,
    getPendingNodes,
    openPendingNode,
    returnToParent,
    getLegacyBranch,
    collectLegacyBranch,
    getDeleteBranchImpact,
    cleanupLegacyBranchArtifacts,
    deleteLegacyBranch
};
