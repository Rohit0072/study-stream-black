import { Folder } from "@/types";
import { Folder as FolderIcon, Trash2, Edit2, ChevronRight, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useLibraryStore } from "@/store/library-store";

interface FolderCardProps {
    folder: Folder;
    onClick: () => void;
    onRename: (newName: string) => void;
    onDelete: () => void;
}

export function FolderCard({ folder, onClick, onRename, onDelete }: FolderCardProps) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(folder.name);

    const handleRenameSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (newName.trim()) {
            onRename(newName.trim());
            setIsRenaming(false);
        }
    };

    if (isRenaming) {
        return (
            <div className="group relative aspect-video w-full rounded-lg border border-white/10 bg-neutral-900/50 p-6 flex flex-col items-center justify-center gap-4 hover:bg-neutral-900/80 transition-all">
                <FolderIcon className="h-12 w-12 text-blue-400/80" />
                <form onSubmit={handleRenameSubmit} className="w-full px-4">
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                        onBlur={() => handleRenameSubmit()}
                        className="text-center h-8 bg-black/50 border-white/20"
                    />
                </form>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className="group relative aspect-video w-full rounded-lg border border-white/10 bg-neutral-900/30 cursor-pointer flex flex-col items-center justify-center gap-3 hover:bg-neutral-800/50 transition-all hover:scale-[1.02] hover:shadow-xl hover:border-blue-500/30"
        >
            {/* Folder Icon Stack Effect */}
            <div className="relative">
                <div className="absolute -top-2 -right-2 w-full h-full bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <FolderIcon className="h-16 w-16 text-blue-400/60 group-hover:text-blue-400 transition-colors" strokeWidth={1.5} />
                {folder.courseIds.length > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shadow-lg">
                        {folder.courseIds.length}
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-1">
                <h3 className="font-semibold text-lg text-neutral-200 group-hover:text-white">{folder.name}</h3>
                <span className="text-xs text-muted-foreground">{folder.courseIds.length} Courses</span>
            </div>

            {/* Actions Menu */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-neutral-900 border-white/10 text-white">
                        <DropdownMenuItem onClick={() => setIsRenaming(true)} className="gap-2 cursor-pointer hover:bg-white/10">
                            <Edit2 className="h-4 w-4" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="gap-2 cursor-pointer hover:bg-red-500/20 text-red-400">
                            <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
