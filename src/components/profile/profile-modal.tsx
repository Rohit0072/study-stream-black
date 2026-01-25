"use client";

import { useState, useEffect } from "react";
import { useLibraryStore } from "@/store/library-store";
import { useUIStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";

export function ProfileModal() {
    const { userProfile, aiProfile, updateUserProfile, updateAiProfile } = useLibraryStore();
    const { isProfileModalOpen, setProfileModalOpen } = useUIStore();

    const [name, setName] = useState(userProfile.name);
    const [age, setAge] = useState(userProfile.age?.toString() || "");
    const [goal, setGoal] = useState(userProfile.studyGoal?.toString() || "2");
    const [bio, setBio] = useState(aiProfile.bio);
    const [learningStyle, setLearningStyle] = useState(aiProfile.learningStyle);

    // Sync state with store when modal opens
    useEffect(() => {
        if (isProfileModalOpen) {
            setName(userProfile.name);
            setAge(userProfile.age?.toString() || "");
            setGoal(userProfile.studyGoal?.toString() || "2");
            setBio(aiProfile.bio);
            setLearningStyle(aiProfile.learningStyle);
        }
    }, [isProfileModalOpen, userProfile, aiProfile]);

    const handleSave = () => {
        updateUserProfile({
            name,
            age: parseInt(age) || 0,
            studyGoal: parseInt(goal) || 2
        });

        if (updateAiProfile) {
            updateAiProfile({
                bio,
                learningStyle: learningStyle as any
            });
        }

        toast.success("Profile updated!");
        setProfileModalOpen(false);
    };

    return (
        <Dialog open={isProfileModalOpen} onOpenChange={setProfileModalOpen}>
            <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Profile Settings</DialogTitle>
                    <DialogDescription className="text-white/40">
                        Customize your learning experience and goals.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs uppercase tracking-widest font-bold text-white/40">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white/5 border-white/10 h-11 rounded-xl focus:ring-blue-500/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="age" className="text-xs uppercase tracking-widest font-bold text-white/40">Age</Label>
                        <Input
                            id="age"
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="bg-white/5 border-white/10 h-11 rounded-xl focus:ring-blue-500/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="goal" className="text-xs uppercase tracking-widest font-bold text-white/40">Daily Goal (Hours)</Label>
                        <Input
                            id="goal"
                            type="number"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            className="bg-white/5 border-white/10 h-11 rounded-xl focus:ring-blue-500/50"
                            min={1}
                            max={24}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="style" className="text-xs uppercase tracking-widest font-bold text-white/40">Learning Style</Label>
                        <Select value={learningStyle} onValueChange={(val: any) => setLearningStyle(val)}>
                            <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl focus:ring-blue-500/50">
                                <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0f0f0f] border-white/10 text-white">
                                <SelectItem value="visual">Visual (Images & Diagrams)</SelectItem>
                                <SelectItem value="auditory">Auditory (Listening & Speaking)</SelectItem>
                                <SelectItem value="text">Text-Based (Reading & Writing)</SelectItem>
                                <SelectItem value="kinesthetic">Kinesthetic (Interactive)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio" className="text-xs uppercase tracking-widest font-bold text-white/40">Bio / Study Context</Label>
                        <Textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="bg-white/5 border-white/10 rounded-xl min-h-[100px] focus:ring-blue-500/50"
                            placeholder="I'm studying for..."
                        />
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold shadow-lg shadow-blue-600/20">
                        <Save className="h-4 w-4 mr-2" /> Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
