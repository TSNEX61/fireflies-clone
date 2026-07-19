from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.all_models import Participant, User
from app.schemas.all_schemas import ParticipantResponse, UserResponse

router = APIRouter(tags=["users-and-participants"])

@router.get("/participants", response_model=List[ParticipantResponse])
def get_participants(db: Session = Depends(get_db)):
    return db.query(Participant).all()

@router.get("/users/current", response_model=UserResponse)
def get_current_user(db: Session = Depends(get_db)):
    # Check if default user exists, if not create one
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        user = User(id=1, name="Default User", email="user@fireflies.ai", avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
