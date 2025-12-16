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
    limit: int = 3
) -> List[Tuple[KnowledgeResource, float]]:
    """
    Search the knowledge base using vector similarity.
    
    Args:
        db: Database session
        organization_id: Organization ID to scope search
        query: Search query
        limit: Number of results to return
        
    Returns:
        List of (KnowledgeResource, similarity_score) tuples
    """
    # 1. Generate embedding for query
    query_embedding = await generate_embedding(query)
    if not query_embedding:
        return []
        
    # 2. Perform vector search using pgvector
    # We use the <=> operator for cosine distance (lower is better)
    # So we order by embedding <=> query_embedding
    
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
            "org_id": organization_id,
            "limit": limit
        }
    ).fetchall()
    
    # 3. Fetch full resources and return
    # Note: In a real app, we might return just the chunks
    resources = []
    seen_ids = set()
    
    for row in results:
        resource_id = row[0]
        similarity = row[2]
        
        if resource_id not in seen_ids:
            resource = db.query(KnowledgeResource).filter(KnowledgeResource.id == resource_id).first()
            if resource:
                resources.append((resource, similarity))
                seen_ids.add(resource_id)
                
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
