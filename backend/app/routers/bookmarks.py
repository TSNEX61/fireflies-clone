from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import Bookmark
from app.schemas.all_schemas import BookmarkCreate, BookmarkResponse

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.get("", response_model=List[BookmarkResponse])
def get_bookmarks(meeting_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Bookmark)
    if meeting_id:
        q = q.filter(Bookmark.meeting_id == meeting_id)
    return q.order_by(Bookmark.timestamp_seconds).all()


@router.post("", response_model=BookmarkResponse)
def create_bookmark(payload: BookmarkCreate, db: Session = Depends(get_db)):
    bookmark = Bookmark(
        meeting_id=payload.meeting_id,
        timestamp_seconds=payload.timestamp_seconds,
        note=payload.note,
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return bookmark


@router.delete("/{id}")
def delete_bookmark(id: int, db: Session = Depends(get_db)):
    bookmark = db.query(Bookmark).filter(Bookmark.id == id).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bookmark)
    db.commit()
    return {"detail": "Bookmark deleted"}
