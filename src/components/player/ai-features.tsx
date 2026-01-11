import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLibraryStore } from "@/store/library-store";
import { AiService } from "@/lib/ai-service";
import { Loader2, Send, Brain, CheckCircle2, MessageSquare, HelpCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from "@/types";

interface AiFeaturesProps {
    courseId: string;
    videoId: string;
    videoTitle: string;
    mode: 'chat' | 'quiz';
    subtitlePath?: string | null;
}

export const AiFeatures: React.FC<AiFeaturesProps> = ({ courseId, videoId, videoTitle, mode, subtitlePath }) => {
    const {
        settings,
        courses,
        todos,
        addQuizResult,
        chatSessions,
        addChatMessage,
        clearChatSession
    } = useLibraryStore();

    // Chat State - Persistent
    const currentMessages = chatSessions[videoId] || [];
    const hasMessages = currentMessages.length > 0;

    // Local loading state
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [input, setInput] = useState("");


    // Quiz State - FROM STORE
    const activeQuiz = useLibraryStore(state => state.activeQuiz);
    const setActiveQuiz = useLibraryStore(state => state.setActiveQuiz);
    const updateActiveQuiz = useLibraryStore(state => state.updateActiveQuiz);

    // FIX: Clear Quiz if we switched videos
    useEffect(() => {
        if (activeQuiz && activeQuiz.videoId !== videoId) {
            setActiveQuiz(null);
        }
    }, [videoId, activeQuiz, setActiveQuiz]);

    // Derived Quiz State
    const quizQuestions = activeQuiz?.questions || null;
    const currentQuestionIndex = activeQuiz?.currentQuestionIndex || 0;
    const isQuizCompleted = activeQuiz?.isCompleted || false;
    const quizScore = activeQuiz?.score || 0;

    // Local Quiz UI State
    const [isQuizLoading, setIsQuizLoading] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const aiService = useRef<AiService | null>(null);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [currentMessages, mode]);

    // Initialize AI Service
    useEffect(() => {
        if (settings.geminiApiKey) {
            aiService.current = new AiService(settings.geminiApiKey, settings.geminiModel);
        }
    }, [settings.geminiApiKey, settings.geminiModel]);

    // --- Context Building ---
    const getContext = async () => {
        const course = courses.find(c => c.id === courseId);
        let subtitleText = "";

        if (subtitlePath) {
            // Check if it's a file path (for local/electron)
            if (subtitlePath.startsWith('/') || subtitlePath.match(/^[a-zA-Z]:\\/)) {
                if (window.electron && window.electron.readSubtitle) {
                    try {
                        subtitleText = await window.electron.readSubtitle(subtitlePath);
                    } catch (err) {
                        console.error("Failed to read subtitle file:", err);
                    }
                }
            } else {
                // Assume URL
                try {
                    const resp = await fetch(subtitlePath);
                    subtitleText = await resp.text();
                } catch (e) {
                    console.error("Failed to fetch subtitle url", e);
                }
            }
        }

        return {
            courseName: course?.name,
            videoName: videoTitle,
            subtitles: subtitleText,
            todos: todos,
            aiProfile: useLibraryStore.getState().aiProfile,
            quizResults: useLibraryStore.getState().quizResults
        };
    };

    // --- Chat Handlers ---
    const handleSend = async () => {
        if (!input.trim() || !aiService.current) return;

        const userMsg = input;
        addChatMessage(videoId, { role: 'user', content: userMsg, timestamp: Date.now() });
        setInput("");
        setIsChatLoading(true);

        try {
            const context = await getContext();
            const response = await aiService.current.askAi(userMsg, context);
            addChatMessage(videoId, { role: 'ai', content: response, timestamp: Date.now() });
        } catch (error: any) {
            const errorMessage = error.message || "AI failed to respond. Check your API key.";
            toast.error(errorMessage);
            addChatMessage(videoId, { role: 'ai', content: `Error: ${errorMessage}`, timestamp: Date.now() });
        } finally {
            setIsChatLoading(false);
        }
    };

    // --- Quiz Handlers ---
    const generateQuiz = async () => {
        if (!aiService.current) return;
        setIsQuizLoading(true);
        setShowExplanation(false);
        setSelectedOption(null);

        try {
            const context = await getContext();
            if (!context.subtitles || context.subtitles.trim() === "") {
                toast.error("No subtitles available. Cannot generate quiz.");
                return;
            }

            const questions = await aiService.current.generateQuiz(context);
            if (questions && questions.length > 0) {
                setActiveQuiz({
                    videoId,
                    questions,
                    answers: {},
                    currentQuestionIndex: 0,
                    score: 0,
                    isCompleted: false
                });
            } else {
                toast.error("Could not generate quiz.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate quiz.");
        } finally {
            setIsQuizLoading(false);
        }
    };

    const handleOptionSelect = (index: number) => {
        if (showExplanation) return;
        setSelectedOption(index);
    };

    const checkAnswer = () => {
        if (selectedOption === null || !activeQuiz) return;

        const currentQ = activeQuiz.questions[activeQuiz.currentQuestionIndex];
        const isCorrect = selectedOption === currentQ.correctIndex;

        setShowExplanation(true);

        updateActiveQuiz({
            score: isCorrect ? activeQuiz.score + 1 : activeQuiz.score,
            answers: {
                ...activeQuiz.answers,
                [activeQuiz.currentQuestionIndex]: selectedOption
            }
        });
    };

    const nextQuestion = () => {
        if (!activeQuiz) return;

        if (activeQuiz.currentQuestionIndex < activeQuiz.questions.length - 1) {
            updateActiveQuiz({
                currentQuestionIndex: activeQuiz.currentQuestionIndex + 1
            });
            setSelectedOption(null);
            setShowExplanation(false);
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        if (!activeQuiz) return;
        updateActiveQuiz({ isCompleted: true });

        const result = {
            id: crypto.randomUUID(),
            videoId,
            courseId,
            score: (activeQuiz.score / activeQuiz.questions.length) * 100,
            totalQuestions: activeQuiz.questions.length,
            date: Date.now()
        };
        addQuizResult(result);
        toast.success("Quiz Saved!");
    };


    if (!settings.geminiApiKey) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                <Brain className="h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="font-semibold text-lg">AI not configured</h3>
                <p className="text-sm text-muted-foreground">Add your Gemini API key in settings to unlock Chat and Quizzes.</p>
                <Button variant="outline">Go to Settings</Button>
            </div>
        );
    }

    if (mode === 'chat') {
        const messagesToRender = hasMessages ? currentMessages : [{
            role: 'ai',
            content: `Hi! I'm your AI study coach. Ask me anything about "${videoTitle}"!`,
            timestamp: Date.now()
        } as ChatMessage];

        return (
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#333] bg-background/50 backdrop-blur-sm z-10">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversation</span>
                    {hasMessages && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-destructive/10"
                            onClick={() => clearChatSession(videoId)}
                            title="Clear History"
                        >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                        </Button>
                    )}
                </div>
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                        {messagesToRender.map((msg, i) => (
                            <div key={i} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground rounded-br-none"
                                        : "bg-muted text-muted-foreground rounded-bl-none"
                                )}>
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-none">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t border-[#333] bg-[#050505] pb-6">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="flex gap-2"
                    >
                        <Textarea
                            placeholder="Ask about this video..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="min-h-[50px] resize-none bg-[#111] border-[#333] focus-visible:ring-primary"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <Button type="submit" size="icon" disabled={isChatLoading || !input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    if (mode === 'quiz') {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {!quizQuestions ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <Brain className="h-16 w-16 mx-auto text-primary/50" />
                        <h3 className="text-xl font-bold">Test your knowledge</h3>
                        <p className="text-muted-foreground">Generate a quick quiz based on this video's content.</p>
                        <Button onClick={generateQuiz} disabled={isQuizLoading} size="lg" className="w-full">
                            {isQuizLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Generate Quiz
                        </Button>
                    </div>
                ) : isQuizCompleted ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 animate-in zoom-in duration-300">
                        <CheckCircle2 className="h-20 w-20 mx-auto text-green-500" />
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold">Quiz Complete!</h3>
                            <p className="text-muted-foreground">You scored {Math.round((quizScore / quizQuestions.length) * 100)}%</p>
                        </div>
                        <Button onClick={generateQuiz} variant="outline">Try Another</Button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <div className="w-full space-y-6 pb-6">
                            <div className="flex justify-between text-sm text-muted-foreground mb-4">
                                <span>Question {currentQuestionIndex + 1}/{quizQuestions.length}</span>
                                <span>Score: {quizScore}</span>
                            </div>

                            <h4 className="text-lg font-medium leading-snug">
                                {quizQuestions[currentQuestionIndex].question}
                            </h4>

                            <div className="space-y-3">
                                {quizQuestions[currentQuestionIndex].options.map((option: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleOptionSelect(idx)}
                                        disabled={showExplanation}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl border transition-all",
                                            selectedOption === idx ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50",
                                            showExplanation && idx === quizQuestions[currentQuestionIndex].correctIndex && "border-green-500 bg-green-500/10",
                                            showExplanation && selectedOption === idx && idx !== quizQuestions[currentQuestionIndex].correctIndex && "border-red-500 bg-red-500/10"
                                        )}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>

                            {showExplanation && (
                                <div className="p-4 bg-muted/50 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
                                    <span className="font-semibold block mb-1">Explanation:</span>
                                    {quizQuestions[currentQuestionIndex].explanation}
                                </div>
                            )}

                            <Button
                                onClick={showExplanation ? nextQuestion : checkAnswer}
                                className="w-full"
                                disabled={selectedOption === null}
                            >
                                {showExplanation ? (currentQuestionIndex === quizQuestions.length - 1 ? "Finish" : "Next Question") : "Check Answer"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
};
