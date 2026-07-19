from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
from typing import List, Optional
from datetime import datetime
from app.db.session import get_db
from app.models.all_models import Meeting, Participant, TranscriptSegment, Summary, Topic, ActionItem, Tag, meeting_participants
from app.schemas.all_schemas import (
    MeetingResponse, MeetingDetailResponse, MeetingCreate, MeetingUpdate, 
    TranscriptSearchMatch, TranscriptSegmentResponse
)
from app.services.generator import generate_mock_meeting_data

router = APIRouter(prefix="/meetings", tags=["meetings"])

def build_emoji_summary(meeting: Meeting) -> List[str]:
    """
    Computes a signature Fireflies 2-4 emoji bullet summary points for card layout.
    """
    bullets = []
    
    # Bullet 1: Discussed topics
    if meeting.topics:
        first_topic = meeting.topics[0].title
        # Truncate if long
        if len(first_topic) > 30:
            first_topic = first_topic[:27] + "..."
        bullets.append(f"🔎 Discussed {first_topic}")
    elif meeting.summary and meeting.summary.keywords:
        kws = meeting.summary.keywords[:2]
        bullets.append(f"🔎 Keywords: {', '.join(kws)}")
    else:
        bullets.append("🔎 General status check")

    # Bullet 2: Action items
    action_count = len(meeting.action_items)
    if action_count > 0:
        incomplete = sum(1 for ai in meeting.action_items if not ai.is_complete)
        if incomplete > 0:
            bullets.append(f"✅ Assigned {action_count} items ({incomplete} remaining)")
        else:
            bullets.append(f"✅ All {action_count} action items completed")
    else:
        bullets.append("✅ No action items assigned")

    # Bullet 3: Participant sync info
    p_count = len(meeting.participants)
    if p_count > 1:
        bullets.append(f"👥 Sync between {p_count} active speakers")
    else:
        bullets.append("👥 Individual session recording")

    return bullets

@router.get("", response_model=List[MeetingResponse])
def get_meetings(
    search: Optional[str] = Query(None, description="Search by title, speaker, or topic"),
    sort: Optional[str] = Query("newest", description="Sort by newest, oldest, or duration"),
    participant: Optional[int] = Query(None, description="Filter by participant ID"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db)
):
    query = db.query(Meeting)

    # 1. Filters
    # Participant filter
    if participant:
        query = query.filter(Meeting.participants.any(Participant.id == participant))

    # Date filters
    if date_from:
        query = query.filter(Meeting.date >= date_from)
    if date_to:
        query = query.filter(Meeting.date <= date_to)

    # Search filter (title, speaker name, or topic title)
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.join(Meeting.participants, isouter=True).join(Meeting.topics, isouter=True)
        query = query.filter(
            or_(
                Meeting.title.ilike(search_lower),
                Participant.name.ilike(search_lower),
                Topic.title.ilike(search_lower)
            )
        )
        # Ensure we don't return duplicate meetings due to joins
        query = query.distinct()

    # 2. Sorting
    if sort == "oldest":
        query = query.order_by(Meeting.date.asc())
    elif sort == "duration":
        query = query.order_by(desc(Meeting.duration_seconds))
    else:  # newest
        query = query.order_by(desc(Meeting.date))

    meetings = query.all()

    # Apply computed emoji summary mapping
    for m in meetings:
        m.emoji_summary = build_emoji_summary(m)

    return meetings

@router.get("/search/global")
def global_search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    q_lower = q.lower()
    matching_segments = db.query(TranscriptSegment)\
        .filter(TranscriptSegment.text.ilike(f"%{q_lower}%"))\
        .all()
        
    results_map = {}
    for seg in matching_segments:
        m_id = seg.meeting_id
        if m_id not in results_map:
            meeting = db.query(Meeting).filter(Meeting.id == m_id).first()
            if meeting:
                results_map[m_id] = {
                    "id": meeting.id,
                    "title": meeting.title,
                    "date": meeting.date.isoformat() if meeting.date else None,
                    "speaker_name": seg.speaker.name,
                    "speaker_initial": seg.speaker.name[0] if seg.speaker.name else "U",
                    "match_count": 0,
                    "matches": []
                }
        if m_id in results_map:
            results_map[m_id]["match_count"] += 1
            if len(results_map[m_id]["matches"]) < 3:
                results_map[m_id]["matches"].append(seg.text)
            
    return list(results_map.values())

