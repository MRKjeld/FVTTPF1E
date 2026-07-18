// Register the shared Augur interaction layer with Foundry.

import { AugurLayer } from "./AugurLayer.js";

export function registerAugurLayer() {
    CONFIG.Canvas.layers.augur = {
        layerClass: AugurLayer,
        group: "primary"
    };
}
