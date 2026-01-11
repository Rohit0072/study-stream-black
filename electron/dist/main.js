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
// Configure Auto Updater
electron_updater_1.autoUpdater.autoDownload = false;
electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
const loadURL = (0, electron_serve_1.default)({ directory: "out" });
let mainWindow = null;
let splashWindow = null;
const isDev = !electron_1.app.isPackaged || process.env.NODE_ENV === "development";
// ... imports
// Register privileged schemes immediately
electron_1.protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, allowServiceWorkers: true, corsEnabled: true } },
    { scheme: 'video', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
]);
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: "#000000",
        icon: path_1.default.join(process.cwd(), "icons/icon.png"),
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            autoplayPolicy: "no-user-gesture-required",
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
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
function createSplashWindow() {
    splashWindow = new electron_1.BrowserWindow({
        width: 600,
        height: 400,
        backgroundColor: "#000000",
        frame: false,
        alwaysOnTop: true,
        transparent: true, // Optional, depending on design
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
        // In production, we need to load the splash route differently if using static export or similar.
        // But with electron-serve, we usually load index.html and navigate hash or use a separate file.
        // For Next.js export, it might be /splash.html if exported.
        // Assuming serve handles routes or hash:
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
    const entries = fs_1.default.readdirSync(dirPath, { withFileTypes: true });
    console.log(`[Scan] Checking subtitles for: ${baseName} in ${dirPath}`);
    entries.forEach(entry => {
        if (!entry.isFile())
            return;
        const ext = path_1.default.extname(entry.name).toLowerCase();
        if (!SUBTITLE_EXTENSIONS.includes(ext))
            return;
        // Check if subtitle filename starts with video basename
        if (entry.name.startsWith(baseName)) {
            console.log(`[Scan] Found potential subtitle: ${entry.name}`);
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
            console.log(`[Scan] Added subtitle: ${label} (${lang}) -> ${entry.name}`);
            subtitles.push({
                path: path_1.default.join(dirPath, entry.name),
                lang,
                label
            });
        }
    });
    return subtitles;
}
const scanDirectory = (dirPath) => {
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
    yield new Promise(resolve => setTimeout(resolve, 100)); // micro-delay
    const { Notification } = require("electron");
    if (Notification.isSupported()) {
        new Notification({ title, body }).show();
        return true;
    }
    return false;
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
        // Return a URL that the stream server can handle
        // We return the raw path, formatting handled in frontend or we assume standard stream URL
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
// Local Video Stream Server (Bypass Electron Protocol Pipe)
// -----------------------------------------------------------------------------
const STREAM_PORT = 19999;
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
streamServer.listen(STREAM_PORT, '127.0.0.1', () => {
    console.log(`[Stream Server] Listening on http://127.0.0.1:${STREAM_PORT}`);
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
electron_1.ipcMain.handle("check-for-update", () => {
    if (isDev) {
        console.log('[AutoUpdate] Skipped in Dev Mode');
        return null;
    }
    return electron_updater_1.autoUpdater.checkForUpdates();
});
electron_1.ipcMain.handle("download-update", () => {
    return electron_updater_1.autoUpdater.downloadUpdate();
});
electron_1.ipcMain.handle("quit-and-install", () => {
    electron_updater_1.autoUpdater.quitAndInstall();
});
electron_1.app.whenReady().then(() => {
    // Start both
    createSplashWindow();
    createWindow();
    // Check for updates shortly after startup (only in prod)
    if (!isDev) {
        setTimeout(() => {
            electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
        }, 3000);
    }
    // Listen for splash completion
    electron_1.ipcMain.on('splash-finished', () => {
        if (splashWindow) {
            splashWindow.close();
        }
        if (mainWindow) {
            mainWindow.show();
            mainWindow.maximize();
        }
    });
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
