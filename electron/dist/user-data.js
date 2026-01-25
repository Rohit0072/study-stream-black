"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userDataManager = exports.UserDataManager = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DATA_FILE = 'user-data.json';
const DEFAULT_DATA = {
    lastStudyDate: '',
    dailyStudySeconds: 0,
    totalStudySeconds: 0,
    streak: 0
};
class UserDataManager {
    constructor() {
        this.dataPath = path_1.default.join(electron_1.app.getPath('userData'), DATA_FILE);
        this.data = this.loadData();
    }
    loadData() {
        try {
            if (fs_1.default.existsSync(this.dataPath)) {
                const raw = fs_1.default.readFileSync(this.dataPath, 'utf-8');
                return Object.assign(Object.assign({}, DEFAULT_DATA), JSON.parse(raw));
            }
        }
        catch (e) {
            console.error('[UserData] Failed to load:', e);
        }
        return Object.assign({}, DEFAULT_DATA);
    }
    saveData() {
        try {
            fs_1.default.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
        }
        catch (e) {
            console.error('[UserData] Failed to save:', e);
        }
    }
    getStudyData() {
        return this.data;
    }
    updateStudyTime(seconds) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        if (this.data.lastStudyDate !== today) {
            // New day
            if (this.data.lastStudyDate) {
                // Check if streak is broken (missed yesterday)
                const yesterdayDate = new Date();
                yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                const yYear = yesterdayDate.getFullYear();
                const yMonth = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
                const yDay = String(yesterdayDate.getDate()).padStart(2, '0');
                const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;
                if (this.data.lastStudyDate === yesterdayStr) {
                    this.data.streak += 1;
                }
                else if (this.data.lastStudyDate < yesterdayStr) {
                    this.data.streak = 1;
                }
            }
            else {
                this.data.streak = 1;
            }
            this.data.lastStudyDate = today;
            this.data.dailyStudySeconds = 0;
        }
        this.data.dailyStudySeconds += seconds;
        this.data.totalStudySeconds += seconds;
        this.saveData();
    }
    hasStudiedToday() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        return this.data.lastStudyDate === today && this.data.dailyStudySeconds > 0;
    }
}
exports.UserDataManager = UserDataManager;
exports.userDataManager = new UserDataManager();
