# Code Guide — How Everything Works

This is a personal walkthrough of every file in the project. Read this to understand how the code works, what each file does, and how they connect.

---

## How the App Runs (Big Picture)

You have **two servers** running at the same time:

```
Browser → http://localhost:3000 (Next.js frontend)
              ↓ HTTP requests
         http://localhost:8000 (FastAPI backend)
              ↓ reads/writes
         fireflies.db (SQLite database file)
```

- The **frontend** is a React app served by Next.js. It renders pages, handles clicks, and makes API calls.
- The **backend** is a Python FastAPI server. It receives API calls, reads/writes the database, and returns JSON.
- The **database** is a single file `fireflies.db` that stores everything (meetings, transcripts, action items, etc.)

---

## BACKEND — File-by-File

### `backend/app/main.py` — The Entry Point

This is the first file Python runs. It does 3 things:

1. **Creates the FastAPI app** — sets title, version, description
2. **Adds CORS** — allows the frontend (port 3000) to make requests to the backend (port 8000). Without this, the browser blocks cross-origin requests.
3. **Includes routers** — tells FastAPI which files handle which URL paths:
   - `meetings.router` → handles `/api/meetings/*`
   - `action_items.router` → handles `/api/action-items/*`
   - `users.router` → handles `/api/users/*` and `/api/participants`
4. **Creates tables** — `Base.metadata.create_all(bind=engine)` ensures all database tables exist when the server starts.

```
GET / → returns {"app": "Fireflies.ai Clone API"}
```

### `backend/app/db/session.py` — Database Connection

This file sets up the connection to SQLite:

- **DATABASE_URL** = `"sqlite:///./fireflies.db"` — points to the `fireflies.db` file in the backend folder
- **engine** = SQLAlchemy engine that manages connections
- **`PRAGMA foreign_keys=ON`** — SQLite has foreign keys OFF by default. This turns them ON so deleting a meeting cascades to delete its segments, summaries, etc.
- **`SessionLocal`** = factory that creates database sessions
- **`get_db()`** = a generator function used by FastAPI's dependency injection. Every API endpoint that needs database access calls `db: Session = Depends(get_db)`, which gives it a session that auto-closes when done.

**How dependency injection works:**
```python
# FastAPI sees "Depends(get_db)" and calls get_db() before running your function
@router.get("")
def get_meetings(db: Session = Depends(get_db)):
    meetings = db.query(Meeting).all()  # db is automatically provided
    return meetings
```

### `backend/app/models/base.py` — SQLAlchemy Base

Just one line:
```python
Base = declarative_base()
```
All ORM models inherit from this `Base` class. It gives them the ability to map to database tables.

### `backend/app/models/all_models.py` — Database Tables

This file defines 7 database tables as Python classes. Each class = one table, each class attribute = one column.

**The Models:**

1. **User** (`users` table)
   - `id`, `name`, `email`, `avatar_url`, `created_at`
   - Has many Meetings (one user can record many meetings)
   - `cascade="all, delete-orphan"` — deleting a user deletes all their meetings

2. **Participant** (`participants` table)
   - `id`, `name`, `email`
   - Many-to-many with Meetings (a participant can attend many meetings, a meeting has many participants)
   - Has many ActionItems (can be assigned tasks)

3. **Meeting** (`meetings` table)
   - `id`, `user_id` (FK → users), `title`, `date`, `duration_seconds`, `media_url`, `created_at`, `updated_at`
   - Has many TranscriptSegments (ordered by `sequence_order`)
   - Has one Summary (unique constraint — one summary per meeting)
   - Has many Topics (chapters, ordered by `sequence_order`)
   - Has many ActionItems
   - Many-to-many with Participants and Tags
   - ALL child relationships have `cascade="all, delete-orphan"` — deleting a meeting deletes everything

4. **TranscriptSegment** (`transcript_segments` table)
   - `id`, `meeting_id` (FK), `speaker_id` (FK → participants), `start_time_seconds`, `end_time_seconds`, `text`, `sequence_order`
   - `speaker` relationship → links to the Participant who said this line

