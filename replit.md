# NoteNinja

## Overview
NoteNinja ("Be Sneaky Smart") is an AI-powered study app that generates comprehensive study notes and practice study guides with answer keys. Users can create free accounts via email, specify a subject, description, number of pages (1-250), note style (bullet points or tightly packed paragraphs), and optionally include resources (practice tests, study guides, etc.) that the AI analyzes to enrich the notes. Notes can be organized into nested folders. Users can generate study guides from any completed notes (with separate questions and answer key), refine notes via AI chat, and export everything. Free downloadable content packs are available (e.g., Middle School Math, Social Studies, Science Olympiad 2026, etc.).

## Recent Changes
- 2026-03-03: Renamed app from "StudyKit AI" to "NoteNinja" with tagline "Be Sneaky Smart"
- 2026-03-03: Admin dashboard redesigned with time period tabs (This Week, This Month, This Year, All Time) and expandable cards
- 2026-03-03: Each section has detailed Mon–Sun bar chart, activity timeline, activity breakdown, topics, packs, grades, note styles
- 2026-03-03: Weekly email report changed to Sunday at 11:00 PM EST; removed unique visitors stat
- 2026-03-03: Admin can manually send weekly report from dashboard (POST /api/admin/send-weekly-email)
- 2026-03-03: Added admin dashboard (/admin) with analytics: users, notes, daily activity chart, top subjects, pack downloads, grade distribution
- 2026-03-03: Admin dashboard only accessible by Ahmedsopori@gmail.com; admin check endpoint (GET /api/admin/check)
- 2026-03-03: Added analytics_events table for tracking page views, note creation, study guide/quiz generation, pack downloads, note refinement
- 2026-03-03: Added seed example data endpoint (POST /api/admin/seed-example) for previewing dashboard with sample data
- 2026-03-03: AI now embeds real images from Wikipedia in generated notes (searchWikipediaImages function)
- 2026-03-03: AI uses Wikipedia research to improve note accuracy and completeness (searchWikipediaContext function)
- 2026-03-03: Improved AI prompt for specificity — requires specific names, formulas, classifications instead of generic summaries
- 2026-03-03: Added image styling to notes view (rounded, shadow, centered, max-width)
- 2026-03-03: Updated landing page with soccer players example, quiz feature cards, grade level card
- 2026-02-28: Added AI welcome tip on home page (GET /api/ai-tip, dismissable per session)
- 2026-02-28: Redesigned downloads page as compact grid (3-column) with smaller pack cards
- 2026-02-28: Made folder tiles more compact (smaller padding, 4-column grid on desktop)
- 2026-02-28: Added grade level selector to note creation (elementary, middle, high, college, graduate)
- 2026-02-28: AI now includes labeled diagrams/charts (ASCII art in code blocks, tables) in generated notes
- 2026-02-28: Added gradeLevel column to note_requests table
- 2026-02-22: Renamed app from "StudyNotes AI" to "StudyKit AI"
- 2026-02-22: Added AI study guide generator (creates questions + answer key from notes)
- 2026-02-22: Study guides exportable to Google Docs, Word, Text, Copy, Print/PDF
- 2026-02-22: Updated landing page description to mention study guides
- 2026-02-22: Added Study Guide Generator feature card to landing page
- 2026-02-22: Added Science Olympiad 2026 pack with all Division B & C events (49 notes)
- 2026-02-22: Added grade levels to Social Studies, General Science, ELA, CS packs
- 2026-02-22: Added Essential Formulas section to Mathcounts pack
- 2026-02-21: Added nested folder support (folders can contain sub-folders via parentId)
- 2026-02-21: Added free Downloads page with pre-built content packs
- 2026-02-21: Added note style selector (bullet points vs tightly packed paragraphs)
- 2026-02-21: Added follow-up AI to adjust/refine completed notes via chat interface
- 2026-02-21: Added export buttons (Google Docs, Word, Text, Copy, Print/PDF) to view-notes page
- 2026-02-20: Added user authentication (Replit Auth with email/Google/GitHub signup), per-user data isolation
- 2026-02-20: Added folders for organizing notes, increased page limit to 250
- 2026-02-20: Initial MVP built with note creation, AI generation, and viewing

