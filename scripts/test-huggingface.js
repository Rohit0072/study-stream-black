
import { Client } from "@gradio/client";
import fs from 'fs';

async function testHuggingFace() {
    console.log("Testing Hugging Face (Black Forest Labs Flux)...");
    try {
        const client = await Client.connect("black-forest-labs/FLUX.1-schnell");
        const prompt = "Minimal abstract course card illustration for a Java programming course";

        console.log(`Generating for prompt: "${prompt}"...`);
        const result = await client.predict("/infer", {
            prompt: prompt,
            seed: 0,
            randomize_seed: true,
            width: 1024,
            height: 1024,
            num_inference_steps: 4,
        });

        console.log("Result:", JSON.stringify(result, null, 2));

        if (result?.data?.[0]?.url) {
            console.log("Success! URL:", result.data[0].url);
        } else {
            console.error("Failed to get URL from response");
        }

    } catch (error) {
        console.error("Hugging Face Error:", error);
    }
}

testHuggingFace();
