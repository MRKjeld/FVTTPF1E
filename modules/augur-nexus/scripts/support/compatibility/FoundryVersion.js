// Small version helpers for Foundry generation checks. Keep cross-version branching behind this file.

export function getFoundryGeneration() {
    const generation = Number(game.release?.generation ?? game.version?.split(".")?.[0] ?? 0);
    return Number.isFinite(generation) ? generation : 0;
}

export function isV14OrNewer() {
    return getFoundryGeneration() >= 14;
}



