const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function testRaphael() {
    console.log("Testing Raphael API...");

    const payload = {
        aspect: "1:1",
        autoTranslate: true,
        client_request_id: crypto.randomUUID(),
        fastMode: false,
        highQuality: false,
        isSafeContent: true,
        model_id: "raphael-basic",
        prompt: "Minimal abstract course card illustration for a Java programming course, dark modern UI style. A glowing white line-art coffee cup icon at the center, soft neon outline. 2D, flat, high resolution.",
        turnstileToken: null
    };

    try {
        const response = await fetch("https://raphael.app/api/generate-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Origin": "https://raphael.app",
                "Referer": "https://raphael.app/"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("Response OK!");
            const data = await response.json();
            fs.writeFileSync(path.join(__dirname, 'raphael-response.json'), JSON.stringify(data, null, 2));
            console.log("Saved response to raphael-response.json");

            // Assuming the API returns a URL or base64. 
            // Based on typical APIs, looking for 'url' or 'images' array.
            if (data.images && data.images[0]) {
                console.log("Found image URL:", data.images[0].url);
            }
        } else {
            console.log(`Failed. Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            fs.writeFileSync(path.join(__dirname, 'raphael-error.json'), text);
            console.log("Saved error to raphael-error.json");
        }

    } catch (error) {
        console.error("Error calling Raphael:", error);
    }
}

testRaphael();
