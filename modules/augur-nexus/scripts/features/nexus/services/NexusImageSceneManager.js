import { setSceneBackground } from "../../../support/compatibility/SceneBackgroundCompatibility.js";

export const NEXUS_IMAGE_SCENE_BACKGROUND_COLOR = "#141414";

export class NexusImageSceneManager {
    static THUMBNAIL_DELAY_MS = 1000;
    static THUMBNAIL_ATTEMPTS = 2;

    static async createImageScene(imageSrc, { name = null, folder = null, sort = null, navigation = false } = {}) {
        const { width, height } = await this.getImageDimensions(imageSrc);
        const createData = {
            name: name || this.getImageSceneName(imageSrc),
            width,
            height,
            padding: 0,
            navigation,
            "grid.type": CONST.GRID_TYPES.GRIDLESS,
            backgroundColor: NEXUS_IMAGE_SCENE_BACKGROUND_COLOR
        };
        if (folder) createData.folder = folder;
        if (sort !== null && sort !== undefined) createData.sort = sort;

        const scene = await Scene.create(createData);
        await setSceneBackground(scene, { color: NEXUS_IMAGE_SCENE_BACKGROUND_COLOR, src: imageSrc });
        return scene;
    }

    static async getImageDimensions(src) {
        try {
            const texture = await foundry.canvas.loadTexture(src);
            const width = Math.max(Math.round(texture?.width || 0), 1000);
            const height = Math.max(Math.round(texture?.height || 0), 1000);
            return { width, height };
        } catch (err) {
            console.warn("Augur: Nexus | Could not read image dimensions; using a default scene size.", err);
            return { width: 4000, height: 3000 };
        }
    }

    static getImageSceneName(src) {
        const fileName = String(src || "").split(/[\\/]/).pop() || "Image Scene";
        return fileName.replace(/\.[^.]+$/, "") || "Image Scene";
    }

    static async refreshSceneThumbnail(scene) {
        if (!scene || typeof scene.createThumbnail !== "function") return;

        for (let attempt = 0; attempt < this.THUMBNAIL_ATTEMPTS; attempt++) {
            try {
                await new Promise(resolve => setTimeout(resolve, this.THUMBNAIL_DELAY_MS));
                if (canvas.scene?.id !== scene.id) return;

                const { thumb } = await scene.createThumbnail();
                if (thumb) {
                    await scene.update({ thumb }, { diff: false });
                    return;
                }
            } catch (err) {
                if (attempt === this.THUMBNAIL_ATTEMPTS - 1) {
                    console.warn(`Augur: Nexus | Failed to refresh image scene thumbnail for "${scene.name}".`, err);
                }
            }
        }
    }
}
