const fs = require('fs');

async function testPollinations() {
    // Pollinations uses a simple GET URL structure.
    // prompt must be URL encoded.
    const prompt = "Minimal abstract course card illustration for a Java programming course, dark modern UI style. A glowing white line-art coffee cup icon at the center. 2D vector art.";
    const seed = Math.floor(Math.random() * 100000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&seed=${seed}&model=flux&nologo=true`;

    console.log("Testing Pollinations.ai (Flux)...");
    console.log("URL:", url);

    try {
        const response = await fetch(url);

        if (response.ok) {
            console.log("Response OK!");
            const buffer = await response.arrayBuffer();
            const path = 'pollinations-test.jpg';
            fs.writeFileSync(path, Buffer.from(buffer));
            console.log(`Saved image to ${path}`);
            console.log("Size:", buffer.byteLength, "bytes");
        } else {
            console.error(`Failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

testPollinations();
