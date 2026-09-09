"""
Settings API Endpoints
Manages user/organization settings for AI and WhatsApp configuration
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import HTMLResponse
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
            "model": "gemini-1.5-flash",
            "base_url": None,
            "configured": False
        }
    
    return {
        "provider": result[0] or "gemini",
        "api_key_masked": mask_api_key(result[1]),
        "model": result[2] or "gemini-1.5-flash",
        "base_url": result[3],
        "configured": True
    }



@router.post("/save-all")
async def save_all_settings(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Unified settings save — handles AI config + autopilot + WhatsApp in one call.
    Accepts raw dict (no strict schema), gracefully handles masked/empty keys.
    """
    org_id = str(current_user.organization_id)
    logger.info(f"💾 save-all called for org {org_id} by user {current_user.id}")

    try:
        # --- 1. AI API Key ---
        new_api_key = payload.get("api_key", "")
        if new_api_key and new_api_key.startswith("***"):
            # Masked — keep existing DB value
            existing_key = db.execute(
                text("SELECT ai_api_key FROM organizations WHERE id = :org_id"),
                {"org_id": org_id}
            ).fetchone()
            new_api_key = (existing_key[0] if existing_key and existing_key[0] else "")
            logger.info(f"🔑 API key is masked — keeping existing DB key (set={bool(new_api_key)})")
        else:
            logger.info(f"🔑 API key provided: set={bool(new_api_key)}, length={len(new_api_key)}")

        # --- 2. WhatsApp Access Token ---
        new_wa_token = payload.get("access_token", "")
        if new_wa_token and new_wa_token.startswith("***"):
            existing_tok = db.execute(
                text("SELECT whatsapp_access_token FROM organizations WHERE id = :org_id"),
                {"org_id": org_id}
            ).fetchone()
            new_wa_token = (existing_tok[0] if existing_tok and existing_tok[0] else "")
            logger.info(f"📱 WA token is masked — keeping existing DB token (set={bool(new_wa_token)})")

        # --- 3. Build dynamic SQL for AI fields ---
        ai_fields = []
        ai_params: dict = {"org_id": org_id}

        if new_api_key:
            ai_fields.append("ai_api_key = :api_key")
            ai_params["api_key"] = new_api_key

        if payload.get("provider"):
            ai_fields.append("ai_provider = :provider")
            ai_params["provider"] = payload["provider"]

        if payload.get("model"):
            ai_fields.append("ai_model = :model")
            ai_params["model"] = payload["model"]

        if "base_url" in payload:
            ai_fields.append("ai_base_url = :base_url")
            ai_params["base_url"] = payload.get("base_url") or None

        # Autopilot fields
        if "enabled" in payload:
            val = payload["enabled"]
            ai_fields.append("ai_auto_reply_enabled = :enabled")
            ai_params["enabled"] = "true" if val in [True, "true", "True", 1] else "false"

        if "mode" in payload:
            ai_fields.append("ai_reply_mode = :mode")
            ai_params["mode"] = payload["mode"]

        if "reply_delay" in payload:
            ai_fields.append("ai_reply_delay_seconds = :delay")
            ai_params["delay"] = int(payload.get("reply_delay") or 0)

        if "tone" in payload:
            ai_fields.append("ai_tone = :tone")
            ai_params["tone"] = payload["tone"]

        if "payment_link" in payload:
            ai_fields.append("ai_payment_link = :payment_link")
            ai_params["payment_link"] = payload["payment_link"]

        if "business_type" in payload:
            ai_fields.append("ai_business_type = :business_type")
            ai_params["business_type"] = payload["business_type"]

        # --- 4. WhatsApp Meta fields ---
        if payload.get("phone_number_id"):
            ai_fields.append("whatsapp_phone_id = :phone_id")
            ai_params["phone_id"] = payload["phone_number_id"]

        if new_wa_token:
            ai_fields.append("whatsapp_access_token = :wa_token")
            ai_params["wa_token"] = new_wa_token

        if payload.get("business_account_id"):
            ai_fields.append("whatsapp_business_account_id = :biz_id")
            ai_params["biz_id"] = payload["business_account_id"]

        # --- 5. Execute update ---
        if ai_fields:
            sql = f"UPDATE organizations SET {', '.join(ai_fields)} WHERE id = :org_id"
            logger.info(f"💾 Saving fields: {[f.split(' = ')[0] for f in ai_fields]}")
            db.execute(text(sql), ai_params)
            db.commit()
            logger.info(f"✅ save-all committed for org {org_id}")
        else:
            logger.warning("⚠️ save-all called with no valid fields to update")

        # --- 6. Return current state ---
        row = db.execute(
            text("SELECT ai_provider, ai_api_key, ai_model, ai_auto_reply_enabled, ai_reply_mode, whatsapp_phone_id, whatsapp_access_token FROM organizations WHERE id = :org_id"),
            {"org_id": org_id}
        ).fetchone()

        return {
            "success": True,
            "message": "Settings saved successfully",
            "state": {
                "api_key_saved": bool(row[1]) if row else False,
                "provider": row[0] if row else "gemini",
                "model": row[2] if row else "gemini-1.5-flash",
                "auto_reply_enabled": row[3] if row else "false",
                "mode": row[4] if row else "suggest",
                "whatsapp_phone_id_saved": bool(row[5]) if row else False,
                "whatsapp_token_saved": bool(row[6]) if row else False,
            }
        }

    except Exception as e:
        db.rollback()
        logger.error(f"❌ save-all failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")


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
        api_key = config.api_key
        if api_key and api_key.startswith("***"):
            existing = db.execute(
                text("SELECT ai_api_key FROM organizations WHERE id = :org_id"),
                {"org_id": str(current_user.organization_id)}
            ).fetchone()
            if existing and existing[0]:
                api_key = existing[0]

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
                "api_key": api_key,
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
        access_token = config.access_token
        if access_token and access_token.startswith("***"):
            existing = db.execute(
                text("SELECT whatsapp_access_token FROM organizations WHERE id = :org_id"),
                {"org_id": str(current_user.organization_id)}
            ).fetchone()
            if existing and existing[0]:
                access_token = existing[0]

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
                "access_token": access_token,
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


