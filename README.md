# Fireflies.ai Clone — Meeting Assistant Web App

A fully functional clone of [Fireflies.ai](https://fireflies.ai), replicating its dashboard design, post-meeting workflows, interactive transcript playback, AI summary generation, action item tracking, bookmarks, comments, soundbites, and the AskFred chat assistant.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Backend Walkthrough](#backend-walkthrough)
- [Styling & Design System](#styling--design-system)
- [Assumptions](#assumptions)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1        # Windows PowerShell
pip install -r requirements.txt
python -m app.seed                  # Seeds 6 meetings with full transcripts
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev

# 3. Open http://localhost:3000
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16+ (App Router) + TypeScript | File-based routing, type safety, fast dev server |
| **Styling** | Tailwind CSS v4 + inline styles | Utility-first + fine-grained control matching Fireflies' design |
| **Icons** | Lucide React | Modern, consistent iconography |
| **Fonts** | DM Sans (headings) + Inter (body/transcript) | Matches real Fireflies font pairing |
| **Backend** | FastAPI (Python) | Async, auto-generates Swagger docs at `/docs` |
| **Database** | SQLite + SQLAlchemy ORM | Zero-config file persistence |
| **Validation** | Pydantic v2 | Request/response schema validation |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Home     │  │ Meetings │  │ Notepad  │  │ Tasks  │ │
│  │ Dashboard │  │  Library │  │  Detail  │  │  Page  │ │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └───┬────┘ │
│        │              │              │            │      │
│        └──────────────┴──────────────┴────────────┘     │
│                         │ fetch()                       │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTP (localhost:8000)
┌─────────────────────────┼───────────────────────────────┐
│                    BACKEND (FastAPI)                      │
│                         │                                │
│  ┌──────────────────────┴───────────────────────────┐   │
│  │                  API Routers                      │   │
│  │  meetings  action-items  bookmarks  comments     │   │
│  │  soundbites  users                             │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│  ┌──────────────────────┴───────────────────────────┐   │
│  │              SQLAlchemy ORM Models                │   │
│  │  User  Participant  Meeting  TranscriptSegment   │   │
│  │  Summary  Topic  ActionItem  Tag                 │   │
│  │  Bookmark  Comment  Soundbite                    │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│  ┌──────────────────────┴───────────────────────────┐   │
│  │              SQLite Database (fireflies.db)       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. Frontend fetches data from FastAPI REST endpoints
2. FastAPI routes delegate to SQLAlchemy ORM for database operations
3. The seed script populates the database with 6 realistic meetings, each with full transcripts, summaries, topics, action items, bookmarks, comments, and soundbites
4. The transcript generator service parses raw text into structured segments with timestamps

---

## Project Structure

```
fireflies-clone/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, router registration
│   │   ├── seed.py                  # Database seed script (6 meetings)
│   │   ├── db/
│   │   │   └── session.py           # SQLAlchemy engine, session factory
│   │   ├── models/
│   │   │   ├── base.py              # SQLAlchemy Base declarative class
│   │   │   └── all_models.py        # 10 ORM models
│   │   ├── schemas/
│   │   │   └── all_schemas.py       # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── meetings.py          # Meeting CRUD + search
│   │   │   ├── action_items.py      # Action item CRUD
│   │   │   ├── bookmarks.py         # Bookmark CRUD
│   │   │   ├── comments.py          # Comment CRUD
│   │   │   ├── soundbites.py        # Soundbite CRUD
│   │   │   └── users.py             # User + participant endpoints
│   │   └── services/
│   │       └── generator.py         # Transcript parser + DB record generator
│   ├── fireflies.db                 # SQLite database (auto-created)
│   ├── requirements.txt
│   └── venv/
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Meetings library (card grid)
│   │   ├── globals.css              # CSS variables, animations
│   │   ├── home/page.tsx            # Dashboard with stats
│   │   ├── meetings/[id]/page.tsx   # Meeting notepad (two-panel)
│   │   ├── tasks/page.tsx           # Cross-meeting action items
│   │   ├── notifications/page.tsx   # Notification center
│   │   ├── settings/page.tsx        # Workspace settings
│   │   └── features/page.tsx        # "Coming Soon" placeholder
│   ├── components/
│   │   ├── Sidebar.tsx              # Dark navy sidebar navigation
│   │   ├── Navbar.tsx               # Top bar with bell, profile
│   │   ├── NewMeetingModal.tsx      # Create meeting modal
│   │   ├── EditMeetingModal.tsx     # Edit meeting modal
│   │   └── Toast.tsx                # Toast notification system
│   ├── types/index.ts               # TypeScript interfaces
│   ├── package.json
│   └── next.config.ts
│
└── README.md
```

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────┐       ┌──────────────────┐       ┌───────────────────┐
│  users   │──1:N──│    meetings      │──N:N──│   participants    │
└──────────┘       └──────────────────┘       └───────────────────┘
                        │  │  │  │  │  │
                   1:1  │  │  │  │  │  │  1:N
                        │  │  │  │  │  │
          ┌─────────────┘  │  │  │  │  └──────────────┐
          ▼                │  │  │  │                  ▼
   ┌────────────┐          │  │  │  │         ┌──────────────┐
   │ summaries  │          │  │  │  │         │ soundbites   │
   └────────────┘          │  │  │  │         └──────────────┘
                           │  │  │  │
              ┌────────────┘  │  │  └────────────┐
              ▼               │  │                ▼
       ┌───────────┐          │  │         ┌───────────┐
       │  topics   │          │  │         │ bookmarks │
       └───────────┘          │  │         └───────────┘
                              │  │
                 ┌────────────┘  └────────────┐
                 ▼                            ▼
          ┌──────────────┐            ┌───────────┐
          │ action_items │            │ comments  │
          └──────────────┘            └───────────┘
                 │ N:1
                 ▼
          ┌──────────────┐      ┌──────────┐
          │ participants │      │   tags   │──N:N── meetings
          └──────────────┘      └──────────┘
```

### Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `users` | App users | id, name, email, avatar_url |
| `participants` | Meeting attendees | id, name, email |
| `meetings` | Meeting records | id, user_id (FK→users), title, date, duration_seconds |
| `meeting_participants` | M2M join table | meeting_id, participant_id |
| `transcript_segments` | Individual spoken lines | id, meeting_id, speaker_id (FK→participants), start/end_time, text, sequence_order |
| `summaries` | AI-generated overview | id, meeting_id (unique), overview_text, keywords (JSON array) |
| `topics` | Chapter/timestamp markers | id, meeting_id, title, start/end_time, sequence_order |
| `action_items` | Tasks from meetings | id, meeting_id, text, assignee_id (FK→participants), is_complete |
| `tags` | Category labels | id, name (unique) |
| `meeting_tags` | M2M join table | meeting_id, tag_id |
| `bookmarks` | Saved timestamps | id, meeting_id, timestamp_seconds, note |
| `comments` | Timestamped notes | id, meeting_id, author_name, text, timestamp_seconds |
| `soundbites` | Audio clips | id, meeting_id, title, from_seconds, to_seconds, speaker_name |

### Cascade Rules

- Deleting a **meeting** cascade-deletes: transcript_segments, summaries, topics, action_items, bookmarks, comments, soundbites
- Deleting a **participant** sets action_item.assignee_id to NULL
- SQLite foreign keys enforced via `PRAGMA foreign_keys=ON`

---

## API Reference

All endpoints are prefixed with `/api`. Interactive docs at `http://localhost:8000/docs`.

### Meetings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/meetings` | List meetings (supports `search`, `sort`, `participant`, `date_from`, `date_to`) |
| `GET` | `/api/meetings/search/global` | Search all transcripts (`?q=keyword`) |
| `GET` | `/api/meetings/{id}` | Full meeting detail with transcript, summary, topics, action items, bookmarks, comments, soundbites |
| `GET` | `/api/meetings/{id}/transcript/search` | Search within one meeting (`?q=keyword`) |
| `POST` | `/api/meetings` | Create meeting (multipart: `title`, `date`, `transcript_text`, `file`) |
| `PATCH` | `/api/meetings/{id}` | Update title, participants, tags |
| `DELETE` | `/api/meetings/{id}` | Delete meeting + all children |

### Action Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/action-items` | List all |
| `POST` | `/api/action-items` | Create: `{meeting_id, text, assignee_id?, is_complete?}` |
| `PATCH` | `/api/action-items/{id}` | Partial update |
| `DELETE` | `/api/action-items/{id}` | Delete |

### Bookmarks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bookmarks` | List bookmarks (optional `?meeting_id=`) |
| `POST` | `/api/bookmarks` | Create: `{meeting_id, timestamp_seconds, note?}` |
| `DELETE` | `/api/bookmarks/{id}` | Delete |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/comments` | List comments (optional `?meeting_id=`) |
| `POST` | `/api/comments` | Create: `{meeting_id, author_name, text, timestamp_seconds?}` |
| `DELETE` | `/api/comments/{id}` | Delete |

### Soundbites

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/soundbites` | List soundbites (optional `?meeting_id=`) |
| `POST` | `/api/soundbites` | Create: `{meeting_id, title, from_seconds, to_seconds, speaker_name?}` |
| `DELETE` | `/api/soundbites/{id}` | Delete |

### Users & Participants

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/current` | Get default user |
| `GET` | `/api/participants` | List all participants |

---

## Frontend Pages

### Home Dashboard (`/home`)
- Stats cards: total meetings, total hours, meetings this week, unique participants
- Recent meetings list with participant avatars and time-ago labels
- Quick actions (New Meeting, Browse Meetings, View Tasks)
- Top participants with bar chart visualization

### Meetings Library (`/`)
- Card-based grid layout (responsive, 320px+ per card)
- Date-grouped sections: Today, Yesterday, This Week, This Month
- Quick filter tabs: All Meetings, Starred, Hosted by Me, Shared with Me
- Advanced filters: speaker dropdown, date range, sort order
- Star/favorite toggle (persisted to localStorage)
- Real-time search across titles, speakers, and topics

### Meeting Notepad (`/meetings/[id]`)
Two-panel layout matching real Fireflies Notepad:

**Left Panel — Transcript:**
- Speaker avatars (colored initials) with timestamps
- Full-text transcript with search highlighting
- Audio player with play/pause, seek bar, time display

**Right Panel — Notes:**
- AI Summary with overview text and keyword pills
- Topics/chapters with clickable timestamps
- Action items with checkboxes
- Bookmarks, Comments, Soundbites (CRUD panels)

**Left Tool Strip:**
- Notes, AskFred, Bookmarks, Comments, Soundbites buttons
- Each toggles a panel on the right side

### Tasks (`/tasks`)
- All action items across all meetings
- Filter: All / Pending / Completed
- Create new tasks by selecting a meeting and entering description
- Toggle completion status (persisted to backend)

### Notifications (`/notifications`)
- Dynamic notifications generated from real meeting data
- Clickable notifications link to meeting transcripts
- Unread badge count on the bell icon
- Mark all read / Clear all

### Settings (`/settings`)
- Profile section (display name, company) persisted to localStorage
- Meeting join preferences (auto-join all, hosted only, manual)
- Transcription language selection
- Email recap settings
- AskFred AI toggle

---

## Backend Walkthrough

### Seed Script (`app/seed.py`)

Creates 6 realistic meetings with complete data:

| # | Title | Participants | Topics |
|---|-------|-------------|--------|
| 1 | Q3 Product Roadmap & Sprint Alignment | Alex, Sarah, Marcus, Priya, James, Emily | Roadmap, AI summaries, marketplace, performance |
| 2 | Sprint 14 Retrospective | Marcus, Priya, David, Rachel | Wins, code review, testing, demo day |
| 3 | Customer Success Review — Enterprise | Alex, Emily, James, Rachel, Priya | Retention, NPS, onboarding, sales pipeline |
| 4 | Marketing Campaign Planning — Fall Launch | Alex, James, Sarah, Emily, Priya, Rachel | Countdown series, conference, webinars, budget |
| 5 | Weekly Engineering Standup | Marcus, David, Rachel, Priya, Alex | Redis caching, API docs, code freeze |
| 6 | Design System Review | Alex, Priya, Sarah, Marcus, David, Emily | Components, tokens, Storybook, meeting cards |

Each meeting includes: 10-16 transcript segments with realistic dialogue, AI summary, keywords, 3-6 topics, 3-5 action items, bookmarks, comments, and soundbites.

### Transcript Generator (`app/services/generator.py`)

The `generate_mock_meeting_data()` function:
1. Parses raw text into `(speaker_name, text)` tuples via regex
2. Creates/finds Participant records for unique speakers
3. Creates Meeting with computed duration (~2.5 words/second)
4. Creates TranscriptSegment records with calculated timestamps
5. Extracts keywords by matching against common terms
6. Generates summary text based on detected topic keywords
7. Creates Topic/chapter records dividing transcript into sections
8. Extracts action items using regex patterns

### Meeting Router (`app/routers/meetings.py`)

- `build_emoji_summary()` — Generates 2-4 emoji bullet points for card display
- Route order is critical: `/search/global` must be before `/{id}`
- Full-text search via SQLAlchemy `ILIKE` with participant/topic joins

---

## Styling & Design System

### CSS Variables (`globals.css`)

```css
--ff-green: #00C389;          /* Primary accent (Fireflies green) */
--ff-navy: #1a1f2e;           /* Dark navy */
--ff-bg: #f5f6fa;             /* Page background */
--ff-white: #ffffff;          /* Cards/panels */
--ff-border: #e8eaed;         /* Borders */
--ff-text: #1a1f2e;           /* Primary text */
--ff-text-2: #4a5568;         /* Secondary text */
--ff-text-3: #8b92a5;         /* Muted text */
```

### Sidebar

Dark navy background (#141821) with:
- Green left border accent on active items
- Subtle hover states with rgba white overlays
- Section dividers between primary and secondary nav
- User avatar with online status indicator

### Meeting Cards

- White background with subtle border
- Hover: lift effect (translateY(-2px)), shadow, border color change
- Footer: participant avatars + tag pills on gray background
- Star/favorite toggle with amber fill

### Animations

| Animation | Effect |
|-----------|--------|
| `fadeInUp` | Cards appear from below |
| `scaleIn` | Modals pop in |
| `shimmer` | Loading skeleton effect |
| `pulse` | "Coming Soon" badge dot |
| `spin` | Loading spinners |

### Fonts

- **DM Sans** — Headings (h1-h6), meeting titles, sidebar logo
- **Inter** — Body text, transcript, buttons, form labels

---

## Assumptions

1. **No authentication** — Hardcoded user "Alex Sterling" (ID=1) for simplicity. In production, this would be replaced with OAuth/JWT.
2. **Mock AI** — Summaries are template-based, not real LLM-generated. AskFred uses keyword matching against transcript data.
3. **SQLite** — File-based database suitable for demo. Production would use PostgreSQL.
4. **No real audio/video** — The media player is a UI placeholder. The `media_url` field exists in the schema but no file upload/storage is implemented.
5. **Settings persistence** — Frontend settings (dark mode, profile) persist to `localStorage`, not the backend.
6. **Notifications** — Generated dynamically from meeting data, not stored in the database.
7. **Transcription mocked** — All transcript data is seeded from realistic mock content. No actual speech-to-text processing.
8. **Single user** — No team/collaboration features. All data belongs to one default user.
9. **Deployment** — Frontend on Vercel, backend on Render (free tier). Render free tier spins down after inactivity — first request may take ~30s.

---

## Troubleshooting

### Backend won't start
```bash
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend shows no data / CORS errors
1. Ensure backend is running on port 8000
2. Check `http://localhost:8000/api/meetings` returns data
3. Restart frontend after backend is up

### Database is empty
```bash
cd backend
python -m app.seed    # Resets and re-seeds 6 meetings
```

### Port already in use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Build errors
```bash
cd frontend
npx next build    # Check for TypeScript errors
```

---

## License

This is a demo/educational project. Not affiliated with Fireflies.ai.
