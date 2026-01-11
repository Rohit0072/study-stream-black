import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');

    if (!filePath) {
        return new NextResponse('Missing file path', { status: 400 });
    }

    // Decode the path if it was encoded
    const decodedPath = decodeURIComponent(filePath);

    // SECURITY: In a real app, you MUST sanitize this path to prevents traversal attacks.
    // For this local personal app, we assume trust.

    if (!fs.existsSync(decodedPath)) {
        console.error(`[API Stream] File not found: ${decodedPath}`);
        return new NextResponse('File not found', { status: 404 });
    }

    try {
        const stats = await stat(decodedPath);
        const fileSize = stats.size;
        const range = request.headers.get('range');

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(decodedPath, { start, end });

            const headers = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize.toString(),
                'Content-Type': 'video/mp4',
            };

            // @ts-ignore: Next.js Stream support is partial in types
            return new NextResponse(file, { status: 206, headers });
        } else {
            const headers = {
                'Content-Length': fileSize.toString(),
                'Content-Type': 'video/mp4',
            };
            const file = fs.createReadStream(decodedPath);
            // @ts-ignore
            return new NextResponse(file, { status: 200, headers });
        }
    } catch (error) {
        console.error('[API Stream] Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
