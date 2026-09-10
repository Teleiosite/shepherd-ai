# 🛡️ Enterprise Security Audit & Penetration Testing Report

**Target Platform:** Shepherd AI — Multi-Channel AI Agent & CRM Platform  
**Audit Scope:** Full Application Stack (FastAPI Backend, React 19 Frontend, WhatsApp Webhooks, PostgreSQL Database, Public Embed Widget)  
**Date of Audit:** September 2026  
**Auditor:** Senior Principal Security Architect & AI Security Engineer  
**Classification:** STRICTLY CONFIDENTIAL / PROPRIETARY  

---

## 1. Executive Summary

A comprehensive, defense-in-depth security audit of the **Shepherd AI** platform was conducted. The assessment evaluated the system across **Authentication & Authorization**, **Multi-Tenant Isolation**, **Input Validation & Injection**, **Server-Side Request Forgery (SSRF)**, **Cryptographic Protection & Secret Management**, **API & Webhook Integrity**, and **Client-Side Storage**.

While the core platform demonstrates strong architectural foundations — such as parameterized SQLAlchemy queries, Pydantic schema validation, and bcrypt password hashing — several **Critical** and **High-severity vulnerabilities** were identified in administrative utility routes, unverified webhooks, SSRF proxy mechanisms, and multi-tenant scoping. 

Immediate remediation of these vulnerabilities is required prior to enterprise commercialization or multi-tenant onboarding.

### Vulnerability Summary Matrix

| Vulnerability ID | Vulnerability Title | Category | Severity | Exploitation Complexity | Remediation Priority |
|---|---|---|:---:|:---:|:---:|
| **SEC-01** | Unauthenticated Administrative Backdoor Endpoints | Broken Access Control | **CRITICAL** | Trivial | **P0 (Immediate)** |
| **SEC-02** | Server-Side Request Forgery (SSRF) in Web Scraper & Webhook Test | SSRF | **CRITICAL** | Low | **P0 (Immediate)** |
| **SEC-03** | Broken Object-Level Authorization (BOLA/IDOR) in Bookings API | Multi-Tenant Isolation | **CRITICAL** | Low | **P0 (Immediate)** |
| **SEC-04** | Authentication Bypass via Connection Code Wildcard Prefix | Authentication Bypass | **CRITICAL** | Trivial | **P0 (Immediate)** |
| **SEC-05** | Missing HMAC Signature Validation on Meta WhatsApp Webhook | Webhook Integrity | **HIGH** | Medium | **P1 (High)** |
| **SEC-06** | Unauthenticated Customer Chat Eavesdropping in Widget Polling | Information Disclosure | **HIGH** | Low | **P1 (High)** |
| **SEC-07** | Plaintext API Key & Token Storage & Hardcoded Startup Secret | Secret Management | **HIGH** | Low | **P1 (High)** |
| **SEC-08** | Wildcard Cross-Origin Resource Sharing (`allow_origins=["*"]`) | Network Security | **MEDIUM** | Medium | **P2 (Medium)** |
| **SEC-09** | Client-Side Storage of Sensitive API Keys in Browser `localStorage` | Client-Side Security | **MEDIUM** | Medium | **P2 (Medium)** |
| **SEC-10** | Unrestricted File Upload & Path Traversal in Media Library | File Handling / DoS | **MEDIUM** | Medium | **P2 (Medium)** |
| **SEC-11** | Missing Rate Limiting on Authentication & Public AI Endpoints | Abuse / Quota Exhaustion | **MEDIUM** | Low | **P2 (Medium)** |

---

## 2. In-Depth Vulnerability Analysis & Proof-of-Concepts (PoC)

---

### 🔴 SEC-01: [CRITICAL] Unauthenticated Administrative Backdoor Endpoints
- **Affected File:** `Agent File/backend/app/api/settings.py` (lines 650, 833, 922, 953, 1144)
- **Vulnerability Type:** CWE-306: Missing Authentication for Critical Function

#### Vulnerability Description:
The settings router exposes several powerful administrative endpoints with **zero authentication**:
1. `GET /api/settings/debug-ai?format=json`: Dumps all organizations, user UUIDs, email addresses, contact counts, message counts, and configured AI models across the entire database.
2. `POST /api/settings/debug-ai`: Accepts form data and executes raw SQL updates (`UPDATE organizations SET ai_api_key = :api_key, whatsapp_phone_id = :phone_id, whatsapp_access_token = :whatsapp_token`) across **ALL organizations in the database**.
3. `GET/POST /api/settings/set-gemini-key`: Allows any caller to overwrite the Gemini API key for all organizations.
4. `GET /api/settings/quick-activate`: URL-based emergency activator allowing arbitrary credential overwrite.
5. `GET /api/settings/sync-workspace`: Allows reassigning any contact and message history to arbitrary organizations.

