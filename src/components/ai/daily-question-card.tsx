"use client";

import React, { useState, useEffect } from 'react';
import {
    HelpCircle,
    Sparkles,
    Send,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIMemoryStore } from '@/store/ai-memory-store';

/**
 * Daily Question Card - Shows in Productivity Center
 * Asks one question per day to learn about the user
 */
export function DailyQuestionCard() {
    const [answer, setAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);

    const {
        getTodaysQuestion,
        answerDailyQuestion,
        hasAnsweredToday,
        addDailyQuestion
    } = useAIMemoryStore();

    const todaysQuestion = getTodaysQuestion();
    const hasAnswered = hasAnsweredToday();

    // Generate a daily question if none exists for today
    useEffect(() => {
        if (!todaysQuestion && !hasAnswered) {
            const questions = [
                { question: "What's one thing you'd love to learn this week?", category: 'learning' as const },
                { question: "What helps you stay motivated when studying gets tough?", category: 'motivation' as const },
                { question: "What's your favorite way to take breaks?", category: 'personality' as const },
                { question: "Do you have any hobbies outside of studying?", category: 'hobby' as const },
                { question: "What time of day do you feel most focused?", category: 'schedule' as const },
                { question: "What's something you accomplished recently that you're proud of?", category: 'motivation' as const },
                { question: "If you could master any skill instantly, what would it be?", category: 'learning' as const }
            ];

            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            addDailyQuestion({
                question: randomQuestion.question,
                category: randomQuestion.category
            });
        }
    }, [todaysQuestion, hasAnswered, addDailyQuestion]);

    const handleSubmit = async () => {
        if (!answer.trim() || !todaysQuestion) return;

        setIsSubmitting(true);

        // Save the answer
        answerDailyQuestion(todaysQuestion.id, answer);

        // Extract facts from the answer
        const { addFact } = useAIMemoryStore.getState();

        // Simple fact extraction based on question category
        if (todaysQuestion.category === 'hobby') {
            addFact({
                category: 'hobby',
                key: 'mentioned_hobby',
                value: answer,
                confidence: 0.9,
                source: 'question'
            });
        } else if (todaysQuestion.category === 'schedule') {
            addFact({
                category: 'schedule',
                key: 'focus_preference',
                value: answer,
                confidence: 0.9,
                source: 'question'
            });
        } else if (todaysQuestion.category === 'learning') {
            addFact({
                category: 'goal',
                key: 'learning_interest',
                value: answer,
                confidence: 0.9,
                source: 'question'
            });
        }

        setShowThankYou(true);
        setIsSubmitting(false);

        // Hide thank you after 3 seconds
        setTimeout(() => {
            setShowThankYou(false);
        }, 3000);
    };

    // Don't show if already answered today
    if (hasAnswered && !showThankYou) {
        return null;
    }

    // Show thank you message
    if (showThankYou) {
        return (
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                        <h4 className="font-medium text-white">Thanks for sharing!</h4>
                        <p className="text-sm text-muted-foreground">I'll remember this about you 💚</p>
                    </div>
                </div>
            </div>
        );
    }

    // No question available
    if (!todaysQuestion) {
        return null;
    }

    return (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-purple-400">DAILY QUESTION</span>
                    </div>

                    <h4 className="font-medium text-white mb-3">{todaysQuestion.question}</h4>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder="Type your answer..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <Button
                            size="icon"
                            className="h-9 w-9 bg-gradient-to-r from-purple-500 to-blue-500"
                            onClick={handleSubmit}
                            disabled={!answer.trim() || isSubmitting}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
