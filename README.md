# 🛡️ GenAI Blockchain Security Mentor & Smart Contract Auditor

Dự án ứng dụng Generative AI tiên tiến kết hợp hệ thống Hybrid RAG (Retrieval-Augmented Generation) để tạo ra một **Blockchain Security Mentor** thông minh, hỗ trợ người dùng tìm hiểu lỗ hổng bảo mật, giải đáp kiến thức và kiểm thử tự động (audit) Smart Contract trên các mạng Blockchain như Ethereum và BNB Chain.

---

## 🚀 Tính năng nổi bật

### 1. 🤖 AI Security Mentor (Cố vấn bảo mật chuyên sâu)
- **Phương pháp sư phạm trực quan:** Mentor AI không chỉ liệt kê lỗ hổng một cách khô khan mà giải thích qua các câu chuyện và phép ẩn dụ thực tế sinh động (ví dụ: ví Reentrancy giống như việc liên tục rút tiền trước khi thủ quỹ cập nhật số dư).
- **Cấu trúc phản hồi chuẩn hóa:** Mỗi câu trả lời luôn bao gồm 5 phần chính:
  1. `# Khái niệm` - Định nghĩa đơn giản & ví dụ thực tế.
  2. `# Xem xét vấn đề` - So sánh logic mong muốn (Intended) vs. logic thực tế (Actual).
  3. `# Cách mà Hacker sẽ trục lợi` - Kịch bản tấn công chi tiết từng bước (Bước 1, Bước 2, Bước 3).
  4. `# Bài học rút ra` - Giải pháp an toàn kèm so sánh trực quan `❌ Before` vs. `✅ After`.
  5. `# Câu hỏi gợi mở` - Câu hỏi tương tác giúp học viên tự kiểm tra kiến thức.
- **Tốc độ phản hồi vượt trội:** Hỗ trợ phát trực tiếp câu trả lời (Server-Sent Events - SSE Streaming) tạo hiệu ứng gõ chữ thời gian thực.
- **Duy trì ngữ cảnh:** Khả năng ghi nhớ và hiểu sâu lịch sử hội thoại trước đó để phản hồi các câu hỏi tiếp nối.

### 2. 🔍 Pipeline Hybrid RAG thế hệ mới
Hệ thống sử dụng cơ chế truy xuất phức hợp kết hợp sức mạnh của ngữ nghĩa và từ khóa:
- **Semantic Search (Tìm kiếm ngữ nghĩa):** Sử dụng model nhúng chuyên dụng cho mã nguồn `microsoft/codebert-base` cùng cơ sở dữ liệu Vector (FAISS hoặc Qdrant).
- **Lexical Search (Tìm kiếm từ khóa):** Sử dụng thuật toán BM25 để bắt chính xác các tên hàm, API đặc thù trong Smart Contract.
- **Gộp kết quả:** Áp dụng thuật toán **Reciprocal Rank Fusion (RRF)** tối ưu hóa thứ hạng tài liệu từ cả hai nhánh tìm kiếm.
- **Reranking:** Sử dụng Cross-Encoder siêu mạnh `jinaai/jina-reranker-v2-base-multilingual` để xếp hạng lại tài liệu chính xác nhất với câu hỏi.
- **Chế độ Dự phòng (Graceful Degradation):** Khi vượt quá hạn ngạch (Out of Quota) của Gemini API, hệ thống tự động trích xuất các tài liệu thô trong cơ sở dữ liệu tri thức hiển thị cho người dùng, đảm bảo trải nghiệm không bị gián đoạn.

```mermaid
graph TD
    UserQuery[User Question / Smart Contract Code] --> FAISS[FAISS Semantic Search <br/> CodeBERT Embeddings]
    UserQuery --> BM25[BM25 Lexical Search <br/> Tokenized Text Matching]
    FAISS --> RRF[Reciprocal Rank Fusion RRF]
    BM25 --> RRF
    RRF --> Jina[Jina AI Reranker v2 <br/> Multilingual Reranking]
    Jina --> Gemini[Gemini 2.5 API <br/> Mentor Prompt Template]
    Gemini --> FinalAnswer[Interactive Pedagogical Response]
```

### 3. 🔍 Smart Contract Security Auditing (Audit Hợp đồng Thông minh)
- **Tích hợp Explorer API:** Tự động tải mã nguồn Solidity trực tiếp từ địa chỉ ví trên **Etherscan** hoặc **BscScan**.
- **Phân tích mã trực tiếp:** Cho phép người dùng dán trực tiếp mã nguồn Solidity/Vyper lên giao diện để phân tích tức thời.
- **Phân loại mức độ nghiêm trọng:** Đánh giá lỗ hổng theo các mức từ `Critical`, `High`, `Medium` đến `Low`.

