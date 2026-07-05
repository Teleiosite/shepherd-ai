# 🚀 Shepherd AI — Multi-Industry WhatsApp Engagement & Automation Platform

> **A comprehensive, privacy-first CRM and AI automation platform for any business or organization. Acts as a smart digital assistant — tracking customer journeys, auto-responding in your tone, managing bookings, and automating personalized communication via WhatsApp.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://shepherd-ai.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Online-green?style=for-the-badge)](https://shepherd-ai-backend.onrender.com)
[![Database](https://img.shields.io/badge/Database-Supabase%20%2F%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)

---

## ✨ Feature Overview

### 🤖 AI Agent Auto-Reply System ✨ NEW!
- **Responds in your tone** — The AI learns your communication style and auto-replies to incoming WhatsApp messages on your behalf
- **Smart Intent Detection** — Identifies if a customer wants to book, needs a document, has a question, wants to pay, or needs a human
- **Configurable Reply Mode** — Choose between `Auto-reply`, `Suggestions Only`, or `Manual`
- **Adjustable Delay** — Set a realistic response delay (e.g., 3–30 seconds) so replies feel human
- **Supported AI Actions:**
  - 📅 **Bookings** — AI captures appointment details and creates a booking record automatically
  - 📂 **Send Documents/Images** — Matches and auto-delivers files from your Media Library
  - 🌐 **Web Search** — Searches the internet for real-time answers to customer questions
  - 💳 **Payment Links** — Sends configured Paystack or custom payment links
  - 🙋 **Flag for Human** — Escalates complex queries to you with a notification
  - 💬 **RAG Q&A** — Answers questions using your uploaded Knowledge Base

### 📋 Advanced Contact Management
- Bulk import via Excel (`.xlsx`) or CSV
- Dynamic categorization (Customer, Lead, + Custom categories)
- Instant search and filtering
- Join date tracking for automated workflows
- Full contact history and notes
- Auto-creation from incoming WhatsApp messages
- **Contacts sort to the top** of the list automatically after a message is sent

### 💬 Live WhatsApp Messaging
- ✅ **Send messages** directly to WhatsApp
- ✅ **Receive messages** in real-time
- ✅ **Bi-directional communication** with polling architecture
- Rich media support (images, attachments with captions)
- Message scheduling and queuing
- Chat history tracking
- **Two connection methods:**
  - **WPPConnect Bridge** (Free, desktop-based)
  - **WhatsApp Business Cloud API** (Official, cloud-based, mobile-friendly)

### 📂 Media Library ✨ NEW!
- Upload and manage **documents**, **images**, **PDFs**, and other files
- Assign custom **matching names** and descriptions to each file
- The AI Agent automatically picks the best matching file to send when a customer asks for it
- Files stored securely and synced with the backend

### 📅 Bookings Manager ✨ NEW!
- View and manage all appointments created via the AI Agent or manually
- Actions: **Confirm**, **Complete**, and **Cancel** bookings with one click
- Table view with contact name, phone, purpose, date/time, and status badge
- Syncs with the Supabase/PostgreSQL `bookings` database table

### 👥 WhatsApp Groups Management
- Sync all your WhatsApp groups automatically
- **Auto-welcome** new group members with personalized DMs
- **Auto-add group members** as contacts with configurable categories
- **Broadcast scheduling** — send messages to groups immediately or at a future date/time
- **Queue / Scheduled tab** ✨ NEW! — View, edit, reschedule, or cancel pending broadcast messages before they are sent

### 🧠 Context-Aware AI (RAG)
- Upload product guides, manuals, FAQs, or any reference material
- AI references your specific Knowledge Base in every response
- Understands customer journey stages
- Multi-format support (PDF, DOCX, TXT)

### ⚡ Custom Workflow Automation
- Upload custom workflows via Excel/CSV
- Create unlimited multi-step engagement tracks
- **Multi-industry support:**
  - 🛍️ E-commerce: Order follow-up sequences
  - 🏘️ Real Estate: Lead nurturing campaigns
  - 💪 Fitness: Member onboarding journeys
  - 📚 Education: Student engagement tracks
  - 💼 Consulting: Client onboarding workflows
  - ⛪ Ministry: Discipleship and follow-up tracks
- Assign different workflows to different contact categories
- Day-based automation (Day 0, 1, 3, 7, 14, etc.)
- Bulk message generation and queuing

### 📊 Analytics Dashboard
- Contact distribution charts
- Message activity tracking
- Knowledge base statistics
- Engagement metrics
- Workflow completion rates

---

## 🏗️ System Architecture

```mermaid
graph TD
    User((User))

    subgraph Frontend [Frontend - Vercel]
        UI[React + Vite App]
    end

    subgraph Backend [Backend - Render]
        API[FastAPI Server]
        DB[(Supabase / PostgreSQL)]
    end

    subgraph Bridge [Bridge - User's PC]
        BridgeApp[Electron Bridge App]
        WPP[WPPConnect Client]
    end

    subgraph AI [AI Layer]
        Gemini[Google Gemini]
        Agent[AI Agent Engine]
        RAG[Knowledge Base RAG]
    end

    User -->|Interacts| UI
    UI <-->|REST API| API
    API <-->|Store/Retrieve| DB
    API <-->|AI Generation| Gemini
    API --> Agent
    Agent --> RAG
    Agent -->|Browse Web| Web[Internet]

    BridgeApp -->|Polls for pending| API
    BridgeApp -->|Sends messages via| WPP
    WPP <-->|WhatsApp Web| WA[WhatsApp Servers]
    WPP -->|Incoming messages| BridgeApp
    BridgeApp -->|WebSocket| UI
    UI -->|Triggers Auto-reply| Agent
```

### Component Breakdown

#### 1. **Frontend** (React 19 + Vite) — Deployed on Vercel
- Full CRM user interface
- Live chat with AI Agent suggestions panel
- Bookings, Media Library, Groups, Workflows management
- Settings: AI tone, reply mode, business type, payment links

#### 2. **Backend** (FastAPI + Python) — Deployed on Render
- Central API orchestrator
- AI message generation and agent logic
- Message queuing system
- Contact, booking, and knowledge storage
- Bridge polling endpoints
- Web browsing proxy for real-time answers

#### 3. **Database** (Supabase / PostgreSQL)
- `organizations`, `users`, `contacts`, `messages`
- `knowledge_resources`, `knowledge_embeddings` (vector search)
- `workflow_steps`, `categories`
- `groups`, `group_members`, `group_messages`
- `bookings` ✨ NEW

#### 4. **Bridge App** (Electron + Node.js) — Runs on User's PC
- Local WhatsApp connection via WPPConnect
- Polls backend every 5 seconds for pending messages
- Sends queued messages to WhatsApp
- Forwards incoming messages to frontend in real-time

---

## 🚀 Getting Started

### For End Users

#### 1. **Access the Web App**
Visit: [https://shepherd-ai.vercel.app](https://shepherd-ai.vercel.app)

#### 2. **Create an Account**
- Sign up with email and password
- Set your organization/business name

#### 3. **Configure AI Provider**
- Go to **Settings → AI Provider**
- Enter your API key:
  - Free Gemini key: [Google AI Studio](https://aistudio.google.com/)
  - Or use OpenAI / Groq

#### 4. **Configure the AI Agent** ✨ NEW!
- Go to **Settings → AI Agent Auto-Reply Settings**
- Set your **Business Type** (e.g., "Salon & Spa", "Real Estate Agency", "Logistics")
- Write your **Tone Instructions** (e.g., "friendly, professional, uses first names")
- Set **Reply Mode**: Auto, Suggestions Only, or Off
- Add a **Payment Link** (e.g., Paystack, Flutterwave)

#### 5. **Download Bridge App** (For WhatsApp)
- Go to **Settings → WhatsApp Integration**
- Download the Shepherd AI Bridge (Windows)
- Extract and run `Shepherd AI Bridge.exe`
- Enter your connection code from Settings
- Scan WhatsApp QR code
- Done! Messages now route through your WhatsApp

#### 6. **Upload Media Files** ✨ NEW!
- Go to **Media Library** in the sidebar
- Upload documents, PDFs, or images
- Set a matching name (e.g., "price list", "product catalogue", "brochure")
- The AI will auto-send the right file when customers ask for it

#### 7. **Manage Bookings** ✨ NEW!
- Go to **Bookings** in the sidebar
- View all appointments created by the AI or manually
- Confirm, complete, or cancel bookings with one click

#### 8. **Group Messaging with Scheduling**
- Go to **Groups** and sync your WhatsApp groups
- Send a broadcast message immediately or schedule for later
- Click **Settings → Queue / Scheduled** on any group to **edit** or **cancel** any pending message

#### 9. **Add Contacts & Start Messaging**
- Navigate to **Contacts**
- Bulk import via Excel or add manually
- Use **Live Chats** for 1-on-1 conversations
- Use **Generate & Send** for bulk campaigns

---

## 💻 For Developers

### Tech Stack

**Frontend:**
- React 19 (Hooks, Context API)
- Vite 6 (Build tool)
- Vanilla CSS with design system tokens
- Recharts (Analytics)
- Lucide React (Icons)
- `@google/genai` SDK (AI Agent)

**Backend:**
- FastAPI (Python)
- SQLAlchemy (ORM)
- Supabase / PostgreSQL (Production)
- SQLite (Local dev fallback)
- Google Generative AI SDK
- `httpx` + BeautifulSoup (Web browsing proxy)
- APScheduler (Scheduled tasks)

**Bridge:**
- Electron (Desktop app framework)
- WPPConnect (WhatsApp automation)
- Express (REST API)
- WebSocket (Real-time updates)
- Axios (HTTP client)

### Local Development Setup

#### Prerequisites
- Node.js 18+
- Python 3.9+
- Git

#### 1. Clone Repository
```bash
git clone https://github.com/Teleiosite/shepherd-ai.git
cd shepherd-ai
```

#### 2. Frontend Setup
```bash
npm install
npm run dev
# Runs on http://localhost:3000
```

#### 3. Backend Setup
```bash
cd "Agent File/backend"
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Runs on http://localhost:8000
```

#### 4. Bridge App Setup (Optional for local testing)
```bash
cd shepherd-bridge-app
npm install
npm start
# Electron app opens
```

### Environment Variables

**Frontend** (`.env`):
```env
VITE_BACKEND_URL=http://localhost:8000
```

**Backend** (`.env`):
```env
# Production (Supabase)
DATABASE_URL=postgresql://user:password@host/dbname

# Local dev fallback
# DATABASE_URL=sqlite:///./shepherd.db

SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,https://shepherd-ai.vercel.app
```

### Database Setup (Supabase)

Run the complete schema in your Supabase SQL Editor:

```
Agent File/backend/schema.sql
```

This creates all required tables:
- `organizations`, `users`, `contacts`, `messages`
- `knowledge_resources`, `knowledge_embeddings` (pgvector)
- `workflow_steps`, `categories`
- `groups`, `group_members`, `group_messages`
- `bookings`

> The backend also auto-creates all tables on startup via `init_db.py`.

---

## 📖 Usage Guide

### Live Chat with AI Agent
1. Go to **Live Chats**
2. Select a contact
3. Incoming messages trigger the AI Agent automatically (if Auto mode is enabled)
4. Review AI suggestions in the panel above the text input, or let them send automatically
5. The contacted person moves to the **top of the chat list** instantly

### Managing Bookings
1. Go to **Bookings**
2. When a customer says "I'd like to book an appointment", the AI Agent creates a pending booking
3. Confirm, complete, or cancel each booking from the table view

### Editing a Scheduled Group Message ✨ NEW!
1. Go to **Groups**
2. Click **Settings** on any group
3. Click the **Queue / Scheduled** tab
4. See all pending broadcast messages for that group
5. Click the ✏️ icon to **edit** the message text or **reschedule** the date/time
6. Click the ✕ icon to **cancel** the message before it is sent

### Managing Knowledge Base
1. Go to **Knowledge Base**
2. Click **"Add Resource"**
3. Upload PDF, DOCX, or paste text content
4. AI will reference this when generating messages or answering questions

### Scheduling System
- **Individual**: In Live Chat, choose "Schedule for Later" before sending
- **Bulk/Groups**: In Groups, compose a broadcast and set a future date/time
- **Manage**: Edit or cancel any scheduled messages from the Queue tab

---

## 🔐 Privacy & Security

- **No Third-Party Data Collection**: All user data is stored in your own Supabase/PostgreSQL instance
- **API Keys**: Never stored on servers, only in browser `localStorage`
- **WhatsApp**: Bridge runs locally on your PC — the backend never sees your WhatsApp credentials
- **Messages**: Encrypted in transit via HTTPS/WSS

---

## 📦 Deployment

### Frontend (Vercel)
```bash
vercel

# Set environment variables in Vercel Dashboard:
VITE_BACKEND_URL=https://your-backend.onrender.com
```

### Backend (Render)
1. Connect GitHub repository
2. Set root directory: `Agent File/backend`
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `DATABASE_URL` (Supabase connection string)
   - `SECRET_KEY`
   - `CORS_ORIGINS`

### Bridge Distribution
```bash
cd shepherd-bridge-app
npm run build:win   # Windows
npm run build:mac   # macOS

# Upload dist/*.zip to GitHub Releases
```

---

## 🎯 Roadmap

- [x] Multi-provider AI integration (Gemini, OpenAI, Groq, DeepSeek)
- [x] Contact management with bulk import
- [x] Knowledge base (RAG)
- [x] Message scheduling and queuing
- [x] WhatsApp sending (polling architecture)
- [x] WhatsApp receiving (real-time)
- [x] Custom workflow automation (multi-industry)
- [x] WhatsApp Groups management and broadcasting
- [x] **AI Agent auto-reply in your tone** ✨
- [x] **Booking management system** ✨
- [x] **Media Library with AI file matching** ✨
- [x] **Group message queue editing & rescheduling** ✨
- [x] **Supabase/PostgreSQL database integration** ✨
- [ ] SMS integration (Twilio)
- [ ] Email campaigns
- [ ] Mobile app (React Native)
- [ ] Multi-language AI responses
- [ ] Advanced analytics and reporting
- [ ] Team collaboration and role-based access control

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 👨‍💻 Author

**Shepherd AI Team**
- GitHub: [@Teleiosite](https://github.com/Teleiosite)
- Email: support@shepherdai.com

---

## 🙏 Acknowledgments

- **WPPConnect Team** — WhatsApp automation library
- **Google** — Gemini AI API
- **Supabase** — Open source Firebase alternative (PostgreSQL)
- **FastAPI** — Lightning-fast Python framework
- **React Team** — Amazing UI library
- **Vercel** — Seamless frontend deployment
- **Render** — Backend hosting

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Teleiosite/shepherd-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Teleiosite/shepherd-ai/discussions)
- **Documentation**: [Wiki](https://github.com/Teleiosite/shepherd-ai/wiki)

### 📚 Additional Guides

- **[WhatsApp Business Cloud API Setup](./WHATSAPP_BUSINESS_API_SETUP.md)** — Mobile-friendly WhatsApp integration
- **[Custom Workflows Implementation](./CUSTOM_WORKFLOWS_IMPLEMENTATION.md)** — Technical implementation details

---

<div align="center">

**Built with ❤️ for businesses, organizations, and communities worldwide**

⭐ Star this repo if it's helping your business grow!

</div>

---

## ✨ Features

### 🤖 Multi-Provider AI Engine
- **Google Gemini** (Free Tier) - Default
- **OpenAI** GPT-4 Integration
- **DeepSeek** Support
- **Groq** (Llama 3) Fast Inference
- Custom OpenAI-compatible endpoints
- Instant provider switching in Settings

### 📋 Advanced Contact Management
- Bulk import via Excel (`.xlsx`) or CSV
- Dynamic categorization (New Convert, Customer, Lead, + Custom)
- Instant search and filtering
- Join date tracking for automated workflows
- Full contact history and notes
- Auto-creation from incoming WhatsApp messages

### 💬 Live WhatsApp Messaging
- ✅ **Send messages** directly to WhatsApp
- ✅ **Receive messages** in real-time
- ✅ **Bi-directional communication** with polling architecture
- Rich media support (images, attachments with captions)
- Message scheduling and queuing
- Chat history tracking
- **Two connection methods:**
  - **WPPConnect Bridge** (Free, desktop-based)
  - **WhatsApp Business Cloud API** (Official, cloud-based, mobile-friendly)

### 🧠 Context-Aware AI (RAG)
- Upload sermon notes, books, manuals, product guides
- AI references your specific Knowledge Base
- Understands customer journey stages
- Contextual, personalized responses
- Multi-format support (PDF, DOCX, TXT)

### ⚡ **Custom Workflow Automation** ✨ NEW!
- **Upload custom workflows** via Excel/CSV
- Create unlimited engagement tracks
- **Multi-industry support:**
  - ⛪ Church: 30-Day Discipleship Track
  - 🛍️ E-commerce: Order follow-up sequences
  - 🏘️ Real Estate: Lead nurturing campaigns
  - 💪 Fitness: Member onboarding journeys
  - 📚 Education: Student engagement tracks
  - 💼 Consulting: Client onboarding workflows
- Assign different workflows to different categories
- Day-based automation (Day 0, 1, 3, 7, etc.)
- Bulk message generation and queuing

### 📊 Analytics Dashboard
- Contact distribution charts
- Message activity tracking
- Knowledge base statistics
- Engagement metrics
- Workflow completion rates

---

## 🏗️ System Architecture

```mermaid
graph TD
    User((User))
    
    subgraph Frontend [Frontend - Vercel]
        UI[React + Vite App]
    end
    
    subgraph Backend [Backend - Render]
        API[FastAPI Server]
        DB[(SQLite Database)]
    end
    
    subgraph Bridge [Bridge - User's PC]
        BridgeApp[Electron Bridge App]
        WPP[WPPConnect Client]
    end
    
    User -->|Interacts| UI
    UI <-->|REST API| API
    API <-->|Store/Retrieve| DB
    API -->|Queue Messages| DB
    API <-->|Google Gemini| AI[Google AI API]
    
    BridgeApp -->|Polls for pending| API
    BridgeApp -->|Sends messages via| WPP
    WPP <-->|WhatsApp Web| WA[WhatsApp Servers]
    WPP -->|Incoming messages| BridgeApp
    BridgeApp -->|WebSocket| UI
```

### Component Breakdown

#### 1. **Frontend** (React + Vite) - Deployed on Vercel
- User interface for all interactions
- Contact management
- Live chat interface
- Dashboard and analytics
- Settings configuration

#### 2. **Backend** (FastAPI + Python) - Deployed on Render
- Central orchestrator
- AI message generation
- Message queuing system
- Contact and knowledge storage
- Bridge polling endpoints

#### 3. **Bridge App** (Electron + Node.js) - Runs on User's PC
- Local WhatsApp connection via WPPConnect
- Polls backend every 5 seconds for pending messages
- Sends queued messages to WhatsApp
- Forwards incoming messages to frontend
- Maintains persistent WhatsApp session

---

## 🚀 Getting Started

### For End Users

#### 1. **Access the Web App**
Visit: [https://shepherd-ai.vercel.app](https://shepherd-ai.vercel.app)

#### 2. **Create an Account**
- Sign up with email and password
- Set your church name and pastoral identity

#### 3. **Configure AI Provider**
- Go to Settings → AI Provider
- Enter your API key:
  - Get free Gemini key: [Google AI Studio](https://aistudio.google.com/)
  - Or use OpenAI/Groq

#### 4. **Download Bridge App** (For WhatsApp)
- Go to Settings → WhatsApp Integration
- Download the Shepherd AI Bridge (Windows)
- Extract the zip and run `Shepherd AI Bridge.exe`
- Enter your connection code from Settings
- Scan WhatsApp QR code
- Done! Messages now send via your WhatsApp

#### 5. **Create Custom Workflows** ⚡ NEW!
- Navigate to **Workflows** in the sidebar
- Download the template or create your own Excel file with columns: `Day`, `Title`, `Goal`
- Enter a category name (e.g., "Customer Journey", "New Member Track")
- Upload your Excel file
- Assign contacts to that category - they'll automatically follow your custom workflow!

**Example workflow:**
```
Day | Title                 | Goal
0   | Welcome Message       | Send warm welcome
1   | First Check-in        | Ask how they're doing
3   | Share Resource        | Send helpful link
7   | Weekly Update         | Share what's happening
14  | Two-Week Milestone    | Celebrate progress
```

#### 6. **Add Contacts**
- Navigate to Contacts
- Bulk import via Excel or add manually
- Set categories and join dates

#### 7. **Start Messaging!**
- Use Live Chats for 1-on-1 conversations
- Use Generate & Send for bulk messaging
- Schedule messages for future delivery

---

## 💻 For Developers

### Tech Stack

**Frontend:**
- React 19 (Hooks, Context API)
- Vite (Fast build tool)
- Tailwind CSS (Styling)
- Recharts (Analytics)
- Lucide React (Icons)

**Backend:**
- FastAPI (Python)
- SQLAlchemy (ORM)
- SQLite (Database)
- Google Generative AI SDK
- APScheduler (Scheduled tasks)

**Bridge:**
- Electron (Desktop app framework)
- WPPConnect (WhatsApp automation)
- Express (REST API)
- WebSocket (Real-time updates)
- Axios (HTTP client)

### Local Development Setup

#### Prerequisites
- Node.js 18+
- Python 3.9+
- Git

#### 1. Clone Repository
```bash
git clone https://github.com/Teleiosite/shepherd-ai.git
cd shepherd-ai
```

#### 2. Frontend Setup
```bash
npm install
npm run dev
# Runs on http://localhost:5173
```

#### 3. Backend Setup
```bash
cd "Agent File/backend"
python -m venv venv

# Windows
venv\\Scripts\\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Runs on http://localhost:8000
```

#### 4. Bridge App Setup (Optional for local testing)
```bash
cd shepherd-bridge-app
npm install
npm start
# Electron app opens
```

### Environment Variables

**Frontend** (`.env`):
```env
VITE_BACKEND_URL=http://localhost:8000  # or production URL
```

**Backend** (`.env`):
```env
DATABASE_URL=sqlite:///./shepherd.db
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:5173,https://shepherd-ai.vercel.app
```

---

## 📖 Usage Guide

### Adding Contacts
1. Go to **Contacts** page
2. Click **"Add Contact"** or **"Import Excel"**
3. Fill in details: Name, Phone, Category, Join Date
4. Save

### Sending Messages

**Live Chat (1-on-1):**
1. Go to **Live Chats**
2. Select a contact
3. Type your message (or let AI generate one)
4. Click Send or Schedule for later

**Bulk Messaging (Campaigns):**
1. Go to **Generate & Send**
2. Select **Smart Workflows** or **Manual Draft**
3. Choose contacts and message goal
4. Review AI-generated messages
5. Send immediately or schedule

### Managing Knowledge Base
1. Go to **Knowledge Base**
2. Click **"Add Resource"**
3. Upload PDF or paste text content
4. AI will reference this when generating messages

### Scheduling System
- **Individual**: In Live Chat, click calendar icon before sending
- **Bulk**: In Campaigns, messages queue automatically
- **Manage**: View and edit all scheduled messages in Queue tab

---

## 🔐 Privacy & Security

- **No Data Collection**: All user data stored in backend database under your control
- **API Keys**: Never stored on servers, only in browser localStorage
- **WhatsApp**: Bridge runs locally on your PC, backend never sees WhatsApp credentials
- **Messages**: Encrypted in transit via HTTPS/WSS

---

## 📦 Deployment

### Frontend (Vercel)
```bash
# Connect to Vercel
vercel

# Set environment variables in Vercel Dashboard:
VITE_BACKEND_URL=https://your-backend.onrender.com
```

### Backend (Render)
1. Connect GitHub repository
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Environment variables:
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `CORS_ORIGINS`

### Bridge Distribution
```bash
cd shepherd-bridge-app
npm run build:win  # Windows
npm run build:mac  # macOS

# Upload dist/*.zip to GitHub Releases
```

---

## 🎯 Roadmap

- [x] Multi-provider AI integration
- [x] Contact management with bulk import
- [x] Knowledge base (RAG)
- [x] Message scheduling
- [x] WhatsApp sending (polling architecture)
- [x] WhatsApp receiving (real-time)
- [ ] SMS integration (Twilio)
- [ ] Email campaigns
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced analytics and reporting
- [ ] Team collaboration features

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 👨‍💻 Author

**Shepherd AI Team**
- GitHub: [@Teleiosite](https://github.com/Teleiosite)
- Email: support@shepherdai.com

---

## 🙏 Acknowledgments

- **WPPConnect Team** - WhatsApp automation library
- **Google** - Gemini AI API
- **FastAPI** - Lightning-fast Python framework
- **React Team** - Amazing UI library
- **Vercel** - Seamless deployment
- **Render** - Backend hosting

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Teleiosite/shepherd-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Teleiosite/shepherd-ai/discussions)
- **Documentation**: [Wiki](https://github.com/Teleiosite/shepherd-ai/wiki)

### 📚 Additional Guides

- **[WhatsApp Business Cloud API Setup](./WHATSAPP_BUSINESS_API_SETUP.md)** - Mobile-friendly WhatsApp integration
- **[Custom Workflows Implementation](./CUSTOM_WORKFLOWS_IMPLEMENTATION.md)** - Technical implementation details

---

<div align="center">

**Built with ❤️ for churches, businesses, and organizations worldwide**

⭐ Star this repo if it blessed your ministry!

</div>