@router.get("/ai-autopilot")
async def get_ai_autopilot_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI auto-reply and autopilot configuration for the organization"""
    result = db.execute(
        text("""
            SELECT ai_auto_reply_enabled, ai_reply_mode, ai_reply_delay_seconds, ai_tone, ai_payment_link, ai_business_type, ai_voice_reply_mode, ai_voice_name
            FROM organizations
            WHERE id = :org_id
        """),
        {"org_id": str(current_user.organization_id)}
    ).fetchone()

    if not result:
        return {
            "enabled": False,
            "mode": "suggest",
            "reply_delay": 5,
            "tone": "Warm, professional, and helpful. Use casual WhatsApp-style language.",
            "payment_link": "",
            "business_type": "Organization",
            "voice_reply_mode": "text",
            "voice_name": "en-NG-EzinneNeural"
        }

    return {
        "enabled": str(result[0]).lower() == "true",
        "mode": result[1] or "suggest",
        "reply_delay": result[2] or 5,
        "tone": result[3] or "Warm, professional, and helpful. Use casual WhatsApp-style language.",
        "payment_link": result[4] or "",
        "business_type": result[5] or "Organization",
        "voice_reply_mode": result[6] or "text",
        "voice_name": result[7] or "en-NG-EzinneNeural"
    }


@router.put("/ai-autopilot")
async def update_ai_autopilot_settings(
    settings_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update AI auto-reply and autopilot configuration for the organization (supports partial updates)"""
    try:
        org_id = str(current_user.organization_id)
        fields = []
        params = {"org_id": org_id}

        if "enabled" in settings_data:
            val = settings_data["enabled"]
            params["enabled"] = "true" if val in [True, "true", "True", 1] else "false"
            fields.append("ai_auto_reply_enabled = :enabled")

        if "mode" in settings_data:
            params["mode"] = settings_data["mode"]
            fields.append("ai_reply_mode = :mode")

        if "reply_delay" in settings_data:
            params["delay"] = int(settings_data["reply_delay"])
            fields.append("ai_reply_delay_seconds = :delay")

        if "tone" in settings_data:
            params["tone"] = settings_data["tone"]
            fields.append("ai_tone = :tone")

        if "payment_link" in settings_data:
            params["payment_link"] = settings_data["payment_link"]
            fields.append("ai_payment_link = :payment_link")

        if "business_type" in settings_data:
            params["business_type"] = settings_data["business_type"]
            fields.append("ai_business_type = :business_type")

        if "voice_reply_mode" in settings_data:
            params["voice_reply_mode"] = settings_data["voice_reply_mode"]
            fields.append("ai_voice_reply_mode = :voice_reply_mode")

        if "voice_name" in settings_data:
            params["voice_name"] = settings_data["voice_name"]
            fields.append("ai_voice_name = :voice_name")

        if fields:
            sql = f"UPDATE organizations SET {', '.join(fields)} WHERE id = :org_id"
            db.execute(text(sql), params)
            db.commit()

        # Fetch current state to return complete updated values
        row = db.execute(
            text("""
                SELECT ai_auto_reply_enabled, ai_reply_mode, ai_reply_delay_seconds, ai_tone, ai_payment_link, ai_business_type, ai_voice_reply_mode, ai_voice_name
                FROM organizations
                WHERE id = :org_id
            """),
            {"org_id": org_id}
        ).fetchone()

        return {
            "success": True,
            "message": "AI autopilot settings updated successfully",
            "enabled": str(row[0]).lower() == "true" if row else False,
            "mode": row[1] if row else "auto-send",
            "reply_delay": row[2] if row else 5,
            "tone": row[3] if row else "",
            "payment_link": row[4] if row else "",
            "business_type": row[5] if row else "Organization",
            "voice_reply_mode": row[6] if row else "text",
            "voice_name": row[7] if row else "en-NG-EzinneNeural"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating AI autopilot settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-generate")
async def generate_ai_completion(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Server-side AI completion proxy for the AI Agent.
    Uses organization's stored API key or server-wide GEMINI_API_KEY.
    """
    from app.config import settings as app_settings
    import google.generativeai as genai
    import httpx

    system_prompt = payload.get("system_prompt", "")
    user_turn = payload.get("user_turn", "")
    model = payload.get("model", "gemini-1.5-flash")
    temperature = float(payload.get("temperature", 0.75))

    # Retrieve organization's AI configuration
    org_id = str(current_user.organization_id)
    org_row = db.execute(
        text("SELECT ai_provider, ai_api_key, ai_model, ai_base_url FROM organizations WHERE id = :org_id"),
        {"org_id": org_id}
    ).fetchone()

    provider = (org_row[0] if org_row else None) or "gemini"
    api_key = (org_row[1] if org_row else None) or app_settings.gemini_api_key
    selected_model = (org_row[2] if org_row and org_row[2] else None) or model
    base_url = org_row[3] if org_row else None

    if not api_key:
        raise HTTPException(status_code=400, detail="No AI API key configured on server or organization")

    try:
        if provider == "gemini":
            genai.configure(api_key=api_key)
            model_name = selected_model
            if not model_name or "gemini" not in model_name or model_name == "gemini-3.5-flash":
                model_name = "gemini-1.5-flash"
            g_model = genai.GenerativeModel(model_name)
            combined_prompt = f"{system_prompt}\n\n{user_turn}" if system_prompt else user_turn
            res = g_model.generate_content(
                combined_prompt,
                generation_config=genai.types.GenerationConfig(temperature=temperature)
            )
            return {"text": res.text or "{}"}
        else:
            url = base_url
            if not url:
                if provider == "openai":
                    url = "https://api.openai.com/v1"
                elif provider == "deepseek":
                    url = "https://api.deepseek.com"
                elif provider == "groq":
                    url = "https://api.groq.com/openai/v1"
            if not url:
                raise HTTPException(status_code=400, detail=f"No base URL for provider {provider}")

            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    f"{url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": selected_model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_turn}
                        ],
                        "temperature": temperature
                    }
                )
                if not res.is_success:
                    raise HTTPException(status_code=502, detail=f"AI Provider error: {res.text}")
                data = res.json()
                return {"text": data.get("choices", [{}])[0].get("message", {}).get("content", "{}")}
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error in ai-generate proxy: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/debug-ai")
async def debug_ai_state(
    request: Request,
    db: Session = Depends(get_db),
    format: Optional[str] = None
):
    """
    Diagnostic dashboard & direct activator.
    Open directly in browser: https://shepherd-ai-backend.onrender.com/api/settings/debug-ai
    """
    from app.config import settings as app_settings

    # Query ALL organizations in the database
    rows = db.execute(
        text("""
            SELECT id, name, ai_provider, ai_api_key, ai_model,
                   ai_auto_reply_enabled, ai_reply_mode, ai_reply_delay_seconds,
                   whatsapp_phone_id, whatsapp_access_token
            FROM organizations
            ORDER BY id ASC
        """)
    ).fetchall()

    orgs_data = []
    for r in rows:
        has_key = bool(r[3])
        has_env = bool(app_settings.gemini_api_key)
        raw_en = r[5]
        auto_en = str(raw_en).lower() not in ("false", "0", "no")
        orgs_data.append({
            "id": str(r[0]),
            "name": r[1],
            "ai_provider": r[2] or "gemini",
            "has_api_key": has_key,
            "api_key_status": "SET ✅" if has_key else "MISSING ❌",
            "model": r[4] or "gemini-1.5-flash",
            "auto_reply_enabled_raw": repr(raw_en),
            "will_reply": auto_en,
            "mode": r[6] or "auto-send",
            "whatsapp_phone_id": r[8] or "NOT SET ❌",
            "whatsapp_token_configured": "SET ✅" if bool(r[9]) else "NOT SET ❌",
        })

    # Query user and contact counts per org
    users_data = []
    try:
        u_rows = db.execute(text("SELECT id, email, organization_id FROM users")).fetchall()
        for u in u_rows:
            users_data.append({"id": str(u[0]), "email": u[1], "organization_id": str(u[2])})
    except Exception as ue:
        users_data.append({"error": str(ue)})

    contacts_breakdown = {}
    try:
        c_counts = db.execute(text("SELECT organization_id, count(*) FROM contacts GROUP BY organization_id")).fetchall()
        for c in c_counts:
            contacts_breakdown[str(c[0])] = c[1]
    except Exception:
        pass

    messages_breakdown = {}
    try:
        m_counts = db.execute(text("SELECT organization_id, count(*) FROM messages GROUP BY organization_id")).fetchall()
        for m in m_counts:
            messages_breakdown[str(m[0])] = m[1]
    except Exception:
        pass

    for o in orgs_data:
        o["contacts_count"] = contacts_breakdown.get(o["id"], 0)
        o["messages_count"] = messages_breakdown.get(o["id"], 0)

    # Return JSON if requested
    accept = request.headers.get("accept", "")
    if format == "json" or "application/json" in accept:
        return {
            "organizations_count": len(orgs_data),
            "users": users_data,
            "organizations": orgs_data,
            "server_gemini_env_key": "SET ✅" if bool(app_settings.gemini_api_key) else "NOT SET ❌"
        }

    # Otherwise return a clean, interactive HTML dashboard
    org_cards_html = ""
    for o in orgs_data:
        status_badge = '<span style="color:#16a34a;font-weight:bold;">● ACTIVE</span>' if (o["will_reply"] and o["has_api_key"] and o["whatsapp_phone_id"] != "NOT SET ❌") else '<span style="color:#dc2626;font-weight:bold;">● INCOMPLETE</span>'
        org_cards_html += f"""
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
                <h3 style="margin:0;color:#0f172a;font-size:18px;">🏢 {o['name']}</h3>
                <div>{status_badge}</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;font-size:14px;">
                <div><strong>ID:</strong> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px;">{o['id']}</code></div>
                <div><strong>AI Provider / Model:</strong> {o['ai_provider']} ({o['model']})</div>
                <div><strong>AI API Key:</strong> {o['api_key_status']}</div>
                <div><strong>Auto-Reply Toggle:</strong> {'ENABLED ✅' if o['will_reply'] else 'DISABLED ❌'} (raw: {o['auto_reply_enabled_raw']})</div>
                <div><strong>Reply Mode:</strong> <span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:6px;font-weight:600;">{o['mode']}</span></div>
                <div><strong>WhatsApp Phone ID:</strong> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">{o['whatsapp_phone_id']}</code></div>
                <div><strong>WhatsApp Access Token:</strong> {o['whatsapp_token_configured']}</div>
            </div>
        </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Shepherd AI — 24/7 AI Auto-Reply Activator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
            .container {{ max-width: 860px; margin: 0 auto; }}
            .header {{ background: linear-gradient(135deg, #0f172a, #1e3a8a); color: white; padding: 28px; border-radius: 16px; margin-bottom: 24px; }}
            .card {{ background: white; border: 1px solid #cbd5e1; border-radius: 16px; padding: 28px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            label {{ display: block; font-weight: 600; margin-bottom: 6px; font-size: 14px; color: #334155; }}
            input[type="text"], input[type="password"] {{ width: 100%; padding: 12px 14px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 15px; box-sizing: border-box; font-family: monospace; }}
            input:focus {{ outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }}
            .btn {{ background: #16a34a; color: white; border: none; padding: 14px 28px; font-size: 16px; font-weight: 700; border-radius: 8px; cursor: pointer; width: 100%; transition: all 0.2s; }}
            .btn:hover {{ background: #15803d; }}
            .help {{ font-size: 12px; color: #64748b; margin-top: 4px; }}
            .field-group {{ margin-bottom: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0 0 8px 0;font-size:26px;">⚡ Shepherd AI — Auto-Reply Activator</h1>
                <p style="margin:0;opacity:0.9;font-size:15px;">Activate and verify 24/7 WhatsApp AI Auto-Reply directly in the database.</p>
            </div>

            <div class="card" style="border: 2px solid #22c55e;">
                <h2 style="margin-top:0;color:#0f172a;font-size:20px;display:flex;align-items:center;gap:8px;">
                    🚀 1-Click Database Activator
                </h2>
                <p style="font-size:14px;color:#475569;margin-bottom:20px;">
                    Enter your credentials below and click <strong>"Activate 24/7 AI Auto-Reply"</strong>. This saves directly to PostgreSQL, sets <code>ai_auto_reply_enabled = true</code> and <code>mode = auto-send</code> across all organizations.
                </p>

                <form method="POST" action="/api/settings/debug-ai">
                    <div class="field-group">
                        <label>🔑 Google Gemini API Key</label>
                        <input type="text" name="gemini_api_key" placeholder="AIzaSy..." required>
                        <div class="help">Free-tier key from <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#2563eb;">Google AI Studio</a>. Powered by <strong>Gemini 3.5 Flash</strong>.</div>
                    </div>

                    <div class="field-group">
                        <label>📱 WhatsApp Phone Number ID</label>
                        <input type="text" name="phone_number_id" value="1122719754267706" required>
                        <div class="help">From Meta Developer Console for phone number <strong>+234 913 891 3856</strong>.</div>
                    </div>

                    <div class="field-group">
                        <label>🛡️ WhatsApp Permanent Access Token</label>
                        <input type="text" name="whatsapp_token" placeholder="EAAXt1bLVZCfoB..." required>
                        <div class="help">Copy from your Meta WhatsApp Production Setup page ("Step 1: Generate token").</div>
                    </div>

                    <div class="field-group">
                        <label style="display:flex;align-items:center;gap:8px;font-weight:normal;cursor:pointer;">
                            <input type="checkbox" name="apply_all" value="true" checked style="width:18px;height:18px;">
                            <strong>Apply to ALL organizations in database</strong> (ensures no routing mismatch)
                        </label>
                    </div>

                    <button type="submit" class="btn">⚡ ACTIVATE 24/7 AI AUTO-REPLY NOW</button>
                </form>
            </div>

            <h2 style="color:#0f172a;font-size:20px;margin-bottom:12px;">📊 Current Database State ({len(orgs_data)} Organizations)</h2>
            {org_cards_html}

            <div style="text-align:center;margin-top:20px;">
                <a href="/api/settings/debug-ai?format=json" style="color:#64748b;font-size:13px;text-decoration:none;">View Raw JSON</a>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.post("/debug-ai")
async def debug_ai_activate(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handles form submission from /api/settings/debug-ai
    Updates organizations directly in PostgreSQL
    """
    form_data = await request.form()
    gemini_key = str(form_data.get("gemini_api_key") or "").strip()
    phone_id = str(form_data.get("phone_number_id") or "").strip()
    wa_token = str(form_data.get("whatsapp_token") or "").strip()
    apply_all = form_data.get("apply_all") in ["true", "on", "1", True]

    if not gemini_key or not phone_id or not wa_token:
        return HTMLResponse(
            content="<h3>❌ Error: All fields (Gemini Key, Phone Number ID, WhatsApp Token) are required.</h3><p><a href='/api/settings/debug-ai'>← Go Back</a></p>",
            status_code=400
        )

    try:
        # Update organizations in database
        sql = """
            UPDATE organizations
            SET ai_provider = 'gemini',
                ai_api_key = :api_key,
                ai_model = 'gemini-1.5-flash',
                ai_auto_reply_enabled = 'true',
                ai_reply_mode = 'auto-send',
                whatsapp_phone_id = :phone_id,
                whatsapp_access_token = :wa_token
        """
        if not apply_all:
            sql += " WHERE id = (SELECT id FROM organizations LIMIT 1)"

        db.execute(
            text(sql),
            {
                "api_key": gemini_key,
                "phone_id": phone_id,
                "wa_token": wa_token
            }
        )
        db.commit()

        success_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>AI Activated!</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{ font-family: system-ui, sans-serif; background: #f0fdf4; color: #14532d; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }}
                .card {{ background: white; border: 2px solid #22c55e; border-radius: 16px; padding: 36px; max-width: 550px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }}
                .btn {{ display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div style="font-size: 60px; margin-bottom: 12px;">🎉</div>
                <h1 style="color: #15803d; margin: 0 0 12px 0;">AI Auto-Reply ACTIVATED!</h1>
                <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                    <strong>Success!</strong> All database records have been updated:
                </p>
                <ul style="text-align: left; background: #f8fafc; padding: 16px 24px; border-radius: 8px; font-size: 14px; color: #334155; line-height: 1.8;">
                    <li>✅ <strong>Auto-Reply:</strong> ENABLED (Mode: <code>auto-send</code>)</li>
                    <li>✅ <strong>AI Model:</strong> Gemini 1.5 Flash</li>
                    <li>✅ <strong>Phone ID:</strong> <code>{phone_id}</code> (+234 913 891 3856)</li>
                    <li>✅ <strong>WhatsApp Token:</strong> Saved and active</li>
                </ul>
                <p style="font-size: 15px; color: #0f172a; font-weight: 600; margin-top: 20px;">
                    👉 Send a test WhatsApp message to <strong>+234 913 891 3856</strong> right now. Your AI will reply automatically!
                </p>
                <a href="/api/settings/debug-ai" class="btn">View Updated Status Dashboard</a>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=success_html)

    except Exception as e:
        db.rollback()
        return HTMLResponse(
            content=f"<h3>❌ Database error: {str(e)}</h3><p><a href='/api/settings/debug-ai'>← Try Again</a></p>",
            status_code=500
        )


@router.get("/quick-activate")
async def quick_activate_get(
    api_key: str,
    phone_id: str = "1122719754267706",
    token: str = "",
    db: Session = Depends(get_db)
):
    """
    Emergency URL activator via GET:
    /api/settings/quick-activate?api_key=AIza...&token=EAAXt...&phone_id=1122719754267706
    """
    if not api_key or not token:
        raise HTTPException(status_code=400, detail="api_key and token are required")

    try:
        db.execute(
            text("""
                UPDATE organizations
                SET ai_provider = 'gemini',
                    ai_api_key = :api_key,
                    ai_model = 'gemini-1.5-flash',
                    ai_auto_reply_enabled = 'true',
                    ai_reply_mode = 'auto-send',
                    whatsapp_phone_id = :phone_id,
                    whatsapp_access_token = :wa_token
            """),
            {
                "api_key": api_key,
                "phone_id": phone_id,
                "wa_token": token
            }
        )
        db.commit()
        return {
            "success": True,
            "message": "AI Auto-reply successfully activated across all organizations!",
            "phone_id": phone_id,
            "model": "gemini-1.5-flash / gemini-2.0-flash",
            "mode": "auto-send"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-reply")
async def test_reply_endpoint(
    phone: str = "+2349035523402",
    text_message: str = "Hello",
    db: Session = Depends(get_db)
):
    """
    Live test endpoint — forces AI agent auto-reply and returns step-by-step diagnostics.
    Usage: /api/settings/test-reply?phone=+2349035523402&text_message=Hello
    """
    import traceback
    from datetime import datetime
    from app.services.agent_service import trigger_ai_agent_reply, call_ai_provider, parse_agent_response
    from app.services.meta_whatsapp_service import get_meta_whatsapp_service
    from app.models.contact import Contact
    from app.models.organization import Organization
    from app.config import settings as app_settings

    steps = {}

    # 1. Find or create contact
    clean_p = phone.replace(" ", "").replace("-", "")
    contact = db.query(Contact).filter(
        (Contact.phone == clean_p) | 
        (Contact.phone == "+" + clean_p.lstrip("+"))
    ).first()

    org_row = db.execute(
        text("SELECT id FROM organizations WHERE (whatsapp_access_token IS NOT NULL AND whatsapp_access_token != '') LIMIT 1")
    ).fetchone()
    if not org_row:
        org_row = db.execute(text("SELECT id FROM organizations LIMIT 1")).fetchone()

    if not org_row:
        return {"error": "No organization found"}

    org_id = org_row[0]
    org = db.query(Organization).filter(Organization.id == org_id).first()

    # Auto-heal: ensure org.ai_model in DB is a valid active model (gemini-1.5-flash)
    if org and (not org.ai_model or org.ai_model in ("gemini-3.5-flash", "models/gemini-3.5-flash")):
        org.ai_model = "gemini-1.5-flash"
        db.commit()
        db.refresh(org)

    steps["1_org_check"] = {
        "org_id": str(org_id),
        "org_name": org.name if org else None,
        "ai_auto_reply_enabled": org.ai_auto_reply_enabled if org else None,
        "has_ai_api_key": bool(org.ai_api_key) if org else False,
        "has_env_gemini_key": bool(app_settings.gemini_api_key),
        "model": org.ai_model if org else None,
        "phone_id": org.whatsapp_phone_id if org else None,
        "has_whatsapp_token": bool(org.whatsapp_access_token) if org else False
    }

    if not contact:
        contact = Contact(
            organization_id=org_id,
            name="Test User",
            phone=clean_p if clean_p.startswith("+") else "+" + clean_p,
            category="New Convert",
            join_date=datetime.now()
        )
        db.add(contact)
        db.commit()
        db.refresh(contact)

    steps["2_contact_check"] = {
        "contact_id": str(contact.id),
        "contact_name": contact.name,
        "contact_phone": contact.phone,
        "ai_paused_until": str(contact.ai_paused_until) if contact.ai_paused_until else None,
        "is_paused": bool(contact.ai_paused_until and contact.ai_paused_until.replace(tzinfo=None) > datetime.utcnow())
    }

    # Clear paused state for testing if it was paused
    if contact.ai_paused_until:
        contact.ai_paused_until = None
        db.commit()
        steps["2_contact_check"]["ai_paused_until_cleared"] = True

    # 3. Direct AI Generation Test
    effective_api_key = (org.ai_api_key if org else None) or app_settings.gemini_api_key
    try:
        raw_ai = await call_ai_provider(
            provider="gemini",
            api_key=effective_api_key,
            model="gemini-1.5-flash",
            system_prompt="You are Shepherd AI, a helpful church/business assistant. Respond concisely in JSON format: {\"reply\": \"Your response here\", \"action\": {\"type\": \"NONE\"}}",
            user_turn=f"Customer says: {text_message}"
        )
        parsed = parse_agent_response(raw_ai)
        steps["3_ai_generation"] = {
            "success": True,
            "raw_preview": raw_ai[:200],
            "parsed_reply": parsed.get("reply")
        }
    except Exception as ai_e:
        steps["3_ai_generation"] = {
            "success": False,
            "error": str(ai_e),
            "traceback": traceback.format_exc()
        }

    # 4. Direct Meta WhatsApp Send Test
    reply_to_send = steps.get("3_ai_generation", {}).get("parsed_reply") or "Hello from Shepherd AI! How can I help you today?"
    if org and org.whatsapp_phone_id and org.whatsapp_access_token:
        try:
            meta = get_meta_whatsapp_service(org.whatsapp_phone_id, org.whatsapp_access_token)
            meta_res = await meta.send_message(to_phone=contact.phone, message=reply_to_send)
            steps["4_meta_delivery"] = {
                "success": meta_res.get("success", False),
                "response": meta_res
            }
        except Exception as meta_e:
            steps["4_meta_delivery"] = {
                "success": False,
                "error": str(meta_e),
                "traceback": traceback.format_exc()
            }
    else:
        steps["4_meta_delivery"] = {
            "success": False,
            "error": "Missing phone_number_id or whatsapp_access_token on organization"
        }

    # 5. Also run standard trigger_ai_agent_reply
    try:
        std_reply = await trigger_ai_agent_reply(
            contact_id=contact.id,
            incoming_text=text_message,
            org_id=org_id,
            db=db
        )
        steps["5_standard_orchestrator"] = {
            "returned_value": std_reply
        }
    except Exception as std_e:
        steps["5_standard_orchestrator"] = {
            "error": str(std_e),
            "traceback": traceback.format_exc()
        }

    return {
        "diagnostic_report": steps
    }


@router.get("/sync-workspace")
async def sync_workspace(
    phone_query: Optional[str] = "9035523402",
    db: Session = Depends(get_db)
):
    """
    Consolidates contacts and messages into the active user's organization workspace.
    Ensures Seye's WhatsApp contact (+2349035523402) and conversation logs appear
    directly in Seye's Live Chats dashboard.
    """
    # Find primary organization (the one owned by seye@gmail.com, or the one with the most contacts)
    primary_row = db.execute(text("""
        SELECT organization_id FROM users WHERE email ILIKE '%seye%' LIMIT 1
    """)).fetchone()

    if not primary_row:
        primary_row = db.execute(text("""
            SELECT o.id 
            FROM organizations o
            LEFT JOIN contacts c ON c.organization_id = o.id
            GROUP BY o.id
            ORDER BY COUNT(c.id) DESC, o.created_at DESC
            LIMIT 1
        """)).fetchone()

    if not primary_row:
        return {"error": "No primary organization found"}

    target_org_id = str(primary_row[0])

    # 1. Update target_org_id to have the valid WhatsApp credentials and Gemini AI model
    db.execute(text("""
        UPDATE organizations
        SET ai_provider = 'gemini',
            ai_api_key = COALESCE(ai_api_key, (SELECT ai_api_key FROM organizations WHERE ai_api_key IS NOT NULL AND ai_api_key != '' LIMIT 1)),
            ai_model = 'gemini-1.5-flash',
            ai_auto_reply_enabled = 'true',
            ai_reply_mode = 'auto-send',
            whatsapp_phone_id = '1122719754267706',
            whatsapp_access_token = COALESCE(whatsapp_access_token, (SELECT whatsapp_access_token FROM organizations WHERE whatsapp_access_token IS NOT NULL AND whatsapp_access_token != '' LIMIT 1))
        WHERE id = :target_org_id
    """), {"target_org_id": target_org_id})

    # 2. Reassign contact with phone matching phone_query (e.g. 9035523402) to target_org_id
    db.execute(text("""
        UPDATE contacts
        SET organization_id = :target_org_id
        WHERE phone LIKE :phone_pattern
    """), {"target_org_id": target_org_id, "phone_pattern": f"%{phone_query}%"})

    # 3. Synchronize all messages so that each message's organization_id matches its contact's organization_id
    db.execute(text("""
        UPDATE messages m
        SET organization_id = c.organization_id
        FROM contacts c
        WHERE m.contact_id = c.id AND m.organization_id != c.organization_id
    """))

    db.commit()

    # Fetch summary of target org
    org_obj = db.execute(text("SELECT id, name FROM organizations WHERE id = :org_id"), {"org_id": target_org_id}).fetchone()
    total_contacts = db.execute(text("SELECT count(*) FROM contacts WHERE organization_id = :org_id"), {"org_id": target_org_id}).scalar()
    total_messages = db.execute(text("SELECT count(*) FROM messages WHERE organization_id = :org_id"), {"org_id": target_org_id}).scalar()

    contacts_with_msg = db.execute(text("""
        SELECT c.id, c.name, c.phone, count(m.id) as message_count
        FROM contacts c
        JOIN messages m ON m.contact_id = c.id
        WHERE c.organization_id = :org_id
        GROUP BY c.id, c.name, c.phone
        ORDER BY max(m.created_at) DESC
    """), {"org_id": target_org_id}).fetchall()

    return {
        "success": True,
        "message": "Workspace synchronized successfully!",
        "organization": {
            "id": target_org_id,
            "name": org_obj[1] if org_obj else None
        },
        "total_contacts": total_contacts,
        "total_messages": total_messages,
        "active_chats": [
            {
                "contact_id": str(r[0]),
                "name": r[1],
                "phone": r[2],
                "messages": r[3]
            }
            for r in contacts_with_msg
        ]
    }


@router.get("/configure-ecommerce")
async def configure_ecommerce(
    store_name: Optional[str] = "DeceHub",
    ai_name: Optional[str] = "DeceHub Assistant",
    business_type: Optional[str] = "E-Commerce Tech & Electronics Store",
    primary_color: Optional[str] = "#10b981",
    welcome_message: Optional[str] = "Welcome to DeceHub! How can I help you find the latest tech trends and gadgets today?",
    clear_spiritual_knowledge: bool = True,
    db: Session = Depends(get_db)
):
    """
    Switches AI persona from default church/spiritual mentor to an e-commerce tech store for DeceHub.
    Purges old sample church knowledge base articles and sets up store knowledge.
    """
    # Find primary organization
    primary_row = db.execute(text("""
        SELECT organization_id FROM users WHERE email ILIKE '%seye%' LIMIT 1
    """)).fetchone()

    if not primary_row:
        primary_row = db.execute(text("""
            SELECT o.id 
            FROM organizations o
            LEFT JOIN contacts c ON c.organization_id = o.id
            GROUP BY o.id
            ORDER BY COUNT(c.id) DESC, o.created_at DESC
            LIMIT 1
        """)).fetchone()

    if not primary_row:
        return {"error": "No organization found"}

    target_org_id = str(primary_row[0])

    # 1. Update Organization branding & AI persona
    db.execute(text("""
        UPDATE organizations
        SET name = :store_name,
            ai_name = :ai_name,
            ai_business_type = :business_type,
            ai_tone = 'Professional, friendly, and expert tech sales assistant for DeceHub. Assist customers with product recommendations, technical specifications, orders, warranty, shipping, and shopping inquiries. Keep answers concise, helpful, and natural.',
            widget_primary_color = :primary_color,
            widget_welcome_message = :welcome_message,
            ai_auto_reply_enabled = 'true',
            ai_reply_mode = 'auto-send'
        WHERE id = :org_id
    """), {
        "store_name": store_name,
        "ai_name": ai_name,
        "business_type": business_type,
        "primary_color": primary_color,
        "welcome_message": welcome_message,
        "org_id": target_org_id
    })

    # 2. Clear old church / spiritual knowledge resources
    deleted_count = 0
    if clear_spiritual_knowledge:
        # Delete embeddings first
        db.execute(text("""
            DELETE FROM knowledge_embeddings
            WHERE resource_id IN (
                SELECT id FROM knowledge_resources 
                WHERE organization_id = :org_id
                AND (
                    title ILIKE '%convert%' OR title ILIKE '%believer%' OR title ILIKE '%operation win%' 
                    OR title ILIKE '%spiritual%' OR title ILIKE '%sermon%' OR title ILIKE '%bible%'
                    OR title ILIKE '%discipleship%' OR content ILIKE '%operation win bu%'
                    OR content ILIKE '%altar call%' OR content ILIKE '%give their life to christ%'
                )
            )
        """), {"org_id": target_org_id})

        del_res = db.execute(text("""
            DELETE FROM knowledge_resources
            WHERE organization_id = :org_id
            AND (
                title ILIKE '%convert%' OR title ILIKE '%believer%' OR title ILIKE '%operation win%' 
                OR title ILIKE '%spiritual%' OR title ILIKE '%sermon%' OR title ILIKE '%bible%'
                OR title ILIKE '%discipleship%' OR content ILIKE '%operation win bu%'
                OR content ILIKE '%altar call%' OR content ILIKE '%give their life to christ%'
            )
        """), {"org_id": target_org_id})
        deleted_count = del_res.rowcount

    # 3. Add clean DeceHub tech store knowledge
    sample_kb = [
        (
            "DeceHub Store & Product Catalog",
            "DeceHub is an online electronics and tech hub offering the latest tech trends, brand new and certified smartphones, laptops, audio gear, smart accessories, computer components, and consumer gadgets. All items are 100% authentic and covered by standard manufacturer warranties."
        ),
        (
            "Shipping, Delivery & Payment Policy",
            "DeceHub offers fast nationwide shipping across all states. Major city orders are delivered within 24 to 48 hours. Express same-day delivery is available for orders placed before 12pm. We accept secure card payments, bank transfers, and Paystack."
        ),
        (
            "Warranty & 7-Day Return Policy",
            "Every product from DeceHub includes a 1-year limited warranty against hardware manufacturing defects. Customers enjoy a 7-day return or exchange policy if an item arrives damaged or defective in original packaging."
        ),
        (
            "DeceHub Customer Support",
            "Our tech support and sales team is available Monday to Saturday from 8:00 AM to 8:00 PM. For live order inquiries, customers can chat directly with this AI Concierge or contact support via WhatsApp."
        )
    ]

    import uuid
    for title, content in sample_kb:
        existing = db.execute(text("""
            SELECT id FROM knowledge_resources 
            WHERE organization_id = :org_id AND title = :title
        """), {"org_id": target_org_id, "title": title}).fetchone()
        
        if not existing:
            db.execute(text("""
                INSERT INTO knowledge_resources (id, organization_id, title, content, type, created_at)
                VALUES (:id, :org_id, :title, :content, 'Guide', NOW())
            """), {
                "id": str(uuid.uuid4()),
                "org_id": target_org_id,
                "title": title,
                "content": content
            })

    db.commit()

    # Fetch updated state
    current_kbs = db.execute(text("""
        SELECT title FROM knowledge_resources WHERE organization_id = :org_id
    """), {"org_id": target_org_id}).fetchall()

    return {
        "success": True,
        "message": "Store successfully reconfigured for DeceHub!",
        "organization_id": target_org_id,
        "store_name": store_name,
        "ai_name": ai_name,
        "business_type": business_type,
        "primary_color": primary_color,
        "deleted_old_church_resources": deleted_count,
        "active_knowledge_resources": [r[0] for r in current_kbs]
    }


@router.get("/sync-decehub-catalog")
async def sync_decehub_catalog_direct(
    org_id: str = "37423e5c-e2d0-44d3-ab5b-48c7fcf2d9c2",
    clear_existing: bool = True,
    db: Session = Depends(get_db)
):
    """
    Directly syncs all 200+ products from decehub.com WooCommerce Store API
    into the specified organization with authentic images, prices, categories, and permalinks.
    """
    import httpx
    import re
    import urllib.parse
    from uuid import UUID
    from app.models.catalog_item import CatalogItem

    try:
        org_uuid = UUID(org_id)
    except Exception as uuid_err:
        raise HTTPException(status_code=400, detail=f"Invalid org_id UUID: {uuid_err}")

    if clear_existing:
        db.query(CatalogItem).filter(CatalogItem.organization_id == org_uuid).delete()
        db.commit()

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*"
    }

    synced_items = []
    page = 1
    max_pages = 4

    async with httpx.AsyncClient(timeout=30.0) as client:
        while page <= max_pages:
            url = f"https://decehub.com/wp-json/wc/store/v1/products?per_page=100&page={page}"
            try:
                resp = await client.get(url, headers=headers)
                if not resp.is_success:
                    break
                wc_products = resp.json()
                if not wc_products or not isinstance(wc_products, list):
                    break

                for itm in wc_products:
                    title = (itm.get("name") or "").strip()
                    if not title:
                        continue

                    # Parse price
                    prices = itm.get("prices", {})
                    raw_price = prices.get("price") or prices.get("regular_price") or 0
                    minor = prices.get("currency_minor_unit", 2)
                    try:
                        price_amount = float(raw_price) / (10 ** minor) if raw_price else 0.0
                    except:
                        price_amount = 0.0
                    currency = prices.get("currency_code", "NGN")

                    # Parse images
                    imgs = itm.get("images", [])
                    img_url = imgs[0].get("src") if imgs and isinstance(imgs[0], dict) else None

                    # Parse permalink
                    permalink = itm.get("permalink") or f"https://decehub.com/?s={urllib.parse.quote_plus(title)}"

                    # Clean description
                    raw_desc = itm.get("short_description") or itm.get("description") or ""
                    clean_desc = re.sub(r"<[^>]+>", "", raw_desc).strip()

                    # Categories
                    cats = [c.get("name") for c in itm.get("categories", []) if isinstance(c, dict) and c.get("name")]
                    category = cats[0] if cats else "Gadgets"

                    # Tags / attributes
                    attributes = {}
                    tags = [t.get("name") for t in itm.get("tags", []) if isinstance(t, dict) and t.get("name")]
                    for idx, t in enumerate(tags[:5]):
                        attributes[f"feature_{idx + 1}"] = t

                    new_item = CatalogItem(
                        organization_id=org_uuid,
                        title=title,
                        category=category,
                        description=clean_desc,
                        price_amount=price_amount,
                        price_currency=currency,
                        price_unit="each",
                        image_url=img_url,
                        action_url=permalink,
                        attributes=attributes,
                        is_available=True
                    )
                    db.add(new_item)
                    synced_items.append({"title": title, "price": price_amount, "image": bool(img_url)})

                db.commit()
                if len(wc_products) < 100:
                    break
                page += 1
            except Exception as page_err:
                logger.warning(f"Error fetching WooCommerce page {page}: {page_err}")
                break

    return {
        "success": True,
        "message": f"Successfully synced {len(synced_items)} products from decehub.com directly!",
        "organization_id": str(org_uuid),
        "total_synced": len(synced_items),
        "sample": synced_items[:5]
    }


@router.get("/test-transcribe")
async def test_transcribe_status(test: bool = False, db: Session = Depends(get_db)):
    """
    Diagnostic endpoint to verify voice note transcription services and keys.
    Usage: GET /api/settings/test-transcribe?test=true
    """
    import os
    import struct
    import base64
    import httpx
    from app.config import settings as app_settings
    from app.models.organization import Organization
    from app.services.agent_service import transcribe_voice_note

    org_with_key = db.query(Organization).filter(
        (Organization.ai_api_key.isnot(None)) & (Organization.ai_api_key != '')
    ).first()

    has_env_gemini = bool(app_settings.gemini_api_key)
    has_env_groq = bool(getattr(app_settings, "groq_api_key", None) or os.getenv("GROQ_API_KEY"))
    has_org_key = bool(org_with_key and org_with_key.ai_api_key)
    key_to_use = (org_with_key.ai_api_key if org_with_key else None) or app_settings.gemini_api_key

    result = {
        "transcription_services": {
            "tier_1_groq_whisper": {
                "available": has_env_groq,
                "notes": "Free tier (7,200 req/day). Set GROQ_API_KEY to activate ultra-fast 0.3s Whisper."
            },
            "tier_2_gemini_multimodal_audio": {
                "available": has_env_gemini or has_org_key,
                "models": ["gemini-2.0-flash", "gemini-1.5-flash"],
                "active_key_source": "org_db_key" if has_org_key else ("env_gemini_key" if has_env_gemini else "none"),
                "notes": "Free tier (1,500 req/day). Gemini 2.0 Flash natively decodes voice notes without external microservices."
            },
            "tier_3_client_web_speech": {
                "available": True,
                "notes": "100% free browser client SpeechRecognition enabled in chat widget for Chrome, Edge, Safari, Android."
            }
        }
    }

    if test and key_to_use:
        # Build 1 second valid 16kHz mono PCM WAV
        sample_rate = 16000
        num_samples = sample_rate
        raw_pcm = bytearray(num_samples * 2)
        # 44-byte standard RIFF WAV header
        header = struct.pack(
            '<4sI4s4sIHHIIHH4sI',
            b'RIFF', 36 + len(raw_pcm), b'WAVE',
            b'fmt ', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16,
            b'data', len(raw_pcm)
        )
        wav_bytes = bytes(header + raw_pcm)

        test_log = []
        discovered_models = []
        try:
            import google.generativeai as genai
            genai.configure(api_key=key_to_use)
            for m in genai.list_models():
                methods = getattr(m, "supported_generation_methods", []) or []
                if "generateContent" in methods:
                    discovered_models.append(m.name)
        except Exception as le:
            discovered_models.append(f"list_error: {le}")

        # Test audio transcription via google.generativeai SDK
        # Specifically test dedicated transcription model, flash-latest, and discovered models
        test_candidates = [
            "gemini-3.5-transcribe",
            "gemini-flash-latest",
            "gemini-3.5-flash",
            "gemini-3.7-flash",
            "gemini-3.8-flash",
            "gemini-3.6-flash",
            "gemini-3.1-flash-lite",
            "gemini-omni-1.1-flash"
        ] + [m.replace("models/", "") for m in discovered_models]
        seen_cand = set()
        for cand in test_candidates:
            if cand in seen_cand:
                continue
            seen_cand.add(cand)
            if len(test_log) >= 8:
                break
            try:
                g_model = genai.GenerativeModel(model_name=cand)
                audio_part = {"mime_type": "audio/wav", "data": wav_bytes}
                resp = g_model.generate_content([audio_part, "Transcribe this audio verbatim. If blank, output [silence]."])
                test_log.append({
                    "model": cand,
                    "success": True,
                    "text": resp.text if resp else None
                })
            except Exception as me:
                test_log.append({
                    "model": cand,
                    "success": False,
                    "error": str(me)[:200]
                })

        # Test 2: imageio_ffmpeg test
        ffmpeg_status = "unknown"
        try:
            import imageio_ffmpeg
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            ffmpeg_status = f"available: {ffmpeg_exe}"
        except Exception as fe:
            ffmpeg_status = f"failed: {fe}"

        result["live_test"] = {
            "all_discovered_models": discovered_models,
            "gemini_results": test_log,
            "ffmpeg_status": ffmpeg_status
        }
    return result






