"""
FastAPI Main Application (Production-Ready with Auth, CORS, and Rate Limiting)
"""
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.models.database import MongoDBManager
from backend.api.chat import router as chat_router
from backend.api.roadmap import router as roadmap_router
from backend.api.auth import router as auth_router
from backend.api.streaming import router as streaming_router
from backend.api.admin import router as admin_router
from backend.api.lab import router as lab_router
from backend.services.gamification_service import GamificationService

load_dotenv()

# Rate Limiter setup
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await MongoDBManager.connect_to_mongo()
    print("[Server] FastAPI Server Started")
    yield
    # Shutdown
    await MongoDBManager.close_mongo_connection()
    print("[Server] FastAPI Server Stopped")


# Initialize FastAPI
app = FastAPI(
    title="Blockchain Learning Platform - AI Tutor & Roadmap API",
    description="Production-ready interactive blockchain learning platform with Agentic RAG AI Tutor",
    version="2.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware setup
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(streaming_router)
app.include_router(roadmap_router)
app.include_router(admin_router)
app.include_router(lab_router)


@app.get("/")
@limiter.limit("30/minute")
async def root(request: Request):
    """Root endpoint"""
    return {
        "message": "GenAI Blockchain Security Chatbot & Audit API",
        "status": "running",
        "version": "2.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "chat": "/api/chat",
            "roadmap": "/api/roadmap",
            "docs": "/docs"
        }
    }


@app.get("/health")
@app.get("/api/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    """Health check endpoint checking MongoDB connectivity"""
    mongo_status = "connected"
    try:
        db = MongoDBManager.get_db()
        await db.command("ping")
    except Exception as e:
        mongo_status = f"error: {str(e)}"
        
    return {
        "status": "healthy" if "error" not in mongo_status else "unhealthy",
        "version": "2.0.0",
        "mongodb": mongo_status
    }


@app.get("/api/leaderboard")
@limiter.limit("60/minute")
async def get_top_leaderboard(request: Request, limit: int = 50):
    """Top-level endpoint to get student leaderboard ranked by XP and achievements"""
    db = MongoDBManager.get_db()
    return await GamificationService.get_leaderboard(db, limit=limit)


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SERVER_PORT", 8000))
    
    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=os.getenv("ENV", "development") == "development"
    )
