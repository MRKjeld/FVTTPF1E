// Custom canvas interaction layer used by Augur tools. This gives Nexus a stable layer to activate and build on.

import { Log } from "../utils/Logger.js";
import { isV14OrNewer } from "../compatibility/FoundryVersion.js";

const NOTE_BRIDGE_TOOLS = new Set([
    "augur-select",
    "nexus-browser",
    "nexus-back",
    "dungeon-generator",
    "hexlands-generator",
    "augur-star-system"
]);

function getActiveToolName() {
    const activeTool = ui.controls?.tool;
    return activeTool?.name || activeTool || ui.controls?.activeTool || "";
}

export class AugurLayer extends foundry.canvas.layers.InteractionLayer {
    #hoveredNote = null;
    #noteBridgeListening = false;

    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            name: "augur",
            zIndex: 1000
        });
    }

    async _draw() {
        Log.log("AugurLayer | Drawing Layer");
    }

    async _tearDown() {
        this.#clearNoteHover();
        if (super._tearDown) await super._tearDown();
    }

    get active() {
        return super.active;
    }

    activate() {
        super.activate();
        this.refreshNoteBridgeListeners();
        return this;
    }

    deactivate() {
        Log.log("AugurLayer | Deactivating...");
        this.#clearNoteHover();
        super.deactivate();
        return this;
    }

    refreshNoteBridgeListeners() {
        this.#deactivateNoteBridgeListeners();
        if (this.active) this.#activateNoteBridgeListeners();
    }

    _onClickLeft2(event) {
        const note = this.#getNoteAtEvent(event);
        if (!note) return;
        this.#openNote(note);
    }

    _activate() {
        this.#activateNoteBridgeListeners();
    }

    _deactivate() {
        this.#deactivateNoteBridgeListeners();
        this.#clearNoteHover();
    }

    _onClickLeft(event) {
        this.#activateNoteBridgeListeners();
    }

    #onPointerMove(event) {
        const note = this.#getNoteAtEvent(event);
        if (note === this.#hoveredNote) return;

        this.#clearNoteHover(event);
        if (!note) return;

        this.#hoveredNote = note;
        note._onHoverIn?.(event, { hoverOutOthers: true });
    }

    #onPointerOut(event) {
        this.#clearNoteHover(event);
    }

    #activateNoteBridgeListeners() {
        if (!canvas.stage || this.#noteBridgeListening) return;
        canvas.stage.on("pointermove", this.#onPointerMove, this);
        canvas.stage.on("pointerout", this.#onPointerOut, this);
        this.#noteBridgeListening = true;
    }

    #deactivateNoteBridgeListeners() {
        if (!canvas.stage || !this.#noteBridgeListening) return;
        canvas.stage.off("pointermove", this.#onPointerMove, this);
        canvas.stage.off("pointerout", this.#onPointerOut, this);
        this.#noteBridgeListening = false;
    }

    #clearNoteHover(event = new Event("pointerout")) {
        if (!this.#hoveredNote) return;
        const note = this.#hoveredNote;
        this.#hoveredNote = null;
        note._onHoverOut?.(event);
    }

    #getNoteAtEvent(event) {
        if (!this.#canBridgeNotes()) return null;

        const position = event?.getLocalPosition?.(canvas.stage);
        if (!position) return null;

        return [...(canvas.notes?.placeables || [])]
            .reverse()
            .find(note => this.#canInteractWithNote(note) && note.bounds?.contains(position.x, position.y)) || null;
    }

    #canBridgeNotes() {
        if (!isV14OrNewer()) return false;
        if (!canvas.notes?.objects?.visible) return false;
        return NOTE_BRIDGE_TOOLS.has(getActiveToolName());
    }

    #canInteractWithNote(note) {
        if (!note?.visible || !note.document?.entry) return false;
        return note._canView?.(game.user) !== false;
    }

    #openNote(note) {
        const { entry, page } = note.document;
        if (!entry) return;

        const options = {};
        if (page) {
            options.mode = foundry.applications.sheets.journal.JournalEntrySheet.VIEW_MODES.SINGLE;
            options.pageId = page.id;
        }

        const allowed = Hooks.call("activateNote", note, options);
        if (allowed === false) return;

        if (page?.type === "image") {
            new ImagePopout({
                src: page.src,
                uuid: page.uuid,
                caption: page.image.caption,
                window: { title: page.name }
            }).render({ force: true });
            return;
        }

        entry.sheet.render(true, options);
    }
}



