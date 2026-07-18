"""
LangGraph Agentic RAG (Multi-Step Reasoning & Vulnerability Fix Generator)
"""
import os
import asyncio
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from google import genai
from google.genai import types

from src.rag_qa import retrieve, compose_prompt


class AgentState(TypedDict):
    query: str
    intent: str
    retrieved_docs: List[Dict[str, Any]]
    analysis: str
    fix_code: str
    final_answer: str
    chat_history: List[Dict[str, Any]]
    error: Optional[str]


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your-gemini-api-key-here":
        raise ValueError("Chưa cấu hình GEMINI_API_KEY trong .env")
    return genai.Client(api_key=api_key)


async def classify_intent_node(state: AgentState) -> AgentState:
    """Classify user query into actionable categories"""
    query = state["query"]
    print(f"[AgentRAG] Classifying intent for: {query[:60]}...")
    try:
        client = get_gemini_client()
        prompt = (
            f"Phân loại câu hỏi sau về bảo mật blockchain/smart contract vào đúng 1 trong 4 nhãn:\n"
            f"- `vulnerability_analysis`: hỏi về lỗi, phân tích lỗ hổng trong contract, kiểm tra an toàn\n"
            f"- `code_fix`: yêu cầu viết code sửa lỗi, patch, refactor\n"
            f"- `learning`: hỏi định nghĩa, lý thuyết, roadmap học tập, khái niệm\n"
            f"- `general`: chào hỏi hoặc câu hỏi chung khác\n\n"
            f"Câu hỏi: \"{query}\"\n\nChỉ trả về đúng 1 từ khóa nhãn (vulnerability_analysis, code_fix, learning, hoặc general):"
        )
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1, max_output_tokens=20)
        )
        intent = response.text.strip().lower()
        if intent not in ["vulnerability_analysis", "code_fix", "learning", "general"]:
            intent = "vulnerability_analysis"
        state["intent"] = intent
        print(f"[AgentRAG] Classified intent: {intent}")
    except Exception as e:
        print(f"[AgentRAG] Intent classification fallback: {e}")
        state["intent"] = "vulnerability_analysis"
    return state


async def retrieve_context_node(state: AgentState) -> AgentState:
    """Retrieve relevant documents using Hybrid/Qdrant search"""
    query = state["query"]
    print("[AgentRAG] Retrieving context from vector store...")
    try:
        docs = await asyncio.to_thread(retrieve, query, top_k=6)
        state["retrieved_docs"] = docs
    except Exception as e:
        print(f"[AgentRAG] Retrieval error: {e}")
        state["retrieved_docs"] = []
    return state


async def analyze_vulnerability_node(state: AgentState) -> AgentState:
    """Deep analysis of vulnerability if query involves code or security audit"""
    query = state["query"]
    docs = state["retrieved_docs"]
    print("[AgentRAG] Performing deep vulnerability analysis...")
    try:
        client = get_gemini_client()
        context_str = "\n".join([f"- {d.get('title')}: {d.get('content')}" for d in docs[:3]])
        prompt = (
            f"Hãy đóng vai chuyên gia kiểm định bảo mật smart contract cao cấp.\n"
            f"Dựa vào thông tin tham khảo từ cơ sở dữ liệu lỗi:\n{context_str}\n\n"
            f"Hãy phân tích câu hỏi/vấn đề sau:\n\"{query}\"\n\n"
            f"Chỉ rõ vector tấn công (Attack Vector), nguyên nhân gốc rễ (Root Cause), và mức độ nghiêm trọng."
        )
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=2000)
        )
        state["analysis"] = response.text
    except Exception as e:
        state["analysis"] = f"Phân tích nhanh: Cần cẩn trọng kiểm tra logic truy cập và reentrancy. ({e})"
    return state


async def generate_fix_node(state: AgentState) -> AgentState:
    """Generate fixed Solidity code when patch is requested"""
    query = state["query"]
    analysis = state.get("analysis", "")
    print("[AgentRAG] Generating secure code fix...")
    try:
        client = get_gemini_client()
        prompt = (
            f"Dựa vào phân tích lỗ hổng sau:\n{analysis}\n\n"
            f"Và yêu cầu của người dùng:\n\"{query}\"\n\n"
            f"Hãy viết đoạn code Solidity sửa lỗi hoàn chỉnh, tuân thủ Best Practices (như Checks-Effects-Interactions, OpenZeppelin guards)."
        )
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=2000)
        )
        state["fix_code"] = response.text
    except Exception as e:
        state["fix_code"] = f"```solidity\n// Vui lòng áp dụng ReentrancyGuard và kiểm tra điều kiện require.\n```"
    return state