5. **Summary** (`summaries` table)
   - `id`, `meeting_id` (unique FK), `overview_text`, `keywords` (JSON column — stores a list of strings), `generated_at`

6. **Topic** (`topics` table)
   - `id`, `meeting_id` (FK), `title`, `start_time_seconds`, `end_time_seconds`, `sequence_order`
   - Represents a "chapter" in the meeting (e.g., "Database Discussion", "Wrap-up")

7. **ActionItem** (`action_items` table)
   - `id`, `meeting_id` (FK), `text`, `assignee_id` (FK → participants, nullable), `is_complete`, `created_at`
   - `assignee` relationship → the Participant assigned to this task

8. **Tag** (`tags` table)
   - `id`, `name` (unique)
   - Many-to-many with Meetings

**Join Tables** (many-to-many):
- `meeting_participants` — connects meetings ↔ participants
- `meeting_tags` — connects meetings ↔ tags

**Key concept — cascade delete:**
When you delete Meeting #1, SQLAlchemy automatically deletes:
- All its TranscriptSegments
- Its Summary
- All its Topics
- All its ActionItems
- All its many-to-many relationships (meeting_participants, meeting_tags)
This prevents "orphan" rows in the database.

### `backend/app/schemas/all_schemas.py` — Request/Response Shapes

These Pydantic classes define what data the API accepts and returns. They're like TypeScript interfaces but for Python.

**Pattern:**
```python
class MeetingBase(BaseModel):      # Fields shared by create/update
    title: str
    date: datetime

class MeetingCreate(BaseModel):    # What the client sends when creating
    title: str
    date: Optional[datetime] = None
    transcript_text: Optional[str] = None

class MeetingResponse(MeetingBase):  # What the API returns
    id: int
    user_id: int
    participants: List[ParticipantResponse]
    emoji_summary: List[str] = []    # Computed on-the-fly, not stored in DB

class MeetingDetailResponse(MeetingResponse):  # Full detail (extends MeetingResponse)
    transcript_segments: List[TranscriptSegmentResponse]
    summary: Optional[SummaryResponse]
    topics: List[TopicResponse]
    action_items: List[ActionItemResponse]
```

**Why `from_attributes = Config`:** This tells Pydantic it can read from SQLAlchemy model instances (not just dictionaries). Without it, `return meeting` would fail.

**`emoji_summary` is NOT stored in the database** — it's computed dynamically by `build_emoji_summary()` in the meetings router and attached to the response.

### `backend/app/routers/meetings.py` — Meeting CRUD + Search

This is the biggest and most important file. It handles all `/api/meetings/*` endpoints.

**Critical: Route order matters!**

```python
@router.get("")                    # GET /api/meetings
@router.get("/search/global")      # GET /api/meetings/search/global  ← MUST be before /{id}
@router.get("/{id}")               # GET /api/meetings/1
@router.post("")                   # POST /api/meetings
@router.patch("/{id}")             # PATCH /api/meetings/1
@router.delete("/{id}")            # DELETE /api/meetings/1
@router.get("/{id}/transcript/search")  # GET /api/meetings/1/transcript/search
```

If `/search/global` were defined AFTER `/{id}`, then a request to `/search/global` would match `/{id}` with `id="search"`, causing a 422 error.

**`build_emoji_summary(meeting)` function:**
Computes 2-4 emoji bullet points for each meeting card:
- 🔎 + first topic title (or keywords)
- ✅ + action item count (with "X remaining" if incomplete)
- 👥 + participant count

**`get_meetings()` — List with filters:**
```python
# Supports these query params:
# ?search=sprint    → searches title, participant names, topic titles
# ?sort=oldest      → sorts by date ascending
# ?participant=1    → only meetings with participant ID 1
# ?date_from=...    → from date
# ?date_to=...      → to date
```
Uses SQLAlchemy ORM: `db.query(Meeting).filter(...).order_by(...)`. The search uses `ILIKE` (case-insensitive LIKE) with `%wildcard%` patterns.

