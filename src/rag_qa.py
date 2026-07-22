import os
import sys
from dotenv import load_dotenv
load_dotenv()
import pickle
import faiss
import pandas as pd
import numpy as np
try:
    from transformers import AutoTokenizer, AutoModel
    from sentence_transformers import CrossEncoder
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print('[RAG] Transformers not available.')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_PATH = os.path.join(BASE_DIR, 'data/processed/faiss_index.bin')
META_PATH = os.path.join(BASE_DIR, 'data/processed/metadf.parquet')
BM25_PATH = os.path.join(BASE_DIR, 'data/processed/bm25_index.pkl')
CODEBERT_MODEL = 'microsoft/codebert-base'
RERANKER_MODEL = 'jinaai/jina-reranker-v2-base-multilingual'
_faiss_index_cache = None
_bm25_index_cache = None
_meta_cache = None
_tokenizer_cache = None
_model_cache = None
_reranker_cache = None

def get_device():
    return torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def load_codebert():
    global _tokenizer_cache, _model_cache
    if _tokenizer_cache is not None and _model_cache is not None:
        return (_tokenizer_cache, _model_cache)
    if not TRANSFORMERS_AVAILABLE:
        raise ImportError('Cần cài đặt transformers và torch.')
    tokenizer = AutoTokenizer.from_pretrained(CODEBERT_MODEL)
    model = AutoModel.from_pretrained(CODEBERT_MODEL)
    device = get_device()
    model = model.to(device)
    model.eval()
    _tokenizer_cache, _model_cache = (tokenizer, model)
    return (tokenizer, model)

def load_reranker():
    global _reranker_cache
    if _reranker_cache is not None:
        return _reranker_cache
    if not TRANSFORMERS_AVAILABLE:
        raise ImportError('Cần cài đặt sentence-transformers.')
    print('[RAG] Loading Reranker model...')
    reranker = CrossEncoder(RERANKER_MODEL, device=str(get_device()), max_length=512, trust_remote_code=True)
    _reranker_cache = reranker
    return reranker

def load_indices(use_cache=True):
    global _faiss_index_cache, _bm25_index_cache, _meta_cache
    if use_cache and _faiss_index_cache is not None:
        return (_faiss_index_cache, _bm25_index_cache, _meta_cache)
    if not os.path.exists(INDEX_PATH) or not os.path.exists(META_PATH) or (not os.path.exists(BM25_PATH)):
        raise FileNotFoundError('FAISS/BM25 index hoặc metadata không tồn tại. Chạy ingest_to_vectorstore.py trước.')
    faiss_idx = faiss.read_index(INDEX_PATH)
    meta = pd.read_parquet(META_PATH)
    with open(BM25_PATH, 'rb') as f:
        bm25_idx = pickle.load(f)
    if use_cache:
        _faiss_index_cache = faiss_idx
        _bm25_index_cache = bm25_idx
        _meta_cache = meta
    return (faiss_idx, bm25_idx, meta)

def encode_query(query):
    tokenizer, model = load_codebert()
    device = get_device()
    inputs = tokenizer([query], padding=True, truncation=True, max_length=512, return_tensors='pt')
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        outputs = model(**inputs)
        input_mask_expanded = inputs['attention_mask'].unsqueeze(-1).expand(outputs.last_hidden_state.size()).float()
        sum_embeddings = torch.sum(outputs.last_hidden_state * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-09)
        embedding = (sum_embeddings / sum_mask).float().cpu().numpy()
    return embedding[0]

def faiss_search(query, k=20):
    faiss_idx, _, meta = load_indices()
    q_emb = encode_query(query).astype('float32')
    D, I = faiss_idx.search(np.array([q_emb]), k)
    return [idx for idx in I[0] if 0 <= idx < len(meta)]

def bm25_search(query, k=20):
    _, bm25_idx, meta = load_indices()
    tokenized_query = query.lower().split()
    scores = bm25_idx.get_scores(tokenized_query)
    top_n = np.argsort(scores)[::-1][:k]
    return [idx for idx in top_n if scores[idx] > 0]

def rrf_merge(lists, k=60):
    rrf_scores = {}
    for lst in lists:
        for rank, item in enumerate(lst, 1):
            if item not in rrf_scores:
                rrf_scores[item] = 0.0
            rrf_scores[item] += 1.0 / (k + rank)
    sorted_items = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [item for item, score in sorted_items]

