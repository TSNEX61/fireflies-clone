from fastapi import APIRouter, Depends, HTTPException
from typing import List

from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.all_models import ActionItem, Participant
from app.schemas.all_schemas import ActionItemResponse, ActionItemCreate, ActionItemUpdate

router = APIRouter(prefix="/action-items", tags=["action-items"])

@router.get("", response_model=List[ActionItemResponse])
def get_action_items(db: Session = Depends(get_db)):
    return db.query(ActionItem).order_by(ActionItem.created_at.desc()).all()


@router.post("", response_model=ActionItemResponse)
def create_action_item(payload: ActionItemCreate, db: Session = Depends(get_db)):
    # Check if participant exists if assignee_id is specified
    if payload.assignee_id:
        p = db.query(Participant).filter(Participant.id == payload.assignee_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Assignee participant not found")

    action_item = ActionItem(
        meeting_id=payload.meeting_id,
        text=payload.text,
        assignee_id=payload.assignee_id,
        is_complete=payload.is_complete
    )
    db.add(action_item)
    db.commit()
    db.refresh(action_item)
    return action_item

@router.patch("/{id}", response_model=ActionItemResponse)
def update_action_item(id: int, payload: ActionItemUpdate, db: Session = Depends(get_db)):
    action_item = db.query(ActionItem).filter(ActionItem.id == id).first()
    if not action_item:
        raise HTTPException(status_code=404, detail="Action item not found")

    if payload.text is not None:
        action_item.text = payload.text
        
    if payload.assignee_id is not None:
        if payload.assignee_id == 0:  # Use 0 to unassign
            action_item.assignee_id = None
        else:
            p = db.query(Participant).filter(Participant.id == payload.assignee_id).first()
            if not p:
                raise HTTPException(status_code=404, detail="Assignee participant not found")
            action_item.assignee_id = payload.assignee_id
            
    if payload.is_complete is not None:
        action_item.is_complete = payload.is_complete

    db.commit()
    db.refresh(action_item)
    return action_item

@router.delete("/{id}")
def delete_action_item(id: int, db: Session = Depends(get_db)):
    action_item = db.query(ActionItem).filter(ActionItem.id == id).first()
    if not action_item:
        raise HTTPException(status_code=404, detail="Action item not found")

    db.delete(action_item)
    db.commit()
    return {"detail": "Action item successfully deleted"}
