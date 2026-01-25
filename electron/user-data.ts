import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const DATA_FILE = 'user-data.json';

interface UserData {
    lastStudyDate: string;
    dailyStudySeconds: number;
    totalStudySeconds: number;
    streak: number;
}

const DEFAULT_DATA: UserData = {
    lastStudyDate: '',
    dailyStudySeconds: 0,
    totalStudySeconds: 0,
    streak: 0
};

export class UserDataManager {
    private dataPath: string;
    private data: UserData;

    constructor() {
        this.dataPath = path.join(app.getPath('userData'), DATA_FILE);
        this.data = this.loadData();
    }

    private loadData(): UserData {
        try {
            if (fs.existsSync(this.dataPath)) {
                const raw = fs.readFileSync(this.dataPath, 'utf-8');
                return { ...DEFAULT_DATA, ...JSON.parse(raw) };
            }
        } catch (e) {
            console.error('[UserData] Failed to load:', e);
        }
        return { ...DEFAULT_DATA };
    }

    private saveData() {
        try {
            fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('[UserData] Failed to save:', e);
        }
    }

    public getStudyData() {
        return this.data;
    }

    public updateStudyTime(seconds: number) {
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
                } else if (this.data.lastStudyDate < yesterdayStr) {
                    this.data.streak = 1;
                }
            } else {
                this.data.streak = 1;
            }
            this.data.lastStudyDate = today;
            this.data.dailyStudySeconds = 0;
        }

        this.data.dailyStudySeconds += seconds;
        this.data.totalStudySeconds += seconds;
        this.saveData();
    }

    public hasStudiedToday(): boolean {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        return this.data.lastStudyDate === today && this.data.dailyStudySeconds > 0;
    }
}

export const userDataManager = new UserDataManager();
