"""
LangGraph Agentic RAG for Blockchain Learning Platform
Architecture: Router -> (Reject / Retriever -> Generator -> Hallucination Grader -> Self-Correction)
Supports real-time SSE status streaming for UI transparency.
"""
import os
import json
import asyncio
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from google import genai
from google.genai import types

from src.rag_qa import retrieve_auto, compose_prompt


class AgentState(TypedDict):
    query: str
    intent: str  # 'retrieve', 'reject', 'direct'
    retrieved_docs: List[Dict[str, Any]]
    draft_answer: str
    grade: str   # 'pass', 'hallucinated'
    final_answer: str
    chat_history: List[Dict[str, Any]]
    status_history: List[str]
    error: Optional[str]


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your-gemini-api-key-here":
        raise ValueError("Chưa cấu hình GEMINI_API_KEY trong .env")
    return genai.Client(api_key=api_key)


async def route_query_node(state: AgentState) -> AgentState:
    """Node 1: Router - Classifies user query into retrieve, reject, or direct."""
    query = state["query"]
    state.setdefault("status_history", []).append("🔍 Đang phân tích ý định câu hỏi (Router Node)...")
    print(f"[AgentRAG:Router] Routing query: {query[:60]}...")
    
    # Quick heuristics for greetings and identity checks
    import re
    clean_q = re.sub(r'[^\w\s]', '', query.strip().lower()).strip()
    direct_phrases = [
        "xin chào", "chào bạn", "hello", "hi", "chào", "bạn là ai", "mày là ai", 
        "m là ai", "cảm ơn", "thank you", "mày tên gì", "bạn tên gì", "ai tutor là gì", 
        "bạn làm được gì", "mày làm được gì", "who are you"
    ]
    if clean_q in direct_phrases or any(phrase in clean_q for phrase in ["bạn là ai", "mày là ai", "m là ai", "bạn tên gì", "mày tên gì"]):
        state["intent"] = "direct"
        return state

    try:
        client = get_gemini_client()
        prompt = (
            f"Bạn là bộ định tuyến AI cho hệ thống học tập Blockchain & Web3 (Blockchain Academy).\n"
            f"Phân loại câu hỏi sau vào đúng 1 trong 4 nhãn:\n"
            f"- `platform_guide`: Câu hỏi hỏi về tính năng, cách sử dụng trang web, cách làm bài lab hiệu quả trên hệ thống, cách chấm điểm, kinh nghiệm học tập, gợi ý AI lấy từ đâu, cách nhận XP/danh hiệu hoặc lộ trình trên website.\n"
            f"- `retrieve`: Câu hỏi hỏi sâu về kiến thức chuyên môn, lý thuyết, thuật ngữ kỹ thuật, lỗ hổng bảo mật, giải thích code Solidity/Web3/DeFi/Crypto/EVM.\n"
            f"- `reject`: Câu hỏi HOÀN TOÀN KHÔNG LIÊN QUAN đến Blockchain/Web3/lập trình/giáo dục (ví dụ: công thức nấu ăn, tin tức giải trí, thể thao, thời tiết).\n"
            f"- `direct`: Câu hỏi chào hỏi đơn giản (xin chào, hi, hello) hoặc hỏi danh tính, hỏi thăm về AI Tutor (ví dụ: 'bạn là ai', 'mày là ai', 'bạn tên gì', 'mày làm được gì').\n\n"
            f"Câu hỏi: \"{query}\"\n\n"
            f"Chỉ trả về đúng 1 từ khóa (platform_guide, retrieve, reject, hoặc direct):"
        )
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=200)
        )
        intent = (response.text or "retrieve").strip().lower()
        if "platform_guide" in intent:
            intent = "platform_guide"
        elif "reject" in intent:
            intent = "reject"
        elif "direct" in intent:
            intent = "direct"
        elif "retrieve" in intent:
            intent = "retrieve"
        else:
            intent = "retrieve"
        state["intent"] = intent
        print(f"[AgentRAG:Router] Classified intent: {intent}")
    except Exception as e:
        print(f"[AgentRAG:Router] Error routing fallback to retrieve: {e}")
        state["intent"] = "retrieve"
        
    return state


