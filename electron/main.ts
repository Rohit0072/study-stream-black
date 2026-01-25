import { app, BrowserWindow, ipcMain, dialog, protocol, net, Tray, Menu, nativeImage, Notification, shell } from "electron";

import path from "path";
import serve from "electron-serve";
import fs from "fs";
import http from "http";
import { autoUpdater } from "electron-updater";
import notifier from "node-notifier";
import { userDataManager } from "./user-data";

// Configure Auto Updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Set App User Model ID for Windows Notifications
// Critical for notifications to work on Windows 10/11
if (process.platform === 'win32') {
    app.setAppUserModelId("com.studystream.app");
}

// Logger
autoUpdater.logger = console;

const loadURL = serve({ directory: "out" });

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
const isDev = !app.isPackaged || process.env.NODE_ENV === "development";

console.log("---------------------------------------------------");
console.log("   ELECTRON MAIN PROCESS STARTING - PRODUCTION FIXES");
console.log("---------------------------------------------------");

// Enable updates in Dev Mode for testing
if (isDev) {
    autoUpdater.forceDevUpdateConfig = true;
}

// --- SINGLE INSTANCE LOCK ---
// Only enforce lock in production to allow dev and prod to run simultaneously
let hasLock = true;
if (!isDev) {
    hasLock = app.requestSingleInstanceLock();
}

if (!hasLock) {
    console.log("[Main] Another instance is already running. Quitting...");
    app.quit();
} else {
    // Only register second-instance handler if we successfully got the lock (or are in dev)
    if (!isDev) {
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            // Someone tried to run a second instance, we should focus our window.
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            }
        });
    }

    // Register privileged schemes immediately
    protocol.registerSchemesAsPrivileged([
        { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, allowServiceWorkers: true, corsEnabled: true } },
        { scheme: 'video', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
    ]);

    // ... (App initialization continues below)
}

function getIconPath() {
    if (isDev) {
        return path.join(process.cwd(), "icons/icon.png");
    }
    // In production (ASAR), icons are typically in resources/ directory dependent on builder config
    // or inside the asar. We'll try standard resource path first.
    // path.join(process.resourcesPath, "icons/icon.png") is common for external resources
    // But if included in build.files, it might be in app.getAppPath()

    // Attempt 1: Inside ASAR/App Path
    let icon = path.join(app.getAppPath(), "icons/icon.png");
    if (fs.existsSync(icon)) return icon;

    // Attempt 2: Resources path (external)
    icon = path.join(process.resourcesPath, "icons/icon.png");
    return icon;
}

function createWindow() {
    const iconPath = getIconPath();
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: "#000000",
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
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
    } else {
        loadURL(mainWindow);
    }

    mainWindow.on("close", (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
            return false;
        }
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

function createTray() {
    const iconPath = getIconPath();
    const trayIcon = nativeImage.createFromPath(iconPath);

    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App',
            click: () => {
                mainWindow?.show();
            }
        },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Study Stream');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow?.show();
    });
}

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 600,
        height: 400,
        backgroundColor: "#000000",
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (isDev) {
        splashWindow.loadURL("http://localhost:3000/splash");
    } else {
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
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        // console.log(`[Scan] Checking subtitles for: ${baseName} in ${dirPath}`);

        entries.forEach(entry => {
            if (!entry.isFile()) return;
            const ext = path.extname(entry.name).toLowerCase();
            if (!SUBTITLE_EXTENSIONS.includes(ext)) return;

            // Check if subtitle filename starts with video basename
            if (entry.name.startsWith(baseName)) {
                // console.log(`[Scan] Found potential subtitle: ${entry.name}`);
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

                subtitles.push({
                    path: path.join(dirPath, entry.name),
                    lang,
                    label
                });
            }
        });
    } catch (e) {
        console.error(`[Scan] Error scanning subtitles in ${dirPath}:`, e);
    }
    return subtitles;
}

