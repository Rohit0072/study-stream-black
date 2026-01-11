
async function testGenerate() {
    const prompt = "A neon hologram of a cat";
    console.log(`[Test] Calling /call/predict with prompt: "${prompt}"`);

    try {
        const resp = await fetch('https://black-forest-labs-flux-1-schnell.hf.space/call/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: [
                    prompt,
                    0,      // Seed
                    true,   // Randomize
                    1024,   // Width
                    1024,   // Height
                    4       // Steps
                ]
            })
        });

        if (resp.ok) {
            const json = await resp.json();
            console.log('[Test] Initiated Event ID:', json.event_id);

            // Now we need to poll the result using the event_id
            // GET /call/predict/{event_id}
            const eventId = json.event_id;

            // Poll loop
            while (true) {
                console.log(`[Poll] Checking event ${eventId}...`);
                const pollResp = await fetch(`https://black-forest-labs-flux-1-schnell.hf.space/call/predict/${eventId}`);
                const pollText = await pollResp.text(); // Stream of SSE events usually

                // For /call/ style, it might return a stream OR we might need to listen to SSE on that URL.
                // In Gradio 5 client, it connects to SSE. 
                // But for simple fetch, let's see what we get.
                console.log('[Poll] Raw Response (preview):', pollText.substring(0, 500));

                if (pollText.includes('event: complete')) {
                    console.log('[Success] Generation Complete!');
                    // Extract data line
                    // data: [...]
                    break;
                }

                await new Promise(r => setTimeout(r, 1000));
                // If the response is a stream, we shouldn't await text(). We should read the stream.
                // But let's see if it returns instantly or hangs.
                break; // Break for now to inspect
            }

        } else {
            console.log('[Test] Failed:', resp.status, await resp.text());
        }
    } catch (e) {
        console.error(e);
    }
}

testGenerate();