#### Proof of Concept (PoC):
```bash
# 1. Attacker harvests all tenant emails and organization IDs:
curl -X GET "https://shepherd-ai-backend.onrender.com/api/settings/debug-ai?format=json"

# 2. Attacker hijacks AI auto-replies across all organizations with attacker's key:
curl -X POST "https://shepherd-ai-backend.onrender.com/api/settings/set-gemini-key?key=ATTACKER_KEY"
```

#### Remediation:
- Remove debug/diagnostic routes (`/debug-ai`, `/set-gemini-key`, `/quick-activate`, `/sync-workspace`) from production builds completely, or gate them behind a strict `admin_required` dependency checking `user.role == "superadmin"`.

---

### 🔴 SEC-02: [CRITICAL] Server-Side Request Forgery (SSRF) in Web Scraper & Webhook Test
- **Affected Files:** `Agent File/backend/app/api/browse.py` (lines 10–30) and `Agent File/backend/app/api/catalog.py` (lines 224–250)
- **Vulnerability Type:** CWE-918: Server-Side Request Forgery (SSRF)

#### Vulnerability Description:
1. `browse.py`: The `/api/browse/` endpoint accepts a query `q`. If `q` begins with `http://` or `https://`, the server immediately performs an outbound HTTP request using `httpx.AsyncClient(timeout=10.0, follow_redirects=True)` without any authentication or IP destination restrictions.
2. `catalog.py`: The `/api/catalog/test-webhook` endpoint sends a POST request with arbitrary JSON payloads to any `payload.webhook_url` provided by the caller.

An attacker can exploit this to:
- Probe local internal ports on the Render backend container (`http://127.0.0.1:8000`, `http://127.0.0.1:5432`).
- Query cloud provider instance metadata endpoints (e.g., AWS/GCP/Render metadata services at `http://169.254.169.254/latest/meta-data/` or internal Kubernetes cluster IPs `10.x.x.x`).
- Pivot into internal VPC infrastructure.

#### Proof of Concept (PoC):
```bash
# Attacker queries cloud metadata or local PostgreSQL port via unauthenticated endpoint:
curl -X GET "https://shepherd-ai-backend.onrender.com/api/browse/?q=http://169.254.169.254/computeMetadata/v1/"
```

