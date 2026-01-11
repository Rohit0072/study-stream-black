import { GoogleGenerativeAI } from "@google/generative-ai";
import { Course, Todo, AiProfile, QuizResult } from "@/types";

interface AiContext {
    courseName?: string;
    videoName?: string;
    subtitles?: string;
    todos: Todo[];
    aiProfile: AiProfile;
    quizResults: QuizResult[];
}

export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string, modelName: string = "gemini-1.5-flash") {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: modelName });
    }

    private buildSystemPrompt(context: AiContext): string {
        const { courseName, videoName, subtitles, todos, aiProfile, quizResults } = context;

        let prompt = `You are an intelligent study companion for a student. 
        User Info:
        - Bio: ${aiProfile.bio || "Student"}
        - Goals: ${aiProfile.goals.join(", ") || "General learning"}
        - Learning Style: ${aiProfile.learningStyle}
        
        Current State:
        - Course: ${courseName || "None"}
        - Video: ${videoName || "None"}
        - Pending Tasks: ${todos.filter(t => !t.completed).map(t => t.text).join(", ") || "None"}
        
        Your goal is to be helpful, encouraging, and context-aware. Answer specifically based on the provided subtitles if present.
        `;

        if (subtitles) {
            prompt += `\n\nVideo Subtitles/Transcript:\n${subtitles.slice(0, 30000)}... (truncated if too long)`;
        }

        return prompt;
    }

    async askAi(question: string, context: AiContext): Promise<string> {
        if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !this.genAI.apiKey) {
            throw new Error("Gemini API Key is missing");
        }

        const systemPrompt = this.buildSystemPrompt(context);

        try {
            const chat = this.model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: systemPrompt }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Understood. I am ready to assist you with your studies based on this context." }],
                    }
                ],
            });

            const result = await chat.sendMessage(question);
            const response = result.response;
            return response.text();
        } catch (error: any) {
            console.error("AI Service Error:", error);
            const msg = error.message || "";
            if (msg.includes("429") || msg.includes("quota")) {
                throw new Error("AI Quota Exceeded. Please check your API usage or wait a moment.");
            }
            throw new Error("Failed to get response from AI");
        }
    }

    async generateQuiz(context: AiContext): Promise<any[]> {
        const prompt = `Generate a quiz with 5 multiple-choice questions based on the provided video subtitles. 
         Return ONLY a valid JSON array in this format: 
         [
            { 
                "question": "...", 
                "options": ["...", "...", "...", "..."], 
                "correctIndex": 0, 
                "explanation": "..." 
            }
         ]`;

        // Reuse logic or dedicated call
        const response = await this.askAi(prompt, context);

        // Helper to extract JSON from text
        const extractJson = (text: string) => {
            try {
                // 1. Try simple clean
                const simple = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(simple);
            } catch (e) {
                // 2. Try finding array brackets if mixed with text
                const match = text.match(/\[[\s\S]*\]/);
                if (match) {
                    try {
                        return JSON.parse(match[0]);
                    } catch (e2) {
                        return null;
                    }
                }
                return null;
            }
        };

        const quizData = extractJson(response);

        if (!quizData || !Array.isArray(quizData)) {
            console.error("Failed to parse quiz JSON", response);
            // Instead of throwing, return null so UI can handle it gracefully (e.g. "Try again" or "Context missing")
            return [];
        }

        return quizData;
    }

    async getDashboardInsights(context: AiContext): Promise<{ quote: string, advice: string }> {
        const prompt = `Based on the user's open tasks and recent activity, provide:
        1. A short motivational quote.
        2. One specific, ACTIONABLE piece of study advice.
        Return strictly JSON: { "quote": "...", "advice": "..." }`;

        const response = await this.askAi(prompt, context);
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    }
    async generateNotes(context: AiContext): Promise<string> {
        const { subtitles } = context;
        if (!subtitles || subtitles.trim() === "") {
            throw new Error("No subtitles available to generate notes.");
        }

        const prompt = `
            You are an expert study assistant. I will provide a subtitle transcript of a video lesson.
            Please generate structured, concise, and easy-to-read study notes in Markdown format.
            
            Guidelines:
            - Use clear headings (h1, h2, h3).
            - Use bullet points for key concepts.
            - Highlight important terms in bold.
            - Ignore timestamps and subtitle formatting artifacts.
            - Focus on the educational content.
            - Keep it summarize yet comprehensive.

            Transcript:
            ${subtitles.slice(0, 30000)}... (truncated if too long)
        `;

        const response = await this.askAi(prompt, context);
        return response;
    }
}
