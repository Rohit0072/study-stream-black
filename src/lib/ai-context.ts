import { useLibraryStore } from '@/store/library-store';
import { useAIMemoryStore } from '@/store/ai-memory-store';
import { useScheduleStore } from '@/store/schedule-store';

// ============================================
// AI CONTEXT BUILDER
// Aggregates all user data into context for LLM
// ============================================

export interface AIContext {
    userInfo: string;
    studyProgress: string;
    recentActivity: string;
    personalFacts: string;
    upcomingTasks: string;
    recentChat: string;
    personality: string;
}

/**
 * Builds comprehensive context about the user for the AI
 * This context is sent to the LLM for personalized responses
 */
export function buildAIContext(): AIContext {
    const libraryState = useLibraryStore.getState();
    const memoryState = useAIMemoryStore.getState();
    const scheduleState = useScheduleStore.getState();

    // === User Info ===
    const userInfo = buildUserInfo(libraryState);

    // === Study Progress ===
    const studyProgress = buildStudyProgress(libraryState);

    // === Recent Activity ===
    const recentActivity = buildRecentActivity(libraryState);

    // === Personal Facts ===
    const personalFacts = buildPersonalFacts(memoryState);

    // === Upcoming Tasks ===
    const upcomingTasks = buildUpcomingTasks(scheduleState);

    // === Recent Chat ===
    const recentChat = buildRecentChat(memoryState);

    // === Personality ===
    const personality = buildPersonalityContext(memoryState);

    return {
        userInfo,
        studyProgress,
        recentActivity,
        personalFacts,
        upcomingTasks,
        recentChat,
        personality
    };
}

/**
 * Builds the full system prompt for the AI
 */
export function buildSystemPrompt(): string {
    const ctx = buildAIContext();
    const memoryState = useAIMemoryStore.getState();
    const personality = memoryState.aiPersonality;

    // Base personality instructions
    let systemPrompt = `You are an AI study companion called "Study Buddy". You help users stay motivated and on track with their learning.

## Your Personality
- Tone: ${personality.tone}
- Encouragement style: ${personality.encouragementStyle}
${personality.nickname ? `- Call the user: "${personality.nickname}"` : ''}
${personality.useQuotes && personality.quoteSource && personality.quoteSource !== 'general'
            ? `- Include quotes from "${personality.quoteSource}" when motivating the user`
            : ''}

## Context About The User
${ctx.userInfo}

${ctx.studyProgress}

${ctx.personalFacts}

${ctx.upcomingTasks}

${ctx.recentActivity}

## Recent Conversation
${ctx.recentChat}

## Guidelines
1. Be supportive and encouraging, never judgmental
2. Remember what you know about the user and reference it naturally
3. Keep responses concise but warm
4. If the user mentions interests or preferences, remember them
5. Proactively suggest study sessions based on their schedule
6. Celebrate their achievements, no matter how small
7. If they seem stressed, be extra supportive
`;

    return systemPrompt;
}

// === Helper Functions ===

function buildUserInfo(state: any): string {
    const profile = state.userProfile;
    const lines = ['## User Profile'];

    if (profile.name) lines.push(`- Name: ${profile.name}`);
    if (profile.studyGoal) lines.push(`- Daily study goal: ${profile.studyGoal} hours`);
    if (profile.preferredTime) lines.push(`- Preferred study time: ${profile.preferredTime}`);

    return lines.join('\n');
}

function buildStudyProgress(state: any): string {
    const courses = state.courses || [];
    const lines = ['## Study Progress'];

    if (courses.length === 0) {
        lines.push('- No courses yet');
        return lines.join('\n');
    }

    // Calculate overall progress
    const totalVideos = courses.reduce((sum: number, c: any) => sum + (c.totalVideos || 0), 0);
    const completedVideos = courses.reduce((sum: number, c: any) => sum + (c.completedVideos || 0), 0);
    const overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    lines.push(`- Total courses: ${courses.length}`);
    lines.push(`- Overall completion: ${overallProgress}% (${completedVideos}/${totalVideos} videos)`);

    // Top 3 courses by activity
    const recentCourses = [...courses]
        .sort((a: any, b: any) => (b.completedVideos || 0) - (a.completedVideos || 0))
        .slice(0, 3);

    if (recentCourses.length > 0) {
        lines.push('- Active courses:');
        recentCourses.forEach((c: any) => {
            const progress = c.totalVideos > 0
                ? Math.round((c.completedVideos / c.totalVideos) * 100)
                : 0;
            lines.push(`  - ${c.name}: ${progress}% complete`);
        });
    }

    // Study streak (from studyLog)
    const studyLog = state.studyLog || {};
    const today = new Date().toISOString().split('T')[0];
    const todayStudy = studyLog[today] || 0;
    lines.push(`- Studied today: ${Math.round(todayStudy / 60)} minutes`);

    return lines.join('\n');
}

