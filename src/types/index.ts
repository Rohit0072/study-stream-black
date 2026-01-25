export interface Video {
    id: string;
    name: string;
    path: string;
    duration?: number;
    completed: boolean;
    progress: number; // 0 to 100
    lastPlayedAt?: number; // timestamp
    subtitles?: {
        path: string;
        lang: string; // 'en', 'es', etc.
        label: string; // 'English', 'Spanish'
    }[];
}

export interface Section {
    id: string;
    name: string;
    path: string;
    videos: Video[];
    isExpanded?: boolean;
}

export interface Course {
    id: string;
    name: string;
    path: string; // Root folder path
    sections: Section[];
    totalVideos: number;
    completedVideos: number;
    description?: string;
    coverImage?: string;
    lastPlayedVideoId?: string;
    isPinned?: boolean;
    color?: string; // Hex code or tailwind class
}

export interface Note {
    id: string; // usually `${courseId}-${videoId}`
    courseId: string;
    videoId: string;
    content: string;
    updatedAt: number;
}

export interface Folder {
    id: string;
    name: string;
    courseIds: string[];
    color?: string;
    createdAt: number;
}

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    type: 'daily' | 'weekly' | 'long-term';
    createdAt: number;
}

export interface QuizResult {
    id: string;
    videoId: string;
    courseId: string;
    score: number;
    totalQuestions: number;
    date: number;
}

export interface AiProfile {
    goals: string[];
    interests: string[];
    learningStyle: 'visual' | 'text' | 'practical';
    bio: string;
}

export interface ActiveQuiz {
    videoId: string;
    questions: any[]; // Using any for simplicity as per existing quiz structure, ideally strict type
    answers: Record<number, number>; // questionIndex -> optionIndex
    currentQuestionIndex: number;
    score: number;
    isCompleted: boolean;
}

export interface Bookmark {
    id: string;
    courseId: string;
    videoId: string;
    time: number;
    label: string;
    context?: string; // Subtitle text or context at that moment
    createdAt: number;
}

export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
}

// ============================================
// ACTIVE AI TYPES
// ============================================

/** A fact learned about the user from conversations or questions */
export interface UserFact {
    id: string;
    category: 'hobby' | 'preference' | 'goal' | 'personality' | 'interest' | 'schedule';
    key: string;           // e.g., "favorite_anime", "study_preference"
    value: string;         // e.g., "One Piece", "morning person"
    confidence: number;    // 0-1 how certain AI is about this fact
    source: 'chat' | 'question' | 'inferred' | 'manual';
    createdAt: number;
    updatedAt: number;
}

/** A daily question asked to learn more about the user */
export interface DailyQuestion {
    id: string;
    question: string;
    answer: string | null;
    askedAt: number;
    answeredAt: number | null;
    category: 'hobby' | 'learning' | 'motivation' | 'schedule' | 'personality';
}

/** AI Memory - stores everything the AI knows about the user */
export interface AIMemory {
    facts: UserFact[];
    globalChatHistory: ChatMessage[];
    dailyQuestions: DailyQuestion[];
    lastInteraction: number;
    aiPersonality: AIPersonality;
}

/** AI Personality settings that adapt based on user preferences */
export interface AIPersonality {
    tone: 'friendly' | 'professional' | 'casual' | 'motivational';
    useQuotes: boolean;                    // Use motivational quotes
    quoteSource?: string;                  // e.g., "One Piece", "Naruto", "general"
    encouragementStyle: 'gentle' | 'direct' | 'enthusiastic';
    nickname?: string;                     // What AI calls the user
}

/** A scheduled study task */
export interface ScheduledTask {
    id: string;
    title: string;                         // "Learn React"
    description?: string;
    courseId?: string;                     // Link to course if applicable
    scheduledStart: number;                // Unix timestamp
    scheduledEnd: number;                  // Unix timestamp
    status: 'pending' | 'started' | 'completed' | 'missed' | 'snoozed';
    remindersSent: number[];               // Timestamps of sent reminders
    completedAt?: number;
    createdAt: number;
}

/** A recurring study schedule */
export interface RecurringSchedule {
    id: string;
    title: string;
    description?: string;
    courseId?: string;
    daysOfWeek: number[];                  // 0-6 (Sun-Sat)
    startTime: string;                     // "16:00" (4 PM)
    endTime: string;                       // "17:00" (5 PM)
    isActive: boolean;
    createdAt: number;
}

/** A reminder notification */
export interface Reminder {
    id: string;
    taskId: string;
    type: 'start' | 'delayed_start' | 'completion' | 'encouragement' | 'streak';
    scheduledFor: number;
    sent: boolean;
    message: string;
    dismissedAt?: number;
}

