import { EventEmitter } from 'events';

export const debugBus = new EventEmitter();

// Shared mutable state for high-frequency checks (avoiding event overhead for 60fps loops)
export const debugState = {
    simulateLagMs: 0,
    disableProgressSave: false
};

export interface VideoStats {
    fps: number;
    droppedFrames: number;
    buffer: number;
    playbackRate: number;
}

export interface VideoLog {
    timestamp: string;
    type: 'warn' | 'info' | 'error';
    message: string;
    data?: any;
}
