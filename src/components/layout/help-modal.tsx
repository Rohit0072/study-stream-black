"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle, RefreshCw, BookOpen, Keyboard } from "lucide-react"
import { toast } from "sonner"
import { useLibraryStore } from "@/store/library-store"

export function HelpModal() {
    const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready'>('idle');
    const [progress, setProgress] = useState(0);
    const [versionInfo, setVersionInfo] = useState<any>(null);
    const [currentVersion, setCurrentVersion] = useState("Loading...");

    // Listen for events & Fetch Version
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electron) {
            const electron = (window as any).electron;

            // Fetch current app version
            electron.getAppVersion().then((ver: string) => {
                setCurrentVersion(ver);
            });

            // Listeners
            const removeAvailable = electron.onUpdateAvailable((info: any) => {
                setStatus('available');
                setVersionInfo(info);
            });

            const removeProgress = electron.onUpdateProgress((prog: any) => {
                setStatus('downloading');
                setProgress(Math.floor(prog.percent));
            });

            const removeDownloaded = electron.onUpdateDownloaded((info: any) => {
                setStatus('ready');
                setVersionInfo(info);
            });

            // Note: Ideally we should return a cleanup function here if the preload exposed one
            // return () => { removeAvailable(); ... } 
        } else {
            // Web Fallback
            setCurrentVersion("1.0.2 (Web)");
        }
    }, []);

    const handleCheckUpdate = async () => {
        setStatus('checking');
        toast.info("Checking for updates...");
        try {
            const result = await (window as any).electron.checkUpdate();
            if (result && result.updateInfo) {
                // If update found, the event listener above will likely fire 'available' too
                // But we can set it here to be sure if events are skipped
                if (status !== 'downloading' && status !== 'ready') {
                    // Wait for event or set available
                }
            } else {
                toast.success("You are up to date!");
                setStatus('idle');
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Check failed. See console.");
            setStatus('idle');
        }
    };

    const startDownload = () => {
        setStatus('downloading');
        (window as any).electron.downloadUpdate();
    };

    const installUpdate = () => {
        (window as any).electron.quitAndInstall();
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white" title="Help & Updates">
                    <HelpCircle className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#111] border-[#333] text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-green-400" />
                        Help & Support
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Update Section */}
                    <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#333] space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-white">App Version</h3>
                                <p className="text-xs text-gray-400">Current: v{currentVersion}</p>
                            </div>

                            {/* Actions based on Status */}
                            {status === 'idle' || status === 'checking' ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-[#333] hover:bg-[#222]"
                                    onClick={handleCheckUpdate}
                                    disabled={status === 'checking'}
                                >
                                    {status === 'checking' ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                                    {status === 'checking' ? "Checking..." : "Check Updates"}
                                </Button>
                            ) : status === 'available' ? (
                                <Button size="sm" onClick={startDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    Download v{versionInfo?.version}
                                </Button>
                            ) : status === 'downloading' ? (
                                <div className="text-right">
                                    <p className="text-xs text-blue-400 mb-1">{progress}% Downloading...</p>
                                </div>
                            ) : status === 'ready' ? (
                                <Button size="sm" onClick={installUpdate} className="bg-green-600 hover:bg-green-700 text-white animate-pulse">
                                    Restart & Install
                                </Button>
                            ) : null}
                        </div>

                        {/* Progress Bar */}
                        {status === 'downloading' && (
                            <div className="h-1 w-full bg-[#222] rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        )}

                        <p className="text-[10px] text-gray-500">
                            {status === 'ready'
                                ? "Update is ready to be installed!"
                                : "Updates are installed automatically on restart when authorized."}
                        </p>
                    </div>

                    {/* Resources */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-300">Resources</h3>
                        <Button variant="ghost" className="w-full justify-start h-9 text-sm text-gray-400 hover:text-white hover:bg-[#222]">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Documentation
                        </Button>
                        <Button variant="ghost" className="w-full justify-start h-9 text-sm text-gray-400 hover:text-white hover:bg-[#222]">
                            <Keyboard className="h-4 w-4 mr-2" />
                            Keyboard Shortcuts
                        </Button>
                    </div>

                    <div className="text-center text-[10px] text-gray-600 mt-2">
                        Study Stream &copy; 2026
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