## Tech Stack
- **Frontend**: React + Vite + TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)
- **Auth**: Replit Auth (OpenID Connect) - supports email, Google, GitHub, Apple
- **Routing**: wouter (client-side), Express (server-side)

## Project Architecture
```
client/src/
  pages/
    landing.tsx       - Landing page for unauthenticated users
    home.tsx          - Notes list page with nested folder organization (authenticated)
    create-notes.tsx  - Form to create new notes (with folder selection)
    view-notes.tsx    - View generated notes, study guide generator, export, follow-up AI
    downloads.tsx     - Free content packs download page
  hooks/
    use-auth.ts       - Authentication hook (useAuth)
  lib/
    auth-utils.ts     - Auth error handling utilities
  App.tsx             - Router setup with auth-based routing
server/
  routes.ts           - API endpoints + content pack definitions (CONTENT_PACKS)
  storage.ts          - Database storage interface
  db.ts               - Database connection
  replit_integrations/auth/ - Replit Auth module (OIDC, sessions, user storage)
shared/
  schema.ts           - Drizzle schema for noteRequests and folders tables
  models/auth.ts      - Auth schema (users, sessions tables)
```

## Key Features
- Free user accounts via email, Google, GitHub, or Apple sign-in
- Create notes with subject, description, page count (1-250), note style, optional resources
- AI generates comprehensive markdown notes using GPT-5.2
- Resources (practice tests, study guides, etc.) are analyzed to enrich notes
- AI study guide generator: creates practice questions with separate answer key from any completed notes
- Study guides exportable to Google Docs, Word, Text, Copy, Print/PDF
- Nested folder system: create, rename, delete folders with sub-folders; move notes between folders
- Free content packs (Middle School Math, Social Studies, Science Olympiad 2026, General Science, Mathcounts, ELA, Intro to CS) downloadable into user accounts
- Per-user data isolation (each user sees only their own notes/folders)
- Follow-up AI chat to adjust/refine completed notes
- Export notes to Google Docs, Word, Text, Copy, Print/PDF
- Polling for real-time status updates on home and view pages

## API Routes (all protected with authentication)
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/notes` - List user's notes
- `GET /api/notes/:id` - Get single note (ownership check)
- `POST /api/notes` - Create note (triggers async AI generation)
- `DELETE /api/notes/:id` - Delete note (ownership check)
- `PATCH /api/notes/:id/folder` - Move note to a folder (ownership check)
- `POST /api/notes/:id/refine` - Refine notes with AI follow-up instruction
- `POST /api/notes/:id/study-guide` - Generate study guide + answer key from completed notes
- `POST /api/notes/:id/quiz` - Generate quiz (MC, T/F, fill-blank, short answer) + answer key from completed notes
- `GET /api/folders` - List user's folders
- `POST /api/folders` - Create folder (supports parentId for nesting)
- `PATCH /api/folders/:id` - Rename folder (ownership check)
- `DELETE /api/folders/:id` - Delete folder recursively (ownership check)
- `GET /api/content-packs` - List available content packs
- `POST /api/content-packs/:packId/download` - Download content pack into user account

## Auth Routes (handled by Replit Auth module)
- `GET /api/login` - Begin login flow
- `GET /api/logout` - Begin logout flow
- `GET /api/callback` - OIDC callback

## Database Schema
- `users`: id (varchar, PK), email, first_name, last_name, profile_image_url, created_at, updated_at
- `sessions`: sid (varchar, PK), sess (jsonb), expire (timestamp)
- `folders`: id (serial), name, parent_id (nullable integer for nesting), user_id (varchar), created_at
- `note_requests`: id (serial), subject, description, page_count, note_style ("bullet"|"compact"), grade_level (nullable), resources (nullable), generated_content (nullable), simple_summary (nullable), status, folder_id (nullable), user_id (varchar), created_at
