export class NexusSceneTransitionEffects {
    static #fadeOverlay = null;

    static async transitionToScene(targetScene, {
        fromScene = canvas.scene,
        focusPlaceable = null,
        transitionStyle = "zoom-fade"
    } = {}) {
        if (!targetScene) throw new Error("No target scene provided for transition.");

        Hooks.callAll("augur-nexus.preSceneNavigation", {
            fromScene,
            targetScene,
            navigation: {
                transitionStyle,
                direction: "forward"
            }
        });

        if (transitionStyle !== "none" && focusPlaceable && fromScene && canvas.scene?.id === fromScene.id) {
            await this.#animateBodyZoom(focusPlaceable);
        }

        if (transitionStyle !== "none") await this.#fadeToBlack();

        const ready = canvas.scene?.id === targetScene.id
            ? Promise.resolve(targetScene)
            : this.#waitForCanvasReady(targetScene.id);
        const targetView = this.#getSceneFitView(targetScene);
        targetScene._viewPosition = { ...targetView };
        await targetScene.activate();
        await ready;
        this.#setSceneFitView(targetScene);

        if (transitionStyle !== "none") await this.#fadeFromBlack();
        return targetScene;
    }

    static async returnToParent(scene, navigation) {
        const targetScene = navigation?.parentSceneId ? game.scenes.get(navigation.parentSceneId) || null : null;
        if (!targetScene) return false;

        Hooks.callAll("augur-nexus.preSceneNavigation", {
            fromScene: scene || canvas.scene,
            targetScene,
            navigation
        });

        await this.#fadeToBlack();

        const ready = this.#waitForCanvasReady(targetScene.id);
        await targetScene.activate();
        await ready;

        if (navigation.transitionStyle === "focus-note" || navigation.transitionStyle === "focus-placeable") {
            const focusPlaceable = this.#findFocusPlaceable(navigation.transitionContext);
            if (focusPlaceable) await this.#setViewToPlaceable(focusPlaceable);
        }

        await Promise.all([
            this.#animateSceneFitView(targetScene),
            this.#fadeFromBlack(320)
        ]);

        return true;
    }

