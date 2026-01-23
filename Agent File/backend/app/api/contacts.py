"""Contacts API routes."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.contact import Contact
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse
from app.dependencies import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[ContactResponse])
async def list_contacts(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List contacts for the current user's organization."""
    query = db.query(Contact).filter(Contact.organization_id == current_user.organization_id)
    
    if category:
        query = query.filter(Contact.category == category)
        
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Contact.name.ilike(search_term)) | 
            (Contact.phone.ilike(search_term)) | 
            (Contact.email.ilike(search_term))
        )
        
    contacts = query.offset(skip).limit(limit).all()
    return [ContactResponse.model_validate(c) for c in contacts]


@router.post("/", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact_data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new contact."""
    # Check if contact with phone already exists in organization
    existing_contact = db.query(Contact).filter(
        Contact.organization_id == current_user.organization_id,
        Contact.phone == contact_data.phone
    ).first()
    
    if existing_contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact with this phone number already exists"
        )
        
    new_contact = Contact(
        **contact_data.model_dump(),
        organization_id=current_user.organization_id,
        created_by=current_user.id
    )
    
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    
    # Auto-send Day 0 welcome message if workflow exists
    try:
        from sqlalchemy import func
        from app.models.workflow import WorkflowStep
        from app.models.message import Message
        from app.models.organization import Organization
        from app.services.ai_service import generate_message
        from datetime import datetime
        
        print(f"🔍 Checking for Day 0 workflow for contact: {contact_data.name}, category: {contact_data.category}")
        
        # Find Day 0 workflow for this category
        day_0_step = db.query(WorkflowStep).filter(
            WorkflowStep.organization_id == current_user.organization_id,
            func.lower(WorkflowStep.category) == func.lower(contact_data.category),
            WorkflowStep.day == 0
        ).first()
        
        if not day_0_step:
            print(f"ℹ️ No Day 0 workflow found for category: {contact_data.category}")
        else:
            print(f"✅ Found Day 0 workflow: {day_0_step.title}")
            
            # Get organization name
            org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
            org_name = org.name if org else "Church"
            
            print(f"🤖 Generating AI message for {contact_data.name}...")
            
            # Generate AI message
            message_content = await generate_message(
                contact_name=contact_data.name,
                contact_category=contact_data.category,
                context=f"Workflow Step: {day_0_step.title}\\nPrompt: {day_0_step.prompt}",
                tone="encouraging",
                sender_name="Pastor",
                organization_name=org_name
            )
            
            print(f"📝 Generated message: {message_content[:50]}...")
            
            # Create message with Pending status for bridge to deliver
            welcome_message = Message(
                organization_id=current_user.organization_id,
                contact_id=new_contact.id,
                content=message_content,
                type="Outbound",
                status="Pending",
                scheduled_for=datetime.now()  # Send immediately
            )
            
            db.add(welcome_message)
            db.commit()
            print(f"✅ Day 0 welcome message queued for {contact_data.name} (ID: {welcome_message.id})")
    except Exception as e:
        # Don't fail contact creation if welcome message fails
        import traceback
        print(f"⚠️ Failed to queue Day 0 welcome message: {e}")
        print(f"📋 Traceback: {traceback.format_exc()}")
    
    return ContactResponse.model_validate(new_contact)


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific contact."""
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.organization_id == current_user.organization_id
    ).first()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
        
    return ContactResponse.model_validate(contact)


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    contact_update: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a contact."""
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.organization_id == current_user.organization_id
    ).first()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
        
    update_data = contact_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contact, key, value)
        
    db.commit()
    db.refresh(contact)
    
    return ContactResponse.model_validate(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a contact."""
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.organization_id == current_user.organization_id
    ).first()
    
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
        
    db.delete(contact)
    db.commit()
    return None
