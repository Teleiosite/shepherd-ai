"""Billing and SaaS subscription router for Flutterwave payment integration."""
import os
import time
import logging
import httpx
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.organization import Organization
from app.dependencies import get_current_active_user, get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter()

# Authoritative Plan Definitions — quotas enforced server-side
SUBSCRIPTION_PLANS: Dict[str, Dict[str, Any]] = {
    "starter": {
        "id": "starter",
        "name": "Starter Concierge",
        "price": 100000.0,
        "currency": "NGN",
        "monthly_limit": 1000,
        "period": "month",
        "description": "Ideal for single-location businesses, boutique stores, and salons.",
        "features": ["web_chat", "catalog", "bookings", "knowledge_base", "contacts", "dashboard", "settings"]
    },
    "growth": {
        "id": "growth",
        "name": "Growth & Omnichannel",
        "price": 250000.0,
        "currency": "NGN",
        "monthly_limit": 10000,
        "period": "month",
        "description": "For growing businesses, clinics, and churches needing WhatsApp + Web.",
        "features": ["web_chat", "catalog", "bookings", "knowledge_base", "contacts", "dashboard", "settings", "whatsapp", "whatsapp_bridge", "voice_notes", "live_chats", "workflows", "campaigns", "media_library"]
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise & Marketplace",
        "price": 500000.0,
        "currency": "NGN",
        "monthly_limit": 50000,
        "period": "month",
        "description": "For platforms like Rentigram, real estate firms, and multi-location fleets.",
        "features": ["web_chat", "catalog", "bookings", "knowledge_base", "contacts", "dashboard", "settings", "whatsapp", "whatsapp_bridge", "voice_notes", "live_chats", "workflows", "campaigns", "media_library", "groups", "external_webhook", "white_label"]
    }
}

# Features allowed per plan (for gating checks)
PLAN_FEATURES = {f: plan["features"] for f, plan in SUBSCRIPTION_PLANS.items()}


def require_plan_feature(feature: str, org: Organization):
    """Raise 403 if the organization's plan does not include the requested feature.
    Super Admin custom_permissions overrides plan defaults if explicitly set.
    """
    import json
    if getattr(org, "custom_permissions", None):
        try:
            custom_perms = json.loads(org.custom_permissions) if isinstance(org.custom_permissions, str) else org.custom_permissions
            if isinstance(custom_perms, dict) and feature in custom_perms:
                if custom_perms[feature] is True:
                    return  # Super Admin explicitly enabled this feature!
                elif custom_perms[feature] is False:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"The '{feature}' feature has been disabled for your organization by the administrator."
                    )
        except (ValueError, TypeError):
            pass

    plan = (org.subscription_plan or "starter").lower()
    allowed = PLAN_FEATURES.get(plan, PLAN_FEATURES["starter"])
    if feature not in allowed:
        plan_names = {"starter": "Starter Concierge", "growth": "Growth & Omnichannel", "enterprise": "Enterprise & Marketplace"}
        upgrade_to = "Growth & Omnichannel" if plan == "starter" else "Enterprise & Marketplace"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"The '{feature}' feature is not available on your {plan_names.get(plan, plan)} plan. Please upgrade to {upgrade_to}."
        )



class InitializePaymentRequest(BaseModel):
    plan_id: str
    redirect_url: Optional[str] = None


@router.get("/plans")
async def get_plans():
    """List available SaaS subscription tiers and message limits."""
    return {"plans": list(SUBSCRIPTION_PLANS.values())}


