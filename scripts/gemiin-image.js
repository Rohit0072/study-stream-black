const { GoogleGenAI } = require("@google/genai");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
    const apiKey = "AIzaSyDdEtK2otSBxFUK4fvNqDvBtYpKVY-PIMI";
    if (!apiKey) {
        console.error("Error: GOOGLE_API_KEY environment variable is required.");
        return;
    }

    const ai = new GoogleGenAI({ apiKey: apiKey }); // Using API key

    // Ensure we have a cat image
    const imagePath = path.resolve(__dirname, "../cat_image.png");
    if (!fs.existsSync(imagePath)) {
        console.log("Creating dummy cat image for testing...");
        // Base64 of a 1x1 red pixel PNG
        const dummyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
        fs.writeFileSync(imagePath, dummyPng);
    }

    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString("base64");

    const prompt = [
        {
            text: "Create a picture of my cat eating a nano-banana in a" +
                "fancy restaurant under the Gemini constellation"
        },
        {
            inlineData: {
                mimeType: "image/png",
                data: base64Image,
            },
        },
    ];

    try {
        console.log("Generating with gemini-2.5-flash-image...");
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: prompt,
        });

        console.log("Response received.");

        if (response && response.candidates && response.candidates.length > 0) {
            const parts = response.candidates[0].content.parts;
            if (parts) {
                for (const part of parts) {
                    if (part.text) {
                        console.log("Text Response:", part.text);
                    } else if (part.inlineData) {
                        const imageData = part.inlineData.data;
                        const buffer = Buffer.from(imageData, "base64");
                        fs.writeFileSync("gemini-native-image.png", buffer);
                        console.log("Image saved as gemini-native-image.png");
                    }
                }
            }
        } else {
            console.log("No candidates in response:", JSON.stringify(response, null, 2));
        }
    } catch (error) {
        console.error("Gemini Generation Error:", error.message);

        if (error.message.includes("429") || error.message.includes("Quota")) {
            console.log("\n[Fallback] Gemini Quota hit (Free tier limit). Falling back to Flux (Direct HF)...");
            await runFluxFallback(prompt[0].text);
        }
    }
}

async function runFluxFallback(promptText) {
    const sessionHash = Math.random().toString(36).substring(2, 13);
    const https = require('https'); // or use fetch which is global in node 18+

    console.log("Flux Prompt:", promptText);

    try {
        const resp = await fetch("https://black-forest-labs-flux-1-schnell.hf.space/gradio_api/queue/join?__theme=system", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: [promptText, 0, true, 1024, 1024, 4],
                event_data: null,
                fn_index: 2,
                session_hash: sessionHash,
                trigger_id: 5
            })
        });

        if (!resp.ok) throw new Error("Flux Queue Failed: " + resp.status);
        console.log("Flux Request Sent! (Check 'test-flux-direct.js' for full polling logic)");
        console.log("Please rely on the App's integrated Flux Fallback which handles the full image retrieval.");

    } catch (e) {
        console.error("Flux Fallback Error:", e.message);
    }
}

main();