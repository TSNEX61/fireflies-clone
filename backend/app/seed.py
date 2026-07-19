"""
Seed script for the Fireflies.ai Clone database.
Creates 5 realistic meetings with full transcripts, summaries, topics, action items,
bookmarks, comments, and soundbites.

Run: cd backend && python -m app.seed
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from app.db.session import SessionLocal
from app.models.base import Base
from app.db.session import engine
from app.models.all_models import (
    User, Participant, Meeting, TranscriptSegment, Summary,
    Topic, ActionItem, Tag, Bookmark, Comment, Soundbite,
    meeting_participants, meeting_tags,
)

# Drop and recreate all tables for a clean seed
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# ── Default User ──────────────────────────────────────────────────────────────
user = User(
    id=1,
    name="Alex Sterling",
    email="alex@fireflies.ai",
    avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
)
db.add(user)
db.commit()

# ── Participants ──────────────────────────────────────────────────────────────
participants_data = [
    ("Alex Sterling", "alex@fireflies.ai"),
    ("Sarah Chen", "sarah@acme.com"),
    ("Marcus Williams", "marcus@acme.com"),
    ("Priya Patel", "priya@acme.com"),
    ("James O'Brien", "james@acme.com"),
    ("Emily Rodriguez", "emily@acme.com"),
    ("David Kim", "david@acme.com"),
    ("Rachel Thompson", "rachel@acme.com"),
]

participants = {}
for name, email in participants_data:
    p = Participant(name=name, email=email)
    db.add(p)
    db.commit()
    db.refresh(p)
    participants[name] = p

# ── Tags ──────────────────────────────────────────────────────────────────────
tags_data = ["Engineering", "Product", "Marketing", "Sales", "Design", "Operations", "Strategy"]
tags = {}
for tname in tags_data:
    t = Tag(name=tname)
    db.add(t)
    db.commit()
    db.refresh(t)
    tags[tname] = t

# ─────────────────────────────────────────────────────────────────────────────
# Meeting 1: Q3 Product Roadmap & Sprint Alignment
# ─────────────────────────────────────────────────────────────────────────────
meeting1_date = datetime(2026, 7, 18, 10, 0, 0)

m1_transcript = [
    ("Alex Sterling", "Good morning everyone, welcome to our Q3 product roadmap sync. Let's start by reviewing what we accomplished in Q2 and then align on priorities for the next quarter."),
    ("Sarah Chen", "Thanks Alex. From the product side, we shipped the notification system, the new meeting search feature, and the integrated calendar view. User engagement went up 34% after the search launch."),
    ("Marcus Williams", "On engineering, we completed the database migration to PostgreSQL, which improved query performance by 60%. We also closed 47 bugs and reduced our average page load time to under 1.2 seconds."),
    ("Priya Patel", "The design team finished the component library overhaul. We now have consistent spacing, typography, and color tokens across all pages. The new meeting card design tested really well in user studies."),
    ("Alex Sterling", "Excellent progress. For Q3, I want us to focus on three major areas: the AI-powered meeting summaries feature, the integrations marketplace, and performance optimization for larger teams."),
    ("Sarah Chen", "I agree on the AI summaries. I've been talking to customers and 78% of them said automated summaries would save them at least 30 minutes per meeting. We should prioritize that."),
    ("Marcus Williams", "For the AI summaries, we'll need to set up the inference pipeline. I'm thinking we use a fine-tuned model that can handle our transcript format. We'll need about 6 weeks for the backend infrastructure."),
    ("James O'Brien", "From the marketing side, we should time the integrations marketplace launch with our annual conference in September. That would give us maximum visibility."),
    ("Priya Patel", "I can have the marketplace UI designs ready by end of July. We've already done competitive analysis on how Slack and Notion handle their integration directories."),
    ("Emily Rodriguez", "Quick question about the performance work — are we talking about optimizing the existing search queries or building a new caching layer?"),
    ("Marcus Williams", "Both. We'll implement Redis caching for frequently accessed meeting data, and optimize the full-text search with better indexing. I expect we can get search results under 200ms."),
    ("Alex Sterling", "Great. Let's set milestones: AI summaries MVP by August 15, marketplace beta by September 1, and performance improvements phased across the quarter. Any blockers anyone sees right now?"),
    ("Sarah Chen", "We might need an additional ML engineer for the AI summaries work. Current team is already at capacity with the infrastructure tasks."),
    ("Alex Sterling", "I'll talk to HR about that. Let's also schedule weekly check-ins on these three workstreams. Marcus, can you set up the recurring meetings?"),
    ("Marcus Williams", "Already on it. I'll send calendar invites today with the right participants for each track."),
    ("Alex Sterling", "Perfect. Let's wrap up with action items. Sarah — finalize the AI summaries PRD by July 25. Marcus — complete the infrastructure architecture doc by July 22. Priya — marketplace designs by July 31. James — draft the conference announcement by August 1. Everyone — review the Q2 metrics dashboard and come prepared for next week's deep dive."),
]

meeting1 = Meeting(
    user_id=1, title="Q3 Product Roadmap & Sprint Alignment",
    date=meeting1_date, duration_seconds=1080,
)
for name in ["Alex Sterling", "Sarah Chen", "Marcus Williams", "Priya Patel", "James O'Brien", "Emily Rodriguez"]:
    meeting1.participants.append(participants[name])
for tname in ["Product", "Engineering", "Strategy"]:
    meeting1.tags.append(tags[tname])
db.add(meeting1)
db.commit()
db.refresh(meeting1)

# Transcript segments
current_time = 0.0
for i, (speaker, text) in enumerate(m1_transcript):
    word_count = len(text.split())
    segment_duration = max(8.0, word_count * 0.35)
    seg = TranscriptSegment(
        meeting_id=meeting1.id, speaker_id=participants[speaker].id,
        start_time_seconds=current_time, end_time_seconds=current_time + segment_duration,
        text=text, sequence_order=i + 1,
    )
    db.add(seg)
    current_time += segment_duration + 1.5
meeting1.duration_seconds = int(current_time)
db.commit()

# Summary
db.add(Summary(
    meeting_id=meeting1.id,
    overview_text=(
        "The team conducted a comprehensive Q3 product roadmap alignment session. Key achievements from Q2 were reviewed, "
        "including a 34% increase in user engagement following the search feature launch and a 60% improvement in database "
        "query performance after PostgreSQL migration. Three major Q3 priorities were established: AI-powered meeting summaries "
        "(MVP target: August 15), an integrations marketplace (beta target: September 1), and performance optimization across "
        "the platform. The team discussed staffing needs for the ML infrastructure work and established weekly check-in cadences "
        "for each workstream."
    ),
    keywords=["roadmap", "AI summaries", "marketplace", "performance", "sprint planning", "Q3 priorities"],
    generated_at=datetime(2026, 7, 18, 11, 0),
))
db.commit()

# Topics
for idx, (title, start, end) in enumerate([
    ("Q2 Review & Accomplishments", 0, 120),
    ("Q3 Strategic Priorities", 120, 360),
    ("AI Summaries & Infrastructure", 360, 540),
    ("Integrations Marketplace Launch", 540, 720),
    ("Performance Optimization", 720, 850),
    ("Action Items & Next Steps", 850, 1080),
], 1):
    db.add(Topic(meeting_id=meeting1.id, title=title, start_time_seconds=start, end_time_seconds=end, sequence_order=idx))

# Action Items
for text, assignee_name, complete in [
    ("Finalize AI Summaries PRD and technical requirements", "Sarah Chen", False),
    ("Complete infrastructure architecture document for AI pipeline", "Marcus Williams", False),
    ("Deliver marketplace UI designs by end of July", "Priya Patel", False),
    ("Draft conference announcement for integrations marketplace", "James O'Brien", False),
    ("Set up weekly check-in meetings for all three workstreams", "Marcus Williams", True),
]:
    db.add(ActionItem(meeting_id=meeting1.id, text=text, assignee_id=participants[assignee_name].id, is_complete=complete))

# Bookmarks
db.add(Bookmark(meeting_id=meeting1.id, timestamp_seconds=180, note="Key decision: AI summaries are top priority"))
db.add(Bookmark(meeting_id=meeting1.id, timestamp_seconds=540, note="Marketplace launch tied to September conference"))

# Comments
db.add(Comment(meeting_id=meeting1.id, author_name="Sarah Chen", text="The 78% customer demand stat for AI summaries is really compelling — let's make sure we reference this in the board deck.", timestamp_seconds=200))
db.add(Comment(meeting_id=meeting1.id, author_name="Marcus Williams", text="Redis caching will be a quick win. We can see 3-5x improvement immediately.", timestamp_seconds=740))

# Soundbites
db.add(Soundbite(meeting_id=meeting1.id, title="AI summaries ROI", from_seconds=180, to_seconds=210, speaker_name="Sarah Chen"))
db.add(Soundbite(meeting_id=meeting1.id, title="Performance targets", from_seconds=700, to_seconds=730, speaker_name="Marcus Williams"))

db.commit()

# ─────────────────────────────────────────────────────────────────────────────
# Meeting 2: Sprint 14 Retrospective
# ─────────────────────────────────────────────────────────────────────────────
meeting2_date = datetime(2026, 7, 16, 14, 0, 0)

m2_transcript = [
    ("Marcus Williams", "Alright team, let's kick off the Sprint 14 retro. Overall we completed 89% of planned story points, which is our best sprint in three months."),
    ("Priya Patel", "What went well: the new component library saved us a ton of time. I noticed developers were picking up the patterns much faster than before."),
    ("David Kim", "I agree. The story point estimation was also more accurate this sprint. I think the refinement sessions helped a lot."),
    ("Rachel Thompson", "One thing that went well was the pair programming sessions on the authentication refactor. We caught two potential security issues early."),
    ("Marcus Williams", "Great points. What could we improve? I know the code review bottleneck was a recurring theme."),
    ("David Kim", "Yeah, we had 12 PRs waiting for review at one point. Some sat for 3+ days. We need a better system for distributing review load."),
    ("Rachel Thompson", "I also think we need better test coverage before merging. We had two regression bugs that slipped through."),
    ("Priya Patel", "On the design side, I felt a bit disconnected from the implementation phase. Maybe I should sit in on more standups during the sprint."),
    ("Marcus Williams", "Those are all actionable. Let me propose: we implement a PR review rotation so no one person is always reviewing. We add a mandatory unit test threshold before merge. And we invite designers to standups on alternating days."),
    ("David Kim", "I like the rotation idea. Could we use a bot to auto-assign reviewers based on who's least loaded?"),
    ("Marcus Williams", "That's a great idea. I'll set up a GitHub Action for that. Let's also make sure we're closing the loop on sprint goals during standups, not just daily updates."),
    ("Rachel Thompson", "One more thing — can we add a 'demo day' at the end of each sprint? It would help the team see what everyone else built."),
    ("Marcus Williams", "Love it. Sprint 15 demo day on Friday August 1st. Let's add it to the calendar now."),
]

meeting2 = Meeting(
    user_id=1, title="Sprint 14 Retrospective",
    date=meeting2_date, duration_seconds=840,
)
for name in ["Marcus Williams", "Priya Patel", "David Kim", "Rachel Thompson"]:
    meeting2.participants.append(participants[name])
for tname in ["Engineering", "Design"]:
    meeting2.tags.append(tags[tname])
db.add(meeting2)
db.commit()
db.refresh(meeting2)

current_time = 0.0
for i, (speaker, text) in enumerate(m2_transcript):
    word_count = len(text.split())
    segment_duration = max(8.0, word_count * 0.35)
    seg = TranscriptSegment(
        meeting_id=meeting2.id, speaker_id=participants[speaker].id,
        start_time_seconds=current_time, end_time_seconds=current_time + segment_duration,
        text=text, sequence_order=i + 1,
    )
    db.add(seg)
    current_time += segment_duration + 1.5
meeting2.duration_seconds = int(current_time)
db.commit()

db.add(Summary(
    meeting_id=meeting2.id,
    overview_text=(
        "The Sprint 14 retrospective reviewed an 89% story point completion rate, the team's best in three months. "
        "Key wins included the new component library adoption, improved estimation accuracy, and successful pair programming "
        "sessions that caught security issues early. Areas for improvement identified: code review bottlenecks (12 PRs waiting "
        "at peak), insufficient test coverage before merge, and designer-developer communication gaps. Actionable solutions "
        "were agreed upon including PR review rotation, mandatory test thresholds, and bi-directional standup participation."
    ),
    keywords=["retrospective", "sprint 14", "code review", "testing", "pair programming", "demo day"],
    generated_at=datetime(2026, 7, 16, 15, 0),
))
db.commit()

for idx, (title, start, end) in enumerate([
    ("Sprint 14 Wins", 0, 180),
    ("Code Review Process", 180, 400),
    ("Testing & Quality", 400, 560),
    ("Designer Integration", 560, 700),
    ("Sprint 15 Improvements", 700, 840),
], 1):
    db.add(Topic(meeting_id=meeting2.id, title=title, start_time_seconds=start, end_time_seconds=end, sequence_order=idx))

for text, assignee_name, complete in [
    ("Set up GitHub Action for automatic PR reviewer rotation", "Marcus Williams", False),
    ("Add mandatory unit test coverage threshold before merge", "Rachel Thompson", False),
    ("Join standups on alternating days during Sprint 15", "Priya Patel", False),
    ("Schedule Sprint 15 demo day for August 1st", "Marcus Williams", True),
]:
    db.add(ActionItem(meeting_id=meeting2.id, text=text, assignee_id=participants[assignee_name].id, is_complete=complete))

db.add(Bookmark(meeting_id=meeting2.id, timestamp_seconds=400, note="Code review bottleneck identified as top improvement area"))
db.add(Comment(meeting_id=meeting2.id, author_name="David Kim", text="The auto-assign bot could also track review turnaround times for our metrics.", timestamp_seconds=350))
db.add(Soundbite(meeting_id=meeting2.id, title="Best sprint in 3 months", from_seconds=0, to_seconds=15, speaker_name="Marcus Williams"))
db.commit()

# ─────────────────────────────────────────────────────────────────────────────
# Meeting 3: Customer Success Review — Enterprise Accounts
# ─────────────────────────────────────────────────────────────────────────────
meeting3_date = datetime(2026, 7, 15, 9, 0, 0)

m3_transcript = [
    ("Alex Sterling", "Welcome to the enterprise accounts review. Emily, what's the current status on our top 10 enterprise customers?"),
    ("Emily Rodriguez", "Overall retention is at 94%, which is strong. However, we've had two at-risk accounts this quarter: TechCorp and GlobalMedia. Both cited issues with meeting search latency and limited integration options."),
    ("James O'Brien", "That aligns with what we're hearing in the field. The integrations marketplace we're building should address the second concern. What about the search performance?"),
    ("Emily Rodriguez", "Marcus's team is already working on the Redis caching layer. I've shared the customer feedback with the engineering team so they understand the urgency."),
    ("Rachel Thompson", "From a support perspective, our average ticket resolution time dropped to 4.2 hours this month, down from 8.1 hours in May. The new help center articles are making a difference."),
    ("Alex Sterling", "That's a huge improvement. What about onboarding metrics for new enterprise customers?"),
    ("Emily Rodriguez", "Time to first value is now 3.2 days on average, down from 7 days last quarter. The guided setup wizard Priya designed has been a game changer."),
    ("Priya Patel", "Glad to hear that. We're also working on an in-app tutorial flow that should reduce onboarding time even further."),
    ("James O'Brien", "For the sales pipeline, we have 8 enterprise deals in final negotiations worth a combined $2.4M ARR. The main sticking point is SSO and advanced permissions."),
    ("Alex Sterling", "Those are both on our roadmap. Let's make sure we communicate timelines to the sales team so they can set expectations with prospects."),
    ("Emily Rodriguez", "One more thing — our NPS score for enterprise accounts hit 72 this quarter, up from 58. The recent product improvements are really resonating."),
    ("Alex Sterling", "Fantastic. Let's keep this momentum going. Action items: Emily — prepare Q3 enterprise success playbook. James — update sales materials with new integration and SSO timelines. Rachel — publish the top 10 help center articles as in-app tooltips. Priya — design the enterprise onboarding flow v2."),
]

meeting3 = Meeting(
    user_id=1, title="Customer Success Review — Enterprise Accounts",
    date=meeting3_date, duration_seconds=900,
)
for name in ["Alex Sterling", "Emily Rodriguez", "James O'Brien", "Rachel Thompson", "Priya Patel"]:
    meeting3.participants.append(participants[name])
for tname in ["Sales", "Strategy", "Design"]:
    meeting3.tags.append(tags[tname])
db.add(meeting3)
db.commit()
db.refresh(meeting3)

current_time = 0.0
for i, (speaker, text) in enumerate(m3_transcript):
    word_count = len(text.split())
    segment_duration = max(8.0, word_count * 0.35)
    seg = TranscriptSegment(
        meeting_id=meeting3.id, speaker_id=participants[speaker].id,
        start_time_seconds=current_time, end_time_seconds=current_time + segment_duration,
        text=text, sequence_order=i + 1,
    )
    db.add(seg)
    current_time += segment_duration + 1.5
meeting3.duration_seconds = int(current_time)
db.commit()

db.add(Summary(
    meeting_id=meeting3.id,
    overview_text=(
        "Enterprise customer success review covering retention, support metrics, onboarding, and sales pipeline. "
        "Key highlights: 94% enterprise retention rate, NPS score improved to 72, average support resolution dropped to "
        "4.2 hours, and onboarding time reduced to 3.2 days. Two at-risk accounts (TechCorp, GlobalMedia) identified "
        "with search latency and integration concerns — both being addressed by active engineering work. Sales pipeline "
        "shows $2.4M ARR in final negotiations across 8 enterprise deals, with SSO and advanced permissions as key blockers."
    ),
    keywords=["enterprise", "retention", "NPS", "onboarding", "sales pipeline", "SSO"],
    generated_at=datetime(2026, 7, 15, 10, 30),
))
db.commit()

for idx, (title, start, end) in enumerate([
    ("Enterprise Retention & Risk", 0, 200),
    ("Support & Onboarding Metrics", 200, 440),
    ("Sales Pipeline & Deals", 440, 680),
    ("Action Items & Next Steps", 680, 900),
], 1):
    db.add(Topic(meeting_id=meeting3.id, title=title, start_time_seconds=start, end_time_seconds=end, sequence_order=idx))

for text, assignee_name, complete in [
    ("Prepare Q3 enterprise success playbook with retention strategies", "Emily Rodriguez", False),
    ("Update sales materials with integration marketplace and SSO timelines", "James O'Brien", False),
    ("Publish top 10 help center articles as in-app tooltips", "Rachel Thompson", False),
    ("Design enterprise onboarding flow v2 with guided setup", "Priya Patel", False),
]:
    db.add(ActionItem(meeting_id=meeting3.id, text=text, assignee_id=participants[assignee_name].id, is_complete=complete))

db.add(Bookmark(meeting_id=meeting3.id, timestamp_seconds=160, note="NPS score jumped to 72 — great signal"))
db.add(Comment(meeting_id=meeting3.id, author_name="Emily Rodriguez", text="The TechCorp escalation should be prioritized — they're our largest account.", timestamp_seconds=120))
db.add(Soundbite(meeting_id=meeting3.id, title="NPS improvement", from_seconds=620, to_seconds=645, speaker_name="Emily Rodriguez"))
db.commit()

# ─────────────────────────────────────────────────────────────────────────────
# Meeting 4: Marketing Campaign Planning — Fall Launch
# ─────────────────────────────────────────────────────────────────────────────
meeting4_date = datetime(2026, 7, 14, 11, 0, 0)

m4_transcript = [
    ("James O'Brien", "Let's brainstorm the fall campaign. The integrations marketplace is our big Q3 deliverable, so everything should build toward that launch."),
    ("Sarah Chen", "I think we should do a countdown series — one integration per day for two weeks leading up to launch. We can highlight use cases and customer quotes for each."),
    ("James O'Brien", "Love that idea. We can repurpose it across social, email, and the blog. Emily, do you have customer quotes we could use?"),
    ("Emily Rodriguez", "Absolutely. I have testimonials from 12 enterprise customers ready to go. Some of them are already using our beta integrations."),
    ("Priya Patel", "Design-wise, I can create a template system for the countdown posts. We'd need consistent branding but enough variety to keep it fresh."),
    ("Alex Sterling", "What about the conference session? James, do we have a slot confirmed?"),
    ("James O'Brien", "Yes, we're doing a 45-minute main stage presentation on September 15th. I'm thinking we do a live demo of the marketplace with a real customer."),
    ("Sarah Chen", "That's ambitious but could be amazing. We should start rehearsals by August 20th."),
    ("Rachel Thompson", "From a content perspective, I can have the documentation and help center articles ready by September 5th."),
    ("James O'Brien", "Perfect. Let's also plan a webinar series for post-conference. Three webinars: integrations 101, advanced workflows, and customer panel."),
    ("Alex Sterling", "This is shaping up well. Budget-wise, do we need to allocate anything额外?"),
    ("James O'Brien", "I've budgeted $15K for the conference booth and swag, plus $5K for paid social promotion of the countdown series. Should be sufficient."),
    ("Alex Sterling", "Approved. Let's make this our biggest launch yet."),
]

meeting4 = Meeting(
    user_id=1, title="Marketing Campaign Planning — Fall Launch",
    date=meeting4_date, duration_seconds=780,
)
for name in ["Alex Sterling", "James O'Brien", "Sarah Chen", "Emily Rodriguez", "Priya Patel", "Rachel Thompson"]:
    meeting4.participants.append(participants[name])
for tname in ["Marketing", "Product", "Design"]:
    meeting4.tags.append(tags[tname])
db.add(meeting4)
db.commit()
db.refresh(meeting4)

current_time = 0.0
for i, (speaker, text) in enumerate(m4_transcript):
    word_count = len(text.split())
    segment_duration = max(8.0, word_count * 0.35)
    seg = TranscriptSegment(
        meeting_id=meeting4.id, speaker_id=participants[speaker].id,
        start_time_seconds=current_time, end_time_seconds=current_time + segment_duration,
        text=text, sequence_order=i + 1,
    )
    db.add(seg)
    current_time += segment_duration + 1.5
meeting4.duration_seconds = int(current_time)
db.commit()

db.add(Summary(
    meeting_id=meeting4.id,
    overview_text=(
        "Marketing team planned the fall integrations marketplace launch campaign. Key initiatives: a two-week countdown "
        "series featuring one integration per day with customer quotes and use cases, a 45-minute main stage conference "
        "presentation with live marketplace demo on September 15th, and a three-part post-conference webinar series. "
        "Budget approved at $20K total ($15K conference, $5K paid social). Content and documentation to be ready by "
        "September 5th, with rehearsals starting August 20th."
    ),
    keywords=["marketing", "campaign", "launch", "conference", "webinar", "integrations"],
    generated_at=datetime(2026, 7, 14, 12, 15),
))
db.commit()

for idx, (title, start, end) in enumerate([
    ("Campaign Strategy Brainstorm", 0, 200),
    ("Conference Presentation", 200, 420),
    ("Post-Launch Content Plan", 420, 600),
    ("Budget & Approval", 600, 780),
], 1):
    db.add(Topic(meeting_id=meeting4.id, title=title, start_time_seconds=start, end_time_seconds=end, sequence_order=idx))

for text, assignee_name, complete in [
    ("Create template system for countdown social posts", "Priya Patel", False),
    ("Compile customer testimonials and beta integration quotes", "Emily Rodriguez", False),
    ("Prepare conference presentation slides and live demo script", "James O'Brien", False),
    ("Write integration documentation and help center articles", "Rachel Thompson", False),
    ("Schedule rehearsals starting August 20th", "Sarah Chen", False),
]:
    db.add(ActionItem(meeting_id=meeting4.id, text=text, assignee_id=participants[assignee_name].id, is_complete=complete))

db.add(Bookmark(meeting_id=meeting4.id, timestamp_seconds=380, note="Live demo at conference — high impact moment"))
db.add(Comment(meeting_id=meeting4.id, author_name="Priya Patel", text="I'll create a Figma template library so the countdown posts are consistent.", timestamp_seconds=140))
db.add(Soundbite(meeting_id=meeting4.id, title="Biggest launch yet", from_seconds=740, to_seconds=770, speaker_name="Alex Sterling"))
db.commit()

# ─────────────────────────────────────────────────────────────────────────────
# Meeting 5: Weekly Engineering Standup
# ─────────────────────────────────────────────────────────────────────────────
meeting5_date = datetime(2026, 7, 17, 9, 30, 0)

m5_transcript = [
    ("Marcus Williams", "Quick standup everyone. Let's go around — what did you do yesterday, what's planned today, and any blockers. David, start us off."),
    ("David Kim", "Yesterday I finished the Redis caching implementation for the meeting search endpoint. Today I'm writing integration tests. No blockers."),
    ("Rachel Thompson", "I completed the API documentation for the new endpoints. Today I'm working on the error handling for the file upload service. Blocker: I need access to the staging environment."),
    ("Marcus Williams", "I'll get you that access after this call. Priya?"),
    ("Priya Patel", "Yesterday I finalized the marketplace card designs. Today I'm starting the detail page layouts. No blockers."),
    ("Alex Sterling", "Quick question Priya — are the marketplace cards responsive for mobile?"),
    ("Priya Patel", "Yes, I have three breakpoints: mobile, tablet, and desktop. The mobile version stacks vertically."),
    ("Marcus Williams", "Good. On my side, I merged the authentication refactor PR yesterday. Today I'm reviewing the caching PR from David and setting up the CI pipeline for the new test suite."),
    ("David Kim", "Oh one thing — I noticed the search indexing job is taking longer than expected on large datasets. Might need to optimize the batch size."),
    ("Marcus Williams", "Good catch. Let's look at that together after standup. Anything else?"),
    ("Rachel Thompson", "Just a reminder — code freeze for the v2.4 release is next Wednesday. Make sure all PRs are submitted by Tuesday EOD."),
    ("Marcus Williams", "Noted. Let's keep the momentum going. Great work everyone."),
]

meeting5 = Meeting(
    user_id=1, title="Weekly Engineering Standup",
    date=meeting5_date, duration_seconds=480,
)
for name in ["Marcus Williams", "David Kim", "Rachel Thompson", "Priya Patel", "Alex Sterling"]:
    meeting5.participants.append(participants[name])
meeting5.tags.append(tags["Engineering"])
db.add(meeting5)
db.commit()
db.refresh(meeting5)

current_time = 0.0
for i, (speaker, text) in enumerate(m5_transcript):
    word_count = len(text.split())
    segment_duration = max(6.0, word_count * 0.35)
    seg = TranscriptSegment(
        meeting_id=meeting5.id, speaker_id=participants[speaker].id,
        start_time_seconds=current_time, end_time_seconds=current_time + segment_duration,
        text=text, sequence_order=i + 1,
    )
    db.add(seg)
    current_time += segment_duration + 1.0
meeting5.duration_seconds = int(current_time)
db.commit()

db.add(Summary(
    meeting_id=meeting5.id,
    overview_text=(
        "Weekly engineering standup covering progress on Redis caching, API documentation, marketplace designs, and "
        "authentication refactor. Key updates: Redis caching for meeting search is complete with integration tests in "
        "progress, API docs for new endpoints are finalized, marketplace card designs are approved with responsive layouts, "
        "and the authentication refactor has been merged. Blocker identified: staging environment access needed for file "
        "upload error handling work. Search indexing performance optimization flagged for large datasets. Code freeze for "
        "v2.4 release confirmed for next Wednesday."
    ),
    keywords=["standup", "engineering", "Redis", "caching", "code freeze", "v2.4"],
    generated_at=datetime(2026, 7, 17, 10, 15),
))
db.commit()

for idx, (title, start, end) in enumerate([
    ("Individual Updates", 0, 200),
    ("Technical Discussion", 200, 380),
    ("Reminders & Wrap-up", 380, 480),
], 1):
    db.add(Topic(meeting_id=meeting5.id, title=title, start_time_seconds=start, end_time_seconds=end, sequence_order=idx))

for text, assignee_name, complete in [
    ("Grant staging environment access to Rachel", "Marcus Williams", False),
    ("Optimize search indexing batch size for large datasets", "David Kim", False),
    ("Review Redis caching PR and provide feedback", "Marcus Williams", False),
    ("Ensure all v2.4 PRs are submitted by Tuesday EOD", "Marcus Williams", False),
]:
    db.add(ActionItem(meeting_id=meeting5.id, text=text, assignee_id=participants[assignee_name].id, is_complete=complete))

db.add(Bookmark(meeting_id=meeting5.id, timestamp_seconds=300, note="Search indexing needs optimization"))
db.add(Comment(meeting_id=meeting5.id, author_name="David Kim", text="The batch size issue might be related to our PostgreSQL connection pool settings.", timestamp_seconds=310))
db.add(Soundbite(meeting_id=meeting5.id, title="Code freeze reminder", from_seconds=400, to_seconds=420, speaker_name="Rachel Thompson"))
db.commit()

# ─────────────────────────────────────────────────────────────────────────────
# Meeting 6: Design System Review
# ─────────────────────────────────────────────────────────────────────────────
meeting6_date = datetime(2026, 7, 11, 15, 0, 0)

m6_transcript = [
    ("Priya Patel", "Thanks everyone for joining the design system review. I want to walk through our progress on the component library and get feedback on the new patterns."),
    ("Alex Sterling", "Excited to see this. We've been hearing good things from the dev team about adoption."),
    ("Priya Patel", "Here's what we've shipped so far: button variants (primary, secondary, ghost, destructive), form inputs with validation states, card components, modal dialogs, and our color token system."),
    ("Sarah Chen", "The color tokens are fantastic. Being able to switch between themes with CSS variables makes dark mode trivial to implement later."),
    ("Marcus Williams", "From an engineering perspective, the component API design is really clean. The props are intuitive and the TypeScript types auto-complete perfectly."),
    ("Priya Patel", "That was the goal — developer experience first. Now let me show you what's in progress: the data table component, the navigation patterns, and the meeting card redesign."),
    ("David Kim", "The data table looks great. Can it handle virtual scrolling for large datasets?"),
    ("Priya Patel", "Not yet, that's on the roadmap for next sprint. For now it handles up to 500 rows smoothly. We'll add virtualization for the meeting list view."),
    ("Emily Rodriguez", "From a customer perspective, the meeting card redesign is really impactful. The summary preview and participant avatars make it so much easier to scan."),
    ("Priya Patel", "Thank you. We tested three variants and the current one scored highest in both comprehension speed and preference."),
    ("Alex Sterling", "This is solid work. What's the timeline for completing the full system?"),
    ("Priya Patel", "We're targeting end of Q3 for v1.0 of the design system. That covers all the core components we need for the app."),
    ("Alex Sterling", "Let's make sure we document everything properly so new team members can adopt it quickly."),
    ("Priya Patel", "Already working on it — I have a Storybook setup with interactive examples and usage guidelines for every component."),
]

meeting6 = Meeting(
    user_id=1, title="Design System Review",
    date=meeting6_date, duration_seconds=840,
)
for name in ["Alex Sterling", "Priya Patel", "Sarah Chen", "Marcus Williams", "David Kim", "Emily Rodriguez"]:
    meeting6.participants.append(participants[name])
for tname in ["Design", "Engineering", "Product"]:
    meeting6.tags.append(tags[tname])
db.add(meeting6)
db.commit()
db.refresh(meeting6)

current_time = 0.0
for i, (speaker, text) in enumerate(m6_transcript):
    word_count = len(text.split())
    segment_duration = max(8.0, word_count * 0.35)
    seg = TranscriptSegment(
        meeting_id=meeting6.id, speaker_id=participants[speaker].id,
        start_time_seconds=current_time, end_time_seconds=current_time + segment_duration,
        text=text, sequence_order=i + 1,
    )
    db.add(seg)
    current_time += segment_duration + 1.5
meeting6.duration_seconds = int(current_time)
db.commit()

db.add(Summary(
    meeting_id=meeting6.id,
    overview_text=(
        "Design system review covering completed components, in-progress work, and adoption feedback. Completed: button "
        "variants, form inputs, card components, modal dialogs, and color token system. In progress: data table, navigation "
        "patterns, and meeting card redesign. Engineering feedback is highly positive — clean API design and excellent TypeScript "
        "support. Meeting card redesign tested well with users, scoring highest in comprehension speed. Target v1.0 completion "
        "by end of Q3 with Storybook documentation already in progress."
    ),
    keywords=["design system", "components", "tokens", "Storybook", "meeting cards", "react"],
    generated_at=datetime(2026, 7, 11, 16, 30),
))
db.commit()

for idx, (title, start, end) in enumerate([
    ("Completed Components Overview", 0, 180),
    ("In-Progress Work", 180, 420),
    ("User Testing Results", 420, 600),
    ("Timeline & Documentation", 600, 840),
], 1):
    db.add(Topic(meeting_id=meeting6.id, title=title, start_time_seconds=start, end_time_seconds=end, sequence_order=idx))

for text, assignee_name, complete in [
    ("Implement virtual scrolling for data table component", "Priya Patel", False),
    ("Set up Storybook with interactive examples for all components", "Priya Patel", False),
    ("Write usage guidelines documentation for design system", "Priya Patel", False),
    ("Integrate color tokens into existing meeting list page", "Marcus Williams", False),
]:
    db.add(ActionItem(meeting_id=meeting6.id, text=text, assignee_id=participants[assignee_name].id, is_complete=complete))

db.add(Bookmark(meeting_id=meeting6.id, timestamp_seconds=480, note="Meeting card redesign scored highest in user testing"))
db.add(Comment(meeting_id=meeting6.id, author_name="Marcus Williams", text="The TypeScript integration is the best I've seen in a design system. Great DX.", timestamp_seconds=300))
db.add(Soundbite(meeting_id=meeting6.id, title="Developer experience first", from_seconds=200, to_seconds=220, speaker_name="Priya Patel"))
db.commit()

db.close()

print("Seed complete! Created:")
print("  - 1 User (Alex Sterling)")
print("  - 8 Participants")
print("  - 7 Tags")
print("  - 6 Meetings with full transcripts, summaries, topics, action items")
print("  - Bookmarks, comments, and soundbites for each meeting")
print(f"  - Database: fireflies.db")
