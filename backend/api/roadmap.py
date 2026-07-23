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
from backend.services.gamification_service import GamificationService

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
        
        if existing:
            # Format and return directly from DB (which includes any admin additions/updates)
            existing["id"] = str(existing.pop("_id"))
            existing["created_at"] = format_datetime(existing.get("created_at"))
            existing["updated_at"] = format_datetime(existing.get("updated_at"))
            return existing
            
        # Load from file to initialize if DB is empty
        file_path = Path(__file__).parent.parent / "data" / "roadmap_quizzes.json"
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                roadmap_data = json.load(f)
                
            roadmap_data["created_at"] = datetime.utcnow()
            roadmap_data["updated_at"] = datetime.utcnow()
            result = await db["learning_roadmaps"].insert_one(roadmap_data)
            existing = await db["learning_roadmaps"].find_one({"_id": result.inserted_id})
        else:
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
    
    # Auto-initialize progress record if user doesn't have one yet
    if not progress_list:
        roadmap = await db["learning_roadmaps"].find_one({"target_audience": {"$regex": "^beginner$", "$options": "i"}})
        if roadmap:
            roadmap_id = str(roadmap["_id"])
            new_prog = UserProgress(
                user_id=target_user_id,
                roadmap_id=roadmap_id,
                completed_lessons=[],
                current_lesson=0,
                progress_percentage=0.0
            )
            insert_res = await db["user_progress"].insert_one(
                new_prog.model_dump(exclude={"id"}, by_alias=True)
            )
            p_doc = await db["user_progress"].find_one({"_id": insert_res.inserted_id})
            if p_doc:
                progress_list = [p_doc]

    result = []
    for p in progress_list:
        roadmap = await db["learning_roadmaps"].find_one(
            {"_id": ObjectId(p["roadmap_id"])}
        )
        
        normalized_completed = [str(lid).replace("_", "-") for lid in p.get("completed_lessons", [])]
        
        result.append({
            "progress_id": str(p["_id"]),
            "roadmap_id": p["roadmap_id"],
            "roadmap_title": roadmap["title"] if roadmap else "Unknown",
            "completed_lessons": normalized_completed,
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
        
        progress = None
        if progress_id != "current" and ObjectId.is_valid(progress_id):
            progress = await db["user_progress"].find_one(
                {"_id": ObjectId(progress_id), "user_id": auth_user_id}
            )
            
        if not progress:
            # Fallback to finding by user_id
            progress = await db["user_progress"].find_one({"user_id": auth_user_id})

        if not progress:
            # Auto-create if still not existing
            roadmap = await db["learning_roadmaps"].find_one({"target_audience": {"$regex": "^beginner$", "$options": "i"}})
            if not roadmap:
                raise HTTPException(status_code=404, detail="Roadmap not found")
            roadmap_id = str(roadmap["_id"])
            new_prog = UserProgress(
                user_id=auth_user_id,
                roadmap_id=roadmap_id,
                completed_lessons=[],
                current_lesson=0,
                progress_percentage=0.0
            )
            ins = await db["user_progress"].insert_one(
                new_prog.model_dump(exclude={"id"}, by_alias=True)
            )
            progress = await db["user_progress"].find_one({"_id": ins.inserted_id})
            
        norm_lesson_id = lesson_id.replace("_", "-")
        completed = [str(lid).replace("_", "-") for lid in progress.get("completed_lessons", [])]
        if norm_lesson_id not in completed:
            completed.append(norm_lesson_id)
            
        roadmap = await db["learning_roadmaps"].find_one(
            {"_id": ObjectId(progress["roadmap_id"])}
        )
        
        total_lessons = len(roadmap.get("lessons", [])) if (roadmap and roadmap.get("lessons")) else 16
        core_completed = [lid for lid in completed if not str(lid).startswith("lab-")]
        percentage = min(100.0, (len(core_completed) / total_lessons) * 100)
        
        # Update all progress records for this user to keep them perfectly in sync
        await db["user_progress"].update_many(
            {"user_id": auth_user_id},
            {
                "$set": {
                    "completed_lessons": completed,
                    "progress_percentage": round(percentage, 2),
                    "current_lesson": min(len(core_completed), max(0, total_lessons - 1)),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Trigger gamification update (Streak, XP, Badges)
        gamification_res = await GamificationService.update_user_gamification(
            db=db,
            user_id=auth_user_id,
            xp_gain=500,
            completed_lessons_count=len(core_completed),
            is_lab_pass=False
        )

        return {
            "progress_id": str(progress["_id"]),
            "completed_lessons": completed,
            "progress_percentage": round(percentage, 2),
            "message": "Lesson marked as completed",
            "gamification": gamification_res
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lesson-content/{lesson_id}")
async def get_lesson_content(
    lesson_id: str,
    db = Depends(get_database),
    user: Optional[dict] = Depends(get_optional_user)
) -> dict:
    """Get rich markdown content and code blocks for a specific lesson"""
    normalized_id = lesson_id.replace("_", "-")
    
    # Check DB first to see if admin customized content for this lesson
    try:
        roadmap = await db["learning_roadmaps"].find_one({"target_audience": {"$regex": "^beginner$", "$options": "i"}})
        if roadmap and roadmap.get("lessons"):
            for l in roadmap["lessons"]:
                if l.get("id", "").replace("_", "-") == normalized_id:
                    if l.get("content") and str(l.get("content")).strip():
                        return {
                            "lesson_id": lesson_id,
                            "markdown_content": l["content"]
                        }
                    break
    except Exception as err:
        print(f"[Roadmap] Error checking DB for lesson content: {err}")

    edu_dir = Path(__file__).parent.parent.parent / "data" / "education"
    mapping = {
        "lesson-01": "01-blockchain-basics.md",
        "lesson-02": "05-smart-contracts.md",
        "lesson-03": "08-security.md",
        "lesson-04": "10-advanced-topics.md",
        "lesson-05": "02-cryptography.md",
        "lesson-06": "03-consensus.md",
        "lesson-07": "04-ethereum.md",
        "lesson-08": "06-defi.md",
        "lesson-09": "07-nft.md",
        "lesson-10": "09-web3-development.md",
        "lesson-11": "06-defi.md",
        "lesson-12": "07-nft.md",
        "lesson-13": "11-advanced-reentrancy-read-only.md",
        "lesson-14": "12-delegatecall-storage-collision.md",
        "lesson-15": "13-signature-malleability-eip712.md",
        "lesson-16": "14-cross-chain-bridge-security.md"
    }
    
    file_name = mapping.get(normalized_id, f"{normalized_id}.md")
    if not (edu_dir / file_name).exists():
        for f in edu_dir.glob("*.md"):
            if lesson_id in f.name or f.stem.endswith(lesson_id):
                file_name = f.name
                break
                
    target_path = edu_dir / file_name
    if not target_path.exists():
        return {
            "lesson_id": lesson_id,
            "markdown_content": f"# {lesson_id}\n\nNội dung chi tiết của bài học đang được cập nhật trên Blockchain Academy..."
        }
        
    with open(target_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            content = parts[2].strip()
            
    return {
        "lesson_id": lesson_id,
        "file_name": file_name,
        "markdown_content": content
    }


@router.get("/leaderboard")
async def get_roadmap_leaderboard(
    limit: int = 50,
    db = Depends(get_database)
) -> List[dict]:
    """Get student leaderboard ranked by XP and completed lessons"""
    return await GamificationService.get_leaderboard(db, limit=limit)
