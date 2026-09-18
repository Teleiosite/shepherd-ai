"""RAG Service for retrieving knowledge base context."""
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.services.ai_service import generate_embedding
from app.models.knowledge import KnowledgeResource, KnowledgeEmbedding
from typing import List, Tuple, Optional


async def search_knowledge_base(
    db: Session,
    organization_id: str,
    query: str,
    limit: int = 3,
    api_key: Optional[str] = None
) -> List[Tuple[KnowledgeResource, float]]:
    """
    Search the knowledge base using vector similarity with full text keyword fallback.
    
    Args:
        db: Database session
        organization_id: Organization ID to scope search
        query: Search query
        limit: Number of results to return
        api_key: Optional AI API key for generating embedding
        
    Returns:
        List of (KnowledgeResource, similarity_score) tuples
    """
    resources = []
    seen_ids = set()

    clean_q = query.strip().lower()
    # Fast greeting check across English, Yoruba, Pidgin, Hausa, Igbo, and short utterances
    GREETING_INDICATORS = {
        "hello", "hi", "hey", "good morning", "good afternoon", "good evening", "good day",
        "ok", "okay", "wow", "great", "thanks", "thank you", "bye", "are you there",
        "bawo", "bawo ni", "se dada", "dada", "le wa", "see dada", "ekaaro", "ekaasan",
        "how far", "how you dey", "how body", "wetin dey", "i dey", "we dey", "you dey",
        "sannu", "ina kwana", "lafiya", "kedu", "kedu kwanu", "daalu", "nnoo"
    }
    is_greeting_or_short = len(clean_q) < 8 or any(g in clean_q for g in GREETING_INDICATORS)

    # If it is a greeting or pleasantry, skip knowledge search completely (0ms)
    if is_greeting_or_short:
        return []

    # Quick check: does this organization have any knowledge resources?
    try:
        has_kb = db.query(KnowledgeResource.id).filter(KnowledgeResource.organization_id == organization_id).first()
        if not has_kb:
            return []
    except Exception:
        return []

    # 1. Ultra-fast direct text/keyword search in PostgreSQL (<5ms, zero network delay)
    stop_words = {
        "what", "where", "when", "which", "tell", "have", "with", "from", "show", "please",
        "want", "need", "about", "your", "this", "that", "there", "some", "like", "know"
    }
    words = [w.strip() for w in clean_q.split() if len(w.strip()) > 2 and w not in stop_words]
    if words:
        from sqlalchemy import or_
        query_filters = []
        for word in words[:5]:
            query_filters.append(KnowledgeResource.title.ilike(f"%{word}%"))
            query_filters.append(KnowledgeResource.content.ilike(f"%{word}%"))
        
        try:
            fb_results = db.query(KnowledgeResource).filter(
                KnowledgeResource.organization_id == organization_id,
                or_(*query_filters)
            ).limit(limit).all()

            for res in fb_results:
                if res.id not in seen_ids:
                    resources.append((res, 0.9))
                    seen_ids.add(res.id)
        except Exception as kw_err:
            pass

    return resources


async def index_resource(db: Session, resource_id: str):
    """
    Generate embeddings for a resource and save to database.
    
    Args:
        db: Database session
        resource_id: ID of resource to index
    """
    resource = db.query(KnowledgeResource).filter(KnowledgeResource.id == resource_id).first()
    if not resource:
        return
        
    # Simple chunking strategy (split by paragraphs or fixed size)
    # For production, use a proper text splitter like LangChain's RecursiveCharacterTextSplitter
    chunks = [chunk for chunk in resource.content.split('\n\n') if chunk.strip()]
    
    for i, chunk_text in enumerate(chunks):
        if not chunk_text.strip():
            continue
            
        embedding = await generate_embedding(chunk_text)
        
        if embedding:
            db_embedding = KnowledgeEmbedding(
                resource_id=resource.id,
                chunk_text=chunk_text,
                chunk_index=i,
                embedding=embedding
            )
            db.add(db_embedding)
            
    db.commit()
