"""
Rule-Based Intent Engine (Zero-Token Cost Optimizer)
Intercepts common greetings, business profile questions, delivery terms, payment methods,
and direct catalog queries to provide instant (<10ms) responses with 0 LLM tokens.
"""

import re
import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.catalog_item import CatalogItem

logger = logging.getLogger(__name__)


def _clean_text(text: str) -> str:
    """Strip prefixes, lowercase, and clean text for rule matching."""
    t = text.strip().lower()
    t = re.sub(r"^\[voice (?:note|message)[^\]]*\]:?\s*", "", t)
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


async def evaluate_rule_intent(
    raw_text: str,
    org: Any,
    db: Session
) -> Dict[str, Any]:
    """
    Evaluates customer message against deterministic rule intents.
    Returns {"matched": True, "reply": ..., "action": ..., "recommended_items": ...}
    or {"matched": False} to proceed to generative LLM.
    """
    cleaned = _clean_text(raw_text)
    if not cleaned:
        return {
            "matched": True,
            "intent": "EMPTY",
            "reply": "Hello! How can I assist you today?",
            "action": {"type": "NONE"},
            "recommended_items": []
        }

    org_name = getattr(org, "name", "") or "DeceHub"
    ai_name = getattr(org, "ai_name", "") or "DeceHub Assistant"
    base_store_url = (getattr(org, "ai_payment_link", None) or getattr(org, "external_search_webhook_url", None) or "https://decehub.com").rstrip("/")
    if not base_store_url.startswith("http"):
        base_store_url = "https://" + base_store_url if base_store_url else "https://decehub.com"

    # 1. GREETINGS & CHECK-INS (Exact and short greetings)
    GREETING_EXACT = {
        "hello", "hi", "hey", "hy", "helo", "helloo", "hiya",
        "good morning", "good afternoon", "good evening", "good day",
        "are you there", "you there", "anyone there", "is anyone there",
        "anyone online", "is anyone online", "anyone here", "hello decehub",
        "hi decehub", "hey decehub", "sannu", "bawo ni", "kedu",
        "greetings", "wassup", "what s up", "whats up", "howdy"
    }

    words = cleaned.split()
    if cleaned in GREETING_EXACT or (len(words) <= 3 and any(w in GREETING_EXACT for w in [cleaned, " ".join(words[:2]), words[0]])):
        reply = (
            f"Hello! Welcome to {org_name}. I am {ai_name}, your sales and support assistant. "
            f"How can I assist you today? Looking for any specific phones, chargers, smartwatches, or accessories?"
        )
        return {
            "matched": True,
            "intent": "GREETING",
            "reply": reply,
            "action": {"type": "NONE"},
            "recommended_items": []
        }

    # 2. LOCATION & STORE ADDRESS
    LOCATION_TRIGGERS = [
        "where are you located", "where is your store", "where is your shop",
        "office address", "store address", "shop address", "where are you",
        "where is your office", "physical store", "physical shop",
        "how can i locate your shop", "where do i find you", "what is your location"
    ]
    if any(trig in cleaned for trig in LOCATION_TRIGGERS) or (cleaned in ["location", "address", "where store", "shop location"]):
        reply = (
            f"Our store and fulfillment center is located at:\n\n"
            f"*{org_name} Store*\n"
            f"Suite 12, DeceHub Commercial Plaza, Lagos, Nigeria.\n\n"
            f"We also offer fast, insured nationwide delivery across all 36 states within 24 to 48 hours. "
            f"Would you like to place an order for delivery or pick up in-store?"
        )
        return {
            "matched": True,
            "intent": "LOCATION",
            "reply": reply,
            "action": {"type": "NONE"},
            "recommended_items": []
        }

    # 3. OPERATING HOURS
    HOURS_TRIGGERS = [
        "what time do you open", "what time do you close", "opening hours",
        "closing hours", "closing time", "opening time", "are you open today",
        "are you open on sunday", "working hours", "business hours",
        "work hours", "operating hours"
    ]
    if any(trig in cleaned for trig in HOURS_TRIGGERS):
        reply = (
            f"Here are our operating hours:\n\n"
            f"*Monday - Friday:* 8:00 AM - 6:00 PM\n"
            f"*Saturday:* 9:00 AM - 5:00 PM\n"
            f"*Sunday:* Online orders & 24/7 automated support\n\n"
            f"You can browse and place orders online anytime at {base_store_url}. "
            f"How may I help you today?"
        )
        return {
            "matched": True,
            "intent": "OPERATING_HOURS",
            "reply": reply,
            "action": {"type": "NONE"},
            "recommended_items": []
        }

    # 4. DELIVERY, SHIPPING & WAYBILL
    DELIVERY_TRIGGERS = [
        "how much is delivery", "delivery fee", "delivery cost", "delivery price",
        "do you deliver", "nationwide delivery", "waybill", "how long does delivery take",
        "delivery timeline", "shipping fee", "shipping cost", "delivery to lagos",
        "delivery to abuja", "delivery to port harcourt", "delivery to ibadan"
    ]
    if any(trig in cleaned for trig in DELIVERY_TRIGGERS) or (cleaned in ["delivery", "shipping", "waybill fee"]):
        reply = (
            f"*Delivery & Shipping Information:*\n\n"
            f"* Lagos State: Same-day or next-day delivery (NGN 2,000 - NGN 3,500 depending on location).\n"
            f"* Other States (Nationwide Waybill): 24 - 48 hours via top logistics partners (NGN 3,500 - NGN 5,500).\n"
            f"* All orders are professionally packaged and fully insured during transit.\n\n"
            f"What product would you like to order, and which state or city are you located in?"
        )
        return {
            "matched": True,
            "intent": "DELIVERY",
            "reply": reply,
            "action": {"type": "NONE"},
            "recommended_items": []
        }

    # 5. PAYMENT METHODS & BANK DETAILS
    PAYMENT_TRIGGERS = [
        "how can i pay", "how do i pay", "payment options", "payment method",
        "payment methods", "bank transfer", "account number", "send account",
        "pay on delivery", "can i pay on delivery", "pod available",
        "account details", "how to make payment"
    ]
    if any(trig in cleaned for trig in PAYMENT_TRIGGERS) or (cleaned in ["account number", "how to pay", "payment"]):
        reply = (
            f"*Payment Options:*\n\n"
            f"1. *Online Checkout:* Secure debit card, USSD, or instant transfer via Paystack at {base_store_url}\n"
            f"2. *Direct Bank Transfer:* We provide verified company account details upon order confirmation.\n"
            f"3. *Payment on Delivery (POD):* Available within select Lagos locations with commitment deposit.\n\n"
            f"Which item would you like to purchase today?"
        )
        return {
            "matched": True,
            "intent": "PAYMENT",
            "reply": reply,
            "action": {"type": "SEND_PAYMENT_LINK"},
            "recommended_items": []
        }

    # 6. WARRANTY & DEFECT POLICY
    WARRANTY_TRIGGERS = [
        "warranty", "guarantee", "do you give warranty", "is there warranty",
        "what if it is faulty", "return policy", "replacement policy"
    ]
    if any(trig in cleaned for trig in WARRANTY_TRIGGERS):
        reply = (
            f"*Quality & Warranty Assurance:*\n\n"
            f"* All our gadgets, chargers, smartwatches, and accessories are 100% original and brand new.\n"
            f"* Devices carry a *1-Year Manufacturer Warranty* (Oraimo, Foomee, Apple, Samsung, etc.).\n"
            f"* We provide a *7-day replacement window* in the rare event of a factory defect.\n\n"
            f"You can shop with complete peace of mind! Which item can I assist you with?"
        )
        return {
            "matched": True,
            "intent": "WARRANTY",
            "reply": reply,
            "action": {"type": "NONE"},
            "recommended_items": []
        }

    # 7. HUMAN CUSTOMER CARE AGENT ESCALATION
    HUMAN_TRIGGERS = [
        "talk to a human", "speak to a human", "speak to a person",
        "customer care number", "call line", "phone number to call",
        "human representative", "speak to manager", "human agent",
        "call customer care", "let me speak to someone"
    ]
    if any(trig in cleaned for trig in HUMAN_TRIGGERS):
        reply = (
            f"I have notified our management team. A human customer care representative is being connected to this chat.\n\n"
            f"You can also reach our direct support line at *+234 913 891 3856* (Mon - Sat, 9am - 6pm).\n\n"
            f"Please feel free to drop any questions or order details right here while our team attends to you!"
        )
        return {
            "matched": True,
            "intent": "HUMAN_ESCALATION",
            "reply": reply,
            "action": {"type": "FLAG_FOR_HUMAN"},
            "recommended_items": []
        }

    # 8. DIRECT HIGH-CONFIDENCE CATALOG MATCH (0 Tokens)
    CATALOG_KEYWORDS = [
        "watch", "watches", "smartwatch", "smartwatches",
        "charger", "chargers", "fast charger",
        "cable", "cables", "usb", "type c", "lightning",
        "battery", "batteries", "power bank", "powerbank",
        "earphone", "earphones", "headphone", "headphones",
        "earbud", "earbuds", "airpod", "airpods", "pods",
        "speaker", "speakers", "bluetooth", "sound",
        "phone", "phones", "screen", "case", "cases", "adapter"
    ]
    GENERAL_CATALOG_TRIGGERS = [
        "what do you sell", "what do you have", "what products", "what gadgets",
        "show me products", "show me your store", "list of products", "list your products",
        "what are you selling", "available products", "see your products",
        "available items", "catalogue", "catalog", "items in store", "store items", "gadgets in store"
    ]

    has_cat_kw = any(k in cleaned for k in CATALOG_KEYWORDS)
    has_gen_trig = any(trig in cleaned for trig in GENERAL_CATALOG_TRIGGERS)

    if has_cat_kw or has_gen_trig:
        try:
            matched_items = []
            if has_cat_kw:
                for kw in CATALOG_KEYWORDS:
                    if kw in cleaned:
                        items = db.query(CatalogItem).filter(
                            CatalogItem.organization_id == org.id,
                            CatalogItem.is_available == True,
                            or_(
                                CatalogItem.title.ilike(f"%{kw}%"),
                                CatalogItem.description.ilike(f"%{kw}%"),
                                CatalogItem.category.ilike(f"%{kw}%")
                            )
                        ).limit(4).all()
                        matched_items.extend(items)
            
            # If broad inquiry or keyword search returned nothing, get top store items
            if not matched_items and has_gen_trig:
                matched_items = db.query(CatalogItem).filter(
                    CatalogItem.organization_id == org.id,
                    CatalogItem.is_available == True
                ).order_by(CatalogItem.created_at.desc()).limit(4).all()

            if matched_items:
                unique_dict = {}
                for itm in matched_items:
                    unique_dict[str(itm.id)] = itm
                unique_list = list(unique_dict.values())[:4]

                card_items = []
                import urllib.parse
                for ci in unique_list:
                    price_display = f"{ci.price_currency or 'NGN'} {ci.price_amount:,.0f}".strip() if ci.price_amount else "Contact for pricing"
                    safe_url = ci.action_url or (f"{base_store_url}/?s={urllib.parse.quote_plus(ci.title)}" if base_store_url else "")
                    card_items.append({
                        "id": str(ci.id),
                        "title": ci.title,
                        "category": ci.category or "",
                        "description": ci.description or "",
                        "price": price_display,
                        "price_amount": float(ci.price_amount) if ci.price_amount else 0,
                        "image_url": ci.image_url or "",
                        "action_url": safe_url,
                        "attributes": ci.attributes or {}
                    })

                reply = (
                    f"Yes! We have authentic, high-quality options in stock with a 1-year warranty and fast nationwide delivery. "
                    f"Here are top available options:"
                )

                return {
                    "matched": True,
                    "intent": "DIRECT_CATALOG_MATCH",
                    "reply": reply,
                    "action": {"type": "SEARCH_CATALOG", "query": cleaned},
                    "recommended_items": card_items
                }
        except Exception as cat_err:
            logger.warning(f"Rule catalog search error: {cat_err}")

    # No deterministic rule matched -> seamlessly hand over to fast Gemini LLM
    return {"matched": False}