    static async #animateSceneFitView(scene) {
        const targetView = this.#getSceneFitView(scene);
        await this.#animateViewTransition({
            ...targetView,
            duration: 800
        });
        scene._viewPosition = { ...targetView };
    }

    static async #setViewToPlaceable(placeable) {
        const { x, y, width, height } = this.#getPlaceableViewBox(placeable);
        const centerX = x + (width / 2);
        const centerY = y + (height / 2);
        const targetScale = this.#getTargetScale(width, height);

        canvas.pan({
            x: centerX,
            y: centerY,
            scale: targetScale
        });
        await new Promise(resolve => requestAnimationFrame(() => resolve()));
    }

    static async #animateBodyZoom(placeable) {
        const { x, y, width, height } = this.#getPlaceableViewBox(placeable);
        const centerX = x + (width / 2);
        const centerY = y + (height / 2);
        const targetScale = this.#getTargetScale(width, height);

        await this.#animateViewTransition({
            x: centerX,
            y: centerY,
            scale: targetScale,
            duration: 800
        });
        await new Promise(resolve => setTimeout(resolve, 120));
    }

    static #findFocusNote(context = {}) {
        if (!canvas.notes) return null;
        if (context.noteId) {
            const direct = canvas.notes.placeables.find(note => note.document.id === context.noteId);
            if (direct) return direct;
        }

        const moduleId = context.moduleId;
        const flagKey = context.flagKey;
        const flagValue = context.flagValue;
        if (!moduleId || !flagKey || !flagValue) return null;

        return canvas.notes.placeables.find(note => note.document.flags?.[moduleId]?.[flagKey] === flagValue) || null;
    }

    static #findFocusPlaceable(context = {}) {
        const note = this.#findFocusNote(context);
        if (note) return note;

        const placeableType = context.placeableType || context.documentName || "";
        const directId = context.placeableId || context.tileId || context.drawingId || null;
        if (directId) {
            const direct = this.#getPlaceableCollections(placeableType)
                .flatMap(collection => collection.placeables || [])
                .find(placeable => placeable.document.id === directId);
            if (direct) return direct;
        }

        const moduleId = context.moduleId;
        const flagKey = context.flagKey;
        const flagValue = context.flagValue;
        if (!moduleId || !flagKey || !flagValue) return null;

        return this.#getPlaceableCollections(placeableType)
            .flatMap(collection => collection.placeables || [])
            .find(placeable => placeable.document.flags?.[moduleId]?.[flagKey] === flagValue) || null;
    }

    static #getPlaceableCollections(placeableType = "") {
        const normalized = String(placeableType || "").toLowerCase();
        if (normalized === "tile" || normalized === "tiles") return [canvas.tiles].filter(Boolean);
        if (normalized === "drawing" || normalized === "drawings") return [canvas.drawings].filter(Boolean);
        if (normalized === "note" || normalized === "notes") return [canvas.notes].filter(Boolean);
        return [canvas.notes, canvas.tiles, canvas.drawings].filter(Boolean);
    }

    static #getPlaceableViewBox(placeable) {
        const doc = placeable?.document || placeable;
        if (!doc) throw new Error("Could not resolve placeable geometry for transition.");

        if (doc.documentName === "Note") {
            const size = doc.iconSize || 80;
            return {
                x: doc.x - (size / 2),
                y: doc.y - (size / 2),
                width: size,
                height: size
            };
        }

        if (doc.documentName === "Tile" && placeable?.mesh) {
            const width = Number(placeable.mesh.width) || doc.width;
            const height = Number(placeable.mesh.height) || doc.height;
            const anchorX = doc.texture?.anchorX ?? 0;
            const anchorY = doc.texture?.anchorY ?? 0;
            return {
                x: placeable.mesh.position.x - (width * anchorX),
                y: placeable.mesh.position.y - (height * anchorY),
                width,
                height
            };
        }

        return {
            x: doc.x,
            y: doc.y,
            width: doc.width,
            height: doc.height
        };
    }

    static #getTargetScale(width, height) {
        const bodySize = Math.max(width, height, 1);
        const viewportWidth = window.innerWidth || 1920;
        const viewportHeight = window.innerHeight || 1080;
        const fitWidth = viewportWidth / (bodySize * 1.75);
        const fitHeight = viewportHeight / (bodySize * 1.75);
        const desired = Math.min(fitWidth, fitHeight, 3);
        return this.#clamp(desired, canvas.stage.scale.x, 3);
    }

    static #setSceneFitView(scene) {
        const targetView = this.#getSceneFitView(scene, canvas.dimensions);
        canvas.pan(targetView);
        scene._viewPosition = { ...targetView };
        return targetView;
    }

    static #getSceneFitView(scene, dimensions = null) {
        const resolvedDimensions = dimensions || scene?.dimensions || scene?.getDimensions?.();
        const rect = resolvedDimensions?.sceneRect || resolvedDimensions?.rect || {
            x: 0,
            y: 0,
            width: scene?.width || canvas.dimensions?.width || 1000,
            height: scene?.height || canvas.dimensions?.height || 1000
        };
        const viewportWidth = canvas.app?.renderer?.screen?.width || window.innerWidth || rect.width || 1920;
        const viewportHeight = canvas.app?.renderer?.screen?.height || window.innerHeight || rect.height || 1080;
        const desiredScale = Math.min(
            viewportWidth / Math.max(1, rect.width),
            viewportHeight / Math.max(1, rect.height)
        ) * 0.92;
        const scaleLimits = resolvedDimensions?.scale || canvas.dimensions?.scale || {};
        const minScale = Number.isFinite(scaleLimits.min) ? scaleLimits.min : 0.08;
        const maxScale = Number.isFinite(scaleLimits.max) ? scaleLimits.max : 3;

        return {
            x: (rect.x || 0) + (rect.width / 2),
            y: (rect.y || 0) + (rect.height / 2),
            scale: this.#clamp(desiredScale, minScale, maxScale)
        };
    }

    static #waitForCanvasReady(sceneId) {
        return new Promise(resolve => {
            const hookId = Hooks.on("canvasReady", activeScene => {
                if (activeScene?.id !== sceneId) return;
                Hooks.off("canvasReady", hookId);
                resolve(activeScene);
            });
        });
    }

    static async #animateViewTransition({ x, y, scale, duration = 800 }) {
        const start = {
            x: canvas.stage.pivot.x,
            y: canvas.stage.pivot.y,
            scale: canvas.stage.scale.x
        };
        const end = { x, y, scale };
        const startedAt = performance.now();

        return new Promise(resolve => {
            const step = now => {
                const elapsed = now - startedAt;
                const progress = this.#clamp(elapsed / duration, 0, 1);
                const eased = this.#easeInOutCosine(progress);

                canvas.pan({
                    x: start.x + ((end.x - start.x) * eased),
                    y: start.y + ((end.y - start.y) * eased),
                    scale: start.scale + ((end.scale - start.scale) * eased)
                });

                if (progress >= 1) return resolve();
                requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
        });
    }

    static async #fadeToBlack(duration = 220) {
        const overlay = this.#ensureFadeOverlay();
        await this.#animateOverlayAlpha(overlay, overlay.alpha, 1, duration);
    }

    static async #fadeFromBlack(duration = 220) {
        const overlay = this.#ensureFadeOverlay();
        await this.#animateOverlayAlpha(overlay, overlay.alpha, 0, duration);
        this.#destroyFadeOverlay();
    }

    static #ensureFadeOverlay() {
        if (this.#fadeOverlay?.parent) return this.#fadeOverlay;

        const width = canvas.dimensions.width;
        const height = canvas.dimensions.height;
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 1);
        overlay.drawRect(0, 0, width, height);
        overlay.endFill();
        overlay.alpha = 0;
        overlay.eventMode = "none";
        overlay.zIndex = 999999;

        canvas.stage.sortableChildren = true;
        canvas.stage.addChild(overlay);
        this.#fadeOverlay = overlay;
        return overlay;
    }

    static #destroyFadeOverlay() {
        if (!this.#fadeOverlay) return;
        if (this.#fadeOverlay.parent) {
            this.#fadeOverlay.parent.removeChild(this.#fadeOverlay);
        }
        this.#fadeOverlay.destroy();
        this.#fadeOverlay = null;
    }

    static async #animateOverlayAlpha(overlay, from, to, duration) {
        const startedAt = performance.now();

        return new Promise(resolve => {
            const step = now => {
                const elapsed = now - startedAt;
                const progress = this.#clamp(elapsed / duration, 0, 1);
                const eased = this.#easeInOutCosine(progress);
                overlay.alpha = from + ((to - from) * eased);

                if (progress >= 1) return resolve();
                requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
        });
    }

    static #easeInOutCosine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }

    static #clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}
