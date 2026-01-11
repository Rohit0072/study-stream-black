
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateImage } from "@/lib/image-gen";
import { Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useLibraryStore } from "@/store/library-store";

interface CourseImageGeneratorProps {
    courseId: string;
    courseName: string;
    isOpen: boolean;
    onClose: () => void;
}

const COLOR_THEMES = [
    { label: "Blue & Purple", value: "blue-purple" },
    { label: "Cyan & Teal", value: "cyan-teal" },
    { label: "Orange & Violet", value: "orange-violet" },
    { label: "Green & Emerald", value: "green-emerald" },
    { label: "Red & Amber", value: "red-amber" },
    { label: "Dark & Gold", value: "dark-gold" },
];

export function CourseImageGenerator({ courseId, courseName, isOpen, onClose }: CourseImageGeneratorProps) {
    const [subject, setSubject] = useState(courseName);
    const [symbol, setSymbol] = useState("book");
    const [theme, setTheme] = useState("blue-purple");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [manualPrompt, setManualPrompt] = useState(`Minimal illustration of ${courseName}`);
    const [a4fModel, setA4fModel] = useState("provider-4/flux-schnell");

    const { updateCourseImage, settings } = useLibraryStore();
    const isManualProvider = settings.imageGenProvider === 'puter' || settings.imageGenProvider === 'magicstudio';

    const A4F_MODELS = [
        { id: "provider-4/flux-schnell", name: "Flux Schnell (Node 4 - Fast)" },
        { id: "provider-5/flux-schnell", name: "Flux Schnell (Node 5 - Fast)" },
        { id: "provider-2/flux-schnell", name: "Flux Schnell (Node 2 - Fast)" },
        { id: "provider-4/flux-dev", name: "Flux Dev (Node 4 - Quality)" },
        { id: "provider-5/flux-dev", name: "Flux Dev (Node 5 - Quality)" },
        { id: "provider-4/flux-1.1-pro", name: "Flux 1.1 Pro (Via Provider 4)" },
        { id: "provider-4/flux-1.1-pro-ultra", name: "Flux 1.1 Pro Ultra (Via Provider 4)" },
    ];

    useEffect(() => {
        if (isOpen) {
            setManualPrompt(`Minimal illustration of ${courseName}`);
            setSubject(courseName);
        }
    }, [isOpen, courseName]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedImage(null);

        let prompt = "";

        if (isManualProvider) {
            prompt = manualPrompt;
        } else {
            prompt = `Minimal abstract course card illustration for a ${subject} course, dark modern UI style.
A glowing white line-art ${symbol} at the center, soft neon outline, smooth curved abstract gradient waves in the background in ${theme} tones, soft light glow, futuristic but minimal, clean and professional, no text on the image, dark bottom fade to improve readability, rounded card style, high contrast, sharp, digital illustration, 2D, flat, high resolution.`;
        }

        // Validate Custom Flux Settings - REMOVED

        try {
            const url = await generateImage(prompt, settings.imageGenProvider, {
                hf: settings.huggingFaceApiKey,
                gemini: settings.geminiApiKey,
                a4f: settings.a4fApiKey
            }, a4fModel);
            setGeneratedImage(url);
        } catch (error: any) {
            toast.error(error.message || "Failed to generate image.");
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (generatedImage) {
            let finalUrl = generatedImage;

            // If running in Electron, persist the image locally
            if (window.electron && window.electron.saveImage) {
                try {
                    toast.info("Saving image locally...");
                    const localPath = await window.electron.saveImage(generatedImage, courseId);
                    // Convert local path to stream server URL
                    finalUrl = `http://localhost:19999/stream?path=${encodeURIComponent(localPath)}`;
                    console.log("Image saved to:", localPath);
                } catch (err) {
                    console.error("Failed to save image locally:", err);
                    toast.error("Failed to save image locally, using remote URL.");
                }
            }

            updateCourseImage(courseId, finalUrl);
            toast.success("Course cover updated!");
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Generate AI Cover</DialogTitle>
                    <DialogDescription>
                        Create a unique, custom cover for your course using AI.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {isManualProvider ? (
                        <div className="grid gap-2">
                            <Label htmlFor="manual-prompt">Custom Prompt</Label>
                            <Textarea
                                id="manual-prompt"
                                value={manualPrompt}
                                onChange={(e) => setManualPrompt(e.target.value)}
                                placeholder="e.g. Minimal illustration of Java Programming"
                                className="bg-secondary/20 border-white/10 min-h-[100px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                {settings.imageGenProvider === 'puter' ? "Puter works best with short, simple prompts." : "Describe exactly what you want."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="subject">Subject (Short Name)</Label>
                                <Input
                                    id="subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g. Python, History"
                                    className="bg-secondary/20 border-white/10"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="symbol">Symbol Icon</Label>
                                <Input
                                    id="symbol"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                    placeholder="e.g. brain, rocket, code"
                                    className="bg-secondary/20 border-white/10"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="theme">Color Theme</Label>
                                <Select value={theme} onValueChange={setTheme}>
                                    <SelectTrigger className="bg-secondary/20 border-white/10">
                                        <SelectValue placeholder="Select a theme" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                                        {COLOR_THEMES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {settings.imageGenProvider === 'a4f' && (
                                <div className="grid gap-2">
                                    <Label>Flux Variant</Label>
                                    <Select value={a4fModel} onValueChange={setA4fModel}>
                                        <SelectTrigger className="bg-secondary/20 border-white/10">
                                            <SelectValue placeholder="Select Variant" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                                            {A4F_MODELS.map(m => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </>
                    )}

                    <div className="mt-4 aspect-video w-full bg-secondary/20 rounded-lg flex items-center justify-center overflow-hidden border border-white/5 relative">
                        {isGenerating ? (
                            <div className="flex flex-col items-center gap-2 text-primary">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <span className="text-xs">Creating magic...</span>
                            </div>
                        ) : generatedImage ? (
                            <img src={generatedImage} alt="Generated Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                                <ImageIcon className="h-10 w-10" />
                                <span className="text-xs">Preview will appear here</span>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isGenerating}>Cancel</Button>
                    {!generatedImage ? (
                        <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                            <Sparkles className="h-4 w-4" />
                            Generate
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                                Regenerate
                            </Button>
                            <Button onClick={handleSave} disabled={isGenerating}>
                                Save Cover
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
