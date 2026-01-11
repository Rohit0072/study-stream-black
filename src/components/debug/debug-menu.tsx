"use client";

import React, { useEffect, useState } from 'react';
import { useLibraryStore } from '@/store/library-store';
import { Bug, X, Activity, Cpu, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { debugBus, debugState, VideoStats, VideoLog } from '@/lib/debug-bus';
import { cn } from '@/lib/utils';

export function DebugMenu() {
    const { devMode, setDevMode } = useLibraryStore();
    const [isOpen, setIsOpen] = useState(false);

    // Unified State
    const [activeTab, setActiveTab] = useState<'general' | 'video' | 'logs'>('general');
    const [stats, setStats] = useState<VideoStats>({ fps: 0, droppedFrames: 0, buffer: 0, playbackRate: 1 });
    const [lagMs, setLagMs] = useState(0);
    const [logs, setLogs] = useState<VideoLog[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        const handleStats = (newStats: VideoStats) => {
            setStats(newStats);
        };

        const handleLog = (log: VideoLog) => {
            setLogs(prev => {
                const last = prev[0];
                if (last && last.message === log.message && (Date.now() - new Date('1970-01-01 ' + last.timestamp).getTime() < 5000)) {
                    // Group if same message within 5s (rough check, timestamp parsing is fragile but sufficient for debug)
                    // Better: just check message match
                    const newLast = { ...last, data: { ...last.data, count: (last.data?.count || 1) + 1 }, timestamp: log.timestamp };
                    return [newLast, ...prev.slice(1)];
                } else {
                    return [{ ...log, data: { ...log.data, count: 1 } }, ...prev].slice(0, 50);
                }
            });
        };

        debugBus.on('video-stats', handleStats);
        debugBus.on('log', handleLog);
        return () => {
            debugBus.off('video-stats', handleStats);
            debugBus.off('log', handleLog);
        };
    }, [isOpen]);

    const handleLagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const ms = parseInt(e.target.value);
        setLagMs(ms);
        debugState.simulateLagMs = ms;
    };

    if (!devMode) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-sans">
            {/* Floating Toggle Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-12 w-12 rounded-full shadow-lg bg-red-600 hover:bg-red-700 text-white p-0 animate-in zoom-in duration-200"
                >
                    <Bug className="h-6 w-6" />
                </Button>
            )}

            {/* Expanded Menu */}
            {isOpen && (
                <div className="bg-[#111] border border-[#333] rounded-xl shadow-2xl w-80 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-[#333] bg-[#0a0a0a]">
                        <div className="flex items-center gap-2 text-red-500 font-bold">
                            <Bug className="h-4 w-4" />
                            <span>Developer Tools</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/10" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-[#333]">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={cn(
                                "flex-1 py-2 text-xs font-medium transition-colors hover:bg-white/5",
                                activeTab === 'general' ? "text-primary border-b-2 border-primary bg-white/5" : "text-zinc-500"
                            )}
                        >
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab('video')}
                            className={cn(
                                "flex-1 py-2 text-xs font-medium transition-colors hover:bg-white/5",
                                activeTab === 'video' ? "text-primary border-b-2 border-primary bg-white/5" : "text-zinc-500"
                            )}
                        >
                            Video Debugger
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={cn(
                                "flex-1 py-2 text-xs font-medium transition-colors hover:bg-white/5",
                                activeTab === 'logs' ? "text-primary border-b-2 border-primary bg-white/5" : "text-zinc-500"
                            )}
                        >
                            Logs
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 min-h-[200px] text-zinc-300 text-sm">
                        {activeTab === 'general' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span>Developer Mode</span>
                                    <Switch checked={devMode} onCheckedChange={setDevMode} />
                                </div>
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs space-y-1">
                                    <div className="font-semibold text-red-400">Environment</div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <span className="text-zinc-500">Platform:</span>
                                        <span>{typeof window !== 'undefined' && (window as any).electron ? 'Electron' : 'Web Browser'}</span>
                                        <span className="text-zinc-500">Build:</span>
                                        <span>Dev</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'video' && (
                            <div className="space-y-4">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-[#1a1a1a] p-2 rounded border border-[#333]">
                                        <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                                            <Activity className="h-3 w-3" /> FPS
                                        </div>
                                        <div className={cn("text-xl font-mono font-bold mt-1", stats.fps < 30 ? "text-red-500" : "text-green-500")}>
                                            {stats.fps}
                                        </div>
                                    </div>
                                    <div className="bg-[#1a1a1a] p-2 rounded border border-[#333]">
                                        <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                                            <MonitorPlay className="h-3 w-3" /> Speed
                                        </div>
                                        <div className="text-xl font-mono font-bold mt-1 text-blue-400">
                                            {stats.playbackRate}x
                                        </div>
                                    </div>
                                </div>

                                {/* Lag Simulator */}
                                <div className="space-y-2 pt-2 border-t border-[#333]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
                                            <Cpu className="h-3 w-3" />
                                            Main Thread Lag (busy wait)
                                        </div>
                                        <span className="text-xs font-mono bg-orange-500/20 px-1.5 py-0.5 rounded text-orange-400">
                                            {lagMs}ms
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="200"
                                        step="10"
                                        value={lagMs}
                                        onChange={handleLagChange}
                                        className="w-full accent-orange-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <p className="text-[10px] text-zinc-500">
                                        Simulates heavy JS load to test UI responsiveness and video smoothness.
                                    </p>
                                </div>

                                {/* I/O Debugging */}
                                <div className="space-y-2 pt-2 border-t border-[#333]">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                                            <span>Disable Auto-Save</span>
                                        </label>
                                        <Switch
                                            checked={debugState.disableProgressSave}
                                            onCheckedChange={(c) => {
                                                debugState.disableProgressSave = c;
                                                setLagMs(prev => prev); // dummy update
                                            }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-zinc-500">
                                        Prevents writing progress to storage.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'logs' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                                    <span>Performance Audits</span>
                                    <button onClick={() => setLogs([])} className="hover:text-white">Clear</button>
                                </div>
                                <div className="space-y-1 h-[250px] overflow-y-auto pr-1">
                                    {logs.length === 0 ? (
                                        <div className="text-center text-xs text-zinc-600 py-8">No issues detected</div>
                                    ) : (
                                        logs.map((log, i) => (
                                            <div key={i} className={cn(
                                                "text-[10px] p-2 rounded border font-mono",
                                                log.type === 'error' ? "bg-red-950/20 border-red-900/30 text-red-400" :
                                                    log.type === 'warn' ? "bg-yellow-950/20 border-yellow-900/30 text-yellow-400" :
                                                        "bg-blue-950/20 border-blue-900/30 text-blue-400"
                                            )}>
                                                <div className="flex justify-between opacity-50 mb-1">
                                                    <span>{log.timestamp}</span>
                                                    <span className="uppercase">{log.type}</span>
                                                </div>
                                                <div className="font-semibold">{log.message}</div>
                                                {log.data && (
                                                    <div className="mt-1 opacity-70">
                                                        {JSON.stringify(log.data)}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
