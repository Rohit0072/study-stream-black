"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useLibraryStore } from "@/store/library-store";
import { Download, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- Helper Components ---

function TrendChart({ data }: { data: { date: string, val: number }[] }) {
    const [hovered, setHovered] = useState<{ idx: number, x: number, y: number, val: number, date: string } | null>(null);

    const height = 200;
    const padding = 20;
    // Find max value for scaling (ensure at least 1 hr / 3600s if empty)
    const maxVal = Math.max(3600, ...data.map(d => d.val));

    // Using viewBox for responsiveness.
    const viewBoxWidth = 1000;
    const barWidth = (viewBoxWidth - (padding * 2)) / Math.max(1, data.length);
    const gap = barWidth * 0.2; // 20% gap
    const effectiveBarWidth = barWidth - gap;

    return (
        <div className="w-full h-full relative">
            <svg viewBox={`-30 -20 ${viewBoxWidth + 50} ${height + 40}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Grid Lines & Y-Axis Labels */}
                {[0, 0.5, 1].map((t) => (
                    <g key={t}>
                        <line x1={0} y1={height * t} x2={viewBoxWidth} y2={height * t} stroke="#333" strokeDasharray={t === 1 ? "" : "4 4"} strokeWidth={t === 1 ? "1" : "0.5"} />
                        <text x={-10} y={height * t + 4} textAnchor="end" className="text-[10px] fill-gray-500 font-mono">
                            {t === 1 ? "0h" : t === 0.5 ? `${Math.round(maxVal / 2 / 60)}m` : `${Math.round(maxVal / 60)}m`}
                        </text>
                    </g>
                ))}

                {/* Bars */}
                {data.map((d, i) => {
                    const barHeight = (d.val / maxVal) * height;
                    const x = padding + (i * barWidth);
                    const y = height - barHeight;
                    const dayNum = parseInt(d.date.split('-')[2]);

                    return (
                        <g key={i} onMouseEnter={() => setHovered({ idx: i, x: x + effectiveBarWidth / 2, y, val: d.val, date: d.date })} onMouseLeave={() => setHovered(null)}>
                            <rect
                                x={x}
                                y={y}
                                width={effectiveBarWidth}
                                height={barHeight}
                                fill={d.val > 0 ? "#3b82f6" : "transparent"}
                                rx={4}
                                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                            />
                            {/* Hitbox for easier hovering on empty days */}
                            <rect
                                x={x}
                                y={0}
                                width={effectiveBarWidth}
                                height={height}
                                fill="transparent"
                                className="cursor-pointer"
                            />
                            {/* X-Axis Labels (Every 5 days) */}
                            {i % 5 === 0 && (
                                <text x={x + effectiveBarWidth / 2} y={height + 20} textAnchor="middle" className="text-[10px] fill-gray-500 font-mono">
                                    {dayNum}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {hovered && (
                <div
                    className="absolute bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 shadow-xl z-50 pointer-events-none flex flex-col items-center gap-0.5 min-w-[100px]"
                    style={{
                        left: `${(hovered.idx / data.length) * 100}%`, // Approx positioning
                        top: 0,
                        transform: `translate(-50%, -120%)`
                    }}
                >
                    <span className="text-lg font-bold text-white">
                        {Math.floor(hovered.val / 3600)}h {Math.floor((hovered.val % 3600) / 60)}m
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {new Date(hovered.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a1a] border-b border-r border-[#333] rotate-45" />
                </div>
            )}
        </div>
    );
}

function YearHeatmap({ year, data }: { year: number, data: Record<string, number> }) {
    // Generate dates for the year
    const weeks = useMemo(() => {
        const startDate = new Date(year, 0, 1);
        // Adjust to start on Sunday
        const dayOffset = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOffset);

        const weeksArr = [];
        let currentWeek = [];
        const endDate = new Date(year, 11, 31);

        let iterDate = new Date(startDate);
        // Build 53 weeks to show full year context
        while (currentWeek.length > 0 || iterDate <= endDate || weeksArr.length < 52) {
            // Safety break
            if (weeksArr.length > 54) break;

            const dateStr = iterDate.toISOString().split('T')[0];
            const val = data?.[dateStr] || 0;
            const inYear = iterDate.getFullYear() === year;

            currentWeek.push({ date: new Date(iterDate), val, inYear, dateStr });

            if (currentWeek.length === 7) {
                weeksArr.push(currentWeek);
                currentWeek = [];
            }
            iterDate.setDate(iterDate.getDate() + 1);
        }
        return weeksArr;
    }, [year, data]);

    const getColor = (val: number) => {
        if (val === 0) return "bg-[#161b22]"; // Github empty
        if (val < 30 * 60) return "bg-[#0e4429]";
        if (val < 60 * 60) return "bg-[#006d32]";
        if (val < 120 * 60) return "bg-[#26a641]";
        return "bg-[#39d353]";
    };

    // Generate Month Labels
    const monthLabels = useMemo(() => {
        const labels: { month: number, idx: number }[] = [];
        let lastMonth = -1;
        weeks.forEach((week, i) => {
            const firstDayOfWeek = week[0]?.date;
            if (firstDayOfWeek) {
                const m = firstDayOfWeek.getMonth();
                if (m !== lastMonth) {
                    labels.push({ month: m, idx: i });
                    lastMonth = m;
                }
            }
        });
        return labels;
    }, [weeks]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

    return (
        <div className="flex gap-2">
            {/* Day Labels (Left) */}
            <div className="flex flex-col gap-1 pt-[20px]">
                {dayLabels.map((d, i) => (
                    <div key={i} className="h-3 text-[10px] text-gray-500 font-mono leading-3 text-right pr-1">
                        {d}
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-1">
                {/* Month Labels (Top) */}
                <div className="flex relative h-[16px] w-full mb-1">
                    {monthLabels.map((l, i) => (
                        <div
                            key={i}
                            className="absolute text-[10px] text-gray-400 font-mono"
                            style={{ left: `${l.idx * 16}px` }} // 12px width + 4px gap approx
                        >
                            {monthNames[l.month]}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex gap-1 min-w-fit">
                    {weeks.map((week, wIdx) => (
                        <div key={wIdx} className="flex flex-col gap-1">
                            {week.map((day, dIdx) => (
                                <div
                                    key={day.dateStr}
                                    className={cn(
                                        "w-3 h-3 rounded-[2px] transition-colors relative group",
                                        day.inYear ? getColor(day.val) : "opacity-0"
                                    )}
                                >
                                    {/* Simple Tooltip on Hover */}
                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black text-white text-xs px-2 py-1 rounded z-50 whitespace-nowrap pointer-events-none border border-[#333]">
                                        {day.date.toLocaleDateString()} : {Math.floor(day.val / 60)}m
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// --- Main Page Component ---

export default function AnalyticsPage() {
    const { studyLog, userProfile, courses } = useLibraryStore();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11

    // Constants
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // --- Helpers ---

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const downloadCSV = () => {
        const rows = [["Date", "Minutes", "Hours"]];
        Object.entries(studyLog).sort().forEach(([date, seconds]) => {
            const mins = Math.round(seconds / 60);
            const hrs = (seconds / 3600).toFixed(2);
            rows.push([date, String(mins), hrs]);
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `study_stream_data_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Data Aggregation ---

    const monthlyStats = useMemo(() => {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const data = [];
        let totalSeconds = 0;
        let activeDays = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const val = studyLog?.[dateStr] || 0;
            totalSeconds += val;
            if (val > 60) activeDays++;

            data.push({ date: dateStr, val });
        }

        return { data, totalSeconds, activeDays };
    }, [studyLog, selectedYear, selectedMonth]);


    return (
        <AppLayout>
            <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Analytics</h1>
                        <p className="text-gray-400 text-sm mt-1">Track your study progress and habits.</p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-2 border-[#333] hover:bg-[#222]">
                            <Download size={14} />
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* Date Controls */}
                <div className="flex items-center gap-4 mb-8 bg-[#111] p-2 rounded-lg border border-[#333] w-fit">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (selectedMonth === 0) {
                                setSelectedMonth(11);
                                setSelectedYear(y => y - 1);
                            } else {
                                setSelectedMonth(m => m - 1);
                            }
                        }}
                    >
                        <ChevronLeft size={16} />
                    </Button>

                    <div className="flex items-center gap-2 min-w-[200px] justify-center font-medium">
                        <Calendar size={16} className="text-gray-400" />
                        {months[selectedMonth]} {selectedYear}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (selectedMonth === 11) {
                                setSelectedMonth(0);
                                setSelectedYear(y => y + 1);
                            } else {
                                setSelectedMonth(m => m + 1);
                            }
                        }}
                    >
                        <ChevronRight size={16} />
                    </Button>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-[#111] border border-[#333] rounded-xl p-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Total Study Time</h3>
                        <div className="text-3xl font-bold text-white">{formatTime(monthlyStats.totalSeconds)}</div>
                        <div className="text-xs text-gray-500 mt-1">in {months[selectedMonth]}</div>
                    </div>
                    <div className="bg-[#111] border border-[#333] rounded-xl p-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Daily Average</h3>
                        <div className="text-3xl font-bold text-blue-400">
                            {formatTime(monthlyStats.activeDays > 0 ? monthlyStats.totalSeconds / monthlyStats.activeDays : 0)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">per active day</div>
                    </div>
                    <div className="bg-[#111] border border-[#333] rounded-xl p-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Consistency</h3>
                        <div className="text-3xl font-bold text-green-400">
                            {Math.round((monthlyStats.activeDays / monthlyStats.data.length) * 100)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{monthlyStats.activeDays} days studied</div>
                    </div>
                </div>

                {/* Main Graph - Study Trend */}
                <div className="bg-[#111] border border-[#333] rounded-xl p-6 mb-8 group relative">
                    <h3 className="text-lg font-semibold mb-6">Study Trend</h3>

                    {/* Chart Container */}
                    <div className="h-[250px] w-full mt-4">
                        <TrendChart data={monthlyStats.data} />
                    </div>
                </div>

                {/* Heatmap & Course Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Heatmap */}
                    <div className="lg:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6 min-h-[300px]">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            Activity Map <span className="text-xs font-normal text-gray-500">({selectedYear})</span>
                        </h3>
                        <div className="w-full overflow-x-auto custom-scrollbar-horizontal pb-2">
                            <YearHeatmap year={selectedYear} data={studyLog} />
                        </div>
                    </div>

                    {/* Course Breakdown */}
                    <div className="bg-[#111] border border-[#333] rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Top Courses</h3>
                        <div className="space-y-4">
                            {courses.slice(0, 5).map(course => (
                                <div key={course.id}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="truncate max-w-[150px]">{course.name}</span>
                                        <span className="text-gray-400">{Math.round((course.completedVideos / (course.totalVideos || 1)) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[#222] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${Math.min(100, (course.completedVideos / (course.totalVideos || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}
