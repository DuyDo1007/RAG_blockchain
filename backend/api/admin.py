"""
Admin API Endpoints (Secured with JWT and require_admin middleware)
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form, BackgroundTasks
from typing import List, Dict, Any, Optional
from bson import ObjectId
import json
from pathlib import Path
import os

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
                completed_count = len([x for x in progress.get("completed_lessons", []) if x])
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
    """Admin-only: Retrieve all lessons from the beginner learning roadmap with detailed content populated"""
    try:
        roadmap = await db["learning_roadmaps"].find_one({"target_audience": {"$regex": "^beginner$", "$options": "i"}})
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        
        lessons = roadmap.get("lessons", [])
        
        # Populate content from file if not customized in DB yet
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
        for l in lessons:
            if not l.get("content") or not str(l.get("content")).strip():
                lid = l.get("id", "").replace("_", "-")
                file_name = mapping.get(lid, f"{lid}.md")
                target_path = edu_dir / file_name
                if not target_path.exists():
                    for f in edu_dir.glob("*.md"):
                        if lid in f.name or f.stem.endswith(lid):
                            target_path = f
                            break
                if target_path.exists():
                    try:
                        with open(target_path, "r", encoding="utf-8") as f:
                            l["content"] = f.read()
                    except Exception:
                        pass
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

        # Sync back to roadmap_quizzes.json to ensure persistence
        try:
            json_path = Path(__file__).parent.parent / "data" / "roadmap_quizzes.json"
            if json_path.exists():
                with open(json_path, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
                file_data["lessons"] = lessons
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(file_data, f, indent=2, ensure_ascii=False)
        except Exception as sync_err:
            print(f"[Admin] Warning syncing roadmap_quizzes.json: {sync_err}")

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

        # Sync back to roadmap_quizzes.json to ensure persistence
        try:
            json_path = Path(__file__).parent.parent / "data" / "roadmap_quizzes.json"
            if json_path.exists():
                with open(json_path, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
                file_data["lessons"] = lessons
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(file_data, f, indent=2, ensure_ascii=False)
        except Exception as sync_err:
            print(f"[Admin] Warning syncing roadmap_quizzes.json: {sync_err}")

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

        # Sync back to roadmap_quizzes.json to ensure persistence
        try:
            json_path = Path(__file__).parent.parent / "data" / "roadmap_quizzes.json"
            if json_path.exists():
                with open(json_path, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
                file_data["lessons"] = lessons
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(file_data, f, indent=2, ensure_ascii=False)
        except Exception as sync_err:
            print(f"[Admin] Warning syncing roadmap_quizzes.json: {sync_err}")

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
        
        users = await db["users"].find({}, {"_id": 1}).to_list(length=1000)
        valid_user_ids = {str(u["_id"]) for u in users}

        progresses = await db["user_progress"].find({"user_id": {"$in": list(valid_user_ids)}}).to_list(length=1000)
        total_completed = sum(len([x for x in p.get("completed_lessons", []) if x]) for p in progresses)
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


# --- QDRANT RAG NO-CLI VECTOR STUDIO ENDPOINTS ---

@router.get("/qdrant/status")
async def get_qdrant_status(admin_user: dict = Depends(require_admin)) -> dict:
    """Admin-only: Get Qdrant vector database connection status and point metrics"""
    from backend.services.vector_store import QdrantVectorStore
    store = QdrantVectorStore.get_instance()
    info = await store.get_collection_info()
    return info


@router.get("/qdrant/documents")
async def list_qdrant_documents(
    limit: int = 50,
    offset: Optional[str] = None,
    admin_user: dict = Depends(require_admin)
) -> dict:
    """Admin-only: Scroll and inspect documents currently stored in Qdrant"""
    from backend.services.vector_store import QdrantVectorStore
    store = QdrantVectorStore.get_instance()
    docs = await store.scroll_documents(limit=limit, offset=offset)
    return {"documents": docs, "count": len(docs)}


@router.delete("/qdrant/documents/{point_id}")
async def delete_qdrant_document(
    point_id: str,
    admin_user: dict = Depends(require_admin)
) -> dict:
    """Admin-only: Delete a document/chunk from Qdrant vector store"""
    from backend.services.vector_store import QdrantVectorStore
    store = QdrantVectorStore.get_instance()
    success = await store.delete_point(point_id)
    if not success:
        raise HTTPException(status_code=500, detail="Không thể xóa document từ Qdrant")
    return {"message": "Xóa document thành công", "point_id": point_id}


@router.post("/qdrant/upload")
async def upload_qdrant_document(
    file: UploadFile = File(...),
    admin_user: dict = Depends(require_admin)
) -> dict:
    """Admin-only: Upload Markdown or JSON file and ingest directly into Qdrant vector store without CLI"""
    from backend.services.vector_store import QdrantVectorStore
    from src.rag_qa import encode_query
    store = QdrantVectorStore.get_instance()

    filename = file.filename or "unknown.md"
    content_bytes = await file.read()
    content_str = content_bytes.decode("utf-8", errors="ignore")

    documents_to_upsert = []
    vectors_to_upsert = []

    try:
        if filename.endswith(".json"):
            data = json.loads(content_str)
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict) and "findings" in data:
                items = data["findings"]
            elif isinstance(data, dict):
                items = [data]
            else:
                items = []

            for i, item in enumerate(items):
                doc_id = item.get("id") or f"{filename}_{i}"
                title = item.get("title") or filename
                body = item.get("content") or item.get("description") or ""
                code = item.get("code", "")
                full_text = f"{title}\n{body}\n{code}".strip()
                if not full_text:
                    continue

                emb = encode_query(full_text).astype("float32").tolist()
                documents_to_upsert.append({
                    "id": doc_id,
                    "title": title,
                    "content": body,
                    "code": code,
                    "source_file": filename,
                    "chunk_type": "admin_upload"
                })
                vectors_to_upsert.append(emb)

        else:
            # Markdown text chunking by sections / headers
            sections = [s.strip() for s in content_str.split("\n## ") if s.strip()]
            if not sections:
                sections = [content_str.strip()]

            for i, sec in enumerate(sections):
                lines = sec.split("\n")
                heading = lines[0].strip("# ").strip() if len(lines) > 1 else filename
                doc_id = f"{filename.replace('.', '_')}_sec_{i}"
                
                emb = encode_query(sec).astype("float32").tolist()
                documents_to_upsert.append({
                    "id": doc_id,
                    "title": f"{filename} - {heading}",
                    "content": sec,
                    "code": "",
                    "source_file": filename,
                    "chunk_type": "admin_upload"
                })
                vectors_to_upsert.append(emb)

        if not documents_to_upsert:
            raise HTTPException(status_code=400, detail="Không tìm thấy nội dung hợp lệ trong tệp để ingest")

        await store.upsert_documents(documents_to_upsert, vectors_to_upsert)
        return {
            "message": f"Ingest thành công {len(documents_to_upsert)} chunks từ '{filename}' vào Qdrant",
            "chunks_added": len(documents_to_upsert)
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Lỗi khi ingest vào Qdrant: {str(e)}")


@router.post("/qdrant/sync_all")
async def sync_all_qdrant(
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(require_admin)
) -> dict:
    """Admin-only: Trigger background re-ingestion of education markdown files into Qdrant"""
    async def run_ingestion():
        try:
            from src.ingest_education import main as ingest_main
            await ingest_main()
            print("[Admin] Background education sync completed successfully.")
        except Exception as e:
            print(f"[Admin] Background education sync error: {e}")

    background_tasks.add_task(run_ingestion)
    return {"message": "Đã bắt đầu tiến trình chạy đồng bộ dữ liệu RAG vào Qdrant trong background"}


