import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Use a standard fetch, passing the JSON body directly
        const response = await fetch("https://raphael.app/api/generate-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Origin": "https://raphael.app",
                "Referer": "https://raphael.app/"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const text = await response.text();
            return NextResponse.json(
                { error: `Raphael API Error: ${response.status} ${response.statusText}`, details: text },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Proxy Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
