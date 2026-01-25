"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Global error boundary that catches React component errors.
 * Displays a friendly error UI instead of a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

        this.setState({ errorInfo });

        // You could send this to an error reporting service here
    }

    handleReload = () => {
        // Clear the error state and reload the page
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleTryAgain = () => {
        // Just clear the error state to retry rendering
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-black flex items-center justify-center p-8">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                            <p className="text-muted-foreground text-sm">
                                An unexpected error occurred. Your data is safe - try reloading the app.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 text-left">
                                <p className="text-xs text-red-400 font-mono break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                onClick={this.handleTryAgain}
                                className="gap-2"
                            >
                                Try Again
                            </Button>
                            <Button
                                onClick={this.handleReload}
                                className="gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Reload App
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            If this keeps happening, check the console for more details.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
