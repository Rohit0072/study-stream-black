"use client";

import React, { useState } from 'react';
import {
    X,
    Sparkles,
    Send,
    MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIMemoryStore } from '@/store/ai-memory-store';
import { useNotificationStore } from '@/store/notification-store';
import { AINotification } from '@/types';

interface QuestionAnswerPopupProps {
    notification: AINotification;
    onClose: () => void;
    onAnswered: () => void;
}

/**
 * Question Answer Popup - Appears when user clicks on a question notification
 * Allows users to type and submit their answer directly
 */
export function QuestionAnswerPopup({ notification, onClose, onAnswered }: QuestionAnswerPopupProps) {
    const [answer, setAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);

    const { answerDailyQuestion, addFact, getTodaysQuestion } = useAIMemoryStore();
    const { clearNotification } = useNotificationStore();

    const handleSubmit = async () => {
        if (!answer.trim()) return;

        setIsSubmitting(true);

        // Get the question to answer - use questionId if available, otherwise use today's question
        const todaysQuestion = getTodaysQuestion();
        const questionId = notification.questionId || todaysQuestion?.id;
        const questionToAnswer = questionId && todaysQuestion?.id === questionId ? todaysQuestion : todaysQuestion;

        if (questionToAnswer && !questionToAnswer.answer) {
            // Answer the daily question
            answerDailyQuestion(questionToAnswer.id, answer);

            // Extract facts based on question category
            if (questionToAnswer.category === 'hobby') {
                addFact({
                    category: 'hobby',
                    key: 'mentioned_hobby',
                    value: answer,
                    confidence: 0.9,
                    source: 'question'
                });
            } else if (questionToAnswer.category === 'schedule') {
                addFact({
                    category: 'schedule',
                    key: 'focus_preference',
                    value: answer,
                    confidence: 0.9,
                    source: 'question'
                });
            } else if (questionToAnswer.category === 'learning') {
                addFact({
                    category: 'goal',
                    key: 'learning_interest',
                    value: answer,
                    confidence: 0.9,
                    source: 'question'
                });
            } else if (questionToAnswer.category === 'motivation') {
                addFact({
                    category: 'preference',
                    key: 'motivation_factor',
                    value: answer,
                    confidence: 0.9,
                    source: 'question'
                });
            } else if (questionToAnswer.category === 'personality') {
                addFact({
                    category: 'personality',
                    key: 'personal_trait',
                    value: answer,
                    confidence: 0.9,
                    source: 'question'
                });
            }
        }

        // Remove the notification from the list (it's been answered)
        clearNotification(notification.id);

        // Show thank you
        setShowThankYou(true);
        setIsSubmitting(false);

        // Close after showing thank you
        setTimeout(() => {
            onAnswered();
        }, 1500);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Thank you state
    if (showThankYou) {
        return (
            <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />

                {/* Popup */}
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
                                <Sparkles className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Thanks for sharing!</h3>
                            <p className="text-gray-400">I'll remember this about you 💚</p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Popup */}
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div
                    className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="relative px-6 pt-6 pb-4">
                        <div className="absolute top-4 right-4">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg"
                                onClick={onClose}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <MessageSquare className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">Daily Question</span>
                                <h3 className="text-lg font-semibold text-white">Let me learn about you!</h3>
                            </div>
                        </div>

                        {/* Question */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                            <p className="text-white font-medium leading-relaxed">
                                {notification.message}
                            </p>
                        </div>
                    </div>

                    {/* Answer Input */}
                    <div className="px-6 pb-6">
                        <div className="relative">
                            <textarea
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your answer here..."
                                className={cn(
                                    "w-full min-h-[100px] bg-white/5 border border-white/10 rounded-xl px-4 py-3",
                                    "text-white placeholder:text-gray-500 resize-none",
                                    "focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50",
                                    "transition-all duration-200"
                                )}
                                autoFocus
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-xs text-gray-500">
                                Press Enter to submit
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    className="text-gray-400 hover:text-white hover:bg-white/10"
                                    onClick={onClose}
                                >
                                    Skip
                                </Button>
                                <Button
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6"
                                    onClick={handleSubmit}
                                    disabled={!answer.trim() || isSubmitting}
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    Submit
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
