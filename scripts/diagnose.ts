import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..');

const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    bold: "\x1b[1m"
};

function log(type: 'SUCCESS' | 'ERROR' | 'WARN' | 'INFO', msg: string) {
    const color = type === 'SUCCESS' ? colors.green : type === 'ERROR' ? colors.red : type === 'WARN' ? colors.yellow : colors.cyan;
    console.log(`${color}[${type}] ${msg}${colors.reset}`);
}

async function diagnose() {
    console.log(`${colors.bold}Starting System Diagnosis...${colors.reset}\n`);
    let errorCount = 0;
    let warnCount = 0;

    // 1. Check package.json
    try {
        const pkgPath = path.join(projectRoot, 'package.json');
        if (!fs.existsSync(pkgPath)) throw new Error("package.json not found");

        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        log('INFO', `App Name: ${pkg.name}`);
        log('INFO', `Version: ${pkg.version}`);

        if (pkg.build?.publish?.[0]?.provider !== 'github') {
            log('ERROR', 'Build publish provider is not "github"');
            errorCount++;
        } else {
            log('SUCCESS', `Update Provider: GitHub (${pkg.build.publish[0].owner}/${pkg.build.publish[0].repo})`);
        }

        if (pkg.build?.productName !== 'Study Stream') {
            log('WARN', `productName is "${pkg.build?.productName}", ensure this matches your expectation for the installer name.`);
            warnCount++;
        }

    } catch (e: any) {
        log('ERROR', `package.json check failed: ${e.message}`);
        errorCount++;
    }

    // 2. Check Store Persistence (Library Store)
    try {
        const storePath = path.join(projectRoot, 'src', 'store', 'library-store.ts');
        const content = fs.readFileSync(storePath, 'utf-8');

        if (content.includes('localStorage')) {
            log('SUCCESS', 'LibraryStore is using "localStorage" (Synchronous/Reliable).');
        } else if (content.includes('idb-keyval')) {
            log('WARN', 'LibraryStore is using "idb-keyval". This caused data loss issues previously. Recommend switching to localStorage.');
            warnCount++;
        } else {
            log('ERROR', 'Could not determine storage adapter in LibraryStore.');
            errorCount++;
        }

        if (!content.includes('name: \'library-storage-v3\'')) {
            log('WARN', 'Storage version is not "v3". You might not have reset the data structure yet.');
            warnCount++;
        }
    } catch (e: any) {
        log('ERROR', `LibraryStore check failed: ${e.message}`);
        errorCount++;
    }

    // 3. Check Electron Main Process (Update Logic)
    try {
        const mainPath = path.join(projectRoot, 'electron', 'main.ts');
        const content = fs.readFileSync(mainPath, 'utf-8');

        if (content.includes('ipcMain.handle("get-app-version"')) {
            log('SUCCESS', 'IPC handler "get-app-version" is present.');
        } else {
            log('ERROR', 'IPC handler "get-app-version" is MISSING. Version display in HelpModal will fail.');
            errorCount++;
        }

        if (content.includes('autoUpdater.checkForUpdatesAndNotify()')) {
            log('SUCCESS', 'Auto-updater polling is configured.');
        } else {
            log('WARN', 'Auto-updater polling seems missing.');
            warnCount++;
        }
    } catch (e: any) {
        log('ERROR', `Main Process check failed: ${e.message}`);
        errorCount++;
    }

    // 4. Check Preload (Exposure)
    try {
        const preloadPath = path.join(projectRoot, 'electron', 'preload.ts');
        const content = fs.readFileSync(preloadPath, 'utf-8');

        if (content.includes('getAppVersion:')) {
            log('SUCCESS', 'Preload exposes "getAppVersion".');
        } else {
            log('ERROR', 'Preload does NOT expose "getAppVersion".');
            errorCount++;
        }
    } catch (e: any) {
        log('ERROR', `Preload check failed: ${e.message}`);
        errorCount++;
    }

    // 5. Check UI (HelpModal)
    try {
        const helpPath = path.join(projectRoot, 'src', 'components', 'layout', 'help-modal.tsx');
        const content = fs.readFileSync(helpPath, 'utf-8');

        if (content.includes('electron.getAppVersion()')) {
            log('SUCCESS', 'HelpModal calls "electron.getAppVersion()".');
        } else {
            log('WARN', 'HelpModal might not be dynamically fetching version.');
            warnCount++;
        }
    } catch (e: any) {
        log('ERROR', `HelpModal check failed: ${e.message}`);
        errorCount++;
    }

    console.log(`\n${colors.bold}Diagnosis Complete.${colors.reset}`);
    console.log(`Errors: ${errorCount > 0 ? colors.red : colors.green}${errorCount}${colors.reset}`);
    console.log(`Warnings: ${warnCount > 0 ? colors.yellow : colors.green}${warnCount}${colors.reset}`);

    if (errorCount === 0) {
        console.log(`\n${colors.green}System appears healthy! Ready for testing.${colors.reset}`);
    } else {
        console.log(`\n${colors.red}Please fix the critical errors above.${colors.reset}`);
    }
}

diagnose();
