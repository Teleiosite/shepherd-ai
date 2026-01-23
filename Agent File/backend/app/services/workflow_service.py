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
        
        # 2. Find all workflow steps for this contact's category
        all_steps = db.query(WorkflowStep).filter(
            WorkflowStep.organization_id == contact.organization_id,
            func.lower(WorkflowStep.category) == func.lower(contact.category)
        ).order_by(WorkflowStep.day).all()
        
        if not all_steps:
            continue
        
        # 3. Find which workflow messages have already been sent for this contact
        sent_messages = db.query(Message).filter(
            Message.contact_id == contact.id,
            Message.type == "Outbound",
            Message.status.in_(["Pending", "Sent", "Delivered", "Read"])
        ).all()
        
        # Extract the workflow days that have been sent (by matching content or tracking)
        # For now, count how many workflow messages exist
        sent_count = len(sent_messages)
        
        # 4.CATCH-UP LOGIC: Send the NEXT unsent workflow step
        # If sent_count=0, send Day 0 (if exists, but Day 0 now handled in contacts.py)
        # If sent_count=1, send step index 1 (could be Day 1, 3, 7, etc.)
        if sent_count >= len(all_steps):
            # All workflow steps completed
            continue
        
        # Get the next step to send (skip Day 0 since it's handled immediately on contact creation)
        next_step_index = sent_count
        step = all_steps[next_step_index]
        
        # Skip Day 0 in daily automation (it's handled immediately on contact save)
        if step.day == 0:
            next_step_index += 1
            if next_step_index >= len(all_steps):
                continue
            step = all_steps[next_step_index]
        
        # 5. Check if we already sent a workflow message today (limit to 1 per day)
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        sent_today = db.query(Message).filter(
            Message.contact_id == contact.id,
            Message.type == "Outbound",
            Message.created_at >= today_start
        ).first()
        
        if sent_today:
            # Already sent a workflow message today, skip
            continue
        
        # 6. Generate AI message for next workflow step
        message_content = await generate_message(
            contact_name=contact.name,
            contact_category=contact.category,
            context=f"Workflow Step: {step.title}\nPrompt: {step.prompt}",
            tone="encouraging",
            sender_name="Pastor", # Should fetch from org settings
            organization_name="Church" # Should fetch from org
        )
        
        # 7. Create message with Pending status for bridge to deliver
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