#### Remediation:
- Restrict `/api/browse/` to authenticated users only.
- Implement an IP blacklist blocking private, loopback, and link-local address spaces (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254/32`, `::1`).
- Disable automatic redirect following or validate redirect targets against the IP blacklist.

---

### 🔴 SEC-03: [CRITICAL] Broken Object-Level Authorization (BOLA / IDOR) in Bookings API
- **Affected File:** `Agent File/backend/app/api/bookings.py` (lines 31–126)
- **Vulnerability Type:** CWE-639: Authorization Bypass Through User-Controlled Key (IDOR)

#### Vulnerability Description:
1. `GET /api/bookings/`: Queries `db.query(Booking).all()` with **no organization filter**. Any logged-in user from Organization A sees all client appointments, patient names, phone numbers, and notes belonging to Organization B.
2. `PUT /api/bookings/{booking_id}/status`: Updates any booking record in the database by UUID without verifying that the booking belongs to `current_user.organization_id`.
3. `DELETE /api/bookings/{booking_id}`: Deletes any booking record in the database by UUID without organization validation.

#### Proof of Concept (PoC):
```bash
# User from Tenant A retrieves all appointments of Tenant B:
curl -H "Authorization: Bearer TENANT_A_TOKEN" \
     "https://shepherd-ai-backend.onrender.com/api/bookings/"

# User from Tenant A cancels or deletes Tenant B's appointment:
curl -X DELETE -H "Authorization: Bearer TENANT_A_TOKEN" \
     "https://shepherd-ai-backend.onrender.com/api/bookings/TARGET_BOOKING_UUID"
```

#### Remediation:
- Update `Booking` queries to join `Contact` and enforce `Contact.organization_id == current_user.organization_id`.

```python
# Fixed list_bookings query:
bookings = db.query(Booking).join(Contact).filter(
    Contact.organization_id == current_user.organization_id
).order_by(Booking.created_at.desc()).all()
```

---

### 🔴 SEC-04: [CRITICAL] Authentication Bypass via Connection Code Wildcard Prefix
- **Affected Files:** `Agent File/backend/app/api/groups.py` (lines 24–36) and `Agent File/backend/app/api/bridge_polling.py` (lines 56–60)
- **Vulnerability Type:** CWE-287: Improper Authentication

#### Vulnerability Description:
The desktop bridge authentication mechanism matches users using a prefix search on the user's UUID:
```python
user = db.query(User).filter(cast(User.id, String).like(f"{code.lower()}%")).first()
```
If an unauthenticated attacker passes `?code=a` or `?code=0`, PostgreSQL executes `WHERE id LIKE 'a%' LIMIT 1` and authenticates the attacker as the first user whose UUID begins with that character! The attacker completely bypasses JWT authentication and gains full access to that organization's WhatsApp groups, member lists, and pending broadcast queues.

#### Remediation:
- Deprecate prefix-based matching. Generate cryptographically secure, random 32-character bridge API tokens (`secrets.token_urlsafe(32)`), hash them in the database with SHA-256, and verify them with exact equality:
```python
token_hash = hashlib.sha256(provided_token.encode()).hexdigest()
org = db.query(Organization).filter(Organization.bridge_token_hash == token_hash).first()
```

---

### 🟠 SEC-05: [HIGH] Missing HMAC Signature Validation on Meta WhatsApp Webhook
- **Affected File:** `Agent File/backend/app/api/whatsapp.py` (lines 507–535)
- **Vulnerability Type:** CWE-345: Insufficient Verification of Data Authenticity

#### Vulnerability Description:
Meta WhatsApp Cloud API signs every inbound webhook event using an HMAC-SHA256 hash in the `X-Hub-Signature-256` HTTP header, keyed with the app's `APP_SECRET`. 

Currently, `/api/whatsapp/webhook` checks verification tokens only during GET subscription handshake (`hub.challenge`), but **does not verify `X-Hub-Signature-256` on inbound POST requests**. 

Any external attacker can send crafted JSON payloads to `/api/whatsapp/webhook`, spoofing inbound messages from arbitrary phone numbers, triggering unauthorized AI responses, and causing the system to dispatch real WhatsApp messages to victims.

#### Remediation:
Implement mandatory HMAC verification on all incoming webhook payloads:
```python
import hmac
import hashlib

def verify_meta_signature(raw_body: bytes, signature_header: str, app_secret: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected_sig = hmac.new(app_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    received_sig = signature_header.split("sha256=")[1]
    return hmac.compare_digest(expected_sig, received_sig)
```

---

### 🟠 SEC-06: [HIGH] Unauthenticated Customer Chat Eavesdropping in Widget Polling
- **Affected File:** `Agent File/backend/app/api/widget.py` (lines 270–310)
- **Vulnerability Type:** CWE-200: Exposure of Sensitive Information to an Unauthorized Actor

#### Vulnerability Description:
The website chat widget polling endpoint allows visitors to receive agent replies:
`GET /api/widget/poll/{org_id}/{visitor_id}`

The endpoint requires no password, token, or session signature. An attacker who enumerates standard Nigerian or international phone numbers (e.g. `+2348012345678`) can read all outbound messages sent to that customer, including order details, payment instructions, addresses, and private conversation logs.

#### Remediation:
- Generate a signed visitor session JWT or HMAC token when the chat session begins (`visitor_token`).
- Require `X-Visitor-Token` or `?token=` on all polling requests, verifying that the caller owns the visitor session.

---

### 🟠 SEC-07: [HIGH] Plaintext API Key & Token Storage & Hardcoded Startup Secret
- **Affected Files:** `Agent File/backend/app/main.py` (line 71) and `Agent File/backend/app/models/organization.py`
- **Vulnerability Type:** CWE-312: Cleartext Storage of Sensitive Information

#### Vulnerability Description:
1. In `main.py` (lines 67–88), an encoded Gemini API key is embedded directly in the source code:
   `base64.b64decode(b"QVEuQWI4Uk42TFdxcHR1R0VocTZKRm81YU5JNVI0Y1VVVnpPN2xza2FGR1ROWjZ4M1ZEWHc=")`
2. Meta WhatsApp permanent access tokens and customer AI API keys are stored in plaintext strings in the `organizations` table. If the database is compromised, all tenant WhatsApp credentials and AI keys are immediately exposed.

#### Remediation:
- Remove hardcoded secrets from code files immediately; load exclusively from environment variables (`os.getenv`).
- Implement symmetric envelope encryption (AES-256-GCM or Fernet) for all third-party credentials (`ai_api_key`, `whatsapp_access_token`) before persisting to PostgreSQL.

---

### 🟡 SEC-08: [MEDIUM] Wildcard Cross-Origin Resource Sharing (`allow_origins=["*"]`)
- **Affected File:** `Agent File/backend/app/main.py` (lines 14–22)
- **Vulnerability Type:** CWE-942: Permissive Cross-Origin Resource Sharing Policy

#### Vulnerability Description:
The FastAPI backend configures CORS with:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
While public widget endpoints require cross-origin access to embed on client websites, administrative and CRM endpoints (`/api/contacts`, `/api/messages`, `/api/settings`) should not accept requests from arbitrary origins.

#### Remediation:
- Separate public widget endpoints onto an unrestricted CORS router, while restricting the dashboard API CORS to explicit verified domains:
```python
allowed_origins = [
    "https://shepherd-ai.vercel.app",
    "http://localhost:3000"
]
```

---

### 🟡 SEC-09: [MEDIUM] Insecure Client-Side Storage of API Keys in Browser `localStorage`
- **Affected Files:** `src/components/Settings.tsx` and `src/services/aiAgentService.ts`
- **Vulnerability Type:** CWE-922: Insecure Storage of Sensitive Information

#### Vulnerability Description:
The frontend stores Google Gemini API keys in `localStorage.setItem('shepherd_google_api_key', ...)`. Any Cross-Site Scripting (XSS) vulnerability or malicious third-party npm package in the frontend bundle can read `localStorage` and exfiltrate the organization's API key.

#### Remediation:
- Eliminate client-side API key storage. All AI calls should route through the authenticated backend API, keeping keys strictly on the server.

---

### 🟡 SEC-10: [MEDIUM] Unrestricted File Upload & Path Traversal in Media Library
- **Affected File:** `Agent File/backend/app/api/media_library.py` (lines 63–95)
- **Vulnerability Type:** CWE-434: Unrestricted Upload of File with Dangerous Type

#### Vulnerability Description:
1. `file_path = f"{current_user.organization_id}/{file.filename}"`: The original filename provided by the client is interpolated directly into the storage path. If `file.filename` contains `../` or special control characters, path traversal in local storage or S3 bucket structures can occur.
2. `contents = await file.read()` reads the entire file into memory before checking its size, leaving the server vulnerable to memory exhaustion (DoS).
3. No MIME type or file extension whitelist is enforced (an attacker could upload `.html` or `.svg` files with embedded scripts).

#### Remediation:
- Rename uploaded files to UUIDs (`f"{uuid.uuid4().hex}{ext}"`).
- Enforce a strict 15MB file size limit before buffering into RAM.
- Whitelist acceptable MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.

---

### 🟡 SEC-11: [MEDIUM] Missing Rate Limiting on Authentication & Public AI Endpoints
- **Affected Files:** `Agent File/backend/app/api/auth.py` and `Agent File/backend/app/api/widget.py`
- **Vulnerability Type:** CWE-799: Improper Control of Generation Rate

#### Vulnerability Description:
1. `/api/auth/login` and `/api/auth/register` have no rate limiting or lockout controls. An attacker can perform credential stuffing and brute-force password attacks against user accounts.
2. `/api/widget/message` and `/api/widget/voice-message` allow unauthenticated callers to submit automated prompts. A bot could flood the endpoint to exhaust the organization's monthly quota and Gemini API tokens.

#### Remediation:
- Deploy `slowapi` rate limiting middleware on FastAPI:
  - `/api/auth/login`: 5 requests / minute per IP.
  - `/api/widget/message`: 20 requests / minute per visitor IP/ID.

---

## 3. Prioritized Remediation Roadmap

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       REMEDIATION IMPLEMENTATION TIMELINE                  │
├─────────────────┬──────────────────────────────────────────┬───────────────┤
│ Phase           │ Action Items                             │ Target Window │
├─────────────────┼──────────────────────────────────────────┼───────────────┤
│ Phase 1: P0     │ • Remove/Protect debug-ai endpoints      │ Immediate     │
│ (Critical)      │ • Patch SSRF in browse & webhook test    │ (24 Hours)    │
│                 │ • Fix Booking BOLA & IDOR queries        │               │
│                 │ • Replace UUID prefix matching in bridge │               │
├─────────────────┼──────────────────────────────────────────┼───────────────┤
│ Phase 2: P1     │ • Add Meta X-Hub-Signature validation    │ 3 - 5 Days    │
│ (High)          │ • Sign visitor widget polling sessions   │               │
│                 │ • Encrypt API keys & tokens in DB        │               │
│                 │ • Remove hardcoded keys in main.py       │               │
├─────────────────┼──────────────────────────────────────────┼───────────────┤
│ Phase 3: P2     │ • Restrict CORS domains for admin API    │ 1 - 2 Weeks   │
│ (Medium)        │ • Remove localStorage API key storage    │               │
│                 │ • Sanitize filenames & enforce size/MIME │               │
│                 │ • Add slowapi rate-limiting middleware   │               │
└─────────────────┴──────────────────────────────────────────┴───────────────┘
```

---

## 4. Conclusion & Sign-Off

The Shepherd AI platform features a well-conceived domain model, an advanced zero-token intent engine, and seamless WhatsApp and Web Widget communication channels. Addressing the critical authorization, SSRF, and debug endpoint vulnerabilities highlighted in this report will elevate the platform to **enterprise-grade security readiness**, ensuring tenant data isolation, regulatory compliance (NDPR / GDPR), and robust protection against adversarial exploitation.
