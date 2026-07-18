// Main Sites tool window. This owns panel state, persistence, and the form logic that drives site placement.

import { NexusTool } from "../../../support/utils/NexusTool.js";
import { Log } from "../../../support/utils/Logger.js";
import { SiteIconPicker } from "./SiteIconPicker.js";
import { SiteScenePicker } from "./SiteScenePicker.js";
import { isNexusSiteToolSuppressedScene } from "../../../support/toolbar/NexusToolContext.js";
import { NexusImageSceneManager } from "../../nexus/services/NexusImageSceneManager.js";
import { getDefaultSiteGenre, getSiteGenre, getSiteGenres } from "../registry/SiteGenreRegistry.js";
import { getSiteSceneType, getSiteSceneTypes } from "../registry/SiteSceneTypeRegistry.js";

const MODULE_ID = "augur-nexus";
const FilePicker = foundry.applications.apps.FilePicker.implementation;

export class SitePanel extends NexusTool {
    static TOOL_NAME = "nexus-sites";
    static DEFAULT_GENRE_ID = getDefaultSiteGenre().id;
    static DEFAULT_THEME_ID = "castle";
    static DEFAULT_SIZE_ID = "small";
    static DEFAULT_NAME = "Ancient Site";
    static DEFAULT_COLOR = "#ffffff";
    static DEFAULT_MAP_COLOR_ID = "green";
    static MIN_ICON_SIZE = 50;
    static MAX_ICON_SIZE = 256;
    static ROOM_COUNT_BY_SIZE = {
        small: 5,
        medium: 8,
        large: 12,
        sprawling: 16
    };
    static SIZE_OPTIONS = [
        { id: "small", label: "Small" },
        { id: "medium", label: "Medium" },
        { id: "large", label: "Large" },
        { id: "sprawling", label: "Sprawling" }
    ];
    static COLOR_OPTIONS = [
        { value: "#ffffff", label: "White" },
        { value: "#f4d35e", label: "Gold" },
        { value: "#ff8c42", label: "Orange" },
        { value: "#ff5964", label: "Red" },
        { value: "#c77dff", label: "Violet" },
        { value: "#7bdff2", label: "Cyan" },
        { value: "#4ecdc4", label: "Teal" },
        { value: "#95d36e", label: "Lime" }
    ];
    static MAP_COLOR_OPTIONS = [
        { id: "blue", label: "Blue", value: "#57b3ff" },
        { id: "green", label: "Green", value: "#7de37d" },
        { id: "yellow", label: "Yellow", value: "#e6d36a" },
        { id: "orange", label: "Orange", value: "#ff9b4a" },
        { id: "red", label: "Red", value: "#ff6262" },
        { id: "magenta", label: "Magenta", value: "#d96cff" },
        { id: "white", label: "White", value: "#f3f4f6" }
    ];
    static ICON_ROLE_OPTIONS = [
        { id: "landmark", label: "Landmark" },
        { id: "entrance", label: "Entrance" }
    ];