**`global_search()` — Cross-meeting search:**
Searches ALL transcript segments across ALL meetings for a keyword. Returns:
```json
{
  "id": 1,
  "title": "Q3 Roadmap",
  "match_count": 3,
  "matches": ["first matching segment text", "second", "third"]
}
```
Groups results by meeting, counts matches per meeting, shows up to 3 matching segments.

**`create_meeting()` — The big one:**
1. Accepts multipart form data (title, date, transcript_text, file upload)
2. If no transcript text provided, uses a default mock conversation
3. Calls `generate_mock_meeting_data()` which does the heavy lifting:
   - Parses "Speaker: text" lines
   - Creates Participant records
   - Creates Meeting record
   - Creates TranscriptSegment records with calculated timestamps
   - Creates Summary, Topics, ActionItems
4. Overwrites duration/media_url if manually provided
5. Associates participants and tags
6. Returns full MeetingDetailResponse

**`search_transcript()` — Per-meeting search:**
Searches segments within one meeting. Returns matches with 2 segments of context before and after:
```json
{
  "segment": {"text": "matching segment", "speaker": {...}, "start_time_seconds": 45.2, ...},
  "context_before": [{"text": "..."}, {"text": "..."}],
  "context_after": [{"text": "..."}, {"text": "..."}]
}
```

### `backend/app/routers/action_items.py` — Action Item CRUD

Simple CRUD for the `action_items` table:

- `GET /api/action-items` — returns all action items, newest first
- `POST /api/action-items` — creates a new action item (validates assignee exists)
- `PATCH /api/action-items/{id}` — partial update (text, assignee_id, is_complete)
  - Special: pass `assignee_id: 0` to unassign (sets to NULL)
- `DELETE /api/action-items/{id}` — deletes

### `backend/app/routers/users.py` — Users & Participants

- `GET /api/participants` — returns all participants
- `GET /api/users/current` — returns the default user (id=1), auto-creates if missing

### `backend/app/services/generator.py` — Transcript Parser + Data Generator

This is the "brain" that turns raw text into structured database records.

**`parse_transcript_lines(transcript_text)`:**
Converts raw text like:
```
Sarah Chen: Hello everyone
Marcus Vance: Morning Sarah
```
Into a list of tuples: `[("Sarah Chen", "Hello everyone"), ("Marcus Vance", "Morning Sarah")]`

Uses regex to handle formats like:
- `Speaker: text`
- `[00:12] Speaker: text`
- `Speaker (00:12): text`

**`generate_mock_meeting_data(db, title, transcript_text, user_id)`:**

Step-by-step:
1. Parse transcript into (speaker, text) tuples
2. For each unique speaker name, create a Participant (or find existing one by name)
3. Create Meeting record with computed duration
4. Create TranscriptSegment records:
   - Calculates timestamps: `~2.5 words per second` (150 wpm)
   - Each segment gets `start_time_seconds` and `end_time_seconds`
   - Adds 1 second gap between segments
5. Extract keywords by matching against `COMMON_KEYWORDS` list (roadmap, database, frontend, etc.)
6. Generate AI summary text by checking for topic keywords:
   - If text contains "roadmap" or "sprint" → adds sprint alignment sentence
   - If text contains "database" or "api" → adds backend architecture sentence
   - If text contains "bug" or "testing" → adds QA sentence
7. Create Topics by dividing transcript into 3 equal chunks
8. Extract action items by matching patterns like "I will...", "please do...", "needs to..."
   - If no patterns found, creates 2 generic action items as fallback

### `backend/scripts/seed.py` — Database Seeder

Creates 5 realistic meetings with full data. Each meeting has:
- A realistic title (e.g., "Q3 Product Roadmap & Sprint Alignment")
- 2-3 participants
- 12-17 transcript segments with realistic dialogue
- A generated AI summary with keywords
- 3 topics/chapters
- 3-4 action items (some complete, some not)
- Tags (Engineering, Design, etc.)
- Placeholder audio URL from soundhelix.com

