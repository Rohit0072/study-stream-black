"use client";

import { useLibraryStore } from "@/store/library-store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle } from "lucide-react";
import { Course, Video } from "@/types";

export function ContinueWatching() {
    const { courses } = useLibraryStore();
    const router = useRouter();

    const getRecentActivity = () => {
        const allVideos: { video: Video, course: Course }[] = [];

        courses.forEach(course => {
            course.sections.forEach(section => {
                section.videos.forEach(video => {
                    if (video.lastPlayedAt) {
                        allVideos.push({ video, course });
                    }
                });
            });
        });

        return allVideos
            .sort((a, b) => (b.video.lastPlayedAt || 0) - (a.video.lastPlayedAt || 0))
            .slice(0, 4); // Increased to 4 for grid view
    };

    const recentItems = getRecentActivity();

    if (recentItems.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    Continue Watching
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentItems.map(({ course, video }) => (
                    <Card
                        key={video.id}
                        className="group relative overflow-hidden border-border bg-[#0A0A0A] hover:border-primary/50 transition-colors cursor-pointer h-full"
                        onClick={() => router.push(`/watch?c=${encodeURIComponent(course.id)}&v=${encodeURIComponent(video.id)}`)}
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2 p-4">
                            <CardTitle className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                                {video.name}
                            </CardTitle>
                            <CardDescription className="text-xs line-clamp-1">{course.name}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 mt-auto">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>{Math.round(video.progress)}%</span>
                                    <span>{new Date(video.lastPlayedAt!).toLocaleDateString()}</span>
                                </div>
                                <div className="h-1 w-full bg-secondary/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${video.progress}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
