"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function IntroAnimation({ isSplash }: { isSplash?: boolean }) {
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasMounted, setHasMounted] = useState(false);
    const [isVideoFinished, setIsVideoFinished] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        // Check session storage to see if we've already played it this session
        const hasPlayed = sessionStorage.getItem('hasSeenIntro');
        if (hasPlayed) {
            setIsVisible(false);
            // Ensure window is maximized if we skip intro
            if ((window as any).electron?.resizeWindow) {
                (window as any).electron.resizeWindow(true);
            }
        }
    }, []);

    const handleVideoEnd = () => {
        // Stop audio immediately
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.muted = true;
        }

        // 1. Mark as seen
        sessionStorage.setItem('hasSeenIntro', 'true');

        // 2. Fade video content
        setIsVideoFinished(true);

        // 3. Notify Main Process to close splash and show main window
        setTimeout(() => {
            if ((window as any).electron?.send) {
                (window as any).electron.send('splash-finished');
            }

            // Allow for a small fade out time before closing
            setTimeout(() => {
                setIsVisible(false);
            }, 500);
        }, 500);
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (video) {
            const percent = (video.currentTime / video.duration) * 100;
            setProgress(percent);
        }
    };

    // We removed the (!hasMounted) check to prevent the "Flash of Content".
    // The component will render the black overlay immediately (SSR and initial Client).
    // If the user has seen the intro, the useEffect below will hide it shortly after mount.
    // This might cause a brief black flash for returning users, but ensures a solid splash screen for new sessions.

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.0, ease: "easeInOut" }}
                    className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-0 m-0 overflow-hidden"
                >
                    {/* Video Container */}
                    <div className={cn(
                        "relative w-full h-full flex items-center justify-center transition-opacity duration-500",
                        isVideoFinished ? "opacity-0" : "opacity-100"
                    )}>
                        {/* Overlay to ensure black background blending if aspect ratio differs */}
                        <div className="absolute inset-0 bg-black/10 pointer-events-none" />

                        {!isVideoFinished && (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                                onEnded={handleVideoEnd}
                                onTimeUpdate={handleTimeUpdate}
                            >
                                <source src="/animation/staring_aniimation.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        )}
                    </div>

                    {/* Progress Bar Container - Absolute Bottom */}
                    <div className={cn(
                        "absolute bottom-10 left-1/2 -translate-x-1/2 w-[60%] h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm transition-all duration-500 ease-out",
                        isVideoFinished ? "opacity-0" : "opacity-100"
                    )}>
                        <motion.div
                            className="h-full bg-white shadow-[0_0_15px_white]"
                            style={{ width: `${progress}%` }}
                            transition={{ duration: 0.1, ease: "linear" }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
