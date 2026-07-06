"""
Learning Roadmap API Endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

from backend.models.schemas import (
    LearningRoadmap, RoadmapLesson, UserProgress, PyObjectId
)
from backend.models.database import get_database

router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])

def format_datetime(val):
    if not val:
        return ""
    if isinstance(val, str):
        return val
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)

# Sample beginner roadmap data
BEGINNER_ROADMAP = {
    "title": "Blockchain Security Fundamentals",
    "description": "Comprehensive guide to blockchain security for beginners",
    "target_audience": "beginner",
    "estimated_duration_hours": 40,
    "prerequisites": [],
    "lessons": [
        {
            "id": "lesson_01",
            "title": "Blockchain Basics",
            "description": "Understand how blockchain technology works",
            "duration_minutes": 60,
            "difficulty": "beginner",
            "content_url": "/content/blockchain-basics",
            "resources": ["https://blockchain.com/learning", "Bitcoin whitepaper"],
            "quiz_questions": [
                {
                    "question": "What is blockchain?",
                    "options": ["A database", "A distributed ledger", "A cryptocurrency"],
                    "correct_answer": 1
                }
            ]
        },
        {
            "id": "lesson_02",
            "title": "Smart Contracts 101",
            "description": "Introduction to smart contracts on Ethereum",
            "duration_minutes": 75,
            "difficulty": "beginner",
            "content_url": "/content/smart-contracts",
            "resources": ["Solidity docs", "Ethereum.org"],
            "quiz_questions": []
        },
        {
            "id": "lesson_03",
            "title": "Common Vulnerabilities",
            "description": "Learn about common security vulnerabilities in smart contracts",
            "duration_minutes": 90,
            "difficulty": "beginner",
            "content_url": "/content/vulnerabilities",
            "resources": ["OWASP Smart Contract Top 10"],
            "quiz_questions": []
        },
        {
            "id": "lesson_04",
            "title": "Security Best Practices",
            "description": "Best practices for securing blockchain applications",
            "duration_minutes": 120,
            "difficulty": "intermediate",
            "content_url": "/content/best-practices",
            "resources": ["Security audit guidelines", "Industry standards"],
            "quiz_questions": []
        },
        {
            "id": "lesson_05",
            "title": "Hands-on: Code Analysis",
            "description": "Practical exercise in analyzing and identifying vulnerabilities",
            "duration_minutes": 150,
            "difficulty": "intermediate",
            "content_url": "/content/code-analysis",
            "resources": ["Sample vulnerable contracts", "Analysis tools"],
            "quiz_questions": []
        }
    ]
}


@router.post("/create")
async def create_roadmap(
    roadmap: LearningRoadmap,
    db = Depends(get_database)
) -> dict:
    """Create a new learning roadmap"""
    try:
        result = await db["learning_roadmaps"].insert_one(
            roadmap.model_dump(exclude={"id"}, by_alias=True)
        )
        return {
            "roadmap_id": str(result.inserted_id),
            "title": roadmap.title,
            "created_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/beginner")
async def get_beginner_roadmap(
    db = Depends(get_database)
) -> dict:
    """Get beginner learning roadmap"""
    try:
        # Try to get from database
        roadmap = await db["learning_roadmaps"].find_one(
            {"target_audience": "beginner", "title": "Blockchain Security Fundamentals"}
        )
        
        if not roadmap:
            # Initialize with default roadmap
            roadmap_data = LearningRoadmap(**BEGINNER_ROADMAP)
            result = await db["learning_roadmaps"].insert_one(
                roadmap_data.model_dump(exclude={"id"}, by_alias=True)
            )
            roadmap = await db["learning_roadmaps"].find_one(
                {"_id": result.inserted_id}
            )
        
        return {
            "roadmap_id": str(roadmap["_id"]),
            "title": roadmap["title"],
            "description": roadmap["description"],
            "target_audience": roadmap["target_audience"],
            "estimated_duration_hours": roadmap["estimated_duration_hours"],
            "lessons": roadmap.get("lessons", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
async def get_all_roadmaps(
    db = Depends(get_database)
) -> List[dict]:
    """Get all available learning roadmaps"""
    try:
        roadmaps = await db["learning_roadmaps"].find().to_list(length=50)
        return [
            {
                "roadmap_id": str(r["_id"]),
                "title": r["title"],
                "description": r["description"],
                "target_audience": r["target_audience"],
                "lesson_count": len(r.get("lessons", [])),
                "estimated_duration_hours": r.get("estimated_duration_hours", 0)
            }
            for r in roadmaps
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{roadmap_id}/lessons")
async def get_roadmap_lessons(
    roadmap_id: str,
    db = Depends(get_database)
) -> dict:
    """Get all lessons in a roadmap"""
    try:
        roadmap = await db["learning_roadmaps"].find_one(
            {"_id": ObjectId(roadmap_id)}
        )
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        
        return {
            "roadmap_id": roadmap_id,
            "title": roadmap["title"],
            "lessons": roadmap.get("lessons", [])
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/progress/start")
async def start_roadmap(
    user_id: str,
    roadmap_id: str,
    db = Depends(get_database)
) -> dict:
    """Start a learning roadmap for a user"""
    try:
        # Check if already started
        existing = await db["user_progress"].find_one(
            {"user_id": user_id, "roadmap_id": roadmap_id}
        )
        
        if existing:
            return {
                "progress_id": str(existing["_id"]),
                "message": "Already started",
                "progress_percentage": existing.get("progress_percentage", 0)
            }
        
        # Create new progress record
        progress = UserProgress(
            user_id=user_id,
            roadmap_id=roadmap_id,
            current_lesson="lesson_01"
        )
        
        result = await db["user_progress"].insert_one(
            progress.model_dump(exclude={"id"}, by_alias=True)
        )
        
        return {
            "progress_id": str(result.inserted_id),
            "message": "Roadmap started",
            "current_lesson": "lesson_01",
            "progress_percentage": 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress/{user_id}")
async def get_user_progress(
    user_id: str,
    db = Depends(get_database)
) -> List[dict]:
    """Get user's learning progress across all roadmaps"""
    try:
        progress_records = await db["user_progress"].find(
            {"user_id": user_id}
        ).to_list(length=50)
        
        return [
            {
                "progress_id": str(p["_id"]),
                "roadmap_id": p["roadmap_id"],
                "completed_lessons": p.get("completed_lessons", []),
                "current_lesson": p.get("current_lesson"),
                "progress_percentage": p.get("progress_percentage", 0),
                "started_at": format_datetime(p["started_at"]),
                "updated_at": format_datetime(p["updated_at"])
            }
            for p in progress_records
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/progress/{progress_id}/complete-lesson")
async def complete_lesson(
    progress_id: str,
    lesson_id: str,
    db = Depends(get_database)
) -> dict:
    """Mark a lesson as completed"""
    try:
        progress = await db["user_progress"].find_one(
            {"_id": ObjectId(progress_id)}
        )
        
        if not progress:
            raise HTTPException(status_code=404, detail="Progress record not found")
        
        # Update completed lessons and progress percentage
        completed = set(progress.get("completed_lessons", []))
        completed.add(lesson_id)
        
        # Calculate new progress percentage
        roadmap = await db["learning_roadmaps"].find_one(
            {"_id": ObjectId(progress["roadmap_id"])}
        )
        total_lessons = len(roadmap.get("lessons", []) if roadmap else [])
        progress_pct = (len(completed) / total_lessons * 100) if total_lessons > 0 else 0
        
        await db["user_progress"].update_one(
            {"_id": ObjectId(progress_id)},
            {
                "$set": {
                    "completed_lessons": list(completed),
                    "progress_percentage": progress_pct,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "progress_id": progress_id,
            "completed_lessons": list(completed),
            "progress_percentage": progress_pct,
            "message": "Lesson marked as completed"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