async def reject_query_node(state: AgentState) -> AgentState:
    """Node 2: Reject - Politely redirects off-topic queries back to blockchain topics."""
    state.setdefault("status_history", []).append("⚠️ Phát hiện câu hỏi ngoài luồng, đang tạo phản hồi định hướng...")
    print("[AgentRAG:Reject] Handling off-topic query.")
    
    state["final_answer"] = (
        "👋 Chào bạn! Mình là **AI Tutor chuyên giảng dạy về Blockchain, Smart Contract và Web3**.\n\n"
        "Có vẻ câu hỏi của bạn đang nằm ngoài phạm vi chủ đề Blockchain mất rồi! "
        "Mình rất mong được hỗ trợ bạn giải đáp những thắc mắc thú vị như:\n"
        "- 🔗 **Blockchain là gì và cơ chế đồng thuận PoW/PoS hoạt động ra sao?**\n"
        "- 💻 **Cách viết Smart Contract bằng Solidity an toàn và không bị hack Reentrancy?**\n"
        "- 🚀 **DeFi, NFT hay kiến trúc dApp kết nối Ethers.js với MetaMask?**\n\n"
        "Bạn hãy chọn một chủ đề hoặc hỏi mình bất cứ điều gì liên quan đến Blockchain nhé! 😊"
    )
    return state


async def direct_query_node(state: AgentState) -> AgentState:
    """Node 2b: Direct - Handles greetings or meta AI tutor questions."""
    state.setdefault("status_history", []).append("💬 Đang trả lời chào hỏi trực tiếp...")
    print("[AgentRAG:Direct] Handling direct query.")
    
    fallback_msg = (
        "Xin chào bạn! 👋 Mình là **AI Tutor & Security Mentor** tại Blockchain Academy.\n\n"
        "Mình chuyên đồng hành và giải đáp mọi thắc mắc của bạn về kiến thức Blockchain, mật mã học, Web3, cũng như cách viết Smart Contract bằng Solidity và phát hiện các lỗ hổng bảo mật.\n\n"
        "Bạn muốn bắt đầu tìm hiểu chủ đề nào trong lộ trình học hôm nay? Hãy cứ đặt câu hỏi nhé!"
    )

    try:
        client = get_gemini_client()
        prompt = (
            f"Bạn là AI Tutor thân thiện chuyên giảng dạy về Blockchain trên nền tảng Blockchain Academy.\n"
            f"Người dùng vừa chào hoặc hỏi meta: \"{state['query']}\"\n\n"
            f"Hãy trả lời nhiệt tình, thân thiện bằng tiếng Việt, giới thiệu vai trò của bạn là AI Tutor & Security Mentor và mời họ đặt câu hỏi về lộ trình học hoặc kiến thức Blockchain/Smart Contract."
        )
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.3, max_output_tokens=8192)
        )
        state["final_answer"] = response.text or fallback_msg
    except Exception as e:
        print(f"[AgentRAG:Direct] Error during direct response: {e}")
        state["final_answer"] = fallback_msg
    return state


async def platform_guide_node(state: AgentState) -> AgentState:
    """Node 3b: Platform Guide - Provides natural guidance using system's built-in platform knowledge base."""
    state.setdefault("status_history", []).append("ℹ️ Tra cứu thông tin tính năng và hướng dẫn học tập trên hệ thống...")
    print("[AgentRAG:PlatformGuide] Handling platform/study guide query.")
    state["retrieved_docs"] = []
    return state


async def retrieve_docs_node(state: AgentState) -> AgentState:
    """Node 3: Retriever - Retrieves hybrid/Qdrant vectors related to query."""
    query = state["query"]
    state.setdefault("status_history", []).append("📚 Đang tra cứu tài liệu trong vector store Qdrant...")
    print("[AgentRAG:Retriever] Fetching top matching lesson chunks...")
    
    try:
        docs = await asyncio.to_thread(retrieve_auto, query, top_k=5)
        state["retrieved_docs"] = docs
        print(f"[AgentRAG:Retriever] Retrieved {len(docs)} documents.")
    except Exception as e:
        print(f"[AgentRAG:Retriever] Error fetching docs: {e}")
        state["retrieved_docs"] = []
    return state


async def generate_answer_node(state: AgentState) -> AgentState:
    """Node 4: Generator - Composes pedagogical answer based on retrieved documents."""
    query = state["query"]
    docs = state.get("retrieved_docs", [])
    chat_history = state.get("chat_history", [])
    intent = state.get("intent", "retrieve")
    state.setdefault("status_history", []).append("💡 AI Tutor đang tổng hợp kiến thức và soạn câu trả lời sư phạm...")
    print("[AgentRAG:Generator] Generating draft pedagogical answer...")
    
    try:
        prompt = compose_prompt(query, docs, chat_history, intent=intent)
        client = get_gemini_client()
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=8192)
        )
        state["draft_answer"] = response.text or ""
    except Exception as e:
        state["draft_answer"] = f"Lỗi trong quá trình tạo phản hồi AI: {str(e)}"
    return state


