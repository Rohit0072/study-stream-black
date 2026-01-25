"use client";

import React from "react";
import { AiAdviceWidget } from "./ai-advice-widget";
import { TaskBoard } from "./task-board";
import { cn } from "@/lib/utils";
import { DailyQuestionCard } from "@/components/ai/daily-question-card";
import { ScheduleManager } from "@/components/ai/schedule-manager";

export function AiDashboard({ className }: { className?: string }) {
    return (
        <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)}>
            {/* Left Column: AI Assistant & Schedule */}
            <div className="lg:col-span-1 space-y-6">
                {/* Daily Question - Learn about user */}
                <DailyQuestionCard />

                {/* AI Advice Widget */}
                <AiAdviceWidget />

                {/* Study Schedule Manager */}
                <div className="p-4 rounded-xl bg-[#111] border border-white/10">
                    <ScheduleManager />
                </div>
            </div>

            {/* Right Column: Task Board */}
            <div className="lg:col-span-2 h-[600px]">
                <TaskBoard className="h-full" />
            </div>
        </div>
    );
}