@router.post("/flutterwave/initialize")
async def initialize_flutterwave_payment(
    req: InitializePaymentRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Initialize a secure Flutterwave hosted checkout session.
    Calculates prices server-side to prevent client price tampering.
    """
    plan_id = req.plan_id.lower().strip()
    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan '{req.plan_id}'. Choose from: {', '.join(SUBSCRIPTION_PLANS.keys())}"
        )

    plan = SUBSCRIPTION_PLANS[plan_id]
    secret_key = getattr(settings, "flutterwave_secret_key", None) or os.getenv("FLUTTERWAVE_SECRET_KEY")
    if not secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Flutterwave secret key is not configured. Please set FLUTTERWAVE_SECRET_KEY in your server environment."
        )

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Generate unique transaction reference
    org_short_id = str(org.id).replace("-", "")[:8]
    timestamp = int(time.time())
    tx_ref = f"shp_{org_short_id}_{timestamp}_{plan_id}"

    # Determine redirect URL
    frontend_base = (settings.frontend_url or "https://shepherd-ai.vercel.app").rstrip("/")
    redirect_url = req.redirect_url or f"{frontend_base}/#/billing?verify=flutterwave&tx_ref={tx_ref}"

    payload = {
        "tx_ref": tx_ref,
        "amount": plan["price"],
        "currency": plan["currency"],
        "redirect_url": redirect_url,
        "meta": {
            "organization_id": str(org.id),
            "plan_id": plan_id,
            "monthly_limit": plan["monthly_limit"],
            "user_id": str(current_user.id)
        },
        "customer": {
            "email": current_user.email,
            "name": getattr(current_user, "full_name", None) or getattr(current_user, "name", None) or org.name
        },
        "payment_options": "card,banktransfer,ussd,account,mobilemoney,opay",
        "customizations": {
            "title": f"Shepherd AI — {plan['name']}",
            "description": f"Monthly subscription ({plan['monthly_limit']:,} AI messages / month)",
            "logo": f"{frontend_base}/logo.png"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {secret_key}",
                "Content-Type": "application/json"
            }
            res = await client.post("https://api.flutterwave.com/v3/payments", json=payload, headers=headers)
            res_data = res.json()

        if res.status_code != 200 or res_data.get("status") != "success":
            logger.error(f"[Flutterwave] Payment init failed: {res_data}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=res_data.get("message", "Failed to initialize payment with Flutterwave")
            )

        payment_url = res_data.get("data", {}).get("link")
        if not payment_url:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Flutterwave did not return a payment link")

        return {
            "status": "success",
            "payment_url": payment_url,
            "tx_ref": tx_ref,
            "plan": plan
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Flutterwave] Unexpected error initializing payment: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/flutterwave/verify/{tx_ref_or_id}")
async def verify_flutterwave_payment(
    tx_ref_or_id: str,
    db: Session = Depends(get_db)
):
    """
    Verify payment status with Flutterwave API and activate the subscription.
    Can be called with either the transaction ID or transaction reference (tx_ref).
    """
    secret_key = getattr(settings, "flutterwave_secret_key", None) or os.getenv("FLUTTERWAVE_SECRET_KEY")
    if not secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Flutterwave secret key is not configured on server"
        )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": f"Bearer {secret_key}"}

            # Check if parameter is a numeric transaction ID or a tx_ref string
            if tx_ref_or_id.isdigit():
                verify_url = f"https://api.flutterwave.com/v3/transactions/{tx_ref_or_id}/verify"
            else:
                verify_url = f"https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref={tx_ref_or_id}"

            res = await client.get(verify_url, headers=headers)
            res_data = res.json()

        if res.status_code != 200 or res_data.get("status") != "success":
            logger.warning(f"[Flutterwave] Verification failed for {tx_ref_or_id}: {res_data}")
            return {
                "status": "failed",
                "message": res_data.get("message", "Transaction verification failed")
            }

        data = res_data.get("data", {})
        tx_status = data.get("status", "").lower()
        if tx_status != "successful":
            return {
                "status": "pending_or_failed",
                "transaction_status": tx_status,
                "message": f"Transaction is {tx_status}"
            }

        # Extract transaction details & metadata
        meta = data.get("meta", {}) or {}
        org_id = meta.get("organization_id")
        plan_id = meta.get("plan_id", "starter").lower()
        charged_amount = float(data.get("amount", 0))

        if not org_id:
            # Fallback parse from tx_ref: shp_{org_short}_{ts}_{plan_id}
            tx_ref = data.get("tx_ref", "")
            parts = tx_ref.split("_")
            if len(parts) >= 4:
                plan_id = parts[3].lower()

        # Authoritative plan validation
        plan = SUBSCRIPTION_PLANS.get(plan_id, SUBSCRIPTION_PLANS["starter"])

        # Find organization in DB
        org = None
        if org_id:
            org = db.query(Organization).filter(Organization.id == org_id).first()
        
        if not org and data.get("tx_ref"):
            org = db.query(Organization).filter(Organization.flutterwave_tx_ref == data.get("tx_ref")).first()

        if org:
            org.subscription_plan = plan["id"]
            org.subscription_status = "active"
            org.monthly_message_limit = plan["monthly_limit"]
            org.flutterwave_tx_ref = data.get("tx_ref")
            db.commit()
            logger.info(f"✅ [Flutterwave] Upgraded organization {org.name} ({org.id}) to plan {plan['name']}")

        return {
            "status": "success",
            "message": "Payment verified and subscription activated successfully!",
            "plan": plan["id"],
            "plan_name": plan["name"],
            "monthly_limit": plan["monthly_limit"],
            "amount_paid": charged_amount
        }

    except Exception as e:
        logger.error(f"[Flutterwave] Verification error: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/flutterwave-webhook")
async def flutterwave_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook receiver for real-time Flutterwave payment notifications.
    Validates secret hash header for security.
    """
    # 1. Verify Secret Hash Header
    configured_hash = getattr(settings, "flutterwave_secret_hash", None) or os.getenv("FLUTTERWAVE_SECRET_HASH")
    if configured_hash:
        incoming_hash = request.headers.get("verif-hash")
        if incoming_hash != configured_hash:
            logger.warning("[Flutterwave Webhook] Rejected request with invalid verif-hash")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature hash")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")

    event = payload.get("event")
    data = payload.get("data", {})

    logger.info(f"[Flutterwave Webhook] Received event: {event}, status: {data.get('status')}")

    # 2. Process successful charge events
    if data.get("status") == "successful":
        meta = data.get("meta", {}) or {}
        org_id = meta.get("organization_id")
        plan_id = meta.get("plan_id", "starter").lower()
        tx_ref = data.get("tx_ref", "")

        plan = SUBSCRIPTION_PLANS.get(plan_id, SUBSCRIPTION_PLANS["starter"])

        if org_id:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org:
                org.subscription_plan = plan["id"]
                org.subscription_status = "active"
                org.monthly_message_limit = plan["monthly_limit"]
                org.flutterwave_tx_ref = tx_ref
                db.commit()
                logger.info(f"✅ [Flutterwave Webhook] Idempotently updated org {org.name} to {plan['name']}")

    return {"status": "ok"}
