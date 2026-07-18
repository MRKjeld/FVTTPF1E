// Shared logging helpers for all my modules. Keep all module-prefixed console output here.

export class Log {
    static debug = false;
    static showInfo = false;
    static showWarn = false;

    static log(source, message, ...args) {
        if (this.debug) {
            console.log(`${source || "Augur Nexus"} | ${message}`, ...args);
        }
    }

    static info(source, message, ...args) {
        if (this.showInfo) {
            console.info(`${source || "Augur Nexus"} | ${message}`, ...args);
        }
    }

    static warn(source, message, ...args) {
        if (this.showWarn) {
            console.warn(`${source || "Augur Nexus"} | ${message}`, ...args);
        }
    }

    static error(source, message, ...args) {
        console.error(`${source || "Augur Nexus"} | ${message}`, ...args);
    }
}
