"use client";

import { ErrorBoundary } from "./error-boundary";

/**
 * Client-side wrapper for ErrorBoundary to be used in layout.tsx
 */
export function ClientErrorBoundary({ children }: { children: React.ReactNode }) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
}
