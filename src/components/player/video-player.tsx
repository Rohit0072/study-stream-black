"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
    Video as VideoType,
    Bookmark
} from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLibraryStore } from "@/store/library-store";
import { usePlayerStore } from "@/store/player-store";
import {
    Play,
    Pause,
    Maximize,
    Minimize,
    Volume2,
    VolumeX,
    SkipBack,
    SkipForward,
    Settings,
    Subtitles,
    Plus,
    Minus,
    MessageSquare,
    Repeat,
    Brain,
    PanelRight,
    Upload,
    Bookmark as BookmarkIcon
} from "lucide-react";

interface VideoPlayerProps {
    src: string;
    poster?: string;
    title?: string;
    onEnded?: () => void;
    onProgress?: (time: number, duration: number) => void;
    initialTime?: number;
    autoPlay?: boolean;
    tracks?: { path: string, lang: string, label: string }[];
    onNext?: () => void;
    onPrevious?: () => void;
    children?: React.ReactNode;
    onBookmark?: (time: number, note?: string) => void;
    onRemoveBookmark?: (id: string) => void;
    bookmarks?: Bookmark[];
}

const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
};

// Helper: Convert SRT to VTT for browser compatibility
const srtToVtt = (srtContent: string) => {
    const vtt = "WEBVTT\n\n" + srtContent
        .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, "$1:$2:$3.$4") // Convert comma to dot
        .replace(/\{\\([ibu])\}/g, "</$1>") // Basic tag cleanup
        .replace(/\{\\([ibu])1\}/g, "<$1>")
        .replace(/\{([ibu])\}/g, "<$1>");
    return vtt;
};

interface SubtitleTrack {
    id: string;
    label: string;
    src: string;
    language: string;
}