/** Study schedule - all tasks and reminders */
export interface StudySchedule {
    tasks: ScheduledTask[];
    recurringSchedules: RecurringSchedule[];
    pendingReminders: Reminder[];
}

/** AI Notification that can appear in-app or as system notification */
export interface AINotification {
    id: string;
    type: 'reminder' | 'encouragement' | 'milestone' | 'question' | 'tip';
    title: string;
    message: string;
    actions?: { label: string; action: string }[];  // Quick action buttons
    priority: 'low' | 'medium' | 'high';
    createdAt: number;
    expiresAt?: number;
    read: boolean;
    questionId?: string;  // Link to daily question for answering
}

export interface UserProfile {
    name: string;
    age: number;
    studyGoal: number; // Daily goal in hours
    preferredTime: string; // "morning", "night", etc.
}

export interface LibraryState {
    courses: Course[];
    folders: Folder[];
    notes: Record<string, Note>;
    todos: Todo[];
    quizResults: QuizResult[];
    bookmarks: Bookmark[];
    aiProfile: AiProfile;
    isLoading: boolean;
    activeCourseId: string | null;
    setActiveCourse: (courseId: string | null) => void;
    activeVideoId: string | null;
    studyLog: Record<string, number>;
    activeQuiz: ActiveQuiz | null;

    userProfile: UserProfile;
    devMode: boolean;

    settings: {
        geminiApiKey: string | null;
        geminiModel: string;
        imageGenProvider: 'huggingface' | 'deepai' | 'magicstudio' | 'raphael' | 'pollinations' | 'puter' | 'custom-flux' | 'gemini' | 'a4f';
        deepAiApiKey: string | null;
        huggingFaceApiKey: string | null;
        a4fApiKey: string | null;
        shortcuts: Record<string, string>;
        hasSeenTour: boolean;
        autoStartWithWindows: boolean;
    }
    fluxZeroGpuUuid: string | null;

    // Core Actions
    setCourses: (courses: Course[]) => void;
    addCourse: (course: Course) => void;
    removeCourse: (courseId: string) => void;
    setLoading: (isLoading: boolean) => void;
    updateVideoProgress: (courseId: string, videoId: string, progress: number, completed: boolean, duration?: number) => void;
    toggleSection: (courseId: string, sectionId: string) => void;
    setSingleExpandedSection: (courseId: string, sectionId: string) => void;
    trackStudyTime: (seconds: number) => void;
    saveNote: (courseId: string, videoId: string, content: string) => void;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
    updateCourseImage: (courseId: string, imageUrl: string) => void;
    toggleCoursePin: (courseId: string) => void;
    setCourseColor: (courseId: string, color: string) => void;
    setDevMode: (enabled: boolean) => void;
    setHasSeenTour: () => void;
    setAutoStartWithWindows: (enabled: boolean) => void;
    addManualStudyLog: (date: string, seconds: number) => void;

    // Folder Actions
    createFolder: (name: string) => void;
    deleteFolder: (folderId: string) => void;
    renameFolder: (folderId: string, name: string) => void;
    moveCourse: (courseId: string, targetFolderId: string | null) => void;

    // Actions
    updateShortcut: (action: string, keyCombo: string) => void;
    setImageGenProvider: (provider: 'huggingface' | 'deepai' | 'magicstudio' | 'raphael' | 'pollinations' | 'puter' | 'custom-flux' | 'gemini' | 'a4f') => void;
    setDeepAiApiKey: (key: string) => void;
    setHuggingFaceApiKey: (key: string) => void;
    setA4fApiKey: (key: string) => void;
    setFluxZeroGpuToken: (token: string) => void;
    setFluxZeroGpuUuid: (uuid: string) => void;
    setApiKey: (key: string) => void;
    setModel: (model: string) => void;
    clearData: () => void;
    // AI Actions
    addTodo: (text: string, type: 'daily' | 'weekly' | 'long-term') => void;
    toggleTodo: (id: string) => void;
    deleteTodo: (id: string) => void;
    updateAiProfile: (profile: Partial<AiProfile>) => void;
    addQuizResult: (result: QuizResult) => void;
    // Quiz Actions
    setActiveQuiz: (quiz: ActiveQuiz | null) => void;
    updateActiveQuiz: (updates: Partial<ActiveQuiz>) => void;
    // Bookmark Actions
    addBookmark: (bookmark: Bookmark) => void;
    removeBookmark: (id: string) => void;

    // Chat Actions
    chatSessions: Record<string, ChatMessage[]>;
    addChatMessage: (videoId: string, message: ChatMessage) => void;
    clearChatSession: (videoId: string) => void;
}


