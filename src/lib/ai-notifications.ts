import { useScheduleStore } from '@/store/schedule-store';
import { useAIMemoryStore } from '@/store/ai-memory-store';
import { useLibraryStore } from '@/store/library-store';
import { useNotificationStore } from '@/store/notification-store';
import { generateAIResponse } from './ai-context';
import { AINotification, Reminder } from '@/types';

// ============================================
// AI NOTIFICATION SERVICE
// Handles in-app and system notifications
// ============================================

type NotificationCallback = (notification: AINotification) => void;

class AINotificationService {
    private listeners: NotificationCallback[] = [];
    private checkInterval: NodeJS.Timeout | null = null;
    private isRunning = false;

    /**
     * Subscribe to notifications
     */
    subscribe(callback: NotificationCallback): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Emit notification to all listeners and store
     */
    private emit(notification: AINotification): void {
        // Add to notification store (this also sends system notification)
        if (typeof window !== 'undefined') {
            try {
                const notificationStore = useNotificationStore.getState();
                notificationStore.addNotification({
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    priority: notification.priority,
                    actions: notification.actions
                });
            } catch (error) {
                console.error('[Notifications] Store error:', error);
            }
        }

        // Also notify legacy listeners
        this.listeners.forEach(listener => listener(notification));
    }

    /**
     * Create and emit an AI notification
     */
    notify(options: Omit<AINotification, 'id' | 'createdAt' | 'read'>): void {
        const notification: AINotification = {
            ...options,
            id: Math.random().toString(36).substring(2, 15),
            createdAt: Date.now(),
            read: false
        };

        console.log('[Notifications] Sending:', notification.type, notification.title);
        this.emit(notification);
    }

    /**
     * Start the background scheduler (checks reminders every 30 seconds for faster response)
     */
    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log('[Notifications] Starting background scheduler...');

        // Check immediately
        this.checkPendingReminders();
        this.checkDailyQuestion();
        this.checkIdleUser();