def retrieve_hybrid(query, top_k=6, fetch_k=12):
    faiss_hits = faiss_search(query, k=fetch_k)
    bm25_hits = bm25_search(query, k=fetch_k)
    merged_indices = rrf_merge([faiss_hits, bm25_hits])[:fetch_k]
    if not merged_indices:
        return []
    _, _, meta = load_indices()
    docs = []
    
    # Optional bypass of CPU reranking for performance
    disable_reranker = os.getenv("DISABLE_RERANKER", "false").lower() == "true"
    if disable_reranker:
        for idx in merged_indices[:top_k]:
            row = meta.iloc[idx]
            docs.append({
                'id': int(row.get('parent_id', idx)), 
                'title': str(row.get('title', '')), 
                'content': str(row.get('content', '')), 
                'code': str(row.get('code', '')), 
                'dangerous_apis': str(row.get('dangerous_apis', ''))
            })
        return docs

    pairs = []
    for idx in merged_indices:
        row = meta.iloc[idx]
        doc_text = f"{row.get('title', '')} {row.get('content', '')} {row.get('code', '')}"
        docs.append({'id': int(row.get('parent_id', idx)), 'title': str(row.get('title', '')), 'content': str(row.get('content', '')), 'code': str(row.get('code', '')), 'dangerous_apis': str(row.get('dangerous_apis', ''))})
        pairs.append([query, doc_text[:512]])
    reranker = load_reranker()
    scores = reranker.predict(pairs)
    for i in range(len(docs)):
        docs[i]['score'] = scores[i]
    docs = sorted(docs, key=lambda x: x['score'], reverse=True)
    return docs[:top_k]

def retrieve_qdrant(query, top_k=6):
    """Retrieve documents using Qdrant vector database with CodeBERT embedding"""
    try:
        from backend.services.vector_store import QdrantVectorStore
        import asyncio
        qdrant = QdrantVectorStore.get_instance()
        q_emb = encode_query(query).astype('float32').tolist()
        
        # Run async search synchronously or in existing loop
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If event loop running, use nested execution or thread
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    hits = pool.submit(lambda: asyncio.run(qdrant.search(q_emb, top_k=top_k))).result()
            else:
                hits = loop.run_until_complete(qdrant.search(q_emb, top_k=top_k))
        except RuntimeError:
            hits = asyncio.run(qdrant.search(q_emb, top_k=top_k))
            
        docs = []
        for hit in hits:
            docs.append({
                'id': int(hit.get('id', 0)) if str(hit.get('id', '0')).isdigit() else hit.get('id'),
                'title': str(hit.get('title', '')),
                'content': str(hit.get('content', '')),
                'code': str(hit.get('code', '')),
                'dangerous_apis': str(hit.get('dangerous_apis', ''))
            })
        return docs
    except Exception as e:
        print(f"[RAG] Qdrant retrieval fallback to hybrid: {e}")
        return retrieve_hybrid(query, top_k=top_k)

def retrieve_auto(query, top_k=6):
    """Automatically choose between Qdrant and FAISS based on VECTOR_STORE env var"""
    store_type = os.getenv("VECTOR_STORE", "qdrant").lower()
    if store_type == "qdrant":
        return retrieve_qdrant(query, top_k=top_k)
    return retrieve_hybrid(query, top_k=top_k)

def retrieve(query, k=6):
    return retrieve_auto(query, top_k=k)

def compress_context(docs):
    ctx = ''
    for i, d in enumerate(docs, 1):
        ctx += f'[DOC {i}]\n'
        ctx += f"Title: {d['title']}\n"
        if d['dangerous_apis']:
            ctx += f"Dangerous APIs: {d['dangerous_apis']}\n"
        if d['code']:
            code_lines = d['code'].split('\n')
            compressed_code = '\n'.join(code_lines[:15])
            if len(code_lines) > 15:
                compressed_code += '\n...[truncated]...'
            ctx += f'Code Snippet:\n{compressed_code}\n'
        else:
            ctx += f"Description: {d['content'][:300]}...\n"
        ctx += '---\n'
    return ctx

