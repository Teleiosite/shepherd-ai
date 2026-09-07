from sqlalchemy import Column, String, Integer, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class Organization(Base):
    """Organization/Church model."""
    
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    ai_name = Column(String(255), default="Shepherd AI")
    whatsapp_phone_id = Column(String(255), nullable=True)
    whatsapp_business_account_id = Column(String(255), nullable=True)
    whatsapp_access_token = Column(String, nullable=True)
    wppconnect_bridge_url = Column(String, nullable=True, default="http://localhost:3001")
    
    # AI Provider & Agent Configuration
    ai_provider = Column(String(50), nullable=True, default="gemini")
    ai_api_key = Column(String, nullable=True)
    ai_model = Column(String(100), nullable=True, default="gemini-2.0-flash")
    ai_base_url = Column(String, nullable=True)
    ai_auto_reply_enabled = Column(String, nullable=True, default="false")  # "true" or "false"
    ai_reply_mode = Column(String(50), nullable=True, default="suggest")    # "suggest" or "auto-send"
    ai_reply_delay_seconds = Column(String, nullable=True, default="5")
    ai_tone = Column(String, nullable=True, default="Warm, professional, and helpful.")
    ai_payment_link = Column(String, nullable=True)
    ai_business_type = Column(String(100), nullable=True, default="Organization")
    ai_voice_reply_mode = Column(String(50), nullable=True, default="text")  # "text", "match_input", "voice"
    ai_voice_name = Column(String(100), nullable=True, default="en-NG-EzinneNeural")
    
    # SaaS Subscription & Quotas
    subscription_plan = Column(String(50), nullable=True, default="starter")  # "starter", "growth", "enterprise"
    subscription_status = Column(String(50), nullable=True, default="active")  # "active", "trialing", "past_due"
    monthly_message_limit = Column(Integer, nullable=True, default=1000)
    messages_used_this_month = Column(Integer, nullable=True, default=0)
    paystack_subscription_code = Column(String(100), nullable=True)

    # Universal Catalog & External Webhook
    catalog_mode = Column(String(50), nullable=True, default="internal")  # "internal", "external_webhook"
    external_search_webhook_url = Column(String(500), nullable=True)
    external_search_webhook_secret = Column(String(255), nullable=True)

    # Web Chat Widget Customization
    widget_primary_color = Column(String(20), nullable=True, default="#0d9488")
    widget_welcome_message = Column(Text, nullable=True, default="Hello! How can we help you today?")
    widget_position = Column(String(20), nullable=True, default="bottom-right")
    widget_avatar_url = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="organization", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="organization", cascade="all, delete-orphan")
    knowledge_resources = relationship("KnowledgeResource", back_populates="organization", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="organization", cascade="all, delete-orphan")
    workflow_steps = relationship("WorkflowStep", back_populates="organization", cascade="all, delete-orphan")
    groups = relationship("Group", back_populates="organization", cascade="all, delete-orphan")
    catalog_items = relationship("CatalogItem", back_populates="organization", cascade="all, delete-orphan")
