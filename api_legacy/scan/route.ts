import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force dynamic to allow fs usage at runtime
export const dynamic = 'force-dynamic';

interface Video {
    id: string;
    name: string;
    path: string;
    completed: boolean;
    progress: number;
    subtitles?: {
        path: string;
        lang: string;
        label: string;
    }[];
}

interface Section {
    id: string;
    name: string;
    path: string;
    videos: Video[];
}

interface Course {
    id: string;
    name: string;
    path: string;
    sections: Section[];
    totalVideos: number;
    completedVideos: number;
}

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm'];
const SUBTITLE_EXTENSIONS = ['.srt', '.vtt'];


const LANG_MAP: Record<string, string> = {
    'english': 'en', 'eng': 'en', 'en': 'en',
    'spanish': 'es', 'esp': 'es', 'es': 'es',
    'french': 'fr', 'fre': 'fr', 'fr': 'fr',
    'german': 'de', 'deu': 'de', 'de': 'de',
    'italian': 'it', 'ita': 'it', 'it': 'it',
    'portuguese': 'pt', 'por': 'pt', 'pt': 'pt',
    'russian': 'ru', 'rus': 'ru', 'ru': 'ru',
    'chinese': 'zh', 'chi': 'zh', 'zh': 'zh',
    'japanese': 'ja', 'jpn': 'ja', 'ja': 'ja',
    'korean': 'ko', 'kor': 'ko', 'ko': 'ko',
    'bulgarian': 'bg',
    'czech': 'cs',
    'danish': 'da',
    'dutch': 'nl',
    'finnish': 'fi',
    'greek': 'el',
    'hungarian': 'hu',
    'indonesian': 'id',
    'norwegian': 'no',
    'polish': 'pl',
    'romanian': 'ro',
    'swedish': 'sv',
    'thai': 'th',
    'turkish': 'tr',
    'ukrainian': 'uk',
    'vietnamese': 'vi'
};

function getSubtitles(dirPath: string, videoName: string): { path: string; lang: string; label: string }[] {
    const subtitles: { path: string; lang: string; label: string }[] = [];
    const baseName = path.parse(videoName).name;
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    items.forEach(item => {
        if (!item.isFile()) return;
        const ext = path.extname(item.name).toLowerCase();
        if (!SUBTITLE_EXTENSIONS.includes(ext)) return;

        // Check if subtitle filename starts with video basename
        if (item.name.startsWith(baseName)) {
            const subBaseName = path.parse(item.name).name;
            let suffix = subBaseName.substring(baseName.length);

            // Clean up separators
            const cleanSuffix = suffix.replace(/^[\s._\-]+/, '').trim();

            let label = 'Unknown';
            let lang = 'en';

            if (cleanSuffix) {
                label = cleanSuffix.charAt(0).toUpperCase() + cleanSuffix.slice(1);
                lang = LANG_MAP[cleanSuffix.toLowerCase()] || 'en';
            } else {
                label = 'Default';
            }

            subtitles.push({
                path: path.join(dirPath, item.name),
                lang,
                label
            });
        }
    });

    return subtitles;
}

function scanDirectory(dirPath: string): { sections: Section[], totalVideos: number } {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    const sections: Section[] = [];
    let totalVideos = 0;

    // First, look for videos in the root (default section)
    const rootVideos: Video[] = [];
    items.forEach(item => {
        if (item.isFile() && VIDEO_EXTENSIONS.includes(path.extname(item.name).toLowerCase())) {
            rootVideos.push({
                id: item.name, // simple ID
                name: path.parse(item.name).name,
                path: path.join(dirPath, item.name),
                completed: false,
                progress: 0,
                subtitles: getSubtitles(dirPath, item.name)
            });
            totalVideos++;
        }
    });

    if (rootVideos.length > 0) {
        sections.push({
            id: 'root-section',
            name: 'Overview',
            path: dirPath,
            videos: rootVideos
        });
    }

    // Then look for subdirectories (sections)
    items.filter(item => item.isDirectory()).forEach(dir => {
        const sectionPath = path.join(dirPath, dir.name);
        // Shallow scan for videos in this section
        const sectionItems = fs.readdirSync(sectionPath, { withFileTypes: true });
        const videos: Video[] = [];

        sectionItems.forEach(item => {
            if (item.isFile() && VIDEO_EXTENSIONS.includes(path.extname(item.name).toLowerCase())) {
                videos.push({
                    id: path.join(dir.name, item.name), // relative path as ID
                    name: path.parse(item.name).name,
                    path: path.join(sectionPath, item.name),
                    completed: false,
                    progress: 0,
                    subtitles: getSubtitles(sectionPath, item.name)
                });
                totalVideos++;
            }
        });

        if (videos.length > 0) {
            sections.push({
                id: dir.name,
                name: dir.name,
                path: sectionPath,
                videos: videos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
            });
        }
    });

    return {
        sections: sections.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
        totalVideos
    };
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const dirPath = searchParams.get('path');

    if (!dirPath) {
        return new NextResponse('Missing path param', { status: 400 });
    }

    // Decode path
    const decodedPath = decodeURIComponent(dirPath);

    if (!fs.existsSync(decodedPath)) {
        return new NextResponse('Path not found', { status: 404 });
    }

    try {
        const { sections, totalVideos } = scanDirectory(decodedPath);

        const course: Course = {
            id: 'real-path-test',
            name: path.basename(decodedPath),
            path: decodedPath,
            sections,
            totalVideos,
            completedVideos: 0,
        };

        return NextResponse.json(course);
    } catch (error) {
        console.error('[API Scan] Error:', error);
        return new NextResponse('Failed to scan directory', { status: 500 });
    }
}
