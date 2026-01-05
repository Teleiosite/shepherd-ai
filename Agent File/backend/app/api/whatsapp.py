"""
WhatsApp API Endpoints
Handles WhatsApp messaging via BOTH WPPConnect bridge AND Meta Cloud API
Routes based on user's configured delivery method
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from sqlalchemy import text

from app.dependencies import get_current_user, get_db
from app.models import User, Message, Contact
from app.services.whatsapp_service import get_whatsapp_service
from app.services.meta_whatsapp_service import get_meta_whatsapp_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["whatsapp"])


class WhatsAppMessageSend(BaseModel):
    """Schema for sending WhatsApp text message"""
    phone: str
    message: str
    contact_id: Optional[UUID] = None
    whatsapp_id: Optional[str] = None


class WhatsAppMediaSend(BaseModel):
    """Schema for sending WhatsApp media (image/video/document)"""
    phone: str
    media_type: str  # 'image', 'video', or 'document'
    media_data: str  # Base64 data (with or without data URL prefix) or URL
    caption: str = ""
    filename: str = ""
    contact_id: Optional[UUID] = None
    whatsapp_id: Optional[str] = None


def get_organization_whatsapp_config(db: Session, org_id: UUID) -> dict:
    """
    Get WhatsApp configuration for organization
    Returns delivery method and credentials
    """
    result = db.execute(
        text("""
            SELECT 
                wppconnect_bridge_url,
                whatsapp_phone_id,
                whatsapp_business_account_id,
                whatsapp_access_token
            FROM organizations 
            WHERE id = :org_id
        """),
        {"org_id": str(org_id)}
    ).fetchone()
    
    if not result:
        return {
            "delivery_method": "wppconnect",
            "bridge_url": "http://localhost:3001"
        }
    
    # Determine delivery method based on what's configured
    has_meta = result[1] and result[3]  # Has phone_id and access_token
    has_wppconnect = result[0]
    
    if has_meta:
        return {
            "delivery_method": "meta",
            "phone_number_id": result[1],
            "access_token": result[3]
        }
    else:
        return {
            "delivery_method": "wppconnect",
            "bridge_url": result[0] or "http://localhost:3001"
        }


@router.get("/status")
async def get_whatsapp_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get WhatsApp connection status for user's organization
    Works with both WPPConnect and Meta Cloud API
    
    Returns:
        dict: {"status": "connected" | "disconnected" | "error", "provider": "wppconnect" | "meta", ...}
    """
    config = get_organization_whatsapp_config(db, current_user.organization_id)
    
    if config["delivery_method"] == "meta":
        # Check Meta Cloud API status
        meta_service = get_meta_whatsapp_service(
            config["phone_number_id"],
            config["access_token"]
        )
        status = await meta_service.get_status()
    else:
        # Check WPPConnect bridge status
        wpp_service = get_whatsapp_service(config["bridge_url"])
        status = await wpp_service.get_status()
        status["provider"] = "wppconnect"
        status["bridge_url"] = config["bridge_url"]
    
    logger.info(f"User {current_user.id} checked WhatsApp status: {status.get('status')} via {config['delivery_method']}")
    
    return status


