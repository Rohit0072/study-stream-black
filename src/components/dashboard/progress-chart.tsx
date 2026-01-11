"use client";

import { useLibraryStore } from "@/store/library-store";
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

export function ProgressChart() {
    const { studyLog, userProfile } = useLibraryStore();
    const [mounted, setMounted] = useState(false);
    const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; date: string } | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 1. Prepare Data for Last 7 Days
    const stats = useMemo(() => {
        const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        const today = new Date();
        const data = [];
        let maxVal = 60; // Minimum scale of 1 min/60s to avoid flatline

        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const val = studyLog?.[dateStr] || 0;

            if (val > maxVal) maxVal = val;

            data.push({
                day: days[date.getDay()],
                val,
                date: dateStr
            });
        }
        return { data, maxVal };
    }, [studyLog]);

    // 3. Totals (Calculated early for UI)
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySeconds = studyLog?.[todayStr] || 0;
    const weekTotal = stats.data.reduce((acc, curr) => acc + curr.val, 0);

    // Progress Calculation
    const goalSeconds = (userProfile?.studyGoal || 2) * 3600;
    const progressPercent = Math.min(100, (todaySeconds / goalSeconds) * 100);

    // Calculate streak
    const activeDays = Object.values(studyLog || {}).filter(v => v > 60).length;

    // 2. SVG Calculation Helpers
    const width = 100; // viewBox width
    const height = 50; // viewBox height
    const padding = 5;

    // X scale
    const getX = (index: number) => padding + (index / 6) * (width - (padding * 2));
    // Y scale
    const getY = (val: number) => height - (padding + (val / stats.maxVal) * (height - (padding * 2)));

    // Generate Path
    const points = stats.data.map((d, i) => [getX(i), getY(d.val)] as [number, number]);
    const generatePath = (pts: [number, number][]) => {
        if (pts.length === 0) return "";
        let d = `M ${pts[0][0]},${pts[0][1]}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = i > 0 ? pts[i - 1] : pts[0];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;
            const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
            const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
            const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
            const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
            d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
        }
        return d;
    };

    const linePath = generatePath(points);
    const areaPath = `${linePath} L ${width - padding},${height} L ${padding},${height} Z`;

    const formatTimeLong = (seconds: number) => {
        if (seconds === 0) return "0m";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${Math.max(1, m)}m`;
    };

    if (!mounted) return null;

    return (
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6 relative overflow-visible flex flex-col h-full group">
            <h3 className="text-lg font-semibold mb-6 z-10 flex justify-between items-center">
                Your Progress
                <span className="text-xs font-normal text-muted-foreground">Goal: {userProfile?.studyGoal || 2}h/day</span>
            </h3>

            {/* Stats Row */}
            <div className="flex gap-8 mb-6 z-10">
                <div className="flex-1">
                    <div className="flex items-end gap-2 mb-1">
                        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200">
                            {formatTimeLong(todaySeconds)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1.5">/ {userProfile?.studyGoal || 2}h</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-2">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Today's Progress</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-white/90">
                        {formatTimeLong(weekTotal)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">This Week</div>
                </div>
            </div>

            {/* Streak Badge */}
            <div className="flex items-center gap-2 mb-4 bg-white/5 w-fit px-3 py-1.5 rounded-full z-10">
                <Flame className={cn("h-4 w-4", activeDays > 0 ? "text-orange-500 fill-orange-500" : "text-muted-foreground")} />
                <span className="text-xs font-medium text-white/80">{activeDays} Day Streak</span>
            </div>

            {/* Chart Area */}
            <div className="absolute bottom-0 left-0 right-0 h-48 w-full z-0 opacity-80">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Y Grid lines (subtle) */}
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                    <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />

                    {/* Area Fill */}
                    <path d={areaPath} fill="url(#chartGradient)" />

                    {/* Line Stroke */}
                    <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

                    {/* Points & Hit Areas */}
                    {points.map((p, i) => (
                        <g key={i} onMouseEnter={() => setHoveredPoint({ x: p[0], y: p[1], val: stats.data[i].val, date: stats.data[i].date })} onMouseLeave={() => setHoveredPoint(null)}>
                            {/* Line connecting to bottom (visual aid on hover) */}
                            {hoveredPoint?.date === stats.data[i].date && (
                                <line
                                    x1={p[0]} y1={p[1]} x2={p[0]} y2={height - padding}
                                    stroke="white" strokeOpacity="0.2" strokeWidth="0.5" strokeDasharray="2 2"
                                    vectorEffect="non-scaling-stroke"
                                />
                            )}

                            {/* Visible Dot */}
                            <circle
                                cx={p[0]} cy={p[1]} r="1.5"
                                fill="#1e40af" stroke="#60a5fa" strokeWidth="0.5"
                                className={cn("transition-all duration-300", hoveredPoint?.date === stats.data[i].date ? "r-[3px] stroke-white" : "")}
                            />

                            {/* Transparent Hit Area (Wide Vertical Bar) */}
                            <rect
                                x={p[0] - (width / 14)}
                                y={0}
                                width={width / 7}
                                height={height}
                                fill="transparent"
                                className="cursor-pointer"
                            />
                        </g>
                    ))}
                </svg>

                {/* Tooltip Overlay */}
                {hoveredPoint && (
                    <div
                        className="absolute bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 shadow-xl z-50 pointer-events-none flex flex-col items-center gap-0.5 min-w-[80px]"
                        style={{
                            left: `${hoveredPoint.x}%`,
                            top: `${(hoveredPoint.y / 50) * 100}%`,
                            transform: 'translate(-50%, -120%)' // Shift up and center
                        }}
                    >
                        <span className="text-lg font-bold text-white">{formatTimeLong(hoveredPoint.val)}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            {new Date(hoveredPoint.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>

                        {/* Little triangle arrow at bottom */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a1a] border-b border-r border-[#333] rotate-45" />
                    </div>
                )}
            </div>

            {/* X Axis Labels */}
            <div className="flex justify-between mt-auto px-1 pt-2 z-10 relative">
                {stats.data.map((d) => (
                    <span key={d.day} className="text-[10px] text-muted-foreground font-medium w-8 text-center">
                        {d.day}
                    </span>
                ))}
            </div>
        </div>
    );
}
