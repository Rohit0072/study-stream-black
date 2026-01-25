"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electron", {
    selectFolder: () => electron_1.ipcRenderer.invoke("select-directory"),
    scanDirectory: (path) => electron_1.ipcRenderer.invoke("scan-directory", path),
    sendNotification: (title, body) => electron_1.ipcRenderer.invoke("send-notification", { title, body }),
    saveImage: (url, courseId) => electron_1.ipcRenderer.invoke("save-image", { url, courseId }),
    proxyRequest: (url, options) => electron_1.ipcRenderer.invoke("proxy-request", Object.assign({ url }, options)),
    readSubtitle: (path) => electron_1.ipcRenderer.invoke("read-subtitle", path),
    send: (channel, data) => electron_1.ipcRenderer.send(channel, data),
    resizeWindow: (maximize) => electron_1.ipcRenderer.invoke("resize-window", maximize),
    // Auto Update
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    onUpdateAvailable: (callback) => electron_1.ipcRenderer.on('update-available', (_, info) => callback(info)),
    onUpdateDownloaded: (callback) => electron_1.ipcRenderer.on('update-downloaded', (_, info) => callback(info)),
    onUpdateProgress: (callback) => electron_1.ipcRenderer.on('update-progress', (_, progress) => callback(progress)),
    onUpdateError: (callback) => electron_1.ipcRenderer.on('update-error', (_, err) => callback(err)),
    checkUpdate: () => electron_1.ipcRenderer.invoke('check-for-update'),
    downloadUpdate: () => electron_1.ipcRenderer.invoke('download-update'),
    quitAndInstall: () => electron_1.ipcRenderer.invoke('quit-and-install'),
    // Dev Tools
    simulateUpdateAvailable: () => electron_1.ipcRenderer.invoke('dev-simulate-update-available'),
    simulateUpdateProgress: () => electron_1.ipcRenderer.invoke('dev-simulate-update-progress'),
    simulateUpdateDownloaded: () => electron_1.ipcRenderer.invoke('dev-simulate-update-downloaded'),
    // Auto-start with Windows
    setAutoStart: (enabled) => electron_1.ipcRenderer.invoke('set-auto-start', enabled),
    getAutoStart: () => electron_1.ipcRenderer.invoke('get-auto-start'),
});
