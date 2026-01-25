"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_serve_1 = __importDefault(require("electron-serve"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const electron_updater_1 = require("electron-updater");
const node_notifier_1 = __importDefault(require("node-notifier"));
// Configure Auto Updater
electron_updater_1.autoUpdater.autoDownload = false;
electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
// Set App User Model ID for Windows Notifications
// Critical for notifications to work on Windows 10/11
if (process.platform === 'win32') {
    electron_1.app.setAppUserModelId("com.studystream.app");
}
// Logger
electron_updater_1.autoUpdater.logger = console;
const loadURL = (0, electron_serve_1.default)({ directory: "out" });
let mainWindow = null;
let splashWindow = null;
let tray = null;
let isQuitting = false;
const isDev = !electron_1.app.isPackaged || process.env.NODE_ENV === "development";
console.log("---------------------------------------------------");
console.log("   ELECTRON MAIN PROCESS STARTING - PRODUCTION FIXES");
console.log("---------------------------------------------------");
// Enable updates in Dev Mode for testing
if (isDev) {
    electron_updater_1.autoUpdater.forceDevUpdateConfig = true;
}
// --- SINGLE INSTANCE LOCK ---
// Only enforce lock in production to allow dev and prod to run simultaneously
let hasLock = true;
if (!isDev) {
    hasLock = electron_1.app.requestSingleInstanceLock();
}
if (!hasLock) {
    console.log("[Main] Another instance is already running. Quitting...");
    electron_1.app.quit();
}
else {
    // Only register second-instance handler if we successfully got the lock (or are in dev)
    if (!isDev) {
        electron_1.app.on('second-instance', (event, commandLine, workingDirectory) => {
            // Someone tried to run a second instance, we should focus our window.
            if (mainWindow) {
                if (mainWindow.isMinimized())
                    mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            }
        });
    }
    // Register privileged schemes immediately
    electron_1.protocol.registerSchemesAsPrivileged([
        { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, allowServiceWorkers: true, corsEnabled: true } },
        { scheme: 'video', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
    ]);
    // ... (App initialization continues below)
}
function getIconPath() {
    if (isDev) {
        return path_1.default.join(process.cwd(), "icons/icon.png");
    }
    // In production (ASAR), icons are typically in resources/ directory dependent on builder config
    // or inside the asar. We'll try standard resource path first.
    // path.join(process.resourcesPath, "icons/icon.png") is common for external resources
    // But if included in build.files, it might be in app.getAppPath()
    // Attempt 1: Inside ASAR/App Path
    let icon = path_1.default.join(electron_1.app.getAppPath(), "icons/icon.png");
    if (fs_1.default.existsSync(icon))
        return icon;
    // Attempt 2: Resources path (external)
    icon = path_1.default.join(process.resourcesPath, "icons/icon.png");
    return icon;
}
function createWindow() {
    const iconPath = getIconPath();
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: "#000000",
        icon: iconPath,
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            autoplayPolicy: "no-user-gesture-required",
            backgroundThrottling: false,
        },
        show: false, // Always hidden initially, waiting for splash
        frame: true,
        autoHideMenuBar: true,
    });
    if (isDev) {
        mainWindow.loadURL("http://localhost:3000");
    }
    else {
        loadURL(mainWindow);
    }
    mainWindow.on("close", (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.hide();
            return false;
        }
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
function createTray() {
    const iconPath = getIconPath();
    const trayIcon = electron_1.nativeImage.createFromPath(iconPath);
    tray = new electron_1.Tray(trayIcon.resize({ width: 16, height: 16 }));
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Show App',
            click: () => {
                mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
            }
        },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                electron_1.app.quit();
            }
        }
    ]);
    tray.setToolTip('Study Stream');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
    });
}
function createSplashWindow() {
    splashWindow = new electron_1.BrowserWindow({
        width: 600,
        height: 400,
        backgroundColor: "#000000",
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    if (isDev) {
        splashWindow.loadURL("http://localhost:3000/splash");
    }
    else {
        splashWindow.loadURL("app://./splash");
    }
    splashWindow.on("closed", () => {
        splashWindow = null;
    });
}
// -----------------------------------------------------------------------------
// IPC Handlers
// -----------------------------------------------------------------------------
// Helper to Scan Directory
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm'];
const SUBTITLE_EXTENSIONS = ['.srt', '.vtt'];
// Helper to map full language names to codes (basic list, can be expanded)
const LANG_MAP = {
    'english': 'en', 'eng': 'en', 'en': 'en',
    'spanish': 'es', 'esp': 'es', 'es': 'es',
    'french': 'fr', 'fre': 'fr', 'fr': 'fr',
    'german': 'de', 'deu': 'de', 'de': 'de',
    'italian': 'it', 'ita': 'it', 'it': 'it',
    'portuguese': 'pt', 'por': 'pt', 'pt': 'pt',
    'russian': 'ru', 'rus': 'ru', 'ru': 'ru',
    'chinese': 'zh', 'chi': 'zh', 'zh': 'zh',
    'japanese': 'ja', 'jpn': 'ja', 'ja': 'ja',
    'korean': 'ko', 'kor': 'ko', 'ko': 'ko',
    'bulgarian': 'bg',
    'czech': 'cs',
    'danish': 'da',
    'dutch': 'nl',
    'finnish': 'fi',
    'greek': 'el',
    'hungarian': 'hu',
    'indonesian': 'id',
    'norwegian': 'no',
    'polish': 'pl',
    'romanian': 'ro',
    'swedish': 'sv',
    'thai': 'th',
    'turkish': 'tr',
    'ukrainian': 'uk',
    'vietnamese': 'vi'
};
function getSubtitles(dirPath, videoName) {
    const subtitles = [];
    const baseName = path_1.default.parse(videoName).name;
    try {
        const entries = fs_1.default.readdirSync(dirPath, { withFileTypes: true });
        // console.log(`[Scan] Checking subtitles for: ${baseName} in ${dirPath}`);
        entries.forEach(entry => {
            if (!entry.isFile())
                return;
            const ext = path_1.default.extname(entry.name).toLowerCase();
            if (!SUBTITLE_EXTENSIONS.includes(ext))
                return;
            // Check if subtitle filename starts with video basename
            if (entry.name.startsWith(baseName)) {
                // console.log(`[Scan] Found potential subtitle: ${entry.name}`);
                const subBaseName = path_1.default.parse(entry.name).name;
                let suffix = subBaseName.substring(baseName.length);
                // Clean up separators: " - English", ".en", "_eng" -> "English", "en", "eng"
                // Regex removes leading dots, underscores, hyphens, and spaces
                const cleanSuffix = suffix.replace(/^[\s._\-]+/, '').trim();
                let label = 'Unknown';
                let lang = 'en';
                if (cleanSuffix) {
                    // If suffix exists, treat it as the language label (e.g., "Bulgarian", "English")
                    // Capitalize first letter
                    label = cleanSuffix.charAt(0).toUpperCase() + cleanSuffix.slice(1);
                    // Try to infer code
                    const lowerSuffix = cleanSuffix.toLowerCase();
                    lang = LANG_MAP[lowerSuffix] || 'en';
                }
                else {
                    // Exact name match (Movie.srt)
                    label = 'Default';
                }
                subtitles.push({
                    path: path_1.default.join(dirPath, entry.name),
                    lang,
                    label
                });
            }
        });
    }
    catch (e) {
        console.error(`[Scan] Error scanning subtitles in ${dirPath}:`, e);
    }
    return subtitles;
}
const scanDirectory = (dirPath) => {
    try {
        const entries = fs_1.default.readdirSync(dirPath, { withFileTypes: true });
        const sections = [];
        let rootVideos = [];
        entries.forEach((entry) => {
            const fullPath = path_1.default.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                // It's a Section
                const subEntries = fs_1.default.readdirSync(fullPath, { withFileTypes: true });
                const videos = subEntries
                    .filter(e => e.isFile() && VIDEO_EXTENSIONS.includes(path_1.default.extname(e.name).toLowerCase()))
                    .map(e => ({
                    id: path_1.default.join(fullPath, e.name), // Use path as ID for simplicity
                    name: path_1.default.parse(e.name).name,
                    path: path_1.default.join(fullPath, e.name),
                    completed: false,
                    progress: 0,
                    duration: 0,
                    subtitles: getSubtitles(fullPath, e.name)
                }));
                if (videos.length > 0) {
                    // Natural sort for videos
                    videos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
                    sections.push({
                        id: fullPath,
                        name: entry.name,
                        path: fullPath,
                        videos: videos,
                        isExpanded: false
                    });
                }
            }
            else if (entry.isFile() && VIDEO_EXTENSIONS.includes(path_1.default.extname(entry.name).toLowerCase())) {
                // It's a video in the root folder
                rootVideos.push({
                    id: fullPath,
                    name: path_1.default.parse(entry.name).name,
                    path: fullPath,
                    completed: false,
                    progress: 0,
                    duration: 0,
                    subtitles: getSubtitles(dirPath, entry.name)
                });
            }
        });
        // Natural sort for root videos
        rootVideos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        if (rootVideos.length > 0) {
            sections.unshift({
                id: "root-section",
                name: "General",
                path: dirPath,
                videos: rootVideos,
                isExpanded: true
            });
        }
        // Natural sort for sections
        sections.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        return {
            id: dirPath,
            name: path_1.default.basename(dirPath),
            path: dirPath,
            sections: sections,
            totalVideos: sections.reduce((acc, sec) => acc + sec.videos.length, 0),
            completedVideos: 0
        };
    }
    catch (e) {
        console.error("Error scanning directory:", e);
        return null;
    }
};
electron_1.ipcMain.handle("select-directory", () => __awaiter(void 0, void 0, void 0, function* () {
    if (!mainWindow)
        return null;
    const result = yield electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    const dirPath = result.filePaths[0];
    // Automatically scan the selected directory
    const courseData = scanDirectory(dirPath);
    return courseData;
}));
electron_1.ipcMain.handle("resize-window", (event, maximize) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mainWindow)
        return;
    if (maximize) {
        mainWindow.maximize();
        mainWindow.setResizable(true);
    }
    else {
        mainWindow.setSize(600, 400);
        mainWindow.center();
    }
}));
electron_1.ipcMain.handle("send-notification", (event_1, _a) => __awaiter(void 0, [event_1, _a], void 0, function* (event, { title, body }) {
    console.log(`[Notification] Request received: "${title}"`);
    const iconPath = getIconPath();
    return new Promise((resolve) => {
        try {
            // Use node-notifier for reliable cross-platform notifications
            node_notifier_1.default.notify({
                title: title,
                message: body,
                icon: iconPath,
                sound: true,
                wait: true,
                appID: "com.studystream.app"
            }, (err, response, metadata) => {
                if (err) {
                    console.error('[Notification] node-notifier error:', err);
                    // Fallback to tray balloon
                    if (tray) {
                        console.log('[Notification] Using Tray Balloon fallback...');
                        tray.displayBalloon({
                            title: title,
                            content: body,
                            icon: iconPath
                        });
                    }
                    resolve(false);
                }
                else {
                    console.log('[Notification] Sent successfully via node-notifier');
                    resolve(true);
                }
            });
            // Handle notification click - show and focus the app
            node_notifier_1.default.on('click', () => {
                console.log('[Notification] Clicked - focusing window');
                if (mainWindow) {
                    mainWindow.show();
                    if (mainWindow.isMinimized())
                        mainWindow.restore();
                    mainWindow.focus();
                }
            });
        }
        catch (error) {
            console.error('[Notification] Exception:', error);
            // Fallback to Tray Balloon
            if (tray) {
                console.log('[Notification] Using Tray Balloon fallback due to exception...');
                tray.displayBalloon({
                    title: title,
                    content: body,
                    icon: iconPath
                });
            }
            resolve(false);
        }
    });
}));
electron_1.ipcMain.handle("read-subtitle", (event, filePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!fs_1.default.existsSync(filePath)) {
            console.error(`[Subtitle] File not found: ${filePath}`);
            return null;
        }
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        return content;
    }
    catch (error) {
        console.error(`[Subtitle] Error reading file: ${filePath}`, error);
        return null;
    }
}));
electron_1.ipcMain.handle("save-image", (event_1, _a) => __awaiter(void 0, [event_1, _a], void 0, function* (event, { url, courseId }) {
    try {
        const response = yield fetch(url);
        if (!response.ok)
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        const buffer = yield response.arrayBuffer();
        const coversDir = path_1.default.join(electron_1.app.getPath("userData"), "covers");
        if (!fs_1.default.existsSync(coversDir)) {
            fs_1.default.mkdirSync(coversDir, { recursive: true });
        }
        // Determine extension from content-type or url, default to .jpg
        let ext = ".jpg";
        const contentType = response.headers.get("content-type");
        if (contentType) {
            if (contentType.includes("png"))
                ext = ".png";
            else if (contentType.includes("webp"))
                ext = ".webp";
            else if (contentType.includes("jpeg"))
                ext = ".jpg";
        }
        // Sanitize courseId to be safe for filenames (replace : \ / etc with -)
        const safeId = courseId.replace(/[^a-zA-Z0-9]/g, "-");
        const fileName = `${safeId}-${Date.now()}${ext}`;
        const filePath = path_1.default.join(coversDir, fileName);
        fs_1.default.writeFileSync(filePath, Buffer.from(buffer));
        return filePath;
    }
    catch (error) {
        console.error("Failed to save image:", error);
        throw error;
    }
}));
electron_1.ipcMain.handle("proxy-request", (event_1, _a) => __awaiter(void 0, [event_1, _a], void 0, function* (event, { url, method, headers, body }) {
    try {
        console.log(`[Proxy] ${method} ${url}`);
        const response = yield fetch(url, {
            method,
            headers,
            body: body || undefined
        });
        const arrayBuffer = yield response.arrayBuffer();
        // Return as number array (Uint8Array) which is serializable
        // or just let Electron handle the Buffer
        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: Buffer.from(arrayBuffer)
        };
    }
    catch (error) {
        console.error("[Proxy] Error:", error);
        return {
            ok: false,
            error: error.message
        };
    }
}));
// -----------------------------------------------------------------------------
// Local Video Stream Server (Dynamic Port Selection)
// -----------------------------------------------------------------------------
let STREAM_PORT = 19999;
const findAvailablePort = (startPort) => {
    return new Promise((resolve, reject) => {
        const server = http_1.default.createServer();
        server.listen(startPort, '127.0.0.1', () => {
            const address = server.address();
            server.close(() => {
                // Port is available
                // @ts-ignore
                resolve(address.port);
            });
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // Port is in use, try next one
                resolve(findAvailablePort(startPort + 1));
            }
            else {
                reject(err);
            }
        });
    });
};
const streamServer = http_1.default.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    const u = new URL(req.url || '', `http://localhost:${STREAM_PORT}`);
    const method = req.method;
    if (u.pathname === '/stream' && method === 'GET') {
        const videoPath = u.searchParams.get('path');
        if (!videoPath) {
            res.writeHead(400);
            res.end('Missing path');
            return;
        }
        const decodedPath = decodeURIComponent(videoPath);
        let finalPath = path_1.default.normalize(decodedPath);
        // Windows long path support
        if (process.platform === 'win32') {
            if (finalPath.startsWith('\\') && !finalPath.startsWith('\\\\')) {
                finalPath = finalPath.replace(/^\\/, '');
            }
            if (!finalPath.startsWith('\\\\?\\')) {
                finalPath = `\\\\?\\${finalPath}`;
            }
        }
        if (!fs_1.default.existsSync(finalPath)) {
            console.error(`[Stream Server] File not found: ${finalPath}`);
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        try {
            const stat = fs_1.default.statSync(finalPath);
            const fileSize = stat.size;
            const range = req.headers.range;
            const ext = path_1.default.extname(finalPath).toLowerCase();
            let contentType = 'application/octet-stream';
            // Video formats
            if (ext === '.mp4')
                contentType = 'video/mp4';
            if (ext === '.mkv')
                contentType = 'video/x-matroska';
            if (ext === '.webm')
                contentType = 'video/webm';
            if (ext === '.avi')
                contentType = 'video/x-msvideo';
            if (ext === '.mov')
                contentType = 'video/quicktime';
            if (ext === '.wmv')
                contentType = 'video/x-ms-wmv';
            // Subtitle formats
            if (ext === '.vtt')
                contentType = 'text/vtt';
            if (ext === '.srt')
                contentType = 'application/x-subrip';
            // Image formats
            if (ext === '.jpg' || ext === '.jpeg')
                contentType = 'image/jpeg';
            if (ext === '.png')
                contentType = 'image/png';
            if (ext === '.webp')
                contentType = 'image/webp';
            if (ext === '.gif')
                contentType = 'image/gif';
            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': contentType,
                });
                const file = fs_1.default.createReadStream(finalPath, { start, end });
                file.pipe(res);
            }
            else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': contentType,
                    'Accept-Ranges': 'bytes',
                });
                const file = fs_1.default.createReadStream(finalPath);
                file.pipe(res);
            }
        }
        catch (err) {
            console.error('[Stream Server] Error:', err);
            if (!res.headersSent) {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        }
    }
    else {
        res.writeHead(404);
        res.end('Not found');
    }
});
// Initialize Stream Server Dynamically
findAvailablePort(19999).then(port => {
    STREAM_PORT = port;
    streamServer.listen(STREAM_PORT, '127.0.0.1', () => {
        console.log(`[Stream Server] Listening on http://127.0.0.1:${STREAM_PORT}`);
    });
}).catch(err => {
    console.error("[Stream Server] Failed to find available port:", err);
});
// -----------------------------------------------------------------------------
// Auto Updater Logic
// -----------------------------------------------------------------------------
function sendToWindow(channel, text) {
    if (mainWindow) {
        mainWindow.webContents.send(channel, text);
    }
}
electron_updater_1.autoUpdater.on('checking-for-update', () => {
    sendToWindow('update-status', 'Checking for updates...');
});
electron_updater_1.autoUpdater.on('update-available', (info) => {
    sendToWindow('update-available', info);
});
electron_updater_1.autoUpdater.on('update-not-available', (info) => {
    sendToWindow('update-not-available', info);
});
electron_updater_1.autoUpdater.on('error', (err) => {
    sendToWindow('update-error', err.toString());
});
electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    sendToWindow('update-progress', progressObj);
});
electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
    sendToWindow('update-downloaded', info);
});
electron_1.ipcMain.handle("check-for-update", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[AutoUpdate] Manual check triggered');
    try {
        const result = yield electron_updater_1.autoUpdater.checkForUpdates();
        console.log('[AutoUpdate] Check result:', result);
        return result;
    }
    catch (error) {
        console.error('[AutoUpdate] Error during check:', error);
        throw error;
    }
}));
electron_1.ipcMain.handle("download-update", () => {
    return electron_updater_1.autoUpdater.downloadUpdate();
});
electron_1.ipcMain.handle("quit-and-install", () => {
    electron_updater_1.autoUpdater.quitAndInstall();
});
electron_1.ipcMain.handle("get-app-version", () => {
    return electron_1.app.getVersion();
});
// -----------------------------------------------------------------------------
// Auto-Start with Windows (Registry Entry)
// -----------------------------------------------------------------------------
const AUTO_START_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const AUTO_START_NAME = 'StudyStream';
electron_1.ipcMain.handle("set-auto-start", (event, enabled) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.platform !== 'win32') {
        console.log('[AutoStart] Only supported on Windows');
        return false;
    }
    try {
        const { exec } = require('child_process');
        const appPath = process.execPath;
        if (enabled) {
            // Add to registry - start minimized to tray
            const command = `reg add "${AUTO_START_KEY}" /v "${AUTO_START_NAME}" /t REG_SZ /d "\\"${appPath}\\" --minimized" /f`;
            console.log('[AutoStart] Enabling auto-start...');
            return new Promise((resolve) => {
                exec(command, (error) => {
                    if (error) {
                        console.error('[AutoStart] Failed to add registry entry:', error);
                        resolve(false);
                    }
                    else {
                        console.log('[AutoStart] Successfully enabled');
                        resolve(true);
                    }
                });
            });
        }
        else {
            // Remove from registry
            const command = `reg delete "${AUTO_START_KEY}" /v "${AUTO_START_NAME}" /f`;
            console.log('[AutoStart] Disabling auto-start...');
            return new Promise((resolve) => {
                exec(command, (error) => {
                    if (error) {
                        console.log('[AutoStart] Registry entry may not exist, which is fine');
                    }
                    console.log('[AutoStart] Successfully disabled');
                    resolve(true);
                });
            });
        }
    }
    catch (error) {
        console.error('[AutoStart] Error:', error);
        return false;
    }
}));
electron_1.ipcMain.handle("get-auto-start", () => __awaiter(void 0, void 0, void 0, function* () {
    if (process.platform !== 'win32')
        return false;
    try {
        const { exec } = require('child_process');
        const command = `reg query "${AUTO_START_KEY}" /v "${AUTO_START_NAME}"`;
        return new Promise((resolve) => {
            exec(command, (error) => {
                resolve(!error); // Returns true if entry exists
            });
        });
    }
    catch (error) {
        return false;
    }
}));
// -----------------------------------------------------------------------------
// Background Scheduler (Main Process)
// Sends notifications even when window is hidden/minimized
// -----------------------------------------------------------------------------
let backgroundSchedulerInterval = null;
let lastStudyCheckDate = '';
function startBackgroundScheduler() {
    if (backgroundSchedulerInterval)
        return;
    console.log('[BackgroundScheduler] Starting...');
    backgroundSchedulerInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        // Only send "haven't studied" reminder once per day, after 6 PM
        if (currentHour >= 18 && lastStudyCheckDate !== today) {
            lastStudyCheckDate = today;
            // Check if user has studied today by reading user data
            // For now, we'll just send a reminder (full implementation needs data sync from renderer)
            console.log('[BackgroundScheduler] Evening reminder check');
            // Send daily reminder notification
            node_notifier_1.default.notify({
                title: "📚 Time to Study!",
                message: "You haven't studied today. Even 15 minutes makes a difference!",
                icon: getIconPath(),
                sound: true,
                wait: true,
                appID: "com.studystream.app"
            });
        }
    }), 60000); // Check every minute
}
function stopBackgroundScheduler() {
    if (backgroundSchedulerInterval) {
        clearInterval(backgroundSchedulerInterval);
        backgroundSchedulerInterval = null;
        console.log('[BackgroundScheduler] Stopped');
    }
}
// Helper to register AUMID on Windows for Notifications
function setupWindowsNotifications() {
    if (process.platform === 'win32') {
        const appId = 'com.studystream.app';
        electron_1.app.setAppUserModelId(appId);
        try {
            const shortcutPath = path_1.default.join(electron_1.app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Study Stream.lnk');
            const targetExe = process.execPath;
            const iconPath = getIconPath().replace('.png', '.ico'); // Best effort assumption
            // console.log('[Windows] Creating/Updating Start Menu Shortcut for Notifications...');
            const success = electron_1.shell.writeShortcutLink(shortcutPath, 'create', {
                target: targetExe,
                cwd: process.cwd(),
                args: '.',
                appUserModelId: appId,
                icon: iconPath,
                iconIndex: 0,
                description: 'Study Stream AI Companion'
            });
            // console.log('[Windows] Shortcut creation result:', success ? 'Success' : 'Failed');
        }
        catch (e) {
            console.error('[Windows] Failed to create notification shortcut:', e);
        }
    }
}
if (hasLock) {
    // Check if started with --minimized flag (auto-start mode)
    const isMinimizedStart = process.argv.includes('--minimized');
    electron_1.app.whenReady().then(() => {
        setupWindowsNotifications();
        // Start background scheduler (runs in main process)
        startBackgroundScheduler();
        if (isMinimizedStart) {
            // Auto-start mode: only show tray, don't show window
            console.log('[Main] Starting minimized to tray (auto-start mode)');
            createWindow();
            createTray();
            // Window stays hidden, app runs in background
        }
        else {
            // Normal start: show splash and window
            createSplashWindow();
            createWindow();
            createTray();
        }
        // Listen for splash completion
        electron_1.ipcMain.on('splash-finished', () => {
            if (splashWindow) {
                splashWindow.close();
            }
            if (mainWindow && !isMinimizedStart) {
                mainWindow.show();
                mainWindow.maximize();
            }
            // ONLY check for updates after splash is finished
            console.log("[Main] Splash finished, checking for updates...");
            setTimeout(() => {
                electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
            }, 2000);
        });
        electron_1.app.on("activate", () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0)
                createWindow();
        });
    });
    electron_1.app.on("window-all-closed", () => {
        // Keep app running in tray unless explicit quit
        if (process.platform !== "darwin" && isQuitting) {
            electron_1.app.quit();
        }
    });
}
