// Public logging API for dependent modules.

import { Log } from "../support/utils/Logger.js";

export function createLogger(source) {
    return {
        get debug() {
            return Log.debug;
        },
        set debug(value) {
            Log.debug = value;
        },
        get showInfo() {
            return Log.showInfo;
        },
        set showInfo(value) {
            Log.showInfo = value;
        },
        get showWarn() {
            return Log.showWarn;
        },
        set showWarn(value) {
            Log.showWarn = value;
        },
        log(message, ...args) {
            Log.log(source, message, ...args);
        },
        info(message, ...args) {
            Log.info(source, message, ...args);
        },
        warn(message, ...args) {
            Log.warn(source, message, ...args);
        },
        error(message, ...args) {
            Log.error(source, message, ...args);
        }
    };
}

export function getDebug() {
    return Log.debug;
}

export function setDebug(value) {
    Log.debug = value;
}

export function getShowInfo() {
    return Log.showInfo;
}

export function setShowInfo(value) {
    Log.showInfo = value;
}

export function getShowWarn() {
    return Log.showWarn;
}

export function setShowWarn(value) {
    Log.showWarn = value;
}

export function log(source, message, ...args) {
    Log.log(source, message, ...args);
}

export function info(source, message, ...args) {
    Log.info(source, message, ...args);
}

export function warn(source, message, ...args) {
    Log.warn(source, message, ...args);
}

export function error(source, message, ...args) {
    Log.error(source, message, ...args);
}

