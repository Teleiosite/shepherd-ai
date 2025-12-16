"""
Meta WhatsApp Cloud API Service
Official WhatsApp Business API integration
"""

import httpx
from typing import Optional, Dict, Any
import logging
import base64

logger = logging.getLogger(__name__)


class MetaWhatsAppService:
    """Service for communicating with Meta WhatsApp Cloud API"""
    
    def __init__(
        self, 
        phone_number_id: str,
        access_token: str,
        api_version: str = "v18.0"
    ):
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.api_version = api_version
        self.base_url = f"https://graph.facebook.com/{api_version}"
    
    async def send_message(
        self,
        to_phone: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Send text message via Meta WhatsApp Cloud API
        
        Args:
            to_phone: Recipient phone number (international format, no +)
            message: Message text content
            
        Returns:
            dict: {"success": bool, "messageId": str (optional), "error": str (optional)}
        """
        # Clean phone number (remove + and any spaces)
        to_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "to": to_phone,
                        "type": "text",
                        "text": {
                            "preview_url": True,
                            "body": message
                        }
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "messageId": data.get("messages", [{}])[0].get("id"),
                        "provider": "meta"
                    }
                else:
                    error_data = response.json()
                    logger.error(f"Meta API returned {response.status_code}: {error_data}")
                    return {
                        "success": False,
                        "error": error_data.get("error", {}).get("message", f"HTTP {response.status_code}"),
                        "provider": "meta"
                    }
                    
        except httpx.TimeoutException:
            logger.error("Timeout connecting to Meta WhatsApp API")
            return {"success": False, "error": "Timeout connecting to Meta API", "provider": "meta"}
        except Exception as e:
            logger.error(f"Error sending message via Meta: {str(e)}")
            return {"success": False, "error": str(e), "provider": "meta"}
    
    async def send_media(
        self,
        to_phone: str,
        media_type: str,
        media_data: str,
        caption: str = "",
        filename: str = ""
    ) -> Dict[str, Any]:
        """
        Send media (image/video/document) via Meta WhatsApp Cloud API
        
        Args:
            to_phone: Recipient phone number (international format, no +)
            media_type: 'image', 'video', or 'document'
            media_data: Base64 encoded media OR URL
            caption: Optional caption text
            filename: Original filename (for documents)
            
        Returns:
            dict: {"success": bool, "messageId": str (optional), "error": str (optional)}
        """
        # Clean phone number
        to_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")
        
        try:
            # Map media types
            meta_media_type = media_type
            if media_type == "image":
                meta_media_type = "image"
            elif media_type == "video":
                meta_media_type = "video"
            else:
                meta_media_type = "document"
            
            # Check if media_data is URL or base64
            if media_data.startswith("http://") or media_data.startswith("https://"):
                # Media is already a URL
                media_payload = {"link": media_data}
            else:
                # Need to upload base64 to Meta first
                # For now, return error - users should provide URLs or we implement upload
                return {
                    "success": False,
                    "error": "Base64 media upload not yet implemented. Please provide media URL or use WPPConnect.",
                    "provider": "meta"
                }
            
            # Build message payload
            message_payload = {
                "messaging_product": "whatsapp",
                "to": to_phone,
                "type": meta_media_type,
                meta_media_type: media_payload
            }
            
            # Add caption if provided (only for image/video)
            if caption and meta_media_type in ["image", "video"]:
                message_payload[meta_media_type]["caption"] = caption
            
            # Add filename for documents
            if meta_media_type == "document" and filename:
                message_payload[meta_media_type]["filename"] = filename
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json"
                    },
                    json=message_payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "messageId": data.get("messages", [{}])[0].get("id"),
                        "provider": "meta"
                    }
                else:
                    error_data = response.json()
                    logger.error(f"Meta API returned {response.status_code}: {error_data}")
                    return {
                        "success": False,
                        "error": error_data.get("error", {}).get("message", f"HTTP {response.status_code}"),
                        "provider": "meta"
                    }
                    
        except httpx.TimeoutException:
            logger.error("Timeout sending media to Meta WhatsApp API")
            return {"success": False, "error": "Timeout sending media", "provider": "meta"}
        except Exception as e:
            logger.error(f"Error sending media via Meta: {str(e)}")
            return {"success": False, "error": str(e), "provider": "meta"}
    
    async def get_status(self) -> Dict[str, Any]:
        """
        Check Meta WhatsApp API connection status
        
        Returns:
            dict: {"status": "connected" | "disconnected" | "error", ...}
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Try to get phone number details to verify connection
                response = await client.get(
                    f"{self.base_url}/{self.phone_number_id}",
                    headers={"Authorization": f"Bearer {self.access_token}"},
                    params={"fields": "id,verified_name"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "status": "connected",
                        "provider": "meta",
                        "verified_name": data.get("verified_name"),
                        "phone_number_id": self.phone_number_id
                    }
                else:
                    return {
                        "status": "error",
                        "provider": "meta",
                        "message": f"Meta API returned {response.status_code}"
                    }
                    
        except httpx.TimeoutException:
            return {"status": "disconnected", "provider": "meta", "message": "API timeout"}
        except Exception as e:
            return {"status": "disconnected", "provider": "meta", "message": str(e)}


def get_meta_whatsapp_service(
    phone_number_id: str,
    access_token: str
) -> MetaWhatsAppService:
    """Get Meta WhatsApp service instance"""
    return MetaWhatsAppService(phone_number_id, access_token)
