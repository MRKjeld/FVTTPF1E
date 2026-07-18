// Client and world settings that back the Sites workflow.

const MODULE_ID = "augur-nexus";

export function registerNexusSettings() {
    game.settings.register(MODULE_ID, "siteCustomIconFolder", {
        scope: "client",
        config: false,
        type: Object,
        default: {
            source: "data",
            path: ""
        }
    });

    game.settings.register(MODULE_ID, "siteSceneRootFolderId", {
        scope: "world",
        config: false,
        type: String,
        default: ""
    });

    game.settings.register(MODULE_ID, "nexusBrowserShowIcons", {
        scope: "client",
        config: false,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "siteGeneratorState", {
        scope: "client",
        config: false,
        type: Object,
        default: {
            genreId: "fantasy",
            themeId: "castle",
            sceneType: "empty",
            sizeId: "small",
            iconRole: "landmark",
            iconId: null,
            customIconSrc: "",
            iconColor: "#ffffff",
            iconSizeMode: "scene-default",
            customIconSize: null,
            mapColorId: "green",
            snapToGrid: false,
            autoSortScenes: true,
            randomizeAfterPlacement: false
        }
    });
}
