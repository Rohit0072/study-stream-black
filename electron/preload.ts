import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
    selectFolder: () => ipcRenderer.invoke("select-directory"),
    scanDirectory: (path: string) => ipcRenderer.invoke("scan-directory", path),
    sendNotification: (title: string, body: string) => ipcRenderer.invoke("send-notification", { title, body }),
    saveImage: (url: string, courseId: string) => ipcRenderer.invoke("save-image", { url, courseId }),
    proxyRequest: (url: string, options: any) => ipcRenderer.invoke("proxy-request", { url, ...options }),
    readSubtitle: (path: string) => ipcRenderer.invoke("read-subtitle", path),
    send: (channel: string, data?: any) => ipcRenderer.send(channel, data),
    resizeWindow: (maximize: boolean) => ipcRenderer.invoke("resize-window", maximize),


    // Auto Update
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    onUpdateAvailable: (callback: (info: any) => void) => ipcRenderer.on('update-available', (_, info) => callback(info)),
    onUpdateDownloaded: (callback: (info: any) => void) => ipcRenderer.on('update-downloaded', (_, info) => callback(info)),
    onUpdateProgress: (callback: (progress: any) => void) => ipcRenderer.on('update-progress', (_, progress) => callback(progress)),
    onUpdateError: (callback: (err: string) => void) => ipcRenderer.on('update-error', (_, err) => callback(err)),
    checkUpdate: () => ipcRenderer.invoke('check-for-update'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

    // Dev Tools
    simulateUpdateAvailable: () => ipcRenderer.invoke('dev-simulate-update-available'),
    simulateUpdateProgress: () => ipcRenderer.invoke('dev-simulate-update-progress'),
    simulateUpdateDownloaded: () => ipcRenderer.invoke('dev-simulate-update-downloaded'),

    // Auto-start with Windows
    setAutoStart: (enabled: boolean) => ipcRenderer.invoke('set-auto-start', enabled),
    getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
});
