"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLibraryStore } from "@/store/library-store";
import { Eye, EyeOff, Check, Loader2, AlertCircle, Sparkles, User, Monitor, FlaskConical, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
    const { settings, setApiKey, setModel, userProfile, updateUserProfile, devMode, setDevMode, addManualStudyLog } = useLibraryStore();
    const [keyInput, setKeyInput] = useState(settings.geminiApiKey || "");
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [status, setStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState("");
    const [detectedModel, setDetectedModel] = useState("");
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    // Profile State
    const [profileName, setProfileName] = useState(userProfile?.name || "Student");
    const [profileGoal, setProfileGoal] = useState(userProfile?.studyGoal || 2);
    const [profileTime, setProfileTime] = useState(userProfile?.preferredTime || "any");

    // Dev Tools State
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualMinutes, setManualMinutes] = useState("");

    // Update local state when store changes (e.g. hydration)
    React.useEffect(() => {
        if (userProfile) {
            setProfileName(userProfile.name);
            setProfileGoal(userProfile.studyGoal);
            setProfileTime(userProfile.preferredTime);
        }
    }, [userProfile]);

    const saveProfile = () => {
        updateUserProfile({
            name: profileName,
            studyGoal: Number(profileGoal),
            preferredTime: profileTime
        });
        alert("Profile saved!");
    };

    const injectData = () => {
        const mins = parseInt(manualMinutes);
        if (isNaN(mins) || mins <= 0) return;
        addManualStudyLog(manualDate, mins * 60);
        setManualMinutes("");
        alert(`Added ${mins} mins to ${manualDate}`);
    };

    const fetchModels = async (key: string) => {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            if (!response.ok) return;
            const data = await response.json();
            const models = data.models || [];
            const supported = models
                .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
                .map((m: any) => m.name.replace("models/", ""));
            setAvailableModels(supported);
            return supported;
        } catch (e) {
            console.error("Failed to fetch models", e);
            return [];
        }
    };

    // Initial fetch on mount if key exists
    React.useEffect(() => {
        if (settings.geminiApiKey) {
            fetchModels(settings.geminiApiKey);
        }
    }, []);

    const validateKey = async () => {
        setStatus('validating');
        setErrorMessage("");
        setDetectedModel("");

        try {
            // Fetch list of models using the new key
            // We use the helper fetchModels but need to handle errors explicitly here for validation
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyInput}`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error?.message || "Invalid API Key");
            }

            const data = await response.json();
            const models = data.models || [];
            const supportedModels = models.filter((m: any) =>
                m.supportedGenerationMethods?.includes("generateContent")
            );

            if (supportedModels.length === 0) {
                throw new Error("No models found that support generateContent.");
            }

            const supportedNames = supportedModels.map((m: any) => m.name.replace("models/", ""));
            setAvailableModels(supportedNames);

            // Priority list - Includes newer models and experimental versions
            // We prioritize "flash" versions for speed/cost, then "pro".
            const priorities = [
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-1.5-pro",
                "gemini-1.0-pro",
                "gemini-pro"
            ];

            // Find best match
            let bestModel = "";

            // 1. Try to find an exact or partial match from our priority list
            for (const p of priorities) {
                const found = supportedNames.find((name: string) => name.toLowerCase().includes(p));
                if (found) {
                    bestModel = found;
                    break;
                }
            }

            // 2. If no priority match, but we have models, pick the first one
            if (!bestModel && supportedNames.length > 0) {
                bestModel = supportedNames[0];
            }

            // Valid
            setApiKey(keyInput);
            setModel(bestModel);
            setDetectedModel(bestModel);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error: any) {
            console.error("Validation failed:", error);
            setStatus('error');
            setErrorMessage(error.message);
        }
    };

    // Shortcut Recording State
    const [editingAction, setEditingAction] = useState<string | null>(null);

    React.useEffect(() => {
        if (!editingAction) return;

        const handleRecordKey = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore modifier-only presses
            if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

            const parts = [];
            if (e.shiftKey) parts.push('Shift');
            if (e.ctrlKey) parts.push('Ctrl');
            if (e.altKey) parts.push('Alt');
            if (e.metaKey) parts.push('Meta');

            // Capitalize key
            const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
            parts.push(key);

            const combo = parts.join('+');
            useLibraryStore.getState().updateShortcut(editingAction, combo);
            setEditingAction(null);
        };

        window.addEventListener('keydown', handleRecordKey);
        // Remove listener on clicking outside or cleanup
        const handleClickOutside = () => setEditingAction(null);
        window.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('keydown', handleRecordKey);
            window.removeEventListener('click', handleClickOutside);
        };
    }, [editingAction]);

    return (
        <AppLayout>
            <div className="p-8 max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Settings</h1>

                <div className="space-y-8">
                    {/* ... existing profile settings ... */}

                    {/* Keyboard Shortcuts Section - UPDATED RENDER */}
                    <div className="bg-[#111] p-6 rounded-xl border border-[#333] mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Keyboard className="h-5 w-5 text-green-400" />
                                Keyboard Shortcuts
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-gray-500 hover:text-white"
                                onClick={() => {
                                    if (confirm("Reset shortcuts to defaults?")) {
                                        const defaults = {
                                            "library": "Ctrl+1",
                                            "bookmarks": "Ctrl+2",
                                            "settings": "Ctrl+3"
                                        };
                                        Object.entries(defaults).forEach(([k, v]) =>
                                            useLibraryStore.getState().updateShortcut(k, v)
                                        );
                                    }
                                }}
                            >
                                Restore Defaults
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                Click a shortcut to rebind it. Press any key combination.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(settings.shortcuts || {}).map(([action, combo]) => (
                                    <div key={action} className="bg-[#0A0A0A] border border-[#333] p-3 rounded-lg flex items-center justify-between group hover:border-green-500/50 transition-colors">
                                        <span className="text-sm font-medium capitalize text-gray-300">
                                            {action}
                                        </span>
                                        <Button
                                            variant={editingAction === action ? "destructive" : "outline"}
                                            size="sm"
                                            className={cn(
                                                "h-7 text-xs font-mono min-w-[80px]",
                                                editingAction === action ? "animate-pulse" : "bg-[#1a1a1a] border-[#333]"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent window click from closing immediately
                                                setEditingAction(action);
                                            }}
                                        >
                                            {editingAction === action ? "Press Set Keys..." : combo}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Gemini AI Section */}
                    <div className="bg-[#111] p-6 rounded-xl border border-[#333]">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            Gemini AI Configuration
                        </h2>

                        <p className="text-sm text-gray-400 mb-6">
                            Enter your Gemini API Key to enable AI-powered study notes.
                            Your key is stored locally on your device.
                        </p>

                        {/* Model Selector Section */}
                        <div className="mb-6 p-4 bg-indigo-950/10 border border-indigo-500/10 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-indigo-400" />
                                    <label className="text-sm font-medium text-indigo-200">AI Model</label>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => settings.geminiApiKey && fetchModels(settings.geminiApiKey)}
                                    className="h-6 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                                >
                                    Refresh List
                                </Button>
                            </div>

                            <select
                                value={settings.geminiModel || ""}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full bg-black/40 border border-[#333] text-indigo-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
                            >
                                {availableModels.length > 0 ? (
                                    availableModels.map(model => (
                                        <option key={model} value={model} className="bg-[#111] text-gray-200">
                                            {model}
                                        </option>
                                    ))
                                ) : (
                                    <option value={settings.geminiModel || "gemini-1.5-flash"}>
                                        {settings.geminiModel || "Loading models..."}
                                    </option>
                                )}
                            </select>
                            <p className="text-[10px] text-gray-500 px-1">
                                auto-detected: <span className="font-mono text-gray-400">{detectedModel || "none"}</span>
                            </p>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-300">API Key</label>

                            {/* Usage Warning */}
                            <div className="bg-yellow-950/30 border border-yellow-900/50 p-3 rounded-lg flex gap-3 text-xs text-yellow-200/80 mb-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-yellow-200">Important Note on Usage</p>
                                    <p className="mt-1 opacity-90">
                                        Using Gemini AI may incur costs if you exceed the free tier limits (currently generous).
                                        Please check your Google Cloud billing status. We recommend setting up budget alerts in your Google Cloud Console.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showGeminiKey ? "text" : "password"}
                                        value={keyInput}
                                        onChange={(e) => {
                                            setKeyInput(e.target.value);
                                            setStatus('idle');
                                        }}
                                        className="w-full bg-black/50 border border-[#333] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors pr-10"
                                        placeholder="AIzaSy..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <Button
                                    onClick={validateKey}
                                    disabled={!keyInput || status === 'validating'}
                                    className={cn(
                                        "min-w-[100px]",
                                        status === 'success' && "bg-green-600 hover:bg-green-700 text-white",
                                        status === 'error' && "bg-red-600 hover:bg-red-700 text-white"
                                    )}
                                >
                                    {status === 'validating' ? <Loader2 className="animate-spin h-4 w-4" /> :
                                        status === 'success' ? <Check className="h-4 w-4" /> :
                                            "Save"}
                                </Button>
                            </div>

                            {status === 'error' && (
                                <div className="flex items-center gap-2 text-red-400 text-xs mt-2 bg-red-950/20 p-2 rounded-lg border border-red-900/50">
                                    <AlertCircle size={12} />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {status === 'success' && (
                                <div className="mt-2">
                                    <p className="text-green-400 text-xs">API Key verified successfully!</p>
                                    {detectedModel && (
                                        <p className="text-indigo-400 text-xs mt-1">
                                            Auto-configured model: <span className="font-mono">{detectedModel}</span>
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-[#333]">
                                <p className="text-xs text-gray-500">
                                    Don't have an API key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline">Get one from Google AI Studio</a>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Image Generation Settings */}
                    <div className="bg-[#111] p-6 rounded-xl border border-[#333]">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-400" />
                            Image Generation Service
                        </h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Provider</label>
                                <select
                                    value={settings.imageGenProvider || 'huggingface'}
                                    onChange={(e) => useLibraryStore.getState().setImageGenProvider(e.target.value as 'huggingface' | 'magicstudio' | 'pollinations' | 'puter')}
                                    className="w-full flex h-10 rounded-md border border-[#333] bg-[#0A0A0A] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                >
                                    <option value="pollinations">Pollinations (Free - Unlimited, Best Quality)</option>
                                    <option value="a4f">A4F (Flux - Fast, Requires Key)</option>
                                    <option value="gemini">Gemini Imagen 3 (Fast - High Quality)</option>
                                    <option value="huggingface">Hugging Face (Free - Slow)</option>
                                    <option value="magicstudio">MagicStudio (Free)</option>
                                    <option value="puter">Puter.js (Free - Beta)</option>
                                </select>
                            </div>

                            {/* A4F Settings */}
                            {settings.imageGenProvider === 'a4f' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-sm font-medium text-gray-300">A4F API Key</label>
                                    <Input
                                        type="password"
                                        value={settings.a4fApiKey || ""}
                                        onChange={(e) => useLibraryStore.getState().setA4fApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="bg-[#0A0A0A] border-[#333]"
                                    />
                                    <p className="text-xs text-gray-500">
                                        Get your key from <a href="https://www.a4f.co/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">a4f.co</a>
                                    </p>
                                </div>
                            )}

                            {/* Informational alert for Gemini Image Gen */}
                            {settings.imageGenProvider === 'gemini' && (
                                <div className="bg-blue-950/20 p-3 rounded-lg border border-blue-500/20 text-xs text-blue-200 animate-in fade-in slide-in-from-top-2">
                                    Uses the <strong>Gemini API Key</strong> set above. <br />
                                    Requires access to <code>imagen-3.0-generate-001</code> model (Beta).
                                </div>
                            )}
                        </div>
                    </div>

                    {/* App Info */}
                    <div className="bg-[#111] p-6 rounded-xl border border-[#333]">
                        <h2 className="text-xl font-semibold mb-4">About</h2>
                        <div className="text-sm text-gray-400 space-y-2">
                            <p>StudyStream v1.0.0</p>
                            <p>A focused environment for learning locally.</p>
                        </div>
                    </div>



                    {/* Developer Settings */}
                    <div className="bg-[#111] p-6 rounded-xl border border-[#333]">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Monitor className="h-5 w-5 text-blue-400" />
                            Developer
                        </h2>

                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-200">Developer Mode</h3>
                                <p className="text-xs text-gray-400">Enable advanced debugging tools and manual data entry.</p>
                            </div>
                            <Switch checked={devMode} onCheckedChange={setDevMode} />
                        </div>

                        {devMode && (
                            <div className="mt-4 pt-4 border-t border-[#333] space-y-4">
                                <h3 className="text-sm font-medium text-blue-400 flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4" />
                                    Test Tools
                                </h3>

                                <div className="space-y-3 p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg">
                                    <p className="text-xs font-semibold text-blue-300">Inject Study Data</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input
                                            type="date"
                                            value={manualDate}
                                            onChange={(e) => setManualDate(e.target.value)}
                                            className="bg-[#0A0A0A] border-[#333]"
                                            style={{ colorScheme: "dark" }}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Minutes"
                                            value={manualMinutes}
                                            onChange={(e) => setManualMinutes(e.target.value)}
                                            className="bg-[#0A0A0A] border-[#333]"
                                        />
                                        <Button size="sm" variant="secondary" onClick={injectData}>Inject</Button>
                                    </div>
                                    <p className="text-[10px] text-gray-500">*Adds generic study time to the graph.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Data Management */}
                    <div className="bg-[#111] p-6 rounded-xl border border-[#333]">
                        <h2 className="text-xl font-semibold mb-4 text-red-500">Danger Zone</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-200">Clear All Data</h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Remove all imported courses, progress, and settings. This cannot be undone.
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        if (confirm("Are you sure you want to delete all data? This will reset the app.")) {
                                            const { clearData } = useLibraryStore.getState();
                                            clearData();
                                            window.location.reload();
                                        }
                                    }}
                                >
                                    Clear Data
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout >
    );
}
