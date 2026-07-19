import re
from datetime import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.all_models import Meeting, Participant, TranscriptSegment, Summary, Topic, ActionItem, Tag, meeting_participants

COMMON_KEYWORDS = [
    "roadmap", "database", "frontend", "backend", "security", "deployment", 
    "design", "marketing", "metrics", "API", "bug", "features", "testing",
    "budget", "analytics", "release", "UI", "UX", "sprint", "documentation"
]

TOPIC_SECTIONS = [
    {"keywords": ["hello", "welcome", "kickoff", "start", "morning"], "title": "Meeting Kickoff & Agenda Outline"},
    {"keywords": ["worked on", "update", "progress", "yesterday", "status"], "title": "Status Updates & Current Progress"},
    {"keywords": ["database", "api", "backend", "frontend", "code", "architecture"], "title": "Technical Design & Architecture Discussion"},
    {"keywords": ["bug", "issue", "blocker", "fix", "testing", "failed"], "title": "Blockers, Bugs, & Quality Assurance"},
    {"keywords": ["timeline", "sprint", "milestone", "roadmap", "launch", "release"], "title": "Roadmap Alignment & Sprint Planning"},
    {"keywords": ["action", "todo", "task", "will do", "assign", "wrap up"], "title": "Action Item Wrap-up & Next Steps"}
]

def parse_transcript_lines(transcript_text: str) -> List[Tuple[str, str]]:
    """
    Parses transcript into speaker and text tuple lines.
    Handles formats like:
      Speaker A: text
      [00:12] Speaker A: text
      Speaker A (00:12): text
    """
    parsed = []
    lines = transcript_text.strip().split("\n")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Try to match: [00:00:12] Name: text or similar
        match = re.match(r"^(?:\[\d{2}:\d{2}:?\d{2}?\])?\s*([^:(]+?)(?:\s*\(\d{2}:\d{2}:?\d{2}?\))?\s*:\s*(.*)$", line)
        if match:
            speaker_name = match.group(1).strip()
            text = match.group(2).strip()
            parsed.append((speaker_name, text))
        else:
            # Fallback if no colon is found
            parsed.append(("Speaker", line))
            
    return parsed

