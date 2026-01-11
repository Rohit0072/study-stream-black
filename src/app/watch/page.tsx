"use client";

import React, { useEffect, Suspense, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { VideoPlayer } from "@/components/player/video-player";
import { NotesEditor } from "@/components/notes/notes-editor";
import { useLibraryStore } from "@/store/library-store";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronDown, ChevronRight } from "lucide-react";
import { Course, Video } from "@/types";
import { cn } from "@/lib/utils";

import { AiFeatures } from "@/components/player/ai-features";
import { UpNextOverlay } from "@/components/player/up-next-overlay";

function WatchContent() {
    // ... existing hooks ...

    const params = useParams();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<"content" | "notes" | "chat" | "quiz">((searchParams.get("tab") as any) || "content");
    const courseId = searchParams.get('c');
    const videoId = searchParams.get('v');

    const router = useRouter();
    // OPTIMIZED: Use specific selectors to avoid re-rendering on every store update (e.g. log saves)
    const courses = useLibraryStore(state => state.courses);
    const updateVideoProgress = useLibraryStore(state => state.updateVideoProgress);
    const setActiveCourse = useLibraryStore(state => state.setActiveCourse);
    const [debugCourse, setDebugCourse] = useState<Course | null>(null);

    // Initial load for browser-based debugging
    useEffect(() => {
        const isElectron = typeof window !== 'undefined' && 'electron' in (window as any);
        if (!isElectron && courseId === 'real-path-test' && !debugCourse) {
            fetch(`/api/scan?path=${encodeURIComponent('D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python')}`)
                .then(res => res.json())
                .then(data => setDebugCourse(data))
                .catch(err => console.error("Failed to load debug course:", err));
        }
    }, [courseId, debugCourse]);

    // Use debug course if available, otherwise fallback to store
    let course = debugCourse || courses.find(c => c.id === courseId);

    // Flatten videos to find the current and next video
    const allVideos = course?.sections.flatMap(s => s.videos) || [];
    let currentVideo = allVideos.find(v => v.id === videoId);

    // Default to first video if missing
    if (course && !currentVideo && allVideos.length > 0) {
        currentVideo = allVideos[0];
    }

    // Up Next State
    const [showUpNext, setShowUpNext] = useState(false);
    const [nextVideo, setNextVideo] = useState<Video | null>(null);

    useEffect(() => {
        if (courseId) useLibraryStore.getState().setActiveCourse(courseId as string);
    }, [courseId, setActiveCourse]);

    // Cleanup overlay when video changes
    useEffect(() => {
        setShowUpNext(false);
    }, [videoId]);

    // Auto-expand section logic ...
    useEffect(() => {
        if (course && currentVideo) {
            const activeSection = course.sections.find(s => s.videos.some(v => v.id === currentVideo.id));
            if (activeSection) {
                useLibraryStore.getState().setSingleExpandedSection(course.id, activeSection.id);
            }
        }
    }, [course?.id, currentVideo?.id]);

    // Refs for stable access in callbacks without dependencies
    const courseIdRef = useRef(courseId);
    const videoIdRef = useRef(videoId);
    const videoDurationRef = useRef(currentVideo?.duration || 0);
    const allVideosRef = useRef(allVideos);
    const courseRef = useRef(course);

    useEffect(() => {
        courseIdRef.current = course?.id || null;
        videoIdRef.current = currentVideo?.id || null;
        videoDurationRef.current = currentVideo?.duration || 0;
        allVideosRef.current = allVideos;
        courseRef.current = course;
    }, [course, currentVideo, allVideos]);


    // Stable Handlers - safe to define always
    const handleVideoEnd = useCallback(() => {
        const c = courseRef.current;
        const vId = videoIdRef.current;
        const all = allVideosRef.current;
        if (!c || !vId) return;

        // Direct update to store
        useLibraryStore.getState().updateVideoProgress(c.id, vId, 100, true, videoDurationRef.current);

        // Find next video
        const currentIndex = all.findIndex(v => v.id === vId);
        if (currentIndex < all.length - 1) {
            const next = all[currentIndex + 1];
            setNextVideo(next);
            setShowUpNext(true);
        }
    }, []);

    const handleNextVideo = useCallback(() => {
        if (nextVideo && courseRef.current) {
            setShowUpNext(false);
            router.push(`/watch?c=${encodeURIComponent(courseRef.current.id)}&v=${encodeURIComponent(nextVideo.id)}`);
        }
    }, [nextVideo, router]);

    const handlePreviousVideo = useCallback(() => {
        const c = courseRef.current;
        const vId = videoIdRef.current;
        const all = allVideosRef.current;
        if (!c || !vId) return;

        const currentIndex = all.findIndex(v => v.id === vId);
        if (currentIndex > 0) {
            const prev = all[currentIndex - 1];
            router.push(`/watch?c=${encodeURIComponent(c.id)}&v=${encodeURIComponent(prev.id)}`);
        }
    }, [router]);

    const lastSavedTimeRef = useRef<number>(0);
    // Keep track if we have unsaved progress
    const pendingProgressRef = useRef<{ time: number, duration: number, percentage: number } | null>(null);

    // Save helper
    const flushProgress = useCallback(() => {
        const cId = courseIdRef.current;
        const vId = videoIdRef.current;
        const pending = pendingProgressRef.current;

        if (!cId || !vId || !pending) return;

        // Commit to store
        useLibraryStore.getState().updateVideoProgress(cId, vId, pending.percentage, false, pending.duration);
        lastSavedTimeRef.current = pending.time;
        pendingProgressRef.current = null;
    }, []);

    // Flush on unmount or before unload
    useEffect(() => {
        const handleBeforeUnload = () => flushProgress();
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            flushProgress();
        };
    }, [flushProgress]);

    // Stable callback that never changes
    const handleProgress = useCallback((time: number, duration: number) => {
        if (!duration || duration === 0) return;

        // Use refs to get current IDs without triggering effect cleanup/re-bind
        const cId = courseIdRef.current;
        const vId = videoIdRef.current;

        if (!cId || !vId) return;

        const percentage = (time / duration) * 100;
        if (!Number.isFinite(percentage)) return;

        // Store pending update
        pendingProgressRef.current = { time, duration, percentage };

        // Save progress every 30 seconds (Throttled Update)
        if (Math.abs(time - lastSavedTimeRef.current) >= 30) {
            // Access debug state natively to avoid React overhead
            import('@/lib/debug-bus').then(({ debugState }) => {
                if (!debugState.disableProgressSave) {
                    useLibraryStore.getState().updateVideoProgress(cId, vId, percentage, false, duration);
                    lastSavedTimeRef.current = time;
                    pendingProgressRef.current = null;
                }
            });
        }
    }, []);

    // Bookmarking Logic
    const allBookmarks = useLibraryStore(state => state.bookmarks) || [];
    const addBookmark = useLibraryStore(state => state.addBookmark);
    const removeBookmark = useLibraryStore(state => state.removeBookmark);

    // Filter bookmarks for current video 
    const videoBookmarks = useMemo(() => {
        if (!currentVideo || !allBookmarks) return [];
        return allBookmarks.filter(b => b.videoId === currentVideo.id);
    }, [currentVideo, allBookmarks]);

    const handleBookmark = useCallback(async (time: number, userLabel?: string) => {
        console.log('[WatchPage] handleBookmark called with time:', time);
        if (!course) {
            console.error('[WatchPage] Course is missing');
            return;
        }

        let contextText = '';

        // Try to capture context from subtitles
        try {
            const isElectron = typeof window !== 'undefined' && 'electron' in (window as any);
            const subtitlePath = currentVideo?.subtitles && currentVideo.subtitles.length > 0
                ? currentVideo.subtitles[0].path
                : (currentVideo?.path ? currentVideo.path.replace(/\.[^/.]+$/, ".vtt") : null);

            if (subtitlePath && isElectron) {
                const subContent = await (window as any).electron.readSubtitle(subtitlePath);
                if (subContent) {
                    const lines = subContent.split('\n');
                    let currentCaptionTime = -1;

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line.includes('-->')) {
                            const parts = line.split('-->');
                            const startStr = parts[0].trim();
                            const p = startStr.split(':');
                            let seconds = 0;

                            if (p.length === 3) {
                                seconds = parseFloat(p[0]) * 3600 + parseFloat(p[1]) * 60 + parseFloat(p[2].replace(',', '.'));
                            } else if (p.length === 2) {
                                seconds = parseFloat(p[0]) * 60 + parseFloat(p[1].replace(',', '.'));
                            }

                            if (Math.abs(seconds - time) < 5 && seconds <= time) {
                                currentCaptionTime = i;
                            } else if (seconds > time) {
                                break;
                            }
                        }
                    }

                    if (currentCaptionTime !== -1) {
                        let text = '';
                        for (let k = currentCaptionTime + 1; k < lines.length; k++) {
                            const l = lines[k].trim();
                            if (!l || l.includes('-->') || /^\d+$/.test(l)) break;
                            text += l + ' ';
                        }
                        if (text) contextText = text.trim();
                    }
                }
            }
        } catch (e) {
            console.error("Failed to read subtitle context", e);
        }

        const newBookmark = {
            id: crypto.randomUUID(),
            courseId: course.id,
            videoId: currentVideo?.id || '',
            time: time,
            label: userLabel || `Bookmark at ${Math.floor(time)}s`,
            context: contextText || undefined,
            createdAt: Date.now()
        };

        console.log('[WatchPage] Adding bookmark:', newBookmark);
        addBookmark(newBookmark);
    }, [course, currentVideo, addBookmark]);



    // Memoize initial time to correspond to the Logic: only on Mount/Video Change
    const initialTime = useMemo(() => {
        const tParam = searchParams.get('t');
        if (tParam) {
            const t = parseFloat(tParam);
            if (!isNaN(t)) return t;
        }
        return currentVideo?.progress ? (currentVideo.progress / 100) * (currentVideo.duration || 0) : 0;
    }, [currentVideo?.id, currentVideo?.progress, currentVideo?.duration, searchParams]);

    // Derived values with safety checks
    const isElectron = typeof window !== 'undefined' && 'electron' in (window as any);
    let videoSrc = '';
    if (currentVideo) {
        if (isElectron) {
            videoSrc = `http://localhost:19999/stream?path=${encodeURIComponent(currentVideo.path)}`;
        } else {
            videoSrc = `/api/stream?path=${encodeURIComponent(currentVideo.path)}`;
        }
    }

    const hasNext = currentVideo ? allVideos.findIndex(v => v.id === currentVideo.id) < allVideos.length - 1 : false;
    const hasPrev = currentVideo ? allVideos.findIndex(v => v.id === currentVideo.id) > 0 : false;

    // Check for missing data LAST, after all hooks are called
    if (!course || !currentVideo) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-full">
                    <h2 className="text-xl font-bold">Video not found</h2>
                    <Button onClick={() => router.push('/library')} className="mt-4">
                        Back to Library
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-black text-white">
            <div className="h-14 border-b border-[#333] flex items-center px-4 gap-4 bg-[#0a0a0a]">
                <Button variant="ghost" size="sm" onClick={() => router.push('/library')} className="text-muted-foreground hover:text-white">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back (Library)
                </Button>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold">{currentVideo.name}</span>
                    <span className="text-xs text-muted-foreground">{course.name}</span>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* Sidebar */}
                <div className="w-80 border-r border-[#333] bg-[#050505] flex flex-col hidden lg:flex">
                    <div className="grid grid-cols-4 items-center border-b border-[#333]">
                        <div
                            className={cn(
                                "p-3 text-center text-xs font-semibold cursor-pointer border-b-2 transition-colors",
                                activeTab === "content" ? "border-primary text-white bg-white/5" : "border-transparent text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                            onClick={() => setActiveTab("content")}
                        >
                            Content
                        </div>
                        <div
                            className={cn(
                                "p-3 text-center text-xs font-semibold cursor-pointer border-b-2 transition-colors",
                                activeTab === "notes" ? "border-primary text-white bg-white/5" : "border-transparent text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                            onClick={() => setActiveTab("notes")}
                        >
                            Notes
                        </div>
                        <div
                            className={cn(
                                "p-3 text-center text-xs font-semibold cursor-pointer border-b-2 transition-colors",
                                activeTab === "chat" ? "border-primary text-white bg-white/5" : "border-transparent text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                            onClick={() => setActiveTab("chat")}
                        >
                            Chat
                        </div>
                        <div
                            className={cn(
                                "p-3 text-center text-xs font-semibold cursor-pointer border-b-2 transition-colors",
                                activeTab === "quiz" ? "border-primary text-white bg-white/5" : "border-transparent text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                            onClick={() => setActiveTab("quiz")}
                        >
                            Quiz
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden h-full">
                        {activeTab === "content" && (
                            <div className="h-full overflow-y-auto space-y-1 py-2">
                                {course.sections.map(section => {
                                    const isExpanded = section.isExpanded !== false;
                                    return (
                                        <div key={section.id}>
                                            <button
                                                onClick={() => useLibraryStore.getState().toggleSection(course!.id, section.id)}
                                                className="w-full px-4 py-2 text-xs font-semibold text-white/70 bg-[#111] hover:bg-[#1a1a1a] flex items-center gap-2 transition-colors text-left"
                                            >
                                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                {section.name}
                                                <span className="ml-auto text-[10px] text-white/30">{section.videos.length}</span>
                                            </button>

                                            {isExpanded && (
                                                <div className="animate-in slide-in-from-top-1 duration-200">
                                                    {section.videos.map(video => (
                                                        <div
                                                            key={video.id}
                                                            onClick={() => router.push(`/watch?c=${encodeURIComponent(course!.id)}&v=${encodeURIComponent(video.id)}`)}
                                                            className={cn(
                                                                "px-4 py-3 text-sm cursor-pointer hover:bg-white/5 flex items-center gap-3 transition-colors pl-8 border-l-2 border-transparent",
                                                                video.id === currentVideo!.id ? "bg-white/5 text-white border-primary" : "text-muted-foreground"
                                                            )}
                                                        >
                                                            <div className="h-2 w-2 rounded-full overflow-hidden bg-[#333] flex-shrink-0">
                                                                {video.completed && <div className="h-full w-full bg-green-500" />}
                                                            </div>
                                                            <span className="line-clamp-2">{video.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeTab === "notes" && (
                            <NotesEditor
                                courseId={course.id}
                                videoId={currentVideo.id}
                                currentVideo={currentVideo}
                            />
                        )}

                        {(activeTab === 'chat' || activeTab === 'quiz') && (
                            <AiFeatures
                                courseId={course.id}
                                videoId={currentVideo.id}
                                videoTitle={currentVideo.name}
                                mode={activeTab}
                                subtitlePath={currentVideo.subtitles && currentVideo.subtitles.length > 0
                                    ? currentVideo.subtitles[0].path
                                    : (currentVideo.path ? currentVideo.path.replace(/\.[^/.]+$/, ".vtt") : null)
                                }
                            />
                        )}
                    </div>
                </div>

                {/* Main Player Area */}
                <div className="flex-1 flex items-center justify-center p-6 bg-black relative">
                    <div className="max-w-5xl w-full relative">
                        <VideoPlayer
                            key={currentVideo.id}
                            src={videoSrc}
                            title={currentVideo.name}
                            initialTime={initialTime}
                            onEnded={handleVideoEnd}
                            onProgress={handleProgress}
                            autoPlay
                            tracks={currentVideo.subtitles}
                            onNext={hasNext ? handleNextVideo : undefined}
                            onPrevious={hasPrev ? handlePreviousVideo : undefined}
                            onBookmark={handleBookmark}
                            bookmarks={videoBookmarks}
                        >

                            {/* Up Next Overlay - Passed as Child so it's visible in Fullscreen */}
                            {showUpNext && nextVideo && (
                                <UpNextOverlay
                                    nextVideoTitle={nextVideo.name}
                                    onPlay={handleNextVideo}
                                    onCancel={() => setShowUpNext(false)}
                                />
                            )}
                        </VideoPlayer>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function WatchPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-black text-white">
                <p>Loading Player...</p>
            </div>
        }>
            <WatchContent />
        </Suspense>
    );
}
