// Public UI API for dependent modules.

import { NexusFloatingMenu } from "../features/nexus/services/NexusFloatingMenu.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AugurToolApplication extends HandlebarsApplicationMixin(ApplicationV2) {
    static TOOL_NAME = "";

    static DEFAULT_OPTIONS = {
        tag: "div",
        window: {
            resizable: true
        },
        position: {
            left: 120,
            top: 60
        }
    };

    async close(options) {
        if (ui.controls) {
            const activeTool = ui.controls.tool;
            const toolName = activeTool?.name || activeTool;

            if (this.constructor.TOOL_NAME && toolName === this.constructor.TOOL_NAME) {
                ui.controls.activate({ control: "augurTools", tool: "augur-select" });
            }
        }

        return super.close(options);
    }
}

export function openActionMenu(options = {}) {
    return NexusFloatingMenu.open(options);
}

export function closeActionMenu() {
    return NexusFloatingMenu.close();
}

export async function promptTextInput({
    title = "Enter Text",
    label = "Value",
    value = "",
    placeholder = "",
    confirmLabel = "Save",
    cancelLabel = "Cancel",
    emptyMessage = "Value cannot be empty.",
    allowEmpty = false,
    validate = null,
    width = 380
} = {}) {
    const inputId = `augur-text-prompt-${foundry.utils.randomID()}`;
    const safeLabel = foundry.utils.escapeHTML(label);
    const safeValue = foundry.utils.escapeHTML(value || "");
    const safePlaceholder = foundry.utils.escapeHTML(placeholder || "");

    const readValue = () => document.getElementById(inputId)?.value?.trim() || "";
    const result = await foundry.applications.api.DialogV2.wait({
        window: { title },
        position: { width },
        modal: true,
        rejectClose: false,
        content: `
            <div class="nexus-text-prompt-form">
                <label for="${inputId}">${safeLabel}</label>
                <input id="${inputId}" type="text" value="${safeValue}" placeholder="${safePlaceholder}" autocomplete="off">
            </div>
        `,
        buttons: [
            {
                action: "confirm",
                label: confirmLabel,
                icon: "fa-solid fa-check",
                default: true,
                callback: () => readValue()
            },
            {
                action: "cancel",
                label: cancelLabel,
                icon: "fa-solid fa-xmark",
                type: "button",
                callback: () => false
            }
        ],
        render: (_event, dialog) => {
            const input = dialog.element?.querySelector?.(`#${CSS.escape(inputId)}`);
            input?.addEventListener("keydown", event => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                dialog.element?.querySelector("button[data-action='confirm']")?.click();
            });
            requestAnimationFrame(() => {
                input?.focus({ preventScroll: true });
                input?.select();
            });
        }
    });

    if (typeof result !== "string" || result === "cancel") return null;
    if (!allowEmpty && !result) {
        ui.notifications.warn(emptyMessage);
        return null;
    }

    const validationResult = typeof validate === "function" ? validate(result) : true;
    if (validationResult !== true) {
        ui.notifications.warn(typeof validationResult === "string" ? validationResult : emptyMessage);
        return null;
    }

    return result;
}

export async function confirmDestructiveAction({
    title = "Confirm Delete",
    subject = "",
    message = "",
    impacts = [],
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    width = 430
} = {}) {
    const safeSubject = foundry.utils.escapeHTML(subject || "");
    const safeMessage = message || (safeSubject ? `Delete <strong>${safeSubject}</strong>?` : "Delete this item?");
    const impactRows = impacts
        .filter(impact => Number(impact?.count || 0) > 0 && impact?.label)
        .map(impact => {
            const count = Number(impact.count || 0);
            const label = foundry.utils.escapeHTML(impact.label || "item");
            return `<li>${count} ${label}${count === 1 ? "" : "s"}</li>`;
        })
        .join("");

    return foundry.applications.api.DialogV2.confirm({
        window: {
            title,
            icon: "fa-solid fa-triangle-exclamation"
        },
        position: { width },
        content: `
            <div class="nexus-delete-confirm">
                <p>${safeMessage}</p>
                ${impactRows ? `<ul>${impactRows}</ul>` : ""}
                <p>This cannot be undone.</p>
            </div>
        `,
        rejectClose: false,
        modal: true,
        yes: {
            label: confirmLabel,
            icon: "fa-solid fa-trash"
        },
        no: {
            label: cancelLabel,
            icon: "fa-solid fa-xmark"
        }
    });
}
