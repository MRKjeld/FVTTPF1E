export class NexusFloatingMenu {
    static #menu = null;
    static #outsideClickHandler = null;
    static #escapeHandler = null;
    static #onClose = null;

    static open({ anchor, items = [], className = "", onClose = null } = {}) {
        if (!anchor || !items.length) return;
        this.close();

        const menu = document.createElement("div");
        menu.className = `nexus-floating-menu ${className}`.trim();
        menu.setAttribute("role", "menu");

        for (const item of items) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `nexus-floating-menu-item ${item.danger ? "danger" : ""} ${item.unavailable ? "unavailable" : ""}`.trim();
            button.dataset.menuAction = item.id || "";
            button.setAttribute("role", "menuitem");
            if (item.unavailable) button.setAttribute("aria-disabled", "true");
            button.innerHTML = `
                <i class="${item.icon || "fas fa-circle"}"></i>
                <span>${foundry.utils.escapeHTML(item.label || "Option")}</span>
                ${item.status ? `<small>${foundry.utils.escapeHTML(item.status)}</small>` : ""}
            `;
            button.addEventListener("click", async event => {
                event.preventDefault();
                event.stopPropagation();
                this.close();
                await item.onSelect?.();
            });
            menu.append(button);
        }

        document.body.append(menu);
        this.#menu = menu;
        this.#onClose = typeof onClose === "function" ? onClose : null;
        this.#positionMenu(anchor, menu);

        this.#outsideClickHandler = event => {
            if (!menu.contains(event.target) && !anchor.contains(event.target)) this.close();
        };
        this.#escapeHandler = event => {
            if (event.key === "Escape") this.close();
        };

        setTimeout(() => {
            document.addEventListener("pointerdown", this.#outsideClickHandler);
            document.addEventListener("keydown", this.#escapeHandler);
        }, 0);
    }

    static close() {
        this.#menu?.remove();
        this.#menu = null;
        this.#onClose?.();
        this.#onClose = null;

        if (this.#outsideClickHandler) {
            document.removeEventListener("pointerdown", this.#outsideClickHandler);
            this.#outsideClickHandler = null;
        }
        if (this.#escapeHandler) {
            document.removeEventListener("keydown", this.#escapeHandler);
            this.#escapeHandler = null;
        }
    }

    static #positionMenu(anchor, menu) {
        const rect = anchor.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const margin = 8;
        const left = Math.min(
            window.innerWidth - menuRect.width - margin,
            Math.max(margin, rect.right - menuRect.width)
        );
        const belowTop = rect.bottom + 6;
        const aboveTop = rect.top - menuRect.height - 6;
        const top = belowTop + menuRect.height + margin <= window.innerHeight
            ? belowTop
            : Math.max(margin, aboveTop);

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }
}
