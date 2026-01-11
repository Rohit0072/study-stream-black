"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard, Play, Maximize, Volume2, ArrowLeftRight, Bookmark, LayoutDashboard, Settings2, Book } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLibraryStore } from "@/store/library-store";

export function ShortcutsModal() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { settings } = useLibraryStore();
    const shortcutsMap = settings.shortcuts || {};

    const checkMatch = (e: KeyboardEvent, combo: string) => {
        if (!combo) return false;
        const parts = combo.toLowerCase().split('+');
        const key = parts[parts.length - 1];
        const hasShift = parts.includes('shift');
        const hasCtrl = parts.includes('ctrl') || parts.includes('control');
        const hasAlt = parts.includes('alt');
        const hasMeta = parts.includes('meta') || parts.includes('cmd');

        // Check modifiers
        if (e.shiftKey !== hasShift) return false;
        if (e.ctrlKey !== hasCtrl) return false;
        if (e.altKey !== hasAlt) return false;
        if (e.metaKey !== hasMeta) return false;

        // Check key
        return e.key.toLowerCase() === key;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input field
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
                return;
            }

            // '?' or 'Shift + /'
            if (e.key === '?') {
                e.preventDefault();
                setOpen((prev) => !prev);
                return;
            }

            // Check Custom Shortcuts (with defaults)
            if (checkMatch(e, shortcutsMap.library || "Ctrl+1")) {
                router.push('/library');
            } else if (checkMatch(e, shortcutsMap.bookmarks || "Ctrl+2")) {
                router.push('/bookmarks');
            } else if (checkMatch(e, shortcutsMap.settings || "Ctrl+3")) {
                router.push('/settings');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router, shortcutsMap]);

    const shortcuts = [
        { icon: <Play className="h-4 w-4" />, label: "Play / Pause", keys: ["Space"] },
        { icon: <Maximize className="h-4 w-4" />, label: "Toggle Fullscreen", keys: ["F"] },
        { icon: <Volume2 className="h-4 w-4" />, label: "Mute / Unmute", keys: ["M"] },
        { icon: <ArrowLeftRight className="h-4 w-4" />, label: "Seek 5s", keys: ["←", "→"] },
        { icon: <Bookmark className="h-4 w-4" />, label: "Save Bookmark", keys: ["B"] },
        { icon: <LayoutDashboard className="h-4 w-4" />, label: "Go to Library", keys: [shortcutsMap.library || "Ctrl+1"] },
        { icon: <Book className="h-4 w-4" />, label: "Go to Bookmarks", keys: [shortcutsMap.bookmarks || "Ctrl+2"] },
        { icon: <Settings2 className="h-4 w-4" />, label: "Go to Settings", keys: [shortcutsMap.settings || "Ctrl+3"] },
        { icon: <Keyboard className="h-4 w-4" />, label: "Show Shortcuts", keys: ["Shift", "?"] },
    ];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[500px] bg-neutral-900 text-white border-white/10">
                <DialogHeader className="pb-4 border-b border-white/10">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Keyboard className="h-5 w-5 text-primary" />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Power user controls for playback and navigation.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {shortcuts.map((item, index) => (
                        <div key={index} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3 text-muted-foreground group-hover:text-white transition-colors">
                                {item.icon}
                                <span>{item.label}</span>
                            </div>
                            <div className="flex gap-1">
                                {item.keys.map((key) => (
                                    <kbd
                                        key={key}
                                        className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100 shadow-sm"
                                    >
                                        {key}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center text-xs text-muted-foreground pt-2">
                    Press <kbd className="font-mono text-white">Esc</kbd> to close
                </div>
            </DialogContent>
        </Dialog>
    );
}