### 4. 🗺️ Interactive Roadmap (Lộ trình học tập tương tác)
- Bản đồ học tập trực quan giúp xây dựng nền tảng từ cơ bản đến nâng cao về bảo mật blockchain.
- Hệ thống trắc nghiệm nhanh (Quiz) tích hợp trong mỗi bài học để củng cố kiến thức.
- Lưu trữ tiến độ học tập đồng bộ thời gian thực theo tài khoản cá nhân.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

### Backend
- **Core Framework:** FastAPI (Python 3.10+) - Tốc độ cao, hỗ trợ Asynchronous.
- **Database:** MongoDB (Atlas/Local) kết hợp cơ chế dự phòng cơ sở dữ liệu JSON cục bộ.
- **RAG & Vector DB:** Qdrant (Cloud/Docker) / FAISS, BM25, CodeBERT Embeddings, Jina Reranker.
- **AI SDK:** `google-genai` (sử dụng các mô hình `gemini-2.5-pro` & `gemini-2.5-flash`).
- **Auth:** JWT (JSON Web Tokens) bảo mật thông tin và theo dõi tiến độ người dùng.

### Frontend
- **Framework:** React.js (Vite) + JavaScript.
- **Styling:** Custom CSS Dark Cyberpunk độc bản kết hợp UI/UX hiện đại, mượt mà.
- **Components:** Tích hợp giao diện Chatbot, Trình đọc/Soạn thảo mã nguồn, Lộ trình dạng cây (interactive nodes).

---

## 📂 Cấu trúc dự án

```text
genai-blockchain-security/
├── backend/                       # Máy chủ FastAPI (Python)
│   ├── api/                       # API Endpoints (Chat, Auth, Contract, Roadmap, Streaming)
│   ├── models/                    # Pydantic v2 Schemas & Database Manager
│   ├── services/                  # RAG & Blockchain explorer integration services
│   └── main.py                    # File khởi chạy server chính
├── frontend/                      # Client React Vite (Javascript)
│   ├── src/
│   │   ├── components/            # UI Components (ChatWindow, Sidebar, Roadmap)
│   │   ├── App.jsx                # Layout và điều phối route chính
│   │   └── index.css              # Custom Dark Cyberpunk Styling
│   └── package.json
├── data/
│   ├── raw/                       # File dữ liệu lỗ hổng JSON gốc
│   ├── processed/                 # Index FAISS/Parquet/BM25 đã build
│   └── local_db/                  # Database dự phòng JSON local
├── src/                           # RAG Core Engines
│   ├── data_preprocessing.py      # Tiền xử lý tập dữ liệu bảo mật
│   ├── ingest_to_vectorstore.py   # Vector hóa dữ liệu đưa vào store
│   └── rag_qa.py                  # Logic RAG, RRF, Reranker và Prompt Gemini
├── .env.example                   # Biến môi trường mẫu
├── requirements.txt               # Các thư viện backend cần thiết
└── docker-compose.yml             # Cấu hình container hóa dự án
```

---

## ⚙️ Cấu hình biến môi trường

Sao chép file `.env.example` thành `.env` ở thư mục gốc và điền các thông số:

```env
# Gemini API Key (Bắt buộc)
GEMINI_API_KEY=your_gemini_api_key_here

# Chọn Vector Store: "qdrant" hoặc "faiss" (Mặc định: qdrant)
VECTOR_STORE=qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_API_KEY=your_qdrant_api_key

# Explorer API Keys (Dành cho việc lấy mã nguồn contract)
ETHERSCAN_API_KEY=your_etherscan_key
BSCSCAN_API_KEY=your_bscscan_key

# MongoDB Atlas / Local
MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/
MONGO_DB=genai_blockchain

# Cấu hình server chạy
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
ENV=development
```

---

## 🏃 Khởi chạy dự án

### Cách 1: Chạy trực tiếp (Local Development)

#### 1. Chạy Backend (FastAPI):
```bash
# Tạo môi trường ảo
python -m venv .venv

# Kích hoạt môi trường ảo
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (CMD):
.venv\Scripts\activate.bat
# Linux/Mac:
source .venv/bin/activate

# Cài đặt thư viện
pip install -r requirements.txt

# Khởi chạy backend
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
API Docs có thể truy cập tại: `http://localhost:8000/docs`

#### 2. Chạy Frontend (React Vite):
```bash
cd frontend
npm install
npm run dev
```
Giao diện ứng dụng chạy tại: `http://localhost:5173`

---

### Cách 2: Khởi chạy nhanh bằng Docker Compose

Yêu cầu máy tính đã cài đặt và bật Docker Desktop.

```bash
docker-compose up --build -d
```

Hệ thống sẽ chạy ngầm các container bao gồm:
1. `genai-blockchain-mongo`: Cơ sở dữ liệu MongoDB.
2. `genai-blockchain-backend`: API Server FastAPI.
3. `genai-blockchain-frontend`: Client React.

---

## 📜 Giấy phép

Dự án này được phát triển dưới giấy phép MIT License.
