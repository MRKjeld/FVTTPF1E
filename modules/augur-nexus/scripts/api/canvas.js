// Public canvas registration API for dependent modules.

import { registerAugurLayer as registerAugurLayerInternal } from "../support/canvas/registerAugurLayer.js";

export function registerAugurLayer() {
    return registerAugurLayerInternal();
}

