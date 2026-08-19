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
    """
    Job to process scheduled messages that are now due.
    Runs every minute via APScheduler.

    For Meta Cloud API orgs: sends directly via HTTP.
    For WPPConnect orgs: Fix 1 (bridge_polling date filter) handles delivery —
    the bridge will now see these messages since their scheduled_for has passed.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()

        # Find Pending messages whose scheduled time has now passed
        from sqlalchemy import or_
        from app.models.contact import Contact
        messages = db.query(Message).filter(
            Message.status == "Pending",
            Message.scheduled_for != None,
            Message.scheduled_for <= now
        ).all()

        if not messages:
            return

        print(f"[{now}] Found {len(messages)} scheduled messages due for delivery.")

        # Import here to avoid circular imports
        from app.api.whatsapp import get_organization_whatsapp_config
        from app.services.meta_whatsapp_service import get_meta_whatsapp_service

        for message in messages:
            try:
                contact = db.query(Contact).filter(Contact.id == message.contact_id).first()
                if not contact:
                    print(f"  ⚠ Skipping message {message.id} — contact not found")
                    message.status = "Failed"
                    continue

                config = get_organization_whatsapp_config(db, message.organization_id)

                if config["delivery_method"] == "meta":
                    # Send immediately via Meta Cloud API
                    meta_service = get_meta_whatsapp_service(
                        config["phone_number_id"],
                        config["access_token"]
                    )
                    result = await meta_service.send_message(
                        to_phone=contact.phone,
                        message=message.content
                    )
                    if result.get("success"):
                        message.status = "Sent"
                        message.sent_at = now
                        message.whatsapp_message_id = result.get("messageId")
                        print(f"  ✅ Sent scheduled message {message.id} to {contact.phone} via Meta")
                    else:
                        message.status = "Failed"
                        print(f"  ❌ Failed to send {message.id}: {result.get('error')}")
                else:
                    # WPPConnect bridge delivery:
                    # Fix 1 already ensures the bridge will now pick this up
                    # because scheduled_for <= now. No action needed here.
                    print(f"  ↗ Message {message.id} now visible to WPPConnect bridge poller")

            except Exception as msg_err:
                print(f"  ❌ Error processing message {message.id}: {msg_err}")
                message.status = "Failed"

        db.commit()

    except Exception as e:
        print(f"[{datetime.utcnow()}] Error in process_scheduled_messages: {e}")
        db.rollback()
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
