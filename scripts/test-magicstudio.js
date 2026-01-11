const fs = require('fs');
const path = require('path');

async function testMagicStudio() {
    console.log("Testing MagicStudio API...");

    const params = new URLSearchParams();
    params.append('prompt', 'Minimal abstract course card illustration for a Java programming course, dark modern UI style. A glowing white line-art coffee cup icon at the center, soft neon outline. 2D, flat, high resolution.');
    params.append('output_format', 'bytes');
    params.append('user_profile_id', 'null');
    params.append('anonymous_user_id', '9a5f6dc6-ad16-4df7-bc5b-a786b9dceb6a');
    params.append('request_timestamp', Date.now() / 1000); // Dynamic timestamp
    params.append('user_is_subscribed', 'false');
    params.append('client_id', 'pSgX7WgjukXCBoYwDM8G8GLnRRkvAoJlqa5eAVvj95o');

    try {
        const response = await fetch("https://ai-api.magicstudio.com/api/ai-art-generator", {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Origin": "https://magicstudio.com",
                "Referer": "https://magicstudio.com/"
            },
            body: params
        });

        if (response.ok) {
            console.log("Response OK!");
            const buffer = await response.arrayBuffer();
            const filePath = path.join(__dirname, 'test-magic.png');
            fs.writeFileSync(filePath, Buffer.from(buffer));
            console.log(`Success! Saved image to ${filePath}`);
            console.log(`Size: ${buffer.byteLength} bytes`);
        } else {
            console.log(`Failed. Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log("Response:", text);
        }

    } catch (error) {
        console.error("Error calling MagicStudio:", error);
    }
}

testMagicStudio();
