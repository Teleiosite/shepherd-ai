"""
Universal Catalog API Router
Allows businesses to manage their products, vehicles, properties, services, and inventory,
or configure and test their external inventory webhook.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
import httpx
import logging

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.models.catalog_item import CatalogItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/catalog", tags=["Universal Catalog"])


# Pydantic Schemas
class CatalogItemCreate(BaseModel):
    title: str
    category: Optional[str] = "General"
    description: Optional[str] = None
    price_amount: Optional[float] = None
    price_currency: Optional[str] = "NGN"
    price_unit: Optional[str] = "per day"
    image_url: Optional[str] = None
    action_url: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_available: Optional[bool] = True


class CatalogItemUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price_amount: Optional[float] = None
    price_currency: Optional[str] = None
    price_unit: Optional[str] = None
    image_url: Optional[str] = None
    action_url: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    is_available: Optional[bool] = None


class CatalogModeSettings(BaseModel):
    catalog_mode: str  # "internal" or "external_webhook"
    external_search_webhook_url: Optional[str] = None
    external_search_webhook_secret: Optional[str] = None


class TestWebhookRequest(BaseModel):
    webhook_url: str
    webhook_secret: Optional[str] = None
    query: Optional[str] = "BMW"
    location: Optional[str] = "Lagos"
    max_budget: Optional[float] = 200000


@router.get("/")
def get_catalog_items(
    search: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all catalog items for the current user's organization."""
    query = db.query(CatalogItem).filter(CatalogItem.organization_id == current_user.organization_id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CatalogItem.title.ilike(s),
                CatalogItem.description.ilike(s),
                CatalogItem.category.ilike(s)
            )
        )
    if category and category.lower() != "all":
        query = query.filter(CatalogItem.category.ilike(category))

    total = query.count()
    items = query.order_by(CatalogItem.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": str(item.id),
                "title": item.title,
                "category": item.category,
                "description": item.description,
                "price_amount": float(item.price_amount) if item.price_amount else None,
                "price_currency": item.price_currency,
                "price_unit": item.price_unit,
                "image_url": item.image_url,
                "action_url": item.action_url,
                "attributes": item.attributes or {},
                "is_available": item.is_available,
                "created_at": item.created_at.isoformat() if item.created_at else None
            }
            for item in items
        ]
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_catalog_item(
    payload: CatalogItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new item in the organization's catalog."""
    item = CatalogItem(
        organization_id=current_user.organization_id,
        title=payload.title,
        category=payload.category,
        description=payload.description,
        price_amount=payload.price_amount,
        price_currency=payload.price_currency or "NGN",
        price_unit=payload.price_unit or "per day",
        image_url=payload.image_url,
        action_url=payload.action_url,
        attributes=payload.attributes or {},
        is_available=payload.is_available if payload.is_available is not None else True
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"success": True, "id": str(item.id), "title": item.title}


@router.put("/{item_id}")
def update_catalog_item(
    item_id: UUID,
    payload: CatalogItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a catalog item."""
    item = db.query(CatalogItem).filter(
        CatalogItem.id == item_id,
        CatalogItem.organization_id == current_user.organization_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Catalog item not found")

    update_data = payload.dict(exclude_unset=True)
    for key, val in update_data.items():
        setattr(item, key, val)

    db.commit()
    db.refresh(item)
    return {"success": True, "id": str(item.id), "title": item.title}


@router.delete("/{item_id}")
def delete_catalog_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a catalog item."""
    item = db.query(CatalogItem).filter(
        CatalogItem.id == item_id,
        CatalogItem.organization_id == current_user.organization_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Catalog item not found")

    db.delete(item)
    db.commit()
    return {"success": True, "message": "Catalog item deleted"}


@router.post("/test-webhook")
async def test_catalog_webhook(
    payload: TestWebhookRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Test an external database/inventory webhook URL.
    Verifies that the endpoint responds and returns valid items array.
    """
    if not payload.webhook_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid webhook URL. Must start with http:// or https://")

    headers = {"Content-Type": "application/json"}
    if payload.webhook_secret:
        headers["X-Shepherd-Secret"] = payload.webhook_secret

    test_payload = {
        "query": payload.query or "BMW",
        "category": "Test",
        "location": payload.location or "Lagos",
        "max_budget": payload.max_budget,
        "attributes": {"test_mode": True}
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(payload.webhook_url, json=test_payload, headers=headers)
            status_code = resp.status_code
            try:
                data = resp.json()
            except:
                data = {"raw_text": resp.text[:500]}

            items_found = 0
            if isinstance(data, list):
                items_found = len(data)
            elif isinstance(data, dict):
                items = data.get("items") or data.get("cars") or data.get("products") or []
                items_found = len(items)

            return {
                "success": resp.is_success,
                "status_code": status_code,
                "items_count": items_found,
                "response_sample": data if isinstance(data, list) else (data.get("items") or data.get("cars") or data)[:3] if isinstance(data, dict) else str(data)[:200]
            }
    except Exception as e:
        logger.error(f"Webhook test failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "hint": "Check that the URL is reachable and accepts POST requests."
        }
