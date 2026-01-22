"""Scheduler Service for background tasks."""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.workflow_service import process_daily_workflows
from app.models.message import Message
from datetime import datetime

# Initialize scheduler
scheduler = AsyncIOScheduler()


async def run_daily_workflows():
    """Job to run daily workflows."""
    print(f"[{datetime.now()}] Starting daily workflow processing...")
    db = SessionLocal()
    try:
        count = await process_daily_workflows(db)
        print(f"[{datetime.now()}] Daily workflows completed. Processed {count} contacts.")
    except Exception as e:
        print(f"[{datetime.now()}] Error in daily workflows: {e}")
    finally:
        db.close()


async def process_scheduled_messages():
    """Job to process scheduled messages."""
    # This runs frequently (e.g. every minute) to check for messages due to be sent
    db = SessionLocal()
    try:
        # Find messages that are pending and scheduled for now or earlier
        now = datetime.now()
        messages = db.query(Message).filter(
            Message.status == "Pending",  # Capitalized to match workflow/message creation
            Message.scheduled_for <= now
        ).all()
        
        if not messages:
            return
            
        print(f"[{now}] Found {len(messages)} scheduled messages to send.")
        
        for message in messages:
            # Update status to Sent (bridge will actually send via WhatsApp)
            message.status = "Sent"
            message.sent_at = now
            
            # TODO: Call WhatsApp service to actually send
            # await whatsapp_service.send_message(message)
            
        db.commit()
        
    except Exception as e:
        print(f"[{datetime.now()}] Error processing scheduled messages: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the scheduler and add jobs."""
    if scheduler.running:
        return

    # Add daily workflow job (runs at 8:00 AM every day)
    scheduler.add_job(
        run_daily_workflows,
        CronTrigger(hour=8, minute=0),
        id="daily_workflows",
        replace_existing=True
    )
    
    # Add scheduled message processor (runs every minute)
    scheduler.add_job(
        process_scheduled_messages,
        IntervalTrigger(minutes=1),
        id="scheduled_messages",
        replace_existing=True
    )
    
    scheduler.start()
    print("Scheduler started successfully.")


def stop_scheduler():
    """Stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        print("Scheduler stopped.")
