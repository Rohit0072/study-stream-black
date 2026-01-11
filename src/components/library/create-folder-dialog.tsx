"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface CreateFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string) => void;
}

export function CreateFolderDialog({ open, onOpenChange, onCreate }: CreateFolderDialogProps) {
    const [name, setName] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onCreate(name.trim());
            setName("");
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-neutral-900 text-white border-white/10">
                <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Organize your courses by creating a new folder.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="gap-4 py-4 flex flex-col">
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Folder Name (e.g., 'Data Science')"
                        className="bg-black/50 border-white/20 text-white placeholder:text-muted-foreground"
                        autoFocus
                    />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!name.trim()}>
                            Create Folder
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
