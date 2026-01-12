from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Create FastAPI app
app = FastAPI(
    title="Shepherd AI API",
    description="Backend API for Shepherd AI - Church Follow-up System",
    version="1.1.0",  # Groups feature added
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Configure CORS - Allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local development
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        # Production domains
        "https://shepherd-ai.vercel.app",
        "https://shepherd-ai-git-main-teleiosites-projects.vercel.app",
        # Allow all Vercel preview deployments
        "https://*.vercel.app",
        # Wildcard (fallback)
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Shepherd AI API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


from app.api import auth, contacts, messages, knowledge, workflows, whatsapp, settings, bridge, bridge_polling, groups
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


@app.on_event("startup")
async def startup_event():
    """Start scheduler on app startup."""
    from app.services.scheduler_service import start_scheduler
    start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    """Stop scheduler on app shutdown."""
    from app.services.scheduler_service import stop_scheduler
    stop_scheduler()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
