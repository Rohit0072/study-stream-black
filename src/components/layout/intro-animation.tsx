"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Maximum time to wait for splash screen before auto-skipping (in ms)
const SPLASH_TIMEOUT_MS = 15000;

export function IntroAnimation({ isSplash }: { isSplash?: boolean }) {
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasMounted, setHasMounted] = useState(false);
    const [isVideoFinished, setIsVideoFinished] = useState(false);
    const [hasError, setHasError] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasSignaledRef = useRef(false);

    // Memoized function to signal splash completion (prevents multiple calls)
    const signalSplashFinished = useCallback(() => {
        if (hasSignaledRef.current) return;
        hasSignaledRef.current = true;

        try {
            // Mark as seen to prevent loops
            sessionStorage.setItem('hasSeenIntro', 'true');

            // Notify Electron to close splash and show main window
            if (typeof window !== 'undefined' && (window as any).electron?.send) {
                console.log('[IntroAnimation] Signaling splash-finished');
                (window as any).electron.send('splash-finished');
            }
        } catch (e) {
            console.error('[IntroAnimation] Failed to signal splash finished:', e);
        }

        // Hide the component
        setIsVideoFinished(true);
        setTimeout(() => {
            setIsVisible(false);
        }, 500);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setHasMounted(true);

        // Check session storage to see if we've already played it this session
        try {
            const hasPlayed = sessionStorage.getItem('hasSeenIntro');
            if (hasPlayed) {
                setIsVisible(false);
                hasSignaledRef.current = true; // Prevent signaling
                // Ensure window is maximized if we skip intro
                if ((window as any).electron?.resizeWindow) {
                    (window as any).electron.resizeWindow(true);
                }
                return;
            }
        } catch (e) {
            console.error('[IntroAnimation] Error checking session storage:', e);
        }

        // Setup timeout fallback - if video doesn't complete in time, skip it
        timeoutRef.current = setTimeout(() => {
            console.warn('[IntroAnimation] Timeout reached, auto-skipping splash');
            signalSplashFinished();
        }, SPLASH_TIMEOUT_MS);

    }, [signalSplashFinished]);

    const handleVideoEnd = () => {
        // Clear the timeout since video completed normally
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Stop audio immediately
        try {
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.muted = true;
            }
        } catch (e) {
            console.error('[IntroAnimation] Error pausing video:', e);
        }

        // Signal splash completion with slight delay for fade effect
        setTimeout(() => {
            signalSplashFinished();
        }, 500);
    };

    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        console.error('[IntroAnimation] Video error:', e);
        setHasError(true);

        // Clear timeout and signal immediately
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Skip splash on video error
        signalSplashFinished();
    };

    const handleTimeUpdate = () => {
        try {
            const video = videoRef.current;
            if (video && video.duration && !isNaN(video.duration)) {
                const percent = (video.currentTime / video.duration) * 100;
                setProgress(percent);
            }
        } catch (e) {
            // Silently ignore time update errors
        }
    };

    // Handle case where video can't play (e.g., autoplay blocked)
    const handleCanPlay = () => {
        try {
            if (videoRef.current) {
                videoRef.current.play().catch((error) => {
                    console.warn('[IntroAnimation] Autoplay failed:', error);
                    // If autoplay fails, skip the splash
                    signalSplashFinished();
                });
            }
        } catch (e) {
            console.error('[IntroAnimation] Error in canPlay handler:', e);
            signalSplashFinished();
        }
    };

    // If there's an error, show a brief loading state before transitioning
    if (hasError) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
                <p className="text-white/30 text-sm">Loading...</p>
            </div>
        );
    }

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
                                muted={false}
                                className="w-full h-full object-cover"
                                onEnded={handleVideoEnd}
                                onTimeUpdate={handleTimeUpdate}
                                onError={handleVideoError}
                                onCanPlay={handleCanPlay}
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
