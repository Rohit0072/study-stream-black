import { create } from 'zustand';

interface UIState {
    isAIChatOpen: boolean;
    isNotificationOpen: boolean;
    isProfileModalOpen: boolean;
    setAIChatOpen: (open: boolean) => void;
    toggleAIChat: () => void;
    setNotificationOpen: (open: boolean) => void;
    toggleNotification: () => void;
    setProfileModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isAIChatOpen: false,
    isNotificationOpen: false,
    isProfileModalOpen: false,
    setAIChatOpen: (open) => set({ isAIChatOpen: open }),
    toggleAIChat: () => set((state) => ({ isAIChatOpen: !state.isAIChatOpen })),
    setNotificationOpen: (open) => set({ isNotificationOpen: open }),
    toggleNotification: () => set((state) => ({ isNotificationOpen: !state.isNotificationOpen })),
    setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
}));
