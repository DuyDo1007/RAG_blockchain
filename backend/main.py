"""
FastAPI Main Application
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from backend.models.database import MongoDBManager
from backend.api.chat import router as chat_router
from backend.api.roadmap import router as roadmap_router

load_dotenv()

# Lifespan context manager for startup/shutdown
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
    title="GenAI Blockchain Security - Chatbot API",
    description="RAG-based chatbot with learning roadmap",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_router)
app.include_router(roadmap_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "GenAI Blockchain Security Chatbot API",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "roadmap": "/api/roadmap",
            "docs": "/docs"
        }
    }


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint checking MongoDB connectivity"""
    mongo_status = "connected"
    try:
        db = MongoDBManager.get_db()
        await db.command("ping")
    except Exception as e:
        mongo_status = f"error: {str(e)}"
        
    return {
        "status": "healthy" if "error" not in mongo_status else "unhealthy",
        "version": "1.0.0",
        "mongodb": mongo_status
    }


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
