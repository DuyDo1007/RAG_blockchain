"""
Chat API Endpoints (Secured with JWT Authentication)
"""
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from datetime import datetime
from bson import ObjectId
import json
import asyncio
from typing import List, Optional

from backend.models.schemas import (
    ChatSession, Message, CreateChatRequest, ChatResponse, PyObjectId,
    CreateBookmarkRequest, UserBookmark
)
from backend.models.database import get_database
from backend.services.rag_service import RAGService
from backend.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])


def format_datetime(val):
    if not val:
        return ""
    if isinstance(val, str):
        return val
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass


manager = ConnectionManager()


@router.post("/sessions")
async def create_session(
    title: str = "New Chat",
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Create a new chat session for current authenticated user"""
    user_id = str(current_user["_id"])
    session = ChatSession(
        user_id=user_id,
        title=title,
        messages=[]
    )
    
    result = await db["chat_sessions"].insert_one(session.model_dump(exclude={"id"}, by_alias=True))
    return {
        "session_id": str(result.inserted_id),
        "title": title,
        "created_at": session.created_at.isoformat()
    }


@router.get("/sessions")
@router.get("/sessions/{user_id}")
async def get_user_sessions(
    user_id: Optional[str] = None,
    limit: int = 20,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Get all chat sessions for the authenticated user"""
    auth_user_id = str(current_user["_id"])
    # If user_id provided in URL, make sure it matches auth user or just override it safely
    target_user_id = auth_user_id
    
    sessions = await db["chat_sessions"].find(
        {"user_id": target_user_id}
    ).sort("updated_at", -1).limit(limit).to_list(length=limit)
    
    return [
        {
            "session_id": str(s["_id"]),
            "title": s.get("title", "Untitled"),
            "created_at": format_datetime(s["created_at"]),
            "updated_at": format_datetime(s["updated_at"]),
            "message_count": len(s.get("messages", []))
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Get all messages in a session belonging to authenticated user"""
    try:
        auth_user_id = str(current_user["_id"])
        session = await db["chat_sessions"].find_one(
            {"_id": ObjectId(session_id), "user_id": auth_user_id}
        )
        if not session:
            raise HTTPException(status_code=404, detail="Cuộc trò chuyện không tồn tại hoặc bạn không có quyền truy cập")
        
        return {
            "session_id": session_id,
            "title": session.get("title", "Untitled"),
            "messages": [
                {
                    "role": m["role"],
                    "content": m["content"],
                    "timestamp": format_datetime(m["timestamp"]),
                    "sources": m.get("sources", [])
                }
                for m in session.get("messages", [])
            ]
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/send")
async def send_message(
    request: CreateChatRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> ChatResponse:
    """Send a message and get AI response"""
    try:
        auth_user_id = str(current_user["_id"])
        session = None
        if request.session_id:
            session = await db["chat_sessions"].find_one(
                {"_id": ObjectId(request.session_id), "user_id": auth_user_id}
            )
            if not session:
                raise HTTPException(status_code=404, detail="Session not found or forbidden")
        else:
            # Create new session
            new_session = ChatSession(
                user_id=auth_user_id,
                title="New Chat"
            )
            result = await db["chat_sessions"].insert_one(
                new_session.model_dump(exclude={"id"}, by_alias=True)
            )
            request.session_id = str(result.inserted_id)
            session = {
                "title": "New Chat",
                "messages": []
            }

        # Add user message
        user_message = Message(
            role="user",
            content=request.message
        )
        
        await db["chat_sessions"].update_one(
            {"_id": ObjectId(request.session_id)},
            {
                "$push": {"messages": user_message.model_dump()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        chat_history = session.get("messages", []) if session else []
        current_title = session.get("title", "New Chat")
        need_title = current_title in ["New Chat", "Cuộc trò chuyện mới"] or not current_title

        if need_title:
            rag_task = RAGService.get_answer(request.message, chat_history=chat_history, top_k=5)
            title_task = RAGService.get_suggested_title(request.message)
            rag_result, new_title = await asyncio.gather(rag_task, title_task)
        else:
            rag_result = await RAGService.get_answer(request.message, chat_history=chat_history, top_k=5)
            new_title = None
        
        assistant_message = Message(
            role="assistant",
            content=rag_result["answer"],
            sources=rag_result.get("sources", [])
        )
        
        result = await db["chat_sessions"].update_one(
            {"_id": ObjectId(request.session_id)},
            {
                "$push": {"messages": assistant_message.model_dump()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        if new_title:
            await db["chat_sessions"].update_one(
                {"_id": ObjectId(request.session_id)},
                {"$set": {"title": new_title}}
            )

        return ChatResponse(
            session_id=request.session_id,
            message_id=str(result.upserted_id or ObjectId()),
            content=rag_result["answer"],
            sources=rag_result.get("sources", []),
            title=new_title
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Delete a chat session"""
    try:
        auth_user_id = str(current_user["_id"])
        result = await db["chat_sessions"].delete_one(
            {"_id": ObjectId(session_id), "user_id": auth_user_id}
        )
        
        # Also delete all bookmarks associated with this session
        await db["user_bookmarks"].delete_many(
            {"session_id": session_id, "user_id": auth_user_id}
        )
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Session not found or access denied")
        
        return {"message": "Session deleted successfully", "deleted_id": session_id}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/sessions/{session_id}/title")
async def update_session_title(
    session_id: str,
    new_title: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Update session title"""
    try:
        auth_user_id = str(current_user["_id"])
        res = await db["chat_sessions"].update_one(
            {"_id": ObjectId(session_id), "user_id": auth_user_id},
            {"$set": {"title": new_title, "updated_at": datetime.utcnow()}}
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found or access denied")
        return {"message": "Title updated", "session_id": session_id, "new_title": new_title}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, db = Depends(get_database)):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            rag_result = await RAGService.get_answer(message_data["message"])
            
            response = {
                "type": "response",
                "content": rag_result["answer"],
                "sources": rag_result.get("sources", [])
            }
            
            await websocket.send_json(response)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.post("/bookmarks")
async def create_bookmark(
    request: CreateBookmarkRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Save an AI answer or highlighted text as bookmark"""
    auth_user_id = str(current_user["_id"])
    bookmark = UserBookmark(
        user_id=auth_user_id,
        message_id=request.message_id,
        session_id=request.session_id,
        title=request.title or "Ghi chú kiến thức AI",
        content=request.content,
        highlighted_text=request.highlighted_text,
        sources=request.sources or []
    )
    result = await db["user_bookmarks"].insert_one(bookmark.model_dump(exclude={"id"}, by_alias=True))
    return {
        "id": str(result.inserted_id),
        "message": "Đã lưu vào Sổ tay kiến thức thành công!",
        "created_at": bookmark.created_at.isoformat()
    }


@router.get("/bookmarks")
async def get_user_bookmarks(
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Get all bookmarks for current user"""
    auth_user_id = str(current_user["_id"])
    bookmarks = await db["user_bookmarks"].find(
        {"user_id": auth_user_id}
    ).sort("created_at", -1).to_list(length=100)
    
    return [
        {
            "id": str(b["_id"]),
            "title": b.get("title", "Ghi chú"),
            "content": b.get("content", ""),
            "highlighted_text": b.get("highlighted_text"),
            "sources": b.get("sources", []),
            "created_at": format_datetime(b.get("created_at"))
        }
        for b in bookmarks
    ]


@router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(
    bookmark_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Delete a saved bookmark"""
    try:
        auth_user_id = str(current_user["_id"])
        result = await db["user_bookmarks"].delete_one(
            {"_id": ObjectId(bookmark_id), "user_id": auth_user_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy mục lưu hoặc không có quyền xóa")
        return {"message": "Đã xóa mục đã lưu thành công", "id": bookmark_id}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))
