import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const params = new URLSearchParams();

        // Reconstruct the params
        for (const [key, value] of Object.entries(body)) {
            params.append(key, value as string);
        }

        const response = await fetch("https://ai-api.magicstudio.com/api/ai-art-generator", {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Origin": "https://magicstudio.com",
                "Referer": "https://magicstudio.com/"
            },
            body: params
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `MagicStudio API Error: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'image/png',
            },
        });

    } catch (error: any) {
        console.error("Proxy Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
