"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Library,
    FileText,
    Settings,
    BarChart2,
    FolderSearch,
    BrainCircuit,
    Bookmark,
    Bot,
    Sparkles,
    Bell
} from "lucide-react"
import { StreakIndicator } from "./streak-indicator"
import { AppTour } from "./app-tour"
import { toast } from "sonner"
import { useEffect } from "react"
import { HelpModal } from "./help-modal"
import { ProfileModal } from "../profile/profile-modal"
import { useLibraryStore } from "@/store/library-store"
import { useUIStore } from "@/store/ui-store"
import { useNotificationStore } from "@/store/notification-store"
import { UserMenu } from "../profile/user-menu"

interface AppLayoutProps {
    children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
    const pathname = usePathname()
    const { setAIChatOpen, toggleNotification } = useUIStore()
    const { unreadCount } = useNotificationStore()

    // Auto-Update Logic
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electron) {
            const electron = (window as any).electron;

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

            const removeDownloaded = electron.onUpdateDownloaded((info: any) => {
                toast.dismiss("update-download");
                toast.success("Update Ready", {
                    description: "Restart now to apply the update?",
                    action: {
                        label: "Restart",
                        onClick: () => electron.quitAndInstall()
                    },
                    duration: Infinity,
                });
            });

            const removeError = electron.onUpdateError((err: string) => {
                toast.dismiss("update-download");
                console.error("AutoUpdate Error:", err);
            });
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
        <div className="flex h-screen bg-background overflow-hidden selection:bg-white/20 font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-[#050505] flex flex-col">
                <div className="p-6 flex items-center gap-3">
                    <Image src="/logo.png" alt="Study Stream" width={32} height={32} className="rounded" />
                    <h1 className="text-xl font-bold tracking-tight text-white uppercase">Study Stream</h1>
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
                                    "flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <Icon className={cn("mr-3 h-4 w-4", isActive ? "text-white" : "text-muted-foreground")} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer / Status Area */}
                <div className="p-4 border-t border-border bg-black/20 flex items-center justify-between">
                    <StreakIndicator />
                    <HelpModal />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
                {/* Header / Top Bar */}
                <header className="h-20 border-b border-border bg-black/20 flex items-center justify-between px-8 shrink-0">
                    <div className="app-drag-region flex-1 h-full" style={{ WebkitAppRegion: "drag" } as any} />

                    <div className="flex items-center gap-4">
                        {/* Study AI Toggle */}
                        <button
                            onClick={() => setAIChatOpen(true)}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group relative"
                            title="Ask Study AI"
                        >
                            <Bot className="h-5 w-5" />
                            <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        {/* Notification Bell */}
                        <button
                            onClick={toggleNotification}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all relative"
                            title="Notifications"
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 rounded-lg flex items-center justify-center text-[10px] font-bold text-white px-1 border-2 border-[#050505]">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>

                        <div className="w-[1px] h-6 bg-white/10 mx-1" />

                        {/* User Profile Menu */}
                        <UserMenu />
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8 relative">
                    {children}
                </div>
                <ProfileModal />
            </main>
            <AppTour />
        </div>
    )
}
