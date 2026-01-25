"use client";

import { usePathname } from 'next/navigation';
import { DebugMenu } from "@/components/debug/debug-menu";
import { Toaster } from "sonner";
import { ShortcutsModal } from "@/components/layout/shortcuts-modal";
import { AIAssistant } from "@/components/ai/ai-assistant";
import { DevTestingKit } from "@/components/ai/dev-testing-kit-wrapper";
import { NotificationManagerWrapper } from "@/components/ai/notification-manager-wrapper";

export function GlobalUIProvider() {
    const pathname = usePathname();

    // Don't render global UI elements on the splash screen
    // Using startsWith to handle trailing slashes robustly
    if (pathname?.startsWith('/splash')) {
        return null;
    }

    return (
        <>
            <Toaster theme="dark" position="bottom-right" />
            <ShortcutsModal />
            <DebugMenu />
            <NotificationManagerWrapper />
            <AIAssistant />
            <DevTestingKit />
        </>
    );
}
