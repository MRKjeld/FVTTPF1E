import { MODULE_ID } from "../kctg-1e.js";

export class Notes extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(options = {}) {
        super(options);
    }

    static DEFAULT_OPTIONS = {
        id: "notes",
        tag: "div",
        window: {
            title: "Thank you for downloading `Kris' Compendium of Trade Goods`",
            resizable: false
        },
        position: {
            width: 725,
            height: 760
        },
        classes: ["kctg"]
    };

    static PARTS = {
        main: {
            template: "modules/kctg-1e/templates/notes.html"
        }
    };

    _onRender(context, options) {
        super._onRender(context, options);
    
        this.element.querySelector('.clear')?.addEventListener('click', () => {
            game.settings.set(MODULE_ID, "show-warning", false);
            this.close();
        });
        
        this.element.querySelector('.just-close')?.addEventListener('click', () => {
            this.close();
        });
    }
}