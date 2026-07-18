"""
RAG Service - Integration with existing RAG pipeline
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from src.rag_qa import retrieve, generate_answer_with_gemini, generate_chat_title_with_gemini
from typing import List, Dict, Any, Optional
import asyncio


class RAGService:
    """Service for RAG (Retrieval-Augmented Generation)"""
    
    @staticmethod
    async def get_answer(query: str, chat_history: List[Dict[str, Any]] = None, top_k: int = 5) -> Dict[str, Any]:
        """Get answer from RAG pipeline or Agentic RAG based on RAG_MODE setting"""
        rag_mode = os.getenv("RAG_MODE", "basic").lower()
        if rag_mode == "agentic":
            return await RAGService.get_answer_agentic(query, chat_history, top_k)

        try:
            # Retrieve relevant documents
            retrieved_docs = await asyncio.to_thread(
                retrieve, 
                query, 
                top_k
            )
            
            # Generate answer with Gemini
            answer = await asyncio.to_thread(
                generate_answer_with_gemini,
                query,
                retrieved_docs,
                chat_history=chat_history
            )
            
            # Extract sources from retrieved documents
            sources = []
            if isinstance(retrieved_docs, list):
                for doc in retrieved_docs:
                    if isinstance(doc, dict):
                        src = doc.get('title') or doc.get('source')
                        if src and src not in sources:
                            sources.append(src)
            
            return {
                "answer": answer,
                "sources": sources[:top_k],
                "retrieved_count": len(retrieved_docs) if isinstance(retrieved_docs, list) else 0,
                "success": True
            }
            
        except Exception as e:
            return {
                "answer": f"Xin lỗi, đã xảy ra lỗi: {str(e)}",
                "sources": [],
                "retrieved_count": 0,
                "success": False,
                "error": str(e)
            }

    @staticmethod
    async def get_suggested_title(query: str) -> str:
        """Get suggested short title for the chat query"""
        try:
            return await asyncio.to_thread(
                generate_chat_title_with_gemini,
                query
            )
        except Exception as e:
            print(f"[RAG] Failed to suggest title: {e}")
            words = query.strip().split()
            fallback = " ".join(words[:4])
            if len(words) > 4:
                fallback += "..."
            return fallback

    @staticmethod
    async def health_check() -> Dict[str, bool]:
        """Check if RAG pipeline is ready"""
        try:
            await asyncio.to_thread(
                retrieve,
                "test query",
                1
            )
            return {"rag_ready": True}
        except Exception as e:
            return {"rag_ready": False, "error": str(e)}

    @staticmethod
    async def get_answer_agentic(query: str, chat_history: List[Dict[str, Any]] = None, top_k: int = 6) -> Dict[str, Any]:
        """Execute LangGraph-based multi-step reasoning Agentic RAG"""
        try:
            from src.agent_rag import run_agent
            result = await run_agent(query, chat_history=chat_history, top_k=top_k)
            return result if isinstance(result, dict) else {
                "answer": str(result),
                "sources": [],
                "retrieved_count": 0,
                "success": True
            }
        except Exception as e:
            print(f"[RAGService] Agentic RAG error, fallback to basic: {e}")
            # Fallback to basic
            retrieved_docs = await asyncio.to_thread(retrieve, query, top_k)
            answer = await asyncio.to_thread(generate_answer_with_gemini, query, retrieved_docs, chat_history=chat_history)
            sources = [d.get("title") for d in retrieved_docs if isinstance(d, dict) and d.get("title")]
            return {
                "answer": answer,
                "sources": sources,
                "retrieved_count": len(retrieved_docs),
                "success": True
            }

    @staticmethod
    async def get_answer_streaming(query: str, chat_history: List[Dict[str, Any]] = None, top_k: int = 5):
        """Async generator yielding answer chunks for SSE"""
        from src.rag_qa import generate_answer_streaming
        retrieved_docs = await asyncio.to_thread(retrieve, query, top_k)
        stream_gen = generate_answer_streaming(query, retrieved_docs, chat_history=chat_history)
        for chunk in stream_gen:
            yield chunk
