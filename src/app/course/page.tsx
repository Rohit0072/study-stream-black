"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { useLibraryStore } from "@/store/library-store";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlayCircle, CheckCircle2, Clock, BookOpen, ArrowLeft, MoreHorizontal, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CourseContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { courses, setActiveCourse } = useLibraryStore();
    const courseId = searchParams.get("id");

    const course = courses.find(c => c.id === courseId);

    useEffect(() => {
        if (course) {
            setActiveCourse(course.id);
        }
    }, [course, setActiveCourse]);

    if (!course) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
                <p>Course not found</p>
                <Button variant="link" onClick={() => router.push('/library')}>Back to Library</Button>
            </div>
        );
    }

    // Stats
    const progress = Math.round((course.completedVideos / course.totalVideos) * 100) || 0;

    // Find last played video or first video
    const lastPlayedVideoId = course.lastPlayedVideoId;
    let resumeVideo = null;

    if (lastPlayedVideoId) {
        for (const section of course.sections) {
            const vid = section.videos.find(v => v.id === lastPlayedVideoId);
            if (vid) {
                resumeVideo = vid;
                break;
            }
        }
    }

    // Fallback to first video
    if (!resumeVideo && course.sections.length > 0 && course.sections[0].videos.length > 0) {
        resumeVideo = course.sections[0].videos[0];
    }

    const handleResume = () => {
        if (resumeVideo) {
            router.push(`/watch?c=${encodeURIComponent(course.id)}&v=${encodeURIComponent(resumeVideo.id)}`);
        }
    };

    // Circular Progress Component (Inline SVG)
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-white pl-0" onClick={() => router.push('/library')}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Library
                </Button>
            </div>

            {/* Hero Section */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">{course.name}</h1>
                    <p className="text-lg text-muted-foreground mb-8 line-clamp-2">
                        {course.description || "Master this course by following the structured lessons below. Track your progress and pick up exactly where you left off."}
                    </p>
                    <Button size="lg" className="gap-2 text-base px-8 h-12" onClick={handleResume}>
                        {progress > 0 ? "Resume Session" : "Start Course"}
                        <PlayCircle className="h-5 w-5 ml-1" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Lessons */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Lessons</h2>
                        <span className="text-sm text-muted-foreground">{course.sections.length} Sections • {course.totalVideos} Videos</span>
                    </div>

                    <div className="space-y-4">
                        {course.sections.map((section) => (
                            <div key={section.id} className="border border-white/5 rounded-xl bg-[#0A0A0A] overflow-hidden">
                                <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="font-medium">{section.name}</h3>
                                    <span className="text-xs text-muted-foreground bg-black/40 px-2 py-1 rounded">{section.videos.length} videos</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {section.videos.map((video) => (
                                        <div
                                            key={video.id}
                                            className={cn(
                                                "px-6 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer group",
                                                video.id === resumeVideo?.id ? "bg-primary/5" : ""
                                            )}
                                            onClick={() => router.push(`/watch?c=${encodeURIComponent(course.id)}&v=${encodeURIComponent(video.id)}`)}
                                        >
                                            <div className={cn(
                                                "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                                video.completed
                                                    ? "bg-green-500 border-green-500 text-black"
                                                    : "border-white/20 group-hover:border-white/40"
                                            )}>
                                                {video.completed && <CheckCircle2 className="h-3.5 w-3.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-sm font-medium truncate", video.completed ? "text-muted-foreground line-through decoration-white/20" : "")}>
                                                    {video.name}
                                                </p>
                                                {video.duration && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                                                    </p>
                                                )}
                                            </div>
                                            {video.id === resumeVideo?.id && (
                                                <span className="text-xs font-medium text-primary px-2 py-1 bg-primary/10 rounded">Next Up</span>
                                            )}
                                            <PlayCircle className="h-8 w-8 text-white/0 group-hover:text-white/20 -mr-2 transition-all" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Stats & Progress */}
                <div className="space-y-6">
                    {/* Course Progress Card */}
                    <Card className="bg-[#0A0A0A] border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Course Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-6">
                            <div className="relative h-32 w-32 flex items-center justify-center">
                                <svg className="h-full w-full -rotate-90 text-secondary" viewBox="0 0 100 100">
                                    {/* Background Circle */}
                                    <circle
                                        cx="50" cy="50" r={radius}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        className="text-white/5"
                                    />
                                    {/* Progress Circle */}
                                    <circle
                                        cx="50" cy="50" r={radius}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        className="text-primary transition-all duration-1000 ease-in-out"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-bold">{progress}%</span>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-4">
                                {course.completedVideos} of {course.totalVideos} videos completed
                            </p>
                        </CardContent>
                    </Card>

                    {/* Study Stats Card */}
                    <Card className="bg-[#0A0A0A] border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Quick Stats</CardTitle>
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 text-blue-400" />
                                    <span className="text-sm">Time Spent</span>
                                </div>
                                <span className="font-mono text-sm">
                                    {(() => {
                                        const seconds = course.sections.reduce((acc, section) =>
                                            acc + section.videos.reduce((sAcc, video) =>
                                                sAcc + (video.completed ? (video.duration || 0) : 0), 0), 0);

                                        if (seconds === 0) return "--:--";
                                        const h = Math.floor(seconds / 3600);
                                        const m = Math.floor((seconds % 3600) / 60);
                                        return `${h}h ${m}m`;
                                    })()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-4 w-4 text-green-400" />
                                    <span className="text-sm">Remaining</span>
                                </div>
                                <span className="font-mono text-sm">{course.totalVideos - course.completedVideos} videos</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Notes Card (Placeholder) */}
                    <Card className="bg-[#0A0A0A] border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Recent Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-6 text-muted-foreground text-sm">
                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                No notes taken yet.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function CourseOverviewPage() {
    return (
        <AppLayout>
            <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
                <CourseContent />
            </Suspense>
        </AppLayout>
    );
}
