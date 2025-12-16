"""Knowledge Base API routes."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.knowledge import KnowledgeResource
from app.models.user import User
from app.schemas.knowledge import KnowledgeResourceCreate, KnowledgeResourceResponse
from app.dependencies import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[KnowledgeResourceResponse])
async def list_resources(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List knowledge resources."""
    query = db.query(KnowledgeResource).filter(KnowledgeResource.organization_id == current_user.organization_id)
    
    if type:
        query = query.filter(KnowledgeResource.type == type)
        
    if search:
        query = query.filter(KnowledgeResource.title.ilike(f"%{search}%"))
        
    resources = query.offset(skip).limit(limit).all()
    return [KnowledgeResourceResponse.model_validate(r) for r in resources]


@router.post("/", response_model=KnowledgeResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    resource_data: KnowledgeResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new knowledge resource."""
    new_resource = KnowledgeResource(
        **resource_data.model_dump(),
        organization_id=current_user.organization_id,
        created_by=current_user.id
    )
    
    db.add(new_resource)
    db.commit()
    db.refresh(new_resource)
    
    # TODO: Trigger background task to generate embeddings
    
    return KnowledgeResourceResponse.model_validate(new_resource)


@router.get("/{resource_id}", response_model=KnowledgeResourceResponse)
async def get_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific resource."""
    resource = db.query(KnowledgeResource).filter(
        KnowledgeResource.id == resource_id,
        KnowledgeResource.organization_id == current_user.organization_id
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
        
    return KnowledgeResourceResponse.model_validate(resource)


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a resource."""
    resource = db.query(KnowledgeResource).filter(
        KnowledgeResource.id == resource_id,
        KnowledgeResource.organization_id == current_user.organization_id
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
        
    db.delete(resource)
    db.commit()
    return None