The script:
1. Clears all existing data
2. Creates the default user (Alex Sterling)
3. Creates 5 participants
4. Creates 6 tags
5. Creates 5 meetings with all their child records

---

## FRONTEND — File-by-File

### `frontend/app/layout.tsx` — Root Layout

The outermost wrapper. Every page goes inside this. Renders:
- `<Sidebar />` — fixed left sidebar
- `<Navbar />` — fixed top navigation
- `{children}` — the current page

### `frontend/app/page.tsx` — Home Page (Meeting Library)

The main page users see. This is a large file (~600 lines) that handles:

**State:**
- `meetings` — list of meetings from the API
- `loading` — shows shimmer skeleton while fetching
- `searchQuery` — text filter
- `sortBy` — newest/oldest/duration
- `selectedParticipant` — filter by participant
- `showAdvanced` — toggle advanced filters
- `activeTab` — All/Hosted/Shared quick filters
- `editingMeeting` — which meeting is being edited
- `showNewMeetingModal` — create modal visibility

**Data fetching:**
```typescript
useEffect(() => {
  const params = new URLSearchParams();
  if (searchQuery) params.set('search', searchQuery);
  if (sortBy) params.set('sort', sortBy);
  // ... etc
  fetch(`http://localhost:8000/api/meetings?${params}`)
    .then(res => res.json())
    .then(data => setMeetings(data));
}, [searchQuery, sortBy, selectedParticipant, dateFrom, dateTo]);
```

**Date grouping:**
Meetings are grouped into sections: "Today", "Yesterday", "Earlier this week", "Earlier". Uses `Date.now()` comparison.

**Card rendering:**
Each meeting card shows:
- Title
- Date/time + duration
- Participant avatars (colored circles with initials)
- Emoji summary bullets (from `build_emoji_summary` on the server)
- Tags as small pills
- 3-dot menu (edit/delete) on hover

**Animations:**
Cards use staggered `fadeInUp` animation with `animationDelay` based on index:
```typescript
style={{ animationDelay: `${index * 0.05}s` }}
```

### `frontend/app/meetings/[id]/page.tsx` — Meeting Detail Page

The core page. Two-panel layout matching real Fireflies Notepad.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Navbar (search, profile, notifications)            │
├────────────────────────┬────────────────────────────┤
│  Left Panel            │  Right Panel               │
│  (Transcript)          │  (Notes)                   │
│                        │                            │
│  Back button           │  AI Summary                │
│  Meeting title         │  Keywords                  │
│  Search                │  Topics                    │
│                        │  Action Items              │
│  ┌────────────────┐   │                            │
│  │ Transcript      │   │                            │
│  │ lines with      │   │                            │
│  │ speaker avatars │   │                            │
│  │ and timestamps  │   │                            │
│  └────────────────┘   │                            │
│                        │                            │
│  ┌────────────────┐   │                            │
│  │ Audio Player    │   │                            │
│  │ (at bottom)     │   │                            │
│  └────────────────┘   │                            │
└────────────────────────┴────────────────────────────┘
```

**Key features:**

1. **Transcript with speaker avatars:**
   - Each line shows a colored circle with the speaker's initial
   - Speaker name and timestamp
   - Click to seek audio to that timestamp

2. **Audio player at bottom:**
   - Play/pause button
   - Seek bar (range input)
   - Current time / total time display
   - Uses `media_url` from the meeting (placeholder MP3 from soundhelix.com)

3. **Transcript search:**
   - Calls `/api/meetings/{id}/transcript/search?q=...`
   - Highlights matching segments
   - Shows context (2 segments before/after)

4. **Action items (full CRUD):**
   - Checkbox to toggle completion
   - Add new action item with text input
   - Edit text inline
   - Delete with confirmation
   - Assignee pill shows who it's assigned to

