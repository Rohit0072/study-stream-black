"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/library/course-card";
import { FolderCard } from "@/components/library/folder-card";
import { CreateFolderDialog } from "@/components/library/create-folder-dialog";
import { useLibraryStore } from "@/store/library-store";
import { PlusCircle, Search, FolderPlus, ArrowLeft, Folder as FolderIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyLibrary } from "@/components/library/empty-library";

export default function LibraryPage() {
    const { courses, folders, addCourse, createFolder, deleteFolder, renameFolder } = useLibraryStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const router = useRouter();

    const handleAddCourse = async () => {
        if (window.electron) {
            const courseData = await window.electron.selectFolder();
            if (courseData) {
                addCourse(courseData);
                // Future: If inside a folder, auto-add to it?
                // For now, adds to root.
            }
        } else {
            alert("Electron API not available");
        }
    };

    // Calculate logical sets
    const currentFolder = currentFolderId ? folders?.find(f => f.id === currentFolderId) : null;

    // IDs of courses currently in ANY folder
    const courseIdsInAnyFolder = new Set((folders || []).flatMap(f => f.courseIds));

    // Valid items for display
    let displayedCourses = courses;
    let displayedFolders = folders || [];

    if (currentFolderId) {
        // INSIDE FOLDER: Show only courses in this folder
        displayedFolders = [];
        displayedCourses = courses.filter(c => currentFolder?.courseIds.includes(c.id));
    } else {
        // ROOT: Show folders + ALL Courses (User request: "show all course card even it is in folder or not")
        displayedCourses = courses;
    }

    // Apply Search (Global search filters everything)
    if (searchQuery) {
        displayedCourses = courses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
        displayedFolders = (folders || []).filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Sort
    displayedCourses.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
    });

    return (
        <AppLayout>
            <div className="flex flex-col space-y-8 animate-in fade-in duration-500">
                <CreateFolderDialog
                    open={isCreateFolderOpen}
                    onOpenChange={setIsCreateFolderOpen}
                    onCreate={createFolder}
                />

                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {currentFolderId && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 mr-1"
                                    onClick={() => setCurrentFolderId(null)}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <h2 className="text-3xl font-bold tracking-tight">
                                {currentFolder ? currentFolder.name : "Course Library"}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <span
                                className={currentFolderId ? "cursor-pointer hover:text-white transition-colors" : ""}
                                onClick={() => setCurrentFolderId(null)}
                            >
                                Library
                            </span>
                            {currentFolder && (
                                <>
                                    <span>/</span>
                                    <span>{currentFolder.name}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {!currentFolderId && (
                            <Button onClick={() => setIsCreateFolderOpen(true)} variant="secondary" className="gap-2">
                                <FolderPlus className="h-4 w-4" />
                                New Folder
                            </Button>
                        )}
                        <Button onClick={handleAddCourse} className="gap-2">
                            <PlusCircle className="h-4 w-4" />
                            Add Course
                        </Button>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search courses..."
                            className="pl-9 bg-[#0A0A0A]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Show Empty Library if completely empty (no search, no folder, no items) */}
                    {!currentFolderId && !searchQuery && displayedFolders.length === 0 && displayedCourses.length === 0 ? (
                        <EmptyLibrary />
                    ) : (
                        <>
                            {/* Folders Section */}
                            {!currentFolderId && displayedFolders.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                                        <FolderIcon className="h-4 w-4" /> Folders
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {displayedFolders.map((folder: any) => (
                                            <FolderCard
                                                key={folder.id}
                                                folder={folder}
                                                onClick={() => setCurrentFolderId(folder.id)}
                                                onRename={(name) => renameFolder(folder.id, name)}
                                                onDelete={() => deleteFolder(folder.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Courses Section */}
                            {displayedCourses.length > 0 ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                                        <PlusCircle className="h-4 w-4" />
                                        {currentFolderId ? "Courses in Folder" : "All Courses"}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {displayedCourses.map((course: any, index: number) => (
                                            <CourseCard
                                                key={`${course.id}-${index}`}
                                                course={course}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* Contextual Empty States (Search or Empty Folder) */
                                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg bg-[#050505]">
                                    <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                                        {searchQuery ? <Search className="h-6 w-6 text-muted-foreground" /> : <FolderIcon className="h-6 w-6 text-muted-foreground" />}
                                    </div>
                                    <h3 className="text-lg font-medium">
                                        {searchQuery ? "No results found" : "Empty Folder"}
                                    </h3>
                                    <p className="text-muted-foreground text-sm max-w-xs text-center mt-2 mb-6">
                                        {searchQuery ? `No courses or folders match "${searchQuery}"` : "This folder is empty."}
                                    </p>
                                    {!searchQuery && !currentFolderId && (
                                        <Button onClick={handleAddCourse} variant="secondary">
                                            Add Course
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
