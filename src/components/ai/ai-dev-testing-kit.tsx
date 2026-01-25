"use client";

import React, { useState } from 'react';
import {
    Bell,
    Calendar,
    Play,
    Trash2,
    Clock,
    MessageSquare,
    Zap,
    Bug,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Volume2,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScheduleStore } from '@/store/schedule-store';
import { useAIMemoryStore } from '@/store/ai-memory-store';
import { useLibraryStore } from '@/store/library-store';
import { useNotificationStore, sendSystemNotification } from '@/store/notification-store';
import { aiNotificationService } from '@/lib/ai-notifications';
import { parseTimeFromMessage, createScheduleFromMessage } from '@/lib/schedule-parser';

/**
 * AI Developer Testing Kit
 * Only visible in Developer Mode
 * Allows testing notifications, schedules, and AI responses
 */
export function AIDevTestingKit() {
    const [isExpanded, setIsExpanded] = useState(true);
    const [logs, setLogs] = useState<string[]>([]);
    const [testMessage, setTestMessage] = useState('');
    const [parseResult, setParseResult] = useState<any>(null);

    const { devMode } = useLibraryStore();
    const scheduleStore = useScheduleStore();
    const memoryStore = useAIMemoryStore();
    const notificationStore = useNotificationStore();

    // Only show in dev mode
    if (!devMode) return null;

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
    };

    // Test In-App Notifications
    const testStartNotification = () => {
        addLog('Sending START notification (in-app + system)...');
        aiNotificationService.notify({
            type: 'reminder',
            title: '⏰ Study Time!',
            message: 'Time to start: React Fundamentals! 📚',
            priority: 'high',
            actions: [
                { label: 'Start Now', action: 'test-start' },
                { label: 'Snooze 15m', action: 'test-snooze' }
            ]
        });
    };

    const testDelayedNotification = () => {
        addLog('Sending DELAYED notification...');
        aiNotificationService.notify({
            type: 'reminder',
            title: '📝 Gentle Reminder',
            message: 'Hey! You planned to start studying 15 minutes ago. Ready to begin?',
            priority: 'medium',
            actions: [
                { label: "I'm Starting", action: 'test-start' },
                { label: 'Skip Today', action: 'test-skip' }
            ]
        });
    };

    const testEncouragementNotification = () => {
        addLog('Sending ENCOURAGEMENT notification...');
        aiNotificationService.notify({
            type: 'encouragement',
            title: '💪 You Got This!',
            message: 'As Luffy says: "I don\'t want to conquer anything. I just think the guy with the most freedom is the Pirate King!" Go learn something new! 🏴‍☠️',
            priority: 'low',
            actions: [
                { label: 'Start Studying', action: 'open-library' },
                { label: 'Later', action: 'dismiss' }
            ]
        });
    };

    const testQuestionNotification = () => {
        addLog('Sending DAILY QUESTION notification...');
        aiNotificationService.notify({
            type: 'question',
            title: '💭 Daily Question',
            message: "What's one thing you'd love to learn this week?",
            priority: 'low'
        });
    };

    // Test System Notification Only
    const testSystemNotificationOnly = () => {
        addLog('Sending SYSTEM ONLY notification...');
        sendSystemNotification({
            id: 'test-system',
            type: 'reminder',
            title: '🔔 System Notification Test',
            message: 'This is a test of the system notification (outside of app)',
            priority: 'high',
            createdAt: Date.now(),
            read: false
        });
    };

    // Force check reminders
    const forceCheckReminders = () => {
        addLog('Force checking pending reminders...');
        aiNotificationService.forceCheck();
        const pending = scheduleStore.getPendingReminders();
        addLog(`Found ${pending.length} pending reminders`);
    };

    // Test Schedule Creation
    const createInstantSchedule = () => {
        const now = Date.now();
        const taskId = scheduleStore.addTask({
            title: 'Test Study Session',
            scheduledStart: now + 60000, // 1 minute from now
            scheduledEnd: now + 3660000  // 1 hour 1 minute from now
        });
        addLog(`Created instant schedule (ID: ${taskId}) - triggers in 1 minute`);
        addLog('System notification sent for schedule creation!');
    };

    const create30SecSchedule = () => {
        const now = Date.now();
        const taskId = scheduleStore.addTask({
            title: 'Test: 30 Sec Reminder',
            scheduledStart: now + 30000, // 30 seconds
            scheduledEnd: now + 3630000
        });
        addLog(`Created 30-second schedule (ID: ${taskId})`);

        // Send immediate system notification
        sendSystemNotification({
            id: 'schedule-created',
            type: 'reminder',
            title: '📅 Schedule Created',
            message: 'Test reminder will trigger in 30 seconds!',
            priority: 'medium',
            createdAt: Date.now(),
            read: false
        });
    };

    const create5MinSchedule = () => {
        const now = Date.now();
        const taskId = scheduleStore.addTask({
            title: 'Test: 5 Min Reminder',
            scheduledStart: now + 5 * 60000,
            scheduledEnd: now + 65 * 60000
        });
        addLog(`Created 5-minute schedule (ID: ${taskId})`);
    };

    // Test Time Parser
    const testParser = () => {
        if (!testMessage) return;

        const result = parseTimeFromMessage(testMessage);
        setParseResult(result);
        addLog(`Parsed: "${testMessage}" => ${JSON.stringify(result)}`);
    };

    const testAutoSchedule = () => {
        if (!testMessage) return;

        const result = createScheduleFromMessage(testMessage);
        if (result.created) {
            addLog(`AUTO-CREATED: ${result.message}`);
        } else {
            addLog('No schedule intent detected in message');
        }
        setParseResult(result);
    };

    // Clear all test data
    const clearAllSchedules = () => {
        const tasks = scheduleStore.tasks;
        tasks.forEach(t => scheduleStore.deleteTask(t.id));
        addLog(`Cleared ${tasks.length} scheduled tasks`);
    };

    const clearMemory = () => {
        memoryStore.clearChatHistory();
        addLog('Cleared AI chat history');
    };

    const clearNotifications = () => {
        notificationStore.clearAll();
        addLog('Cleared all notifications');
    };

    // View current state
    const logCurrentState = () => {
        const tasks = scheduleStore.tasks;
        const reminders = scheduleStore.pendingReminders;
        const facts = memoryStore.facts;
        const notifications = notificationStore.notifications;

        addLog(`--- CURRENT STATE ---`);
        addLog(`Tasks: ${tasks.length}, Reminders: ${reminders.length}`);
        addLog(`Facts: ${facts.length}, Notifications: ${notifications.length}`);
        addLog(`Unread: ${notificationStore.unreadCount}`);
        tasks.forEach(t => addLog(`  Task: "${t.title}" @ ${new Date(t.scheduledStart).toLocaleTimeString()} [${t.status}]`));
        reminders.forEach(r => addLog(`  Reminder: ${r.type} @ ${new Date(r.scheduledFor).toLocaleTimeString()} [sent: ${r.sent}]`));
    };

    return (
        <div className="fixed bottom-6 right-44 z-50 w-96 bg-[#111] border border-yellow-500/30 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div
                className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-yellow-400" />
                    <span className="font-medium text-yellow-400 text-sm">AI Dev Testing Kit</span>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-yellow-400" /> : <ChevronUp className="h-4 w-4 text-yellow-400" />}
            </div>

            {isExpanded && (
                <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                    {/* Notification Tests */}
                    <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                            <Bell className="h-3 w-3" /> IN-APP + SYSTEM NOTIFICATIONS
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={testStartNotification}>
                                <Play className="h-3 w-3 mr-1" /> Start
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={testDelayedNotification}>
                                <Clock className="h-3 w-3 mr-1" /> Delayed
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={testEncouragementNotification}>
                                <Zap className="h-3 w-3 mr-1" /> Encourage
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={testQuestionNotification}>
                                <MessageSquare className="h-3 w-3 mr-1" /> Question
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-blue-500/10" onClick={testSystemNotificationOnly}>
                                <Volume2 className="h-3 w-3 mr-1" /> System Only
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-orange-500/10" onClick={forceCheckReminders}>
                                <RefreshCw className="h-3 w-3 mr-1" /> Force Check
                            </Button>
                        </div>
                    </div>

                    {/* Schedule Tests */}
                    <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> TEST SCHEDULES
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-yellow-500/10" onClick={create30SecSchedule}>
                                +30s
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={createInstantSchedule}>
                                +1 min
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={create5MinSchedule}>
                                +5 min
                            </Button>
                        </div>
                    </div>

                    {/* Parser Test */}
                    <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2">TEST PARSER</h4>
                        <input
                            type="text"
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="e.g., remind me at 6:40 to study"
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white mb-2"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={testParser}>
                                Parse Only
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-green-500/10" onClick={testAutoSchedule}>
                                Parse + Create
                            </Button>
                        </div>
                        {parseResult && (
                            <pre className="mt-2 p-2 bg-black/50 rounded text-[10px] text-green-400 overflow-x-auto">
                                {JSON.stringify(parseResult, null, 2)}
                            </pre>
                        )}
                    </div>

                    {/* Utilities */}
                    <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2">UTILITIES</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={logCurrentState}>
                                <Eye className="h-3 w-3 mr-1" /> View State
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-400" onClick={clearAllSchedules}>
                                <Trash2 className="h-3 w-3 mr-1" /> Schedules
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-400" onClick={clearNotifications}>
                                <Trash2 className="h-3 w-3 mr-1" /> Notifs
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-400" onClick={clearMemory}>
                                <Trash2 className="h-3 w-3 mr-1" /> Memory
                            </Button>
                        </div>
                    </div>

                    {/* Logs */}
                    <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2">LOGS</h4>
                        <div className="h-32 overflow-y-auto bg-black/50 rounded p-2 font-mono text-[10px]">
                            {logs.length === 0 ? (
                                <span className="text-gray-500">No logs yet...</span>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="text-gray-300">{log}</div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

