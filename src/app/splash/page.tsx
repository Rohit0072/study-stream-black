"use client";

import dynamic from 'next/dynamic';
import { SplashErrorBoundary } from "@/components/layout/splash-error-boundary";

// Dynamic import the animation to avoid any SSR issues
const IntroAnimation = dynamic(
    () => import("@/components/layout/intro-animation").then(mod => mod.IntroAnimation),
    {
        ssr: false,
        loading: () => <div className="w-screen h-screen bg-black" />
    }
);

export default function SplashPage() {
    return (
        <SplashErrorBoundary>
            <div className="w-screen h-screen bg-black overflow-hidden relative">
                <IntroAnimation isSplash={true} />
            </div>
        </SplashErrorBoundary>
    );
}