5. **Export:**
   - "Export MD" → downloads transcript as Markdown file
   - "Export TXT" → downloads as plain text
   - Uses `Blob` + `URL.createObjectURL` + `<a>` click to trigger download

6. **Share:**
   - Copies meeting URL to clipboard
   - Shows toast notification "Link copied to clipboard"

7. **AskFred chat:**
   - Floating button opens a chat panel
   - Mock AI: keyword matching against transcript data
   - If you type "action items" → lists all action items
   - If you type a speaker name → says what they discussed
   - If you type a topic keyword → summarizes related content

### `frontend/app/tasks/page.tsx` — Tasks Page

Shows all action items across all meetings:

1. Fetches all meetings from `/api/meetings`
2. Flattens all action items into one list
3. Shows filter tabs: All / Pending / Completed
4. Each item shows: checkbox, text, assignee, meeting title (clickable link)
5. Toggle completion via PATCH to `/api/action-items/{id}`

### `frontend/app/notifications/page.tsx` — Notifications

Static page with hardcoded notification cards:
- Meeting summary ready
- Action item assigned
- Meeting processed

Has "Mark All Read" and "Clear All" buttons (client-side only, no backend persistence).

### `frontend/app/settings/page.tsx` — Settings

Cosmetic settings page with:
- Workspace name
- Language selector
- Timezone
- Auto-summary toggle
- AI model selection
- Save button (shows toast but doesn't persist)

### `frontend/app/globals.css` — All Styling

**CSS Variables** — centralized color/shadow/radius values:
```css
--ff-green: #00C389;           /* Primary green accent */
--ff-navy: #1a1f2e;            /* Dark sidebar */
--ff-bg: #f5f6fa;              /* Page background */
--ff-white: #ffffff;           /* Card backgrounds */
--ff-border: #e8eaed;          /* Border color */
--ff-transition: 0.18s ...;   /* Smooth transition timing */
```

**Fonts:**
- `@import url('https://fonts.googleapis.com/css2?family=DM+Sans...&family=Inter...')`
- All text uses Inter by default
- Headings (h1-h6) use DM Sans

**Animations** (defined as `@keyframes`):
- `fadeInUp` — elements rise from below with fade
- `scaleIn` — elements scale up from 96% to 100%
- `slideInRight` — toasts slide in from the right
- `shimmer` — loading skeleton gradient effect

**Global styles:**
- Custom scrollbar (thin, rounded)
- Green accent on checkboxes/range inputs
- Green focus ring on all interactive elements
- Smooth transitions on buttons, links, inputs, selects
- Green text selection highlight

### `frontend/components/Sidebar.tsx` — Left Navigation

220px dark sidebar with:

**Structure:**
```
┌──────────────┐
│ Logo/Icon    │
│              │
│ Search Bar   │  ← with ⌘K badge
│              │
│ ─── MAIN ── │
│ 🏠 Home      │  ← green dot when active
│ 📋 Tasks     │
│ 🔔 Notifs    │
│ ⚙️ Settings  │
│              │
│ ── MEETINGS ─│
│ 📁 All       │
│ 👤 Hosted    │
│ 👥 Shared    │
│              │
│ ── RESOURCES ─│
│ 📖 Help      │
│ 📄 Changelog │
│              │
│ ┌──────────┐ │
│ │New Meeting│ │  ← green CTA button
│ └──────────┘ │
└──────────────┘
```

**Navigation:**
- Uses `next/navigation` `usePathname()` to detect current route
- Adds green dot + green background to active item
- Uses `useRouter().push()` for navigation

**Workspace selector:**
- Dropdown at top showing "Alex Sterling's Workspace"
- Toggle arrow to open

### `frontend/components/Navbar.tsx` — Top Bar

Fixed 56px tall bar with:

**Left side:**
- Back button (only on meeting detail pages)
- Meeting title (on detail pages) or "Search meetings..." on other pages

**Right side:**
- Global search input with magnifying glass icon
  - Typing triggers fetch to `/api/meetings/search/global?q=...`
  - Results show as dropdown cards with match count
  - Click result → navigate to meeting detail
- Profile dropdown with avatar and name
- Notification bell with green dot indicator

### `frontend/components/NewMeetingModal.tsx` — Create Modal

Modal for creating a new meeting:

**Form fields:**
- Title (required)
- Date (optional)
- Transcript (textarea — paste "Speaker: text" format)

**Behavior:**
- Opens with `scaleIn` animation
- On submit → POST to `/api/meetings` with form data
- On success → toast "Meeting created!", refresh meeting list
- On error → toast error message
- Backdrop has blur effect

### `frontend/components/EditMeetingModal.tsx` — Edit Modal

Similar to create modal but for editing:
- Pre-populates with current title
- PATCH to `/api/meetings/{id}`
- Shows current participants as pills

### `frontend/components/Toast.tsx` — Toast Notifications

Reusable toast component:
- Types: success (green), info (blue), warning (yellow), error (red)
- Auto-dismisses after 3-5 seconds
- Slides in from the right
- Has close button
- Shows colored icon per type

### `frontend/types/index.ts` — TypeScript Interfaces

Defines the shape of all data objects:

```typescript
interface Meeting {
  id: number;
  title: string;
  date: string;               // ISO datetime string
  duration_seconds: number;
  participants: Participant[];
  tags: Tag[];
  emoji_summary: string[];    // ["🔎 Discussed...", "✅ Assigned 3 items..."]
}

interface MeetingDetail extends Meeting {
  transcript_segments: TranscriptSegment[];
  summary: Summary | null;    // null if no summary
  topics: Topic[];
  action_items: ActionItem[];
}
```

**Why two types?** The list endpoint (`/api/meetings`) returns lightweight `Meeting` objects (no transcript). The detail endpoint (`/api/meetings/{id}`) returns full `MeetingDetail` with everything.

---

## How Data Flows — Example Walkthrough

### Example 1: Loading the Home Page

```
1. Browser navigates to http://localhost:3000
2. Next.js renders app/page.tsx (Home)
3. useEffect() fires, calls fetch("http://localhost:8000/api/meetings")
4. FastAPI receives GET /api/meetings
5. meetings.py queries database: db.query(Meeting).all()
6. SQLAlchemy loads Meeting objects with eager-loaded relationships:
   - participants (via meeting_participants join table)
   - topics (ordered by sequence_order)
   - action_items (for emoji_summary computation)
   - tags (via meeting_tags join table)
7. build_emoji_summary() called for each meeting → adds emoji_summary list
8. JSON response returned to frontend
9. Frontend sets state: setMeetings(data)
10. React re-renders, date-groups meetings, shows cards with staggered animation
```

### Example 2: Creating a Meeting

```
1. User clicks "New Meeting" → modal opens
2. User types title + pastes transcript text
3. Frontend sends: POST http://localhost:8000/api/meetings
   Body (multipart/form-data):
     title: "Sprint Planning"
     transcript_text: "Alex: Let's plan sprint 5\nSarah: I'll handle the API\nAlex: I will write tests"
4. FastAPI create_meeting() receives the request
5. Calls generate_mock_meeting_data():
   a. parse_transcript_lines() → [("Alex", "Let's plan..."), ("Sarah", "I'll handle..."), ("Alex", "I will write tests")]
   b. Creates/finds Participants: Alex, Sarah
   c. Creates Meeting record with duration
   d. Creates 3 TranscriptSegments with timestamps (0s, 10s, 20s)
   e. Extracts keywords: ["Sprint", "Api", "Tests"]
   f. Generates summary: "This meeting focused on sprint planning..."
   g. Creates 1 Topic: "Meeting Kickoff"
   h. Extracts action items: "I'll handle the API" → Sarah, "I will write tests" → Alex
6. Returns MeetingDetailResponse JSON
7. Frontend shows toast "Meeting created!"
8. Refreshes meeting list → new meeting appears on home page
```

### Example 3: Playing Transcript + Seeking

```
1. User opens meeting detail page
2. Audio player shows at bottom of transcript panel
3. User clicks a transcript line at timestamp 45.2s
4. Frontend sets audio.currentTime = 45.2
5. Audio jumps to that position
6. As audio plays, frontend checks audio.currentTime every 100ms
7. Finds the transcript segment whose start/end range contains currentTime
8. Adds green highlight to that segment
9. Scrolls transcript to keep highlighted segment visible
```

### Example 4: Global Search

```
1. User types "database" in navbar search input
2. After 300ms debounce, frontend calls GET /api/meetings/search/global?q=database
3. Backend searches ALL transcript_segments WHERE text ILIKE '%database%'
4. Groups results by meeting_id
5. Returns:
   [
     { id: 1, title: "Q3 Roadmap", match_count: 3, matches: ["We are setting up SQLite...", ...] },
     { id: 2, title: "Database Migration", match_count: 5, matches: ["SQLite migration patterns...", ...] }
   ]
6. Frontend shows dropdown with matching meetings
7. User clicks result → navigates to /meetings/2
```

---

## Key Concepts to Understand

### 1. FastAPI Dependency Injection

```python
def get_db():
    db = SessionLocal()
    try:
        yield db        # ← gives the database session
    finally:
        db.close()      # ← always closes, even if error occurs

@router.get("")
def get_meetings(db: Session = Depends(get_db)):
    # db is automatically injected by FastAPI
    return db.query(Meeting).all()
```

### 2. SQLAlchemy Relationships

```python
# In Meeting model:
transcript_segments = relationship("TranscriptSegment", cascade="all, delete-orphan")

# This means:
meeting = db.query(Meeting).first()
meeting.transcript_segments  # → list of TranscriptSegment objects
# Deleting meeting auto-deletes all its segments
```

### 3. Pydantic ↔ SQLAlchemy

```python
# Pydantic validates input/output
class MeetingCreate(BaseModel):
    title: str

# SQLAlchemy models store in database
class Meeting(Base):
    __tablename__ = "meetings"
    title = Column(String)

# FastAPI converts between them:
@router.post("", response_model=MeetingDetailResponse)  # ← response_model tells FastAPI to validate output
def create_meeting(..., db: Session = Depends(get_db)):
    meeting = Meeting(title="...")   # SQLAlchemy model
    db.add(meeting)
    db.commit()
    return meeting  # ← FastAPI auto-converts to MeetingDetailResponse JSON
```

### 4. Frontend State + API Calls

```typescript
const [meetings, setMeetings] = useState<Meeting[]>([]);

useEffect(() => {
  fetch("http://localhost:8000/api/meetings")
    .then(res => res.json())
    .then(data => setMeetings(data));  // ← triggers re-render
}, []);  // ← empty deps = runs once on mount

return (
  <div>
    {meetings.map(m => <MeetingCard key={m.id} meeting={m} />)}
  </div>
);
```

### 5. Route Shadowing (Critical Bug We Fixed)

```python
# WRONG ORDER — /search/global never matches:
@router.get("/{id}")               # ← catches /search/global (id="search")
@router.get("/search/global")      # ← unreachable!

# CORRECT ORDER — /search/global matches first:
@router.get("/search/global")      # ← matches /search/global
@router.get("/{id}")               # ← only catches /1, /2, etc.
```

FastAPI matches routes top-to-bottom. More specific routes must come before parameterized routes.

---

## Environment Variables / Configuration

There are no `.env` files. Everything is hardcoded for simplicity:

- **Backend port**: 8000 (in uvicorn command)
- **Frontend port**: 3000 (Next.js default)
- **Database**: `fireflies.db` in backend root
- **CORS origins**: `http://localhost:3000`, `http://127.0.0.1:3000`
- **Default user ID**: 1
- **Audio placeholder**: soundhelix.com MP3 files
