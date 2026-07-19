from sqlalchemy import Table, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

# Association Tables
meeting_participants = Table(
    "meeting_participants",
    Base.metadata,
    Column("meeting_id", Integer, ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("participant_id", Integer, ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True)
)

meeting_tags = Table(
    "meeting_tags",
    Base.metadata,
    Column("meeting_id", Integer, ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meetings = relationship("Meeting", back_populates="user", cascade="all, delete-orphan")

class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True, unique=True, index=True)

    # Relationships
    meetings = relationship("Meeting", secondary=meeting_participants, back_populates="participants")
    action_items = relationship("ActionItem", back_populates="assignee")

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    duration_seconds = Column(Integer, nullable=False, default=0)
    media_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="meetings")
    participants = relationship("Participant", secondary=meeting_participants, back_populates="meetings")
    transcript_segments = relationship(
        "TranscriptSegment",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.sequence_order"
    )
    summary = relationship("Summary", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    topics = relationship(
        "Topic",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="Topic.sequence_order"
    )
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=meeting_tags, back_populates="meetings")
    bookmarks = relationship("Bookmark", back_populates="meeting", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="meeting", cascade="all, delete-orphan")
    soundbites = relationship("Soundbite", back_populates="meeting", cascade="all, delete-orphan")

class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    speaker_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    start_time_seconds = Column(Float, nullable=False)
    end_time_seconds = Column(Float, nullable=False)
    text = Column(String, nullable=False)
    sequence_order = Column(Integer, nullable=False)

    # Relationships
    meeting = relationship("Meeting", back_populates="transcript_segments")
    speaker = relationship("Participant")

class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), unique=True, nullable=False)
    overview_text = Column(String, nullable=False)
    keywords = Column(JSON, nullable=False)  # Store JSON list of keywords
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    meeting = relationship("Meeting", back_populates="summary")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    start_time_seconds = Column(Float, nullable=True)
    end_time_seconds = Column(Float, nullable=True)
    sequence_order = Column(Integer, nullable=False)

    # Relationships
    meeting = relationship("Meeting", back_populates="topics")

class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    assignee_id = Column(Integer, ForeignKey("participants.id", ondelete="SET NULL"), nullable=True)
    is_complete = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    meeting = relationship("Meeting", back_populates="action_items")
    assignee = relationship("Participant", back_populates="action_items")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)

    # Relationships
    meetings = relationship("Meeting", secondary=meeting_tags, back_populates="tags")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    timestamp_seconds = Column(Float, nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="bookmarks")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    author_name = Column(String, nullable=False)
    text = Column(String, nullable=False)
    timestamp_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="comments")


class Soundbite(Base):
    __tablename__ = "soundbites"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    from_seconds = Column(Float, nullable=False)
    to_seconds = Column(Float, nullable=False)
    speaker_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="soundbites")