    static #instance = null;
    static #iconCatalogs = new Map();
    static #themeCatalogs = new Map();
    static #generatedName = SitePanel.DEFAULT_NAME;
    static #nameDirty = false;
    static #state = {
        siteName: SitePanel.DEFAULT_NAME,
        genreId: SitePanel.DEFAULT_GENRE_ID,
        themeId: SitePanel.DEFAULT_THEME_ID,
        sceneType: "empty",
        linkedSceneId: null,
        linkedSceneName: "",
        sceneImageSrc: "",
        sceneImageName: "",
        sceneTypePresetId: null,
        sceneTypeBiomeId: null,
        sizeId: SitePanel.DEFAULT_SIZE_ID,
        iconRole: "landmark",
        iconId: null,
        customIconSrc: "",
        iconColor: SitePanel.DEFAULT_COLOR,
        iconSizeMode: "scene-default",
        customIconSize: null,
        mapColorId: SitePanel.DEFAULT_MAP_COLOR_ID,
        snapToGrid: false,
        autoSortScenes: true,
        randomizeAfterPlacement: false
    };

    static DEFAULT_OPTIONS = {
        id: "augur-nexus-sites-panel",
        classes: ["augur-nexus", "site-generator-panel"],
        tag: "div",
        window: {
            title: "Sites",
            resizable: false,
            minimizable: true
        },
        position: {
            width: 400,
            height: "auto"
        }
    };

    static PARTS = {
        main: {
            template: "modules/augur-nexus/templates/site/site-generator-panel.hbs"
        }
    };

    static show() {
        this.#loadPersistentState();
        if (!this.#instance) this.#instance = new this();
        this.#instance.render(true);
        return this.#instance;
    }

    static dismiss(options) {
        if (!this.#instance) return;
        const app = this.#instance;
        this.#instance = null;
        app.close(options);
    }

    static refreshIfOpen() {
        this.#instance?.render();
    }

    static getState() {
        const icon = this.getSelectedIcon();
        const theme = this.getSelectedTheme();
        const sizeId = this.#state.sizeId;
        const sceneType = this.#getCurrentSceneType();

        return {
            siteName: this.#state.siteName,
            genreId: this.#state.genreId,
            genreLabel: this.#getCurrentGenre().label,
            themeId: this.#state.themeId,
            themeLabel: theme?.label || "Site",
            sceneType: sceneType?.id || "empty",
            sceneTypeLabel: sceneType?.label || "Empty Scene",
            linkedSceneId: this.#state.linkedSceneId || null,
            linkedSceneName: this.#state.linkedSceneName || "",
            sceneImageSrc: this.#state.sceneImageSrc || "",
            sceneImageName: this.#state.sceneImageName || "",
            sceneTypePresetId: this.#state.sceneTypePresetId || sceneType?.defaultPresetId || "",
            sceneTypePresetLabel: this.#getCurrentSceneTypePreset()?.label || "",
            sceneTypeBiomeId: this.#state.sceneTypeBiomeId || sceneType?.defaultBiomeId || "",
            sceneTypeBiomeLabel: this.#getCurrentSceneTypeBiome()?.label || "",
            sceneTypeBiomeIconSrc: this.#getCurrentSceneTypeBiome()?.iconSrc || "",
            sceneTypeBiomeFieldLabel: sceneType?.biomeLabel || "Biome",
            sceneTypeNameLabel: sceneType?.siteNameLabel || "Site Name",
            sceneTypeNamePlaceholder: sceneType?.siteNamePlaceholder || "Site",
            sizeId,
            sizeLabel: this.getSizeLabel(sizeId),
            iconRole: this.#state.iconRole || "landmark",
            iconRoleLabel: this.getIconRoleLabel(this.#state.iconRole),
            roomCount: this.ROOM_COUNT_BY_SIZE[sizeId] || this.ROOM_COUNT_BY_SIZE[this.DEFAULT_SIZE_ID],
            iconId: this.#state.iconId || icon?.id || null,
            iconSrc: icon?.src || "",
            customIconSrc: this.#state.customIconSrc || "",
            iconColor: this.#state.iconColor || this.DEFAULT_COLOR,
            iconSize: this.#getEffectiveIconSize(),
            iconSizeUsesSceneDefault: this.#state.iconSizeMode !== "custom",
            mapColorId: this.#state.mapColorId || this.DEFAULT_MAP_COLOR_ID,
            mapColorLabel: this.getMapColorLabel(this.#state.mapColorId),
            mapColorValue: this.getMapColorValue(this.#state.mapColorId),
            snapToGrid: this.#state.snapToGrid !== false,
            autoSortScenes: this.#state.autoSortScenes !== false,
            randomizeAfterPlacement: !!this.#state.randomizeAfterPlacement,
            showPresetControls: !!sceneType?.showPresetControls && (sceneType?.presetOptions?.length > 0),
            sceneTypePresetOptions: sceneType?.presetOptions || [],
            showBiomeControls: !!sceneType?.showBiomeControls && (sceneType?.biomeOptions?.length > 0),
            showVisualBiomeControls: !!sceneType?.showBiomeControls && (sceneType?.biomeOptions?.some(option => !!option.iconSrc)),
            showImageControls: !!sceneType?.showImageControls,
            sceneTypeBiomeOptions: sceneType?.biomeOptions || [],
            sceneTypeAvailable: sceneType?.available !== false,
            sceneTypeRequiresLabel: sceneType?.requiresLabel || "",
            sceneTypeRequiresVersion: sceneType?.minimumModuleVersion || "",
            sceneTypeRequiresText: SitePanel.#getSceneTypeRequirementText(sceneType),
            sceneTypeRequiresUrl: sceneType?.requiresUrl || ""
        };
    }

    static clearLinkedSceneSelection() {
        this.#setLinkedScene(null);
        this.#savePersistentState();
        this.#instance?.render();
    }
    static async getIconCatalog(genreId = this.#state.genreId) {
        if (this.#iconCatalogs.has(genreId)) return this.#iconCatalogs.get(genreId);
        const genre = getSiteGenre(genreId);

        try {
            const response = await fetch(genre.iconCatalogPath);
            if (!response.ok) throw new Error(`Failed to load icon catalog (${response.status}).`);
            const catalog = await response.json();
            this.#iconCatalogs.set(genreId, catalog);
            return catalog;
        } catch (err) {
            Log.error("Failed to load site icon catalog.", err);
            const fallback = { icons: [] };
            this.#iconCatalogs.set(genreId, fallback);
            return fallback;
        }
    }

    static async getThemeCatalog(genreId = this.#state.genreId) {
        if (this.#themeCatalogs.has(genreId)) return this.#themeCatalogs.get(genreId);
        const genre = getSiteGenre(genreId);

        try {
            const response = await fetch(genre.themeCatalogPath);
            if (!response.ok) throw new Error(`Failed to load site theme catalog (${response.status}).`);
            const catalog = await response.json();
            this.#themeCatalogs.set(genreId, catalog);
            this.#normalizeState();
            return catalog;
        } catch (err) {
            Log.error("Failed to load site theme catalog.", err);
            const fallback = { themes: [] };
            this.#themeCatalogs.set(genreId, fallback);
            return fallback;
        }
    }

    static async getAllBuiltInIcons() {
        const genres = getSiteGenres();
        const catalogs = await Promise.all(genres.map(genre => this.getIconCatalog(genre.id)));
        return catalogs.flatMap((catalog, index) => {
            const genre = genres[index];
            return (catalog?.icons || []).map(icon => ({
                ...icon,
                genreId: genre.id,
                genreLabel: genre.label
            }));
        });
    }

    static getSelectedTheme() {
        const themes = this.#getSortedThemes();
        return themes.find(theme => theme.id === this.#state.themeId) || themes[0] || null;
    }

    static getSelectedIcon() {
        const icons = this.#iconCatalogs.get(this.#state.genreId)?.icons || [];
        return this.#resolveIconSelection(icons);
    }

    static async randomizeNextSite() {
        const sceneType = this.#getCurrentSceneType();
        if (sceneType?.randomizeBiomeOnNextSite) {
            this.#randomizeSceneTypeBiomeSelection({ preserveGeneratedName: true });
        }

        if (typeof sceneType?.suggestName === "function" && !sceneType?.showThemeControls) {
            const nextName = this.#getSuggestedSiteName();
            const currentName = (this.#state.siteName || "").trim();
            const previousGeneratedName = this.#generatedName;
            if (!currentName || currentName === previousGeneratedName || !this.#nameDirty) {
                this.#state.siteName = nextName;
                this.#nameDirty = false;
            }
            this.#generatedName = nextName;
            this.#savePersistentState();
            this.#instance?.render();
            return;
        }

        await this.getThemeCatalog();
        const themes = this.#getSortedThemes();
        if (!themes.length) return;

        const nextTheme = themes[Math.floor(Math.random() * themes.length)];
        this.#applyThemeSelection(nextTheme.id);
        this.#savePersistentState();
        this.#instance?.render();
    }

    static getSizeLabel(sizeId) {
        return this.SIZE_OPTIONS.find(size => size.id === sizeId)?.label || "Small";
    }

    static getIconRoleLabel(iconRole) {
        return this.ICON_ROLE_OPTIONS.find(option => option.id === iconRole)?.label || "Landmark";
    }

    static getMapColorLabel(mapColorId) {
        return this.MAP_COLOR_OPTIONS.find(option => option.id === mapColorId)?.label || "Green";
    }

    static getMapColorValue(mapColorId) {
        return this.MAP_COLOR_OPTIONS.find(option => option.id === mapColorId)?.value || "#7de37d";
    }

    static #getDefaultPersistentState() {
        return {
            genreId: this.DEFAULT_GENRE_ID,
            themeId: this.DEFAULT_THEME_ID,
            sceneType: "empty",
            sceneTypePresetId: null,
            sceneTypeBiomeId: null,
            sceneImageSrc: "",
            sceneImageName: "",
            sizeId: this.DEFAULT_SIZE_ID,
            iconRole: "landmark",
            iconId: null,
            customIconSrc: "",
            iconColor: this.DEFAULT_COLOR,
            iconSizeMode: "scene-default",
            customIconSize: null,
            mapColorId: this.DEFAULT_MAP_COLOR_ID,
            snapToGrid: false,
            autoSortScenes: true,
            randomizeAfterPlacement: false
        };
    }

    static #getPersistentStateSnapshot() {
        return {
            genreId: this.#state.genreId,
            themeId: this.#state.themeId,
            sceneType: this.#state.sceneType || "empty",
            sceneTypePresetId: this.#state.sceneTypePresetId || null,
            sceneTypeBiomeId: this.#state.sceneTypeBiomeId || null,
            sceneImageSrc: this.#state.sceneImageSrc || "",
            sceneImageName: this.#state.sceneImageName || "",
            sizeId: this.#state.sizeId,
            iconRole: this.#state.iconRole || "landmark",
            iconId: this.#state.iconId,
            customIconSrc: this.#state.customIconSrc || "",
            iconColor: this.#state.iconColor,
            iconSizeMode: this.#state.iconSizeMode === "custom" ? "custom" : "scene-default",
            customIconSize: this.#state.customIconSize,
            mapColorId: this.#state.mapColorId,
            snapToGrid: this.#state.snapToGrid !== false,
            autoSortScenes: this.#state.autoSortScenes !== false,
            randomizeAfterPlacement: !!this.#state.randomizeAfterPlacement
        };
    }

    static #loadPersistentState() {
        if (!game?.settings) return;
        const persisted = game.settings.get(MODULE_ID, "siteGeneratorState") || {};
        this.#state = {
            ...this.#state,
            ...this.#getDefaultPersistentState(),
            ...persisted,
            linkedSceneId: null,
            linkedSceneName: ""
        };
    }

    static #savePersistentState() {
        if (!game?.settings) return;
        void game.settings.set(MODULE_ID, "siteGeneratorState", this.#getPersistentStateSnapshot());
    }

    static #getCurrentGenre() {
        return getSiteGenre(this.#state.genreId);
    }

    static #getCurrentSceneType() {
        return getSiteSceneType(this.#state.sceneType);
    }

    static #getCurrentSceneTypePreset() {
        const sceneType = this.#getCurrentSceneType();
        const options = sceneType?.presetOptions || [];
        return options.find(option => option.id === this.#state.sceneTypePresetId) || options[0] || null;
    }

    static #getCurrentSceneTypeBiome() {
        const sceneType = this.#getCurrentSceneType();
        const options = sceneType?.biomeOptions || [];
        return options.find(option => option.id === this.#state.sceneTypeBiomeId) || options[0] || null;
    }

    static #getSceneTypeIconSelection() {
        const sceneType = this.#getCurrentSceneType();
        if (sceneType?.siteIconSource !== "sceneTypeBiome") return null;

        const option = this.#getCurrentSceneTypeBiome();
        if (!option?.iconSrc) return null;

        return {
            id: `${sceneType.id}:${option.id}`,
            label: option.label || sceneType.biomeLabel || "Scene Type Icon",
            src: option.iconSrc,
            role: this.#state.iconRole || "landmark"
        };
    }

    static #getSceneDefaultIconSize() {
        const sceneGridSize = canvas.grid?.size ?? canvas.dimensions?.size ?? 100;
        return this.#clampIconSize(sceneGridSize);
    }

    static #getEffectiveIconSize() {
        if (this.#state.iconSizeMode !== "custom") {
            return this.#getSceneDefaultIconSize();
        }
        return this.#clampIconSize(this.#state.customIconSize);
    }

    static #clampIconSize(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return 100;
        return Math.min(this.MAX_ICON_SIZE, Math.max(this.MIN_ICON_SIZE, Math.round(numeric)));
    }

    static #getSortedThemes() {
        return [...(this.#themeCatalogs.get(this.#state.genreId)?.themes || [])].sort((a, b) => (a.label || "").localeCompare(b.label || ""));
    }

    static #resolveIconSelection(icons = []) {
        const iconRole = this.#state.iconRole || "landmark";
        const sceneTypeIcon = this.#getSceneTypeIconSelection();
        if (sceneTypeIcon) return sceneTypeIcon;

        if (this.#state.customIconSrc) {
            return {
                id: this.#state.iconId || "custom",
                label: this.#state.iconId === "custom" ? "Custom Icon" : "Selected Icon",
                src: this.#state.customIconSrc,
                role: iconRole
            };
        }

        if (!icons.length) return null;

        const matchingIcons = icons.filter(icon => (icon.role || "landmark") === iconRole);
        const selectedIcon = icons.find(icon => icon.id === this.#state.iconId);
        if (selectedIcon && (selectedIcon.role || "landmark") === iconRole) {
            return selectedIcon;
        }

        const sceneTypeDefaultIconId = this.#getCurrentSceneType()?.defaultIconId || null;
        if (sceneTypeDefaultIconId) {
            const sceneTypeDefault = icons.find(icon => icon.id === sceneTypeDefaultIconId && (icon.role || "landmark") === iconRole);
            if (sceneTypeDefault) return sceneTypeDefault;
        }

        const theme = this.getSelectedTheme();
        const defaultIconByRole = theme?.defaultIconByRole || {};
        const defaultIconId = defaultIconByRole[iconRole] || theme?.iconId || null;
        if (defaultIconId) {
            const roleDefault = icons.find(icon => icon.id === defaultIconId && (icon.role || "landmark") === iconRole);
            if (roleDefault) return roleDefault;
        }

        return matchingIcons[0] || icons[0] || null;
    }

    static #pickSuggestedName(theme) {
        const names = theme?.defaultNames || [];
        if (!names.length) return this.DEFAULT_NAME;
        const index = Math.floor(Math.random() * names.length);
        return names[index];
    }

    static #getSuggestedSiteName() {
        const sceneType = this.#getCurrentSceneType();
        if (this.#state.sceneType === "existing") {
            return this.#state.linkedSceneName || "Linked Scene";
        }
        if (typeof sceneType?.suggestName === "function") {
            return sceneType.suggestName(this.getState()) || this.DEFAULT_NAME;
        }
        const sceneTypePreset = this.#getCurrentSceneTypePreset();
        if (sceneTypePreset?.suggestedName) {
            return sceneTypePreset.suggestedName;
        }
        const sceneTypeBiome = this.#getCurrentSceneTypeBiome();
        if (sceneTypeBiome?.suggestedName) {
            return sceneTypeBiome.suggestedName;
        }
        return this.#pickSuggestedName(this.getSelectedTheme()) || this.DEFAULT_NAME;
    }

    static #getThemeDefaultIconId(theme = this.getSelectedTheme(), iconRole = this.#state.iconRole) {
        const defaultIconByRole = theme?.defaultIconByRole || {};
        return defaultIconByRole[iconRole] || theme?.iconId || null;
    }

    static #getSceneTypeRequirementText(sceneType) {
        if (!sceneType?.requiresLabel) return "";
        if (sceneType.minimumModuleVersion) {
            return `${sceneType.requiresLabel} Module ${sceneType.minimumModuleVersion}+ required`;
        }
        return `${sceneType.requiresLabel} Module required`;
    }

    static #normalizeState({ preserveGeneratedName = false } = {}) {
        const genre = this.#getCurrentGenre();
        const themes = this.#getSortedThemes();
        const sceneType = this.#getCurrentSceneType();

        if (!themes.some(theme => theme.id === this.#state.themeId) && themes.length > 0) {
            this.#state.themeId = themes.find(theme => theme.id === genre.defaultThemeId)?.id || themes[0].id;
        }

        if (!this.SIZE_OPTIONS.some(size => size.id === this.#state.sizeId)) {
            this.#state.sizeId = this.DEFAULT_SIZE_ID;
        }
        if (!sceneType) {
            this.#state.sceneType = "empty";
        }
        if (!sceneType?.showImageControls) {
            this.#state.sceneImageSrc = "";
            this.#state.sceneImageName = "";
        } else if (this.#state.sceneImageSrc && !this.#state.sceneImageName) {
            this.#state.sceneImageName = NexusImageSceneManager.getImageSceneName(this.#state.sceneImageSrc);
        }
        const sceneTypePresetOptions = sceneType?.presetOptions || [];
        const hasPresetOption = sceneTypePresetOptions.some(option => option.id === this.#state.sceneTypePresetId);
        if (!sceneTypePresetOptions.length) {
            this.#state.sceneTypePresetId = null;
        } else if (!hasPresetOption) {
            this.#state.sceneTypePresetId = sceneType?.defaultPresetId || sceneTypePresetOptions[0]?.id || null;
        }
        const sceneTypeBiomeOptions = sceneType?.biomeOptions || [];
        const hasBiomeOption = sceneTypeBiomeOptions.some(option => option.id === this.#state.sceneTypeBiomeId);
        if (!sceneTypeBiomeOptions.length) {
            this.#state.sceneTypeBiomeId = null;
        } else if (!hasBiomeOption) {
            this.#state.sceneTypeBiomeId = sceneType?.defaultBiomeId || sceneTypeBiomeOptions[0]?.id || null;
        }
        if (!this.#state.linkedSceneId || !game.scenes.get(this.#state.linkedSceneId)) {
            this.#state.linkedSceneId = null;
            this.#state.linkedSceneName = "";
        } else {
            this.#state.linkedSceneName = game.scenes.get(this.#state.linkedSceneId)?.name || this.#state.linkedSceneName || "";
        }
        if (!this.ICON_ROLE_OPTIONS.some(option => option.id === this.#state.iconRole)) {
            this.#state.iconRole = "landmark";
        }
        if (!this.MAP_COLOR_OPTIONS.some(option => option.id === this.#state.mapColorId)) {
            this.#state.mapColorId = this.getSelectedTheme()?.mapColorId || genre.defaultMapColorId || this.DEFAULT_MAP_COLOR_ID;
        }
        if (!this.COLOR_OPTIONS.some(color => color.value === this.#state.iconColor)) {
            this.#state.iconColor = this.DEFAULT_COLOR;
        }
        this.#state.autoSortScenes = this.#state.autoSortScenes !== false;
        if (this.#state.iconId === "custom") {
            this.#state.customIconSrc = this.#state.customIconSrc || "";
            if (!this.#state.customIconSrc) this.#state.iconId = null;
        } else {
            this.#state.customIconSrc = "";
        }
        if (this.#state.iconSizeMode === "custom") {
            this.#state.customIconSize = this.#clampIconSize(this.#state.customIconSize);
        } else {
            this.#state.iconSizeMode = "scene-default";
            this.#state.customIconSize = null;
        }

        const selectedIcon = this.getSelectedIcon();
        if (selectedIcon?.id) {
            this.#state.iconId = selectedIcon.id;
        }

        if (!preserveGeneratedName) {
            const nextName = this.#getSuggestedSiteName();
            const currentName = (this.#state.siteName || "").trim();
            if (!currentName || currentName === this.#generatedName) {
                this.#state.siteName = nextName;
                this.#nameDirty = false;
            }
            this.#generatedName = nextName;
        }
    }

    static #applyThemeSelection(themeId) {
        this.#state.themeId = themeId;
        const nextTheme = this.getSelectedTheme();
        this.#state.mapColorId = nextTheme?.mapColorId || this.DEFAULT_MAP_COLOR_ID;
        this.#state.iconId = this.#getThemeDefaultIconId(nextTheme, this.#state.iconRole);
        this.#state.customIconSrc = "";
        this.#normalizeState();

        const nextName = this.#state.sceneType === "existing"
            ? (this.#state.linkedSceneName || "Linked Scene")
            : (this.#pickSuggestedName(nextTheme) || this.DEFAULT_NAME);
        const currentName = (this.#state.siteName || "").trim();

        if (!this.#nameDirty || !currentName || currentName === this.#generatedName) {
            this.#state.siteName = nextName;
            this.#nameDirty = false;
        }

        this.#generatedName = nextName;
    }

    static #applyGenreSelection(genreId) {
        const genre = getSiteGenre(genreId);
        this.#state.genreId = genre.id;
        this.#state.themeId = genre.defaultThemeId || this.DEFAULT_THEME_ID;
        this.#state.iconId = null;
        this.#state.customIconSrc = "";
        this.#state.mapColorId = genre.defaultMapColorId || this.DEFAULT_MAP_COLOR_ID;
        this.#normalizeState();
    }

    static #applyIconRoleSelection(iconRole) {
        this.#state.iconRole = iconRole || "landmark";
        this.#state.iconId = this.#getThemeDefaultIconId(this.getSelectedTheme(), this.#state.iconRole);
        this.#state.customIconSrc = "";
        this.#normalizeState({ preserveGeneratedName: true });
    }

    static #applySceneTypeSelection(sceneTypeId) {
        this.#state.sceneType = sceneTypeId || "empty";
        const sceneType = this.#getCurrentSceneType();
        if (this.#state.sceneType !== "existing") {
            this.#state.linkedSceneId = null;
            this.#state.linkedSceneName = "";
        }
        if (!sceneType?.showImageControls) {
            this.#state.sceneImageSrc = "";
            this.#state.sceneImageName = "";
        }
        if (sceneType?.defaultIconId) {
            this.#state.iconId = sceneType.defaultIconId;
            this.#state.customIconSrc = "";
            this.#state.iconRole = "landmark";
        }
        this.#normalizeState();
    }

    static #applySceneTypePresetSelection(presetId) {
        this.#state.sceneTypePresetId = presetId || null;
        this.#normalizeState();
    }

    static #applySceneTypeBiomeSelection(biomeId) {
        this.#state.sceneTypeBiomeId = biomeId || null;
        this.#normalizeState();
    }

    static #randomizeSceneTypeBiomeSelection({ preserveGeneratedName = false } = {}) {
        const options = this.#getCurrentSceneType()?.biomeOptions || [];
        if (!options.length) return null;

        const eligibleOptions = options.length > 1
            ? options.filter(option => option.id !== this.#state.sceneTypeBiomeId)
            : options;
        const nextOption = eligibleOptions[Math.floor(Math.random() * eligibleOptions.length)];
        this.#state.sceneTypeBiomeId = nextOption?.id || null;
        this.#normalizeState({ preserveGeneratedName });
        return nextOption || null;
    }

    static #setLinkedScene(sceneId) {
        const scene = sceneId ? game.scenes.get(sceneId) : null;
        const currentName = (this.#state.siteName || "").trim();
        const nextName = scene?.name || "Linked Scene";
        this.#state.linkedSceneId = scene?.id || null;
        this.#state.linkedSceneName = scene?.name || "";

        if (this.#state.sceneType === "existing" && (!currentName || currentName === this.#generatedName || !this.#nameDirty)) {
            this.#state.siteName = nextName;
            this.#generatedName = nextName;
            this.#nameDirty = false;
        }
    }

    static #setSceneImage(imageSrc) {
        const currentName = (this.#state.siteName || "").trim();
        const nextName = imageSrc ? NexusImageSceneManager.getImageSceneName(imageSrc) : "";
        this.#state.sceneImageSrc = imageSrc || "";
        this.#state.sceneImageName = nextName;

        if (this.#getCurrentSceneType()?.showImageControls && (!currentName || currentName === this.#generatedName || !this.#nameDirty)) {
            this.#state.siteName = nextName || this.#getSuggestedSiteName();
            this.#generatedName = this.#state.siteName;
            this.#nameDirty = false;
        }
    }

    static get showThemeControls() {
        return !!this.#getCurrentSceneType()?.showThemeControls;
    }

    static get showMapColorControls() {
        return !!this.#getCurrentSceneType()?.showMapColorControls && !!this.#getCurrentGenre().supportsMapColorOverrides;
    }

    static get showSizeControls() {
        return !!this.#getCurrentSceneType()?.showSizeControls;
    }

    static get showLinkedSceneControls() {
        return !!this.#getCurrentSceneType()?.showLinkedSceneControls;
    }

    static get showImageControls() {
        return !!this.#getCurrentSceneType()?.showImageControls;
    }

    static get showIconRoleControls() {
        return this.#getCurrentSceneType()?.siteIconSource !== "sceneTypeBiome";
    }

    static get canRerollSiteName() {
        return this.showThemeControls || typeof this.#getCurrentSceneType()?.suggestName === "function";
    }

    static get showRandomizeToggle() {
        const sceneType = this.#getCurrentSceneType();
        return !!sceneType?.showRandomizeToggle || typeof sceneType?.suggestName === "function";
    }

    async _prepareContext() {
        await Promise.all([SitePanel.getIconCatalog(), SitePanel.getThemeCatalog()]);
        const selectedIcon = SitePanel.getSelectedIcon();

        return {
            hasSupportedScene: !isNexusSiteToolSuppressedScene(canvas.scene),
            siteName: SitePanel.#state.siteName,
            genres: getSiteGenres(),
            selectedGenreId: SitePanel.#state.genreId,
            selectedThemeId: SitePanel.#state.themeId,
            sceneTypes: getSiteSceneTypes(),
            selectedSceneType: SitePanel.#state.sceneType,
            showThemeControls: SitePanel.showThemeControls,
            showMapColor: SitePanel.showMapColorControls,
            showSizeControls: SitePanel.showSizeControls,
            showLinkedSceneControls: SitePanel.showLinkedSceneControls,
            showPresetControls: !!SitePanel.#getCurrentSceneType()?.showPresetControls && (SitePanel.#getCurrentSceneType()?.presetOptions?.length > 0),
            showBiomeControls: !!SitePanel.#getCurrentSceneType()?.showBiomeControls && (SitePanel.#getCurrentSceneType()?.biomeOptions?.length > 0),
            canRandomizeSceneTypeBiome: !!SitePanel.#getCurrentSceneType()?.randomizeBiomeOnNextSite && (SitePanel.#getCurrentSceneType()?.biomeOptions?.length > 1),
            showImageControls: SitePanel.showImageControls,
            sceneImageSrc: SitePanel.#state.sceneImageSrc || "",
            sceneImageName: SitePanel.#state.sceneImageName || "No Image Selected",
            selectedSceneTypeAvailable: SitePanel.#getCurrentSceneType()?.available !== false,
            selectedSceneTypeRequiresLabel: SitePanel.#getCurrentSceneType()?.requiresLabel || "",
            selectedSceneTypeRequiresVersion: SitePanel.#getCurrentSceneType()?.minimumModuleVersion || "",
            selectedSceneTypeRequiresText: SitePanel.#getSceneTypeRequirementText(SitePanel.#getCurrentSceneType()),
            selectedSceneTypeRequiresUrl: SitePanel.#getCurrentSceneType()?.requiresUrl || "",
            sceneTypeNameLabel: SitePanel.#getCurrentSceneType()?.siteNameLabel || "Site Name",
            sceneTypeNamePlaceholder: SitePanel.#getCurrentSceneType()?.siteNamePlaceholder || "Site",
            selectedSceneTypePresetId: SitePanel.#state.sceneTypePresetId || SitePanel.#getCurrentSceneType()?.defaultPresetId || "",
            sceneTypePresetOptions: SitePanel.#getCurrentSceneType()?.presetOptions || [],
            sceneTypePresetLabel: SitePanel.#getCurrentSceneType()?.presetLabel || "Preset",
            selectedSceneTypeBiomeId: SitePanel.#state.sceneTypeBiomeId || SitePanel.#getCurrentSceneType()?.defaultBiomeId || "",
            sceneTypeBiomeOptions: SitePanel.#getCurrentSceneType()?.biomeOptions || [],
            sceneTypeBiomeLabel: SitePanel.#getCurrentSceneType()?.biomeLabel || "Biome",
            selectedSceneTypeBiome: SitePanel.#getCurrentSceneTypeBiome(),
            linkedSceneId: SitePanel.#state.linkedSceneId || "",
            linkedSceneName: SitePanel.#state.linkedSceneName || "No scene selected",
            selectedSizeId: SitePanel.#state.sizeId,
            showIconRoleControls: SitePanel.showIconRoleControls,
            iconRoles: SitePanel.ICON_ROLE_OPTIONS,
            selectedIconRole: SitePanel.#state.iconRole,
            selectedIconLabel: selectedIcon?.label || "Select Icon",
            selectedIconSrc: selectedIcon?.src || "",
            selectedIconColor: SitePanel.#state.iconColor || SitePanel.DEFAULT_COLOR,
            selectedIconSize: SitePanel.#getEffectiveIconSize(),
            iconSizeUsesSceneDefault: SitePanel.#state.iconSizeMode !== "custom",
            selectedMapColorId: SitePanel.#state.mapColorId || SitePanel.DEFAULT_MAP_COLOR_ID,
            selectedMapColorLabel: SitePanel.getMapColorLabel(SitePanel.#state.mapColorId),
            selectedMapColorValue: SitePanel.getMapColorValue(SitePanel.#state.mapColorId),
            snapToGrid: SitePanel.#state.snapToGrid !== false,
            randomizeAfterPlacement: !!SitePanel.#state.randomizeAfterPlacement,
            autoSortScenes: SitePanel.#state.autoSortScenes !== false,
            showAutoSortMoveWarning: SitePanel.#getCurrentSceneType()?.id === "existing" && SitePanel.#state.autoSortScenes !== false,
            showRandomizeToggle: SitePanel.showRandomizeToggle,
            canRerollSiteName: SitePanel.canRerollSiteName,
            selectedRoomCount: SitePanel.ROOM_COUNT_BY_SIZE[SitePanel.#state.sizeId] || SitePanel.ROOM_COUNT_BY_SIZE[SitePanel.DEFAULT_SIZE_ID],
            colors: SitePanel.COLOR_OPTIONS,
            mapColors: SitePanel.MAP_COLOR_OPTIONS,
            themes: SitePanel.#getSortedThemes(),
            sizes: SitePanel.SIZE_OPTIONS
        };
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        const el = htmlElement instanceof HTMLElement ? htmlElement : htmlElement[0];
        if (!el) return;

        const nameInput = el.querySelector("input[name='siteName']");
        const themeSelect = el.querySelector("select[name='themeId']");
        const mapColorSelect = el.querySelector("select[name='mapColorId']");
        const sizeSelect = el.querySelector("select[name='sizeId']");
        const presetSelect = el.querySelector("select[name='sceneTypePresetId']");
        const biomeSelect = el.querySelector("select[name='sceneTypeBiomeId']");
        const iconSizeInput = el.querySelector("input[name='iconSize']");
        const iconSizeValue = el.querySelector("[data-site-icon-size-value]");
        const resetIconSizeButton = el.querySelector("[data-action='resetIconSize']");
        const snapToGridCheckbox = el.querySelector("input[name='snapToGrid']");
        const randomizeCheckbox = el.querySelector("input[name='randomizeAfterPlacement']");
        const autoSortScenesCheckbox = el.querySelector("input[name='autoSortScenes']");
        const roomCountLabel = el.querySelector("[data-site-room-count]");

        if (nameInput) {
            nameInput.addEventListener("input", event => {
                SitePanel.#state.siteName = event.currentTarget.value || "";
                const trimmedName = SitePanel.#state.siteName.trim();
                SitePanel.#nameDirty = !!trimmedName && trimmedName !== SitePanel.#generatedName;
            });
        }

        el.querySelectorAll("[data-site-genre-id]").forEach(button => {
            button.addEventListener("click", async event => {
                const nextGenreId = event.currentTarget.dataset.siteGenreId;
                await Promise.all([
                    SitePanel.getIconCatalog(nextGenreId),
                    SitePanel.getThemeCatalog(nextGenreId)
                ]);
                SitePanel.#applyGenreSelection(nextGenreId);
                SitePanel.#savePersistentState();
                if (nameInput) nameInput.value = SitePanel.#state.siteName;
                this.render();
            });
        });

        if (themeSelect) {
            themeSelect.addEventListener("change", event => {
                SitePanel.#applyThemeSelection(event.currentTarget.value);
                SitePanel.#savePersistentState();
                if (nameInput) nameInput.value = SitePanel.#state.siteName;
                this.render();
            });
        }

        el.querySelectorAll("[data-site-scene-type]").forEach(button => {
            button.addEventListener("click", event => {
                SitePanel.#applySceneTypeSelection(event.currentTarget.dataset.siteSceneType);
                SitePanel.#savePersistentState();
                this.render();
            });
        });

        if (presetSelect) {
            presetSelect.addEventListener("change", event => {
                SitePanel.#applySceneTypePresetSelection(event.currentTarget.value);
                SitePanel.#savePersistentState();
                if (nameInput) nameInput.value = SitePanel.#state.siteName;
                this.render();
            });
        }

        if (biomeSelect) {
            biomeSelect.addEventListener("change", event => {
                SitePanel.#applySceneTypeBiomeSelection(event.currentTarget.value);
                SitePanel.#savePersistentState();
                if (nameInput) nameInput.value = SitePanel.#state.siteName;
                this.render();
            });
        }

        const visualBiomeSelector = el.querySelector(".site-visual-select.biome-selector");
        if (visualBiomeSelector) {
            const visualBiomeRow = visualBiomeSelector.closest(".site-visual-select-row") || visualBiomeSelector;
            const trigger = visualBiomeSelector.querySelector("[data-action='toggleSceneTypeBiomeList']");
            const randomizeButton = visualBiomeRow.querySelector("[data-action='randomizeSceneTypeBiome']");
            const list = visualBiomeSelector.querySelector("[data-role='sceneTypeBiomeList']");
            const options = visualBiomeSelector.querySelectorAll("[data-action='selectSceneTypeBiome']");

            if (trigger && list) {
                trigger.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    list.classList.toggle("hidden");
                });

                const closeHandler = event => {
                    if (!visualBiomeSelector.contains(event.target)) {
                        list.classList.add("hidden");
                    }
                };

                setTimeout(() => document.addEventListener("click", closeHandler, { once: true }), 0);
            }

            options.forEach(option => {
                option.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    SitePanel.#applySceneTypeBiomeSelection(option.dataset.value);
                    SitePanel.#savePersistentState();
                    if (nameInput) nameInput.value = SitePanel.#state.siteName;
                    this.render();
                });
            });

            if (randomizeButton) {
                randomizeButton.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    SitePanel.#randomizeSceneTypeBiomeSelection({ preserveGeneratedName: true });
                    SitePanel.#savePersistentState();
                    if (nameInput) nameInput.value = SitePanel.#state.siteName;
                    this.render();
                });
            }
        }

        el.querySelectorAll("[data-site-icon-role]").forEach(button => {
            button.addEventListener("click", event => {
                SitePanel.#applyIconRoleSelection(event.currentTarget.dataset.siteIconRole);
                SitePanel.#savePersistentState();
                this.render();
            });
        });

        const rerollThemeButton = el.querySelector("[data-action='rerollTheme']");
        if (rerollThemeButton) {
            rerollThemeButton.addEventListener("click", event => {
                event.preventDefault();
                const themes = SitePanel.#getSortedThemes();
                if (!themes.length) return;
                const nextTheme = themes[Math.floor(Math.random() * themes.length)];
                SitePanel.#applyThemeSelection(nextTheme.id);
                SitePanel.#savePersistentState();
                if (nameInput) nameInput.value = SitePanel.#state.siteName;
                this.render();
            });
        }

        if (sizeSelect) {
            sizeSelect.addEventListener("change", event => {
                SitePanel.#state.sizeId = event.currentTarget.value;
                SitePanel.#savePersistentState();
                if (roomCountLabel) {
                    roomCountLabel.textContent = String(
                        SitePanel.ROOM_COUNT_BY_SIZE[SitePanel.#state.sizeId] || SitePanel.ROOM_COUNT_BY_SIZE[SitePanel.DEFAULT_SIZE_ID]
                    );
                }
            });
        }

        if (mapColorSelect) {
            mapColorSelect.addEventListener("change", event => {
                SitePanel.#state.mapColorId = event.currentTarget.value;
                SitePanel.#savePersistentState();
                this.render();
            });
        }

        if (iconSizeInput) {
            iconSizeInput.addEventListener("input", event => {
                SitePanel.#state.iconSizeMode = "custom";
                SitePanel.#state.customIconSize = SitePanel.#clampIconSize(event.currentTarget.value);
                SitePanel.#savePersistentState();
                if (resetIconSizeButton) resetIconSizeButton.disabled = false;
                if (iconSizeValue) iconSizeValue.textContent = String(SitePanel.#getEffectiveIconSize());
            });
        }

        if (resetIconSizeButton) {
            resetIconSizeButton.addEventListener("click", event => {
                event.preventDefault();
                SitePanel.#state.iconSizeMode = "scene-default";
                SitePanel.#state.customIconSize = null;
                SitePanel.#savePersistentState();
                const nextSize = SitePanel.#getEffectiveIconSize();
                if (iconSizeInput) iconSizeInput.value = String(nextSize);
                if (iconSizeValue) iconSizeValue.textContent = String(nextSize);
                resetIconSizeButton.disabled = true;
                this.render();
            });
        }

        if (snapToGridCheckbox) {
            snapToGridCheckbox.addEventListener("change", event => {
                SitePanel.#state.snapToGrid = !!event.currentTarget.checked;
                SitePanel.#savePersistentState();
            });
        }

        if (randomizeCheckbox) {
            randomizeCheckbox.addEventListener("change", event => {
                SitePanel.#state.randomizeAfterPlacement = !!event.currentTarget.checked;
                SitePanel.#savePersistentState();
            });
        }

        if (autoSortScenesCheckbox) {
            autoSortScenesCheckbox.addEventListener("change", event => {
                SitePanel.#state.autoSortScenes = !!event.currentTarget.checked;
                SitePanel.#savePersistentState();
                this.render();
            });
        }

        const clearButton = el.querySelector("[data-action='clearSiteName']");
        if (clearButton) {
            clearButton.addEventListener("click", event => {
                event.preventDefault();
                SitePanel.#state.siteName = SitePanel.#generatedName || SitePanel.DEFAULT_NAME;
                SitePanel.#nameDirty = false;
                if (nameInput) nameInput.value = SitePanel.#state.siteName;
            });
        }

        const rerollButton = el.querySelector("[data-action='rerollSiteName']");
        if (rerollButton) {
            rerollButton.addEventListener("click", event => {
                event.preventDefault();
                const nextName = SitePanel.#getSuggestedSiteName();
                SitePanel.#generatedName = nextName;
                SitePanel.#state.siteName = nextName;
                SitePanel.#nameDirty = false;
                if (nameInput) nameInput.value = nextName;
            });
        }

        const iconPickerButton = el.querySelector("[data-action='pickSiteIcon']");
        if (iconPickerButton) {
            iconPickerButton.addEventListener("click", async event => {
                event.preventDefault();
                const icons = SitePanel.#iconCatalogs.get(SitePanel.#state.genreId)?.icons || [];
                const allBuiltInIcons = await SitePanel.getAllBuiltInIcons();
                new SiteIconPicker(icons, SitePanel.#state.iconId, SitePanel.#state.iconRole, selection => {
                    if (typeof selection === "object" && selection?.id === "custom") {
                        SitePanel.#state.iconId = "custom";
                        SitePanel.#state.customIconSrc = selection.src || "";
                    } else {
                        const nextIcon = allBuiltInIcons.find(icon => icon.id === selection && (icon.role || "landmark") === SitePanel.#state.iconRole) || null;
                        SitePanel.#state.iconId = selection || null;
                        SitePanel.#state.customIconSrc = nextIcon?.genreId && nextIcon.genreId !== SitePanel.#state.genreId
                            ? (nextIcon.src || "")
                            : "";
                    }
                    SitePanel.#savePersistentState();
                    this.render();
                }, {
                    currentCustomIconSrc: SitePanel.#state.customIconSrc || "",
                    allBuiltInIcons,
                    themeIconsOnlyLabel: "Show Theme Icons Only"
                }).render(true);
            });
        }

        const scenePickerButtons = [...el.querySelectorAll("[data-action='pickLinkedScene']")];
        for (const scenePickerButton of scenePickerButtons) {
            scenePickerButton.addEventListener("click", event => {
                event.preventDefault();
                new SiteScenePicker(SitePanel.#state.linkedSceneId, sceneId => {
                    SitePanel.#setLinkedScene(sceneId);
                    SitePanel.#savePersistentState();
                    this.render();
                }).render(true);
            });
        }

        const imagePickerButtons = [...el.querySelectorAll("[data-action='pickSceneImage']")];
        for (const imagePickerButton of imagePickerButtons) {
            imagePickerButton.addEventListener("click", event => {
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                new FilePicker({
                    type: "image",
                    current: SitePanel.#state.sceneImageSrc || "",
                    callback: path => {
                        SitePanel.#setSceneImage(path);
                        SitePanel.#savePersistentState();
                        this.render();
                    },
                    top: rect.top,
                    left: rect.left
                }).render({ force: true });
            });
        }

        const clearLinkedSceneButton = el.querySelector("[data-action='clearLinkedScene']");
        if (clearLinkedSceneButton) {
            clearLinkedSceneButton.addEventListener("click", event => {
                event.preventDefault();
                SitePanel.#setLinkedScene(null);
                SitePanel.#savePersistentState();
                this.render();
            });
        }

        const viewRequiredModuleButton = el.querySelector("[data-action='viewRequiredModule']");
        if (viewRequiredModuleButton) {
            viewRequiredModuleButton.addEventListener("click", event => {
                event.preventDefault();
                const url = SitePanel.#getCurrentSceneType()?.requiresUrl;
                if (url) window.open(url, "_blank", "noopener,noreferrer");
            });
        }

        const openSiteEditorButton = el.querySelector("[data-action='openSiteEditor']");
        if (openSiteEditorButton) {
            openSiteEditorButton.addEventListener("click", event => {
                event.preventDefault();
                Hooks.callAll("augurNexusOpenSiteEditorTool");
            });
        }

        el.querySelectorAll("[data-site-color]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                SitePanel.#state.iconColor = event.currentTarget.dataset.siteColor || SitePanel.DEFAULT_COLOR;
                SitePanel.#savePersistentState();
                this.render();
            });
        });
    }

    async close(options) {
        SitePanel.#instance = null;
        return super.close(options);
    }
}

Hooks.on("augurNexusSiteSceneTypesChanged", () => {
    SitePanel.refreshIfOpen();
});




