// Canvas hook wiring for Sites interactions. This keeps drag and placement behavior out of the bootstrap file.

import { Log } from "../../../support/utils/Logger.js";
import { SiteGenerator } from "../services/SiteGenerator.js";
import { SiteEditor } from "../services/SiteEditor.js";
import { refreshNexusToolbarForScene } from "../../../support/toolbar/NexusToolContext.js";

let canvasMouseDownHandler = null;
let canvasMouseMoveHandler = null;
let canvasMouseUpHandler = null;

export function registerSiteCanvasHooks() {
    Hooks.on("canvasReady", () => {
        SiteGenerator.resetGhost();
        refreshNexusToolbarForScene(canvas.scene);
        canvas.augur?.refreshNoteBridgeListeners?.();

        if (canvasMouseDownHandler) canvas.stage.off("mousedown", canvasMouseDownHandler);
        if (canvasMouseMoveHandler) canvas.stage.off("mousemove", canvasMouseMoveHandler);
        if (canvasMouseUpHandler) {
            canvas.stage.off("mouseup", canvasMouseUpHandler);
            canvas.stage.off("mouseupoutside", canvasMouseUpHandler);
        }

        canvasMouseDownHandler = event => {
            const activeTool = ui.controls.tool;
            const toolName = activeTool?.name || activeTool;
            if (toolName !== "nexus-sites") return;

            const pos = event.data?.getLocalPosition(canvas.stage);
            if (!pos) return;

            if (!game.user.isGM) {
                ui.notifications.warn("Only the GM can create, edit, delete, or move sites.");
                return;
            }

            if (SiteEditor.isEditMode) {
                const selectedNote = SiteEditor.getSelectedNote();
                const hitNote = SiteGenerator.getSiteNoteAtPosition(pos);
                if (selectedNote && hitNote && SiteEditor.isSelectedNote(hitNote) && SiteGenerator.beginDrag(pos, { noteId: selectedNote.document.id })) {
                    SiteGenerator.clearGhost();
                    return;
                }

                SiteGenerator.clearGhost();
                try {
                    SiteEditor.selectSiteAtPosition(pos);
                } catch (err) {
                    Log.error("Failed to select the site to edit.", err);
                    ui.notifications.error("Failed to select the site.");
                }
                return;
            }

            const shiftKey = event.data?.originalEvent?.shiftKey || false;
            if (!shiftKey && SiteGenerator.beginDrag(pos)) {
                SiteGenerator.clearGhost();
                return;
            }

            SiteGenerator.handleCanvasClick(pos, { shiftKey }).catch(err => {
                Log.error("Failed to handle site placement interaction.", err);
                ui.notifications.error("Failed to update the selected site.");
            });
        };

        canvasMouseMoveHandler = event => {
            const activeTool = ui.controls.tool;
            const toolName = activeTool?.name || activeTool;
            const pos = event.data?.getLocalPosition(canvas.stage);
            if (!pos) return;

            if (toolName !== "nexus-sites") {
                SiteGenerator.clearGhost();
                return;
            }

            if (SiteGenerator.isDragging) {
                SiteGenerator.clearGhost();
                SiteGenerator.updateDrag(pos);
                return;
            }

            if (SiteEditor.isEditMode) {
                SiteGenerator.clearGhost();
                return;
            }

            SiteGenerator.syncGhost(pos, {
                shiftKey: event.data?.originalEvent?.shiftKey || false
            }).catch(err => {
                Log.warn("Failed to update the site ghost preview.", err);
            });
        };

        canvasMouseUpHandler = () => {
            const activeTool = ui.controls.tool;
            const toolName = activeTool?.name || activeTool;
            if (toolName !== "nexus-sites" || !SiteGenerator.isDragging) return;

            SiteGenerator.endDrag().catch(err => {
                Log.error("Failed to finish site drag interaction.", err);
                ui.notifications.error("Failed to move the selected site.");
                SiteGenerator.cancelDrag();
            });
        };

        canvas.stage.on("mousedown", canvasMouseDownHandler);
        canvas.stage.on("mousemove", canvasMouseMoveHandler);
        canvas.stage.on("mouseup", canvasMouseUpHandler);
        canvas.stage.on("mouseupoutside", canvasMouseUpHandler);
    });
}

