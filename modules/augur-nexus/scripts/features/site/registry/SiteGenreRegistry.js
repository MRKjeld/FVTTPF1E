// Built-in Site genres and their asset catalogs. This is the shared source for genre-specific icons and themes.

const SCIFI_MAP_COLOR_GENERATOR_OVERRIDES = {
    blue: {
        floorTileId: "crt_blue",
        wallStyleId: "default_crt_blue_wall",
        doorStyleId: "default_crt_blue_door"
    },
    green: {
        floorTileId: "crt_green",
        wallStyleId: "default_crt_green_wall",
        doorStyleId: "default_crt_green_door"
    },
    yellow: {
        floorTileId: "crt_yellow",
        wallStyleId: "default_crt_yellow_wall",
        doorStyleId: "default_crt_yellow_door"
    },
    orange: {
        floorTileId: "crt_orange",
        wallStyleId: "default_crt_orange_wall",
        doorStyleId: "default_crt_orange_door"
    },
    red: {
        floorTileId: "crt_red",
        wallStyleId: "default_crt_red_wall",
        doorStyleId: "default_crt_red_door"
    },
    magenta: {
        floorTileId: "crt_magenta",
        wallStyleId: "default_crt_magenta_wall",
        doorStyleId: "default_crt_magenta_door"
    },
    white: {
        floorTileId: "crt_white",
        wallStyleId: "default_crt_white_wall",
        doorStyleId: "default_crt_white_door"
    }
};

const FANTASY_GENERATOR_OVERRIDES = {
    floorTileId: "stone_slab",
    terrainTileId: "terrain_grass_03",
    wallStyleId: "default_stone_brick",
    doorStyleId: "default_wooden_door"
};

const SITE_GENRES = {
    fantasy: {
        id: "fantasy",
        label: "Fantasy",
        iconCatalogPath: "modules/augur-nexus/assets/site_icons/fantasy/site_icons.json",
        themeCatalogPath: "modules/augur-nexus/assets/site_icons/fantasy/site_themes.json",
        requiredPackId: "__default__",
        defaultThemeId: "castle",
        defaultMapColorId: "green",
        supportsMapColorOverrides: false,
        resolveGenerationOverrides(state) {
            const themeId = state.siteTheme || state.themeId;
            return {
                ...FANTASY_GENERATOR_OVERRIDES,
                floorStyle: themeId === "temple" ? "temple" : "basic"
            };
        }
    },
    scifi: {
        id: "scifi",
        label: "Sci-Fi",
        iconCatalogPath: "modules/augur-nexus/assets/site_icons/scifi/site_icons.json",
        themeCatalogPath: "modules/augur-nexus/assets/site_icons/scifi/site_themes.json",
        requiredPackId: "__crt__",
        defaultThemeId: "facility",
        defaultMapColorId: "green",
        supportsMapColorOverrides: true,
        resolveGenerationOverrides(state) {
            return {
                ...(SCIFI_MAP_COLOR_GENERATOR_OVERRIDES[state.mapColorId] || SCIFI_MAP_COLOR_GENERATOR_OVERRIDES.green),
                terrainTileId: null,
                floorStyle: "basic",
                populateRooms: false
            };
        }
    }
};

export function getSiteGenre(id = "fantasy") {
    return SITE_GENRES[id] || SITE_GENRES.fantasy;
}

export function getSiteGenres() {
    return Object.values(SITE_GENRES);
}

export function getDefaultSiteGenre() {
    return SITE_GENRES.fantasy;
}