        // Then check every 30 seconds (more responsive)
        this.checkInterval = setInterval(() => {
            this.checkPendingReminders();
            this.checkIdleUser();
        }, 30 * 1000);
    }

    /**
     * Stop the background scheduler
     */
    stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('[Notifications] Stopped background scheduler');
    }

    /**
     * Force check - can be called manually
     */
    forceCheck(): void {
        console.log('[Notifications] Force checking reminders...');
        this.checkPendingReminders();
    }

    /**
     * Check and send pending reminders
     */
    private checkPendingReminders(): void {
        const scheduleStore = useScheduleStore.getState();
        const pendingReminders = scheduleStore.getPendingReminders();

        // Log heartbeat only if there are pending reminders to avoid spam, 
        // OR log every time during debug phase (let's do every time for now)
        console.log(`[Scheduler] Checking ${pendingReminders.length} pending reminders...`);

        pendingReminders.forEach((reminder: Reminder) => {
            const task = scheduleStore.getTaskById(reminder.taskId);
            console.log(`[Scheduler] Processing reminder for task: ${task?.title} (${task?.status})`);

            // Skip if task doesn't exist or is already completed
            if (!task || task.status === 'completed') {
                console.log('[Scheduler] Task completed or missing, marking sent');
                scheduleStore.markReminderSent(reminder.id);
                return;
            }

            // Skip delayed_start reminder if task already started
            if (reminder.type === 'delayed_start' && task.status === 'started') {
                console.log('[Scheduler] Task started, skipping delayed reminder');
                scheduleStore.markReminderSent(reminder.id);
                return;
            }

            // Skip completion reminder if task not completed
            if (reminder.type === 'completion' && (task.status as string) !== 'completed') {
                // Don't send completion message if they didn't complete
                scheduleStore.markReminderSent(reminder.id);
                return;
            }

            // Send the notification
            console.log('[Scheduler] Sending notification now!');
            this.notify({
                type: 'reminder',
                title: this.getReminderTitle(reminder.type),
                message: reminder.message,
                priority: reminder.type === 'start' ? 'high' : 'medium',
                actions: this.getReminderActions(reminder.type, reminder.taskId)
            });

            scheduleStore.markReminderSent(reminder.id);
        });
    }

    /**
     * Check if we should ask a daily question
     */
    private async checkDailyQuestion(): Promise<void> {
        const memoryStore = useAIMemoryStore.getState();

        // Only ask if user hasn't answered today
        if (memoryStore.hasAnsweredToday()) return;

        // Only ask if there's no pending question
        if (memoryStore.getTodaysQuestion()) return;

        // Generate a daily question
        const questions = [
            { question: "What's one thing you'd love to learn this week?", category: 'learning' as const },
            { question: "What helps you stay motivated when studying gets tough?", category: 'motivation' as const },
            { question: "What's your favorite way to take breaks?", category: 'personality' as const },
            { question: "Do you have any hobbies outside of studying?", category: 'hobby' as const },
            { question: "What time of day do you feel most focused?", category: 'schedule' as const },
            { question: "What subject are you most excited to learn about?", category: 'learning' as const },
            { question: "How do you like to reward yourself after completing a study session?", category: 'motivation' as const }
        ];

        // Pick a random question we haven't asked recently
        const askedQuestions = memoryStore.dailyQuestions.slice(-7).map(q => q.question);
        const availableQuestions = questions.filter(q => !askedQuestions.includes(q.question));

        if (availableQuestions.length === 0) return;

        const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

        memoryStore.addDailyQuestion({
            question: randomQuestion.question,
            category: randomQuestion.category
        });

        // Get the newly created question to get its ID
        const newQuestion = memoryStore.getTodaysQuestion();

        this.notify({
            type: 'question',
            title: '💭 Daily Question',
            message: randomQuestion.question,
            priority: 'low',
            questionId: newQuestion?.id  // Link notification to question
        });
    }

    /**
     * Check if user has been idle and send encouragement
     */
    private async checkIdleUser(): Promise<void> {
        const memoryStore = useAIMemoryStore.getState();
        const libraryStore = useLibraryStore.getState();
        const lastInteraction = memoryStore.lastInteraction;
        const now = Date.now();

        // If no interaction in last 2 hours and they have study goal
        const twoHours = 2 * 60 * 60 * 1000;
        if (lastInteraction && (now - lastInteraction) > twoHours) {
            // Check if they've studied today
            const today = new Date().toISOString().split('T')[0];
            const todayStudy = libraryStore.studyLog[today] || 0;
            const goalMinutes = (libraryStore.userProfile.studyGoal || 1) * 60;
            const studiedMinutes = Math.round(todayStudy / 60);

            if (studiedMinutes < goalMinutes) {
                // Generate personalized encouragement
                const personality = memoryStore.aiPersonality;
                let message = "Ready for a quick study session? Even 15 minutes helps! 📚";

                // Use personalized quote if available
                if (personality.useQuotes && personality.quoteSource === 'One Piece') {
                    const quotes = [
                        "As Luffy says: 'I don't want to conquer anything. I just think the guy with the most freedom in this whole ocean is the Pirate King!' Go learn something new! 🏴‍☠️",
                        "Remember Zoro's dedication to his training? Channel that energy into studying! ⚔️"
                    ];
                    message = quotes[Math.floor(Math.random() * quotes.length)];
                }

                this.notify({
                    type: 'encouragement',
                    title: '📖 Time to Study?',
                    message,
                    priority: 'low',
                    actions: [
                        { label: 'Start Studying', action: 'open-library' },
                        { label: 'Later', action: 'dismiss' }
                    ]
                });

                // Update last interaction to prevent spam
                memoryStore.updateLastInteraction();
            }
        }
    }

    /**
     * Get reminder title based on type
     */
    private getReminderTitle(type: Reminder['type']): string {
        switch (type) {
            case 'start': return '⏰ Study Time!';
            case 'delayed_start': return '📝 Gentle Reminder';
            case 'completion': return '🎉 Great Job!';
            case 'encouragement': return '💪 You Got This!';
            case 'streak': return '🔥 Keep Your Streak!';
            default: return '📚 Study Stream';
        }
    }

    /**
     * Get quick action buttons for reminder
     */
    private getReminderActions(type: Reminder['type'], taskId: string): AINotification['actions'] {
        switch (type) {
            case 'start':
                return [
                    { label: 'Start Now', action: `start-task:${taskId}` },
                    { label: 'Snooze 15m', action: `snooze-task:${taskId}:15` }
                ];
            case 'delayed_start':
                return [
                    { label: "I'm Starting", action: `start-task:${taskId}` },
                    { label: 'Skip Today', action: `miss-task:${taskId}` }
                ];
            default:
                return undefined;
        }
    }

    /**
     * Handle notification action
     */
    async handleAction(action: string): Promise<void> {
        const scheduleStore = useScheduleStore.getState();

        if (action.startsWith('start-task:')) {
            const taskId = action.replace('start-task:', '');
            scheduleStore.startTask(taskId);
        } else if (action.startsWith('snooze-task:')) {
            const [, taskId, minutes] = action.split(':');
            scheduleStore.snoozeTask(taskId, parseInt(minutes));
        } else if (action.startsWith('miss-task:')) {
            const taskId = action.replace('miss-task:', '');
            scheduleStore.missTask(taskId);
        } else if (action === 'open-library') {
            // Navigate to library - handled by UI
        } else if (action === 'dismiss') {
            // Just dismiss - no action needed
        }
    }
}

// Export singleton instance
export const aiNotificationService = new AINotificationService();

// Auto-start when imported (on client side only)
if (typeof window !== 'undefined') {
    // Start after a short delay to let stores hydrate
    setTimeout(() => {
        aiNotificationService.start();
    }, 3000);
}
