export { };

/**
 * Electron API interface exposed via preload script
 */
interface ElectronAPI {
    // File/Directory Operations
    selectFolder: () => Promise<any>;
    scanDirectory: (path: string) => Promise<any>;
    readSubtitle: (path: string) => Promise<string | null>;

    // Notifications
    sendNotification: (title: string, body: string) => Promise<boolean>;
    send: (channel: string, data?: any) => void;

    // Image/Proxy
    saveImage: (url: string, courseId: string) => Promise<string>;
    proxyRequest: (url: string, options: { method: string, headers: Record<string, string>, body?: string | any }) => Promise<{ ok: boolean, status: number, statusText: string, data: any, error?: string }>;

    // Window Management
    resizeWindow: (maximize: boolean) => Promise<void>;

    // Auto Update
    getAppVersion: () => Promise<string>;
    checkUpdate: () => Promise<any>;
    downloadUpdate: () => Promise<any>;
    quitAndInstall: () => void;
    onUpdateAvailable: (callback: (info: any) => void) => void;
    onUpdateDownloaded: (callback: (info: any) => void) => void;
    onUpdateProgress: (callback: (progress: any) => void) => void;
    onUpdateError: (callback: (err: string) => void) => void;

    // Dev Tools
    simulateUpdateAvailable: () => void;
    simulateUpdateProgress: () => void;
    simulateUpdateDownloaded: () => void;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
        scanDirectory: (path: string) => Promise<any>;
        sendNotification: (title: string, body: string) => Promise<boolean>;
        saveImage: (url: string, courseId: string) => Promise<string>;
        proxyRequest: (url: string, options: { method: string, headers: Record<string, string>, body?: string | any }) => Promise<{ ok: boolean, status: number, statusText: string, data: any, error?: string }>;
    }
    var puter: any;
}

