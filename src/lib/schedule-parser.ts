import { useScheduleStore } from '@/store/schedule-store';
import { useLibraryStore } from '@/store/library-store';

// ============================================
// NATURAL LANGUAGE TIME PARSER
// Extracts time and task from user messages
// ============================================

interface ParsedSchedule {
    found: boolean;
    time: string | null;       // "18:40"
    task: string | null;       // "study react"
    timestamp: number | null;  // Unix timestamp
    endTimestamp: number | null;
}

/**
 * Parse time from various formats:
 * - "6:40 PM", "6:40pm", "18:40"
 * - "at 6", "at 6pm"
 * - "in 30 minutes", "in 1 hour"
 */
export function parseTimeFromMessage(message: string): ParsedSchedule {
    const lowerMsg = message.toLowerCase();

    // Check if this is a scheduling message
    const scheduleKeywords = [
        'remind me', 'reminder', 'schedule', 'set alarm',
        'at', 'by', 'before', 'need to', 'want to', 'going to',
        'study', 'learn', 'practice', 'work on'
    ];

    const hasScheduleIntent = scheduleKeywords.some(k => lowerMsg.includes(k));
    if (!hasScheduleIntent) {
        return { found: false, time: null, task: null, timestamp: null, endTimestamp: null };
    }

    const now = new Date();
    let timestamp: number | null = null;
    let timeStr: string | null = null;

    // Pattern 1: "at 6:40 PM" or "at 6:40pm" or "at 18:40"
    const timePattern1 = /(?:at|by|around|@)\s*(\d{1,2})[:\.]?(\d{2})?\s*(am|pm)?/i;
    const match1 = message.match(timePattern1);

    if (match1) {
        let hours = parseInt(match1[1]);
        const minutes = match1[2] ? parseInt(match1[2]) : 0;
        const ampm = match1[3]?.toLowerCase();

        // Convert to 24-hour format
        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        if (!ampm && hours < 12 && hours < now.getHours()) {
            // Assume PM if time has passed in AM
            hours += 12;
        }

        const scheduledDate = new Date(now);
        scheduledDate.setHours(hours, minutes, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (scheduledDate.getTime() < now.getTime()) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        timestamp = scheduledDate.getTime();
        timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Pattern 2: "in X minutes" or "in X hours"
    const relativePattern = /in\s+(\d+)\s*(min|minute|minutes|hour|hours|hr|hrs)/i;
    const match2 = message.match(relativePattern);

    if (!timestamp && match2) {
        const amount = parseInt(match2[1]);
        const unit = match2[2].toLowerCase();

        const scheduledDate = new Date(now);
        if (unit.startsWith('min')) {
            scheduledDate.setMinutes(scheduledDate.getMinutes() + amount);
        } else {
            scheduledDate.setHours(scheduledDate.getHours() + amount);
        }

        timestamp = scheduledDate.getTime();
        timeStr = `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`;
    }

    // Pattern 3: Just a number like "remind me 6:40" or "6:40 study"
    const simpleTimePattern = /\b(\d{1,2})[:\.](\d{2})\s*(am|pm)?\b/i;
    const match3 = message.match(simpleTimePattern);

    if (!timestamp && match3) {
        let hours = parseInt(match3[1]);
        const minutes = parseInt(match3[2]);
        const ampm = match3[3]?.toLowerCase();

        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        if (!ampm && hours <= 12 && hours < now.getHours()) {
            hours += 12;
        }

        const scheduledDate = new Date(now);
        scheduledDate.setHours(hours, minutes, 0, 0);

        if (scheduledDate.getTime() < now.getTime()) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        timestamp = scheduledDate.getTime();
        timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    if (!timestamp) {
        return { found: false, time: null, task: null, timestamp: null, endTimestamp: null };
    }

    // Extract the task description
    const task = extractTaskFromMessage(message);

    // Default duration: 1 hour
    const endTimestamp = timestamp + 60 * 60 * 1000;

    return {
        found: true,
        time: timeStr,
        task,
        timestamp,
        endTimestamp
    };
}

/**
 * Extract task description from message
 */
function extractTaskFromMessage(message: string): string {
    // Remove time-related parts
    let task = message
        .replace(/remind me|reminder|schedule|set alarm/gi, '')
        .replace(/(?:at|by|around|@)\s*\d{1,2}[:\.]?\d{0,2}\s*(am|pm)?/gi, '')
        .replace(/in\s+\d+\s*(min|minute|minutes|hour|hours|hr|hrs)/gi, '')
        .replace(/\b\d{1,2}[:\.](\d{2})\s*(am|pm)?\b/gi, '')
        .replace(/tomorrow|today|tonight/gi, '')
        .replace(/i need to|i want to|i have to|i should|i will|i'm going to/gi, '')
        .replace(/to\s+/gi, '')
        .replace(/that\s+/gi, '')
        .trim();

    // Clean up
    task = task.replace(/^\s*(,|\.|\-|and)\s*/g, '').trim();
    task = task.replace(/\s*(,|\.|\-|and)\s*$/g, '').trim();

    // Capitalize first letter
    if (task.length > 0) {
        task = task.charAt(0).toUpperCase() + task.slice(1);
    }

    return task || 'Study session';
}

/**
 * Create a scheduled task from parsed message
 */
export function createScheduleFromMessage(message: string): { created: boolean; task?: any; message: string } {
    const parsed = parseTimeFromMessage(message);

    if (!parsed.found || !parsed.timestamp) {
        return { created: false, message: '' };
    }

    const scheduleStore = useScheduleStore.getState();
    const libraryStore = useLibraryStore.getState();

    // Create the scheduled task
    const taskId = scheduleStore.addTask({
        title: parsed.task || 'Study session',
        scheduledStart: parsed.timestamp,
        scheduledEnd: parsed.endTimestamp!
    });

    // Also add to todos (task board)
    libraryStore.addTodo(parsed.task || 'Study session', 'daily');

    const task = scheduleStore.getTaskById(taskId);
    const timeFormatted = new Date(parsed.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    console.log('[Schedule Parser] Created task:', { task, timeFormatted });

    return {
        created: true,
        task,
        message: `Got it! I've scheduled "${parsed.task}" for ${timeFormatted}. I'll remind you when it's time! ⏰`
    };
}

/**
 * Check if message contains scheduling intent
 */
export function hasSchedulingIntent(message: string): boolean {
    const parsed = parseTimeFromMessage(message);
    return parsed.found;
}