PLATFORM_KNOWLEDGE_BASE = """
======================================================================
KIẾN THỨC NỀN TẢNG & HƯỚNG DẪN SỬ DỤNG HỆ THỐNG BLOCKCHAIN ACADEMY
======================================================================
1. Lộ trình học (Roadmap):
   - Hệ thống cung cấp lộ trình 16 bài học & lab thực hành từ Cơ bản đến Nâng cao (từ Blockchain Basics, Solidity cơ bản, Reentrancy, Access Control, đến Flash Loan, AMM, Audit thực tế).
   - Mỗi bài học đi kèm 2 phần: Lý thuyết có Quiz trắc nghiệm nhanh (đạt từ 70% số câu là hoàn thành) & Bài Lab thực hành gõ code/chữa lỗi bảo mật trực tiếp trên trình duyệt.

2. Cách làm và hoàn thành các bài Lab thực hành hiệu quả:
   - **Bước 1 (Đọc đề & Hiểu mục tiêu)**: Ở màn hình Lab Workspace, đọc kỹ mô tả tình huống và lỗ hổng bảo mật cần khắc phục bên tab trái.
   - **Bước 2 (Xem gợi ý AI & Code ban đầu)**: Hệ thống cung cấp code mẫu (thường chứa lỗ hổng hoặc cấu trúc chưa an toàn). Nếu gặp khó khăn, bạn có thể đọc Gợi ý bảo mật từ AI Mentor (được tạo tự động từ phân tích ngữ cảnh bài học và các mẫu bảo mật tiêu chuẩn như Checks-Effects-Interactions, ReentrancyGuard, Ownable...).
   - **Bước 3 (Thử nghiệm & Tự sửa hoặc tham khảo AI Auto-Fix)**: Bạn có thể tự chỉnh sửa code trong trình soạn thảo. Nếu muốn tham khảo cách sửa chuẩn nhất, nhấn nút **"Tự động sửa lỗi bảo mật (AI Auto-Fix)"** - AI sẽ phân tích và đưa ra mã vá lỗi hoàn chỉnh để bạn đối chiếu, học hỏi.
   - **Bước 4 (Chạy kiểm tra & Nộp bài)**: Nhấn nút **"Chạy kiểm tra (Run Tests)"**. Hệ thống sẽ chạy bộ test case kiểm tra logic smart contract. Khi pass toàn bộ kiểm thử, hệ thống sẽ thông báo chúc mừng, tự động ghi nhận **+500 XP** và đánh dấu bài Lab là **ĐÃ HỌC** trên lộ trình.

3. Điểm tích lũy (XP) & Danh hiệu Kiểm toán viên (Auditor Rank):
   - Hoàn thành mỗi bài lý thuyết (Quiz): +500 XP.
   - Hoàn thành mỗi bài Lab thực hành: +500 XP.
   - Các mức danh hiệu theo tỷ lệ hoàn thành lộ trình:
     + Học viên Tập sự (Novice): < 26%
     + Chuyên viên Smart Contract: 26% - 50%
     + Senior Auditor Cao cấp: 51% - 80%
     + Huyền thoại Security Lead: >= 81% (được cấp Chứng nhận hoàn thành khóa học).
"""

