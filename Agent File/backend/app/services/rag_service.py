"""RAG Service for retrieving knowledge base context."""
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.services.ai_service import generate_embedding
from app.models.knowledge import KnowledgeResource, KnowledgeEmbedding
from typing import List, Tuple


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

    # 1. Generate embedding for query
    query_embedding = await generate_embedding(query, api_key=api_key)
    if query_embedding:
        try:
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
            print(f"Vector search failed, falling back to keyword search: {vec_err}")

    # 2. Text/Keyword fallback search if vector search returned no results
    if not resources and query:
        words = [w.strip() for w in query.split() if len(w.strip()) > 3]
        query_filters = []
        for word in words[:3]:
            query_filters.append(KnowledgeResource.title.ilike(f"%{word}%"))
            query_filters.append(KnowledgeResource.content.ilike(f"%{word}%"))
        
        fallback_query = db.query(KnowledgeResource).filter(
            KnowledgeResource.organization_id == organization_id
        )
        if query_filters:
            from sqlalchemy import or_
            fallback_query = fallback_query.filter(or_(*query_filters))
            
        fb_results = fallback_query.limit(limit).all()
        for res in fb_results:
            if res.id not in seen_ids:
                resources.append((res, 0.8))
                seen_ids.add(res.id)

    # 3. If still empty, return top general knowledge resources for the org
    if not resources:
        top_res = db.query(KnowledgeResource).filter(
            KnowledgeResource.organization_id == organization_id
        ).limit(limit).all()
        for res in top_res:
            if res.id not in seen_ids:
                resources.append((res, 0.5))
                seen_ids.add(res.id)
                
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
