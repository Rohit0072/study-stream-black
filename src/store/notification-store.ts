import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AINotification } from '@/types';

// ============================================
// NOTIFICATION STORE
// Stores notification history and manages state
// ============================================

interface NotificationState {
    // All notifications (history)
    notifications: AINotification[];

    // Currently showing notification (popup)
    activeNotification: AINotification | null;

    // Unread count
    unreadCount: number;

    // Actions
    addNotification: (notification: Omit<AINotification, 'id' | 'createdAt' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    dismissNotification: (id: string) => void;
    clearAll: () => void;
    clearNotification: (id: string) => void;
    setActiveNotification: (notification: AINotification | null) => void;

    // Get notifications
    getUnreadNotifications: () => AINotification[];
    getRecentNotifications: (count: number) => AINotification[];
}

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

// Generate ID
const generateId = () => Math.random().toString(36).substring(2, 15);

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            activeNotification: null,
            unreadCount: 0,

            addNotification: (notificationData) => {
                const notification: AINotification = {
                    ...notificationData,
                    id: generateId(),
                    createdAt: Date.now(),
                    read: false
                };

                set((state) => ({
                    notifications: [notification, ...state.notifications].slice(0, 100), // Keep last 100
                    unreadCount: state.unreadCount + 1,
                    activeNotification: notification
                }));

                console.log('[NotificationStore] Added:', notification.title);

                // Send system notification
                sendSystemNotification(notification);

                return notification;
            },

            markAsRead: (id) => {
                set((state) => {
                    const notification = state.notifications.find(n => n.id === id);
                    if (!notification || notification.read) return state;

                    return {
                        notifications: state.notifications.map(n =>
                            n.id === id ? { ...n, read: true } : n
                        ),
                        unreadCount: Math.max(0, state.unreadCount - 1)
                    };
                });
            },

            markAllAsRead: () => {
                set((state) => ({
                    notifications: state.notifications.map(n => ({ ...n, read: true })),
                    unreadCount: 0
                }));
            },

            dismissNotification: (id) => {
                const state = get();
                if (state.activeNotification?.id === id) {
                    set({ activeNotification: null });
                }
                get().markAsRead(id);
            },

            clearAll: () => {
                set({
                    notifications: [],
                    unreadCount: 0,
                    activeNotification: null
                });
            },

            clearNotification: (id) => {
                set((state) => {
                    const notification = state.notifications.find(n => n.id === id);
                    const wasUnread = notification && !notification.read;

                    return {
                        notifications: state.notifications.filter(n => n.id !== id),
                        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
                        activeNotification: state.activeNotification?.id === id ? null : state.activeNotification
                    };
                });
            },

            setActiveNotification: (notification) => {
                set({ activeNotification: notification });
            },

            getUnreadNotifications: () => {
                return get().notifications.filter(n => !n.read);
            },

            getRecentNotifications: (count) => {
                return get().notifications.slice(0, count);
            }
        }),
        {
            name: 'notification-store',
            storage: createJSONStorage(() => getStorage() as Storage),
            partialize: (state) => ({
                notifications: state.notifications,
                unreadCount: state.unreadCount
            })
        }
    )
);

// ============================================
// SYSTEM NOTIFICATION HELPER
// ============================================

async function sendSystemNotification(notification: AINotification): Promise<void> {
    try {
        // Try Electron notification first
        // Try Electron notification first
        if (typeof window !== 'undefined') {
            const electron = (window as any).electron;
            console.log('[SystemNotification] Checking for Electron bridge...', !!electron);

            if (electron && electron.sendNotification) {
                console.log('[SystemNotification] Calling Electron.sendNotification...');
                try {
                    const result = await electron.sendNotification(
                        notification.title,
                        notification.message
                    );
                    console.log('[SystemNotification] IPC Result:', result);
                } catch (e) {
                    console.error('[SystemNotification] IPC Failed:', e);
                }
                return;
            } else {
                console.warn('[SystemNotification] Electron bridge not found or missing sendNotification method');
            }
        }

        // Fallback to Web Notification API
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: '/icon.png',
                    tag: notification.id,
                    requireInteraction: notification.priority === 'high'
                });
                console.log('[SystemNotification] Sent via Web API');
            } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    new Notification(notification.title, {
                        body: notification.message,
                        icon: '/icon.png'
                    });
                }
            }
        }
    } catch (error) {
        console.error('[SystemNotification] Failed:', error);
    }
}

// Export helper for manual system notification
export { sendSystemNotification };
