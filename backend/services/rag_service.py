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
        """
        Get answer from RAG pipeline
        
        Args:
            query: User question
            chat_history: Previous messages context
            top_k: Number of top similar documents to retrieve
            
        Returns:
            Dictionary with answer, sources, and confidence
        """
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
                    if isinstance(doc, dict) and 'source' in doc:
                        sources.append(doc['source'])
            
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
            # Try a simple retrieval
            await asyncio.to_thread(
                retrieve,
                "test query",
                1
            )
            return {"rag_ready": True}
        except Exception as e:
            return {"rag_ready": False, "error": str(e)}
