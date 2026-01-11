
const fs = require('fs');
const path = require('path');

async function testDeepAI() {
    console.log("Testing DeepAI API...");

    const formData = new FormData();
    formData.append('text', 'create java course card, with black primium backgound');
    formData.append('width', '640');
    formData.append('height', '640');
    formData.append('image_generator_version', 'hd');
    formData.append('use_new_model', 'false');
    formData.append('use_old_model', 'false');
    formData.append('quality', 'true');

    try {
        const response = await fetch("https://api.deepai.org/api/text2img", {
            method: "POST",
            headers: {
                "api-key": "tryit-25645541877-7a80ff3e40b47c50c0743360e887fac1"
            },
            body: formData
        });

        const data = await response.json();

        if (data.output_url) {
            console.log("Success! Generated Image URL:", data.output_url);
        } else {
            console.log("DeepAI Error: " + (data.err || "Unknown error"));
            if (data.status) console.log("Status: " + data.status);
        }

    } catch (error) {
        console.error("Error calling DeepAI:", error);
    }
}

testDeepAI();
