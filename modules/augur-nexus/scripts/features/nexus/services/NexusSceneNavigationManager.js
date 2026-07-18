import { NexusLineageManager } from "./NexusLineageManager.js";
import { NexusSceneTransitionEffects } from "./NexusSceneTransitionEffects.js";

const MODULE_ID = "augur-nexus";

export class NexusSceneNavigationManager {
    static NAVIGATION_FLAG = "navigation";

    static getSceneNavigation(scene) {
        const navigation = scene?.getFlag(MODULE_ID, this.NAVIGATION_FLAG) || null;
        if (!navigation?.parentSceneId) return null;
        if (!game.scenes.get(navigation.parentSceneId)) return null;
        return navigation;
    }

    static async setSceneNavigation(scene, {
        parentSceneId = null,
        parentSiteId = null,
        transitionStyle = "scene-default",
        transitionContext = {}
    } = {}) {
        if (!scene) throw new Error("No scene provided.");

        await NexusLineageManager.setSceneParent(scene, {
            parentSceneId,
            parentSiteId
        });

        if (!parentSceneId) {
            await scene.unsetFlag(MODULE_ID, this.NAVIGATION_FLAG);
            return scene;
        }

        await scene.setFlag(MODULE_ID, this.NAVIGATION_FLAG, {
            parentSceneId,
            sceneId: parentSceneId,
            parentSiteId: parentSiteId || null,
            transitionStyle,
            transitionContext: transitionContext || {}
        });
        return scene;
    }

    static async returnToParent(scene = canvas.scene) {
        const navigation = this.getSceneNavigation(scene);
        if (!navigation) return false;
        return NexusSceneTransitionEffects.returnToParent(scene, navigation);
    }
}