const scanDirectory = (dirPath: string) => {
    try {
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
    } catch (e) {
        console.error("Error scanning directory:", e);
        return null;
    }
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
    console.log(`[Notification] Request received: "${title}"`);
    const iconPath = getIconPath();

    return new Promise((resolve) => {
        try {
            // Use node-notifier for reliable cross-platform notifications
            notifier.notify(
                {
                    title: title,
                    message: body,
                    icon: iconPath,
                    sound: true,
                    wait: true,
                    appID: "com.studystream.app"
                },
                (err, response, metadata) => {
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
                    } else {
                        console.log('[Notification] Sent successfully via node-notifier');
                        resolve(true);
                    }
                }
            );

            // Handle notification click - show and focus the app
            notifier.on('click', () => {
                console.log('[Notification] Clicked - focusing window');
                if (mainWindow) {
                    mainWindow.show();
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                }
            });

        } catch (error) {
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
// Local Video Stream Server (Dynamic Port Selection)
// -----------------------------------------------------------------------------
let STREAM_PORT = 19999;

const findAvailablePort = (startPort: number): Promise<number> => {
    return new Promise((resolve, reject) => {
        const server = http.createServer();
        server.listen(startPort, '127.0.0.1', () => {
            const address = server.address();
            server.close(() => {
                // Port is available
                // @ts-ignore
                resolve(address.port);
            });
        });

        server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                // Port is in use, try next one
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
};


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

ipcMain.handle("get-app-version", () => {
    return app.getVersion();
});

// -----------------------------------------------------------------------------
// Auto-Start with Windows (Registry Entry)
// -----------------------------------------------------------------------------

const AUTO_START_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const AUTO_START_NAME = 'StudyStream';

ipcMain.handle("set-auto-start", async (event, enabled: boolean) => {
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
                exec(command, (error: any) => {
                    if (error) {
                        console.error('[AutoStart] Failed to add registry entry:', error);
                        resolve(false);
                    } else {
                        console.log('[AutoStart] Successfully enabled');
                        resolve(true);
                    }
                });
            });
        } else {
            // Remove from registry
            const command = `reg delete "${AUTO_START_KEY}" /v "${AUTO_START_NAME}" /f`;
            console.log('[AutoStart] Disabling auto-start...');

            return new Promise((resolve) => {
                exec(command, (error: any) => {
                    if (error) {
                        console.log('[AutoStart] Registry entry may not exist, which is fine');
                    }
                    console.log('[AutoStart] Successfully disabled');
                    resolve(true);
                });
            });
        }
    } catch (error) {
        console.error('[AutoStart] Error:', error);
        return false;
    }
});

ipcMain.handle("get-auto-start", async () => {
    if (process.platform !== 'win32') return false;

    try {
        const { exec } = require('child_process');
        const command = `reg query "${AUTO_START_KEY}" /v "${AUTO_START_NAME}"`;

        return new Promise((resolve) => {
            exec(command, (error: any) => {
                resolve(!error); // Returns true if entry exists
            });
        });
    } catch (error) {
        return false;
    }
});

// -----------------------------------------------------------------------------
// Background Scheduler (Main Process)
// Sends notifications even when window is hidden/minimized
// -----------------------------------------------------------------------------

let backgroundSchedulerInterval: NodeJS.Timeout | null = null;
let lastStudyCheckDate: string = '';

function startBackgroundScheduler() {
    if (backgroundSchedulerInterval) return;

    console.log('[BackgroundScheduler] Starting...');

    backgroundSchedulerInterval = setInterval(async () => {
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
            notifier.notify({
                title: "📚 Time to Study!",
                message: "You haven't studied today. Even 15 minutes makes a difference!",
                icon: getIconPath(),
                sound: true,
                wait: true,
                appID: "com.studystream.app"
            });
        }
    }, 60000); // Check every minute
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
        app.setAppUserModelId(appId);

        try {
            const shortcutPath = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Study Stream.lnk');
            const targetExe = process.execPath;
            const iconPath = getIconPath().replace('.png', '.ico'); // Best effort assumption

            // console.log('[Windows] Creating/Updating Start Menu Shortcut for Notifications...');

            const success = shell.writeShortcutLink(shortcutPath, 'create', {
                target: targetExe,
                cwd: process.cwd(),
                args: '.',
                appUserModelId: appId,
                icon: iconPath,
                iconIndex: 0,
                description: 'Study Stream AI Companion'
            });
            // console.log('[Windows] Shortcut creation result:', success ? 'Success' : 'Failed');
        } catch (e) {
            console.error('[Windows] Failed to create notification shortcut:', e);
        }
    }
}

if (hasLock) {
    // Check if started with --minimized flag (auto-start mode)
    const isMinimizedStart = process.argv.includes('--minimized');

    app.whenReady().then(() => {
        setupWindowsNotifications();

        // Start background scheduler (runs in main process)
        startBackgroundScheduler();

        if (isMinimizedStart) {
            // Auto-start mode: only show tray, don't show window
            console.log('[Main] Starting minimized to tray (auto-start mode)');
            createWindow();
            createTray();
            // Window stays hidden, app runs in background
        } else {
            // Normal start: show splash and window
            createSplashWindow();
            createWindow();
            createTray();
        }

        // Listen for splash completion
        ipcMain.on('splash-finished', () => {
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
                autoUpdater.checkForUpdatesAndNotify();
            }, 2000);
        });

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on("window-all-closed", () => {
        // Keep app running in tray unless explicit quit
        if (process.platform !== "darwin" && isQuitting) {
            app.quit();
        }
    });
}

