// Shared registry for Site scene types. Built-ins live here, and other modules can register their own extensions.

import { NexusImageSceneManager } from "../../nexus/services/NexusImageSceneManager.js";

const BUILTIN_SCENE_TYPES = {
    empty: {
        id: "empty",
        label: "Empty Scene",
        showThemeControls: true,
        showMapColorControls: false,
        showSizeControls: false,
        showLinkedSceneControls: false,
        showRandomizeToggle: true,
        deletesLinkedSceneOnSiteDelete: true
    },
    existing: {
        id: "existing",
        label: "Existing Scene",
        showThemeControls: false,
        showMapColorControls: false,
        showSizeControls: false,
        showLinkedSceneControls: true,
        showRandomizeToggle: false,
        deletesLinkedSceneOnSiteDelete: false
    },
    "instant-dungeons-generator": {
        id: "instant-dungeons-generator",
        label: "Dungeon Generator",
        showThemeControls: true,
        showMapColorControls: true,
        showSizeControls: true,
        showLinkedSceneControls: false,
        showRandomizeToggle: true,
        deletesLinkedSceneOnSiteDelete: true,
        available: false,
        requiresModuleId: "instant-dungeons",
        requiresLabel: "Instant Dungeons",
        minimumModuleVersion: "1.3.0",
        requiresUrl: "https://foundryvtt.com/packages/instant-dungeons"
    },
    "hexlands-generator": {
        id: "hexlands-generator",
        label: "Hexmap Generator",
        showThemeControls: false,
        showMapColorControls: false,
        showSizeControls: false,
        showLinkedSceneControls: false,
        showRandomizeToggle: false,
        defaultIconId: "hexmap-site",
        available: false,
        requiresModuleId: "hexlands",
        requiresLabel: "Hexlands",
        minimumModuleVersion: "1.3.0",
        requiresUrl: "https://foundryvtt.com/packages/hexlands"
    },
    "augur-scifi-solar-system": {
        id: "augur-scifi-solar-system",
        label: "Solar System",
        showThemeControls: false,
        showMapColorControls: false,
        showSizeControls: false,
        showLinkedSceneControls: false,
        showRandomizeToggle: false,
        deletesLinkedSceneOnSiteDelete: true,
        available: false,
        requiresModuleId: "augur-scifi",
        requiresLabel: "Augur: Sci-Fi",
        requiresUrl: "https://foundryvtt.com/packages/augur-scifi"
    },
    "augur-scifi-sector": {
        id: "augur-scifi-sector",
        label: "Sector Generator",
        showThemeControls: false,
        showMapColorControls: false,
        showSizeControls: false,
        showLinkedSceneControls: false,
        showRandomizeToggle: false,
        deletesLinkedSceneOnSiteDelete: true,
        available: false,
        requiresModuleId: "augur-scifi",
        requiresLabel: "Augur: Sci-Fi",
        requiresUrl: "https://foundryvtt.com/packages/augur-scifi"
    },
    "from-image": {
        id: "from-image",
        label: "From Image",
        siteNameLabel: "Scene Name",
        siteNamePlaceholder: "Image Scene",
        showThemeControls: false,
        showMapColorControls: false,
        showSizeControls: false,
        showLinkedSceneControls: false,
        showImageControls: true,
        showRandomizeToggle: false,
        deletesLinkedSceneOnSiteDelete: true,
        suggestName: state => state.sceneImageName || "Image Scene",
        async resolveScene({ existingScene, page, pageFlags }) {
            if (existingScene) return existingScene;
            if (!pageFlags?.siteSceneImageSrc) throw new Error("No image selected for this site scene.");

            const scene = await NexusImageSceneManager.createImageScene(pageFlags.siteSceneImageSrc, {
                name: page?.name || pageFlags.siteSceneImageName || "Image Scene",
                navigation: false
            });

            return {
                scene,
                afterEnter: async enteredScene => NexusImageSceneManager.refreshSceneThumbnail(enteredScene)
            };
        }
    }
};

const REGISTERED_SCENE_TYPES = new Map();

function normalizeSceneType(definition) {
    if (!definition?.id || !definition?.label) return null;

    const normalized = {
        showThemeControls: true,
        showMapColorControls: false,
        showSizeControls: false,
        showLinkedSceneControls: false,
        showRandomizeToggle: true,
        showPresetControls: false,
        showBiomeControls: false,
        showImageControls: false,
        randomizeBiomeOnNextSite: false,
        deletesLinkedSceneOnSiteDelete: true,
        siteNameLabel: "Site Name",
        siteNamePlaceholder: "Site",
        presetLabel: "Preset",
        presetOptions: [],
        defaultPresetId: null,
        biomeLabel: "Biome",
        biomeOptions: [],
        defaultBiomeId: null,
        siteIconSource: "",
        defaultIconId: null,
        suggestName: null,
        resolveScene: null,
        available: true,
        requiresModuleId: null,
        requiresLabel: "",
        minimumModuleVersion: "",
        requiresUrl: "",
        ...definition
    };

    if (normalized.requiresModuleId) {
        const module = game?.modules?.get(normalized.requiresModuleId);
        const isActive = module?.active === true;
        const installedVersion = module?.version || module?.manifest?.version || "";
        const meetsMinimumVersion = !normalized.minimumModuleVersion
            || !installedVersion
            || !foundry.utils.isNewerVersion(normalized.minimumModuleVersion, installedVersion);

        normalized.available = isActive && meetsMinimumVersion;
    }

    return normalized;
}

export function registerSiteSceneType(definition) {
    const normalized = normalizeSceneType(definition);
    if (!normalized) return null;

    REGISTERED_SCENE_TYPES.set(normalized.id, normalized);
    Hooks.callAll("augurNexusSiteSceneTypesChanged", { id: normalized.id });
    return normalized;
}

export function normalizeResolvedSiteScene(result) {
    if (!result) return null;
    if (result.documentName === "Scene") {
        return { scene: result, afterEnter: null };
    }

    const scene = result.scene;
    if (!scene || scene.documentName !== "Scene") return null;

    return {
        scene,
        afterEnter: typeof result.afterEnter === "function" ? result.afterEnter : null
    };
}

export function getSiteSceneTypes() {
    const registry = new Map();

    for (const definition of Object.values(BUILTIN_SCENE_TYPES)) {
        registry.set(definition.id, normalizeSceneType(definition));
    }

    for (const definition of REGISTERED_SCENE_TYPES.values()) {
        registry.set(definition.id, definition);
    }

    Hooks.callAll("augurNexusRegisterSiteSceneTypes", {
        register(definition) {
            const normalized = normalizeSceneType(definition);
            if (!normalized) return;
            registry.set(normalized.id, normalized);
        }
    });

    return [...registry.values()];
}

export function getSiteSceneType(id = "empty") {
    const sceneTypes = getSiteSceneTypes();
    return sceneTypes.find(type => type.id === id) || sceneTypes.find(type => type.id === "empty") || null;
}
