import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    AIMemory,
    AIPersonality,
    UserFact,
    DailyQuestion,
    ChatMessage
} from '@/types';

// ============================================
// AI MEMORY STORE
// Stores everything the AI knows about the user
// ============================================

interface AIMemoryState extends AIMemory {
    // Actions for managing user facts
    addFact: (fact: Omit<UserFact, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateFact: (id: string, updates: Partial<UserFact>) => void;
    removeFact: (id: string) => void;
    getFactsByCategory: (category: UserFact['category']) => UserFact[];
    getFactByKey: (key: string) => UserFact | undefined;

    // Actions for daily questions
    addDailyQuestion: (question: Omit<DailyQuestion, 'id' | 'askedAt' | 'answer' | 'answeredAt'>) => void;
    answerDailyQuestion: (id: string, answer: string) => void;
    getTodaysQuestion: () => DailyQuestion | null;
    hasAnsweredToday: () => boolean;

    // Actions for global chat history
    addGlobalMessage: (message: Omit<ChatMessage, 'timestamp'>) => void;
    getRecentMessages: (count: number) => ChatMessage[];
    clearChatHistory: () => void;

    // Actions for AI personality
    updatePersonality: (updates: Partial<AIPersonality>) => void;

    // Utility actions
    updateLastInteraction: () => void;
    getFullContext: () => string;
}

// Default AI personality
const defaultPersonality: AIPersonality = {
    tone: 'friendly',
    useQuotes: true,
    quoteSource: 'general',
    encouragementStyle: 'enthusiastic',
    nickname: undefined
};

// Default state
const defaultState: AIMemory = {
    facts: [],
    globalChatHistory: [],
    dailyQuestions: [],
    lastInteraction: 0,
    aiPersonality: defaultPersonality
};

// Helper: Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper: Get today's date string
const getTodayKey = () => new Date().toISOString().split('T')[0];

// SSR-safe storage
const getStorage = () => {
    if (typeof window === 'undefined') {
        return {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { }
        };
    }
    return localStorage;
};

export const useAIMemoryStore = create<AIMemoryState>()(
    persist(
        (set, get) => ({
            ...defaultState,

            // ===== USER FACTS =====
            addFact: (factData) => {
                const now = Date.now();
                const newFact: UserFact = {
                    ...factData,
                    id: generateId(),
                    createdAt: now,
                    updatedAt: now
                };

                set((state) => {
                    // Check if fact with same key exists - update instead of add
                    const existingIndex = state.facts.findIndex(f => f.key === factData.key);
                    if (existingIndex >= 0) {
                        const updated = [...state.facts];
                        updated[existingIndex] = {
                            ...updated[existingIndex],
                            value: factData.value,
                            confidence: Math.max(updated[existingIndex].confidence, factData.confidence),
                            updatedAt: now
                        };
                        return { facts: updated };
                    }
                    return { facts: [...state.facts, newFact] };
                });

                console.log('[AIMemory] Added fact:', newFact.key, '=', newFact.value);
            },

            updateFact: (id, updates) => {
                set((state) => ({
                    facts: state.facts.map(f =>
                        f.id === id
                            ? { ...f, ...updates, updatedAt: Date.now() }
                            : f
                    )
                }));
            },

            removeFact: (id) => {
                set((state) => ({
                    facts: state.facts.filter(f => f.id !== id)
                }));
            },

            getFactsByCategory: (category) => {
                return get().facts.filter(f => f.category === category);
            },

            getFactByKey: (key) => {
                return get().facts.find(f => f.key === key);
            },

            // ===== DAILY QUESTIONS =====
            addDailyQuestion: (questionData) => {
                const newQuestion: DailyQuestion = {
                    ...questionData,
                    id: generateId(),
                    askedAt: Date.now(),
                    answer: null,
                    answeredAt: null
                };

                set((state) => ({
                    dailyQuestions: [...state.dailyQuestions, newQuestion]
                }));

                console.log('[AIMemory] Added daily question:', newQuestion.question);
            },

            answerDailyQuestion: (id, answer) => {
                set((state) => ({
                    dailyQuestions: state.dailyQuestions.map(q =>
                        q.id === id
                            ? { ...q, answer, answeredAt: Date.now() }
                            : q
                    )
                }));

                console.log('[AIMemory] Answered daily question:', id);
            },

            getTodaysQuestion: () => {
                const today = getTodayKey();
                const state = get();

                // Find a question asked today that hasn't been answered
                return state.dailyQuestions.find(q => {
                    const questionDate = new Date(q.askedAt).toISOString().split('T')[0];
                    return questionDate === today && q.answer === null;
                }) || null;
            },

            hasAnsweredToday: () => {
                const today = getTodayKey();
                const state = get();

                return state.dailyQuestions.some(q => {
                    const questionDate = new Date(q.askedAt).toISOString().split('T')[0];
                    return questionDate === today && q.answer !== null;
                });
            },

            // ===== GLOBAL CHAT HISTORY =====
            addGlobalMessage: (messageData) => {
                const message: ChatMessage = {
                    ...messageData,
                    timestamp: Date.now()
                };

                set((state) => ({
                    globalChatHistory: [...state.globalChatHistory.slice(-99), message], // Keep last 100
                    lastInteraction: Date.now()
                }));
            },

            getRecentMessages: (count) => {
                const state = get();
                return state.globalChatHistory.slice(-count);
            },

            clearChatHistory: () => {
                set({ globalChatHistory: [] });
            },

            // ===== AI PERSONALITY =====
            updatePersonality: (updates) => {
                set((state) => ({
                    aiPersonality: { ...state.aiPersonality, ...updates }
                }));

                console.log('[AIMemory] Updated AI personality:', updates);
            },

            // ===== UTILITY =====
            updateLastInteraction: () => {
                set({ lastInteraction: Date.now() });
            },

            getFullContext: () => {
                const state = get();

                // Build a context string for the LLM
                const lines: string[] = [];

                // User facts
                if (state.facts.length > 0) {
                    lines.push('## What I know about the user:');
                    state.facts.forEach(f => {
                        lines.push(`- ${f.key}: ${f.value} (${f.category})`);
                    });
                }

                // AI personality
                lines.push('\n## My personality settings:');
                lines.push(`- Tone: ${state.aiPersonality.tone}`);
                lines.push(`- Use quotes: ${state.aiPersonality.useQuotes}`);
                if (state.aiPersonality.quoteSource) {
                    lines.push(`- Quote source: ${state.aiPersonality.quoteSource}`);
                }
                if (state.aiPersonality.nickname) {
                    lines.push(`- Call user: ${state.aiPersonality.nickname}`);
                }

                // Recent interactions
                const recentMessages = state.globalChatHistory.slice(-5);
                if (recentMessages.length > 0) {
                    lines.push('\n## Recent conversation:');
                    recentMessages.forEach(m => {
                        lines.push(`${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`);
                    });
                }

                return lines.join('\n');
            }
        }),
        {
            name: 'ai-memory-store',
            storage: createJSONStorage(() => getStorage() as Storage),
            partialize: (state) => ({
                facts: state.facts,
                globalChatHistory: state.globalChatHistory,
                dailyQuestions: state.dailyQuestions,
                lastInteraction: state.lastInteraction,
                aiPersonality: state.aiPersonality
            })
        }
    )
);
