"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { useLibraryStore } from "@/store/library-store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, PlayCircle, Clock, Calendar, Search } from "lucide-react";
// import { formatDistanceToNow } from "date-fns"; // Removed unused import to fix build
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RecentNotesPage() {
    const { notes, courses } = useLibraryStore();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    // Helper to get video details (memoized or stable)
    const getVideoDetails = (courseId: string, videoId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return null;

        for (const section of course.sections) {
            const video = section.videos.find(v => v.id === videoId);
            if (video) {
                return { courseName: course.name, videoName: video.name };
            }
        }
        return null;
    };

    const filteredNotes = useMemo(() => {
        let sorted = Object.values(notes).sort((a, b) => b.updatedAt - a.updatedAt);

        if (!searchQuery.trim()) return sorted;

        const lowerQuery = searchQuery.toLowerCase();
        return sorted.filter(note => {
            const contentMatch = note.content.toLowerCase().includes(lowerQuery);
            const details = getVideoDetails(note.courseId, note.videoId);
            const videoMatch = details?.videoName.toLowerCase().includes(lowerQuery);
            const courseMatch = details?.courseName.toLowerCase().includes(lowerQuery);

            return contentMatch || videoMatch || courseMatch;
        });
    }, [notes, searchQuery, courses]);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <AppLayout>
            <div className="animate-in fade-in duration-500 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Recent Notes</h1>
                        <p className="text-muted-foreground">Access all your study notes in one place.</p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search notes..."
                            className="pl-8 bg-secondary/50 border-white/10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {filteredNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground border border-dashed border-white/10 rounded-2xl bg-white/5">
                        <FileText className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">{searchQuery ? "No matching notes found" : "No notes yet"}</p>
                        <p className="text-sm">{searchQuery ? "Try a different search term" : "Start watching a video and add notes to see them here."}</p>
                        {!searchQuery && (
                            <Button className="mt-6" variant="secondary" onClick={() => router.push('/library')}>
                                Go to Library
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNotes.map((note) => {
                            const details = getVideoDetails(note.courseId, note.videoId);

                            return (
                                <Card
                                    key={note.id}
                                    className="bg-[#0A0A0A] border-white/5 hover:border-primary/50 transition-all cursor-pointer group flex flex-col"
                                    onClick={() => router.push(`/watch?c=${encodeURIComponent(note.courseId)}&v=${encodeURIComponent(note.videoId)}&tab=notes`)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                                                    {details?.videoName || "Unknown Video"}
                                                </CardTitle>
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {details?.courseName || "Unknown Course"}
                                                </p>
                                            </div>
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col">
                                        <div className="flex-1 mb-4 relative">
                                            <div className="text-sm text-muted-foreground line-clamp-4 font-mono text-xs opacity-80 bg-black/40 p-3 rounded-md h-[5rem]">
                                                {note.content || "*Empty note*"}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-3">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(note.updatedAt)}
                                            </div>
                                            <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-white">
                                                Resume
                                                <PlayCircle className="h-3 w-3" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