export const VideoPlayer = React.memo(({
    src,
    poster,
    title,
    onEnded,
    onProgress,
    initialTime = 0,
    autoPlay = false,
    tracks,
    onNext,
    onPrevious,
    children,
    onBookmark,
    onRemoveBookmark,
    bookmarks
}: VideoPlayerProps) => {
    // Refs and State
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const progressThumbRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const rafRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const timeDisplayRef = useRef<HTMLSpanElement>(null); // Ref for time display to avoid re-renders

    const [isPlaying, setIsPlaying] = useState(false);
    // Removed 'progress' state. Using direct DOM manipulation.
    // Removed 'currentTime' state. Using ref.
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playbackRate, setPlaybackRate] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("player-speed");
            return saved ? parseFloat(saved) : 1;
        }
        return 1;
    });

    const [isDragging, setIsDragging] = useState(false);

    // ... (Subtitle state)
    const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
    // Actual active track ID (derived or selected)
    const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);

    // Preference: 'off', 'en', 'es', etc.
    const [subtitlePreferences, setSubtitlePreference] = useState<string | null>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("player-language");
        }
        return null;
    });

    const [loop, setLoop] = useState(false);



    // Auto-select subtitle based on preference when tracks load
    useEffect(() => {
        if (tracks && tracks.length > 0 && subtitlePreferences) {
            const matchedTrack = subtitles.find(t => t.language === subtitlePreferences || t.label === subtitlePreferences);
            if (matchedTrack) {
                setActiveSubtitle(matchedTrack.id);
            }
        }
    }, [subtitles, subtitlePreferences]);

    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);

    // Bookmark Input State
    const [showBookmarkInput, setShowBookmarkInput] = useState(false);
    const bookmarkInputRef = useRef<HTMLInputElement>(null);
    const wasPlayingBeforeBookmark = useRef(false);
    const bookmarkTimeRef = useRef(0);

    const [overlayMessage, setOverlayMessage] = useState<{ icon?: React.ReactNode, text: string } | null>(null);
    const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showOverlay = (text: string, icon?: React.ReactNode) => {
        setOverlayMessage({ text, icon });
        if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = setTimeout(() => setOverlayMessage(null), 800);
    };

    const addManualStudyLog = useLibraryStore(state => state.addManualStudyLog);
    const studyTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Study Timer Logic: Log 30 seconds every 30 seconds of playback
    useEffect(() => {
        if (isPlaying) {
            studyTimerRef.current = setInterval(() => {
                const today = new Date().toISOString().split('T')[0];
                addManualStudyLog(today, 30);
            }, 30000);
        } else {
            if (studyTimerRef.current) {
                clearInterval(studyTimerRef.current);
                studyTimerRef.current = null;
            }
        }

        return () => {
            if (studyTimerRef.current) {
                clearInterval(studyTimerRef.current);
            }
        };
    }, [isPlaying, addManualStudyLog]);



    const [showSidebar, setShowSidebar] = useState(false);
    const [sidebarTab, setSidebarTab] = useState("chat");

    const toggleSidebar = (tab: string = "chat") => {
        if (showSidebar && sidebarTab === tab) {
            setShowSidebar(false);
        } else {
            setShowSidebar(true);
            setSidebarTab(tab);
        }
    };
    useEffect(() => {
        const loadTracks = async () => {
            if (!tracks) return;
            const loadedTracks: SubtitleTrack[] = [];
            for (const track of tracks) {
                try {
                    const port = 19999;
                    const streamUrl = `http://localhost:${port}/stream?path=${encodeURIComponent(track.path)}`;
                    const response = await fetch(streamUrl);
                    const content = await response.text();
                    let vttContent = content;
                    if (track.path.toLowerCase().endsWith('.srt')) {
                        vttContent = srtToVtt(content);
                    }
                    const blob = new Blob([vttContent], { type: 'text/vtt' });
                    const url = URL.createObjectURL(blob);
                    loadedTracks.push({
                        id: track.path,
                        label: track.label,
                        src: url,
                        language: track.lang
                    });
                } catch (e) {
                    console.error("Failed to load subtitle track:", track.path, e);
                }
            }
            setSubtitles(loadedTracks);
        };
        loadTracks();
    }, [tracks]);

    // Animation Loop for Smooth Progress & Debugging
    const lastFrameTimeRef = useRef<number>(performance.now());
    const frameCountRef = useRef<number>(0);
    const lastFpsUpdateRef = useRef<number>(performance.now());

    // Bookmark Handler
    // We assume parent passes us generic `src`. 
    // We need to match bookmarks by videoId. 
    // But `VideoPlayer` doesn't know its ID unless passed, or we deduce it.
    // Hack: We match by `path` if `id` is missing? Or just rely on props.
    // Ideally we should pass `videoId` to `VideoPlayer`.

    // For now, let's assume `onBookmark` handles the logic of *adding*.
    // But for *displaying* markers, we need the list.
    // Let's add `bookmarks` prop to VideoPlayerProps.

    // Changing approach to avoid prop drilling if possible, OR just add prop.
    // Prop is cleaner.

    const handleBookmarkClick = () => {
        const video = videoRef.current;
        if (!video) return;

        // Pause video to let user type
        wasPlayingBeforeBookmark.current = !video.paused;
        bookmarkTimeRef.current = video.currentTime;

        if (!video.paused) {
            video.pause();
            setIsPlaying(false);
        }

        setShowBookmarkInput(true);
        // Focus input on next tick
        setTimeout(() => bookmarkInputRef.current?.focus(), 50);
    };

    const handleSaveBookmark = () => {
        if (onBookmark) {
            const note = bookmarkInputRef.current?.value || undefined;
            onBookmark(bookmarkTimeRef.current, note);
            showOverlay("Bookmark Saved", <BookmarkIcon className="h-8 w-8" />);
        }
        setShowBookmarkInput(false);
        if (wasPlayingBeforeBookmark.current) {
            togglePlay(); // Resume
        }
    };

    // Import debug bus and state (dynamic import or top-level if possible, assuming top level for now)
    // We need to import these at top of file, so we'll add them separately. 
    // Ideally we'd modify imports first, but for now we assume they are available or we add imports in next step.

    const updateProgressVisuals = useCallback(() => {
        const video = videoRef.current;
        if (!video || !progressBarRef.current) return;

        // --- Debug Start ---
        const now = performance.now();
        frameCountRef.current++;

        // Update FPS every 500ms
        if (now - lastFpsUpdateRef.current >= 500) {
            const fps = Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current));

            // Emit to debug bus
            import('@/lib/debug-bus').then(({ debugBus }) => {
                debugBus.emit('video-stats', {
                    fps,
                    droppedFrames: 0, // Placeholder
                    buffer: video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) - video.currentTime : 0,
                    playbackRate: video.playbackRate
                });
            });

            lastFpsUpdateRef.current = now;
            frameCountRef.current = 0;
        }

        // Simulate Lag & Detect Drops
        import('@/lib/debug-bus').then(({ debugBus, debugState }) => {
            if (debugState.simulateLagMs > 0) {
                const start = performance.now();
                while (performance.now() - start < debugState.simulateLagMs) {
                    // Busy wait
                }
            } else {
                // Detect natural lag
                const frameDuration = now - lastFrameTimeRef.current;
                if (frameDuration > 60) { // > 16FPS equivalent
                    debugBus.emit('log', {
                        timestamp: new Date().toLocaleTimeString(),
                        type: 'error',
                        message: `Frame Drop: ${Math.round(frameDuration)}ms gap`,
                        data: { duration: frameDuration }
                    });
                }
            }
        });
        // --- Debug End ---

        const current = video.currentTime;
        const total = video.duration || 1; // Avoid divide by zero
        const percentage = (current / total) * 100;

        // Direct DOM update (No Re-render)
        progressBarRef.current.style.width = `${percentage}%`;

        // Update Thumb Scaling (optional visual polish)
        if (progressThumbRef.current) {
            // We can add logic here if we want the thumb to react to values
        }

        // Optimize React State Update: Only update text when second changes (Direct DOM)
        if (Math.floor(current) !== Math.floor(lastTimeRef.current)) {
            lastTimeRef.current = current;
            if (timeDisplayRef.current) {
                timeDisplayRef.current.textContent = `${formatTime(current)} / ${formatTime(total)}`;
            }
        }

        rafRef.current = requestAnimationFrame(updateProgressVisuals);
    }, []);

    // Start/Stop Animation Loop
    useEffect(() => {
        if (isPlaying && !isDragging) {
            rafRef.current = requestAnimationFrame(updateProgressVisuals);
        } else {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        }
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isPlaying, isDragging, updateProgressVisuals]);




    // Mirror state for event listeners to avoid dependency loops
    const isPlayingRef = useRef(isPlaying);
    useEffect(() => {
        isPlayingRef.current = isPlaying;
        // Broadcast to transient store for separate components (StudyTimer)
        usePlayerStore.getState().setPlaying(isPlaying);
    }, [isPlaying]);

    // Cleanup Ref for rAF
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // 1. Handle AutoPlay and Initial Seek (Run ONLY when src or initialTime changes)
    // 4. Handle AutoPlay and Initial Seek
    // We use a ref to track the last src we initialized, to prevent re-seeking if parent re-renders with same src but diff initialTime
    const initializedSrcRef = useRef<string | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // If src changed, or we haven't initialized this src yet
        if (initializedSrcRef.current !== src) {
            initializedSrcRef.current = src;

            if (initialTime > 0) {
                // Only seek if significantly different to avoid micro-stutter
                if (Math.abs(video.currentTime - initialTime) > 0.5) {
                    video.currentTime = initialTime;
                    lastTimeRef.current = initialTime;
                }

                if (progressBarRef.current) {
                    const percentage = (initialTime / (video.duration || 1)) * 100;
                    progressBarRef.current.style.width = `${percentage}%`;
                }
            }

            if (autoPlay) {
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => setIsPlaying(true))
                        .catch((error) => {
                            if (error.name !== "AbortError") {
                                console.error("Auto-play failed:", error);
                            }
                            setIsPlaying(false);
                        });
                }
            }
        }
    }, [src, initialTime, autoPlay]);


    // 2. Setup Event Listeners (Run ONCE per src)
    // We intentionally exclude isPlaying/isDragging from deps and use Refs to avoid re-attaching listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            if (progressBarRef.current) {
                const percentage = (video.currentTime / video.duration) * 100;
                progressBarRef.current.style.width = `${percentage}%`;
            }
        };

        const handleTimeUpdate = () => {
            if (onProgress) onProgress(video.currentTime, video.duration);

            // Fallback: If NOT playing or IS dragging, update visuals here
            const playing = isPlayingRef.current;
            if (!playing || isDragging) {
                const percentage = (video.currentTime / video.duration) * 100;
                if (progressBarRef.current) progressBarRef.current.style.width = `${percentage}%`;

                // Update time text directly via ref
                if (timeDisplayRef.current) {
                    timeDisplayRef.current.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`;
                }
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setShowControls(true);
            if (onEnded) onEnded();
        };

        const handleError = (e: any) => {
            console.error("Video Error:", video.error);
            setError(video.error?.message || "Unknown Playback Error");
            setIsPlaying(false);
        };

        const handlePlayProp = () => setIsPlaying(true);
        const handlePauseProp = () => setIsPlaying(false);

        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("ended", handleEnded);
        video.addEventListener("error", handleError);
        video.addEventListener("play", handlePlayProp);
        video.addEventListener("pause", handlePauseProp);

        return () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("ended", handleEnded);
            video.removeEventListener("error", handleError);
            video.removeEventListener("play", handlePlayProp);
            video.removeEventListener("pause", handlePauseProp);
        };
    }, [src, onEnded, onProgress, isDragging]); // isPlaying removed

    // Sync playbackRate with video element whenever it changes or new video loads
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate, src]);


    // ... (Keyboard Shortcuts useEffects - No changes needed)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore keys if input is focused
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            const video = videoRef.current;
            if (!video) return;

            switch (e.key) {
                case " ":
                case "k":
                    e.preventDefault();
                    togglePlay();
                    showOverlay(video.paused ? "Pause" : "Play", video.paused ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />);
                    break;
                case "ArrowRight":
                    video.currentTime = Math.min(video.currentTime + 10, duration);
                    showOverlay("+10s", <SkipForward className="h-8 w-8" />);
                    // Manual visual update for immediate feedback
                    requestAnimationFrame(updateProgressVisuals);
                    break;
                case "ArrowLeft":
                    video.currentTime = Math.max(video.currentTime - 10, 0);
                    showOverlay("-10s", <SkipBack className="h-8 w-8" />);
                    // Manual visual update for immediate feedback
                    requestAnimationFrame(updateProgressVisuals);
                    break;
                // ... (volume and speed cases same as before)
                case "ArrowUp":
                    e.preventDefault();
                    setVolume(v => {
                        const newVol = Math.min(v + 0.1, 1);
                        video.volume = newVol;
                        showOverlay(`${Math.round(newVol * 100)}%`, <Volume2 className="h-8 w-8" />);
                        return newVol;
                    });
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    setVolume(v => {
                        const newVol = Math.max(v - 0.1, 0);
                        video.volume = newVol;
                        showOverlay(`${Math.round(newVol * 100)}%`, newVol === 0 ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />);
                        return newVol;
                    });
                    break;
                case "+":
                case "=":
                    setVolume(v => {
                        const newVol = Math.min(v + 0.1, 1);
                        video.volume = newVol;
                        showOverlay(`${Math.round(newVol * 100)}%`, <Volume2 className="h-8 w-8" />);
                        return newVol;
                    });
                    break;
                case "-":
                    setVolume(v => {
                        const newVol = Math.max(v - 0.1, 0);
                        video.volume = newVol;
                        showOverlay(`${Math.round(newVol * 100)}%`, newVol === 0 ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />);
                        return newVol;
                    });
                    break;
                case "}":
                case "]":
                    cycleSpeed(1);
                    break;
                case "{":
                case "[":
                    cycleSpeed(-1);
                    break;
                case "f":
                    toggleFullscreen();
                    break;
                case "m":
                    toggleMute();
                    break;
                case "l":
                    toggleLoop();
                    break;
                case "b":
                    e.preventDefault();
                    handleBookmarkClick();
                    break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [duration, volume, isMuted, playbackRate, updateProgressVisuals]);


    // Controls Visibility (No changes)
    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [isPlaying]);


    // Handle Subtitle Switching
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const selectedTrack = subtitles.find(t => t.id === activeSubtitle);

        Array.from(video.textTracks).forEach(track => {
            if (selectedTrack && track.label === selectedTrack.label) {
                track.mode = 'showing';
            } else {
                track.mode = 'hidden';
            }
        });
    }, [activeSubtitle, subtitles]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            // Optimistic UI Update
            setIsPlaying(true);
            handleMouseMove();
            showOverlay("Play", <Play className="h-8 w-8" />);

            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise
                    .catch((error) => {
                        if (error.name !== "AbortError") {
                            console.error("Play failed:", error);
                            // Revert state only on genuine errors
                            setIsPlaying(false);
                        }
                    });
            }
        } else {
            video.pause();
            setIsPlaying(false);
            setShowControls(true);
            showOverlay("Pause", <Pause className="h-8 w-8" />);
        }
    };

    const toggleLoop = () => {
        const video = videoRef.current;
        if (!video) return;

        const newLoopState = !isLooping;
        video.loop = newLoopState;
        setIsLooping(newLoopState);
        showOverlay(newLoopState ? "Loop: On" : "Loop: Off", <Repeat className="h-8 w-8" />);
    };

    // ... (toggleMute, toggleFullscreen, cycleSpeed, handleSubtitleUpload remain same)
    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(!isMuted);
        showOverlay(video.muted ? "Mute" : "Unmute", video.muted ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const cycleSpeed = (direction: 1 | -1 = 1) => {
        const video = videoRef.current;
        if (!video) return;
        const speeds = [0.5, 1, 1.25, 1.5, 2];
        let currentIndex = speeds.indexOf(playbackRate);
        if (currentIndex === -1) currentIndex = 1;

        let nextIndex = currentIndex + direction;
        if (nextIndex >= speeds.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = speeds.length - 1;

        const nextSpeed = speeds[nextIndex];
        video.playbackRate = nextSpeed;
        setPlaybackRate(nextSpeed);
        localStorage.setItem("player-speed", nextSpeed.toString());
        showOverlay(`${nextSpeed}x`, <Settings className="h-8 w-8" />);
    };

    const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (Logic same as before)
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            let vttContent = content;
            if (file.name.endsWith('.srt') || content.includes('-->')) {
                vttContent = srtToVtt(content);
            }
            const blob = new Blob([vttContent], { type: 'text/vtt' });
            const url = URL.createObjectURL(blob);
            const newTrack: SubtitleTrack = {
                id: Math.random().toString(36).substr(2, 9),
                label: file.name,
                src: url,
                language: 'en'
            };
            setSubtitles(prev => [...prev, newTrack]);
            setActiveSubtitle(newTrack.id);
            showOverlay("Subtitle Added", <Subtitles className="h-8 w-8" />);
        };
        reader.readAsText(file);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const newTime = (Number(e.target.value) / 100) * duration;
        if (Number.isFinite(newTime)) {
            video.currentTime = newTime;
            // Visual udpate handled by frame loop, but immediate update good for UX
            // We don't set progress state anymore
            if (progressBarRef.current) {
                progressBarRef.current.style.width = `${e.target.value}%`;
            }
        }
    };

    // Wrapper to handle drag start/stop for smoother seeking
    const handleSeekStart = () => setIsDragging(true);
    const handleSeekEnd = (e: any) => {
        setIsDragging(false);
        // Force one update
        handleSeek({ target: { value: e.target.value } } as any);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVol = Number(e.target.value);
        setVolume(newVol);
        if (videoRef.current) videoRef.current.volume = newVol;
        setIsMuted(newVol === 0);
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative group bg-black overflow-hidden flex items-center justify-center",
                isFullscreen ? "fixed inset-0 z-50 h-screen w-screen" : "w-full aspect-video rounded-xl shadow-2xl ring-1 ring-white/10",
                !showControls && isPlaying ? "cursor-none" : "cursor-default"
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Flex Container for Video + Sidebar */}
            <div className="flex w-full h-full relative">

                {/* Video Area */}
                <div className="flex-1 relative h-full bg-black flex items-center justify-center">

                    {/* Hidden File Input for Subtitles */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".vtt,.srt"
                        onChange={handleSubtitleUpload}
                    />

                    <video
                        ref={videoRef}
                        src={src}
                        poster={poster}
                        className="w-full h-full object-contain"
                        onClick={togglePlay}
                        crossOrigin="anonymous"
                    >
                        {subtitles.map(track => (
                            <track
                                key={track.id}
                                kind="subtitles"
                                label={track.label}
                                src={track.src}
                                srcLang={track.language}
                            />
                        ))}
                    </video>

                    {/* Action Feedback Overlay & Big Play Button moved inside Video Area wrapper */}
                    {overlayMessage && (
                        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none animate-in fade-in zoom-in duration-200">
                            <div className="bg-black/60 text-white px-6 py-4 rounded-xl flex flex-col items-center gap-2 backdrop-blur-sm">
                                {overlayMessage.icon}
                                <span className="text-lg font-bold">{overlayMessage.text}</span>
                            </div>
                        </div>
                    )}

                    {!isPlaying && !overlayMessage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                            <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform">
                                <Play className="h-8 w-8 text-white fill-white" />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                            <div className="text-center p-4">
                                <p className="text-red-500 font-bold mb-2">Video Error</p>
                                <p className="text-white text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {children}

                    {/* Controls Bar */}
                    <div className={cn(
                        "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-all duration-300 z-40",
                        showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                    )}>
                        {/* Custom Progress Bar */}
                        <div className="relative group/progress mb-4 cursor-pointer h-1.5 hover:h-2.5 transition-all">
                            {/* Background */}
                            <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden">
                                {/* Fill - Controlled by Ref for 60fps smoothness */}
                                <div
                                    ref={progressBarRef}
                                    className="h-full bg-primary relative w-0"
                                // style={{ width: `${progress}%` }} <-- REMOVED State binding
                                >
                                    <div
                                        ref={progressThumbRef}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-md"
                                    />
                                </div>
                                {/* Bookmarks Markers */}
                                {bookmarks?.map(b => (
                                    <div
                                        key={b.id}
                                        className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10 hover:w-1.5 hover:scale-y-125 transition-all cursor-pointer"
                                        style={{ left: `${(b.time / (duration || 1)) * 100}%` }}
                                        title={`${b.label} (Right-click to remove)`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (videoRef.current) {
                                                videoRef.current.currentTime = b.time;
                                            }
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onRemoveBookmark?.(b.id);
                                        }}
                                    />
                                ))}
                            </div>
                            {/* Input Range for Click/Drag */}
                            <input
                                type="range"
                                min="0"
                                max="100"
                                defaultValue="0"
                                onMouseDown={handleSeekStart}
                                onTouchStart={handleSeekStart}
                                onMouseUp={handleSeekEnd}
                                onTouchEnd={handleSeekEnd}
                                onChange={handleSeek}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {onPrevious && (
                                    <Button variant="ghost" size="icon" onClick={onPrevious} className="text-white hover:bg-white/10">
                                        <SkipBack className="h-5 w-5 fill-current" />
                                    </Button>
                                )}

                                <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/10">
                                    {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
                                </Button>

                                {onNext && (
                                    <Button variant="ghost" size="icon" onClick={onNext} className="text-white hover:bg-white/10">
                                        <SkipForward className="h-5 w-5 fill-current" />
                                    </Button>
                                )}

                                {/* Volume Control with Hover Slider */}
                                <div className="group/volume relative flex items-center">
                                    <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/10">
                                        {isMuted || volume === 0 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                                    </Button>

                                    <div className="hidden group-hover/volume:flex justify-center absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-[#1a1a1a] p-3 rounded-xl border border-[#333] shadow-xl">
                                        <div className="h-24 w-1.5 bg-white/20 rounded-full relative">
                                            <div
                                                className="absolute bottom-0 left-0 w-full bg-white rounded-full"
                                                style={{ height: `${(isMuted ? 0 : volume) * 100}%` }}
                                            />
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={isMuted ? 0 : volume}
                                                onChange={handleVolumeChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                style={{ appearance: "slider-vertical" } as any}
                                            />
                                            <div
                                                className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-md pointer-events-none"
                                                style={{ bottom: `calc(${(isMuted ? 0 : volume) * 100}% - 8px)` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="text-sm font-medium text-white/90 font-mono">
                                    {/* Timer updates only 1/sec via state */}
                                    <div className="text-sm font-medium text-white/90 font-mono">
                                        <span ref={timeDisplayRef}>
                                            {formatTime(initialTime)} / {formatTime(duration || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2">
                                {/* Subtitles */}
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                                        className={cn("text-white hover:bg-white/10 relative h-8 w-8 transition-colors", activeSubtitle && "text-primary")}
                                        title="Subtitles"
                                    >
                                        <Subtitles className="h-4 w-4" />
                                        {activeSubtitle && <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-primary rounded-full shadow-sm ring-1 ring-black/50" />}
                                    </Button>

                                    {/* Speed Control */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => cycleSpeed(1)}
                                        className="text-white hover:bg-white/10 h-8 px-2 min-w-[3rem] font-mono text-xs"
                                        title="Playback Speed (Click to cycle)"
                                    >
                                        {playbackRate}x
                                    </Button>

                                    {/* Bookmark Button */}
                                    <Button variant="ghost" size="icon" onClick={handleBookmarkClick} className={cn("text-white hover:bg-white/10 h-8 w-8", showBookmarkInput && "bg-white/10")} title="Bookmark Timestamp">
                                        <BookmarkIcon className="h-4 w-4" />
                                    </Button>

                                    {/* Bookmark Input Overlay */}
                                    {showBookmarkInput && (
                                        <div className="absolute bottom-full right-0 mb-2 w-72 bg-black/90 sorted-backdrop-blur rounded-xl border border-white/10 shadow-xl p-3 animate-in fade-in slide-in-from-bottom-2 z-50">
                                            <h4 className="text-xs font-semibold text-white/90 mb-2 flex items-center gap-2">
                                                <BookmarkIcon className="h-3 w-3 text-primary" />
                                                Add Bookmark Note
                                            </h4>
                                            <input
                                                ref={bookmarkInputRef}
                                                type="text"
                                                placeholder="Part I don't get..."
                                                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 mb-3 placeholder:text-white/30"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveBookmark();
                                                    if (e.key === 'Escape') {
                                                        setShowBookmarkInput(false);
                                                        if (wasPlayingBeforeBookmark.current) setIsPlaying(true);
                                                    }
                                                    e.stopPropagation();
                                                }}
                                            />
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setShowBookmarkInput(false);
                                                        if (wasPlayingBeforeBookmark.current) setIsPlaying(true);
                                                    }}
                                                    className="h-7 text-xs hover:bg-white/10 text-white/70"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleSaveBookmark}
                                                    className="h-7 text-xs bg-white hover:bg-white/90 text-black font-semibold"
                                                >
                                                    Save Bookmark
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {showSubtitleMenu && (
                                        <div className="absolute bottom-full right-0 mb-2 w-56 bg-black/90 sorted-backdrop-blur rounded-xl border border-white/10 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
                                            {/* (Menu content remains same, just ensuring parent div is okay) */}
                                            <div className="p-3 border-b border-white/10 bg-white/5">
                                                <h4 className="text-white text-xs font-semibold flex items-center gap-2">
                                                    <Subtitles className="h-3 w-3" /> Subtitles
                                                </h4>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto p-1">
                                                <button
                                                    onClick={() => {
                                                        setActiveSubtitle(null);
                                                        setSubtitlePreference('off');
                                                        localStorage.setItem("player-language", 'off');
                                                        setShowSubtitleMenu(false);
                                                    }}
                                                    className={cn("w-full text-left px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/10 flex items-center justify-between", !activeSubtitle ? "text-primary font-medium" : "text-white/70")}
                                                >
                                                    Off
                                                </button>
                                                {subtitles.map(sub => (
                                                    <button
                                                        key={sub.id}
                                                        onClick={() => {
                                                            setActiveSubtitle(sub.id);
                                                            setSubtitlePreference(sub.language);
                                                            localStorage.setItem("player-language", sub.language);
                                                            setShowSubtitleMenu(false);
                                                        }}
                                                        className={cn("w-full text-left px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/10 flex items-center justify-between", activeSubtitle === sub.id ? "text-primary font-medium" : "text-white/70")}
                                                    >
                                                        <span className="truncate">{sub.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="p-2 border-t border-white/10 bg-white/5">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full text-xs h-7 justify-start text-white/70 hover:text-white"
                                                    onClick={() => {
                                                        fileInputRef.current?.click();
                                                        setShowSubtitleMenu(false);
                                                    }}
                                                >
                                                    <Upload className="h-3 w-3 mr-2" /> Upload .SRT
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Speed - Hide on very small screens if crowded */}
                                <Button variant="ghost" size="sm" onClick={() => cycleSpeed(1)} className="text-white hover:bg-white/10 text-xs font-mono hidden xs:inline-flex h-8 px-2">
                                    {playbackRate}x
                                </Button>

                                {/* Loop Toggle */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setLoop(!loop)}
                                    className={cn("text-white hover:bg-white/10 gap-2 h-8 px-3", loop && "bg-white/10 text-primary")}
                                    title={loop ? "Loop: On" : "Loop: Off"}
                                >
                                    <Repeat className="h-4 w-4" />
                                </Button>

                                {/* Fullscreen Toggle */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleFullscreen}
                                    className="text-white hover:bg-white/10 h-8 px-3"
                                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                                >
                                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div> {/* End Controls Bar */}

                </div> {/* End Video Area */}
            </div>
        </div>
    );
}, (prev, next) => {
    // Custom comparison to avoid re-renders when parent (WatchPage) updates store
    // We only care if the VIDEO CONTENT changes, not if the parent re-renders due to progress updates.

    // 1. Primitive checks
    if (prev.src !== next.src) return false;
    if (prev.title !== next.title) return false;
    if (prev.initialTime !== next.initialTime) return false; // Initial time only matters on mount usually

    // 2. Function checks (assuming stable references from parent, otherwise use logic)
    // onNext/onPrevious are usually stable via useCallback

    // 3. Tracks (Subtitles) - Check content equality
    if (prev.tracks !== next.tracks) {
        const prevTracks = prev.tracks || [];
        const nextTracks = next.tracks || [];

        if (prevTracks.length !== nextTracks.length) return false;

        // Check if all tracks are identical (path/lang/label)
        for (let i = 0; i < prevTracks.length; i++) {
            const p = prevTracks[i];
            const n = nextTracks[i];
            if (p.path !== n.path || p.lang !== n.lang || p.label !== n.label) {
                return false;
            }
        }
        // If content matches, we consider them equal regardless of array reference
    }

    // 4. Children (UpNextOverlay)
    // If showUpNext changes, children changes. We MUST re-render.
    if (prev.children !== next.children) return false;

    // 5. Bookmarks
    if (prev.bookmarks !== next.bookmarks) return false;

    return true; // Props are equal enough
});
VideoPlayer.displayName = "VideoPlayer";
