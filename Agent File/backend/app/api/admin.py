"""
Super Admin API Router
Provides comprehensive subscriber management, plan adjustments, granular feature overrides,
and organization administration for Shepherd AI platform owners.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.contact import Contact
from app.models.message import Message
from app.dependencies import get_current_active_user
from app.api.billing import SUBSCRIPTION_PLANS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["super-admin"])

# Verified super admin emails
SUPER_ADMIN_EMAILS = {"seye@gmail.com", "seye4kunmi@gmail.com"}


def is_user_super_admin(user: User) -> bool:
    """Check if a user has super admin privileges."""
    if not user:
        return False
    if getattr(user, "role", "") == "super_admin":
        return True
    if user.email and user.email.lower().strip() in SUPER_ADMIN_EMAILS:
        return True
    return False


def require_super_admin(user: User = Depends(get_current_active_user)) -> User:
    """Dependency that enforces super administrator access."""
    if not is_user_super_admin(user):
        logger.warning(f"Unauthorized super-admin access attempt by user {user.id} ({user.email})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Super administrator privileges required."
        )
    return user


# ==================== SCHEMAS ====================

class UpdatePlanRequest(BaseModel):
    subscription_plan: str  # 'starter', 'growth', 'enterprise'
    monthly_message_limit: Optional[int] = None
    subscription_status: Optional[str] = None  # 'active', 'suspended', 'past_due'


class UpdatePermissionsRequest(BaseModel):
    custom_permissions: Dict[str, bool]


# ==================== ENDPOINTS ====================

@router.get("/check-status")
async def check_admin_status(current_user: User = Depends(get_current_active_user)):
    """Check if the currently authenticated user is a super admin."""
    return {
        "is_super_admin": is_user_super_admin(current_user),
        "email": current_user.email,
        "role": current_user.role
    }


@router.get("/subscribers")
async def list_all_subscribers(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    """
    List all organizations, subscribers, their active plans, quotas, and feature overrides.
    """
    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()
    subscribers = []

    for org in orgs:
        # Find primary owner / contact user
        primary_user = db.query(User).filter(User.organization_id == org.id).order_by(User.created_at.asc()).first()
        contacts_count = db.query(func.count(Contact.id)).filter(Contact.organization_id == org.id).scalar() or 0
        messages_count = db.query(func.count(Message.id)).filter(Message.organization_id == org.id).scalar() or 0

        # Parse custom permissions
        custom_perms = {}
        if org.custom_permissions:
            try:
                custom_perms = json.loads(org.custom_permissions) if isinstance(org.custom_permissions, str) else org.custom_permissions
            except Exception:
                custom_perms = {}

        subscribers.append({
            "id": str(org.id),
            "name": org.name,
            "created_at": org.created_at.isoformat() if org.created_at else None,
            "subscription_plan": (org.subscription_plan or "starter").lower(),
            "subscription_status": org.subscription_status or "active",
            "monthly_message_limit": org.monthly_message_limit or 1000,
            "messages_used_this_month": org.messages_used_this_month or 0,
            "custom_permissions": custom_perms,
            "contacts_count": contacts_count,
            "messages_count": messages_count,
            "owner": {
                "id": str(primary_user.id) if primary_user else None,
                "email": primary_user.email if primary_user else "No user registered",
                "name": primary_user.full_name if primary_user else org.name,
                "role": primary_user.role if primary_user else "unknown"
            } if primary_user else None
        })

    return {
        "total": len(subscribers),
        "subscribers": subscribers
    }


@router.put("/subscribers/{org_id}/plan")
async def update_subscriber_plan(
    org_id: UUID,
    req: UpdatePlanRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    """
    Admin updates a subscriber's plan tier (upgrade/downgrade/reverse), message quota, or status.
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    plan_key = req.subscription_plan.lower().strip()
    if plan_key not in SUBSCRIPTION_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan. Must be one of: {', '.join(SUBSCRIPTION_PLANS.keys())}"
        )

    org.subscription_plan = plan_key

    # Update limit if provided, or default to plan standard limit
    if req.monthly_message_limit is not None:
        org.monthly_message_limit = req.monthly_message_limit
    else:
        org.monthly_message_limit = SUBSCRIPTION_PLANS[plan_key]["monthly_limit"]

    if req.subscription_status:
        org.subscription_status = req.subscription_status

    db.commit()
    db.refresh(org)

    logger.info(f"SuperAdmin {admin.email} updated org {org.id} ({org.name}) to {org.subscription_plan} (limit: {org.monthly_message_limit})")

    return {
        "status": "success",
        "message": f"Successfully updated {org.name} to {plan_key.capitalize()} plan.",
        "organization": {
            "id": str(org.id),
            "subscription_plan": org.subscription_plan,
            "monthly_message_limit": org.monthly_message_limit,
            "subscription_status": org.subscription_status
        }
    }


@router.put("/subscribers/{org_id}/permissions")
async def update_subscriber_permissions(
    org_id: UUID,
    req: UpdatePermissionsRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    """
    Admin configures granular feature permissions for a specific subscriber.
    Allows enabling or disabling individual features independent of their plan tier.
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Store as clean JSON string
    org.custom_permissions = json.dumps(req.custom_permissions)
    db.commit()
    db.refresh(org)

    logger.info(f"SuperAdmin {admin.email} set custom permissions for {org.name}: {req.custom_permissions}")

    return {
        "status": "success",
        "message": f"Custom permissions updated for {org.name}.",
        "custom_permissions": req.custom_permissions
    }


@router.delete("/subscribers/{org_id}")
async def delete_subscriber(
    org_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    """
    Gracefully delete an organization and all associated subscribers and data.
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    org_name = org.name
    db.delete(org)
    db.commit()

    logger.warning(f"SuperAdmin {admin.email} permanently deleted organization {org_id} ({org_name})")

    return {
        "status": "success",
        "message": f"Organization '{org_name}' and all associated records have been removed."
    }
