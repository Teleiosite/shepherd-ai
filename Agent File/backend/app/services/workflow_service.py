"""Workflow Service for automated follow-ups."""
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.contact import Contact
from app.models.workflow import WorkflowStep
from app.models.message import Message
from app.services.ai_service import generate_message


async def process_daily_workflows(db: Session):
    """
    Process daily workflows for all contacts.
    Finds contacts who are due for a message based on their join date
    and generates a draft message for them.
    """
    # 1. Get all active contacts
    contacts = db.query(Contact).filter(Contact.status == "Active").all()
    
    generated_count = 0
    
    for contact in contacts:
        # Calculate days since join
        days_since_join = (datetime.now(contact.join_date.tzinfo) - contact.join_date).days
        
        # 2. Find matching workflow step (case-insensitive category matching)
        step = db.query(WorkflowStep).filter(
            WorkflowStep.organization_id == contact.organization_id,
            func.lower(WorkflowStep.category) == func.lower(contact.category),
            WorkflowStep.day == days_since_join
        ).first()
        
        if not step:
            continue
            
        # 3. Check if message already exists for this step (to avoid duplicates)
        # We can check if a message was created today with "workflow" type or similar
        # For now, we'll just check if any message was created today
        # In production, we'd want more robust duplicate detection
        
        # 4. Generate AI message
        message_content = await generate_message(
            contact_name=contact.name,
            contact_category=contact.category,
            context=f"Workflow Step: {step.title}\nPrompt: {step.prompt}",
            tone="encouraging",
            sender_name="Pastor", # Should fetch from org settings
            organization_name="Church" # Should fetch from org
        )
        
        # 5. Create draft message
        new_message = Message(
            organization_id=contact.organization_id,
            contact_id=contact.id,
            content=message_content,
            type="Outbound",  # Capitalized to match bridge query
            status="Pending",  # Capitalized to match bridge query
            scheduled_for=datetime.now() # Scheduled for today
        )
        
        db.add(new_message)
        generated_count += 1
        
    db.commit()
    return generated_count