def compose_prompt(query, docs, chat_history=None, intent="retrieve"):
    compressed_ctx = compress_context(docs)
    history_str = ""
    if chat_history:
        history_str = "\n======================================================================\nBỐI CẢNH CUỘC TRÒ CHUYỆN TRƯỚC ĐÓ (LỊCH SỬ CHAT)\n======================================================================\n"
        for msg in chat_history[-8:]:
            role_label = "Học viên (User)" if msg.get("role") == "user" else "Bạn (Mentor)"
            content = msg.get("content", "")
            history_str += f"[{role_label}]: {content}\n"
        history_str += "\n*Lưu ý: Hãy tham chiếu lịch sử trò chuyện trên nếu học viên hỏi tiếp hoặc dùng từ thay thế (như 'nó', 'lỗi này', 'ở trên', ...).*\n"

    prompt = f"""
ROLE:
You are a friendly, patient, and expert AI Tutor and Mentor at Blockchain Academy.
Your primary goal is to guide beginners to understand blockchain, smart contracts, Web3, and security concepts AND guide them on how to study and complete labs effectively on the Blockchain Academy website.
{history_str}
{PLATFORM_KNOWLEDGE_BASE}
======================================================================
TECHNICAL REFERENCE CONTEXT FROM VECTOR KNOWLEDGE BASE (ZERO HALLUCINATION BASE)
======================================================================

{compressed_ctx}

======================================================================
STUDENT'S QUESTION
======================================================================

{query}

======================================================================
TEACHING GUIDELINES & NATURAL RESPONSE STRUCTURE (STRICTLY ENFORCED)
======================================================================

1. NATURAL & ADAPTIVE FORMATTING (TỰ NHIÊN, LINH HOẠT, ĐÚNG TRỌNG TÂM):
   - **KHÔNG BỊ GỢI Ý HOẶC ÉP BUỘC THEO MỘT KHUÔN MẪU CỨNG NHẮC NÀO**: Tuyệt đối không tự ý rập khuôn chia thành các tiêu đề định dạng cố định hay chèn thêm phần câu hỏi gợi mở thừa thãi khi không cần thiết.
   - Hãy linh hoạt điều chỉnh cách trình bày và văn phong chính xác theo đúng câu hỏi của học viên:
     + **Nếu học viên hỏi về cách làm lab, cách sử dụng trang web, phương pháp học tập hay tính năng hệ thống** (`platform_guide` / general advice): Trả lời trực tiếp, rõ ràng, chia các bước thực tế hoặc gạch đầu dòng ngắn gọn dựa chính xác vào KIẾN THỨC NỀN TẢNG HỆ THỐNG ở trên. KHÔNG chèn các định nghĩa lý thuyết hay câu hỏi gợi mở thừa thãi.
     + **Nếu học viên hỏi chuyên sâu về một kỹ thuật, thuật ngữ hay lỗ hổng bảo mật** (`retrieve` / technical): Trình bày mạch lạc theo logic sư phạm dễ hiểu (dùng ẩn dụ thực tế, giải thích cơ chế, đoạn code ví dụ nếu cần, và lưu ý bảo mật).
   - Luôn trả lời bằng tiếng Việt tự nhiên, ấm áp, khuyến khích và ĐÚNG NHỮNG GÌ ĐƯỢC HỎI.

2. ZERO HALLUCINATION & GROUNDING:
   - Với các câu hỏi chuyên môn, dựa chính xác vào TECHNICAL REFERENCE CONTEXT. Nếu context không đủ chi tiết, sử dụng kiến thức chuẩn xác về lập trình Blockchain/Solidity/Web3 mà không bịa đặt thông tin sai lệch.
   - Với các câu hỏi về trang web/bài lab/lộ trình, dựa chính xác vào PLATFORM KNOWLEDGE BASE.
"""
    return prompt

def generate_fallback_answer(query, docs):
    if not docs:
        return """
 **Hệ thống AI hiện đang Out of Quota.**
Chúng tôi không tìm thấy tài liệu liên quan trực tiếp nào trong cơ sở dữ liệu để trả lời câu hỏi này. Vui lòng thiết lập API Key hợp lệ hoặc thử lại sau.
"""
    
    response = """
 **Hệ thống AI hiện đang Out of Quota.**
Tuy nhiên, dựa trên tài liệu bảo mật truy xuất từ cơ sở dữ liệu tri thức của chúng tôi, dưới đây là thông tin tham khảo:

"""
    for i, doc in enumerate(docs, 1):
        title = doc.get('title', '').strip() or "Tài liệu liên quan"
        response += f"### {i}. {title}\n"
        if doc.get('content'):
            response += f"**Mô tả:** {doc['content'].strip()}\n\n"
        if doc.get('dangerous_apis') and doc['dangerous_apis'] != 'nan':
            response += f"**API nguy hiểm phát hiện:** `{doc['dangerous_apis']}`\n\n"
        if doc.get('code') and doc['code'] != 'nan':
            response += f"**Đoạn mã ví dụ / Lỗ hổng:**\n```solidity\n{doc['code'].strip()}\n```\n\n"
        response += "---\n\n"
    
    response += "\n*Vui lòng cập nhật `GEMINI_API_KEY` trong file `.env` để khôi phục đầy đủ trải nghiệm trò chuyện với AI.*"
    return response

