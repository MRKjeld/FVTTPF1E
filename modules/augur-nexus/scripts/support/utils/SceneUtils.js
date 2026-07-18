// Generic scene helpers used across my modules. This is where scene setup, clearing, and resize timing work lives.

import { Log } from "./Logger.js";
import { setSceneBackgroundColor } from "../compatibility/SceneBackgroundCompatibility.js";

export class SceneUtils {
    static async clearScene(scene, types = ["Token", "Tile", "Drawing", "Wall", "AmbientLight", "AmbientSound", "Note", "MeasuredTemplate", "Region"]) {
        Log.log("Clearing Scene...");
        for (const type of types) {
            try {
                const ids = scene.getEmbeddedCollection(type).map(document => document.id);
                if (ids.length > 0) await scene.deleteEmbeddedDocuments(type, ids);
            } catch (err) {
                Log.warn(`Failed to clear ${type}:`, err);
            }
        }
    }

    static async configureScene(scene, {
        backgroundColor = "#1a1a1a",
        gridType = CONST.GRID_TYPES.SQUARE,
        gridSize = 100,
        gridDistance = 5,
        gridUnits = "ft",
        tokenVision = undefined,
        fogExploration = undefined
    } = {}) {
        const updateData = {
            padding: 0,
            "grid.type": gridType,
            "grid.size": gridSize,
            "grid.distance": gridDistance,
            "grid.units": gridUnits
        };

        if (tokenVision !== undefined) updateData.tokenVision = tokenVision;
        if (fogExploration !== undefined) updateData.fogExploration = fogExploration;

        await scene.update(updateData);
        await setSceneBackgroundColor(scene, backgroundColor);
    }

    static async resizeScene(scene, width, height, extraData = {}) {
        const nextWidth = Math.max(width, 1000);
        const nextHeight = Math.max(height, 1000);

        Log.log(`Resizing Scene to ${nextWidth}x${nextHeight}px...`);

        await scene.update({
            width: nextWidth,
            height: nextHeight,
            padding: 0,
            ...extraData
        });

        let attempts = 0;
        const maxAttempts = 50;
        while (attempts < maxAttempts) {
            const currentWidth = canvas.dimensions.sceneRect?.width || canvas.dimensions.width;
            const currentHeight = canvas.dimensions.sceneRect?.height || canvas.dimensions.height;
            if (Math.abs(currentWidth - nextWidth) < 10 && Math.abs(currentHeight - nextHeight) < 10) break;
            await new Promise(resolve => setTimeout(resolve, 50));
            attempts++;
        }
    }
}




