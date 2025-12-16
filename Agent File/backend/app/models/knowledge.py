from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
import uuid

from app.database import Base


class KnowledgeResource(Base):
    """Knowledge base resource model."""
    
    __tablename__ = "knowledge_resources"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # book, sermon, devotional
    content = Column(String, nullable=False)
    file_name = Column(String(255), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="knowledge_resources")
    creator = relationship("User", back_populates="created_resources", foreign_keys=[created_by])
    embeddings = relationship("KnowledgeEmbedding", back_populates="resource", cascade="all, delete-orphan")


class KnowledgeEmbedding(Base):
    """Vector embeddings for knowledge base chunks."""
    
    __tablename__ = "knowledge_embeddings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_resources.id", ondelete="CASCADE"), nullable=False)
    chunk_text = Column(String, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector(768), nullable=True)  # Google Embedding API dimension
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    resource = relationship("KnowledgeResource", back_populates="embeddings")
    
    # Indexes
    __table_args__ = (
        Index('idx_embeddings_resource', 'resource_id'),
        Index('idx_embeddings_vector', 'embedding', postgresql_using='ivfflat', postgresql_ops={'embedding': 'vector_cosine_ops'}),
    )
