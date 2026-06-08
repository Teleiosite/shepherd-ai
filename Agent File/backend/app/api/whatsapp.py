"""
WhatsApp API Endpoints
Handles WhatsApp messaging via BOTH WPPConnect bridge AND Meta Cloud API
Routes based on user's configured delivery method
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query, Response
from fastapi.responses import PlainTextResponse
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
        
        # Only log to database on SUCCESS — failed sends are shown via optimistic UI only.
        # Logging failures creates DB records that the 5-second poller would pull back
        # as new messages, duplicating the already-visible failed bubble.
        if message.contact_id and result.get("success"):
            try:
                msg_log = Message(
                    organization_id=current_user.organization_id,
                    contact_id=message.contact_id,
                    content=message.message,
                    type="Outbound",
                    status="Sent",
                    sent_at=datetime.now(),
                    whatsapp_message_id=result.get("messageId"),
                    created_by=current_user.id
                )
                db.add(msg_log)
                db.commit()
                logger.info(f"Message logged to database: {msg_log.id}")
                # Return the DB record ID so frontend can reconcile its optimistic message
                result["db_message_id"] = str(msg_log.id)
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
        
        # Only log to database on SUCCESS — failed sends are shown via optimistic UI only.
        # Logging failures creates DB records that the 5-second poller would pull back
        # as new messages, duplicating the already-visible failed bubble.
        if media.contact_id and result.get("success"):
            try:
                media_reference = media.media_data[:100] + "..." if len(media.media_data) > 100 else media.media_data
                
                msg_log = Message(
                    organization_id=current_user.organization_id,
                    contact_id=media.contact_id,
                    content=media.caption or f"[{media.media_type}]",
                    type="Outbound",
                    status="Sent",
                    attachment_type=media.media_type,
                    attachment_url=media_reference,
                    sent_at=datetime.now(),
                    whatsapp_message_id=result.get("messageId"),
                    created_by=current_user.id
                )
                db.add(msg_log)
                db.commit()
                logger.info(f"Media message logged to database: {msg_log.id}")
                # Return the DB record ID so frontend can reconcile its optimistic message
                result["db_message_id"] = str(msg_log.id)
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


@router.get("/webhook")
async def verify_whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook verification endpoint for Meta WhatsApp Cloud API
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    from app.config import settings
    expected_token = settings.whatsapp_verify_token
    
    if mode and token:
        if mode == "subscribe" and token == expected_token:
            logger.info("✅ Meta Webhook verified successfully!")
            return PlainTextResponse(content=challenge)
        else:
            logger.warning("❌ Meta Webhook verification failed: token mismatch")
            raise HTTPException(status_code=403, detail="Verification token mismatch")
            
    return {"status": "ok"}


async def process_received_message(
    phone: str,
    whatsapp_id: str,
    content: str,
    contact_name: Optional[str] = None,
    pushname: Optional[str] = None,
    has_media: Optional[bool] = False,
    media_type: Optional[str] = None,
    media_url: Optional[str] = None,
    db: Session = None,
    org_id: Optional[UUID] = None,
    allowed_org_ids: Optional[list] = None
):
    # Clean phone number
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '')
    
    # Find contact - search globally or within allowed orgs first to avoid duplicate contact creation
    contact = None
    if allowed_org_ids:
        contact = db.query(Contact).filter(
            Contact.organization_id.in_(allowed_org_ids),
            (Contact.whatsapp_id == whatsapp_id) | 
            (Contact.phone == clean_phone) | 
            (Contact.phone == "+" + clean_phone)
        ).first()
    else:
        contact = db.query(Contact).filter(
            (Contact.whatsapp_id == whatsapp_id) | 
            (Contact.phone == clean_phone) | 
            (Contact.phone == "+" + clean_phone)
        ).first()
        
    if contact:
        org_id = contact.organization_id
    else:
        if allowed_org_ids:
            org_id = allowed_org_ids[0]
        elif not org_id:
            org_row = db.execute(text("SELECT id FROM organizations LIMIT 1")).fetchone()
            if org_row:
                org_id = org_row[0]
            
    if not contact:
        display_name = pushname or contact_name or f"WhatsApp {clean_phone}"
        logger.info(f"📝 Creating new contact: {display_name} ({clean_phone}) in organization {org_id}")
        contact = Contact(
            organization_id=org_id,
            name=display_name,
            phone=clean_phone if clean_phone.startswith('+') else "+" + clean_phone,
            whatsapp_id=whatsapp_id,
            category="New Convert",
            join_date=datetime.now(),
            notes=f"Auto-created from incoming message on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        )
        db.add(contact)
        db.flush()
    else:
        # Update existing contact missing whatsapp_id or name
        if whatsapp_id and not contact.whatsapp_id:
            contact.whatsapp_id = whatsapp_id
        if pushname and not contact.name:
            contact.name = pushname

    message_data = {
        "organization_id": org_id,
        "contact_id": contact.id,
        "type": "Inbound",
        "content": content,
        "status": "Received",
        "sent_at": datetime.now(),
        "created_at": datetime.now()
    }
    
    message = Message(**message_data)
    
    if has_media and media_url:
        message.attachment_url = media_url
        message.attachment_type = media_type
        
    db.add(message)
    db.commit()
    logger.info(f"✅ Incoming message saved for contact {contact.name} (ID: {contact.id}) in organization {org_id}")
    return contact.id, message.id


@router.post("/webhook")
async def whatsapp_incoming_webhook(
    request: Request,
    phone: Optional[str] = None,
    whatsapp_id: Optional[str] = None,
    content: Optional[str] = None,
    contact_name: Optional[str] = None,
    pushname: Optional[str] = None,
    has_media: Optional[bool] = False,
    media_type: Optional[str] = None,
    media_url: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Unified Webhook for incoming WhatsApp messages
    Supports both WPPConnect format and official Meta JSON payload
    """
    try:
        body = {}
        try:
            body = await request.json()
        except:
            pass

        if body and "object" in body and body.get("object") == "whatsapp_business_account":
            logger.info("📩 Processing incoming message from Meta Webhook")
            entries = body.get("entry", [])
            contact_id_str = ""
            message_id_str = ""
            for entry in entries:
                changes = entry.get("changes", [])
                for change in changes:
                    value = change.get("value", {})
                    if "messages" in value:
                        messages = value.get("messages", [])
                        contacts_list = value.get("contacts", [])
                        metadata = value.get("metadata", {})
                        phone_number_id = metadata.get("phone_number_id")
                        
                        # Find organization by phone_number_id
                        org_id = None
                        allowed_org_ids = None
                        if phone_number_id:
                            org_rows = db.execute(
                                text("SELECT id FROM organizations WHERE whatsapp_phone_id = :phone_id"),
                                {"phone_id": str(phone_number_id)}
                            ).fetchall()
                            if org_rows:
                                allowed_org_ids = [row[0] for row in org_rows]
                                org_id = allowed_org_ids[0]
                        
                        sender_name = "WhatsApp User"
                        if contacts_list:
                            sender_name = contacts_list[0].get("profile", {}).get("name", "WhatsApp User")
                            
                        for msg in messages:
                            sender_phone = msg.get("from")
                            msg_id = msg.get("id")
                            msg_type = msg.get("type")
                            
                            msg_content = ""
                            msg_has_media = False
                            msg_media_type = None
                            msg_media_url = None
                            
                            if msg_type == "text":
                                msg_content = msg.get("text", {}).get("body", "")
                            elif msg_type in ["image", "video", "audio", "voice", "document", "sticker"]:
                                media_obj = msg.get(msg_type, {})
                                media_id = media_obj.get("id")
                                caption = media_obj.get("caption") or media_obj.get("filename") or f"[{msg_type}]"
                                msg_content = caption
                                if media_id:
                                    msg_has_media = True
                                    msg_media_type = "audio" if msg_type == "voice" else msg_type
                                    msg_media_url = f"meta_media_id:{media_id}"
                            else:
                                msg_content = f"[{msg_type} message]"
                                
                            c_id, m_id = await process_received_message(
                                phone=sender_phone,
                                whatsapp_id=sender_phone + "@c.us",
                                content=msg_content,
                                contact_name=sender_name,
                                pushname=sender_name,
                                has_media=msg_has_media,
                                media_type=msg_media_type,
                                media_url=msg_media_url,
                                db=db,
                                org_id=org_id,
                                allowed_org_ids=allowed_org_ids
                            )
                            contact_id_str = str(c_id)
                            message_id_str = str(m_id)
            return {
                "success": True, 
                "message": "Message received and saved from Meta",
                "contact_id": contact_id_str,
                "message_id": message_id_str
            }

        final_phone = phone or body.get("phone")
        final_whatsapp_id = whatsapp_id or body.get("whatsapp_id")
        final_content = content or body.get("content")
        final_contact_name = contact_name or body.get("contact_name")
        final_pushname = pushname or body.get("pushname")
        final_has_media = has_media or body.get("has_media", False)
        final_media_type = media_type or body.get("media_type")
        final_media_url = media_url or body.get("media_url")
        
        if not final_phone:
            logger.warning("⚠️ Webhook received empty phone parameter")
            return {"status": "ignored", "reason": "empty phone"}
            
        c_id, m_id = await process_received_message(
            phone=final_phone,
            whatsapp_id=final_whatsapp_id or (final_phone + "@c.us"),
            content=final_content or "",
            contact_name=final_contact_name,
            pushname=final_pushname,
            has_media=final_has_media,
            media_type=final_media_type,
            media_url=final_media_url,
            db=db
        )
        return {
            "success": True, 
            "message": "Message received and saved from bridge",
            "contact_id": str(c_id),
            "message_id": str(m_id)
        }
        
    except Exception as e:
        logger.error(f"❌ Error in webhook: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/media/{media_id}")
