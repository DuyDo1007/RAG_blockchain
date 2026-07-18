"""
Roadmap API Endpoints (Secured with JWT Authentication for Progress Tracking)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
import json
from pathlib import Path
from typing import List, Optional

from backend.models.schemas import (
    LearningRoadmap, UserProgress, RoadmapLesson, PyObjectId
)
from backend.models.database import get_database
from backend.middleware.auth_middleware import get_current_user, get_optional_user

router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])


def format_datetime(val):
    if not val:
        return ""
    if isinstance(val, str):
        return val
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)


@router.post("/create")
async def create_roadmap(
    roadmap: LearningRoadmap,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Create a new learning roadmap"""
    result = await db["learning_roadmaps"].insert_one(
        roadmap.model_dump(exclude={"id"}, by_alias=True)
    )
    return {
        "roadmap_id": str(result.inserted_id),
        "title": roadmap.title,
        "created_at": format_datetime(roadmap.created_at)
    }


@router.get("/beginner")
async def get_beginner_roadmap(
    db = Depends(get_database),
    user: Optional[dict] = Depends(get_optional_user)
) -> dict:
    """Get the beginner roadmap (Blockchain Security Fundamentals)"""
    try:
        # Check DB first
        existing = await db["learning_roadmaps"].find_one({"target_audience": {"$regex": "^beginner$", "$options": "i"}})
        
        # Load from file to ensure sync or initialization
        file_path = Path(__file__).parent.parent / "data" / "roadmap_quizzes.json"
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                roadmap_data = json.load(f)
                
            if existing:
                await db["learning_roadmaps"].update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "title": roadmap_data["title"],
                        "description": roadmap_data["description"],
                        "lessons": roadmap_data["lessons"],
                        "estimated_duration_hours": roadmap_data["estimated_duration_hours"],
                        "updated_at": datetime.utcnow()
                    }}
                )
                existing["lessons"] = roadmap_data["lessons"]
            else:
                roadmap_data["created_at"] = datetime.utcnow()
                roadmap_data["updated_at"] = datetime.utcnow()
                result = await db["learning_roadmaps"].insert_one(roadmap_data)
                existing = await db["learning_roadmaps"].find_one({"_id": result.inserted_id})
        elif not existing:
            raise HTTPException(status_code=404, detail="Beginner roadmap not found")

        # Format output
        existing["id"] = str(existing.pop("_id"))
        existing["created_at"] = format_datetime(existing.get("created_at"))
        existing["updated_at"] = format_datetime(existing.get("updated_at"))
        return existing
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
async def get_all_roadmaps(
    db = Depends(get_database),
    user: Optional[dict] = Depends(get_optional_user)
) -> List[dict]:
    """Get all available learning roadmaps"""
    roadmaps = await db["learning_roadmaps"].find().to_list(length=100)
    return [
        {
            "id": str(r["_id"]),
            "title": r["title"],
            "description": r["description"],
            "target_audience": r["target_audience"],
            "lessons_count": len(r.get("lessons", [])),
            "estimated_duration_hours": r.get("estimated_duration_hours", 0)
        }
        for r in roadmaps
    ]


@router.get("/{roadmap_id}/lessons")
async def get_roadmap_lessons(
    roadmap_id: str,
    db = Depends(get_database),
    user: Optional[dict] = Depends(get_optional_user)
) -> List[dict]:
    """Get all lessons in a roadmap"""
    try:
        roadmap = await db["learning_roadmaps"].find_one({"_id": ObjectId(roadmap_id)})
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
            
        return roadmap.get("lessons", [])
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/progress/start")
async def start_roadmap(
    roadmap_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Start tracking progress on a roadmap for authenticated user"""
    try:
        user_id = str(current_user["_id"])
        # Check if roadmap exists
        roadmap = await db["learning_roadmaps"].find_one({"_id": ObjectId(roadmap_id)})
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
            
        # Check if progress already exists
        existing = await db["user_progress"].find_one({
            "user_id": user_id,
            "roadmap_id": roadmap_id
        })
        
        if existing:
            return {
                "progress_id": str(existing["_id"]),
                "message": "Progress already tracking",
                "progress_percentage": existing.get("progress_percentage", 0)
            }
            
        progress = UserProgress(
            user_id=user_id,
            roadmap_id=roadmap_id,
            completed_lessons=[],
            current_lesson=0,
            progress_percentage=0.0
        )
        
        result = await db["user_progress"].insert_one(
            progress.model_dump(exclude={"id"}, by_alias=True)
        )
        
        return {
            "progress_id": str(result.inserted_id),
            "user_id": user_id,
            "roadmap_id": roadmap_id,
            "message": "Started tracking roadmap progress"
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/progress")
@router.get("/progress/{user_id}")
async def get_user_progress(
    user_id: Optional[str] = None,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Get authenticated user's progress across all roadmaps"""
    auth_user_id = str(current_user["_id"])
    target_user_id = auth_user_id
        
    progress_list = await db["user_progress"].find(
        {"user_id": target_user_id}
    ).to_list(length=100)
    
    result = []
    for p in progress_list:
        roadmap = await db["learning_roadmaps"].find_one(
            {"_id": ObjectId(p["roadmap_id"])}
        )
        
        result.append({
            "progress_id": str(p["_id"]),
            "roadmap_id": p["roadmap_id"],
            "roadmap_title": roadmap["title"] if roadmap else "Unknown",
            "completed_lessons": p.get("completed_lessons", []),
            "current_lesson": p.get("current_lesson", 0),
            "progress_percentage": p.get("progress_percentage", 0.0),
            "started_at": format_datetime(p["started_at"]),
            "updated_at": format_datetime(p["updated_at"])
        })
        
    return result


@router.put("/progress/{progress_id}/complete-lesson")
async def complete_lesson(
    progress_id: str,
    lesson_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Mark a lesson as completed for authenticated user"""
    try:
        auth_user_id = str(current_user["_id"])
        progress = await db["user_progress"].find_one(
            {"_id": ObjectId(progress_id), "user_id": auth_user_id}
        )
        if not progress:
            raise HTTPException(status_code=404, detail="Progress record not found or forbidden")
            
        completed = progress.get("completed_lessons", [])
        if lesson_id not in completed:
            completed.append(lesson_id)
            
        roadmap = await db["learning_roadmaps"].find_one(
            {"_id": ObjectId(progress["roadmap_id"])}
        )
        
        total_lessons = len(roadmap.get("lessons", [])) if roadmap else 1
        percentage = (len(completed) / total_lessons) * 100
        
        await db["user_progress"].update_one(
            {"_id": ObjectId(progress_id)},
            {
                "$set": {
                    "completed_lessons": completed,
                    "progress_percentage": round(percentage, 2),
                    "current_lesson": min(len(completed), total_lessons - 1),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "progress_id": progress_id,
            "completed_lessons": completed,
            "progress_percentage": round(percentage, 2),
            "message": "Lesson marked as completed"
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))
