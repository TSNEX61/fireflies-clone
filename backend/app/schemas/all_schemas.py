from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Participant Schemas
class ParticipantBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None

class ParticipantCreate(ParticipantBase):
    pass

class ParticipantResponse(ParticipantBase):
    id: int

    class Config:
        from_attributes = True

# Tag Schemas
class TagBase(BaseModel):
    name: str

class TagResponse(TagBase):
    id: int

    class Config:
        from_attributes = True

# Transcript Segment Schemas
class TranscriptSegmentBase(BaseModel):
    speaker_id: int
    start_time_seconds: float
    end_time_seconds: float
    text: str
    sequence_order: int

class TranscriptSegmentCreate(TranscriptSegmentBase):
    pass

class TranscriptSegmentResponse(TranscriptSegmentBase):
    id: int
    speaker: ParticipantResponse

    class Config:
        from_attributes = True

# Summary Schemas
class SummaryBase(BaseModel):
    overview_text: str
    keywords: List[str]

class SummaryResponse(SummaryBase):
    id: int
    meeting_id: int
    generated_at: datetime

    class Config:
        from_attributes = True

# Topic Schemas
class TopicBase(BaseModel):
    title: str
    start_time_seconds: Optional[float] = None
    end_time_seconds: Optional[float] = None
    sequence_order: int

class TopicResponse(TopicBase):
    id: int

    class Config:
        from_attributes = True

# Action Item Schemas
class ActionItemBase(BaseModel):
    text: str
    assignee_id: Optional[int] = None
    is_complete: bool = False

class ActionItemCreate(ActionItemBase):
    meeting_id: int

class ActionItemUpdate(BaseModel):
    text: Optional[str] = None
    assignee_id: Optional[int] = None
    is_complete: Optional[bool] = None

class ActionItemResponse(ActionItemBase):
    id: int
    meeting_id: int
    created_at: datetime
    assignee: Optional[ParticipantResponse] = None

    class Config:
        from_attributes = True

# Meeting Schemas
class MeetingBase(BaseModel):
    title: str
    date: datetime
    duration_seconds: int
    media_url: Optional[str] = None

class MeetingCreate(BaseModel):
    title: str
    date: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    media_url: Optional[str] = None
    # For creation, we accept either raw form data or uploaded transcript text
    transcript_text: Optional[str] = None 
    participant_ids: Optional[List[int]] = None
    tag_names: Optional[List[str]] = None

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    participant_ids: Optional[List[int]] = None
    tag_names: Optional[List[str]] = None

class MeetingResponse(MeetingBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    participants: List[ParticipantResponse]
    tags: List[TagResponse]
    # Signature emoji-prefixed points computed on response mapping
    emoji_summary: List[str] = []

    class Config:
        from_attributes = True

# Bookmark Schemas
class BookmarkCreate(BaseModel):
    meeting_id: int
    timestamp_seconds: float
    note: Optional[str] = None

class BookmarkResponse(BaseModel):
    id: int
    meeting_id: int
    timestamp_seconds: float
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Comment Schemas
class CommentCreate(BaseModel):
    meeting_id: int
    author_name: str
    text: str
    timestamp_seconds: Optional[float] = None

class CommentResponse(BaseModel):
    id: int
    meeting_id: int
    author_name: str
    text: str
    timestamp_seconds: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Soundbite Schemas
class SoundbiteCreate(BaseModel):
    meeting_id: int
    title: str
    from_seconds: float
    to_seconds: float
    speaker_name: Optional[str] = None

class SoundbiteResponse(BaseModel):
    id: int
    meeting_id: int
    title: str
    from_seconds: float
    to_seconds: float
    speaker_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Full Meeting Detail Response
class MeetingDetailResponse(MeetingResponse):
    transcript_segments: List[TranscriptSegmentResponse]
    summary: Optional[SummaryResponse] = None
    topics: List[TopicResponse]
    action_items: List[ActionItemResponse]
    bookmarks: List[BookmarkResponse] = []
    comments: List[CommentResponse] = []
    soundbites: List[SoundbiteResponse] = []

    class Config:
        from_attributes = True

# Search segment item response
class TranscriptSearchMatch(BaseModel):
    segment: TranscriptSegmentResponse
    context_before: List[TranscriptSegmentResponse]
    context_after: List[TranscriptSegmentResponse]
