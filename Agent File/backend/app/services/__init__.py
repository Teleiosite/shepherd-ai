"""Services package."""
from app.services.ai_service import generate_message, generate_embedding
from app.services.rag_service import search_knowledge_base, index_resource

__all__ = [
    "generate_message",
    "generate_embedding",
    "search_knowledge_base",
    "index_resource",
]
