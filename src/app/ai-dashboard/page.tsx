"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { AiDashboard } from "@/components/dashboard/ai-dashboard";

export default function AiDashboardPage() {
    return (
        <AppLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">AI & Productivity</h2>
                    <p className="text-muted-foreground">
                        Your personalized study assistant and task manager.
                    </p>
                </div>

                <AiDashboard className="h-[calc(100vh-200px)] min-h-[500px]" />
            </div>
        </AppLayout>
    );
}