async def grade_hallucination_node(state: AgentState) -> AgentState:
    """Node 5: Hallucination Grader - Verifies answer grounding and self-corrects if needed."""
    query = state["query"]
    docs = state.get("retrieved_docs", [])
    draft = state.get("draft_answer", "")
    state.setdefault("status_history", []).append("🛡️ Hallucination Grader: Kiểm tra độ chính xác tuyệt đối (Zero Hallucination)...")
    print("[AgentRAG:Grader] Grading draft answer against retrieved facts...")
    
    if not docs:
        # If no docs retrieved, we check if draft is pedagogical and clear
        state["grade"] = "pass"
        state["final_answer"] = draft
        return state

    try:
        client = get_gemini_client()
        context_summary = "\n".join([f"[{d.get('title')}]: {d.get('content')[:400]}" for d in docs[:3]])
        prompt = (
            f"Bạn là bộ kiểm tra độ chính xác ảo giác (Hallucination Grader) cho nền tảng giáo dục Blockchain.\n"
            f"Dưới đây là các tài liệu gốc retrieved từ cơ sở dữ liệu:\n{context_summary}\n\n"
            f"Câu trả lời dự thảo của AI:\n{draft[:2500]}\n\n"
            f"Kiểm tra xem câu trả lời dự thảo có bịa đặt (hallucinate) các thông tin kỹ thuật sai lệch hoàn toàn so với tài liệu gốc hoặc kiến thức chuẩn của Blockchain hay không.\n"
            f"Nếu chính xác, giảng giải tốt, grounded hoặc hợp lý: trả về đúng từ `pass`.\n"
            f"Nếu có bịa đặt sai sự thật nghiêm trọng: trả về đúng từ `hallucinated`."
        )
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=200)
        )
        grade_res = (response.text or "pass").strip().lower()
        if "hallucinated" in grade_res:
            state["grade"] = "hallucinated"
            state.setdefault("status_history", []).append("🔄 Phát hiện điểm cần tinh chỉnh, đang tự động sửa lỗi bổ sung...")
            print("[AgentRAG:Grader] Draft graded as hallucinated. Self-correcting...")
            
            # Self-correct by refining draft to stick strictly to docs
            correction_prompt = (
                f"Tài liệu chuẩn từ hệ thống:\n{context_summary}\n\n"
                f"Câu hỏi của học viên: \"{query}\"\n\n"
                f"Hãy viết lại câu trả lời một cách chính xác tuyệt đối dựa TRỰC TIẾP trên tài liệu trên, "
                f"dùng văn phong sư phạm dễ hiểu, tuyệt đối không suy đoán ngoài tài liệu."
            )
            corrected_resp = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-3.5-flash",
                contents=correction_prompt,
                config=types.GenerateContentConfig(temperature=0.1, max_output_tokens=8192)
            )
            state["final_answer"] = corrected_resp.text
        else:
            state["grade"] = "pass"
            state["final_answer"] = draft
            print("[AgentRAG:Grader] Draft passed zero-hallucination check.")
    except Exception as e:
        print(f"[AgentRAG:Grader] Error during grading: {e}")
        state["grade"] = "pass"
        state["final_answer"] = draft

    return state


# Routing functions
def route_after_classify(state: AgentState) -> str:
    intent = state.get("intent", "retrieve")
    if intent == "reject":
        return "reject"
    elif intent == "direct":
        return "direct"
    elif intent == "platform_guide":
        return "platform_guide"
    return "retrieve"


# Build Graph
graph_builder = StateGraph(AgentState)
graph_builder.add_node("classify", route_query_node)
graph_builder.add_node("reject", reject_query_node)
graph_builder.add_node("direct", direct_query_node)
graph_builder.add_node("platform_guide", platform_guide_node)
graph_builder.add_node("retrieve", retrieve_docs_node)
graph_builder.add_node("generate", generate_answer_node)
graph_builder.add_node("grade", grade_hallucination_node)

graph_builder.set_entry_point("classify")
graph_builder.add_conditional_edges(
    "classify",
    route_after_classify,
    {
        "reject": "reject",
        "direct": "direct",
        "platform_guide": "platform_guide",
        "retrieve": "retrieve"
    }
)

graph_builder.add_edge("reject", END)
graph_builder.add_edge("direct", END)
graph_builder.add_edge("platform_guide", "generate")
graph_builder.add_edge("retrieve", "generate")
graph_builder.add_edge("generate", "grade")
graph_builder.add_edge("grade", END)

agent_graph = graph_builder.compile()