async def synthesize_answer_node(state: AgentState) -> AgentState:
    """Synthesize final teaching-style response adhering to mentor persona"""
    query = state["query"]
    docs = state["retrieved_docs"]
    intent = state["intent"]
    analysis = state.get("analysis", "")
    fix_code = state.get("fix_code", "")
    chat_history = state.get("chat_history", [])

    print("[AgentRAG] Synthesizing final response...")
    try:
        # Use existing compose_prompt for pedagogical structuring
        base_prompt = compose_prompt(query, docs, chat_history)
        
        if intent == "code_fix" and fix_code:
            base_prompt += f"\n\n[BỔ SUNG TỪ AGENT RAG - CODE SỬA LỖI ĐỀ XUẤT]:\n{fix_code}"
        elif intent == "vulnerability_analysis" and analysis:
            base_prompt += f"\n\n[BỔ SUNG TỪ AGENT RAG - PHÂN TÍCH CHUYÊN SÂU]:\n{analysis}"

        client = get_gemini_client()
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=base_prompt,
            config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=8192)
        )
        state["final_answer"] = response.text
    except Exception as e:
        state["final_answer"] = f"Lỗi tổng hợp câu trả lời từ AI Agent: {e}"
    return state


def decide_next_step(state: AgentState) -> str:
    """Conditional routing based on intent"""
    intent = state.get("intent", "general")
    if intent == "code_fix":
        return "analyze_then_fix"
    elif intent == "vulnerability_analysis":
        return "analyze_only"
    else:
        return "synthesize_directly"


# Build Graph
graph_builder = StateGraph(AgentState)
graph_builder.add_node("classify", classify_intent_node)
graph_builder.add_node("retrieve", retrieve_context_node)
graph_builder.add_node("analyze", analyze_vulnerability_node)
graph_builder.add_node("fix", generate_fix_node)
graph_builder.add_node("synthesize", synthesize_answer_node)

graph_builder.set_entry_point("classify")
graph_builder.add_edge("classify", "retrieve")

graph_builder.add_conditional_edges(
    "retrieve",
    decide_next_step,
    {
        "analyze_then_fix": "analyze",
        "analyze_only": "analyze",
        "synthesize_directly": "synthesize"
    }
)

graph_builder.add_edge("analyze", "fix") # If analyze_then_fix, it will go analyze -> fix -> synthesize. For analyze_only, we can route directly or let fix be quick skip. Let's make explicit conditional from analyze:
def after_analyze_routing(state: AgentState) -> str:
    if state.get("intent") == "code_fix":
        return "fix"
    return "synthesize"

# Replace unconditional edge with conditional
graph_builder.add_conditional_edges("analyze", after_analyze_routing, {"fix": "fix", "synthesize": "synthesize"})
graph_builder.add_edge("fix", "synthesize")
graph_builder.add_edge("synthesize", END)

agent_graph = graph_builder.compile()


async def run_agent(query: str, chat_history: Optional[List[Dict[str, Any]]] = None, top_k: int = 6) -> Dict[str, Any]:
    """Main entry point to execute Agentic RAG workflow"""
    initial_state = {
        "query": query,
        "intent": "general",
        "retrieved_docs": [],
        "analysis": "",
        "fix_code": "",
        "final_answer": "",
        "chat_history": chat_history or [],
        "error": None
    }
    try:
        final_state = await agent_graph.ainvoke(initial_state)
        sources = []
        for doc in final_state.get("retrieved_docs", []):
            if doc.get("title") and doc["title"] not in sources:
                sources.append(doc["title"])
        return {
            "answer": final_state["final_answer"],
            "sources": sources,
            "intent": final_state["intent"],
            "success": True
        }
    except Exception as e:
        print(f"[AgentRAG] Workflow Execution Error: {e}")
        # Fallback to standard sync retrieval if agent workflow errors
        from src.rag_qa import generate_answer_with_gemini
        docs = retrieve(query, top_k=top_k)
        ans = generate_answer_with_gemini(query, docs, chat_history=chat_history)
        return ans
