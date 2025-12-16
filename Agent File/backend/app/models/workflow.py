from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class WorkflowStep(Base):
    """Workflow step model for automated follow-ups."""
    
    __tablename__ = "workflow_steps"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(100), nullable=False)
    day = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    prompt = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="workflow_steps")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('organization_id', 'category', 'day', name='uq_org_category_day'),
    )