function buildRecentActivity(state: any): string {
    const lines = ['## Recent Activity'];
    const studyLog = state.studyLog || {};

    // Last 7 days of study
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        const minutes = Math.round((studyLog[key] || 0) / 60);
        if (minutes > 0) {
            last7Days.push(`${date.toLocaleDateString('en-US', { weekday: 'short' })}: ${minutes}m`);
        }
    }

    if (last7Days.length > 0) {
        lines.push(`- Last 7 days: ${last7Days.join(', ')}`);
    } else {
        lines.push('- No recent study activity');
    }

    return lines.join('\n');
}

function buildPersonalFacts(state: any): string {
    const facts = state.facts || [];
    if (facts.length === 0) return '';

    const lines = ['## What I Know About You'];

    // Group by category
    const byCategory: Record<string, any[]> = {};
    facts.forEach((f: any) => {
        if (!byCategory[f.category]) byCategory[f.category] = [];
        byCategory[f.category].push(f);
    });

    Object.entries(byCategory).forEach(([category, items]) => {
        items.forEach((f: any) => {
            lines.push(`- ${f.key}: ${f.value}`);
        });
    });

    return lines.join('\n');
}

function buildUpcomingTasks(state: any): string {
    const tasks = state.getUpcomingTasks?.(24) || [];
    if (tasks.length === 0) return '';

    const lines = ['## Upcoming Study Sessions'];

    tasks.slice(0, 5).forEach((t: any) => {
        const startTime = new Date(t.scheduledStart).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
        const status = t.status === 'pending' ? '⏳' : t.status === 'started' ? '▶️' : '✅';
        lines.push(`- ${status} ${t.title} at ${startTime}`);
    });

    return lines.join('\n');
}

function buildRecentChat(state: any): string {
    const messages = state.globalChatHistory?.slice(-5) || [];
    if (messages.length === 0) return '(No previous conversation)';

    return messages.map((m: any) =>
        `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`
    ).join('\n');
}

function buildPersonalityContext(state: any): string {
    const personality = state.aiPersonality;
    const lines = [];

    if (personality.quoteSource && personality.quoteSource !== 'general') {
        lines.push(`Use ${personality.quoteSource} references when appropriate.`);
    }

    return lines.join('\n');
}

// ============================================
// AI RESPONSE GENERATION
// ============================================

interface GenerateResponseOptions {
    userMessage: string;
    context?: string;
    maxTokens?: number;
}

/**
 * Generates an AI response using the configured LLM
 */
export async function generateAIResponse(options: GenerateResponseOptions): Promise<string> {
    const { userMessage, context = '', maxTokens = 500 } = options;

    const libraryState = useLibraryStore.getState();
    const apiKey = libraryState.settings.geminiApiKey;
    const model = libraryState.settings.geminiModel || 'gemini-1.5-flash';

    if (!apiKey) {
        return "I'd love to help, but I need a Gemini API key to be configured in Settings first! 🔑";
    }

    const systemPrompt = buildSystemPrompt();
    const fullPrompt = context ? `${context}\n\nUser: ${userMessage}` : userMessage;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: systemPrompt }] },
                        { role: 'model', parts: [{ text: 'I understand. I am Study Buddy, your personalized AI study companion!' }] },
                        { role: 'user', parts: [{ text: fullPrompt }] }
                    ],
                    generationConfig: {
                        maxOutputTokens: maxTokens,
                        temperature: 0.7
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No response from AI');
        }

        // Store this interaction
        useAIMemoryStore.getState().addGlobalMessage({ role: 'user', content: userMessage });
        useAIMemoryStore.getState().addGlobalMessage({ role: 'ai', content: text });

        return text;
    } catch (error) {
        console.error('[AI Context] Response generation failed:', error);
        return "Oops! I had trouble connecting. Please try again in a moment. 🔄";
    }
}

// ============================================
// FACT EXTRACTION
// ============================================

/**
 * Analyzes user message to extract personal facts
 */
export function extractFactsFromMessage(message: string): void {
    const memoryStore = useAIMemoryStore.getState();
    const lowerMessage = message.toLowerCase();

    // Simple pattern matching for common facts
    const patterns: { pattern: RegExp; category: any; key: string; extract: (m: RegExpMatchArray) => string }[] = [
        {
            pattern: /i (?:love|like|enjoy|watch|read) (\w+(?:\s+\w+)?)/i,
            category: 'hobby',
            key: 'likes',
            extract: (m) => m[1]
        },
        {
            pattern: /my (?:favorite|fav) (?:anime|show|series) is (\w+(?:\s+\w+)?)/i,
            category: 'interest',
            key: 'favorite_anime',
            extract: (m) => m[1]
        },
        {
            pattern: /(?:call me|my name is|i'm|i am) (\w+)/i,
            category: 'personality',
            key: 'preferred_name',
            extract: (m) => m[1]
        },
        {
            pattern: /i (?:prefer|like) (?:studying|to study) (?:in the )?(\w+)/i,
            category: 'schedule',
            key: 'preferred_study_time',
            extract: (m) => m[1]
        }
    ];

    patterns.forEach(({ pattern, category, key, extract }) => {
        const match = message.match(pattern);
        if (match) {
            memoryStore.addFact({
                category,
                key,
                value: extract(match),
                confidence: 0.8,
                source: 'chat'
            });
        }
    });
}
