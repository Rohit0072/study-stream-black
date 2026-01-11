
const https = require('https');

const apiKey = process.argv[2];

if (!apiKey) {
    console.error("Please provide your API Key as an argument.");
    console.error("Usage: node scripts/test-gemini-models.js YOUR_API_KEY");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("Fetching available models...");

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            if (response.error) {
                console.error("API Error:", response.error);
                return;
            }

            if (!response.models) {
                console.log("No models found.");
                return;
            }

            console.log("\n--- Available Image Generation Models ---");
            const imageModels = response.models.filter(m =>
                (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('predict')) ||
                (m.name && m.name.includes('imagen')) ||
                (m.name && m.name.includes('image'))
            );

            if (imageModels.length > 0) {
                imageModels.forEach(m => {
                    console.log(`- ${m.name} (${m.version})`);
                    console.log(`  Methods: ${m.supportedGenerationMethods.join(', ')}`);
                });
            } else {
                console.log("No explicit message/predict image models found.");
            }

            console.log("\n--- All Models (First 10) ---");
            response.models.slice(0, 10).forEach(m => console.log(`- ${m.name}`));

        } catch (e) {
            console.error("Failed to parse response:", e);
        }
    });

}).on('error', (err) => {
    console.error("Request error:", err);
});
