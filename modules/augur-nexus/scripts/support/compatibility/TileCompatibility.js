import { isV14OrNewer } from "./FoundryVersion.js";

function applyTopLeftTextureAnchor(texture = {}) {
    return {
        ...texture,
        anchorX: 0,
        anchorY: 0
    };
}

function applyTextureAnchorMode(texture = {}, anchorMode = "top-left") {
    switch (anchorMode) {
        case "native":
        case "preserve":
            return texture;
        case "top-left":
        default:
            return applyTopLeftTextureAnchor(texture);
    }
}

function hasFiniteNumber(value) {
    return Number.isFinite(Number(value));
}

function getCenterPreservingTopLeftPosition({ x, y, width, height, rotation } = {}) {
    if (!isV14OrNewer()) return { x, y };
    if (![x, y, width, height, rotation].every(hasFiniteNumber)) return { x, y };

    const radians = Math.toRadians(Number(rotation) || 0);
    if (!radians) return { x, y };

    const halfWidth = Number(width) / 2;
    const halfHeight = Number(height) / 2;
    const centerX = Number(x) + halfWidth;
    const centerY = Number(y) + halfHeight;

    const rotatedHalfX = (halfWidth * Math.cos(radians)) - (halfHeight * Math.sin(radians));
    const rotatedHalfY = (halfWidth * Math.sin(radians)) + (halfHeight * Math.cos(radians));

    return {
        x: centerX - rotatedHalfX,
        y: centerY - rotatedHalfY
    };
}

export function normalizeTileCreateData(data, { anchorMode = "top-left" } = {}) {
    if (!isV14OrNewer()) return data;
    return {
        ...data,
        texture: applyTextureAnchorMode(data.texture, anchorMode)
    };
}

export function normalizeTileUpdateData(data, { anchorMode = "top-left" } = {}) {
    if (!isV14OrNewer()) return data;
    if (!data.texture) return data;
    return {
        ...data,
        texture: applyTextureAnchorMode(data.texture, anchorMode)
    };
}

export function getTopLeftAnchorCompensatedPosition(data) {
    return getCenterPreservingTopLeftPosition(data);
}
