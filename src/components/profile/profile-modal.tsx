"use client";

import { useState } from "react";
import { useLibraryStore } from "@/store/library-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, User, Clock, Brain, Save } from "lucide-react";
import { toast } from "sonner";

export function ProfileModal() {
    const { userProfile, aiProfile, updateUserProfile, updateAiProfile } = useLibraryStore();
    const [open, setOpen] = useState(false);

    const [name, setName] = useState(userProfile.name);
    const [goal, setGoal] = useState(userProfile.studyGoal.toString());
    const [bio, setBio] = useState(aiProfile.bio);
    const [learningStyle, setLearningStyle] = useState(aiProfile.learningStyle);

    const handleSave = () => {
        updateUserProfile({
            name,
            studyGoal: parseInt(goal) || 2
        });

        if (updateAiProfile) {
            updateAiProfile({
                bio,
                learningStyle: learningStyle as any
            });
        }

        toast.success("Profile updated!");
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/10">
                <DialogHeader>
                    <DialogTitle>Profile Settings</DialogTitle>
                    <DialogDescription>
                        Customize your learning experience and goals.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3 bg-[#111] border-white/10"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="goal" className="text-right">Daily Goal</Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <Input
                                id="goal"
                                type="number"
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                className="bg-[#111] border-white/10"
                                min={1}
                                max={24}
                            />
                            <span className="text-sm text-muted-foreground">Hours</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="style" className="text-right">Learning Style</Label>
                        <Select value={learningStyle} onValueChange={(val: any) => setLearningStyle(val)}>
                            <SelectTrigger className="col-span-3 bg-[#111] border-white/10">
                                <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="visual">Visual (Images & Diagrams)</SelectItem>
                                <SelectItem value="auditory">Auditory (Listening & Speaking)</SelectItem>
                                <SelectItem value="text">Text-Based (Reading & Writing)</SelectItem>
                                <SelectItem value="kinesthetic">Kinesthetic (Interactive)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="bio" className="text-right pt-2">Bio / Context</Label>
                        <Textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="col-span-3 bg-[#111] border-white/10 min-h-[80px]"
                            placeholder="I'm studying for..."
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave} className="gap-2">
                        <Save className="h-4 w-4" /> Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