@router.get("/{id}", response_model=MeetingDetailResponse)
def get_meeting_detail(id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Map emoji summaries
    meeting.emoji_summary = build_emoji_summary(meeting)
    return meeting

@router.post("", response_model=MeetingDetailResponse)
def create_meeting(
    title: str = Form(...),
    date: Optional[str] = Form(None),
    duration_seconds: Optional[int] = Form(None),
    media_url: Optional[str] = Form(None),
    transcript_text: Optional[str] = Form(None),
    participant_ids: Optional[List[int]] = Form(None),
    tag_names: Optional[List[str]] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Retrieve default user (id=1, will create user in seed script)
    # Check if default user exists, if not create one
    from app.models.all_models import User
    default_user = db.query(User).filter(User.id == 1).first()
    if not default_user:
        default_user = User(id=1, name="Default User", email="user@fireflies.ai", avatar_url=None)
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    # 1. Parse dates/text
    meeting_date = datetime.utcnow()
    if date:
        try:
            meeting_date = datetime.fromisoformat(date.replace("Z", "+00:00"))
        except ValueError:
            pass

    # Read uploaded file if present
    content = transcript_text or ""
    if file:
        file_bytes = file.file.read()
        content = file_bytes.decode("utf-8")

    # If no transcript or text was supplied, create a mock conversation
    if not content.strip():
        content = (
            "Host: Welcome everyone to our project sync. Let's make sure we review the roadmap.\n"
            "Developer: Yes, I am going to write the database schemas today.\n"
            "Designer: I will design the welcome dashboard layouts tomorrow.\n"
            "Host: Excellent work. Let's meet again next week."
        )

    # 2. Generate database nodes via the generator service
    meeting = generate_mock_meeting_data(db, title, content, default_user.id)

    # Overwrite duration/media URL if manually provided
    if duration_seconds:
        meeting.duration_seconds = duration_seconds
    if media_url:
        meeting.media_url = media_url
    if meeting_date:
        meeting.date = meeting_date

    # Associate manually requested participants
    if participant_ids:
        meeting.participants = []
        for pid in participant_ids:
            p = db.query(Participant).filter(Participant.id == pid).first()
            if p:
                meeting.participants.append(p)

    # Associate tags
    if tag_names:
        meeting.tags = []
        for name in tag_names:
            tag_name = name.strip()
            if not tag_name:
                continue
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
                db.commit()
                db.refresh(tag)
            meeting.tags.append(tag)

    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # Attach computed emoji summary
    meeting.emoji_summary = build_emoji_summary(meeting)
    return meeting

@router.patch("/{id}", response_model=MeetingDetailResponse)
def update_meeting(id: int, payload: MeetingUpdate, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if payload.title is not None:
        meeting.title = payload.title

    if payload.participant_ids is not None:
        meeting.participants = []
        for pid in payload.participant_ids:
            p = db.query(Participant).filter(Participant.id == pid).first()
            if p:
                meeting.participants.append(p)

    if payload.tag_names is not None:
        meeting.tags = []
        for name in payload.tag_names:
            tag_name = name.strip()
            if not tag_name:
                continue
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
                db.commit()
                db.refresh(tag)
            meeting.tags.append(tag)

    db.commit()
    db.refresh(meeting)

    # Attach computed emoji summary
    meeting.emoji_summary = build_emoji_summary(meeting)
    return meeting

@router.delete("/{id}")
def delete_meeting(id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    db.delete(meeting)
    db.commit()
    return {"detail": "Meeting successfully deleted"}

@router.get("/{id}/transcript/search", response_model=List[TranscriptSearchMatch])
def search_transcript(id: int, q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Fetch all segments in order
    all_segments = db.query(TranscriptSegment)\
        .filter(TranscriptSegment.meeting_id == id)\
        .order_by(TranscriptSegment.sequence_order)\
        .all()

    matches = []
    q_lower = q.lower()

    for idx, seg in enumerate(all_segments):
        if q_lower in seg.text.lower():
            # Extract 2 segments before
            start_before = max(0, idx - 2)
            context_before = all_segments[start_before:idx]
            
            # Extract 2 segments after
            end_after = min(len(all_segments), idx + 3)
            context_after = all_segments[idx + 1:end_after]

            matches.append(
                TranscriptSearchMatch(
                    segment=TranscriptSegmentResponse.model_validate(seg),
                    context_before=[TranscriptSegmentResponse.model_validate(s) for s in context_before],
                    context_after=[TranscriptSegmentResponse.model_validate(s) for s in context_after]
                )
            )

    return matches
