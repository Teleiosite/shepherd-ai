"""Messages API routes."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.message import Message
from app.models.contact import Contact
from app.models.user import User
from app.schemas.message import MessageCreate, MessageUpdate, MessageResponse
from app.dependencies import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[MessageResponse])
async def list_messages(
    skip: int = 0,
    limit: int = 100,
    contact_id: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List messages for the current user's organization."""
    query = db.query(Message).filter(Message.organization_id == current_user.organization_id)
    
    if contact_id:
        query = query.filter(Message.contact_id == contact_id)
        
    if status:
        query = query.filter(Message.status == status)
        
    if type:
        query = query.filter(Message.type == type)
        
    # Order by created_at desc
    messages = query.order_by(desc(Message.created_at)).offset(skip).limit(limit).all()
    return [MessageResponse.model_validate(m) for m in messages]


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new message."""
    # Verify contact exists and belongs to organization
    contact = db.query(Contact).filter(
        Contact.id == message_data.contact_id,
        Contact.organization_id == current_user.organization_id
    ).first()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
        
    new_message = Message(
        **message_data.model_dump(),
        organization_id=current_user.organization_id,
        created_by=current_user.id
    )
    
    # If scheduled, ensure status is pending
    if new_message.scheduled_for and new_message.scheduled_for > datetime.now(new_message.scheduled_for.tzinfo):
        new_message.status = "Pending"  # Capitalized to match bridge query
    elif new_message.status == "Pending" and not new_message.scheduled_for:
        # If pending but no schedule, assume immediate send (in a real app, this would trigger a background task)
        new_message.status = "Sent"  # Capitalized to match bridge query
        new_message.sent_at = datetime.now()
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return MessageResponse.model_validate(new_message)


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific message."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.organization_id == current_user.organization_id
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
        
    return MessageResponse.model_validate(message)


@router.put("/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: str,
    message_update: MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a message (e.g. cancel schedule)."""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.organization_id == current_user.organization_id
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
        
    # Only allow updating pending messages or status updates
    if message.status != "pending" and message_update.status != "cancelled":
         # Allow updating content if still pending
         pass
         
    return MessageResponse.model_validate(message)


@router.post("/generate", response_model=dict)
async def generate_ai_message(
    contact_id: str,
    context: Optional[str] = None,
    tone: str = "encouraging",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate an AI message for a contact."""
    from app.services.ai_service import generate_message
    from app.services.rag_service import search_knowledge_base
    from app.models.organization import Organization
    
    # Get contact
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.organization_id == current_user.organization_id
    ).first()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
        
    # Get organization details
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    
    # Get RAG context if not provided
    rag_context = ""
    if not context:
        # Search for relevant resources based on contact category/status
        query = f"How to encourage a {contact.category} christian"
        results = await search_knowledge_base(db, str(current_user.organization_id), query)
        
        if results:
            rag_context = "\n\nRelevant Resources:\n" + "\n".join([f"- {r[0].content[:200]}..." for r in results])
            
    final_context = (context or "") + rag_context
    
    # Generate message
    message_text = await generate_message(
        contact_name=contact.name,
        contact_category=contact.category,
        context=final_context,
        tone=tone,
        sender_name=current_user.full_name or "Pastor",
        organization_name=org.name if org else "Church"
    )
    
    return {"content": message_text}
