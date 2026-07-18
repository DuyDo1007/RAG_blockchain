"""
Server-Sent Events (SSE) Streaming API Endpoint for Real-Time Chat
"""
import json
import asyncio
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from backend.models.schemas import CreateChatRequest, Message, ChatSession
from backend.models.database import get_database
from backend.middleware.auth_middleware import get_current_user
from backend.services.rag_service import RAGService
from src.rag_qa import retrieve_auto, compose_prompt, generate_fallback_answer
from src.agent_rag import get_gemini_client
from google.genai import types

router = APIRouter(prefix="/api/chat", tags=["streaming"])


@router.post("/stream")
async def stream_chat_response(
    request: CreateChatRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Stream AI response chunks via SSE (Server-Sent Events)"""
    auth_user_id = str(current_user["_id"])
    session = None

    if request.session_id:
        session = await db["chat_sessions"].find_one(
            {"_id": ObjectId(request.session_id), "user_id": auth_user_id}
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found or access denied")
    else:
        new_session = ChatSession(user_id=auth_user_id, title="New Chat")
        result = await db["chat_sessions"].insert_one(
            new_session.model_dump(exclude={"id"}, by_alias=True)
        )
        request.session_id = str(result.inserted_id)
        session = {"title": "New Chat", "messages": []}

    # Save user message immediately
    user_message = Message(role="user", content=request.message)
    await db["chat_sessions"].update_one(
        {"_id": ObjectId(request.session_id)},
        {
            "$push": {"messages": user_message.model_dump()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )

    chat_history = session.get("messages", [])

    async def event_generator():
        try:
            # 1. Retrieve documents (run in thread pool)
            docs = await asyncio.to_thread(retrieve_auto, request.message, top_k=5)
            sources = [d["title"] for d in docs if d.get("title")]
            
            # Send sources right away
            yield f"data: {json.dumps({'type': 'sources', 'content': sources, 'session_id': request.session_id}, ensure_ascii=False)}\n\n"

            # 2. Compose prompt and stream from Gemini
            prompt = compose_prompt(request.message, docs, chat_history)
            completed_answer = ""

            try:
                client = get_gemini_client()

                response_stream = await asyncio.to_thread(
                    client.models.generate_content_stream,
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=8192)
                )

                full_text = []
                for chunk in response_stream:
                    if chunk.text:
                        full_text.append(chunk.text)
                        chunk_data = {
                            "type": "chunk",
                            "content": chunk.text
                        }
                        yield f"data: {json.dumps(chunk_data, ensure_ascii=False)}\n\n"
                        await asyncio.sleep(0.01)  # allow event loop processing

                completed_answer = "".join(full_text)

            except Exception as api_err:
                # Check if it's a quota, API key or connection error to Gemini API
                err_str = str(api_err)
                is_quota_or_key = (
                    "429" in err_str or 
                    "quota" in err_str.lower() or 
                    "limit" in err_str.lower() or 
                    "api key" in err_str.lower() or
                    "invalid" in err_str.lower() or
                    "credentials" in err_str.lower() or
                    "not found" in err_str.lower()
                )
                
                if is_quota_or_key:
                    # Fallback to local RAG knowledge base
                    fallback_text = generate_fallback_answer(request.message, docs)
                    completed_answer = fallback_text
                    
                    # Yield fallback answer in small chunks to simulate streaming
                    words = fallback_text.split(" ")
                    for i in range(0, len(words), 3):
                        chunk_text = " ".join(words[i:i+3]) + " "
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk_text}, ensure_ascii=False)}\n\n"
                        await asyncio.sleep(0.02)
                else:
                    raise api_err

            # 3. Save assistant message to DB
            assistant_message = Message(
                role="assistant",
                content=completed_answer,
                sources=sources
            )
            await db["chat_sessions"].update_one(
                {"_id": ObjectId(request.session_id)},
                {
                    "$push": {"messages": assistant_message.model_dump()},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            # 4. Generate title if session is new
            current_title = session.get("title", "New Chat")
            if current_title in ["New Chat", "Cuộc trò chuyện mới"] or not current_title:
                try:
                    new_title = await RAGService.get_suggested_title(request.message)
                    await db["chat_sessions"].update_one(
                        {"_id": ObjectId(request.session_id)},
                        {"$set": {"title": new_title}}
                    )
                    yield f"data: {json.dumps({'type': 'title', 'content': new_title}, ensure_ascii=False)}\n\n"
                except Exception:
                    pass

            yield f"data: {json.dumps({'type': 'done', 'session_id': request.session_id}, ensure_ascii=False)}\n\n"

        except Exception as e:
            err_data = {"type": "error", "content": f"Lỗi streaming từ server: {str(e)}"}
            yield f"data: {json.dumps(err_data, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
