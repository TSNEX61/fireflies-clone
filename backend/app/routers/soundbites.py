from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import Soundbite
from app.schemas.all_schemas import SoundbiteCreate, SoundbiteResponse

router = APIRouter(prefix="/soundbites", tags=["soundbites"])


@router.get("", response_model=List[SoundbiteResponse])
def get_soundbites(meeting_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Soundbite)
    if meeting_id:
        q = q.filter(Soundbite.meeting_id == meeting_id)
    return q.order_by(Soundbite.from_seconds).all()


@router.post("", response_model=SoundbiteResponse)
def create_soundbite(payload: SoundbiteCreate, db: Session = Depends(get_db)):
    soundbite = Soundbite(
        meeting_id=payload.meeting_id,
        title=payload.title,
        from_seconds=payload.from_seconds,
        to_seconds=payload.to_seconds,
        speaker_name=payload.speaker_name,
    )
    db.add(soundbite)
    db.commit()
    db.refresh(soundbite)
    return soundbite


@router.delete("/{id}")
def delete_soundbite(id: int, db: Session = Depends(get_db)):
    soundbite = db.query(Soundbite).filter(Soundbite.id == id).first()
    if not soundbite:
        raise HTTPException(status_code=404, detail="Soundbite not found")
    db.delete(soundbite)
    db.commit()
    return {"detail": "Soundbite deleted"}
