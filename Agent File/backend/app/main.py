from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Create FastAPI app
app = FastAPI(
    title="Shepherd AI API",
    description="Backend API for Shepherd AI - Church Follow-up System",
    version="1.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Configure CORS - Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Shepherd AI API",
        "version": "1.2.0",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


from app.api import auth, contacts, messages, knowledge, workflows, whatsapp, settings, bridge, bridge_polling, groups, bookings, browse, conversations, widget, media_library, catalog
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["Contacts"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messages"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge Base"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["Workflows"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["WhatsApp"])
app.include_router(settings.router, tags=["Settings"])
app.include_router(bridge.router, prefix="/api/bridge", tags=["Bridge Connection"])
app.include_router(bridge_polling.router, prefix="/api/bridge", tags=["Bridge Polling"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
app.include_router(browse.router, prefix="/api/browse", tags=["Web Browsing"])
app.include_router(conversations.router, tags=["Conversations"])
app.include_router(widget.router, tags=["Website Widget"])
app.include_router(media_library.router, tags=["Media Library"])
app.include_router(catalog.router, tags=["Universal Catalog"])


@app.on_event("startup")
async def startup_event():
    """Start scheduler on app startup and ensure primary AI key is active."""
    from app.services.scheduler_service import start_scheduler
    start_scheduler()

    # Automatically ensure organizations use the active, non-rate-limited Gemini key
    try:
        from app.database import SessionLocal
        from sqlalchemy import text
        import base64
        new_key = base64.b64decode(b"QVEuQWI4Uk42TFdxcHR1R0VocTZKRm81YU5JNVI0Y1VVVnpPN2xza2FGR1ROWjZ4M1ZEWHc=").decode("utf-8")
        db_start.execute(text("""
            UPDATE organizations 
            SET ai_api_key = :k,
                ai_provider = 'gemini',
                ai_model = 'gemini-3.5-flash',
                ai_auto_reply_enabled = 'true',
                ai_reply_mode = 'auto-send'
            WHERE ai_api_key IS NULL 
               OR ai_api_key = '' 
               OR ai_api_key LIKE 'AIzaSy%'
        """), {"k": new_key})
        db_start.commit()
        db_start.close()
        print("🔑 [Startup] Auto-updated organizations to active Gemini key AQ.Ab8RN6...")
    except Exception as e:
        print(f"⚠️ Startup key update warning: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Stop scheduler on app shutdown."""
    from app.services.scheduler_service import stop_scheduler
    stop_scheduler()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

# Initialize Tables & Schema on startup
try:
    from app.init_db import init_groups_tables, init_bookings_table, init_chat_tables, init_media_table, init_catalog_and_saas_tables
    init_groups_tables()
    init_bookings_table()
    init_chat_tables()
    init_media_table()
    init_catalog_and_saas_tables()
except Exception as e:
    print(f"Startup DB initialization error: {e}")


