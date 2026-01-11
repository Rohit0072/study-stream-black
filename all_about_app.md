# Study Stream - Application Overview & Rebuild Plan

## 1. Application Description
**Study Stream** is a focused, offline-first educational video player and course management desktop application designed to provide a distraction-free learning environment. It allows users to organize local video courses, track their progress, take time-synced notes, and leverage AI for enhanced learning.

### Core Features (To Be Rebuilt):
*   **Course Library Management:**
    *   Scan local directories to automatically organize learning materials into Courses > Sections > Videos.
    *   Visual progress tracking for each course and individual video.
*   **Advanced Video Player:**
    *   Custom-built video controls (Play/Pause, Seek, Volume, Speed).
    *   **Subtitle Support:** Automatic detection and parsing of .srt and .vtt files.
    *   **Resume Playback:** "Continue where you left off" functionality for every video.
    *   **Auto-Play:** Seamless transition to the next video in the playlist.
*   **Smart Note-Taking:**
    *   Markdown-supported notes panel.
    *   **Time-Sync:** Notes are linked to specific timestamps in the video. Clicking a note seeks the video to that moment.
*   **AI Integration (Gemini):**
    *   **Contextual Help:** Ask questions about the current video content (via subtitles).
    *   **Quiz Generation:** Auto-generate quizzes based on the video context to test understanding.
*   **Productivity Tools:**
    *   Study Session Timer & Analytics (Track total watch time).
    *   Bookmarks for important video moments.

## 2. New Technology Stack
We will transition from the legacy React/Vite structure to a robust, modern framework:
*   **Framework:** **Next.js** (App Router) - For better server/client component separation, routing, and optimization.
*   **Runtime:** **Electron** - To maintain local file system access (essential for reading local video files and saving notes).
*   **Styling:** **Tailwind CSS** - For rapid, utility-first styling.
*   **State Management:** **Zustand** - For a simpler, less boilerplate-heavy global state (replacing complex React Context/Reducers).
*   **Database/Storage:** **Electron-Store** (or a local SQLite DB) - For persistent user data (progress, notes, settings).

## 3. Design Philosophy: "Modern Monochrome"
The UI will be completely overhauled to match the **Vercel / Next.js aesthetic**:
*   **Palette:** Strict Black & White theme. High contrast.
    *   Backgrounds: `#000000` (Pure Black) or `#0A0A0A` (Soft Black).
    *   Borders: Subtle greys (`#333`) for separation.
    *   Accents: While monochrome is key, a single functional color (e.g., White or a very subtle Electric Blue) will be used *only* for active states/interactions.
*   **Typography:** Inter or Geist Mono. Clean, sans-serif, highly readable.
*   **Layout:** Bently-grid style or minimalist split-panes. Glassmorphism will be removed in favor of solid, opaque, clean surfaces for better performance and readability.

## 4. Software Development Model: Agile with Component-Driven Development (CDD)
We will follow an **Iterative Agile** approach combined with **Component-Driven Development**.

**Why this model?**
Since we are aiming for a specific "UI feel" (Modern Black/White) and rebuilding known features, CDD allows us to build and perfect the visual "lego blocks" (buttons, cards, player controls) in isolation before assembling them into complex pages. This ensures the design system is consistent from day one.

### Phases:
1.  **Foundation:** Setup Next.js + Electron + Tailwind. Define the Design System (Tokens, Typography, Layouts).
2.  **Core Components (The UI Kit):** Build the "Atomic" elements (Buttons, Inputs, Video Player Frame, Sidebar Items) in the new Vercel-style.
3.  **Feature Implementation (Iterative):**
    *   *Sprint 1:* Library & File Scanning.
    *   *Sprint 2:* Video Player & Playback Logic.
    *   *Sprint 3:* Notes & Data Persistence.
    *   *Sprint 4:* AI Features.
4.  **Refinement:** Performance tuning and bug squashing.

---

> "We are not just rewriting code; we are re-engineering the learning experience."
