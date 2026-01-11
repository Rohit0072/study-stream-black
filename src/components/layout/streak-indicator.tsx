"use client";

import { useLibraryStore } from "@/store/library-store";
import { Flame, Trophy } from "lucide-react";
import { cn, getLocalDateKey } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

export function StreakIndicator() {
    const { studyLog, userProfile } = useLibraryStore();
    const [streak, setStreak] = useState(0);
    const [todayProgress, setTodayProgress] = useState(0);

    const goalSeconds = (userProfile?.studyGoal || 2) * 3600;

    useEffect(() => {
        // Calculate Streak (Total Active Days > 60s)
        // Matches Home Page logic to ensure consistency
        const currentStreak = Object.values(studyLog || {}).filter(v => v > 60).length;
        setStreak(currentStreak);

        // Daily Goal Progress
        const today = getLocalDateKey();
        const todaySeconds = studyLog[today] || 0;

        // Progress percentage for today (capped at 100)
        setTodayProgress(Math.min(100, (todaySeconds / goalSeconds) * 100));

    }, [studyLog, userProfile, goalSeconds]);

    return (
        <div className="space-y-3">
            {/* Streak Counter */}
            <div className="flex items-center justify-between group cursor-help">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-1.5 rounded-full transition-colors",
                        streak > 0 ? "bg-orange-500/10 text-orange-500" : "bg-gray-800 text-gray-500"
                    )}>
                        <Flame
                            className={cn(
                                "h-4 w-4",
                                streak > 0 && "fill-orange-500 animate-pulse"
                            )}
                        />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white flex items-baseline gap-1">
                            {streak} <span className="text-[10px] font-normal text-muted-foreground">Day Streak</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's Goal Progress */}
            <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
                    <span>Daily Goal</span>
                    <span>{Math.round(todayProgress)}%</span>
                </div>
                <Progress value={todayProgress} className="h-1.5 bg-gray-800" indicatorClassName={cn(
                    "transition-all duration-500",
                    todayProgress >= 100 ? "bg-green-500" : "bg-orange-500"
                )} />
                {todayProgress >= 100 && (
                    <div className="text-[10px] text-green-400 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-1">
                        <Trophy className="h-3 w-3" />
                        <span>Goal Met!</span>
                    </div>
                )}
            </div>
        </div>
    );
}
