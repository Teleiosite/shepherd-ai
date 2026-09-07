from sqlalchemy import Column, String, Numeric, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class CatalogItem(Base):
    """
    Universal Catalog Item model.
    Represents any product, rental vehicle, property, healthcare service,
    or business offering across any industry.
    """
    __tablename__ = "catalog_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=True)

    price_amount = Column(Numeric(12, 2), nullable=True)
    price_currency = Column(String(10), nullable=True, default="NGN")
    price_unit = Column(String(50), nullable=True, default="per day")  # "per day", "per night", "per session", "fixed"

    image_url = Column(String(500), nullable=True)
    action_url = Column(String(500), nullable=True)  # Direct booking, checkout, or details URL
    
    # Key-value JSON attributes (e.g. {"color": "Grey", "drive_mode": "Self-Drive", "location": "Ikeja", "seats": 5})
    attributes = Column(JSONB, nullable=True, default=dict)

    is_available = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    organization = relationship("Organization", back_populates="catalog_items")
