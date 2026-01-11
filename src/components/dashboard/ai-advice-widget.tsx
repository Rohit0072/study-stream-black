"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Lightbulb, RefreshCw, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLibraryStore } from "@/store/library-store";

const STATIC_TIPS = [
    "Break your study sessions into 25-minute chunks (Pomodoro).",
    "Review your notes within 24 hours to improve retention.",
    "Explain the concept you just learned to an imaginary 5-year-old.",
    "Hydrate! Your brain needs water to function efficiently.",
    "Focus on one course at a time to avoid context switching fatigue.",
    "Use the AI Note generator to summarize complex topics instantly."
];

export function AiAdviceWidget({ className }: { className?: string }) {
    const [tip, setTip] = useState(STATIC_TIPS[0]);
    const { userProfile, aiProfile, settings } = useLibraryStore();
    const [isAnimating, setIsAnimating] = useState(false);
    const isAiActive = !!settings.geminiApiKey;

    const refreshTip = () => {
        setIsAnimating(true);
        setTimeout(() => {
            const random = Math.floor(Math.random() * STATIC_TIPS.length);
            setTip(STATIC_TIPS[random]);
            setIsAnimating(false);
        }, 300);
    };

    // Personalized Greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <Card className={cn("p-4 bg-gradient-to-br from-indigo-950/40 to-purple-950/20 border-indigo-500/20 relative overflow-hidden group", className)}>
            {/* Background Decor */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />

            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-indigo-100 flex items-center gap-2">
                            {getGreeting()}, {userProfile.name || "Scholar"}
                        </h3>
                        {/* AI Presence Indicator */}
                        <div className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1.5",
                            isAiActive
                                ? "bg-green-500/10 border-green-500/20 text-green-400"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", isAiActive ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                            {isAiActive ? "AI Online" : "AI Offline"}
                        </div>
                    </div>
                    <p className="text-xs text-indigo-300/80">
                        {aiProfile.bio ? "Your AI Learning Companion is ready." : "Ready to learn something new?"}
                        {!isAiActive && <span className="block text-red-400/80 mt-0.5">Please configure API Key in settings.</span>}
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={refreshTip} className="text-indigo-300 hover:text-white hover:bg-white/10 h-7 w-7">
                    <RefreshCw className={cn("w-3.5 h-3.5", isAnimating && "animate-spin")} />
                </Button>
            </div>

            <div className={cn("bg-black/20 rounded-lg p-3 text-sm text-gray-300 border border-white/5 transition-opacity duration-300 relative z-10", isAnimating ? "opacity-50" : "opacity-100")}>
                <div className="flex gap-3">
                    <Lightbulb className="w-5 h-5 text-yellow-500/80 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-medium text-indigo-200 block mb-1 text-xs uppercase tracking-wider">Smart Tip</span>
                        <p className="leading-relaxed font-light">{tip}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}