@router.post("/send")
async def send_whatsapp_message(
    message: WhatsAppMessageSend,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send WhatsApp text message
    Automatically routes to WPPConnect or Meta based on organization's configuration
    
    Args:
        message: Message details (phone, text, optional contact_id and whatsapp_id)
        
    Returns:
        dict: {"success": bool, "messageId": str (optional), "error": str (optional), "provider": str}
    """
    logger.info(f"User {current_user.id} sending message to {message.phone}")
    
    # Get organization's WhatsApp configuration
    config = get_organization_whatsapp_config(db, current_user.organization_id)
    
    # Route to appropriate service
    if config["delivery_method"] == "meta":
        logger.info(f"Using Meta Cloud API for org {current_user.organization_id}")
        meta_service = get_meta_whatsapp_service(
            config["phone_number_id"],
            config["access_token"]
        )
        result = await meta_service.send_message(
            to_phone=message.phone,
            message=message.message
        )
        
        # Log to database if contact_id provided
        if message.contact_id:
            try:
                msg_log = Message(
                    organization_id=current_user.organization_id,
                    contact_id=message.contact_id,
                    content=message.message,
                    type="Outbound",
                    status="Sent" if result.get("success") else "Failed",
                    sent_at=datetime.now() if result.get("success") else None,
                    whatsapp_message_id=result.get("messageId"),
                    created_by=current_user.id
                )
                db.add(msg_log)
                db.commit()
                logger.info(f"Message logged to database: {msg_log.id}")
            except Exception as e:
                logger.error(f"Error logging message to database: {str(e)}")
                db.rollback()
        
        return result
        
    else:
        # WPPConnect: Queue message for bridge to poll and send
        logger.info(f"Queuing message for bridge polling")
        
        # Validate contact_id is provided
        if not message.contact_id:
            return {
                "success": False,
                "error": "contact_id is required for queuing messages",
                "provider": "wppconnect"
            }
        
        # Create pending message in database
        msg_log = Message(
            organization_id=current_user.organization_id,
            contact_id=message.contact_id,
            content=message.message,
            type="Outbound",
            status="Pending",  # Bridge will poll and send this
            created_by=current_user.id
        )
        db.add(msg_log)
        db.commit()
        logger.info(f"Message queued: {msg_log.id}")
        
        return {
            "success": True,
            "messageId": str(msg_log.id),
            "status": "queued",
            "provider": "wppconnect"
        }


@router.post("/send-media")
async def send_whatsapp_media(
    media: WhatsAppMediaSend,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send WhatsApp media (image/video/document)
    Automatically routes to WPPConnect or Meta based on organization's configuration
    
    Args:
        media: Media details (phone, type, data, caption, filename, optional contact_id/whatsapp_id)
        
    Returns:
        dict: {"success": bool, "messageId": str (optional), "error": str (optional), "provider": str}
    """
    logger.info(f"User {current_user.id} sending {media.media_type} to {media.phone}")
    
    # Get organization's WhatsApp configuration
    config = get_organization_whatsapp_config(db, current_user.organization_id)
    
    # Route to appropriate service
    if config["delivery_method"] == "meta":
        logger.info(f"Using Meta Cloud API for media send")
        meta_service = get_meta_whatsapp_service(
            config["phone_number_id"],
            config["access_token"]
        )
        result = await meta_service.send_media(
            to_phone=media.phone,
            media_type=media.media_type,
            media_data=media.media_data,
            caption=media.caption,
            filename=media.filename
        )
        
        # Log to database if contact_id provided
        if media.contact_id:
            try:
                media_reference = media.media_data[:100] + "..." if len(media.media_data) > 100 else media.media_data
                
                msg_log = Message(
                    organization_id=current_user.organization_id,
                    contact_id=media.contact_id,
                    content=media.caption or f"[{media.media_type}]",
                    type="Outbound",
                    status="Sent" if result.get("success") else "Failed",
                    attachment_type=media.media_type,
                    attachment_url=media_reference,
                    attachment_name=media.filename,
                    sent_at=datetime.now() if result.get("success") else None,
                    whatsapp_message_id=result.get("messageId"),
                    created_by=current_user.id
                )
                db.add(msg_log)
                db.commit()
                logger.info(f"Media message logged to database: {msg_log.id}")
            except Exception as e:
                logger.error(f"Error logging media message to database: {str(e)}")
                db.rollback()
        
        return result
        
    else:
        # WPPConnect: Queue media message for bridge to poll and send
        logger.info(f"Queuing media message for bridge polling")
        
        # Validate contact_id is provided
        if not media.contact_id:
            return {
                "success": False,
                "error": "contact_id is required for queuing messages",
                "provider": "wppconnect"
            }
        
        # Create pending media message in database
        msg_log = Message(
            organization_id=current_user.organization_id,
            contact_id=media.contact_id,
            content=media.caption or f"[{media.media_type}]",
            type="Outbound",
            status="Pending",  # Bridge will poll and send this
            attachment_type=media.media_type,
            attachment_url=media.media_data,  # Full data URL for bridge to send
            attachment_name=media.filename,
            created_by=current_user.id
        )
        db.add(msg_log)
        db.commit()
        logger.info(f"Media message queued: {msg_log.id}")
        
        return {
            "success": True,
            "messageId": str(msg_log.id),
            "status": "queued",
            "provider": "wppconnect"
        }


@router.post("/webhook")
async def whatsapp_incoming_webhook(
    phone: str,
    whatsapp_id: str,
    content: str,
    contact_name: Optional[str] = None,
    pushname: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Webhook for incoming WhatsApp messages
    Can receive from BOTH WPPConnect bridge AND Meta Cloud API
    
    This endpoint should be called by:
    - WPPConnect bridge when receiving messages
    - Meta webhook when configured
    """
    logger.info(f"Incoming message from {phone} ({whatsapp_id})")
    
    # TODO: Implement incoming message handling
    # - Find organization based on phone number or session
    # - Create/update contact
    # - Log message to database
    
    return {"success": True, "message": "Message received"}
