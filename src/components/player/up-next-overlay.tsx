import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";

interface UpNextOverlayProps {
    nextVideoTitle: string;
    onPlay: () => void;
    onCancel: () => void;
}

export function UpNextOverlay({ nextVideoTitle, onPlay, onCancel }: UpNextOverlayProps) {
    const [countdown, setCountdown] = useState(5);
    const radius = 18;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        if (countdown === 0) {
            onPlay();
            return;
        }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, onPlay]);

    const strokeDashoffset = circumference - ((5 - countdown) / 5) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 right-8 z-40 bg-[#111] border border-[#333] rounded-xl p-6 w-96 shadow-2xl"
        >
            <div className="flex items-center gap-4 mb-4">
                <div className="relative h-12 w-12 flex items-center justify-center">
                    <svg className="transform -rotate-90 w-12 h-12">
                        <circle
                            cx="24"
                            cy="24"
                            r={radius}
                            stroke="#333"
                            strokeWidth="3"
                            fill="transparent"
                        />
                        <circle
                            cx="24"
                            cy="24"
                            r={radius}
                            stroke="#8b5cf6"
                            strokeWidth="3"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 ease-linear"
                        />
                    </svg>
                    <span className="absolute text-sm font-bold">{countdown}</span>
                </div>
                <div>
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Up Next</h3>
                    <p className="text-sm font-medium line-clamp-1 text-white/90" title={nextVideoTitle}>
                        {nextVideoTitle}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground hover:text-white">
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={onPlay}
                    className="bg-white text-black hover:bg-white/90 font-semibold gap-2"
                >
                    <Play className="h-4 w-4 fill-current" />
                    Play Now
                </Button>
            </div>
        </motion.div>
    );
}
