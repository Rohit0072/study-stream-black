import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export class ImageGenService {
    private genAI: GoogleGenerativeAI;
    private openai?: OpenAI;
    private apiKey: string;
    private a4fKey?: string;

    constructor(apiKey: string, a4fKeyInput?: string | null) {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);

        // Prioritize passed key, fallback to env
        const a4fKey = a4fKeyInput || process.env.NEXT_PUBLIC_A4F_API_KEY;
        this.a4fKey = a4fKey || undefined;

        if (this.a4fKey) {
            this.openai = new OpenAI({
                apiKey: this.a4fKey,
                baseURL: "https://api.a4f.co/v1",
                dangerouslyAllowBrowser: true // Required for client-side usage if not proxied
            });
        }
    }

    async generateImage(prompt: string, modelType: 'flux' | 'gemini', fluxModelId?: string): Promise<string> {
        if (modelType === 'flux') {
            return this.generateFluxWithA4F(prompt, fluxModelId);
        } else {
            return this.generateGeminiImage(prompt);
        }
    }

    private async generateFluxWithA4F(prompt: string, modelId: string = "provider-4/flux-schnell"): Promise<string> {
        console.log(`Generating Flux image via A4F (${modelId}) for:`, prompt);

        if (!this.openai) {
            throw new Error("A4F API Key is missing. Please set NEXT_PUBLIC_A4F_API_KEY.");
        }

        try {
            const response = await this.openai.images.generate({
                model: modelId,
                prompt: prompt,
                size: "1024x1024",
                n: 1,
            });

            const url = response.data?.[0]?.url;
            if (!url) {
                throw new Error("No image URL returned from A4F");
            }

            return url;

        } catch (error) {
            console.error("A4F/Flux Generation Error:", error);
            throw error;
        }
    }

    private async generateGeminiImage(prompt: string): Promise<string> {
        console.log("Generating Gemini image for:", prompt);
        try {
            // Using the user-specified model: gemini-2.5-flash-image
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

            const result = await model.generateContent(prompt);
            const response = await result.response;

            const candidates = response.candidates;
            if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
                // Look for inline_data
                const imagePart = candidates[0].content.parts.find(p => p.inlineData);
                if (imagePart && imagePart.inlineData) {
                    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                }
            }

            // If we get text instead (refusal or description)
            const text = response.text();
            throw new Error(`Gemini returned text instead of image: ${text.substring(0, 100)}...`);

        } catch (error: any) {
            console.error("Gemini Generation Error:", error);
            const msg = error.message || "";
            if (msg.includes("400") && (msg.includes("billing") || msg.includes("billed"))) {
                throw new Error("Billing Required: This Google Cloud model requires an active billing account. Please switch to Flux.");
            }
            throw error;
        }
    }
}
