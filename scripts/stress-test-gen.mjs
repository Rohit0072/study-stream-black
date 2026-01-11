
import { Client } from "@gradio/client";

// Function to generate a simplified UUID for session hashing simulation
function randomSessionHash() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function runTest(id) {
    const prompt = `Abstract shape ${id}`;
    // Simulate unique session by re-connecting (Client.connect creates new session by default usually)
    // We can also try passing custom session_hash if the client allows, but let's test isolation first.
    console.log(`[Worker ${id}] Connecting...`);

    try {
        // NOTE: The user wants to "bypass" limits. 
        // We will try to explicitly pass hf_token if we had one, but we don't.
        // We will relay on unique client instances.
        const client = await Client.connect("black-forest-labs/FLUX.1-schnell");

        console.log(`[Worker ${id}] Requesting...`);
        const result = await client.predict("/infer", {
            prompt: prompt,
            seed: Math.floor(Math.random() * 10000), // Random seed
            randomize_seed: true,
            width: 512, // Smaller for speed
            height: 512,
            num_inference_steps: 2, // Faster
        });

        if (result?.data?.[0]?.url) {
            console.log(`[Worker ${id}] Success!`);
        } else {
            console.log(`[Worker ${id}] Failed: No URL`);
        }
    } catch (e) {
        console.error(`[Worker ${id}] Error:`, e.message);
    }
}

async function stressTest() {
    console.log("Starting Stress Test with 5 concurrent requests...");
    const promises = [];
    for (let i = 0; i < 5; i++) {
        promises.push(runTest(i));
        // Stagger slightly
        await new Promise(r => setTimeout(r, 500));
    }

    await Promise.all(promises);
    console.log("Stress Test Complete");
}

stressTest();
