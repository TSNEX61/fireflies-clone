import sys
import os
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal, engine
from app.models.base import Base
from app.models.all_models import User, Participant, Meeting, TranscriptSegment, Summary, Topic, ActionItem, Tag

# Create tables
Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    try:
        # Clear existing data
        db.query(ActionItem).delete()
        db.query(Topic).delete()
        db.query(Summary).delete()
        db.query(TranscriptSegment).delete()
        db.query(Participant).delete()
        db.query(Meeting).delete()
        db.query(Tag).delete()
        db.query(User).delete()
        db.commit()

        print("Cleared existing tables.")

        # 1. Create Default User
        user = User(
            id=1,
            name="Alex Sterling",
            email="alex.sterling@fireflies.ai",
            avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("Created default user.")

        # 2. Create Participants
        participants_data = [
            {"name": "Sarah Chen", "email": "sarah.chen@fireflies.ai"},
            {"name": "Marcus Vance", "email": "marcus.vance@fireflies.ai"},
            {"name": "Elena Rostova", "email": "elena.rostova@fireflies.ai"},
            {"name": "David Kross", "email": "david.kross@fireflies.ai"},
            {"name": "John Doe", "email": "john.doe@fireflies.ai"}
        ]
        
        participants = []
        for p_info in participants_data:
            p = Participant(name=p_info["name"], email=p_info["email"])
            db.add(p)
            participants.append(p)
        db.commit()
        print(f"Created {len(participants)} participants.")

        # 3. Create Tags
        tag_names = ["Sprint Sync", "Engineering", "Design", "Marketing", "Roadmap", "QA"]
        tags = {}
        for name in tag_names:
            tag = Tag(name=name)
            db.add(tag)
            tags[name] = tag
        db.commit()

        # ----------------------------------------------------
        # MEETING 1: Q3 Product Roadmap & Sprint Alignment
        # ----------------------------------------------------
        m1 = Meeting(
            user_id=user.id,
            title="Q3 Product Roadmap & Sprint Alignment",
            date=datetime.utcnow() - timedelta(days=2),
            duration_seconds=1200,  # 20 mins
            media_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"  # Standard placeholder audio
        )
        m1.participants.append(participants[0]) # Sarah Chen
        m1.participants.append(participants[1]) # Marcus Vance
        m1.participants.append(participants[2]) # Elena Rostova
        m1.tags.append(tags["Roadmap"])
        m1.tags.append(tags["Sprint Sync"])
        db.add(m1)
        db.commit()
        db.refresh(m1)

        m1_transcript = [
            ("Sarah Chen", "Good morning team, let's kickoff our Q3 roadmap and sprint alignment session today. We have a lot of items to review."),
            ("Marcus Vance", "Morning Sarah. Yes, engineering has prepared the technical timeline docs. We've scoped out the frontend and database workloads."),
            ("Elena Rostova", "And from the UX perspective, the final layouts for the dashboard command center and meetings library are ready for review."),
            ("Sarah Chen", "Excellent. Elena, let's start with the UX designs. Are there any critical changes or blockers?"),
            ("Elena Rostova", "No major blockers. We chose a deep purple and indigo theme to feel premium. However, we do need to verify responsiveness on tablet devices."),
            ("Sarah Chen", "Perfect. Let's make sure that responsiveness is fully tested before we lock the designs. Marcus, how is the database scoping going?"),
            ("Marcus Vance", "We are setting up SQLite with SQLAlchemy. I'm introducing explicit migrations with Alembic to manage database changes cleanly. No raw JSON dumping."),
            ("Sarah Chen", "That sounds like a very solid foundation. We need high integrity. Do we have foreign key constraints enabled on SQLite?"),
            ("Marcus Vance", "Yes, I will add an event listener in SQLAlchemy to force foreign keys. That way, deleting a meeting will cascade delete summaries and action items."),
            ("Elena Rostova", "That's great, it prevents orphan rows in the database. When do you think the backend API will be ready for design testing?"),
            ("Marcus Vance", "I'll have the CRUD endpoints for meetings and action items completed by Wednesday afternoon. I will coordinate with you then."),
            ("Sarah Chen", "Perfect. Let's capture that as an action item. Marcus, please finalize database models by tomorrow and coordinate backend integrations with Elena by Wednesday."),
            ("Marcus Vance", "Will do, Sarah. I will also write a database seed script so we can work with realistic transcripts immediately."),
            ("Elena Rostova", "Awesome. I will finalize responsive mockups for tablet layouts by Tuesday so Marcus has the finalized components for backend wiring."),
            ("Sarah Chen", "Great. I will draft the sprint ticket backlog in Jira to match this. Let's make sure we test CORS settings for local dev servers too."),
            ("Marcus Vance", "Right. I'll configure CORS on FastAPI to allow the Next.js frontend port 3000 to send requests."),
            ("Sarah Chen", "Sounds like a solid plan. Thank you team, let's sync again on Wednesday. Have a great day!")
        ]

        # Add segments
        time_offset = 0.0
        for idx, (speaker, text) in enumerate(m1_transcript):
            part = next(p for p in participants if p.name == speaker)
            seg_len = max(5.0, len(text.split()) * 0.4)
            segment = TranscriptSegment(
                meeting_id=m1.id,
                speaker_id=part.id,
                start_time_seconds=time_offset,
                end_time_seconds=time_offset + seg_len,
                text=text,
                sequence_order=idx + 1
            )
            db.add(segment)
            time_offset += seg_len + 1.0

        # Summary
        s1 = Summary(
            meeting_id=m1.id,
            overview_text="The team met to review Q3 roadmap goals, UX dashboard layouts, and backend database integrations. Elena highlighted the deep purple design accents and requested tablet response verification. Marcus detailed the SQLite + Alembic integration strategy, focusing on cascading foreign keys. Sarah guided the sprint scheduling and assigned tasks.",
            keywords=["Roadmap", "Alembic", "UX Design", "SQLite", "Sprint Sync"],
            generated_at=datetime.utcnow()
        )
        db.add(s1)

        # Topics
        t1_1 = Topic(meeting_id=m1.id, title="Meeting Kickoff & UX Design Review", start_time_seconds=0.0, end_time_seconds=220.0, sequence_order=1)
        t1_2 = Topic(meeting_id=m1.id, title="Database Architecture & SQLite Cascade Settings", start_time_seconds=221.0, end_time_seconds=420.0, sequence_order=2)
        t1_3 = Topic(meeting_id=m1.id, title="API Integration Planning & Sprint Backlog Setup", start_time_seconds=421.0, end_time_seconds=time_offset, sequence_order=3)
        db.add_all([t1_1, t1_2, t1_3])

        # Action Items
        ai1_1 = ActionItem(meeting_id=m1.id, text="Finalize database models and schema relationships", assignee_id=participants[1].id, is_complete=True) # Marcus
        ai1_2 = ActionItem(meeting_id=m1.id, text="Prepare backend API CRUD routes and database seed data", assignee_id=participants[1].id, is_complete=False) # Marcus
        ai1_3 = ActionItem(meeting_id=m1.id, text="Verify tablet response mockups for responsive rendering", assignee_id=participants[2].id, is_complete=False) # Elena
        ai1_4 = ActionItem(meeting_id=m1.id, text="Set up the sprint ticket backlog based on Q3 target deliverables", assignee_id=participants[0].id, is_complete=False) # Sarah
        db.add_all([ai1_1, ai1_2, ai1_3, ai1_4])


        # ----------------------------------------------------
        # MEETING 2: Database Migration & API Integration Sync
        # ----------------------------------------------------
        m2 = Meeting(
            user_id=user.id,
            title="Database Migration & API Integration Sync",
            date=datetime.utcnow() - timedelta(days=1),
            duration_seconds=950,
            media_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
        )
        m2.participants.append(participants[1]) # Marcus Vance
        m2.participants.append(participants[4]) # John Doe
        m2.participants.append(participants[3]) # David Kross
        m2.tags.append(tags["Engineering"])
        db.add(m2)
        db.commit()
        db.refresh(m2)

        m2_transcript = [
            ("Marcus Vance", "Hey John, David. Thanks for joining. Let's dive straight into the SQLite migration patterns and API endpoints mapping."),
            ("John Doe", "Sure Marcus. I looked at the SQLAlchemy base class setup. Having all models declared under the same metadata is key for Alembic auto-generation."),
            ("David Kross", "From the client side, I want to clarify how the front-end will fetch meeting lists. Do we support query string parameters for search?"),
            ("Marcus Vance", "Yes. The GET /api/meetings endpoint supports search, sorting, participant filtering, and date range filters. We execute standard SQLAlchemy filters."),
            ("John Doe", "I can implement the search logic. ripgrep is great for searching files locally, but in the DB we will use SQLAlchemy's ilike operator for titles, participant names, and topics."),
            ("David Kross", "Will the GET /meetings endpoint return full transcript segments? That might bloat the list response."),
            ("Marcus Vance", "Good call, David. The list endpoint will return metadata, participant lists, and the signature emoji summaries. The detail endpoint will return everything."),
            ("John Doe", "Perfect. Let's make sure the emoji summaries are pre-calculated or dynamically mapped in the schema. It makes cards rendering trivial."),
            ("David Kross", "Exactly. The card UI needs 2-4 emoji bullets, like a magnifying glass for keywords, checkbox for action items, and people icon for participants."),
            ("Marcus Vance", "I'll write a helper function in routers/meetings.py to compute those bullets based on database relationships. John, what about action items endpoints?"),
            ("John Doe", "I will write the POST, PATCH, and DELETE endpoints for action items. PATCH will handle toggling completeness or modifying the text."),
            ("David Kross", "Awesome. If we delete a meeting, it must clean up summaries, transcript segments, and action items. I don't want orphaned rows."),
            ("Marcus Vance", "That's handled. We set cascade='all, delete-orphan' on the SQLAlchemy relationships, and forced SQLite foreign keys via PRAGMA statements on connection."),
            ("John Doe", "Great. I will finalize these routers and configure Alembic. I'll run the initial migration so the db structure is aligned."),
            ("David Kross", "Sounds like a plan. I will check the OpenAPI docs at /docs on the local server once you push. Thanks, team!")
        ]

        time_offset = 0.0
        for idx, (speaker, text) in enumerate(m2_transcript):
            part = next(p for p in participants if p.name == speaker)
            seg_len = max(5.0, len(text.split()) * 0.4)
            segment = TranscriptSegment(
                meeting_id=m2.id,
                speaker_id=part.id,
                start_time_seconds=time_offset,
                end_time_seconds=time_offset + seg_len,
                text=text,
                sequence_order=idx + 1
            )
            db.add(segment)
            time_offset += seg_len + 1.0

        s2 = Summary(
            meeting_id=m2.id,
            overview_text="Marcus, John, and David aligned on SQLAlchemy database models, Alembic migrations, and REST API design parameters. They agreed to support search, sort, and participant filters on the list endpoint. Emoji-prefixed bullets will be computed dynamically on the server for frontend rendering. SQLite cascade deletes were verified.",
            keywords=["SQLAlchemy", "Alembic", "FastAPI", "CORS", "Cascade"],
            generated_at=datetime.utcnow()
        )
        db.add(s2)

        t2_1 = Topic(meeting_id=m2.id, title="API Design & Filter Query Params", start_time_seconds=0.0, end_time_seconds=180.0, sequence_order=1)
        t2_2 = Topic(meeting_id=m2.id, title="Data Normalization & Emoji Summaries", start_time_seconds=181.0, end_time_seconds=360.0, sequence_order=2)
        t2_3 = Topic(meeting_id=m2.id, title="Alembic Migrations & Cascade Cleanups", start_time_seconds=361.0, end_time_seconds=time_offset, sequence_order=3)
        db.add_all([t2_1, t2_2, t2_3])

        ai2_1 = ActionItem(meeting_id=m2.id, text="Configure Alembic environment and run initial migration", assignee_id=participants[4].id, is_complete=True) # John
        ai2_2 = ActionItem(meeting_id=m2.id, text="Write API endpoints for action items creation and toggling", assignee_id=participants[4].id, is_complete=True) # John
        ai2_3 = ActionItem(meeting_id=m2.id, text="Review OpenAPI swagger docs and perform integrations tests", assignee_id=participants[3].id, is_complete=False) # David
        db.add_all([ai2_1, ai2_2, ai2_3])


        # ----------------------------------------------------
        # MEETING 3: UX/UI Design Review - Fireflies Aesthetics
        # ----------------------------------------------------
        m3 = Meeting(
            user_id=user.id,
            title="UX/UI Design Review - Fireflies Aesthetics",
            date=datetime.utcnow() - timedelta(days=3),
            duration_seconds=1500,
            media_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
        )
        m3.participants.append(participants[2]) # Elena Rostova
        m3.participants.append(participants[0]) # Sarah Chen
        m3.participants.append(participants[3]) # David Kross
        m3.tags.append(tags["Design"])
        db.add(m3)
        db.commit()
        db.refresh(m3)

        m3_transcript = [
            ("Elena Rostova", "Welcome Sarah, David. I want to review the latest Figma layouts for our Fireflies.ai client application clone. I'm focusing on premium dark-mode aesthetics."),
            ("Sarah Chen", "Excellent Elena. A key aspect is the left sidebar. It should serve as the 'command center'—dark slate background, highlighted active state, with Home, Meetings, Tasks, Notifications, Settings, and placeholder items."),
            ("David Kross", "Also, the active button color needs to match Fireflies' exact primary indigo/purple. Let's make sure the logo mark shares this color too."),
            ("Elena Rostova", "Absolutely, I configured Tailwind with primary-indigo and primary-violet. The content canvas will be light grey or white for contrast, but the sidebar will stay dark."),
            ("Sarah Chen", "What about the meeting list? We discussed card components. Let's review the fields displayed on each card."),
            ("Elena Rostova", "Each card shows the meeting title, date/time, participant initials as small overlapping circular avatars, duration in minutes, and the emoji summaries."),
            ("David Kross", "For the emoji summaries, how many points should we show?"),
            ("Elena Rostova", "Exactly 2 to 4 bullet points. They give an immediate outline without opening the detail page. For example: a search icon for Q3 roadmap progress, a checkmark for action item totals."),
            ("Sarah Chen", "This is perfect. It's a key signature element of Fireflies. Let's move on to the meeting details view layout."),
            ("Elena Rostova", "The detail view has a split layout. The left pane holds the media player at the top with a custom seek bar, and the scrollable transcript below it."),
            ("David Kross", "Will the transcript sync with the audio player?"),
            ("Elena Rostova", "Yes, it's a two-way binding. Clicking a line in the transcript seeks the audio player to that timestamp, and playing the audio highlights the active spoken line."),
            ("Sarah Chen", "That is an amazing UX element. Let's ensure the right pane holds a tabbed component literally labeled 'Notes'."),
            ("Elena Rostova", "Yes! It contains sections for 'Meeting Keywords' as small pills, 'Overview' as a summary text, 'Action Items' with checklist checkboxes, and 'Topics/Outline' as a timestamped list."),
            ("David Kross", "Clicking an outline item should seek the player to that timestamp too, right?"),
            ("Elena Rostova", "Yes, clicking the timestamped topics triggers the same seek timeline event as clicking transcript lines."),
            ("Sarah Chen", "Great. Elena, please export the Figma design assets so the team can build the CSS styles accordingly. David, prepare the toast notification system wireframes."),
            ("David Kross", "Will do. Toasts will be top-right aligned, auto-dismissing, showing confirmations for create/edit/delete/complete actions."),
            ("Elena Rostova", "I'll upload the design links to the project chat in a few minutes. Thanks, everyone!")
        ]

        time_offset = 0.0
        for idx, (speaker, text) in enumerate(m3_transcript):
            part = next(p for p in participants if p.name == speaker)
            seg_len = max(5.0, len(text.split()) * 0.4)
            segment = TranscriptSegment(
                meeting_id=m3.id,
                speaker_id=part.id,
                start_time_seconds=time_offset,
                end_time_seconds=time_offset + seg_len,
                text=text,
                sequence_order=idx + 1
            )
            db.add(segment)
            time_offset += seg_len + 1.0

        s3 = Summary(
            meeting_id=m3.id,
            overview_text="The design team reviewed layout patterns for the sidebar command center, card structures, and details split views. Elena presented designs targeting the Fireflies.ai aesthetics with deep indigo buttons, overlapping avatars, and emoji summaries. Two-way binding for transcript and player timeline seeking was agreed upon, alongside a tabbed Notes component.",
            keywords=["UX", "Figma", "Tailwind", "Indigo", "Sidebar", "Toasts"],
            generated_at=datetime.utcnow()
        )
        db.add(s3)

        t3_1 = Topic(meeting_id=m3.id, title="Figma Review & Sidebar Command Center", start_time_seconds=0.0, end_time_seconds=240.0, sequence_order=1)
        t3_2 = Topic(meeting_id=m3.id, title="Card Layout & Emoji Summary Details", start_time_seconds=241.0, end_time_seconds=480.0, sequence_order=2)
        t3_3 = Topic(meeting_id=m3.id, title="Transcript Sync & Split Pane UX", start_time_seconds=481.0, end_time_seconds=time_offset, sequence_order=3)
        db.add_all([t3_1, t3_2, t3_3])

        ai3_1 = ActionItem(meeting_id=m3.id, text="Export Figma visual assets and color palette configurations", assignee_id=participants[2].id, is_complete=True) # Elena
        ai3_2 = ActionItem(meeting_id=m3.id, text="Design wireframes for the toast notification alerts system", assignee_id=participants[3].id, is_complete=False) # David
        ai3_3 = ActionItem(meeting_id=m3.id, text="Set up frontend Next.js routing and active state links", assignee_id=participants[2].id, is_complete=False) # Elena
        db.add_all([ai3_1, ai3_2, ai3_3])


        # ----------------------------------------------------
        # MEETING 4: Bug Triaging & Sprint Backlog Clean
        # ----------------------------------------------------
        m4 = Meeting(
            user_id=user.id,
            title="Bug Triaging & Sprint Backlog Clean",
            date=datetime.utcnow() - timedelta(days=4),
            duration_seconds=800,
            media_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
        )
        m4.participants.append(participants[4]) # John Doe
        m4.participants.append(participants[1]) # Marcus Vance
        m4.tags.append(tags["QA"])
        m4.tags.append(tags["Sprint Sync"])
        db.add(m4)
        db.commit()
        db.refresh(m4)

        m4_transcript = [
            ("John Doe", "Hey Marcus, let's look at the bug database and triage outstanding issues for the sprint. We have a few blockers reported in QA."),
            ("Marcus Vance", "Sure, John. Let's pull up the list. I saw a CORS exception when the front-end hits our FastAPI server locally."),
            ("John Doe", "Ah, yes. The browser blocked request headers because local hosts are on different ports, 3000 and 8000. I need to allow credentials and configure CORSMiddleware origins."),
            ("Marcus Vance", "Right. Add 'http://localhost:3000' and 'http://127.0.0.1:3000' to origins. That will fix it. What's the next issue?"),
            ("John Doe", "We have a SQLite lock exception during parallel test execution. The database becomes locked when running write transactions."),
            ("Marcus Vance", "SQLite is fine for single write connections, but we must use a single session scope or check check_same_thread=False in connection args."),
            ("John Doe", "I checked, that was already added in db/session.py, but we might need to enforce commit blocks or close sessions in finally statements."),
            ("Marcus Vance", "Good. Let's make sure the get_db yield generator closes sessions correctly. Let's document it in the code comments."),
            ("John Doe", "Done. Also, the search endpoint is slightly slow. Can we add indices on title columns?"),
            ("Marcus Vance", "Definitely. I'll add database indexes on meetings(title), users(email), and participants(email). It speeds up searches significantly."),
            ("John Doe", "Perfect. Let's schedule these fixes for the next release. I will take care of the CORS and db lock, while you add indices."),
            ("Marcus Vance", "Great, thanks John. Let's close this standup.")
        ]

        time_offset = 0.0
        for idx, (speaker, text) in enumerate(m4_transcript):
            part = next(p for p in participants if p.name == speaker)
            seg_len = max(5.0, len(text.split()) * 0.4)
            segment = TranscriptSegment(
                meeting_id=m4.id,
                speaker_id=part.id,
                start_time_seconds=time_offset,
                end_time_seconds=time_offset + seg_len,
                text=text,
                sequence_order=idx + 1
            )
            db.add(segment)
            time_offset += seg_len + 1.0

        s4 = Summary(
            meeting_id=m4.id,
            overview_text="The engineering team triaged blockers including local CORS domain errors and SQLite connection locking issues during test operations. Resolved to explicitly add web origins to FastAPI configurations and ensure session closing generators execute inside finally blocks. Column indexing is slated for execution.",
            keywords=["CORS", "SQLite", "Triage", "FastAPI", "Database Lock"],
            generated_at=datetime.utcnow()
        )
        db.add(s4)

        t4_1 = Topic(meeting_id=m4.id, title="CORS & Origin Mapping Blockers", start_time_seconds=0.0, end_time_seconds=150.0, sequence_order=1)
        t4_2 = Topic(meeting_id=m4.id, title="SQLite Connection Locks & Session Scoping", start_time_seconds=151.0, end_time_seconds=300.0, sequence_order=2)
        t4_3 = Topic(meeting_id=m4.id, title="Database Indices & Performance Optimization", start_time_seconds=301.0, end_time_seconds=time_offset, sequence_order=3)
        db.add_all([t4_1, t4_2, t4_3])

        ai4_1 = ActionItem(meeting_id=m4.id, text="Configure CORS origins to resolve local cross-port browser blockages", assignee_id=participants[4].id, is_complete=True) # John
        ai4_2 = ActionItem(meeting_id=m4.id, text="Add database indexes on email and title columns in SQLite schema", assignee_id=participants[1].id, is_complete=True) # Marcus
        ai4_3 = ActionItem(meeting_id=m4.id, text="Refactor database yield statement to guarantee session closes", assignee_id=participants[4].id, is_complete=True) # John
        db.add_all([ai4_1, ai4_2, ai4_3])


        # ----------------------------------------------------
        # MEETING 5: Launch Strategy & Marketing Campaign
        # ----------------------------------------------------
        m5 = Meeting(
            user_id=user.id,
            title="Launch Strategy & Marketing Campaign",
            date=datetime.utcnow() - timedelta(days=5),
            duration_seconds=1800,
            media_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
        )
        m5.participants.append(participants[3]) # David Kross
        m5.participants.append(participants[0]) # Sarah Chen
        m5.participants.append(participants[2]) # Elena Rostova
        m5.tags.append(tags["Marketing"])
        db.add(m5)
        db.commit()
        db.refresh(m5)

        m5_transcript = [
            ("David Kross", "Welcome everyone to our marketing launch sync. We are nearing the rollout date and need to coordinate our messaging materials."),
            ("Sarah Chen", "Great. David, let's detail the newsletter and press releases timelines. We want to align the messaging with our product features."),
            ("Elena Rostova", "I've compiled high-resolution screenshots and product recording animations showing off our transcript playback and notes panels."),
            ("David Kross", "Perfect, visual assets are extremely high impact. I'll include those in the email newsletter sequence."),
            ("Sarah Chen", "What about target audiences? Are we targeting engineering teams or enterprise managers first?"),
            ("David Kross", "Both. The value proposition is meeting searchability and task accountability. Engineering likes search, management likes task tracking."),
            ("Elena Rostova", "Yes. The action item checklists are a massive selling point. People hate forgetting action items after long calls."),
            ("David Kross", "Right. I will write a blog post describing how our tool automates summary extraction to eliminate manual note-taking."),
            ("Sarah Chen", "Wonderful. Let's make sure we schedule that blog release for the morning of launch day. Elena, do we have social graphics?"),
            ("Elena Rostova", "Yes, I will prepare standard horizontal layout images for Twitter and LinkedIn posts by Thursday."),
            ("David Kross", "I'll draft the actual text copy for the social media templates. That way we can copy-paste posts quickly on launch day."),
            ("Sarah Chen", "Excellent work, team. Let's execute these items and align again on Friday.")
        ]

        time_offset = 0.0
        for idx, (speaker, text) in enumerate(m5_transcript):
            part = next(p for p in participants if p.name == speaker)
            seg_len = max(5.0, len(text.split()) * 0.4)
            segment = TranscriptSegment(
                meeting_id=m5.id,
                speaker_id=part.id,
                start_time_seconds=time_offset,
                end_time_seconds=time_offset + seg_len,
                text=text,
                sequence_order=idx + 1
            )
            db.add(segment)
            time_offset += seg_len + 1.0

        s5 = Summary(
            meeting_id=m5.id,
            overview_text="David led a planning discussion on marketing collateral and launch messaging vectors. Elena provided promotional assets. The target campaign will emphasize meeting indexing and automatic task captures. Social graphics and templates will be finalized shortly.",
            keywords=["Marketing", "Launch", "Campaign", "Assets", "Brand"],
            generated_at=datetime.utcnow()
        )
        db.add(s5)

        t5_1 = Topic(meeting_id=m5.id, title="Collateral & Launch Assets Review", start_time_seconds=0.0, end_time_seconds=280.0, sequence_order=1)
        t5_2 = Topic(meeting_id=m5.id, title="Audience Demographics & Key Positioning", start_time_seconds=281.0, end_time_seconds=500.0, sequence_order=2)
        t5_3 = Topic(meeting_id=m5.id, title="Content Schedule & Promotional Timelines", start_time_seconds=501.0, end_time_seconds=time_offset, sequence_order=3)
        db.add_all([t5_1, t5_2, t5_3])

        ai5_1 = ActionItem(meeting_id=m5.id, text="Draft marketing newsletter campaign contents", assignee_id=participants[3].id, is_complete=True) # David
        ai5_2 = ActionItem(meeting_id=m5.id, text="Finalize launch announcement press release document", assignee_id=participants[0].id, is_complete=False) # Sarah
        ai5_3 = ActionItem(meeting_id=m5.id, text="Compile high-res horizontal social media marketing cards", assignee_id=participants[2].id, is_complete=False) # Elena
        ai5_4 = ActionItem(meeting_id=m5.id, text="Write short promotional snippets for LinkedIn and Twitter", assignee_id=participants[3].id, is_complete=False) # David
        db.add_all([ai5_1, ai5_2, ai5_3, ai5_4])

        db.commit()
        print("Successfully seeded all 5 meetings and relationships!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
