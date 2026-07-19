from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import Comment
from app.schemas.all_schemas import CommentCreate, CommentResponse

router = APIRouter(prefix="/comments", tags=["comments"])


@router.get("", response_model=List[CommentResponse])
def get_comments(meeting_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Comment)
    if meeting_id:
        q = q.filter(Comment.meeting_id == meeting_id)
    return q.order_by(Comment.created_at.desc()).all()


@router.post("", response_model=CommentResponse)
def create_comment(payload: CommentCreate, db: Session = Depends(get_db)):
    comment = Comment(
        meeting_id=payload.meeting_id,
        author_name=payload.author_name,
        text=payload.text,
        timestamp_seconds=payload.timestamp_seconds,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{id}")
def delete_comment(id: int, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
    return {"detail": "Comment deleted"}
