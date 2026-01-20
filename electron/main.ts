import { app, BrowserWindow, ipcMain, dialog, protocol, net } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import serve from "electron-serve";
import fs from "fs";
import { Readable } from "stream";
import http from "http";
import { autoUpdater } from "electron-updater";

// Configure Auto Updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Logger
autoUpdater.logger = console;

const loadURL = serve({ directory: "out" });

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged || process.env.NODE_ENV === "development";

// Enable updates in Dev Mode for testing
if (isDev) {
    autoUpdater.forceDevUpdateConfig = true;
}

// ... imports

// Register privileged schemes immediately
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, allowServiceWorkers: true, corsEnabled: true } },
    { scheme: 'video', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
]);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: "#000000",
        icon: path.join(process.cwd(), "icons/icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
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
    } else {
        loadURL(mainWindow);
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 600,
        height: 400,
        backgroundColor: "#000000",
        frame: false,
        alwaysOnTop: true,
        transparent: true, // Optional, depending on design
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (isDev) {
        splashWindow.loadURL("http://localhost:3000/splash");
    } else {
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
const LANG_MAP: Record<string, string> = {
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

function getSubtitles(dirPath: string, videoName: string): { path: string; lang: string; label: string }[] {
    const subtitles: { path: string; lang: string; label: string }[] = [];
    const baseName = path.parse(videoName).name;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    console.log(`[Scan] Checking subtitles for: ${baseName} in ${dirPath}`);

    entries.forEach(entry => {
        if (!entry.isFile()) return;
        const ext = path.extname(entry.name).toLowerCase();
        if (!SUBTITLE_EXTENSIONS.includes(ext)) return;

        // Check if subtitle filename starts with video basename
        if (entry.name.startsWith(baseName)) {
            console.log(`[Scan] Found potential subtitle: ${entry.name}`);
            const subBaseName = path.parse(entry.name).name;
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
            } else {
                // Exact name match (Movie.srt)
                label = 'Default';
            }

            console.log(`[Scan] Added subtitle: ${label} (${lang}) -> ${entry.name}`);


            subtitles.push({
                path: path.join(dirPath, entry.name),
                lang,
                label
            });
        }
    });

    return subtitles;
}

const scanDirectory = (dirPath: string) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const sections: any[] = [];
    let rootVideos: any[] = [];

    entries.forEach((entry) => {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            // It's a Section
            const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
            const videos = subEntries
                .filter(e => e.isFile() && VIDEO_EXTENSIONS.includes(path.extname(e.name).toLowerCase()))
                .map(e => ({
                    id: path.join(fullPath, e.name), // Use path as ID for simplicity
                    name: path.parse(e.name).name,
                    path: path.join(fullPath, e.name),
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

        } else if (entry.isFile() && VIDEO_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
            // It's a video in the root folder
            rootVideos.push({
                id: fullPath,
                name: path.parse(entry.name).name,
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
        name: path.basename(dirPath),
        path: dirPath,
        sections: sections,
        totalVideos: sections.reduce((acc, sec) => acc + sec.videos.length, 0),
        completedVideos: 0
    };
};

ipcMain.handle("select-directory", async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    const dirPath = result.filePaths[0];
    // Automatically scan the selected directory
    const courseData = scanDirectory(dirPath);
    return courseData;
});

ipcMain.handle("resize-window", async (event, maximize) => {
    if (!mainWindow) return;
    if (maximize) {
        mainWindow.maximize();
        mainWindow.setResizable(true);
    } else {
        mainWindow.setSize(600, 400);
        mainWindow.center();
    }
});

ipcMain.handle("send-notification", async (event, { title, body }) => {
    await new Promise(resolve => setTimeout(resolve, 100)); // micro-delay
    const { Notification } = require("electron");
    if (Notification.isSupported()) {
        new Notification({ title, body }).show();
        return true;
    }
    return false;
});

ipcMain.handle("read-subtitle", async (event, filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`[Subtitle] File not found: ${filePath}`);
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return content;
    } catch (error) {
        console.error(`[Subtitle] Error reading file: ${filePath}`, error);
        return null;
    }
});

ipcMain.handle("save-image", async (event, { url, courseId }) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const buffer = await response.arrayBuffer();
        const coversDir = path.join(app.getPath("userData"), "covers");

        if (!fs.existsSync(coversDir)) {
            fs.mkdirSync(coversDir, { recursive: true });
        }

        // Determine extension from content-type or url, default to .jpg
        let ext = ".jpg";
        const contentType = response.headers.get("content-type");
        if (contentType) {
            if (contentType.includes("png")) ext = ".png";
            else if (contentType.includes("webp")) ext = ".webp";
            else if (contentType.includes("jpeg")) ext = ".jpg";
        }

        // Sanitize courseId to be safe for filenames (replace : \ / etc with -)
        const safeId = courseId.replace(/[^a-zA-Z0-9]/g, "-");
        const fileName = `${safeId}-${Date.now()}${ext}`;
        const filePath = path.join(coversDir, fileName);

        fs.writeFileSync(filePath, Buffer.from(buffer));

        // Return a URL that the stream server can handle
        // We return the raw path, formatting handled in frontend or we assume standard stream URL
        return filePath;
    } catch (error) {
        console.error("Failed to save image:", error);
        throw error;
    }
});

ipcMain.handle("proxy-request", async (event, { url, method, headers, body }) => {
    try {
        console.log(`[Proxy] ${method} ${url}`);
        const response = await fetch(url, {
            method,
            headers,
            body: body || undefined
        });

        const arrayBuffer = await response.arrayBuffer();
        // Return as number array (Uint8Array) which is serializable
        // or just let Electron handle the Buffer
        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: Buffer.from(arrayBuffer)
        };
    } catch (error: any) {
        console.error("[Proxy] Error:", error);
        return {
            ok: false,
            error: error.message
        };
    }
});

// -----------------------------------------------------------------------------
// Local Video Stream Server (Bypass Electron Protocol Pipe)
// -----------------------------------------------------------------------------
const STREAM_PORT = 19999;

const streamServer = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
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
        let finalPath = path.normalize(decodedPath);

        // Windows long path support
        if (process.platform === 'win32') {
            if (finalPath.startsWith('\\') && !finalPath.startsWith('\\\\')) {
                finalPath = finalPath.replace(/^\\/, '');
            }
            if (!finalPath.startsWith('\\\\?\\')) {
                finalPath = `\\\\?\\${finalPath}`;
            }
        }

        if (!fs.existsSync(finalPath)) {
            console.error(`[Stream Server] File not found: ${finalPath}`);
            res.writeHead(404);
            res.end('File not found');
            return;
        }

        try {
            const stat = fs.statSync(finalPath);
            const fileSize = stat.size;
            const range = req.headers.range;
            const ext = path.extname(finalPath).toLowerCase();

            let contentType = 'application/octet-stream';
            // Video formats
            if (ext === '.mp4') contentType = 'video/mp4';
            if (ext === '.mkv') contentType = 'video/x-matroska';
            if (ext === '.webm') contentType = 'video/webm';
            if (ext === '.avi') contentType = 'video/x-msvideo';
            if (ext === '.mov') contentType = 'video/quicktime';
            if (ext === '.wmv') contentType = 'video/x-ms-wmv';
            // Subtitle formats
            if (ext === '.vtt') contentType = 'text/vtt';
            if (ext === '.srt') contentType = 'application/x-subrip';
            // Image formats
            if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            if (ext === '.png') contentType = 'image/png';
            if (ext === '.webp') contentType = 'image/webp';
            if (ext === '.gif') contentType = 'image/gif';

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

                const file = fs.createReadStream(finalPath, { start, end });
                file.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': contentType,
                    'Accept-Ranges': 'bytes',
                });

                const file = fs.createReadStream(finalPath);
                file.pipe(res);
            }
        } catch (err) {
            console.error('[Stream Server] Error:', err);
            if (!res.headersSent) {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        }
    } else {
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

function sendToWindow(channel: string, text?: any) {
    if (mainWindow) {
        mainWindow.webContents.send(channel, text);
    }
}

autoUpdater.on('checking-for-update', () => {
    sendToWindow('update-status', 'Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
    sendToWindow('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    sendToWindow('update-not-available', info);
});

autoUpdater.on('error', (err) => {
    sendToWindow('update-error', err.toString());
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    sendToWindow('update-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
    sendToWindow('update-downloaded', info);
});

// Configure Auto Updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
// Enable updates in Dev Mode for testing
if (isDev) {
    autoUpdater.forceDevUpdateConfig = true;
}

// Logger
autoUpdater.logger = console;

// ... (rest of code)

ipcMain.handle("check-for-update", async () => {
    console.log('[AutoUpdate] Manual check triggered');
    try {
        const result = await autoUpdater.checkForUpdates();
        console.log('[AutoUpdate] Check result:', result);
        return result;
    } catch (error) {
        console.error('[AutoUpdate] Error during check:', error);
        throw error;
    }
});

ipcMain.handle("download-update", () => {
    return autoUpdater.downloadUpdate();
});

ipcMain.handle("quit-and-install", () => {
    autoUpdater.quitAndInstall();
});

// DEV: Simulation Handlers
ipcMain.handle("dev-simulate-update-available", () => {
    console.log('[Dev] Simulating update-available');
    sendToWindow('update-available', { version: '2.0.0', releaseNotes: 'Dev Simulation' });
});
ipcMain.handle("dev-simulate-update-progress", () => {
    console.log('[Dev] Simulating update-progress');
    // Simulate a fast download
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        sendToWindow('update-progress', { percent: progress });
        if (progress >= 100) clearInterval(interval);
    }, 200);
});
ipcMain.handle("dev-simulate-update-downloaded", () => {
    console.log('[Dev] Simulating update-downloaded');
    sendToWindow('update-downloaded', { version: '2.0.0' });
});

ipcMain.handle("get-app-version", () => {
    return app.getVersion();
});

app.whenReady().then(() => {
    // Start both
    createSplashWindow();
    createWindow();

    // Check for updates on startup (delay slightly to let UI load)
    setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 3000);

    // Poll for updates every 60 minutes
    setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000);

    // Listen for splash completion
    ipcMain.on('splash-finished', () => {
        if (splashWindow) {
            splashWindow.close();
        }
        if (mainWindow) {
            mainWindow.show();
            mainWindow.maximize();
        }
    });

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
