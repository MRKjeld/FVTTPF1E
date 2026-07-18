// Public tile compatibility helpers for dependent modules.

import {
    normalizeTileCreateData as normalizeTileCreateDataInternal,
    normalizeTileUpdateData as normalizeTileUpdateDataInternal,
    getTopLeftAnchorCompensatedPosition as getTopLeftAnchorCompensatedPositionInternal
} from "../support/compatibility/TileCompatibility.js";

export function normalizeTileCreateData(data, options) {
    return normalizeTileCreateDataInternal(data, options);
}

export function normalizeTileUpdateData(data, options) {
    return normalizeTileUpdateDataInternal(data, options);
}

export function getTopLeftAnchorCompensatedPosition(data) {
    return getTopLeftAnchorCompensatedPositionInternal(data);
}
