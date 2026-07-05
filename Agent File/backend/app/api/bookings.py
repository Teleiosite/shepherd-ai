from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
import uuid
from datetime import datetime

from app.database import get_db
from app.models.booking import Booking
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


class BookingCreate(BaseModel):
    id: str
    contactId: str
    contactName: str
    contactPhone: str
    purpose: str
    date: str = None
    time: str = None
    notes: str = None


class BookingStatusUpdate(BaseModel):
    status: str


@router.get("/")
async def list_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all bookings."""
    bookings = db.query(Booking).order_by(Booking.created_at.desc()).all()
    
    result = []
    for b in bookings:
        result.append({
            "id": str(b.id),
            "contactId": str(b.contact_id),
            "contactName": b.contact_name,
            "contactPhone": b.contact_phone,
            "purpose": b.purpose,
            "date": b.date,
            "time": b.time,
            "status": b.status,
            "notes": b.notes,
            "createdAt": b.created_at.isoformat() if b.created_at else None,
            "confirmedAt": b.confirmed_at.isoformat() if b.confirmed_at else None
        })
        
    return {"bookings": result}


@router.post("/")
async def create_booking(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new booking."""
    # Check if exists
    existing = db.query(Booking).filter(Booking.id == uuid.UUID(booking_in.id)).first()
    if existing:
        return {"status": "already_exists", "id": booking_in.id}

    booking = Booking(
        id=uuid.UUID(booking_in.id),
        contact_id=uuid.UUID(booking_in.contactId),
        contact_name=booking_in.contactName,
        contact_phone=booking_in.contactPhone,
        purpose=booking_in.purpose,
        date=booking_in.date,
        time=booking_in.time,
        notes=booking_in.notes,
        status="pending"
    )
    
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    return {"status": "created", "id": str(booking.id)}


@router.put("/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status_in: BookingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update status of a booking."""
    booking = db.query(Booking).filter(Booking.id == uuid.UUID(booking_id)).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    booking.status = status_in.status
    if status_in.status == "confirmed":
        booking.confirmed_at = datetime.utcnow()
        
    db.commit()
    db.refresh(booking)
    
    return {"status": "updated", "id": str(booking.id)}


@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a booking record."""
    booking = db.query(Booking).filter(Booking.id == uuid.UUID(booking_id)).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    db.delete(booking)
    db.commit()
    
    return {"status": "deleted"}
