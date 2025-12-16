# Shepherd AI Backend

Backend API for Shepherd AI - Church Follow-up System

## Tech Stack

- **Framework:** FastAPI (Python 3.10+)
- **Database:** PostgreSQL with pgvector
- **ORM:** SQLAlchemy
- **Authentication:** JWT (python-jose)
- **AI:** Google Gemini + LangChain
- **Scheduling:** APScheduler
- **Messaging:** WhatsApp Cloud API

## Project Structure

```
shepherd-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings
│   ├── database.py          # DB connection
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── api/                 # API routes
│   ├── services/            # Business logic
│   └── utils/               # Utilities
├── requirements.txt
├── .env.example
└── schema.sql               # Database schema
```

## Setup

### 1. Create Virtual Environment

```bash
cd shepherd-backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret (generate with `openssl rand -hex 32`)
- `GEMINI_API_KEY` - Google Gemini API key

### 4. Set Up Database

#### Option A: Supabase (Recommended)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `schema.sql`
3. Copy connection string to `DATABASE_URL`

#### Option B: Local PostgreSQL

```bash
# Install PostgreSQL and pgvector
# Then create database
createdb shepherd_ai

# Run schema
psql shepherd_ai < schema.sql
```

### 5. Run Development Server

```bash
# From shepherd-backend directory
python -m uvicorn app.main:app --reload --port 8000
```

API will be available at:
- **API:** http://localhost:8000
- **Docs:** http://localhost:8000/api/docs
- **Health:** http://localhost:8000/health

## Development Status

### ✅ Completed (Phase 1)
- [x] Project structure
- [x] Database models (8 tables)
- [x] Pydantic schemas
- [x] Configuration management
- [x] FastAPI app with CORS
- [x] Database schema SQL

### 🚧 In Progress
- [ ] Authentication endpoints
- [ ] CRUD endpoints
- [ ] AI service integration
- [ ] WhatsApp integration

### 📋 Upcoming
- [ ] RAG implementation
- [ ] Workflow automation
- [ ] Scheduling service
- [ ] Testing

## API Endpoints (Planned)

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Contacts
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/{id}` - Get contact
- `PUT /api/contacts/{id}` - Update contact
- `DELETE /api/contacts/{id}` - Delete contact

### Messages
- `GET /api/messages` - List messages
- `POST /api/messages` - Create message
- `POST /api/messages/generate` - Generate AI message
- `POST /api/messages/schedule` - Schedule message

### Knowledge Base
- `GET /api/knowledge` - List resources
- `POST /api/knowledge` - Upload resource
- `POST /api/knowledge/search` - Semantic search

## Database Schema

8 tables with proper relationships:
- `organizations` - Church organizations
- `users` - System users
- `contacts` - Church contacts
- `messages` - Message history
- `knowledge_resources` - Knowledge base
- `knowledge_embeddings` - Vector embeddings
- `categories` - Contact categories
- `workflow_steps` - Workflow definitions

See `schema.sql` for complete schema.

## Contributing

This is a private project for Operation Win Bu ministry.

## License

Proprietary - All rights reserved
