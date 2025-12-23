# 🐑 Shepherd AI

> **AI-Powered Church Discipleship & Follow-up Platform**  
> Automate pastoral care with intelligent WhatsApp messaging and 30-day discipleship tracking

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Live Demo](https://img.shields.io/badge/Demo-Live-success?logo=vercel)](https://shepherd-ai.vercel.app)

---

## 🌐 Live Demo

**Try it now:** [shepherd-ai.vercel.app](https://shepherd-ai.vercel.app)

| Component | Platform | URL | Status |
|-----------|----------|-----|--------|
| **Frontend** | Vercel | [shepherd-ai.vercel.app](https://shepherd-ai.vercel.app) | 🟢 Live |
| **Backend API** | Render | [shepherd-ai-backend.onrender.com](https://shepherd-ai-backend.onrender.com) | 🟢 Live |
| **Database** | Supabase | PostgreSQL with pgvector | 🟢 Connected |
| **Cost** | - | - | **$0/month** |

**Note:** Backend uses free tier - first request may take 30-60 seconds (cold start).

---

## 📖 Overview

Shepherd AI is a **multi-tenant SaaS platform** that helps churches nurture new converts and members through **AI-generated, personalized WhatsApp messages**. It combines CRM capabilities, workflow automation, and context-aware AI to streamline pastoral follow-up at scale.

### **✨ Key Features**

- 🤖 **Multi-Provider AI** - Support for Google Gemini, OpenAI, DeepSeek, Groq, and custom endpoints
- 📱 **Dual WhatsApp Delivery** - Free option (WPPConnect) or official Meta Cloud API
- 📚 **Knowledge Base RAG** - AI reads your church's sermons/books for context-aware responses
- 📅 **30-Day Workflows** - Automated spiritual journey tracking with timely messages
- 👥 **Multi-Tenant Architecture** - Isolated data per organization
- 💬 **Live Chat Interface** - 1-on-1 messaging with media support
- 📊 **Campaign Scheduler** - Bulk message automation with smart workflows
- 🖥️ **Desktop Bridge App** - Standalone Electron app for non-technical users

### **🎨 Recent UI Updates (December 2023)**

- ✨ **Redesigned Login Page**
  - Minimalist design with centered, extra-large logo (384px × 384px)
  - Smooth float animation for welcoming first impression
  - New teal neural-network sheep logo matching design system
  
- 📱 **Mobile-First Responsiveness**
  - Vertical stacking on mobile devices
  - Adaptive logo sizing (128px mobile → 384px desktop)
  - Optimized padding and spacing for all screen sizes
  
- 🎯 **Enhanced Branding**
  - Updated favicon with new logo
  - Consistent teal/forest green color scheme
  - Custom CSS animations (float effect)
  - Professional, modern aesthetic

---

## 🏗️ Architecture

### **Production Stack:**

```
┌──────────────────────────────┐
│  React Frontend (Vercel)     │  https://shepherd-ai.vercel.app
│  TypeScript + Vite           │  
└──────────────┬───────────────┘
               │ REST API + JWT
               ▼
┌──────────────────────────────┐
│  FastAPI Backend (Render)    │  https://shepherd-ai-backend.onrender.com
│  Python 3.11 + PostgreSQL    │  Multi-tenant + RAG
└──────────────┬───────────────┘
               │
          ┌────┴────┐
          ▼         ▼
┌──────────────┐  ┌─────────────────┐
│ Supabase     │  │ WPPConnect      │
│ PostgreSQL   │  │ Bridge (Local)  │
│ + pgvector   │  │ (Port 3001)     │
└──────────────┘  └─────┬───────────┘
                        ▼
                  📱 WhatsApp
```

**Deployment:** 100% free tier (Vercel + Render + Supabase)

---

## 🚀 Complete Setup Guide

> **⚡ New to this?** Follow our [15-Minute Quick Start Guide](QUICKSTART.md) for step-by-step instructions with screenshots!

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Python 3.11+** - [Download here](https://www.python.org/)
- **Supabase Account** - [Sign up free](https://supabase.com/)
- **WhatsApp Number** - For WPPConnect bridge
- **Google Gemini API Key** - [Get free key](https://aistudio.google.com/)

---

### Step 1: Database Setup (Supabase)

#### **1.1 Create Supabase Project**

1. Go to [supabase.com](https://supabase.com/) and sign in
2. Click "New Project"
3. Choose organization, project name, database password
4. Select region closest to you
5. Click "Create new project" (takes ~2 minutes)

#### **1.2 Run Database Migration**

1. Once project is ready, go to **SQL Editor** in left sidebar
2. Click **New Query**
3. Copy the entire contents of `Agent File/backend/schema.sql`
4. Paste into the editor
5. Click **Run** or press `Ctrl+Enter`
6. ✅ You should see success messages for all tables

#### **1.3 Get Connection Details**

1. Go to **Project Settings** → **Database**
2. Copy these values (you'll need them next):
   - **Connection String** (URI mode)
   - Project URL
   - Anon/Public key

---

### Step 2: Backend Setup (FastAPI)

#### **2.1 Install Python Dependencies**

```bash
cd "Agent File/backend"

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### **2.2 Configure Environment Variables**

Create `.env` file in `Agent File/backend/`:

```bash
# Copy the example file
copy .env.example .env   # Windows
cp .env.example .env     # Mac/Linux
```

Edit `.env` and fill in your values:

```env
# Database (from Supabase Step 1.3)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-ID].supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# Authentication (generate a random secret)
SECRET_KEY=your-random-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI (get free key from https://aistudio.google.com/)
GEMINI_API_KEY=AIzaSy...your_gemini_key_here

# App
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
```

**Generate a secure SECRET_KEY:**
```bash
# Windows PowerShell:
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Mac/Linux:
openssl rand -hex 32
```

#### **2.3 Start Backend Server**

```bash
# Make sure you're in Agent File/backend with venv activated
uvicorn app.main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Test it:**
- Open http://localhost:8000/health (should return `{"status":"healthy"}`)
- Open http://localhost:8000/api/docs (interactive API documentation)

---

### Step 3: WhatsApp Bridge Setup (WPPConnect)

```bash
cd wppconnect-bridge
npm install
node bridge.js
```

**What happens:**
1. Chrome browser window opens automatically
2. WhatsApp Web loads
3. QR code appears in terminal AND browser
4. Scan QR code with your phone:
   - Open WhatsApp on phone
   - Tap Menu (⋮) → **Linked Devices**
   - Tap **Link a Device**
   - Scan the QR code

**Expected output:**
```
✅ WPPConnect Bot connected!
🔓 Bridge Status: CONNECTED
📡 REST: http://localhost:3001
🔌 WebSocket: ws://localhost:3002
```

**Test it:**
```bash
curl http://localhost:3001/api/status
# Should return: {"status":"connected","wsPort":3002}
```

---

### Step 4: Frontend Setup (React)

```bash
cd "Agent File"
npm install
npm run dev
```

**Expected output:**
```
VITE ready in 500 ms
➜  Local:   http://localhost:5173/
```

**Open http://localhost:5173**

---

### Step 5: First Login

1. **Open http://localhost:5173**
2. Click **"Create Account"**
3. Fill in:
   - **Name:** Your name
   - **Email:** your.email@example.com
   - **Password:** Choose a password
   - **Church Name:** Your organization
4. Click **Register**
5. ✅ You're now logged in!

---

### Final Checklist

Verify all services are running:

```
✅ Frontend:  http://localhost:5173
✅ Backend:   http://localhost:8000
✅ Bridge:    http://localhost:3001
✅ Supabase:  Database connected
```

**Test the integration:**
1. Add a contact in the app
2. Go to Live Chats
3. Send a test WhatsApp message
4. Check Supabase → Messages table → Should see the logged message ✅

---

### Troubleshooting

**Backend won't start:**
- Check `.env` file exists and has DATABASE_URL
- Verify Supabase database is running
- Check if port 8000 is free: `netstat -ano | findstr :8000`

**Bridge won't connect:**
- Make sure WhatsApp Web works in your browser first
- Check if port 3001 is free
- Try deleting `tokens/` folder and re-scan QR

**Frontend can't connect:**
- Verify backend is running on port 8000
- Check browser console for errors
- Clear browser cache

---

## 🌐 Production Deployment

### **Current Deployment Status:**

✅ **Frontend:** Deployed on Vercel  
✅ **Backend:** Deployed on Render  
✅ **Database:** Supabase PostgreSQL  
✅ **Cost:** $0/month (100% free tier)

### **Deployment Resources:**

- 📖 [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Production deployment walkthrough
- 🛠️ [Render Troubleshooting Guide](RENDER_TROUBLESHOOTING_GUIDE.md) - Complete issue resolution documentation
- 🗺️ [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md) - Features and development phases
- 📊 [Codebase Analysis](docs/CODEBASE_ANALYSIS.md) - Technical architecture deep-dive

### **Live URLs:**

- 🌐 **Frontend:** https://shepherd-ai.vercel.app
- 🔗 **Backend API:** https://shepherd-ai-backend.onrender.com
- 📖 **API Docs:** https://shepherd-ai-backend.onrender.com/api/docs

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [📊 Codebase Analysis](docs/CODEBASE_ANALYSIS.md) | Complete technical deep-dive (600+ lines) |
| [🚀 Deployment Guide](docs/DEPLOYMENT_GUIDE.md) | Production deployment walkthrough |
| [🛠️ Render Troubleshooting](RENDER_TROUBLESHOOTING_GUIDE.md) | **NEW:** Complete deployment debugging guide |
| [🗺️ Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md) | Development phases and priorities |
| [🗄️ Supabase Setup](docs/SUPABASE_CONNECTION_GUIDE.md) | Database configuration |
| [🖥️ Desktop App](shepherd-bridge-app/README.md) | Electron bridge app guide |

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v7
- **UI:** Tailwind CSS + Lucide Icons
- **Charts:** Recharts
- **State:** React Context + Hooks

### **Backend**
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL + pgvector
- **ORM:** SQLAlchemy
- **Auth:** JWT (python-jose)
- **AI:** Google Gemini SDK
- **Scheduler:** APScheduler

### **WhatsApp**
- **WPPConnect:** Puppeteer-based automation (free)
- **Meta Cloud API:** Official WhatsApp Business API

### **Desktop App**
- **Framework:** Electron 27
- **Packaging:** electron-builder

---

## 🗄️ Database Schema

**Core Tables:**
- `organizations` - Multi-tenant isolation
- `users` - Authentication & roles
- `contacts` - CRM (with `whatsapp_id` for @lid support)
- `messages` - Message logs + scheduling
- `knowledge_resources` - Books, sermons, manuals
- `knowledge_embeddings` - Vector embeddings for RAG (pgvector)
- `workflow_steps` - 30-day discipleship plans
- `ai_configs` - Per-org AI provider settings

---

## 🤖 AI Integration

### **Multi-Provider Support**

Switch between AI providers per organization:

```typescript
// Frontend: services/geminiService.ts
const providers = {
  gemini: 'Google Gemini (Free tier)',
  openai: 'OpenAI GPT-4',
  deepseek: 'DeepSeek (Low cost)',
  groq: 'Groq (Fast inference)',
  custom: 'OpenAI-compatible endpoint'
}
```

### **RAG (Retrieval Augmented Generation)**

Upload church-specific content → AI generates contextually relevant messages:

```python
# Backend: services/rag_service.py
# 1. Chunk documents
# 2. Generate embeddings (Google embedding-001)
# 3. Store in pgvector
# 4. Similarity search on message generation
```

---

## 📅 Workflow Automation

**Example: 30-Day New Convert Journey**

| Day | Action | Method |
|-----|--------|--------|
| 1 | Welcome + Assurance | Personal voice note |
| 3 | Prayer check-in | Text message |
| 7 | Sunday service invite | WhatsApp |
| 10 | Evangelism observation | Group invite |
| 14 | First discipleship class | Calendar event |
| 20 | Baptism preparation | Phone call |
| 24 | House fellowship join | Introduction |
| 30 | Ministry involvement | Assessment |

**Auto-Scheduler** runs every 5 minutes, checks contacts' join dates, and generates appropriate messages.

---

## 📱 WhatsApp Integration

### **Dual Delivery Methods**

#### **Option 1: WPPConnect (Free)**
- Uses Puppeteer + WhatsApp Web
- No API costs
- Supports `@lid` privacy-first contacts
- Risk: Unofficial (potential ban)

#### **Option 2: Meta Cloud API (Official)**
- Official WhatsApp Business API
- Pay-per-conversation
- Enterprise features (templates, buttons)
- No ban risk

**Switch per organization** via Settings → WhatsApp Config

---

## 🔐 Security

- ✅ **JWT Authentication** - 30-minute token expiry
- ✅ **Organization Isolation** - Multi-tenant data separation
- ✅ **Password Hashing** - bcrypt
- ✅ **SQL Injection Prevention** - SQLAlchemy ORM
- ✅ **CORS Protection** - Configured per environment

---

## 🎯 Use Cases

### **For Churches**
- Automate new convert follow-up
- Track first-timers' spiritual journey
- Send personalized encouragement
- Bulk messaging for events
- Knowledge base for workers

### **For Ministries**
- Discipleship programs
- Bible study groups
- Prayer request tracking
- Volunteer coordination

---

## 📈 Roadmap

### **Phase 1: Core Platform** ✅
- [x] Multi-user authentication
- [x] Contact management
- [x] WhatsApp messaging
- [x] AI generation
- [x] Knowledge base RAG
- [x] 30-day workflows

### **Phase 2: Enhancements** 🚧
- [ ] Message templates library
- [ ] Advanced analytics
- [ ] SMS delivery (Twilio)
- [ ] Mobile app (React Native)
- [ ] Email follow-up

### **Phase 3: Enterprise** 🔮
- [ ] Voice note generation
- [ ] WhatsApp chatbot
- [ ] Calendar integration
- [ ] Donation tracking
- [ ] White-label option

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author
Abomide Oluwaseye
Frontend Engineer | Product Architect| AI Agents & Automation
AWS Certified Cloud Practitioner | AI-Accelerated Development
Email: abosey23@gmail.com
LinkedIn: www.linkedin.com/in/abomide-oluwaseye
Portfolio/GitHub: https://github.com/Teleiosite?tab=repositories


**Built with AI pair programming** 🤖  
*Proving what's possible when human creativity meets AI assistance*

---

## 🙏 Acknowledgments

- [WPPConnect Team](https://github.com/wppconnect-team/wppconnect) - WhatsApp automation
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [Supabase](https://supabase.com/) - Database infrastructure
- [Google Gemini](https://ai.google.dev/) - AI generation
- All churches testing this platform

---

## 📞 Support

- 📖 [Documentation](docs/CODEBASE_ANALYSIS.md)
- 🐛 [Report Bug](https://github.com/yourusername/shepherd-ai/issues)
- 💡 [Request Feature](https://github.com/yourusername/shepherd-ai/issues)

---

**⭐ If this project helps your church, please star it on GitHub!**

Made with ❤️ for the Kingdom
