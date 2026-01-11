
import { Client } from "@gradio/client";

async function testGen() {
    try {
        console.log("Connecting...");
        const client = await Client.connect("black-forest-labs/FLUX.1-schnell");
        console.log("Connected! Genering...");

        const result = await client.predict("/infer", {
            prompt: "A retro sci-fi computer terminal",
            seed: 0,
            randomize_seed: true,
            width: 512,
            height: 512,
            num_inference_steps: 4,
        });

        console.log("Result:", result);
    } catch (e) {
        console.error("Error:", e);
    }
}

testGen();
