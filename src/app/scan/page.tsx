"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { FolderSearch, Loader2, CheckCircle2, ChevronRight, ChevronDown, Trash2, FileVideo, FolderOpen, AlertCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useLibraryStore } from "@/store/library-store";
import { Course, Section } from "@/types";
import { useRouter } from "next/navigation";

// Types for the Staged State
// We extend the base types to include 'selected' or 'status' if needed, 
// but for now, if it's in the list, it's 'selected'.
// 'Trash' action removes it from the list.

export default function ScanFilesPage() {
    const [step, setStep] = useState<"idle" | "scanning" | "review">("idle");
    const [stagedCourses, setStagedCourses] = useState<Course[]>([]);
    const [scanningPath, setScanningPath] = useState<string | null>(null);
    const { addCourse } = useLibraryStore();
    const router = useRouter();

    // Mock Data for UI Dev (if needed, but we'll try to wire real scan)

    // --- Actions ---

    const handleSelectFolder = async () => {
        try {
            if (!(window as any).electron) {
                alert("Scanning requires the Electron app.");
                return;
            }

            const result = await (window as any).electron.selectDirectory();
            if (result.canceled || result.filePaths.length === 0) return;

            const path = result.filePaths[0];
            setScanningPath(path);
            setStep("scanning");

            // Simulate "Parsing" delay or real scan
            // Real scan:
            try {
                const course = await (window as any).electron.scanDirectory(path);
                if (course) {
                    setStagedCourses(prev => [...prev, course]);
                    setStep("review");
                } else {
                    alert("No valid course structure found.");
                    setStep("idle");
                }
            } catch (err) {
                console.error(err);
                alert("Error scanning directory.");
                setStep("idle");
            }

        } catch (error) {
            console.error("Selection error:", error);
            setStep("idle");
        }
    };

    const handleImport = () => {
        stagedCourses.forEach(course => addCourse(course));
        router.push("/library");
    };

    const removeCourse = (courseId: string) => {
        setStagedCourses(prev => prev.filter(c => c.id !== courseId));
        if (stagedCourses.length <= 1) setStep("idle"); // If last one removed
    };

    const removeSection = (courseId: string, sectionId: string) => {
        setStagedCourses(prev => prev.map(c => {
            if (c.id !== courseId) return c;
            return {
                ...c,
                sections: c.sections.filter(s => s.id !== sectionId)
            };
        }));
    };

    const removeVideo = (courseId: string, sectionId: string, videoId: string) => {
        setStagedCourses(prev => prev.map(c => {
            if (c.id !== courseId) return c;
            return {
                ...c,
                sections: c.sections.map(s => {
                    if (s.id !== sectionId) return s;
                    return {
                        ...s,
                        videos: s.videos.filter(v => v.id !== videoId)
                    };
                })
            };
        }));
    };

    // --- UI Components ---

    const Steps = () => (
        <div className="w-64 border-r border-white/5 p-6 space-y-8 flex-shrink-0 hidden md:block">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">Scanner Progress</h2>
                <p className="text-xs text-muted-foreground">Import your local files</p>
            </div>

            <div className="space-y-6 relative">
                {/* Connector Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10 -z-10" />

                <StepItem
                    status={step === "scanning" ? "active" : step === "review" ? "completed" : "idle"}
                    title="Scanning Directories"
                    desc="Locating files"
                />
                <StepItem
                    status={step === "scanning" ? "pending" : step === "review" ? "completed" : "idle"}
                    title="Parsing Courses"
                    desc="Analyzing structure"
                />
                <StepItem
                    status={step === "review" ? "active" : "idle"}
                    title="Review & Import"
                    desc="Verify content"
                />
            </div>
        </div>
    );

    const StepItem = ({ status, title, desc }: { status: "idle" | "active" | "completed" | "pending", title: string, desc: string }) => {
        return (
            <div className="flex gap-4">
                <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center bg-[#050505] transition-colors",
                    status === "active" ? "border-primary text-primary" :
                        status === "completed" ? "border-primary bg-primary text-black" : "border-white/10 text-muted-foreground"
                )}>
                    {status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <div className={cn("h-1.5 w-1.5 rounded-full", status === "active" ? "bg-primary" : "bg-transparent")} />}
                </div>
                <div>
                    <div className={cn("text-sm font-medium leading-none", status === "idle" && "text-muted-foreground")}>{title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                </div>
            </div>
        );
    };

    return (
        <AppLayout>
            <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row bg-[#0A0A0A] border border-white/5 rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <Steps />

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]">
                        <div>
                            <h1 className="text-lg font-semibold">
                                {step === "review" ? "Review & Import" : "Scan Files"}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {step === "review" ? "Review the courses we found before importing." : "Select a directory to start scanning."}
                            </p>
                        </div>
                        {step === "review" && (
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => { setStagedCourses([]); setStep("idle"); }}>Cancel</Button>
                                <Button onClick={handleImport}>
                                    Import ({stagedCourses.flatMap(c => c.sections.flatMap(s => s.videos)).length} Videos)
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 p-6 relative overflow-hidden flex flex-col">
                        {step === "idle" && (
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={handleSelectFolder}>
                                <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                    <FolderSearch className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-medium mb-2">Select Course Directory</h3>
                                <p className="text-muted-foreground max-w-sm text-center text-sm mb-6">
                                    Choose a folder containing your video courses. We'll automatically organize them into sections.
                                </p>
                                <Button>Browse Files</Button>
                            </div>
                        )}

                        {step === "scanning" && (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <Loader2 className="h-12 w-12 text-primary animate-spin mb-6" />
                                <h3 className="text-xl font-medium">Scanning...</h3>
                                <p className="text-muted-foreground text-sm mt-2 font-mono">{scanningPath}</p>
                            </div>
                        )}

                        {step === "review" && (
                            <ScrollArea className="flex-1 -mr-4 pr-4">
                                <div className="space-y-4">
                                    {stagedCourses.map(course => (
                                        <CourseReviewItem
                                            key={course.id}
                                            course={course}
                                            onRemove={() => removeCourse(course.id)}
                                            onRemoveSection={removeSection}
                                            onRemoveVideo={removeVideo}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// --- Helper Components for Review Item ---

function CourseReviewItem({
    course,
    onRemove,
    onRemoveSection,
    onRemoveVideo
}: {
    course: Course;
    onRemove: () => void;
    onRemoveSection: (cid: string, sid: string) => void;
    onRemoveVideo: (cid: string, sid: string, vid: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);

    const totalVideos = course.sections.flatMap(s => s.videos).length;
    // Calculate total duration if available
    const totalDuration = course.sections.flatMap(s => s.videos).reduce((acc, v) => acc + (v.duration || 0), 0);
    const hasDuration = totalDuration > 0;

    // Formatting duration
    const formatDuration = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className="border border-white/10 rounded-lg bg-[#0E0E0E] overflow-hidden">
            {/* Course Header */}
            <div className="p-4 flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>

                <div className="h-10 w-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs shrink-0">
                    {course.name.substring(0, 3).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{course.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-white/5 hover:bg-white/10">{totalVideos} Videos</Badge>
                        {hasDuration && <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-white/20" /> {formatDuration(totalDuration)}</span>}
                    </div>
                </div>

                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onRemove}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Sections List */}
            {isExpanded && (
                <div className="border-t border-white/5 divide-y divide-white/5">
                    {course.sections.map(section => (
                        <SectionReviewItem
                            key={section.id}
                            section={section}
                            courseId={course.id}
                            onRemove={() => onRemoveSection(course.id, section.id)}
                            onRemoveVideo={onRemoveVideo}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function SectionReviewItem({
    section,
    courseId,
    onRemove,
    onRemoveVideo
}: {
    section: Section;
    courseId: string;
    onRemove: () => void;
    onRemoveVideo: (cid: string, sid: string, vid: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="bg-black/20">
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-muted-foreground" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>

                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />

                <div className="flex-1 min-w-0 text-sm font-medium text-white/80">
                    {section.name}
                </div>

                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onRemove}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            {isExpanded && (
                <div className="pl-12 pr-4 pb-3 space-y-1">
                    {section.videos.map(video => (
                        <div key={video.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-white/5 transition-colors group text-xs text-muted-foreground">
                            <FileVideo className="h-3.5 w-3.5 shrink-0 opacity-50" />
                            <span className="flex-1 truncate">{video.name}</span>
                            {video.duration ? <span className="opacity-50">{Math.floor(video.duration / 60)}m</span> : null}
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemoveVideo(courseId, section.id, video.id)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
