"use client";

import React from "react";
import { AiAdviceWidget } from "./ai-advice-widget";
import { TaskBoard } from "./task-board";
import { cn } from "@/lib/utils";

export function AiDashboard({ className }: { className?: string }) {
    return (
        <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)}>
            {/* Left Column: Advice & Stats (Simulated) */}
            <div className="lg:col-span-1 space-y-6">
                <AiAdviceWidget className="h-full" />
                {/* Future: Personal Questioning / Quick Chat Widget? */}
            </div>

            {/* Right Column: Task Board */}
            <div className="lg:col-span-2 h-[500px]">
                <TaskBoard className="h-full" />
            </div>
        </div>
    );
}