async def get_whatsapp_media(
    media_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve and proxy media from Meta WhatsApp API.
    Resolves the organization access token by looking up the media ID in messages.
    """
    logger.info(f"Request to retrieve Meta media ID: {media_id}")
    
    # 1. Find the message in the database that references this media ID
    # Look for meta_media_id:{media_id} in messages table
    search_str = f"meta_media_id:{media_id}"
    msg = db.execute(
        text("SELECT organization_id FROM messages WHERE attachment_url = :url LIMIT 1"),
        {"url": search_str}
    ).fetchone()
    
    if not msg:
        logger.warning(f"Media ID {media_id} not found in any message record")
        raise HTTPException(status_code=404, detail="Media not found")
        
    org_id = msg[0]
    
    # 2. Get the WhatsApp access token for this organization
    config = get_organization_whatsapp_config(db, org_id)
    if config.get("delivery_method") != "meta":
        logger.warning(f"Organization {org_id} is not configured for Meta Cloud API")
        raise HTTPException(status_code=400, detail="Meta Cloud API is not configured for this organization")
        
    access_token = config.get("access_token")
    if not access_token:
        logger.warning(f"No access token found for organization {org_id}")
        raise HTTPException(status_code=401, detail="Meta Access Token missing")
        
    # 3. Request the media metadata from Meta
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            meta_url = f"https://graph.facebook.com/v18.0/{media_id}"
            headers = {"Authorization": f"Bearer {access_token}"}
            
            res = await client.get(meta_url, headers=headers)
            if res.status_code != 200:
                logger.error(f"Meta media info request failed with status {res.status_code}: {res.text}")
                raise HTTPException(status_code=res.status_code, detail="Failed to fetch media metadata from Meta")
                
            media_info = res.json()
            download_url = media_info.get("url")
            mime_type = media_info.get("mime_type", "application/octet-stream")
            
            if not download_url:
                logger.error("Meta media info response did not contain a download URL")
                raise HTTPException(status_code=500, detail="Meta API did not return download URL")
                
            # 4. Download the actual binary file from Meta
            file_res = await client.get(download_url, headers=headers)
            if file_res.status_code != 200:
                logger.error(f"Meta media download request failed with status {file_res.status_code}")
                raise HTTPException(status_code=file_res.status_code, detail="Failed to download file content from Meta")
                
            # 5. Return the file content with the correct mime type
            return Response(content=file_res.content, media_type=mime_type)
            
    except httpx.TimeoutException:
        logger.error("Timeout connecting to Meta WhatsApp API for media download")
        raise HTTPException(status_code=504, detail="Timeout downloading media from Meta")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error proxying media: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
