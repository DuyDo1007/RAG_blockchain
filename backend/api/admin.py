"""
Admin API Endpoints (Secured with JWT and require_admin middleware)
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from bson import ObjectId

from backend.models.database import get_database
from backend.middleware.auth_middleware import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
async def get_users_list(
    db = Depends(get_database),
    admin_user: dict = Depends(require_admin)
) -> List[dict]:
    """Admin-only: Retrieve all registered users with their details and roadmap progress"""
    try:
        users = await db["users"].find().to_list(length=200)
        user_list = []
        for u in users:
            user_id_str = str(u["_id"])
            
            # Fetch user progress
            progress = await db["user_progress"].find_one({"user_id": user_id_str})
            completed_count = 0
            percentage = 0.0
            if progress:
                completed_count = len(progress.get("completed_lessons", []))
                percentage = progress.get("progress_percentage", 0.0)
                
            user_list.append({
                "id": user_id_str,
                "email": u.get("email"),
                "username": u.get("username"),
                "auth_provider": u.get("auth_provider", "local"),
                "role": u.get("role", "user"),
                "is_active": u.get("is_active", True),
                "created_at": u.get("created_at").isoformat() if u.get("created_at") else None,
                "lessons_completed": completed_count,
                "progress_percentage": percentage
            })
        return user_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_data: dict,  # e.g. {"role": "admin"} or {"role": "user"}
    db = Depends(get_database),
    admin_user: dict = Depends(require_admin)
) -> dict:
    """Admin-only: Update a user's role"""
    new_role = role_data.get("role")
    if new_role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ (Invalid role)")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="ID người dùng không hợp lệ (Invalid user ID)")

    # Prevent admin from changing their own role (self-demotion safety check)
    if user_id == str(admin_user["_id"]):
        raise HTTPException(status_code=400, detail="Bạn không thể tự giáng chức mình (Self-demotion not allowed)")

    result = await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": new_role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng (User not found)")

    return {"message": "Cập nhật vai trò người dùng thành công", "role": new_role}


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_data: dict,  # e.g. {"is_active": false}
    db = Depends(get_database),
    admin_user: dict = Depends(require_admin)
) -> dict:
    """Admin-only: Enable or disable a user account"""
    is_active = status_data.get("is_active")
    if is_active is None or not isinstance(is_active, bool):
        raise HTTPException(status_code=400, detail="Trạng thái is_active không hợp lệ")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="ID người dùng không hợp lệ (Invalid user ID)")

    # Prevent admin from disabling their own account
    if user_id == str(admin_user["_id"]):
        raise HTTPException(status_code=400, detail="Bạn không thể tự khóa tài khoản của mình (Self-lockout not allowed)")

    result = await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": is_active}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng (User not found)")

    return {"message": "Cập nhật trạng thái người dùng thành công", "is_active": is_active}


@router.get("/lessons")
async def get_lessons(
    db = Depends(get_database),
    admin_user: dict = Depends(require_admin)
) -> List[dict]:
    """Admin-only: Retrieve all lessons from the beginner learning roadmap"""
    try:
        roadmap = await db["learning_roadmaps"].find_one({"target_audience": {"$regex": "^beginner$", "$options": "i"}})
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        
        lessons = roadmap.get("lessons", [])
        return lessons
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lessons")
async def create_lesson(
    lesson_data: dict,
    db = Depends(get_database),
    admin_user: dict = Depends(require_admin)
) -> dict:
    """Admin-only: Add a new lesson to the beginner learning roadmap"""
    try:
        roadmap = await db["learning_roadmaps"].find_one({"target_audience": {"$regex": "^beginner$", "$options": "i"}})
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        
        lessons = roadmap.get("lessons", [])
        
        # Check if ID already exists
        lesson_id = lesson_data.get("id")
        if not lesson_id:
            lesson_id = f"lesson-{len(lessons) + 1:02d}"
            lesson_data["id"] = lesson_id
            
        for l in lessons:
            if l.get("id") == lesson_id:
                raise HTTPException(status_code=400, detail="Mã bài học đã tồn tại")
                
        lessons.append(lesson_data)
        
        await db["learning_roadmaps"].update_one(
            {"_id": roadmap["_id"]},
            {"$set": {"lessons": lessons}}
        )
        return {"message": "Thêm bài học thành công", "lesson": lesson_data}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/lessons/{lesson_id}")
async def update_lesson(
    lesson_id: str,
    lesson_data: dict,
    db = Depends(get_database),
    admin_user: dict = Depends(require_admin)
) -> dict:
    """Admin-only: Update an existing lesson in the beginner learning roadmap"""
    try:
        roadmap = await db["learning_roadmaps"].find_one({"target_audience": {"$regex": "^beginner$", "$options": "i"}})
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        
        lessons = roadmap.get("lessons", [])
        updated = False
        
        for i, l in enumerate(lessons):
            if l.get("id") == lesson_id:
                # Merge data
                lessons[i] = {**l, **lesson_data, "id": lesson_id}
                updated = True
                break
                
        if not updated:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài học để cập nhật")
            
        await db["learning_roadmaps"].update_one(
            {"_id": roadmap["_id"]},
            {"$set": {"lessons": lessons}}
        )
        return {"message": "Cập nhật bài học thành công"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: str,
    db = Depends(get_database),
    admin_user: dict = Depends(require_admin)
) -> dict:
    """Admin-only: Delete a lesson from the beginner learning roadmap"""
    try:
        roadmap = await db["learning_roadmaps"].find_one({"target_audience": {"$regex": "^beginner$", "$options": "i"}})
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        
        lessons = roadmap.get("lessons", [])
        initial_len = len(lessons)
        lessons = [l for l in lessons if l.get("id") != lesson_id]
        
        if len(lessons) == initial_len:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài học để xóa")
            
        await db["learning_roadmaps"].update_one(
            {"_id": roadmap["_id"]},
            {"$set": {"lessons": lessons}}
        )
        return {"message": "Xóa bài học thành công"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics")
async def get_system_analytics(
    db = Depends(get_database),
    admin_user: dict = Depends(require_admin)
) -> dict:
    """Admin-only: Retrieve system analytics & metrics"""
    try:
        total_users = await db["users"].count_documents({})
        active_users = await db["users"].count_documents({"is_active": True})
        total_sessions = await db["chat_sessions"].count_documents({})
        total_messages = await db["chat_messages"].count_documents({})
        
        progresses = await db["user_progress"].find().to_list(length=500)
        total_completed = sum(len(p.get("completed_lessons", [])) for p in progresses)
        avg_progress = (
            sum(p.get("progress_percentage", 0.0) for p in progresses) / len(progresses)
            if len(progresses) > 0 else 0.0
        )
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "total_completed_lessons": total_completed,
            "avg_progress_percentage": round(avg_progress, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

