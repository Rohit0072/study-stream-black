import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    StudySchedule,
    ScheduledTask,
    RecurringSchedule,
    Reminder
} from '@/types';

// ============================================
// SCHEDULE STORE
// Manages study tasks, recurring schedules, and reminders
// ============================================

interface ScheduleState extends StudySchedule {
    // Task actions
    addTask: (task: Omit<ScheduledTask, 'id' | 'status' | 'remindersSent' | 'createdAt'>) => string;
    updateTask: (id: string, updates: Partial<ScheduledTask>) => void;
    deleteTask: (id: string) => void;
    startTask: (id: string) => void;
    completeTask: (id: string) => void;
    missTask: (id: string) => void;
    snoozeTask: (id: string, minutes: number) => void;

    // Recurring schedule actions
    addRecurringSchedule: (schedule: Omit<RecurringSchedule, 'id' | 'createdAt'>) => string;
    updateRecurringSchedule: (id: string, updates: Partial<RecurringSchedule>) => void;
    deleteRecurringSchedule: (id: string) => void;
    toggleRecurringSchedule: (id: string) => void;

    // Reminder actions
    addReminder: (reminder: Omit<Reminder, 'id' | 'sent'>) => void;
    markReminderSent: (id: string) => void;
    dismissReminder: (id: string) => void;

    // Query helpers
    getUpcomingTasks: (hours?: number) => ScheduledTask[];
    getTodaysTasks: () => ScheduledTask[];
    getPendingReminders: () => Reminder[];
    getTaskById: (id: string) => ScheduledTask | undefined;

    // Utility
    generateRemindersForTask: (taskId: string) => void;
    cleanupOldTasks: (daysOld?: number) => void;
}

const defaultState: StudySchedule = {
    tasks: [],
    recurringSchedules: [],
    pendingReminders: []
};

// Helper: Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper: Get today's start and end timestamps
const getTodayRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return { start, end };
};

// SSR-safe storage
const getStorage = () => {
    if (typeof window === 'undefined') {
        return {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { }
        };
    }
    return localStorage;
};

