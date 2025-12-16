"""
Bridge Connection Management API
Allows users to get connection codes and register their bridge instances
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import secrets
from datetime import datetime

from app.dependencies import get_current_user, get_db
from app.models import User

router = APIRouter()


class BridgeConnectionCode(BaseModel):
    """Connection code for bridge pairing"""
    code: str
    user_id: str
    instructions: str


class BridgeRegistration(BaseModel):
    """Bridge registration request"""
    code: str
    bridge_url: str


class BridgeStatus(BaseModel):
    """Bridge connection status"""
    connected: bool
    bridge_url: Optional[str]
    last_connected: Optional[str]


@router.get("/connection-code", response_model=BridgeConnectionCode)
async def get_connection_code(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a unique connection code for pairing bridge app
    
    Returns:
        Connection code and instructions
    """
    # Generate simple code from user ID (first 8 chars uppercase)
    code = str(current_user.id)[:8].upper()
    
    return BridgeConnectionCode(
        code=code,
        user_id=str(current_user.id),
        instructions=(
            "1. Download and install the Shepherd AI Bridge app\n"
            "2. Enter this code when prompted\n"
            "3. Scan WhatsApp QR code\n"
            "4. Done!"
        )
    )


@router.post("/register", response_model=dict)
async def register_bridge(
    registration: BridgeRegistration,
    db: Session = Depends(get_db)
):
    """
    Register a bridge instance with a user account
    
    Args:
        registration: Connection code and bridge URL
        
    Returns:
        Success status and next steps
    """
    # Validate connection code (should match a user ID)
    # In real implementation, you'd query users table
    # For now, we'll update the organization's bridge URL
    
    # Find user by connection code (first 8 chars of UUID)
    from app.models import Organization
    from sqlalchemy import or_, cast, String
    
    # Search for user whose ID starts with this code
    user = db.query(User).filter(
        cast(User.id, String).like(f"{registration.code.lower()}%")
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid connection code"
        )
    
    # Update organization's bridge URL
    org = db.query(Organization).filter(
        Organization.id == user.organization_id
    ).first()
    
    if org:
        org.wppconnect_bridge_url = registration.bridge_url
        org.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "message": "Bridge connected successfully!",
            "next_steps": [
                "Scan WhatsApp QR code in your bridge app",
                "Your bridge is now linked to your account",
                "Go back to Shepherd AI and start messaging!"
            ]
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Organization not found"
        )


@router.get("/status", response_model=BridgeStatus)
async def get_bridge_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current bridge connection status
    
    Returns:
        Whether bridge is connected and its details
    """
    from app.models import Organization
    
    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()
    
    if not org:
        return BridgeStatus(
            connected=False,
            bridge_url=None,
            last_connected=None
        )
    
    # Check if bridge URL is configured
    has_bridge = bool(org.wppconnect_bridge_url)
    
    return BridgeStatus(
        connected=has_bridge,
        bridge_url=org.wppconnect_bridge_url if has_bridge else None,
        last_connected=org.updated_at.isoformat() if has_bridge else None
    )


@router.delete("/disconnect")
async def disconnect_bridge(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect/unlink the current bridge
    
    Returns:
        Success status
    """
    from app.models import Organization
    
    org = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()
    
    if org:
        org.wppconnect_bridge_url = None
        org.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "message": "Bridge disconnected successfully"
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
