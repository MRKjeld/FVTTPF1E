import { getSiteSceneType, normalizeResolvedSiteScene } from "../../site/registry/SiteSceneTypeRegistry.js";
import { NexusImageSceneManager } from "./NexusImageSceneManager.js";
import { NexusLineageManager } from "./NexusLineageManager.js";
import { NexusSceneTransitionEffects } from "./NexusSceneTransitionEffects.js";

const MODULE_ID = "augur-nexus";
const FilePicker = foundry.applications.apps.FilePicker.implementation;

const ROOT_SCENE_DEFAULTS = {
    "instant-dungeons-generator": {
        name: "New Dungeon",
        flags: {
            siteGenre: "fantasy",
            siteTheme: "castle",
            mapColorId: "green",
            siteSize: "small",
            roomCount: 5
        }
    },
    "hexlands-generator": {
        name: "New Hexmap"
    },
    "augur-scifi-solar-system": {
        name: "New Solar System",
        flags: {
            siteGenre: "scifi"
        }
    },
    "augur-scifi-sector": {
        name: "New Sector",
        flags: {
            siteGenre: "scifi"
        }
    }
};

export class NexusRootSceneCreationManager {
    static async createEmptyScene({ position = null } = {}) {
        const createDialog = Scene.implementation?.createDialog || Scene.createDialog;
        const scene = await createDialog.call(Scene.implementation || Scene, {}, {}, { position });
        if (!scene) return null;

        await this.#setRootSceneIfMissing(scene);
        Hooks.callAll("augurNexusLineageChanged");
        return scene;
    }

    static openImagePicker({ position = null } = {}) {
        const picker = new FilePicker({
            type: "image",
            callback: async path => {
                if (!path) return;
                try {
                    await this.createImageScene(path);
                } catch (err) {
                    console.error("Augur: Nexus | Failed to create root scene from image.", err);
                    ui.notifications.error("Failed to create the image scene.");
                }
            },
            top: position?.top,
            left: position?.left
        });

        picker.render({ force: true });
    }

    static async createImageScene(imageSrc) {
        const scene = await NexusImageSceneManager.createImageScene(imageSrc, {
            name: NexusImageSceneManager.getImageSceneName(imageSrc),
            navigation: false
        });
        await this.#setRootSceneIfMissing(scene);
        await NexusSceneTransitionEffects.transitionToScene(scene, { transitionStyle: "none" });
        await NexusImageSceneManager.refreshSceneThumbnail(scene);
        Hooks.callAll("augurNexusLineageChanged");
        return scene;
    }

    static async createGeneratedScene(sceneTypeId) {
        const sceneType = getSiteSceneType(sceneTypeId);
        if (!sceneType || sceneType.id !== sceneTypeId || sceneType.available === false) {
            ui.notifications.warn("That root scene type is not available.");
            return null;
        }

        if (typeof sceneType.resolveScene !== "function") {
            ui.notifications.warn(`${sceneType.label} does not support automatic root creation yet.`);
            return null;
        }

        const pageFlags = this.#getRootSceneFlags(sceneType);
        const page = {
            name: this.#getRootSceneName(sceneType, pageFlags),
            flags: {
                [MODULE_ID]: pageFlags
            }
        };

        const resolved = normalizeResolvedSiteScene(await sceneType.resolveScene({
            existingScene: null,
            parentScene: null,
            page,
            pageFlags,
            manager: this,
            moduleId: MODULE_ID,
            rootCreation: true
        }));
        if (!resolved?.scene) {
            throw new Error(`Scene type '${sceneType.id}' did not return a scene.`);
        }

        await resolved.scene.update({
            flags: {
                [MODULE_ID]: {
                    rootSceneCreation: {
                        sceneType: sceneType.id,
                        sceneTypeLabel: sceneType.label
                    }
                }
            }
        });
        await this.#setRootSceneIfMissing(resolved.scene);
        await NexusSceneTransitionEffects.transitionToScene(resolved.scene, { transitionStyle: "none" });
        if (resolved.afterEnter) {
            await resolved.afterEnter(resolved.scene, {
                parentScene: null,
                page,
                pageFlags,
                sceneType,
                manager: this,
                moduleId: MODULE_ID,
                rootCreation: true
            });
        }
        Hooks.callAll("augurNexusLineageChanged");
        return resolved.scene;
    }

    static async #setRootSceneIfMissing(scene) {
        if (!NexusLineageManager.getRootScene()) {
            await NexusLineageManager.setRootScene(scene);
        }
    }

    static #getRootSceneFlags(sceneType) {
        return {
            siteSceneType: sceneType.id,
            siteSceneTypeLabel: sceneType.label,
            siteScenePresetId: sceneType.defaultPresetId || null,
            siteScenePresetLabel: this.#getOptionLabel(sceneType.presetOptions, sceneType.defaultPresetId),
            siteSceneBiomeId: sceneType.defaultBiomeId || null,
            siteSceneBiomeLabel: this.#getOptionLabel(sceneType.biomeOptions, sceneType.defaultBiomeId),
            siteSceneBiomeFieldLabel: sceneType.biomeLabel || "Biome",
            ...(ROOT_SCENE_DEFAULTS[sceneType.id]?.flags || {})
        };
    }

    static #getRootSceneName(sceneType, pageFlags) {
        const rootState = {
            genreId: pageFlags.siteGenre || "fantasy",
            sceneType: sceneType.id,
            sceneTypeLabel: sceneType.label,
            sceneTypePresetId: pageFlags.siteScenePresetId || null,
            sceneTypePresetLabel: pageFlags.siteScenePresetLabel || "",
            sceneTypeBiomeId: pageFlags.siteSceneBiomeId || null,
            sceneTypeBiomeLabel: pageFlags.siteSceneBiomeLabel || "",
            siteName: "",
            themeId: pageFlags.siteTheme || null,
            mapColorId: pageFlags.mapColorId || null,
            roomCount: pageFlags.roomCount || null,
            sizeId: pageFlags.siteSize || null
        };

        if (typeof sceneType?.suggestName === "function") {
            const suggested = String(sceneType.suggestName(rootState) || "").trim();
            if (suggested) return suggested;
        }

        const presetSuggestedName = sceneType?.presetOptions?.find(option => option.id === pageFlags.siteScenePresetId)?.suggestedName;
        if (presetSuggestedName) return presetSuggestedName;

        const biomeSuggestedName = sceneType?.biomeOptions?.find(option => option.id === pageFlags.siteSceneBiomeId)?.suggestedName;
        if (biomeSuggestedName) return biomeSuggestedName;

        return ROOT_SCENE_DEFAULTS[sceneType.id]?.name || sceneType.label || "New Root Scene";
    }

    static #getOptionLabel(options = [], id = null) {
        if (!id) return "";
        return options.find(option => option.id === id)?.label || "";
    }
}
