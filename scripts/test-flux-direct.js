const https = require('https');

async function testDirectFlux() {
    // Generate a random 11-char session hash like the user's example
    const sessionHash = Math.random().toString(36).substring(2, 13);

    const payload = {
        data: [
            "Minimal abstract course card illustration for a Java programming course, dark modern UI style.",
            0,
            true,
            1024,
            1024,
            4
        ],
        element_id: null,
        event_data: null,
        fn_index: 2,
        session_hash: sessionHash,
        trigger_id: 5
    };

    console.log("Testing Direct Flux Request...");
    console.log("Session Hash:", sessionHash);

    try {
        const response = await fetch("https://black-forest-labs-flux-1-schnell.hf.space/gradio_api/queue/join?__theme=system", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Trying without the specific x-zerogpu-token first as it is likely dynamic/expiring
                // If this fails, we know that token is mandatory.
                "Origin": "https://black-forest-labs-flux-1-schnell.hf.space",
                "Referer": "https://black-forest-labs-flux-1-schnell.hf.space/?__theme=system",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            body: JSON.stringify(payload)
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response:", text.substring(0, 500)); // Print first 500 chars

        if (response.ok) {
            console.log("Request accepted! Now we would need to poll the queue.");
        } else {
            console.log("Request failed, likely due to missing ZeroGPU token or validation.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

testDirectFlux();
