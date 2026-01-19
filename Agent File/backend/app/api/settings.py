"""
Settings API Endpoints
Manages user/organization settings for AI and WhatsApp configuration
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.dependencies import get_current_user, get_db
from app.models import User, Organization
from app.schemas.ai_config import (
    AIConfigCreate, AIConfigUpdate, AIConfigResponse, AIConfigTest,
    WhatsAppMetaConfig, WhatsAppMetaConfigResponse
)
from app.services.ai_provider_service import ai_provider_service
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


def mask_api_key(key: str) -> str:
    """Mask API key for security (show only last 4 characters)"""
    if not key or len(key) < 8:
        return "***"
    return f"***{key[-4:]}"


@router.get("/ai-config")
async def get_ai_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI configuration for user's organization
    Returns masked API key for security
    """
    # Query organization for AI config
    result = db.execute(
        text("""
            SELECT ai_provider, ai_api_key, ai_model, ai_base_url
            FROM organizations
            WHERE id = :org_id
        """),
        {"org_id": str(current_user.organization_id)}
    ).fetchone()
    
    if not result or not result[1]:  # No API key
        # Return default/empty config
        return {
            "provider": "gemini",
            "api_key_masked": "",
            "model": "gemini-2.0-flash",
            "base_url": None,
            "configured": False
        }
    
    return {
        "provider": result[0] or "gemini",
        "api_key_masked": mask_api_key(result[1]),
        "model": result[2] or "gemini-2.0-flash",
        "base_url": result[3],
        "configured": True
    }


@router.put("/ai-config")
async def update_ai_config(
    config: AIConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create or update AI configuration for user's organization
    Saves directly to organization table
    """
    logger.info(f"User {current_user.id} updating AI config: provider={config.provider}")
    
    try:
        # Update organization AI config
        db.execute(
            text("""
                UPDATE organizations
                SET ai_provider = :provider, ai_api_key = :api_key, 
                    ai_model = :model, ai_base_url = :base_url
                WHERE id = :org_id
            """),
            {
                "provider": config.provider,
                "api_key": config.api_key,
                "model": config.model,
                "base_url": config.base_url,
                "org_id": str(current_user.organization_id)
            }
        )
        db.commit()
        logger.info(f"Updated AI config for org {current_user.organization_id}")
        
        return {
            "success": True,
            "message": "AI configuration saved successfully",
            "provider": config.provider,
            "api_key_masked": mask_api_key(config.api_key)
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving AI config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.post("/ai-config/test")
async def test_ai_config(
    config: AIConfigTest,
    current_user: User = Depends(get_current_user)
):
    """
    Test AI provider credentials before saving
    Returns success/failure without saving to database
    """
    logger.info(f"User {current_user.id} testing {config.provider} API key")
    
    result = await ai_provider_service.test_provider(
        provider=config.provider,
        api_key=config.api_key,
        model=config.model,
        base_url=config.base_url
    )
    
    if result["success"]:
        logger.info(f"API key test successful for {config.provider}")
    else:
        logger.warning(f"API key test failed for {config.provider}: {result.get('error')}")
    
    return result


@router.delete("/ai-config")
async def delete_ai_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete AI configuration for user's organization"""
    try:
        db.execute(
            text("""
                UPDATE organizations
                SET ai_provider = NULL, ai_api_key = NULL, ai_model = NULL, ai_base_url = NULL
                WHERE id = :org_id
            """),
            {"org_id": str(current_user.organization_id)}
        )
        db.commit()
        
        logger.info(f"Deleted AI config for org {current_user.organization_id}")
        return {"success": True, "message": "AI configuration deleted"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting AI config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete configuration: {str(e)}")


@router.get("/whatsapp-meta")
async def get_whatsapp_meta_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get WhatsApp Meta Business API configuration"""
    # Query organization for WhatsApp Meta config
    result = db.execute(
        text("""
            SELECT whatsapp_phone_id, whatsapp_business_account_id, whatsapp_access_token
            FROM organizations
            WHERE id = :org_id
        """),
        {"org_id": str(current_user.organization_id)}
    ).fetchone()
    
    if not result or not result[0]:
        return {
            "phone_number_id": "",
            "business_account_id": "",
            "access_token_masked": "",
            "configured": False
        }
    
    return {
        "phone_number_id": result[0],
        "business_account_id": result[1],
        "access_token_masked": mask_api_key(result[2] or ""),
        "configured": True
    }


@router.put("/whatsapp-meta")
async def update_whatsapp_meta_config(
    config: WhatsAppMetaConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update WhatsApp Meta Business API configuration"""
    try:
        db.execute(
            text("""
                UPDATE organizations
                SET whatsapp_phone_id = :phone_id,
                    whatsapp_business_account_id = :business_id,
                    whatsapp_access_token = :access_token
                WHERE id = :org_id
            """),
            {
                "phone_id": config.phone_number_id,
                "business_id": config.business_account_id,
                "access_token": config.access_token,
                "org_id": str(current_user.organization_id)
            }
        )
        db.commit()
        
        logger.info(f"Updated WhatsApp Meta config for org {current_user.organization_id}")
        
        return {
            "success": True,
            "message": "WhatsApp Meta configuration saved successfully",
            "access_token_masked": mask_api_key(config.access_token)
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving WhatsApp Meta config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.get("/bridge-config")
async def get_bridge_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get WPPConnect bridge configuration for user's organization"""
    result = db.execute(
        text("SELECT wppconnect_bridge_url FROM organizations WHERE id = :org_id"),
        {"org_id": str(current_user.organization_id)}
    ).fetchone()
    
    return {
        "bridge_url": result[0] if result and result[0] else "http://localhost:3001",
        "configured": bool(result and result[0])
    }


@router.put("/bridge-config")
async def update_bridge_config(
    bridge_url: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update WPPConnect bridge URL for user's organization"""
    try:
        # Validate URL format
        if not bridge_url.startswith(('http://', 'https://')):
            raise HTTPException(status_code=400, detail="Bridge URL must start with http:// or https://")
        
        db.execute(
            text("""
                UPDATE organizations
                SET wppconnect_bridge_url = :bridge_url
                WHERE id = :org_id
            """),
            {
                "bridge_url": bridge_url,
                "org_id": str(current_user.organization_id)
            }
        )
        db.commit()
        
        logger.info(f"Updated bridge URL for org {current_user.organization_id}: {bridge_url}")
        
        return {
            "success": True,
            "message": "Bridge URL updated successfully",
            "bridge_url": bridge_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating bridge URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update bridge URL: {str(e)}")
