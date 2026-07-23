"""
API Router for Rigorous Lab Verification & Cost-Effective AI Code Grader / Mentor
"""
import json
import asyncio
import ast
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.models.database import get_database
from backend.middleware.auth_middleware import get_current_user
from src.agent_rag import get_gemini_client
from google.genai import types
from backend.services.test_runner import run_lab_tests, run_python_lab_tests, run_solidity_lab_tests
from backend.services.gamification_service import GamificationService

router = APIRouter(prefix="/api/lab", tags=["lab"])


class GradeLabRequest(BaseModel):
    lesson_id: str
    code: str
    language: str = "solidity"
    lab_title: str = ""
    lab_description: str = ""
    starter_code: str = ""


class AIMentorRequest(BaseModel):
    lesson_id: str
    code: str
    language: str = "solidity"
    lab_title: str = ""
    lab_description: str = ""
    error_traceback: str = ""


@router.post("/grade")
async def grade_lab_submission(
    req: GradeLabRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """
    Rigorously grade a lab submission using dynamic Unit Tests (Sandbox) for Python,
    or fast structural/AI checks for Solidity. Avoids calling AI on every run to save costs.
    """
    clean_code = (req.code or "").strip()
    clean_starter = (req.starter_code or "").strip()

    if not clean_code or len(clean_code) < 15:
        return {
            "passed": False,
            "score": 0,
            "security_review": "[FAIL] Bạn chưa nhập đủ mã nguồn hợp lệ để kiểm tra.",
            "logs": [
                {"msg": "[Sanity Check] Mã nguồn quá ngắn hoặc trống.", "type": "error"}
            ],
            "traceback": "SyntaxError: Mã nguồn quá ngắn hoặc trống."
        }

    if clean_code.replace(" ", "").replace("\n", "") == clean_starter.replace(" ", "").replace("\n", "") and len(clean_starter) > 20:
        return {
            "passed": False,
            "score": 10,
            "security_review": "[FAIL] Bạn chưa chỉnh sửa mã nguồn ban đầu (Starter Code). Hãy tìm lỗ hổng và áp dụng cách vá lỗi nhé!",
            "logs": [
                {"msg": "[Sanity Check] Phát hiện mã nguồn chưa thay đổi so với starter code.", "type": "error"}
            ],
            "traceback": "Error: Mã nguồn chưa được thay đổi so với Starter Code ban đầu."
        }

    # 2. Universal Dynamic Test Runner execution (Python Unit Tests & Solidity Structural Sandbox)
    # Cost: $0, Time: < 0.1s. Avoids calling AI on every run across all current and future labs!
    test_result = await asyncio.to_thread(
        run_lab_tests,
        req.lesson_id,
        req.language,
        clean_code,
        clean_starter
    )
    if test_result.get("passed"):
        auth_user_id = str(current_user["_id"])
        gamification_res = await GamificationService.update_user_gamification(
            db=db,
            user_id=auth_user_id,
            xp_gain=1000,
            completed_lessons_count=0,
            is_lab_pass=True
        )
        test_result["gamification"] = gamification_res
    return test_result


@router.post("/ai_mentor")
async def get_ai_mentor_explanation(
    req: AIMentorRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """
    On-demand AI Mentor explanation for failed unit tests/traceback.
    Only called when the student explicitly clicks 'AI Mentor / Phân tích lỗi' after a test failure.
    """
    try:
        client = get_gemini_client()
        prompt = f"""Bạn là Giảng viên AI Trợ giảng Lập trình Blockchain & Smart Contract (AI Senior Mentor) tại Blockchain Academy.
Học viên vừa nộp bài thực hành và chạy bị lỗi Unit Test (hoặc lỗi cú pháp/logic).
Nhiệm vụ của bạn là đọc kỹ đoạn mã nguồn và log lỗi (Traceback) dưới đây, sau đó GIẢI THÍCH CHÍNH XÁC NGUYÊN NHÂN LỖI BẰNG TIẾNG VIỆT SƯ PHẠM, DỄ HIỂU, và GỢI Ý HƯỚNG SỬA ĐỔI (KHÔNG đưa trực tiếp toàn bộ code lời giải hoàn chỉnh để học viên tự rèn luyện).

THÔNG TIN BÀI LAB:
- ID: {req.lesson_id} ({req.lab_title})
- Ngôn ngữ: {req.language}
- Yêu cầu bài lab: {req.lab_description}

MÃ NGUỒN CỦA HỌC VIÊN:
```{req.language}
{req.code}
```

LOG LỖI / TRACEBACK TỪ HỆ THỐNG KIỂM THỬ:
```
{req.error_traceback}
```

HÃY TRẢ VỀ ĐÚNG 1 ĐỐI TƯỢNG JSON VỚI CẤU TRÚC SAU (KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC):
{{
  "explanation": "Lời giải thích bằng tiếng Việt về nguyên nhân gây lỗi dựa trên Traceback và dòng code liên quan",
  "hint": "Gợi ý cụ thể bước tiếp theo hoặc cú pháp cần chỉnh sửa để học viên tự sửa lỗi",
  "suggested_snippet": "Một đoạn code ngắn (5-10 dòng) minh họa cách viết cú pháp/hàm chuẩn mà không giải hết toàn bộ bài lab"
}}"""

        models_to_try = ["gemini-3.1-flash-lite-preview", "gemini-2.5-flash", "gemini-flash-latest"]
        response = None
        for target_model in models_to_try:
            try:
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=target_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        max_output_tokens=1024,
                        response_mime_type="application/json"
                    )
                )
                if response and response.text:
                    break
            except Exception as api_err:
                err_str = str(api_err)
                if any(k in err_str for k in ["503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "NOT_FOUND"]):
                    continue
                raise api_err

        raw_text = (response.text if response else "").strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        result_data = json.loads(raw_text)
        return {
            "success": True,
            "explanation": result_data.get("explanation", "Đã phân tích xong nguyên nhân lỗi."),
            "hint": result_data.get("hint", "Hãy kiểm tra lại logic và thử lại."),
            "suggested_snippet": result_data.get("suggested_snippet", "")
        }
    except Exception as e:
        print(f"[AI Mentor] Error: {e}")
        return {
            "success": False,
            "explanation": f"Lỗi tạm thời khi kết nối AI Mentor: {str(e)}",
            "hint": "Vui lòng kiểm tra kỹ lại Traceback phía trên để tự tìm dòng lỗi.",
            "suggested_snippet": ""
        }
