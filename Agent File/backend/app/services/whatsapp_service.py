"""
WhatsApp Bridge Service
Proxies requests to WPPConnect bridge and handles responses
"""

import httpx
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class WhatsAppService:
    """Service for communicating with WPPConnect bridge"""
    
    def __init__(self, bridge_url: str = "http://localhost:3001"):
        self.bridge_url = bridge_url
    
    async def send_message(
        self, 
        phone: str, 
        message: str, 
        whatsapp_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send text message via WPPConnect bridge
        
        Args:
            phone: Phone number in international format
            message: Message text content
            whatsapp_id: Optional WhatsApp ID (@lid format) for replies
            
        Returns:
            dict: {"success": bool, "messageId": str (optional), "error": str (optional)}
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.bridge_url}/api/send",
                    json={
                        "phone": phone,
                        "message": message,
                        "whatsappId": whatsapp_id
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Bridge returned {response.status_code}: {response.text}")
                    return {
                        "success": False,
                        "error": f"Bridge error: {response.status_code}"
                    }
                    
        except httpx.TimeoutException:
            logger.error("Timeout connecting to WhatsApp bridge")
            return {"success": False, "error": "Timeout connecting to bridge"}
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_media(
        self,
        phone: str,
        media_type: str,
        media_data: str,
        caption: str = "",
        filename: str = "",
        whatsapp_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send media (image/video/document) via WPPConnect bridge
        
        Args:
            phone: Phone number in international format
            media_type: 'image', 'video', or 'document'
            media_data: Base64 encoded media data (with or without data URL prefix)
            caption: Optional caption text
            filename: Original filename
            whatsapp_id: Optional WhatsApp ID (@lid format) for replies
            
        Returns:
            dict: {"success": bool, "messageId": str (optional), "error": str (optional)}
        """
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.bridge_url}/api/sendMedia",
                    json={
                        "phone": phone,
                        "whatsappId": whatsapp_id,
                        "mediaType": media_type,
                        "mediaData": media_data,
                        "caption": caption,
                        "filename": filename
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Bridge returned {response.status_code}: {response.text}")
                    return {
                        "success": False,
                        "error": f"Bridge error: {response.status_code}"
                    }
                    
        except httpx.TimeoutException:
            logger.error("Timeout sending media to WhatsApp bridge")
            return {"success": False, "error": "Timeout sending media"}
        except Exception as e:
            logger.error(f"Error sending media: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_status(self) -> Dict[str, Any]:
        """
        Check WhatsApp bridge connection status
        
        Returns:
            dict: {"status": "connected" | "disconnected" | "error", ...}
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.bridge_url}/api/status")
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return {
                        "status": "error",
                        "message": f"Bridge returned {response.status_code}"
                    }
                    
        except httpx.TimeoutException:
            return {"status": "disconnected", "message": "Bridge timeout"}
        except Exception as e:
            return {"status": "disconnected", "message": str(e)}


# Factory function to create service instance with custom bridge URL
def get_whatsapp_service(bridge_url: str = "http://localhost:3001") -> WhatsAppService:
    """Get WhatsApp service instance for specific bridge URL"""
    return WhatsAppService(bridge_url)
