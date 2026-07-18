"""
Contract Audit API Endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from backend.models.schemas import ContractAuditRequest, ContractAnalyzeRequest
from backend.services.blockchain_service import BlockchainExplorerService
from backend.services.rag_service import RAGService
from backend.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/contract", tags=["contract"])
blockchain_service = BlockchainExplorerService()


@router.post("/audit")
async def audit_contract_by_address(
    request: ContractAuditRequest,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Fetch contract code from Etherscan/BscScan and audit via RAG AI"""
    try:
        data = await blockchain_service.get_contract_source(request.address, request.chain)
        source_code = data["source_code"]
        contract_name = data["contract_name"]

        prompt = (
            f"Hãy phân tích bảo mật và audit chi tiết cho smart contract `{contract_name}` (địa chỉ `{request.address}` "
            f"trên mạng `{request.chain}`).\n\n"
            f"Mã nguồn hợp đồng:\n```solidity\n{source_code[:6000]}\n```\n\n"
            f"Vui lòng chỉ ra các lỗ hổng (nếu có), mức độ nghiêm trọng (Critical/High/Medium/Low), và hướng dẫn khắc phục chi tiết."
        )

        rag_result = await RAGService.get_answer(prompt, top_k=5)

        return {
            "address": request.address,
            "chain": request.chain,
            "contract_name": contract_name,
            "is_cached": data.get("is_cached", False),
            "audit_result": rag_result["answer"],
            "sources": rag_result.get("sources", []),
            "success": rag_result.get("success", True)
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_raw_code(
    request: ContractAnalyzeRequest,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Directly audit and analyze raw Solidity/Vyper code provided by user"""
    try:
        prompt = (
            f"Hãy phân tích bảo mật chi tiết cho đoạn mã `{request.language}` dưới đây. "
            f"Tìm ra các lỗi tiềm ẩn, phân tích cách attacker có thể trục lợi và đề xuất code sửa lỗi tốt nhất:\n\n"
            f"```{request.language}\n{request.code[:8000]}\n```"
        )

        rag_result = await RAGService.get_answer(prompt, top_k=5)

        return {
            "language": request.language,
            "audit_result": rag_result["answer"],
            "sources": rag_result.get("sources", []),
            "success": rag_result.get("success", True)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{address}")
async def get_cached_audit_info(
    address: str,
    chain: str = "ethereum",
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Check if a contract is cached and return source info"""
    try:
        data = await blockchain_service.get_contract_source(address, chain)
        return {
            "address": address,
            "chain": chain,
            "contract_name": data["contract_name"],
            "has_source": bool(data.get("source_code")),
            "is_cached": data.get("is_cached", False)
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
