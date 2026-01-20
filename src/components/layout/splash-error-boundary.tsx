"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

/**
 * Error boundary specifically for the splash screen.
 * If any error occurs during splash, we gracefully close and show the main window.
 */
export class SplashErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[SplashErrorBoundary] Caught error:', error, errorInfo);

        // Signal splash completion to prevent the app from hanging
        this.signalSplashFinished();
    }

    componentDidMount() {
        // Global error handler for uncaught errors
        window.onerror = (message, source, lineno, colno, error) => {
            console.error('[SplashErrorBoundary] Global error:', message);
            this.signalSplashFinished();
            return true;
        };

        // Handle unhandled promise rejections
        window.onunhandledrejection = (event) => {
            console.error('[SplashErrorBoundary] Unhandled rejection:', event.reason);
            this.signalSplashFinished();
        };
    }

    signalSplashFinished = () => {
        try {
            // Mark as seen to prevent loops
            sessionStorage.setItem('hasSeenIntro', 'true');

            // Notify Electron to close splash and show main window
            if (typeof window !== 'undefined' && (window as any).electron?.send) {
                (window as any).electron.send('splash-finished');
            }
        } catch (e) {
            console.error('[SplashErrorBoundary] Failed to signal splash finished:', e);
        }
    };

    render() {
        if (this.state.hasError) {
            // Return a simple black screen while closing
            return (
                <div className="w-screen h-screen bg-black flex items-center justify-center">
                    <p className="text-white/50 text-sm">Loading...</p>
                </div>
            );
        }

        return this.props.children;
    }
}