def generate_mock_meeting_data(
    db: Session,
    meeting_title: str,
    transcript_text: str,
    user_id: int
) -> Meeting:
    """
    Creates a full Meeting record including parsed participants, transcript segments,
    structured summary, topics, and action items.
    """
    # 1. Parse text lines
    parsed_lines = parse_transcript_lines(transcript_text)
    if not parsed_lines:
        parsed_lines = [("Host", "No transcript could be parsed. This is a default placeholder segment.")]

    # 2. Extract and create participants
    speaker_names = set(item[0] for item in parsed_lines)
    participants_dict: Dict[str, Participant] = {}
    
    for name in speaker_names:
        # Check if participant exists, otherwise create
        p = db.query(Participant).filter(Participant.name == name).first()
        if not p:
            # Generate email
            email_safe = re.sub(r"[^a-zA-Z0-9]", "", name).lower()
            p = Participant(name=name, email=f"{email_safe}@example.com")
            db.add(p)
            db.commit()
            db.refresh(p)
        participants_dict[name] = p

    # 3. Create Meeting record
    duration = len(parsed_lines) * 15  # Assume ~15 seconds per segment
    meeting = Meeting(
        user_id=user_id,
        title=meeting_title,
        date=datetime.utcnow(),
        duration_seconds=duration,
        media_url=None
    )
    
    # Associate participants with meeting
    for p in participants_dict.values():
        meeting.participants.append(p)
        
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # 4. Create Transcript Segments
    current_time = 0.0
    for idx, (speaker_name, text) in enumerate(parsed_lines):
        speaker = participants_dict[speaker_name]
        segment_duration = max(5.0, len(text.split()) * 0.4)  # ~150 words per minute -> 2.5 words per sec
        
        segment = TranscriptSegment(
            meeting_id=meeting.id,
            speaker_id=speaker.id,
            start_time_seconds=current_time,
            end_time_seconds=current_time + segment_duration,
            text=text,
            sequence_order=idx + 1
        )
        db.add(segment)
        current_time += segment_duration + 1.0  # Add a tiny gap between segments
        
    db.commit()
    
    # Update duration based on segments
    meeting.duration_seconds = int(current_time)
    db.commit()

    # 5. Extract Keywords
    full_text = " ".join(item[1] for item in parsed_lines).lower()
    found_keywords = []
    for kw in COMMON_KEYWORDS:
        if re.search(r"\b" + re.escape(kw) + r"\b", full_text):
            found_keywords.append(kw.capitalize())
    if not found_keywords:
        found_keywords = ["Discussion", "Collaboration", "Status Check"]
    found_keywords = found_keywords[:6]  # Max 6 keywords

    # 6. Generate Summary Overview
    summary_text = (
        f"This meeting, titled '{meeting_title}', focused on a sync session between "
        f"{', '.join(speaker_names)}. "
    )
    if "roadmap" in full_text or "sprint" in full_text:
        summary_text += "The participants discussed sprint alignments, milestone roadmap goals, and release coordination. "
    if "database" in full_text or "api" in full_text or "backend" in full_text:
        summary_text += "A significant portion of the time was spent detailing the database design, API routing, and backend systems integrations. "
    if "bug" in full_text or "issue" in full_text or "testing" in full_text:
        summary_text += "The team addressed outstanding blockers, bug tracking, and QA testing criteria to verify correctness. "
    summary_text += "The conversation concluded with a clear checklist of action items, ownership assignments, and next steps."

    summary = Summary(
        meeting_id=meeting.id,
        overview_text=summary_text,
        keywords=found_keywords,
        generated_at=datetime.utcnow()
    )
    db.add(summary)

    # 7. Generate Topics / Chapters based on conversation checkpoints
    num_segments = len(parsed_lines)
    segment_duration_total = current_time
    chunk_size = max(1, num_segments // 3)  # Divide into up to 3 topics/chapters
    
    current_segment_idx = 0
    topic_order = 1
    
    # Gather segments by sequence
    segments = db.query(TranscriptSegment).filter(TranscriptSegment.meeting_id == meeting.id).order_by(TranscriptSegment.sequence_order).all()
    
    while current_segment_idx < num_segments:
        start_seg = segments[current_segment_idx]
        end_seg_idx = min(current_segment_idx + chunk_size - 1, num_segments - 1)
        end_seg = segments[end_seg_idx]
        
        # Decide topic title
        segment_words = " ".join(s.text.lower() for s in segments[current_segment_idx : end_seg_idx + 1])
        selected_title = f"Topic {topic_order}: General Discussion"
        for section in TOPIC_SECTIONS:
            if any(k in segment_words for k in section["keywords"]):
                selected_title = section["title"]
                break
        
        # Ensure title changes to be unique
        if topic_order == 1:
            selected_title = "Meeting Kickoff & Initial Sync"
        elif end_seg_idx == num_segments - 1:
            selected_title = "Wrap-up & Action Item Sync"
            
        topic = Topic(
            meeting_id=meeting.id,
            title=selected_title,
            start_time_seconds=start_seg.start_time_seconds,
            end_time_seconds=end_seg.end_time_seconds,
            sequence_order=topic_order
        )
        db.add(topic)
        current_segment_idx = end_seg_idx + 1
        topic_order += 1

    # 8. Generate Action Items
    action_item_idx = 0
    for idx, (speaker_name, text) in enumerate(parsed_lines):
        text_lower = text.lower()
        # Look for action-item patterns
        action_match = re.search(
            r"\b(i will|will handle|please do|needs to|action item|task to|going to|should write|would work on)\b\s*([^.?!]+)",
            text_lower
        )
        if action_match:
            assignee = participants_dict[speaker_name]
            raw_action = action_match.group(2).strip()
            
            # Clean up raw action text
            cleaned_action = raw_action.capitalize()
            # If action item text is too short, skip or use speaker context
            if len(cleaned_action.split()) > 2:
                # Limit length
                cleaned_action = " ".join(cleaned_action.split()[:12])
                
                action_item = ActionItem(
                    meeting_id=meeting.id,
                    text=f"{cleaned_action}",
                    assignee_id=assignee.id,
                    is_complete=False,
                    created_at=datetime.utcnow()
                )
                db.add(action_item)
                action_item_idx += 1
                
    # If no action items were found, insert 2 generic ones to ensure the seeded structure
    if action_item_idx == 0:
        for idx, (name, p) in enumerate(participants_dict.items()):
            if idx >= 2:
                break
            action_item = ActionItem(
                meeting_id=meeting.id,
                text=f"Review discussed tasks and schedule follow-up",
                assignee_id=p.id,
                is_complete=False,
                created_at=datetime.utcnow()
            )
            db.add(action_item)

    db.commit()
    db.refresh(meeting)
    return meeting
