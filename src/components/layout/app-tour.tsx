"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useLibraryStore } from "@/store/library-store";

export function AppTour() {
    const { settings, setHasSeenTour } = useLibraryStore();

    useEffect(() => {
        // If already seen, don't show
        if (settings.hasSeenTour) return;

        const driverObj = driver({
            showProgress: true,
            animate: true,
            allowClose: false,
            doneBtnText: "Done",
            nextBtnText: "Next",
            prevBtnText: "Previous",
            onDestroyed: () => {
                // Mark as seen when tour is closed or finished
                setHasSeenTour();
            },
            steps: [
                {
                    popover: {
                        title: "Welcome to Study Stream! 🚀",
                        description: "Your focused environment for local learning. Let's take a quick tour.",
                        side: "left",
                        align: 'start'
                    }
                },
                {
                    element: '#tour-nav-library',
                    popover: {
                        title: "Course Library",
                        description: "This is where all your courses live. Import local folders to get started.",
                        side: "right",
                        align: 'center'
                    }
                },
                {
                    element: '#tour-nav-ai-dashboard',
                    popover: {
                        title: "Productivity AI",
                        description: "Track your tasks, goals, and productivity metrics here.",
                        side: "right",
                        align: 'center'
                    }
                },
                {
                    element: '#tour-nav-bookmarks',
                    popover: {
                        title: "Smart Bookmarks",
                        description: "Quickly access your saved video timestamps and notes.",
                        side: "right",
                        align: 'center'
                    }
                },
                {
                    element: '.cursor-help', // Targeting the streak indicator group
                    popover: {
                        title: "Daily Streak 🔥",
                        description: "Study every day to keep your fire burning! Set your daily goals in the settings.",
                        side: "top",
                        align: 'center'
                    }
                },
                {
                    element: '#tour-nav-settings', // Fixed selector
                    popover: {
                        title: "Settings & Shortcuts",
                        description: "Configure your AI keys and customize global keyboard shortcuts (Ctrl+1, Ctrl+2...).",
                        side: "right",
                        align: 'center'
                    }
                },
                {
                    popover: {
                        title: "You're All Set! ✨",
                        description: "Enjoy your study session. Press '?' anytime to see shortcuts."
                    }
                }
            ]
        });

        // Small delay to ensure UI renders
        const timer = setTimeout(() => {
            driverObj.drive();
        }, 1000);

        return () => clearTimeout(timer);
    }, [settings.hasSeenTour, setHasSeenTour]);

    return null; // Logic only component
}
