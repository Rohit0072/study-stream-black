"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Timer, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { usePlayerStore } from '@/store/player-store';

interface StudyTimerProps {
    className?: string; // Removed isPlaying prop
}

export function StudyTimer({ className }: StudyTimerProps) {
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);

    // Resume timer automatically if video plays, but allow manual pause too?
    // User Requirement: "Session tracking".
    // Simple approach: Auto-run when video plays.

    useEffect(() => {
        setIsActive(isPlaying);
    }, [isPlaying]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isActive) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        } else if (!isActive && interval) {
            clearInterval(interval);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive]);

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setSeconds(0);
    };

    return (
        <div className={cn("flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10", className)}>
            <Timer className={cn("h-4 w-4", isActive ? "text-primary animate-pulse" : "text-muted-foreground")} />

            <span className="font-mono text-sm font-medium min-w-[3ch] tabular-nums text-white/90">
                {formatTime(seconds)}
            </span>

            {/* Micro Controls - prevent propagation to avoid video toggle */}
            <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={toggleTimer}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    title={isActive ? "Pause Timer" : "Resume Timer"}
                >
                    {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </button>
                <button
                    onClick={resetTimer}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors group"
                    title="Reset Session"
                >
                    <RotateCcw className="h-3 w-3 group-hover:rotate-180 transition-transform duration-500" />
                </button>
            </div>
        </div>
    );
}
