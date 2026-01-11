import { create } from 'zustand';

interface PlayerState {
    isPlaying: boolean;
    setPlaying: (playing: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
    isPlaying: false,
    setPlaying: (playing) => set({ isPlaying: playing }),
}));
