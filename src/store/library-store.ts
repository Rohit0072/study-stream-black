import { getLocalDateKey } from '@/lib/utils'
import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { Course, LibraryState, UserProfile } from '@/types'
import { get, set, del } from 'idb-keyval'

// Storage keys
const MAIN_STORAGE_KEY = 'library-storage-v3';
const BACKUP_STORAGE_KEY = 'library-storage-v3-backup';

/**
 * Validates if the persisted state has a valid structure
 */
function isValidState(data: any): boolean {
    try {
        if (!data || typeof data !== 'object') return false;

        const state = data.state;
        if (!state || typeof state !== 'object') return false;

        // Check for essential properties
        if (!Array.isArray(state.courses)) {
            console.error('[Storage] Invalid state: courses is not an array');
            return false;
        }

        // Additional validation can be added here
        return true;
    } catch (e) {
        console.error('[Storage] Validation error:', e);
        return false;
    }
}

/**
 * Creates a backup-enabled localStorage wrapper that:
 * 1. Backs up data before each write
 * 2. Validates data integrity on read
 * 3. Restores from backup if main storage is corrupted
 */
function createBackupStorage(): Storage {
    return {
        get length() {
            if (typeof window === 'undefined') return 0;
            return localStorage.length;
        },

        key(index: number): string | null {
            if (typeof window === 'undefined') return null;
            return localStorage.key(index);
        },

        getItem(key: string): string | null {
            // SSR guard - localStorage doesn't exist on server
            if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
                return null;
            }

            try {
                const mainData = localStorage.getItem(key);

                // If it's the main storage key, validate and potentially recover
                if (key === MAIN_STORAGE_KEY) {
                    if (mainData) {
                        try {
                            const parsed = JSON.parse(mainData);
                            if (isValidState(parsed)) {
                                console.log('[Storage] Main storage valid');
                                return mainData;
                            } else {
                                console.warn('[Storage] Main storage corrupted, attempting recovery');
                            }
                        } catch (e) {
                            console.error('[Storage] Main storage parse error:', e);
                        }
                    }

                    // Main storage is missing or corrupted - try backup
                    const backupData = localStorage.getItem(BACKUP_STORAGE_KEY);
                    if (backupData) {
                        try {
                            const parsed = JSON.parse(backupData);
                            if (isValidState(parsed)) {
                                console.log('[Storage] Recovered from backup!');
                                // Restore backup to main
                                localStorage.setItem(key, backupData);
                                return backupData;
                            }
                        } catch (e) {
                            console.error('[Storage] Backup parse error:', e);
                        }
                    }

                    console.warn('[Storage] No valid data found in main or backup');
                    return null;
                }

                return mainData;
            } catch (e) {
                console.error('[Storage] getItem error:', e);
                return null;
            }
        },

        setItem(key: string, value: string): void {
            // SSR guard
            if (typeof window === 'undefined') return;

            try {
                // If it's the main storage key, backup before writing
                if (key === MAIN_STORAGE_KEY) {
                    // Validate new data before saving
                    try {
                        const parsed = JSON.parse(value);
                        if (!isValidState(parsed)) {
                            console.error('[Storage] Attempted to save invalid state, aborting');
                            return;
                        }
                    } catch (e) {
                        console.error('[Storage] Invalid JSON in setItem, aborting');
                        return;
                    }

                    // Backup current valid data before overwriting
                    const currentData = localStorage.getItem(key);
                    if (currentData) {
                        try {
                            const currentParsed = JSON.parse(currentData);
                            if (isValidState(currentParsed)) {
                                localStorage.setItem(BACKUP_STORAGE_KEY, currentData);
                                console.log('[Storage] Backup created successfully');
                            }
                        } catch (e) {
                            // Current data is corrupted, don't create corrupt backup
                            console.warn('[Storage] Skipping backup - current data invalid');
                        }
                    }
                }

                localStorage.setItem(key, value);
                console.log('[Storage] Saved:', key);
            } catch (e) {
                console.error('[Storage] setItem error:', e);
            }
        },

        removeItem(key: string): void {
            if (typeof window === 'undefined') return;
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error('[Storage] removeItem error:', e);
            }
        },

        clear(): void {
            if (typeof window === 'undefined') return;
            try {
                localStorage.clear();
            } catch (e) {
                console.error('[Storage] clear error:', e);
            }
        }
    };
}

