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
    is_greeting_or_short = len(clean_q) < 8 or clean_q in [
        "hello", "hi", "hey", "good morning", "good afternoon", "good evening", 
        "ok", "okay", "wow", "great", "wow that's great", "thanks", "thank you", "bye", "are you there"
    ]

    # Quick check: does this organization have any knowledge resources?
    # If not, return immediately to eliminate latency and avoid any external API calls
    try:
        has_kb = db.query(KnowledgeResource.id).filter(KnowledgeResource.organization_id == organization_id).first()
        if not has_kb:
            return []
    except Exception:
        pass

    # 1. Fast text/keyword search first (Instant < 5ms directly in database)
    if not is_greeting_or_short and clean_q:
        words = [w.strip() for w in clean_q.split() if len(w.strip()) > 3 and w not in ("what", "where", "when", "which", "tell", "have", "with", "from", "show", "please", "want", "need")]
        if words:
            from sqlalchemy import or_
            query_filters = []
            for word in words[:4]:
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

    # 2. If keyword search found relevant resources, return immediately (eliminates 2-4s embedding API call)
    if resources:
        return resources

    # 3. Vector search fallback only if keyword search had no match and embeddings actually exist
    if not is_greeting_or_short:
        has_embeddings = False
        try:
            emb_check = db.query(KnowledgeEmbedding.id).join(KnowledgeResource).filter(
                KnowledgeResource.organization_id == organization_id
            ).first()
            has_embeddings = bool(emb_check)
        except Exception:
            has_embeddings = False

        if has_embeddings:
            try:
                query_embedding = await generate_embedding(query, api_key=api_key)
                if query_embedding:
                    sql = text("""
                        SELECT resource_id, chunk_text, 1 - (embedding <=> :embedding) as similarity
                        FROM knowledge_embeddings
                        JOIN knowledge_resources ON knowledge_embeddings.resource_id = knowledge_resources.id
                        WHERE knowledge_resources.organization_id = :org_id
                        ORDER BY embedding <=> :embedding
                        LIMIT :limit
                    """)
                    results = db.execute(
                        sql, 
                        {
                            "embedding": str(query_embedding), 
                            "org_id": str(organization_id),
                            "limit": limit
                        }
                    ).fetchall()
                    
                    for row in results:
                        resource_id = row[0]
                        similarity = row[2]
                        if resource_id not in seen_ids:
                            resource = db.query(KnowledgeResource).filter(KnowledgeResource.id == resource_id).first()
                            if resource:
                                resources.append((resource, similarity))
                                seen_ids.add(resource_id)
            except Exception as vec_err:
                try:
                    db.rollback()
                except Exception:
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