def generate_answer_with_gemini(query, docs, api_key=None, model='gemini-3.5-flash', chat_history=None):
    import time
    try:
        from google import genai
    except ImportError:
        raise ImportError('google-genai package chưa được cài đặt.')
    if not api_key:
        api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return '⚠️ Không tìm thấy API Key. Vui lòng thiết lập GEMINI_API_KEY trong .env.'
    client = genai.Client(api_key=api_key)
    prompt = compose_prompt(query, docs, chat_history=chat_history)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=8192,
                    safety_settings=[
                        {'category': 'HARM_CATEGORY_HATE_SPEECH', 'threshold': 'BLOCK_NONE'},
                        {'category': 'HARM_CATEGORY_HARASSMENT', 'threshold': 'BLOCK_NONE'},
                        {'category': 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold': 'BLOCK_NONE'},
                        {'category': 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold': 'BLOCK_NONE'}
                    ]
                )
            )
            return response.text
        except Exception as e:
            err_str = str(e)
            is_quota_error = "429" in err_str or "quota" in err_str.lower() or "limit" in err_str.lower()
            
            if is_quota_error and attempt < max_retries - 1:
                sleep_time = (2 ** attempt) + 1
                time.sleep(sleep_time)
                continue
            
            if is_quota_error:
                return generate_fallback_answer(query, docs)
            
            return f'❌ Lỗi Gemini API: {err_str}'
            
    return generate_fallback_answer(query, docs)

def generate_chat_title_with_gemini(query, api_key=None, model='gemini-3.5-flash'):
    try:
        from google import genai
    except ImportError:
        return "Cuộc trò chuyện"
    if not api_key:
        api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return "Cuộc trò chuyện"
    
    client = genai.Client(api_key=api_key)
    prompt = f"""
Hãy tạo một tiêu đề siêu ngắn gọn, khái quát (tối đa 5 từ) bằng tiếng Việt cho cuộc trò chuyện bắt đầu bằng câu hỏi sau của người dùng.
Tiêu đề phải trực tiếp đi vào chủ đề chính (ví dụ: "Tìm hiểu Reentrancy", "Lỗi tràn số Solidity", "Tấn công Flash Loan", v.v.).
Không dùng dấu ngoặc kép, không thêm chữ "Tiêu đề: ", chỉ trả về đúng tiêu đề ngắn gọn đó.

Câu hỏi: {query}
"""
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=100
            )
        )
        title = response.text.strip().replace('"', '').replace("'", "")
        # Remove common preambles from model output
        prefixes = ["Tiêu đề:", "Tiêu đề cuộc trò chuyện:", "Tiêu đề là:", "Tiêu đề gợi ý:", "Trò chuyện:"]
        for prefix in prefixes:
            if title.lower().startswith(prefix.lower()):
                title = title[len(prefix):].strip()
        
        words = title.split()
        if len(words) > 6:
            title = " ".join(words[:6]) + "..."
        return title
    except Exception:
        words = query.strip().split()
        fallback_title = " ".join(words[:4])
        if len(words) > 4:
            fallback_title += "..."
        return fallback_title


def generate_answer_streaming(query, docs, api_key=None, model='gemini-3.5-flash', chat_history=None):
    """Generator function that yields chunks of text from Gemini stream API"""
    try:
        from google import genai
    except ImportError:
        yield "Lỗi: google-genai package chưa được cài đặt."
        return

    if not api_key:
        api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        yield "⚠️ Không tìm thấy API Key. Vui lòng thiết lập GEMINI_API_KEY trong .env."
        return

    client = genai.Client(api_key=api_key)
    prompt = compose_prompt(query, docs, chat_history=chat_history)

    try:
        response_stream = client.models.generate_content_stream(
            model=model,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=8192,
                safety_settings=[
                    {'category': 'HARM_CATEGORY_HATE_SPEECH', 'threshold': 'BLOCK_NONE'},
                    {'category': 'HARM_CATEGORY_HARASSMENT', 'threshold': 'BLOCK_NONE'},
                    {'category': 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold': 'BLOCK_NONE'},
                    {'category': 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold': 'BLOCK_NONE'}
                ]
            )
        )
        for chunk in response_stream:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"❌ Lỗi streaming từ Gemini: {str(e)}"
