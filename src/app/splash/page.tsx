"use client";

import { IntroAnimation } from "@/components/layout/intro-animation";

export default function SplashPage() {
    return (
        <div className="w-screen h-screen bg-black overflow-hidden relative">
            <IntroAnimation isSplash={true} />
        </div>
    );
}