export const useScheduleStore = create<ScheduleState>()(
    persist(
        (set, get) => ({
            ...defaultState,

            // ===== TASK ACTIONS =====
            addTask: (taskData) => {
                const id = generateId();
                const newTask: ScheduledTask = {
                    ...taskData,
                    id,
                    status: 'pending',
                    remindersSent: [],
                    createdAt: Date.now()
                };

                set((state) => ({
                    tasks: [...state.tasks, newTask]
                }));

                // Auto-generate reminders for the task
                get().generateRemindersForTask(id);

                console.log('[Schedule] Added task:', newTask.title);
                return id;
            },

            updateTask: (id, updates) => {
                set((state) => ({
                    tasks: state.tasks.map(t =>
                        t.id === id ? { ...t, ...updates } : t
                    )
                }));
            },

            deleteTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.filter(t => t.id !== id),
                    pendingReminders: state.pendingReminders.filter(r => r.taskId !== id)
                }));
            },

            startTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.map(t =>
                        t.id === id ? { ...t, status: 'started' as const } : t
                    )
                }));
                console.log('[Schedule] Task started:', id);
            },

            completeTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.map(t =>
                        t.id === id
                            ? { ...t, status: 'completed' as const, completedAt: Date.now() }
                            : t
                    ),
                    pendingReminders: state.pendingReminders.filter(r => r.taskId !== id)
                }));
                console.log('[Schedule] Task completed:', id);
            },

            missTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.map(t =>
                        t.id === id ? { ...t, status: 'missed' as const } : t
                    )
                }));
            },

            snoozeTask: (id, minutes) => {
                const snoozeTime = minutes * 60 * 1000;
                set((state) => ({
                    tasks: state.tasks.map(t =>
                        t.id === id
                            ? {
                                ...t,
                                status: 'snoozed' as const,
                                scheduledStart: t.scheduledStart + snoozeTime,
                                scheduledEnd: t.scheduledEnd + snoozeTime
                            }
                            : t
                    )
                }));

                // Regenerate reminders with new time
                get().generateRemindersForTask(id);
            },

            // ===== RECURRING SCHEDULE ACTIONS =====
            addRecurringSchedule: (scheduleData) => {
                const id = generateId();
                const newSchedule: RecurringSchedule = {
                    ...scheduleData,
                    id,
                    createdAt: Date.now()
                };

                set((state) => ({
                    recurringSchedules: [...state.recurringSchedules, newSchedule]
                }));

                console.log('[Schedule] Added recurring schedule:', newSchedule.title);
                return id;
            },

            updateRecurringSchedule: (id, updates) => {
                set((state) => ({
                    recurringSchedules: state.recurringSchedules.map(s =>
                        s.id === id ? { ...s, ...updates } : s
                    )
                }));
            },

            deleteRecurringSchedule: (id) => {
                set((state) => ({
                    recurringSchedules: state.recurringSchedules.filter(s => s.id !== id)
                }));
            },

            toggleRecurringSchedule: (id) => {
                set((state) => ({
                    recurringSchedules: state.recurringSchedules.map(s =>
                        s.id === id ? { ...s, isActive: !s.isActive } : s
                    )
                }));
            },

            // ===== REMINDER ACTIONS =====
            addReminder: (reminderData) => {
                const newReminder: Reminder = {
                    ...reminderData,
                    id: generateId(),
                    sent: false
                };

                set((state) => ({
                    pendingReminders: [...state.pendingReminders, newReminder]
                }));
            },

            markReminderSent: (id) => {
                set((state) => ({
                    pendingReminders: state.pendingReminders.map(r =>
                        r.id === id ? { ...r, sent: true } : r
                    )
                }));
            },

            dismissReminder: (id) => {
                set((state) => ({
                    pendingReminders: state.pendingReminders.map(r =>
                        r.id === id ? { ...r, dismissedAt: Date.now() } : r
                    )
                }));
            },

            // ===== QUERY HELPERS =====
            getUpcomingTasks: (hours = 24) => {
                const now = Date.now();
                const future = now + hours * 60 * 60 * 1000;

                return get().tasks.filter(t =>
                    t.status === 'pending' &&
                    t.scheduledStart >= now &&
                    t.scheduledStart <= future
                ).sort((a, b) => a.scheduledStart - b.scheduledStart);
            },

            getTodaysTasks: () => {
                const { start, end } = getTodayRange();

                return get().tasks.filter(t =>
                    t.scheduledStart >= start && t.scheduledStart < end
                ).sort((a, b) => a.scheduledStart - b.scheduledStart);
            },

            getPendingReminders: () => {
                const now = Date.now();

                return get().pendingReminders.filter(r =>
                    !r.sent &&
                    !r.dismissedAt &&
                    r.scheduledFor <= now
                );
            },

            getTaskById: (id) => {
                return get().tasks.find(t => t.id === id);
            },

            // ===== UTILITY =====
            generateRemindersForTask: (taskId) => {
                const task = get().getTaskById(taskId);
                if (!task) return;

                // Remove existing reminders for this task
                set((state) => ({
                    pendingReminders: state.pendingReminders.filter(r => r.taskId !== taskId)
                }));

                const reminders: Omit<Reminder, 'id' | 'sent'>[] = [];

                // Reminder at start time
                reminders.push({
                    taskId,
                    type: 'start',
                    scheduledFor: task.scheduledStart,
                    message: `Time to start: ${task.title}! 📚`
                });

                // Reminder 15 min after start if not started
                reminders.push({
                    taskId,
                    type: 'delayed_start',
                    scheduledFor: task.scheduledStart + 15 * 60 * 1000,
                    message: `Hey! You planned to start "${task.title}" 15 minutes ago. Ready to begin?`
                });

                // Completion reminder at end time
                reminders.push({
                    taskId,
                    type: 'completion',
                    scheduledFor: task.scheduledEnd,
                    message: `Great job completing your study session! 🎉`
                });

                // Add all reminders
                reminders.forEach(r => get().addReminder(r));

                console.log('[Schedule] Generated', reminders.length, 'reminders for task:', taskId);
            },

            cleanupOldTasks: (daysOld = 30) => {
                const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;

                set((state) => ({
                    tasks: state.tasks.filter(t =>
                        t.createdAt > cutoff || t.status === 'pending'
                    )
                }));
            }
        }),
        {
            name: 'schedule-store',
            storage: createJSONStorage(() => getStorage() as Storage),
            partialize: (state) => ({
                tasks: state.tasks,
                recurringSchedules: state.recurringSchedules,
                pendingReminders: state.pendingReminders
            })
        }
    )
);
