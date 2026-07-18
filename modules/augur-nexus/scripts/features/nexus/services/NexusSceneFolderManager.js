// Shared scene-folder helpers for Nexus. This keeps site-created child scenes grouped under their parent scenes without depending on folder names staying untouched.

import { Log } from "../../../support/utils/Logger.js";

const MODULE_ID = "augur-nexus";

export class NexusSceneFolderManager {
    static ROOT_FOLDER_NAME = "Augur Nexus Scenes";
    static ROOT_SETTING_KEY = "siteSceneRootFolderId";
    static CHILD_FOLDER_FLAG = "siteChildSceneFolderId";

    static async getChildSceneCreateData(parentScene, { autoSort = false, includeParentScene = false } = {}) {
        if (!autoSort || !parentScene) return {};

        const folder = await this.ensureChildFolder(parentScene);
        if (includeParentScene) await this.placeSceneInFamilyFolder(parentScene, { folder });
        return {
            folderId: folder.id,
            sort: this.#getNextSceneSort(folder.id)
        };
    }

    static async placeExistingSceneInParentFolder(parentScene, childScene, { autoSort = false } = {}) {
        if (!autoSort || !parentScene || !childScene) return childScene;

        const folder = await this.ensureChildFolder(parentScene);
        const currentFolderId = childScene.folder?.id || childScene.folder || null;
        const desiredSort = this.#getNextSceneSort(folder.id, childScene.id);
        const updates = {};

        if (currentFolderId !== folder.id) updates.folder = folder.id;
        if ((childScene.sort ?? 0) !== desiredSort) updates.sort = desiredSort;
        if (!Object.keys(updates).length) return childScene;

        await childScene.update(updates);
        return childScene;
    }

    static async placeSceneInFamilyFolder(scene, { folder = null } = {}) {
        if (!scene) return scene;

        const familyFolder = folder || await this.ensureChildFolder(scene);
        const currentFolderId = scene.folder?.id || scene.folder || null;
        const updates = {};

        if (currentFolderId !== familyFolder.id) updates.folder = familyFolder.id;
        if ((scene.sort ?? 0) !== 0) updates.sort = 0;
        if (!Object.keys(updates).length) return scene;

        await scene.update(updates);
        return scene;
    }

    static async ensureChildFolder(parentScene) {
        if (!parentScene) throw new Error("No parent scene provided.");

        let folder = await this.#resolveChildFolder(parentScene);
        if (!folder) {
            const containerFolder = await this.#getContainerFolder(parentScene);
            if (containerFolder && !this.#canCreateChildFolderIn(containerFolder)) {
                Log.warn(`Scene folder "${containerFolder.name}" is already at Foundry's folder depth limit; placing Nexus child scenes directly in that folder.`);
                folder = containerFolder;
            } else {
                folder = await Folder.create({
                    name: parentScene.name,
                    type: "Scene",
                    folder: containerFolder?.id || null,
                    sorting: "m",
                    flags: {
                        [MODULE_ID]: {
                            siteChildFolder: {
                                parentSceneId: parentScene.id
                            }
                        }
                    }
                });
                Log.info(`Created Nexus child scene folder "${folder.name}" for "${parentScene.name}".`);
            }
        } else if (folder.sorting !== "m") {
            await folder.update({ sorting: "m" });
        }

        await parentScene.setFlag(MODULE_ID, this.CHILD_FOLDER_FLAG, folder.id);
        return folder;
    }

    static async #resolveChildFolder(parentScene) {
        const storedId = parentScene.getFlag(MODULE_ID, this.CHILD_FOLDER_FLAG);
        if (storedId) {
            const storedFolder = game.folders.get(storedId);
            if (storedFolder?.type === "Scene") return storedFolder;
        }

        const containerFolder = await this.#getContainerFolder(parentScene);
        const containerId = containerFolder?.id || null;
        return game.folders.find(folder => {
            if (folder.type !== "Scene") return false;
            const folderParentId = folder.folder?.id || folder.folder || null;
            const managedParentId = folder.flags?.[MODULE_ID]?.siteChildFolder?.parentSceneId || null;

            if (managedParentId === parentScene.id) return true;
            return folderParentId === containerId && folder.name === parentScene.name;
        }) || null;
    }

    static async #getContainerFolder(parentScene) {
        const currentFolderId = parentScene.folder?.id || parentScene.folder || null;
        if (currentFolderId) {
            const currentFolder = game.folders.get(currentFolderId);
            if (currentFolder?.type === "Scene") return currentFolder;
        }
        return this.#getOrCreateRootFolder();
    }

    static #canCreateChildFolderIn(folder) {
        const maxDepth = CONST.FOLDER_MAX_DEPTH ?? 4;
        return ((folder?.ancestors?.length || 0) + 1) < maxDepth;
    }

    static async #getOrCreateRootFolder() {
        const storedId = game.settings.get(MODULE_ID, this.ROOT_SETTING_KEY) || "";
        if (storedId) {
            const storedFolder = game.folders.get(storedId);
            if (storedFolder?.type === "Scene") return storedFolder;
        }

        let folder = game.folders.find(candidate =>
            candidate.type === "Scene" &&
            !candidate.folder &&
            candidate.flags?.[MODULE_ID]?.siteRootFolder === true
        );

        if (!folder) {
            folder = game.folders.find(candidate =>
                candidate.type === "Scene" &&
                !candidate.folder &&
                candidate.name === this.ROOT_FOLDER_NAME
            ) || null;
        }

        if (!folder) {
            folder = await Folder.create({
                name: this.ROOT_FOLDER_NAME,
                type: "Scene",
                sorting: "m",
                flags: {
                    [MODULE_ID]: {
                        siteRootFolder: true
                    }
                }
            });
            Log.info(`Created Nexus root scene folder "${folder.name}".`);
        } else {
            const updates = {};
            if (folder.sorting !== "m") updates.sorting = "m";
            if (folder.flags?.[MODULE_ID]?.siteRootFolder !== true) {
                updates.flags = {
                    [MODULE_ID]: {
                        siteRootFolder: true
                    }
                };
            }
            if (Object.keys(updates).length) await folder.update(updates);
        }

        await game.settings.set(MODULE_ID, this.ROOT_SETTING_KEY, folder.id);
        return folder;
    }

    static #getNextSceneSort(folderId, excludeSceneId = null) {
        const scenesInFolder = game.scenes.contents.filter(scene => {
            if (excludeSceneId && scene.id === excludeSceneId) return false;
            const sceneFolderId = scene.folder?.id || scene.folder || null;
            return sceneFolderId === folderId;
        });

        const maxSort = scenesInFolder.reduce((max, scene) => Math.max(max, scene.sort ?? 0), 0);
        return maxSort + CONST.SORT_INTEGER_DENSITY;
    }
}