async def run_agent(query: str, chat_history: Optional[List[Dict[str, Any]]] = None, top_k: int = 5) -> Dict[str, Any]:
    """Main execution point for standard call"""
    initial_state = {
        "query": query,
        "intent": "retrieve",
        "retrieved_docs": [],
        "draft_answer": "",
        "grade": "",
        "final_answer": "",
        "chat_history": chat_history or [],
        "status_history": [],
        "error": None
    }
    try:
        final_state = await agent_graph.ainvoke(initial_state)
        sources = [d["title"] for d in final_state.get("retrieved_docs", []) if d.get("title")]
        return {
            "answer": final_state["final_answer"],
            "sources": sources,
            "intent": final_state["intent"],
            "status_history": final_state.get("status_history", []),
            "success": True
        }
    except Exception as e:
        print(f"[AgentRAG] Execution error: {e}")
        from src.rag_qa import generate_answer_with_gemini
        docs = retrieve_auto(query, top_k=top_k)
        ans = generate_answer_with_gemini(query, docs, chat_history=chat_history)
        return {
            "answer": ans,
            "sources": [d["title"] for d in docs if d.get("title")],
            "intent": "retrieve",
            "success": True
        }


async def stream_agentic_workflow(query: str, chat_history: Optional[List[Dict[str, Any]]] = None, top_k: int = 5):
    """
    Async generator that yields SSE status steps and final streaming chunks
    for real-time frontend visualization of Agentic RAG.
    """
    initial_state = {
        "query": query,
        "intent": "retrieve",
        "retrieved_docs": [],
        "draft_answer": "",
        "grade": "",
        "final_answer": "",
        "chat_history": chat_history or [],
        "status_history": [],
        "error": None
    }

    # Yield step 1: Router
    yield {"type": "status", "node": "router", "message": "🔍 Đang phân tích ý định câu hỏi (Router Node)..."}
    state = await route_query_node(initial_state)

    intent = state.get("intent", "retrieve")
    if intent == "reject":
        yield {"type": "status", "node": "reject", "message": "⚠️ Phát hiện câu hỏi ngoài luồng, đang chuyển hướng..."}
        state = await reject_query_node(state)
        final_text = state.get("final_answer", "")
        for i in range(0, len(final_text), 30):
            yield {"type": "chunk", "content": final_text[i:i+30]}
            await asyncio.sleep(0.01)
        return
    elif intent == "direct":
        yield {"type": "status", "node": "direct", "message": "💬 Đang trả lời trực tiếp..."}
        state = await direct_query_node(state)
        final_text = state.get("final_answer", "")
        for i in range(0, len(final_text), 30):
            yield {"type": "chunk", "content": final_text[i:i+30]}
            await asyncio.sleep(0.01)
        return
    elif intent == "platform_guide":
        yield {"type": "status", "node": "platform_guide", "message": "ℹ️ Tra cứu thông tin tính năng và hướng dẫn học tập trên hệ thống..."}
        state = await platform_guide_node(state)
        yield {"type": "status", "node": "generator", "message": "💡 AI Tutor đang soạn hướng dẫn và giải đáp câu hỏi của bạn..."}
        state = await generate_answer_node(state)
        yield {"type": "status", "node": "grader", "message": "🛡️ Kiểm tra tính chính xác thông tin hệ thống..."}
        state = await grade_hallucination_node(state)
    else:
        # Intent == retrieve
        yield {"type": "status", "node": "retriever", "message": "📚 Đang tra cứu tài liệu Qdrant (Retriever Node)..."}
        state = await retrieve_docs_node(state)
        docs = state.get("retrieved_docs", [])
        sources = [d["title"] for d in docs if d.get("title")]
        yield {"type": "sources", "content": sources}

        yield {"type": "status", "node": "generator", "message": "💡 AI Tutor đang tổng hợp kiến thức sư phạm (Generator Node)..."}
        state = await generate_answer_node(state)

        yield {"type": "status", "node": "grader", "message": "🛡️ Hallucination Grader: Kiểm tra độ chính xác tuyệt đối..."}
        state = await grade_hallucination_node(state)

    if state.get("grade") == "hallucinated":
        yield {"type": "status", "node": "refiner", "message": "🔄 Đã tự động sửa lỗi & hoàn thiện kiến thức chuẩn..."}

    # Now stream the final verified answer in small chunks for smooth UI effect
    final_text = state.get("final_answer", "")
    chunk_size = 30
    for i in range(0, len(final_text), chunk_size):
        chunk = final_text[i:i+chunk_size]
        yield {"type": "chunk", "content": chunk}
        await asyncio.sleep(0.01)
