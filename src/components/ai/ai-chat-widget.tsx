"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
    Bot,
    Send,
    X,
    Minimize2,
    Maximize2,
    Sparkles,
    MessageSquare,
    Key,
    Settings,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIMemoryStore } from '@/store/ai-memory-store';
import { useLibraryStore } from '@/store/library-store';
import { useNotificationStore } from '@/store/notification-store';
import { useUIStore } from '@/store/ui-store';
import { generateAIResponse, extractFactsFromMessage } from '@/lib/ai-context';
import { aiNotificationService } from '@/lib/ai-notifications';
import { createScheduleFromMessage, hasSchedulingIntent } from '@/lib/schedule-parser';
import { AINotification } from '@/types';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
}

export function AIChatWidget() {
    const pathname = usePathname();
    const { isAIChatOpen, setAIChatOpen } = useUIStore();
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { globalChatHistory, aiPersonality } = useAIMemoryStore();
    const { settings } = useLibraryStore();
    const { activeNotification, setActiveNotification } = useNotificationStore();

    const hasApiKey = Boolean(settings.geminiApiKey);
    const isSplashScreen = pathname === '/splash' || pathname === '/splash/';

    // Don't render on splash screen
    if (isSplashScreen) {
        return null;
    }

    // Load chat history on mount
    useEffect(() => {
        if (globalChatHistory.length > 0) {
            const loadedMessages = globalChatHistory.slice(-20).map((m, i) => ({
                id: `loaded-${i}`,
                role: m.role as 'user' | 'ai',
                content: m.content,
                timestamp: m.timestamp
            }));
            setMessages(loadedMessages);
        }
    }, [globalChatHistory]);

    // Auto-dismiss active notification after 10 seconds
    useEffect(() => {
        if (activeNotification && !isAIChatOpen) {
            const timer = setTimeout(() => {
                setActiveNotification(null);
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [activeNotification, isAIChatOpen, setActiveNotification]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isAIChatOpen && !isMinimized) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isAIChatOpen, isMinimized]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);

        // Add user message
        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);

        // Extract facts from the message
        extractFactsFromMessage(userMessage);

        // Check for scheduling intent and auto-create task
        let scheduleResponse = '';
        if (hasSchedulingIntent(userMessage)) {
            const result = createScheduleFromMessage(userMessage);
            if (result.created) {
                scheduleResponse = result.message;
            }
        }

        try {
            // Generate AI response
            let aiResponse: string;
            if (scheduleResponse) {
                aiResponse = scheduleResponse;
            } else {
                aiResponse = await generateAIResponse({ userMessage });
            }

            const aiMsg: Message = {
                id: `ai-${Date.now()}`,
                role: 'ai',
                content: aiResponse,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('[AIChatWidget] Error:', error);
            const errorMsg: Message = {
                id: `error-${Date.now()}`,
                role: 'ai',
                content: "Sorry, I had trouble responding. Please try again! 🔄",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNotificationAction = async (action: string) => {
        await aiNotificationService.handleAction(action);
        setActiveNotification(null);
    };

    // Greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        const name = aiPersonality.nickname || 'there';

        if (hour < 12) return `Good morning, ${name}! ☀️`;
        if (hour < 18) return `Good afternoon, ${name}! 📚`;
        return `Good evening, ${name}! 🌙`;
    };

    return (
        <>
            {/* Notification Popup */}
            {activeNotification && !isAIChatOpen && (
                <div className="fixed bottom-24 right-6 z-50 max-w-sm animate-in slide-in-from-right-5 fade-in duration-300">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white text-sm">{activeNotification.title}</h4>
                                <p className="text-muted-foreground text-xs mt-1">{activeNotification.message}</p>

                                {activeNotification.actions && (
                                    <div className="flex gap-2 mt-3">
                                        {activeNotification.actions.map((action, i) => (
                                            <Button
                                                key={i}
                                                size="sm"
                                                variant={i === 0 ? 'default' : 'outline'}
                                                className="h-7 text-xs"
                                                onClick={() => handleNotificationAction(action.action)}
                                            >
                                                {action.label}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground"
                                onClick={() => setActiveNotification(null)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Window */}
            <AnimatePresence>
                {isAIChatOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={cn(
                            "fixed bottom-24 right-6 z-50 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden flex flex-col",
                            isMinimized ? "w-72 h-12" : "w-96 h-[500px]"
                        )}
                    >
                        {/* Header */}
                        <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-bold text-sm text-white tracking-tight">Study AI</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    onClick={() => setIsMinimized(!isMinimized)}
                                >
                                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    onClick={() => setAIChatOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        {!isMinimized && (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
                                    {!hasApiKey ? (
                                        <div className="text-center py-12 px-6">
                                            <div className="w-16 h-16 mx-auto rounded-[2rem] bg-amber-500/10 flex items-center justify-center mb-6">
                                                <Key className="h-8 w-8 text-amber-500" />
                                            </div>
                                            <h3 className="font-bold text-white text-lg mb-2">Setup Required</h3>
                                            <p className="text-white/40 text-sm mb-6 leading-relaxed">Add your Gemini API key to unlock the power of Study AI.</p>
                                            <Link href="/settings">
                                                <Button className="w-full bg-blue-600 hover:bg-blue-500 h-10 rounded-xl font-bold" onClick={() => setAIChatOpen(false)}>
                                                    Open Settings
                                                </Button>
                                            </Link>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="text-center py-12 px-6">
                                            <div className="w-20 h-20 mx-auto rounded-[2.5rem] bg-blue-600 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(37,99,235,0.3)]">
                                                <Bot className="h-10 w-10 text-white" />
                                            </div>
                                            <h3 className="font-bold text-white text-xl mb-2">{getGreeting()}</h3>
                                            <p className="text-white/40 text-sm leading-relaxed">How can I assist your study session today?</p>
                                        </div>
                                    ) : (
                                        messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "flex gap-3",
                                                    msg.role === 'user' ? "justify-end" : "justify-start"
                                                )}
                                            >
                                                {msg.role === 'ai' && (
                                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                                                        <Bot className="h-4 w-4 text-blue-400" />
                                                    </div>
                                                )}
                                                <div
                                                    className={cn(
                                                        "max-w-[85%] rounded-[1.25rem] px-4 py-3 text-sm leading-relaxed",
                                                        msg.role === 'user'
                                                            ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/10"
                                                            : "bg-white/5 text-white/90 border border-white/10 rounded-tl-none backdrop-blur-sm"
                                                    )}
                                                >
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {isLoading && (
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 animate-pulse border border-white/10">
                                                <Bot className="h-4 w-4 text-blue-400" />
                                            </div>
                                            <div className="bg-white/5 border border-white/10 rounded-[1.25rem] px-5 py-3 rounded-tl-none">
                                                <div className="flex gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-4 bg-black/40 border-t border-white/10 shrink-0">
                                    <div className="relative flex items-center gap-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Ask anything..."
                                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl pl-4 pr-12 h-12 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                                            disabled={isLoading}
                                        />
                                        <Button
                                            size="icon"
                                            className="absolute right-1 w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                                            onClick={handleSend}
                                            disabled={!input.trim() || isLoading}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
