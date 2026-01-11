"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Library, FileText, Settings, BarChart2, FolderSearch, BrainCircuit, Bookmark } from "lucide-react"
import { StreakIndicator } from "./streak-indicator"
import { StreakIndicator } from "./streak-indicator"
import { AppTour } from "./app-tour"
import { toast } from "sonner"
import { useEffect } from "react"

interface AppLayoutProps {
    children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
    const pathname = usePathname()

    // Auto-Update Logic
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electron) {
            const electron = (window as any).electron;

            // 1. Update Available -> Ask to Download
            const removeAvailable = electron.onUpdateAvailable((info: any) => {
                toast.info(`Update Available: v${info.version}`, {
                    description: "A new version is available.",
                    action: {
                        label: "Download",
                        onClick: () => {
                            toast.loading("Downloading update...", { id: "update-download" });
                            electron.downloadUpdate();
                        }
                    },
                    duration: 10000,
                });
            });

            // 2. Download Progress (Optional: handled by 'loading' toast ID)
            const removeProgress = electron.onUpdateProgress((progress: any) => {
                // We keep the loading toast open. 
                // Optionally update text but it can be spammy.
            });

            // 3. Update Downloaded -> Ask to Restart
            const removeDownloaded = electron.onUpdateDownloaded((info: any) => {
                toast.dismiss("update-download"); // Remove loading toast
                toast.success("Update Ready", {
                    description: "Restart now to apply the update?",
                    action: {
                        label: "Restart",
                        onClick: () => electron.quitAndInstall()
                    },
                    duration: Infinity, // Keep open until action
                });
            });

            // 4. Error
            const removeError = electron.onUpdateError((err: string) => {
                toast.dismiss("update-download");
                console.error("AutoUpdate Error:", err);
                // toast.error("Update Failed"); // Optional: don't annoy user if silent check fails
            });

            // Cleanup
            return () => {
                // Electron IPC listeners clean themselves up usually if we use .once/removeListener
                // but our preload exposes .on wrapping .on. 
                // Ideally we'd need a removeListener exposed, but for AppLayout (always mounted) it's okay.
                // In a perfect world we'd implement proper unsubscription in preload.
            };
        }
    }, []);

    const navItems = [
        { name: "Home", href: "/", icon: LayoutDashboard },
        { name: "Course Library", href: "/library", icon: Library },
        { name: "Productivity Center", href: "/ai-dashboard", icon: BrainCircuit },
        { name: "Recent Notes", href: "/notes", icon: FileText },
        { name: "Study Analytics", href: "/analytics", icon: BarChart2 },
        { name: "Scan Files", href: "/scan", icon: FolderSearch },
        { name: "Settings", href: "/settings", icon: Settings },
        { name: "Bookmarks", href: "/bookmarks", icon: Bookmark },
    ]

    return (
        <div className="flex h-screen bg-background overflow-hidden selection:bg-white/20">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-[#050505] flex flex-col">
                <div className="p-6 flex items-center gap-3">
                    <Image src="/logo.png" alt="Study Stream" width={32} height={32} className="rounded" />
                    <h1 className="text-xl font-bold tracking-tight text-white">STUDY STREAM</h1>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                id={`tour-nav-${item.href === '/' ? 'home' : item.href.substring(1)}`}
                                href={item.href}
                                prefetch={false}
                                className={cn(
                                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    isActive
                                        ? "bg-secondary text-white"
                                        : "text-muted-foreground hover:bg-secondary/50 hover:text-white"
                                )}
                            >
                                <Icon className={cn("mr-3 h-4 w-4", isActive ? "text-white" : "text-muted-foreground")} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer / Status Area */}
                <div className="p-4 border-t border-border bg-black/20">
                    <StreakIndicator />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
                {/* Title Bar Drag Region (Electron) */}
                <div className="h-8 w-full app-drag-region flex-shrink-0" style={{ WebkitAppRegion: "drag" } as any} />

                <div className="flex-1 overflow-auto p-8">
                    {children}
                </div>
            </main>
            <AppTour />
        </div>
    )
}
