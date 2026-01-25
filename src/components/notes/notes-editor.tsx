"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Bold,
    Italic,
    List,
    Heading1,
    Heading2,
    Sparkles,
    Save,
    Eye,
    PenLine,
    Image as ImageIcon,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

import { Video } from "@/types";
import { useLibraryStore } from "@/store/library-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ImageGenService } from "@/lib/image-gen-service";

interface NotesEditorProps {
    courseId: string;
    videoId: string;
    className?: string;
    currentVideo?: Video;
}

export function NotesEditor({ courseId, videoId, className, currentVideo }: NotesEditorProps) {
    const { notes, saveNote, settings } = useLibraryStore();
    const router = useRouter();
    const noteId = `${courseId}-${videoId}`;

    // Editor State
    const [content, setContent] = useState("");
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false); // Text Gen

    // Image Gen State
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [imagePrompt, setImagePrompt] = useState("");
    const [imageModel, setImageModel] = useState<'flux' | 'gemini'>('gemini'); // Default to what user asked
    const [a4fModel, setA4fModel] = useState<string>("provider-4/flux-schnell");
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isImageGenerating, setIsImageGenerating] = useState(false);

    const A4F_MODELS = [
        { id: "provider-4/flux-schnell", name: "Flux Schnell (Node 4 - Fast)" },
        { id: "provider-5/flux-schnell", name: "Flux Schnell (Node 5 - Fast)" },
        { id: "provider-2/flux-schnell", name: "Flux Schnell (Node 2 - Fast)" },
        { id: "provider-4/flux-dev", name: "Flux Dev (Node 4 - Quality)" },
        { id: "provider-5/flux-dev", name: "Flux Dev (Node 5 - Quality)" },
        { id: "provider-4/flux-1.1-pro", name: "Flux 1.1 Pro (Via Provider 4)" },
        { id: "provider-4/flux-1.1-pro-ultra", name: "Flux 1.1 Pro Ultra (Via Provider 4)" },
    ];

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Initial Load
    useEffect(() => {
        const storedNote = notes[noteId];
        if (storedNote) {
            setContent(storedNote.content);
        } else {
            const localSaved = localStorage.getItem(`notes-${courseId}-${videoId}`);
            if (localSaved) setContent(localSaved);
        }
    }, [courseId, videoId, notes, noteId]);

    // Auto-save Effect
    useEffect(() => {
        if (!autoSaveEnabled || !content) return;
        const timer = setTimeout(() => {
            saveNote(courseId, videoId, content);
        }, 2000);
        return () => clearTimeout(timer);
    }, [content, autoSaveEnabled, courseId, videoId, saveNote]);

    const handleSave = () => {
        setIsSaving(true);
        saveNote(courseId, videoId, content);
        toast.success("Notes saved locally");
        setTimeout(() => setIsSaving(false), 1000);
    };

    const togglePreview = () => setIsPreview(!isPreview);

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                togglePreview();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [content, isPreview]);

    const insertMarkdown = (prefix: string, suffix: string = "") => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const selected = text.substring(start, end);
        const after = text.substring(end);

        const newText = `${before}${prefix}${selected}${suffix}${after}`;
        setContent(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    // Text Generation
    const handleGenerateAI = async () => {
        if (!settings.geminiApiKey) {
            if (confirm("Gemini API Key is missing. Go to Settings to configure it?")) {
                router.push('/settings');
            }
            return;
        }

        const subtitles = currentVideo?.subtitles || [];
        if (subtitles.length === 0) {
            alert("No subtitles found for this video. AI notes require a subtitle file.");
            return;
        }

        setIsGenerating(true);

        try {
            const trackToUse = subtitles.find(s => s.lang === 'en') || subtitles[0];
            const { AiService } = await import("@/lib/ai-service");
            const aiService = new AiService(settings.geminiApiKey, settings.geminiModel);

            let subtitleText = "";
            if (window.electron && window.electron.readSubtitle && trackToUse.path) {
                try {
                    subtitleText = await window.electron.readSubtitle(trackToUse.path) || "";
                } catch (e) {
                    console.error("Electron read failed, trying stream...", e);
                }
            }

            if (!subtitleText) {
                const port = 19999;
                const streamUrl = `http://localhost:${port}/stream?path=${encodeURIComponent(trackToUse.path)}`;
                const res = await fetch(streamUrl);
                if (!res.ok) throw new Error("Failed to read subtitle file");
                subtitleText = await res.text();
            }

            const aiText = await aiService.generateNotes({
                todos: [],
                aiProfile: useLibraryStore.getState().aiProfile,
                quizResults: [],
                subtitles: subtitleText
            });

            if (aiText) {
                const header = `\n\n## 🤖 AI Notes (${trackToUse.label})\n`;
                setContent(prev => prev + header + aiText);
                toast.success("AI Notes Generated!");
            } else {
                throw new Error("No content generated");
            }

        } catch (error: any) {
            console.error("AI Generation Error:", error);
            let userMessage = `Failed to generate notes: ${error.message}`;
            const errorStr = error.message?.toLowerCase() || "";
            if (errorStr.includes("quota") || errorStr.includes("429")) {
                userMessage = "⚠️ Quota Exceeded. Please check your API usage.";
            }
            toast.error(userMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    // Image Generation
    const handleGenerateImage = async () => {
        if (!imagePrompt) return;
        setIsImageGenerating(true);
        setGeneratedImageUrl(null);
        try {
            const service = new ImageGenService(settings.geminiApiKey || "", settings.a4fApiKey);
            const url = await service.generateImage(imagePrompt, imageModel, a4fModel);
            setGeneratedImageUrl(url);
        } catch (error: any) {
            console.error("Image Gen Error:", error);
            toast.error("Generation failed: " + (error.message || "Unknown error"));
        } finally {
            setIsImageGenerating(false);
        }
    };

    const handleInsertGeneratedImage = () => {
        if (!generatedImageUrl) return;
        const markdown = `\n![${imagePrompt}](${generatedImageUrl})\n`;

        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const newText = text.substring(0, start) + markdown + text.substring(end);
            setContent(newText);
        } else {
            setContent(prev => prev + markdown);
        }
        setIsImageDialogOpen(false);
        setGeneratedImageUrl(null);
        setImagePrompt("");
    };

    return (
        <div className={cn("flex flex-col h-full bg-[#050505] border-l border-[#333]", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-[#333] bg-[#0a0a0a]">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => insertMarkdown("**", "**")} disabled={isPreview}>
                    <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => insertMarkdown("_", "_")} disabled={isPreview}>
                    <Italic className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-[#333] mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => insertMarkdown("# ")} disabled={isPreview}>
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => insertMarkdown("## ")} disabled={isPreview}>
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => insertMarkdown("- ")} disabled={isPreview}>
                    <List className="h-4 w-4" />
                </Button>

                <div className="w-px h-4 bg-[#333] mx-1" />

                <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-400 hover:text-indigo-300" onClick={() => setIsImageDialogOpen(true)} disabled={isPreview} title="Generate Image">
                    <ImageIcon className="h-4 w-4" />
                </Button>

                <div className="w-px h-4 bg-[#333] mx-1" />

                <div className="flex items-center gap-2 mr-2">
                    <Switch
                        id="autosave-mode"
                        checked={autoSaveEnabled}
                        onCheckedChange={setAutoSaveEnabled}
                        className="scale-75 data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="autosave-mode" className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer">Auto-save</Label>
                </div>

                <div className="flex-1" />

                <Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:text-white", isPreview ? "text-primary" : "text-muted-foreground")} onClick={togglePreview} title="Preview (Ctrl+Enter)">
                    {isPreview ? <PenLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>

                <Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:text-white", isSaving ? "text-green-500" : "text-muted-foreground")} onClick={handleSave} title="Save (Ctrl+S)">
                    <Save className="h-4 w-4" />
                </Button>
            </div>

            {/* Editor Area */}
            {isPreview ? (
                <div className="flex-1 w-full bg-transparent p-4 overflow-y-auto prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{content || "*No notes yet...*"}</ReactMarkdown>
                </div>
            ) : (
                <textarea
                    ref={textareaRef}
                    id="notes-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="# Course Notes\nStart typing or click 'AI Notes'..."
                    className="flex-1 w-full bg-transparent p-4 text-sm font-mono leading-relaxed resize-none focus:outline-none text-white/90 placeholder:text-white/20"
                    spellCheck={false}
                />
            )}

            {/* Status Bar / AI Text Button */}
            <div className="h-10 border-t border-[#333] bg-[#0a0a0a] flex items-center justify-between px-3 text-[10px] text-muted-foreground">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-6 text-xs font-medium gap-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 px-2",
                        isGenerating && "animate-pulse"
                    )}
                    onClick={handleGenerateAI}
                    disabled={isGenerating || isPreview}
                >
                    <Sparkles className="h-3 w-3" />
                    {isGenerating ? "Thinking..." : "Generate AI Notes"}
                </Button>
                <span>{content.length} chars</span>
            </div>

            {/* Image Generation Dialog */}
            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                <DialogContent className="bg-[#111] border-[#333] text-white">
                    <DialogHeader>
                        <DialogTitle>Generate Image</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Model</Label>
                            <Select value={imageModel} onValueChange={(val: any) => setImageModel(val)}>
                                <SelectTrigger className="bg-[#222] border-[#444]">
                                    <SelectValue placeholder="Select Model" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#222] border-[#444] text-white">
                                    <SelectItem value="gemini">Google Nano Banana (Gemini 2.5)</SelectItem>
                                    <SelectItem value="flux">Flux Speed (via A4F)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {imageModel === 'flux' && (
                            <div className="grid gap-2">
                                <Label>Flux Variant</Label>
                                <Select value={a4fModel} onValueChange={setA4fModel}>
                                    <SelectTrigger className="bg-[#222] border-[#444]">
                                        <SelectValue placeholder="Select Variant" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#222] border-[#444] text-white">
                                        {A4F_MODELS.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label>Prompt</Label>
                            <Input
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                placeholder="A futuristic cyberpunk city..."
                                className="bg-[#222] border-[#444]"
                            />
                        </div>

                        {generatedImageUrl && (
                            <div className="mt-4 rounded-lg overflow-hidden border border-[#444] aspect-video relative flex items-center justify-center bg-black">
                                <img src={generatedImageUrl} alt="Generated" className="max-h-full max-w-full object-contain" />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {generatedImageUrl ? (
                            <Button onClick={handleInsertGeneratedImage} className="bg-green-600 hover:bg-green-700 text-white">
                                Insert into Notes
                            </Button>
                        ) : (
                            <Button onClick={handleGenerateImage} disabled={isImageGenerating} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                                {isImageGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isImageGenerating ? "Generating..." : "Generate"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
