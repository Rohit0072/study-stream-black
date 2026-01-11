"use client";

import { useLibraryStore } from "@/store/library-store";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    Trash2,
    Bookmark as BookmarkIcon,
    ChevronDown,
    ChevronRight,
    Clock,
    MoreHorizontal,
    Filter,
    ArrowUpDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/utils";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BookmarksPage() {
    const { bookmarks, courses, removeBookmark } = useLibraryStore();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Toggle expand/collapse
    const toggleCourse = (courseId: string) => {
        setExpandedCourses(prev => ({
            ...prev,
            [courseId]: !prev[courseId]
        }));
    };

    const handlePlayBookmark = (bookmark: any) => {
        const course = courses.find(c => c.id === bookmark.courseId);
        if (course) {
            router.push(`/watch?c=${encodeURIComponent(course.id)}&v=${encodeURIComponent(bookmark.videoId)}&t=${bookmark.time}`);
        }
    };

    const groupedBookmarks = useMemo(() => {
        const filtered = (bookmarks || []).filter(b =>
            b.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.context && b.context.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        const grouped: Record<string, typeof bookmarks> = {};

        filtered.forEach(b => {
            if (!grouped[b.courseId]) {
                grouped[b.courseId] = [];
            }
            grouped[b.courseId].push(b);
        });

        // Sort bookmarks within groups
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) =>
                sortOrder === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
            );
        });

        return grouped;
    }, [bookmarks, searchQuery, sortOrder]);

    const getCourseName = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        return course ? course.name : "Unknown Course";
    };

    return (
        <AppLayout>
            <div className="flex flex-col h-full bg-black/50">
                {/* Header Section */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black/20">
                    <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>
                    <div className="flex items-center gap-2">
                        {/* Window Controls (Simulated based on image) */}
                        <div className="h-0.5 w-4 bg-white/20 rounded-full" />
                        <div className="h-3 w-3 border border-white/20 rounded-sm" />
                        <div className="h-3 w-3 text-white/20">✕</div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-8 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search bookmarks..."
                            className="pl-9 bg-secondary/30 border-white/5 focus:bg-secondary/50 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button variant="outline" size="sm" className="bg-secondary/30 border-white/5 gap-2 text-muted-foreground hover:text-white">
                            <Filter className="h-3.5 w-3.5" />
                            All Courses
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="bg-secondary/30 border-white/5 gap-2 text-muted-foreground hover:text-white">
                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                    {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSortOrder('newest')}>Newest First</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOrder('oldest')}>Oldest First</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" className="bg-secondary/30 border-white/5 text-muted-foreground hover:text-white">
                            Organize
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {Object.keys(groupedBookmarks).length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground flex flex-col items-center">
                            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <BookmarkIcon className="h-8 w-8 opacity-40" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">No bookmarks found</h2>
                            <p className="max-w-sm">Try adjusting your search or add some bookmarks while watching a course.</p>
                        </div>
                    ) : (
                        Object.entries(groupedBookmarks).map(([courseId, items]) => {
                            const isExpanded = expandedCourses[courseId] ?? true; // Default open

                            return (
                                <div key={courseId} className="rounded-lg border border-white/5 bg-secondary/10 overflow-hidden">
                                    {/* Group Header */}
                                    <div
                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors select-none"
                                        onClick={() => toggleCourse(courseId)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                                                {/* Consistent icon or use course generic icon */}
                                                <BookmarkIcon className="h-4 w-4" />
                                            </div>
                                            <span className="font-semibold text-white/90">{getCourseName(courseId)}</span>
                                            <span className="text-xs text-muted-foreground border-l border-white/10 pl-3">
                                                {items.length} notes
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <div className="text-xs hidden group-hover:block">5 min : 30 min</div> {/* Mock/Placeholder for read time if we had it */}
                                            <MoreHorizontal className="h-4 w-4" />
                                        </div>
                                    </div>

                                    {/* Bookmarks List */}
                                    {isExpanded && (
                                        <div className="border-t border-white/5 bg-black/20">
                                            {items.map((bookmark) => (
                                                <div
                                                    key={bookmark.id}
                                                    className="group flex flex-col gap-1 p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors relative"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="min-w-[4rem] pt-0.5">
                                                            <button
                                                                onClick={() => handlePlayBookmark(bookmark)}
                                                                className="text-xs font-mono text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors"
                                                            >
                                                                <Clock className="h-3 w-3" />
                                                                [{formatTime(bookmark.time)}]
                                                            </button>
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-sm font-medium text-white/90 leading-none">
                                                                    {bookmark.label}
                                                                </h4>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {new Date(bookmark.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (confirm("Delete bookmark?")) removeBookmark(bookmark.id);
                                                                        }}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {bookmark.context && (
                                                                <p className="text-xs text-muted-foreground/70 leading-relaxed border-l-2 border-white/10 pl-3 py-1 mt-2">
                                                                    {bookmark.context}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
                {/* Footer Stats */}
                <div className="px-8 py-3 border-t border-white/5 bg-black/40 text-xs text-muted-foreground flex justify-between items-center">
                    <span>{bookmarks?.length || 0} saved notes total</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent border-white/10 hover:bg-white/5">
                        View Sessions Log
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
