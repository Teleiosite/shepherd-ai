from sqlalchemy import Column, String, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class Booking(Base):
    """Booking/Appointment model for scheduling sessions/registrations."""
    
    __tablename__ = "bookings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    contact_name = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    purpose = Column(String(255), nullable=False)
    date = Column(String(50), nullable=True)  # YYYY-MM-DD format
    time = Column(String(50), nullable=True)  # HH:MM format
    status = Column(String(50), default="pending")  # pending, confirmed, cancelled, completed
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    contact = relationship("Contact", backref="bookings")

    __table_args__ = (
        Index('idx_bookings_contact_id', 'contact_id'),
        Index('idx_bookings_status', 'status'),
    )
