# 🚀 Shepherd AI — Enterprise Multi-Channel AI Agent & CRM Platform

> **A unified, privacy-first conversational AI and multi-channel automation platform. Shepherd AI empowers businesses, service providers, and organizations to engage leads, automate sales, showcase dynamic visual product catalogs, manage bookings, and deliver 24/7 personalized customer support across WhatsApp and Website Chat Widgets.**

[![Live Web App](https://img.shields.io/badge/Web%20App-Vercel-black?style=for-the-badge&logo=vercel)](https://shepherd-ai.vercel.app)
[![API Backend](https://img.shields.io/badge/FastAPI-Render-46E3B7?style=for-the-badge&logo=render)](https://shepherd-ai-backend.onrender.com)
[![Database](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![AI Engine](https://img.shields.io/badge/Google%20Gemini-3.7%20Flash-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![WhatsApp](https://img.shields.io/badge/Meta%20Cloud%20API-v18.0-25D366?style=for-the-badge&logo=whatsapp)](https://developers.facebook.com/docs/whatsapp/cloud-api)

---

## 🌟 Platform Highlights

Shepherd AI operates as an intelligent 24/7 digital representative for your organization. It combines a **zero-token rule engine**, **generative RAG intelligence**, **bi-directional WhatsApp Cloud synchronization**, **interactive visual commerce**, and **voice note processing** into a single multi-tenant workspace.

```
                  ┌──────────────────────────────────────────────────────────┐
                  │                 Shepherd AI Ecosystem                    │
                  └────────────────────────────┬─────────────────────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
       💬 WhatsApp Cloud API           🌐 Website Widget               👥 Team Dashboard
    • Official Meta Graph API       • Zero-dependency script        • Real-time Live Chats
    • Multi-Product Visual Cards    • Client Speech Recognition     • Booking & Lead Manager
    • Inbound Voice Audio (OGG)     • Responsive Catalog Cards      • Media Library & RAG Docs
    • Audio Voice Notes (Opus)      • Customizable Brand Theme      • Workflows & Group Broadcasts
```

---

## ⚡ Key Capabilities

### 1. 🤖 24/7 Conversational AI Agent & Orchestrator
- **Natural Tone Calibration:** Responds dynamically in your business persona (warm, professional, consultative, or sales-driven).
- **Rule-Based Intent Engine (Zero-Token Cost Optimizer):**
  - High-speed pattern matcher resolving common inquiries (**Greetings, Operating Hours, Store Location, Nationwide Delivery/Waybill fees, Payment Methods, Warranties, and Human Escalation**) in **<10ms with 0 LLM tokens**, preserving quota and eliminating latency.
- **Smart Tool & Intent Execution:**
  - `CREATE_BOOKING`: Automatically schedules appointments with strict date normalization (`YYYY-MM-DD`, `HH:MM AM/PM`) and customer contact validation.
  - `SEARCH_CATALOG`: Real-time inventory matching with title-boosted relevance algorithms.
  - `FLAG_FOR_HUMAN`: Automatically detects crisis, dissatisfaction, or customer request for human triage and pauses the AI for 12 hours.
  - `SEND_DOCUMENT` / `SEND_IMAGE`: Delivers matching brochures, invoices, and spec sheets directly from the Media Library.
  - `SEND_PAYMENT_LINK`: Integrates with Paystack, Flutterwave, or direct checkout links.

### 2. 🛍️ Interactive Visual Catalog & WhatsApp Product Cards
- **Multi-Product Rich Cards on WhatsApp:**
  - Instead of dumping plain text links, the agent dispatches up to 3 individual visual media cards with high-resolution photos, bold titles, localized currency prices, stock availability, and direct checkout URLs.
- **Web Widget Interactive Carousel:**
  - Embeddable visual cards with direct "View & Order" action buttons, optimized for mobile and desktop screens.
- **Catalog Management:**
  - Internal catalog inventory with custom attribute schemas (brand, year, specifications).
  - External inventory webhook support to integrate with existing WooCommerce, Shopify, or custom ERP inventory systems.

### 3. 🎙️ Voice Note Intelligence (Two-Way Audio)
- **Inbound WhatsApp Voice Notes:**
  - Automatically downloads binary voice notes (`audio/ogg; codecs=opus`) from Meta Cloud Graph API, inspects CDN redirects, and transcribes audio via Gemini Multimodal Audio / Whisper.
- **Web Chat Widget Voice Notes:**
  - Browser Web Speech API integration capturing instant text transcripts with audio blob fallback.
  - Resilient network delivery with automatic 2-attempt backoff retry and payload optimization.
- **Outbound Voice Synthesis:**
  - Generates natural synthesized voice replies (`ai_voice_reply_mode: "voice" | "match_input" | "text"`) using natural neural voices (e.g. `en-NG-EzinneNeural`).

### 4. 📋 Lead Management & CRM
- **Automatic Contact Creation:** Automatically captures phone numbers, visitor identities, and lead sources from incoming chats and web sessions.
- **Dynamic Categorization:** Segment contacts by lifecycle stage (`Website Lead`, `Customer`, `VIP`, `Follow-up`).
- **Full Conversation History:** Persistent conversation threads tracking inbound, outbound, and AI automated responses.
- **Human Handover & Triage:** One-click toggle to pause the AI agent and hand control over to a human representative.

### 5. 📅 Bookings & Appointment Manager
- Captures consultation, demo, inspection, and service bookings.
- Interactive workflow: Confirm, Complete, or Cancel appointments.
- Strict anti-hallucination validation ensuring phone number or email verification before confirming appointments.

### 6. 👥 WhatsApp Groups & Broadcast Scheduling
- Automated group member synchronization.
- **Auto-Welcome:** Sends personalized private direct messages to new members who join synced WhatsApp groups.
- **Broadcast Queue:** Schedule targeted group broadcasts immediately or at future timestamps with rescheduling and cancellation controls.

### 7. 🧠 Context-Aware Knowledge Base (RAG)
- Semantic vector knowledge search indexing company PDFs, documents, policies, price sheets, and FAQs.
- Embeddings dynamically referenced during generative turns to answer bespoke domain questions without hallucination.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Clients & Channels"]
        WA[Customer on WhatsApp]
        WebVisitor[Website Visitor]
        Staff[Business Staff Dashboard]
    end

    subgraph Ingestion ["Ingestion & Edge Gateways"]
        MetaAPI["Meta Cloud API (Webhook)"]
        WidgetAPI["Web Widget API (/api/widget)"]
        DashboardUI["React 19 Frontend (Vercel)"]
    end

    subgraph BackendCore ["FastAPI Backend (Render)"]
        Router["API Gateway / Routers"]
        Auth["JWT Auth & Permissions"]
        QuotaGuard["SaaS Quota Guard"]
        RuleEngine["Rule-Based Intent Engine (0-Token)"]
        GenerativePipeline["Generative AI Pipeline"]
        CatalogEngine["Universal Catalog Engine"]
        MediaDispatcher["WhatsApp Media Card Dispatcher"]
    end

    subgraph DataLayer ["Data & AI Services"]
        Postgres[(Supabase PostgreSQL)]
        GeminiAI["Google Gemini API (3.7 Flash)"]
        MediaStorage["Supabase Storage / CDN"]
    end

    WA <-->|HTTPS Webhook / Send| MetaAPI
    MetaAPI <--> Router
    WebVisitor <-->|widget.js / Fetch| WidgetAPI
    WidgetAPI <--> Router
    Staff <--> DashboardUI
    DashboardUI <-->|REST API / Bearer Token| Router

    Router --> Auth --> QuotaGuard
    QuotaGuard --> RuleEngine
    RuleEngine -->|Rule Matched (0 Tokens)| MediaDispatcher
    RuleEngine -->|Unmatched / Complex| GenerativePipeline
    GenerativePipeline <--> GeminiAI
    GenerativePipeline <--> Postgres
    GenerativePipeline --> CatalogEngine
    CatalogEngine <--> Postgres
    CatalogEngine --> MediaDispatcher
    MediaDispatcher --> MetaAPI
    MediaDispatcher --> Postgres
    Router <--> MediaStorage
```

---

## 📁 Repository Structure

```
shepherd-ai/
├── Agent File/
│   └── backend/                    # Core FastAPI Backend Server
│       ├── app/
│       │   ├── api/                # API Route Controllers
│       │   │   ├── auth.py         # Registration, JWT login, profile
│       │   │   ├── bookings.py     # Appointment scheduling
│       │   │   ├── catalog.py      # Universal inventory & webhook test
│       │   │   ├── contacts.py     # Lead and contact management
│       │   │   ├── conversations.py# Status triage & human pause controls
│       │   │   ├── groups.py       # WhatsApp group sync & broadcasts
│       │   │   ├── knowledge.py    # RAG knowledge base resources
│       │   │   ├── media_library.py# Document and image storage
│       │   │   ├── messages.py     # Inbound/outbound message history
│       │   │   ├── settings.py     # Organization configurations & AI keys
│       │   │   ├── whatsapp.py     # Meta webhook & message dispatcher
│       │   │   ├── widget.py       # Public website widget API & voice
│       │   │   └── workflows.py    # Custom sequence automation
│       │   ├── models/             # SQLAlchemy ORM Database Schemas
│       │   ├── schemas/            # Pydantic Request/Response Models
│       │   ├── services/           # Business Logic & Integrations
│       │   │   ├── agent_service.py# Orchestrator & WhatsApp card dispatcher
│       │   │   ├── ai_provider_service.py # Multi-LLM provider client
│       │   │   ├── meta_whatsapp_service.py # Meta Graph API v18 client
│       │   │   ├── rag_service.py  # Vector search and embeddings
│       │   │   └── rule_engine.py  # Zero-token intent classification
│       │   ├── config.py           # Environment settings loader
│       │   ├── database.py         # SQLAlchemy engine & session pool
│       │   └── main.py             # FastAPI entrypoint & middleware
│       ├── requirements.txt        # Python backend dependencies
│       └── Dockerfile              # Container deployment spec
├── public/
│   ├── widget.js                   # Universal embeddable website widget script
│   └── ...                         # Static icons & assets
├── src/                            # React 19 Frontend Dashboard
│   ├── components/                 # UI Views (LiveChat, Contacts, Catalog, Settings)
│   ├── services/                   # Frontend API connectors & storage
│   ├── types/                      # TypeScript declarations
│   └── App.tsx                     # Main layout & route router
├── dist/                           # Production built frontend bundle
├── package.json                    # Node dependencies and build scripts
├── vite.config.ts                  # Vite build configuration
└── README.md                       # Platform documentation
```

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
| --- | --- | --- |
| **Frontend** | React 19, TypeScript, Vite 6, Vanilla CSS | Fast, responsive dashboard with zero UI bloat |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 | High-performance asynchronous API framework |
| **Database** | PostgreSQL 15+ via Supabase / SQLAlchemy | Relational storage with JSONB attribute indexing |
| **AI Models** | Google Gemini 3.7 Flash, Groq Whisper | High-speed, multimodal LLM reasoning & transcription |
| **Messaging** | Meta WhatsApp Business Cloud API (v18.0) | Official, scalable messaging delivery |
| **Voice & Media** | Web Speech API, Azure Speech / Edge TTS | Voice transcription and neural audio synthesis |
| **Hosting** | Vercel (Frontend), Render (Backend), Supabase (DB) | Fully managed modern cloud architecture |

---

## 📡 API Reference Overview

### 1. Website Chat Widget API (Public Endpoints)
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/widget/config/{org_id}` | Returns widget brand styling, colors, and welcome greeting |
| `POST` | `/api/widget/message` | Sends customer text inquiry; returns AI reply + interactive product cards |
| `POST` | `/api/widget/voice-message` | Uploads client speech transcript or audio WebM blob for AI processing |
| `GET` | `/api/widget/poll/{org_id}/{visitor_id}` | Polls for outbound responses sent by human agents |

### 2. WhatsApp Meta Cloud API Webhook
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/whatsapp/webhook` | Meta verification challenge handshake (`hub.challenge`) |
| `POST` | `/api/whatsapp/webhook` | Real-time inbound WhatsApp message & media event receiver |
| `POST` | `/api/whatsapp/send` | Dispatches outbound WhatsApp text message via Meta API |
| `POST` | `/api/whatsapp/send-media` | Dispatches image, document, or audio media via Meta API |

### 3. CRM, Catalog & Settings (Authenticated)
| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Authenticates user; returns JWT Bearer Token |
| `GET` | `/api/contacts/` | Lists contacts with search and category filters |
| `GET` | `/api/catalog/` | Lists organization inventory with availability flags |
| `POST` | `/api/catalog/` | Creates new vehicle, product, or property item |
| `POST` | `/api/catalog/test-webhook` | Tests external store/inventory webhook connectivity |
| `GET` | `/api/bookings/` | Retrieves upcoming appointments and consultation requests |
| `PUT` | `/api/bookings/{id}/status` | Updates booking status (`confirmed`, `completed`, `cancelled`) |
| `POST` | `/api/settings/save-all` | Saves AI persona, model selection, and Meta credentials |

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: v3.10 or higher
- **PostgreSQL Database** or Supabase project URL
- **Git**

### 1. Clone Repository
```bash
git clone https://github.com/Teleiosite/shepherd-ai.git
cd shepherd-ai
```

### 2. Frontend Setup
```bash
npm install
npm run dev
# Dashboard launches at http://localhost:3000
```

### 3. Backend Setup
```bash
cd "Agent File/backend"
python -m venv venv

# Windows:
venv\Scripts\activate

# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Backend API launches at http://localhost:8000
```

---

## 🌐 Embedding the Web Chat Widget

To integrate the Shepherd AI conversational assistant into any external website, WordPress store, or web app, embed this script before the closing `</body>` tag:

```html
<script 
  src="https://shepherd-ai.vercel.app/widget.js" 
  data-org-id="YOUR_ORGANIZATION_UUID"
  data-api-url="https://shepherd-ai-backend.onrender.com"
  defer>
</script>
```

Replace `YOUR_ORGANIZATION_UUID` with your organization ID from **Settings → Organization**.

---

## 🔒 Security & Best Practices

- **Zero-Token Guard:** Common customer inquiries are resolved instantly by `rule_engine.py` without consuming LLM API token quotas.
- **Quota Management:** Monthly message limit thresholds protect organizations from automated billing spikes.
- **Human Handover Safety:** When a customer asks for a human or indicates frustration, the AI automatically enters an escalated pause state to ensure respectful communication.
- **Production Audit Guidelines:** Refer to [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for enterprise security hardening, authentication guidelines, and SSRF prevention.

---

## 📄 License

This project is proprietary software developed by Teleiosite. All rights reserved.

---

## 🛠️ Troubleshooting & Support

For issues related to deployment, backend sleeping, or webhook integration (such as configuring the WhatsApp Business Cloud API subscription), please reference:

* **[Troubleshooting & Configuration Log](./TROUBLESHOOTING_LOG.md)**
* **[WhatsApp Business Cloud API Setup](./WHATSAPP_BUSINESS_API_SETUP.md)**

---

<div align="center">

**Built with ❤️ for businesses, organizations, and service providers worldwide**

</div>