// Create the backup-enabled storage
const backupStorage = createBackupStorage();

// Custom Async Storage Adapter using IndexedDB (kept for reference, not currently used)
const storage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        console.log('[Storage] Get:', name);
        const value = await get(name);
        console.log('[Storage] Retrieved:', value ? 'Found Data' : 'NULL');
        return value || null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
        console.log('[Storage] Set:', name, '(length:', value.length, ')');
        await set(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        console.log('[Storage] Remove:', name);
        await del(name);
    },
}



export const useLibraryStore = create<LibraryState>()(
    persist(
        (set, get) => ({
            courses: (typeof window !== 'undefined' && !(window as any).electron) ? [{
                id: 'real-path-test',
                name: 'Machine Learning & Data Science',
                path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python',
                totalVideos: 1,
                completedVideos: 0,
                sections: [
                    {
                        id: 'sec-1',
                        name: 'Getting Started',
                        path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python\\1 - Getting Started',
                        videos: [
                            {
                                id: 'vid-1',
                                name: '1 - Introduction',
                                path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python\\1 - Getting Started\\1 - Introduction.mp4',
                                completed: false,
                                progress: 0
                            }
                        ]
                    }
                ]
            }, {
                id: 'real-path-test-2', // Fixed ID duplicate in mock
                name: 'Machine Learning & Data Science',
                path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python',
                totalVideos: 1,
                completedVideos: 0,
                sections: [
                    {
                        id: 'sec-1',
                        name: 'Getting Started',
                        path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python\\1 - Getting Started',
                        videos: [
                            {
                                id: 'vid-1',
                                name: '1 - Introduction',
                                path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python\\1 - Getting Started\\1 - Introduction.mp4',
                                completed: false,
                                progress: 0
                            }
                        ]
                    }
                ]
            }] : [],
            folders: [],
            isLoading: false,
            activeCourseId: null,
            activeVideoId: null,
            studyLog: {},
            notes: {}, // Initialized notes state
            settings: {
                geminiApiKey: null,
                geminiModel: "gemini-1.5-flash",
                imageGenProvider: 'pollinations', // Default (HuggingFace is unreliable)
                huggingFaceApiKey: null,
                deepAiApiKey: null,
                a4fApiKey: null,
                shortcuts: {
                    "library": "Ctrl+1",
                    "bookmarks": "Ctrl+2",
                    "settings": "Ctrl+3"
                },
                hasSeenTour: false,
                autoStartWithWindows: false
            },
            todos: [],
            quizResults: [],
            aiProfile: {
                goals: [],
                interests: [],
                learningStyle: 'visual',
                bio: ''
            },
            fluxZeroGpuUuid: null,

            // User Profile
            userProfile: {
                name: "Student",
                age: 0,
                studyGoal: 2, // Default 2h
                preferredTime: "any"
            },
            devMode: false,

            updateShortcut: (action, keyCombo) => set((state) => ({
                settings: {
                    ...state.settings,
                    shortcuts: {
                        ...state.settings.shortcuts,
                        [action]: keyCombo
                    }
                }
            })),

            setHasSeenTour: () => set((state) => ({
                settings: { ...state.settings, hasSeenTour: true }
            })),

            setAutoStartWithWindows: async (enabled: boolean) => {
                // Update local state
                set((state) => ({
                    settings: { ...state.settings, autoStartWithWindows: enabled }
                }));
                // Call Electron to update registry
                if (typeof window !== 'undefined' && (window as any).electron?.setAutoStart) {
                    await (window as any).electron.setAutoStart(enabled);
                }
            },

            setApiKey: (key) => set((state) => ({
                settings: { ...state.settings, geminiApiKey: key }
            })),

            setModel: (model) => set((state) => ({
                settings: { ...state.settings, geminiModel: model }
            })),

            activeQuiz: null,
            setActiveQuiz: (quiz) => set({ activeQuiz: quiz }),
            updateActiveQuiz: (updates) => set((state) => ({
                activeQuiz: state.activeQuiz ? { ...state.activeQuiz, ...updates } : null
            })),
            bookmarks: [], // Initial empty state

            chatSessions: {},
            addChatMessage: (videoId, message) => set((state) => ({
                chatSessions: {
                    ...state.chatSessions,
                    [videoId]: [...(state.chatSessions[videoId] || []), message]
                }
            })),
            clearChatSession: (videoId) => set((state) => {
                const newSessions = { ...state.chatSessions };
                delete newSessions[videoId];
                return { chatSessions: newSessions };
            }),

            addBookmark: (bookmark) => set((state) => ({
                bookmarks: [...state.bookmarks, bookmark]
            })),

            removeBookmark: (id) => set((state) => ({
                bookmarks: (state.bookmarks || []).filter(b => b.id !== id)
            })),

            setImageGenProvider: (provider) => set((state) => ({
                settings: { ...state.settings, imageGenProvider: provider }
            })),

            setHuggingFaceApiKey: (key) => set((state) => ({
                settings: { ...state.settings, huggingFaceApiKey: key }
            })),

            setDeepAiApiKey: (key) => set((state) => ({
                settings: { ...state.settings, deepAiApiKey: key }
            })),

            setA4fApiKey: (key) => set((state) => ({
                settings: { ...state.settings, a4fApiKey: key }
            })),

            setFluxZeroGpuToken: (token) => { /* no-op in types for now but keeping interface compat */ },
            setFluxZeroGpuUuid: (uuid) => set((state) => ({ fluxZeroGpuUuid: uuid })),

            updateUserProfile: (profile) => set((state) => ({
                userProfile: { ...state.userProfile, ...profile }
            })),

            updateCourseImage: (courseId, imageUrl) => set((state) => ({
                courses: state.courses.map(course =>
                    course.id === courseId ? { ...course, coverImage: imageUrl } : course
                )
            })),

            toggleCoursePin: (courseId) => set((state) => ({
                courses: state.courses.map(course =>
                    course.id === courseId ? { ...course, isPinned: !course.isPinned } : course
                )
            })),

            setCourseColor: (courseId, color) => set((state) => ({
                courses: state.courses.map(course =>
                    course.id === courseId ? { ...course, color } : course
                )
            })),

            setDevMode: (enabled) => set({ devMode: enabled }),

            // Folder Implementation
            createFolder: (name) => set((state) => ({
                folders: [...(state.folders || []), {
                    id: crypto.randomUUID(),
                    name,
                    courseIds: [],
                    createdAt: Date.now()
                }]
            })),

            deleteFolder: (folderId) => set((state) => ({
                folders: (state.folders || []).filter(f => f.id !== folderId)
                // Courses that were in this folder automatically "become" root courses 
                // because they are no longer in any folder's courseIds list.
            })),

            renameFolder: (folderId, name) => set((state) => ({
                folders: (state.folders || []).map(f => f.id === folderId ? { ...f, name } : f)
            })),

            moveCourse: (courseId, targetFolderId) => set((state) => {
                const folders = state.folders || [];

                // 1. Remove from ANY existing folder
                const cleanedFolders = folders.map(f => ({
                    ...f,
                    courseIds: f.courseIds.filter(id => id !== courseId)
                }));

                // 2. Add to target folder if specified
                if (targetFolderId) {
                    return {
                        folders: cleanedFolders.map(f =>
                            f.id === targetFolderId
                                ? { ...f, courseIds: [...f.courseIds, courseId] }
                                : f
                        )
                    };
                }

                // If target is null (Root), we just leave it removed from cleanedFolders
                return { folders: cleanedFolders };
            }),

            addManualStudyLog: (date, seconds) => set((state) => ({
                studyLog: {
                    ...state.studyLog,
                    [date]: (state.studyLog[date] || 0) + seconds
                }
            })),

            addTodo: (text, type) => set((state) => ({
                todos: [...state.todos, {
                    id: crypto.randomUUID(),
                    text,
                    type,
                    completed: false,
                    createdAt: Date.now()
                }]
            })),

            toggleTodo: (id) => set((state) => ({
                todos: state.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
            })),

            deleteTodo: (id) => set((state) => ({
                todos: state.todos.filter(t => t.id !== id)
            })),

            updateAiProfile: (profile) => set((state) => ({
                aiProfile: { ...state.aiProfile, ...profile }
            })),

            addQuizResult: (result) => set((state) => ({
                quizResults: [...state.quizResults, result]
            })),

            setCourses: (courses) => set({ courses }),

            addCourse: (course) => {
                const exists = get().courses.some(c => c.path === course.path);
                if (!exists) {
                    set((state) => ({ courses: [...state.courses, course] }));
                }
            },

            removeCourse: (courseId) => set((state) => ({
                courses: state.courses.filter(c => c.id !== courseId),
                // Also remove from any folders
                folders: (state.folders || []).map(f => ({
                    ...f,
                    courseIds: f.courseIds.filter(id => id !== courseId)
                }))
            })),

            setLoading: (isLoading) => set({ isLoading }),

            setActiveCourse: (courseId) => set({ activeCourseId: courseId }),

            updateVideoProgress: (courseId, videoId, progress, completed, duration) => set((state) => {

                const newCourses = state.courses.map(course => {
                    if (course.id !== courseId) return course;

                    let courseCompletedCount = 0;

                    const newSections = course.sections.map(section => {
                        const newVideos = section.videos.map(video => {
                            if (video.id !== videoId) {
                                if (video.completed) courseCompletedCount++;
                                return video;
                            }

                            // Preserve existing completion status if false is passed
                            const newCompleted = completed || video.completed;
                            if (newCompleted) courseCompletedCount++;

                            return {
                                ...video,
                                progress,
                                completed: newCompleted,
                                lastPlayedAt: Date.now(),
                                duration: duration || video.duration
                            };
                        });
                        return { ...section, videos: newVideos };
                    });

                    return {
                        ...course,
                        sections: newSections,
                        completedVideos: courseCompletedCount,
                        lastPlayedVideoId: videoId
                    };
                });

                return { courses: newCourses };
            }),

            toggleSection: (courseId, sectionId) => set((state) => ({
                courses: state.courses.map(course => {
                    if (course.id !== courseId) return course;
                    return {
                        ...course,
                        sections: course.sections.map(section => {
                            if (section.id !== sectionId) return section;
                            return { ...section, isExpanded: section.isExpanded === undefined ? false : !section.isExpanded };
                        })
                    };
                })
            })),

            setSingleExpandedSection: (courseId, sectionId) => set((state) => ({
                courses: state.courses.map(course => {
                    if (course.id !== courseId) return course;
                    return {
                        ...course,
                        sections: course.sections.map(section => ({
                            ...section,
                            // Expand if matches ID, collapse otherwise
                            isExpanded: section.id === sectionId
                        }))
                    };
                })
            })),

            trackStudyTime: (seconds) => set((state) => {
                const today = getLocalDateKey();
                const current = state.studyLog?.[today] || 0;
                return {
                    studyLog: {
                        ...state.studyLog,
                        [today]: current + seconds
                    }
                };
            }),

            saveNote: (courseId, videoId, content) => set((state) => {
                const id = `${courseId}-${videoId}`;
                return {
                    notes: {
                        ...state.notes,
                        [id]: {
                            id,
                            courseId,
                            videoId,
                            content,
                            updatedAt: Date.now()
                        }
                    }
                };
            }),

            clearData: () => {
                // Determine initial courses based on environment (Electron vs Web)
                const initialCourses = (typeof window !== 'undefined' && !(window as any).electron) ? [{
                    id: 'real-path-test',
                    name: 'Machine Learning & Data Science',
                    path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python',
                    totalVideos: 1,
                    completedVideos: 0,
                    sections: [
                        {
                            id: 'sec-1',
                            name: 'Getting Started',
                            path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python\\1 - Getting Started',
                            videos: [
                                {
                                    id: 'vid-1',
                                    name: '1 - Introduction',
                                    path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python\\1 - Getting Started\\1 - Introduction.mp4',
                                    completed: false,
                                    progress: 0
                                }
                            ]
                        }
                    ]
                }, {
                    id: 'real-path-test-2',
                    name: 'Machine Learning & Data Science',
                    path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python',
                    totalVideos: 1,
                    completedVideos: 0,
                    sections: [
                        {
                            id: 'sec-1',
                            name: 'Getting Started',
                            path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python\\1 - Getting Started',
                            videos: [
                                {
                                    id: 'vid-1',
                                    name: '1 - Introduction',
                                    path: 'D:\\courses\\DATA SCIENCE\\Machine-Learning-Data-Science-Deep-Learning-Python\\1 - Getting Started\\1 - Introduction.mp4',
                                    completed: false,
                                    progress: 0
                                }
                            ]
                        }
                    ]
                }] : [];

                set({
                    courses: initialCourses,
                    folders: [],
                    activeCourseId: null,
                    activeVideoId: null,
                    studyLog: {},
                    activeQuiz: null,
                    setActiveQuiz: (quiz) => set({ activeQuiz: quiz }),
                    updateActiveQuiz: (updates) => set((state) => ({
                        activeQuiz: state.activeQuiz ? { ...state.activeQuiz, ...updates } : null
                    })),
                    notes: {},
                    settings: {
                        geminiApiKey: null,
                        geminiModel: "gemini-1.5-flash",
                        imageGenProvider: 'pollinations',
                        deepAiApiKey: null,
                        huggingFaceApiKey: null,
                        a4fApiKey: null,
                        shortcuts: {
                            "library": "Ctrl+1",
                            "bookmarks": "Ctrl+2",
                            "settings": "Ctrl+3"
                        },
                        hasSeenTour: false,
                        autoStartWithWindows: false
                    },
                    fluxZeroGpuUuid: null,
                    userProfile: {
                        name: "Student",
                        age: 0,
                        studyGoal: 2,
                        preferredTime: "any"
                    },
                    devMode: false,
                    todos: [],
                    quizResults: [],
                    aiProfile: {
                        goals: [],
                        interests: [],
                        learningStyle: 'visual',
                        bio: ''
                    },
                    bookmarks: []
                });
            }
        }),
        {
            name: 'library-storage-v3', // Storage key
            storage: createJSONStorage(() => backupStorage), // Use backup-enabled storage wrapper
            merge: (persistedState: any, currentState: LibraryState) => {
                console.log('[Persistence] Merging state. Persisted courses:', persistedState?.courses?.length);
                return {
                    ...currentState,
                    ...persistedState,
                    settings: {
                        ...currentState.settings,
                        ...(persistedState.settings || {}),
                        shortcuts: {
                            ...currentState.settings.shortcuts,
                            ...(persistedState.settings?.shortcuts || {})
                        },
                        hasSeenTour: persistedState.settings?.hasSeenTour ?? currentState.settings.hasSeenTour
                    }
                };
            },
            onRehydrateStorage: () => (state) => {
                console.log('[LibraryStore] Hydration finished');
                if (state) {
                    console.log('[LibraryStore] Loaded state:', {
                        courses: state.courses?.length,
                        folders: state.folders?.length,
                        hasSettings: !!state.settings
                    });
                } else {
                    console.log('[LibraryStore] No persisted state found (Fresh Start) - Using defaults');
                }
            }
        }
    )
)
