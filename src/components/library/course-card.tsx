import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Course } from "@/types";
import { PlayCircle, BookOpen, Trash2, Info, Sparkles, Pin, Palette, FolderInput, Check, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLibraryStore } from "@/store/library-store";
import { CourseImageGenerator } from "./course-image-generator";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface CourseCardProps {
    course: Course;
    onClick?: () => void;
}

const PREMIUM_COLORS = [
    { name: "Default", value: "#0A0A0A" },
    { name: "Crimson", value: "#2A0A0A" },
    { name: "Navy", value: "#0A0A2A" },
    { name: "Forest", value: "#051A05" },
    { name: "Gold", value: "#1A1505" },
    { name: "Plum", value: "#1A051A" },
    { name: "Teal", value: "#051A1A" },
    { name: "Slate", value: "#1A1A1A" },
];

export function CourseCard({ course, onClick }: CourseCardProps) {
    const router = useRouter();
    const { removeCourse, toggleCoursePin, setCourseColor, folders, moveCourse } = useLibraryStore();

    // Initial folder determination
    const currentFolder = folders?.find(f => f.courseIds.includes(course.id));

    const calculateProgress = () => {
        if (course.totalVideos === 0) return 0;
        return Math.round((course.completedVideos / course.totalVideos) * 100);
    };

    const progress = calculateProgress();

    const handleCardClick = () => {
        if (onClick) {
            onClick();
            return;
        }

        // Navigation Logic
        let targetVideoId = course.lastPlayedVideoId;

        // If no last played, find the first video
        if (!targetVideoId) {
            // Find first section with videos
            const firstSectionWithVideos = course.sections?.find(s => s.videos?.length > 0);
            if (firstSectionWithVideos && firstSectionWithVideos.videos?.length > 0) {
                targetVideoId = firstSectionWithVideos.videos[0].id;
            }
        }

        if (targetVideoId) {
            router.push(`/watch?c=${encodeURIComponent(course.id)}&v=${encodeURIComponent(targetVideoId)}`);
        } else {
            console.warn("No videos found in course", course.id);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to remove "${course.name}"?`)) {
            removeCourse(course.id);
        }
    };

    const [showGenerator, setShowGenerator] = useState(false);

    return (
        <>
            <CourseImageGenerator
                courseId={course.id}
                courseName={course.name}
                isOpen={showGenerator}
                onClose={() => setShowGenerator(false)}
            />

            <Card
                className={cn(
                    "group cursor-pointer transition-all duration-300 relative overflow-visible",
                    "hover:scale-[1.02]",
                    course.isPinned
                        ? "border-primary/50 ring-1 ring-primary/50 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.5)] scale-[1.01]"
                        : "hover:border-primary/50 border-white/5"
                )}
                onClick={handleCardClick}
                style={{ backgroundColor: course.color || '#0A0A0A' }}
            >
                <div className="aspect-video w-full bg-secondary/30 relative flex items-center justify-center overflow-hidden rounded-t-lg">
                    {course.coverImage ? (
                        <img
                            src={course.coverImage}
                            alt={course.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <BookOpen className="h-12 w-12 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
                        {/* Button container needs pointer-events-auto */}
                    </div>

                    {/* Hover Overlay Buttons - Centered Resume */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 pointer-events-none">
                        <Button variant="ghost" className="text-white gap-2 pointer-events-auto" onClick={handleCardClick}>
                            <PlayCircle className="h-6 w-6" />
                            Resume
                        </Button>
                    </div>

                    {/* Pinned Indicator Badge */}
                    {course.isPinned && (
                        <div className="absolute top-2 left-2 z-20 bg-primary/90 text-white p-1.5 rounded-full shadow-[0_0_15px_hsl(var(--primary)/0.6)] backdrop-blur-md animate-in fade-in zoom-in duration-300">
                            <Pin className="h-3.5 w-3.5 fill-white" />
                        </div>
                    )}
                </div>

                {/* Top Right Action Buttons - Moved outside overflow-hidden container to prevent popup clipping */}
                {/* Top Right Action Button - More Options */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 hover:bg-white text-black bg-white/90 backdrop-blur-sm shadow-md"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-56 bg-[#0a0a0a]/95 backdrop-blur-xl border-white/10 text-white shadow-2xl z-50 p-2"
                        >
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                                Actions
                            </DropdownMenuLabel>

                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCoursePin(course.id);
                                }}
                                className="cursor-pointer hover:bg-white/10 flex items-center gap-2 rounded-md focus:bg-white/10 focus:text-white"
                            >
                                <Pin className={cn("h-4 w-4", course.isPinned && "fill-white text-blue-400")} />
                                <span>{course.isPinned ? "Unpin Course" : "Pin Course"}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/course?id=${encodeURIComponent(course.id)}`);
                                }}
                                className="cursor-pointer hover:bg-white/10 flex items-center gap-2 rounded-md focus:bg-white/10 focus:text-white"
                            >
                                <Info className="h-4 w-4" />
                                <span>Course Overview</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-white/10 my-1" />

                            {/* Color Picker Sub-Section */}
                            <div className="px-2 py-1.5">
                                <span className="text-xs text-muted-foreground mb-2 block">Card Color</span>
                                <div className="grid grid-cols-4 gap-2">
                                    {PREMIUM_COLORS.map((color) => (
                                        <div
                                            key={color.value}
                                            className={cn(
                                                "w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-sm",
                                                course.color === color.value && "ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]"
                                            )}
                                            style={{ backgroundColor: color.value }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCourseColor(course.id, color.value);
                                            }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            <DropdownMenuSeparator className="bg-white/10 my-1" />

                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowGenerator(true);
                                }}
                                className="cursor-pointer hover:bg-white/10 flex items-center gap-2 rounded-md focus:bg-white/10 focus:text-white group/ai"
                            >
                                <Sparkles className="h-4 w-4 text-purple-400 group-hover/ai:text-purple-300" />
                                <span>Generate AI Cover</span>
                            </DropdownMenuItem>

                            {/* Folder Sub-Menu (Nested Dropdown equivalent manually for simplicity or logic) */}
                            {/* Ideally native nested dropdown, but for now simple folder section title */}
                            <DropdownMenuSeparator className="bg-white/10 my-1" />
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                                Move to Folder
                            </DropdownMenuLabel>

                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    moveCourse(course.id, null);
                                }}
                                className="cursor-pointer hover:bg-white/10 flex items-center gap-2 rounded-md focus:bg-white/10 focus:text-white"
                            >
                                <FolderInput className="h-4 w-4" />
                                <span className="flex-1">Library (Root)</span>
                                {!currentFolder && <Check className="h-3 w-3 text-blue-400" />}
                            </DropdownMenuItem>

                            {folders && folders.length > 0 && (
                                <div className="max-h-[120px] overflow-y-auto custom-scrollbar">
                                    {folders.map(folder => (
                                        <DropdownMenuItem
                                            key={folder.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveCourse(course.id, folder.id);
                                            }}
                                            className="cursor-pointer hover:bg-white/10 flex items-center gap-2 rounded-md focus:bg-white/10 focus:text-white ml-2 border-l border-white/10"
                                        >
                                            <span className="truncate max-w-[140px] text-sm">{folder.name}</span>
                                            {currentFolder?.id === folder.id && <Check className="h-3 w-3 text-blue-400" />}
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                            )}

                            <DropdownMenuSeparator className="bg-white/10 my-1" />

                            <DropdownMenuItem
                                onClick={handleDelete}
                                className="cursor-pointer hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center gap-2 rounded-md focus:bg-red-500/20 focus:text-red-300"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>Remove Course</span>
                            </DropdownMenuItem>

                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-1 text-base">{course.name}</CardTitle>
                    <CardDescription className="line-clamp-1 text-xs">
                        {course.sections?.length || 0} Sections • {course.totalVideos} Videos
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="space-y-2">
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{progress}% Complete</span>
                            <span>{course.completedVideos}/{course.totalVideos}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
