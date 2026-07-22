# 🛡️ Nền Tảng Học Tập & Kiểm Thử Bảo Mật Blockchain (LangGraph Agentic RAG & Universal Sandbox Engine)

Chào mừng bạn đến với **Blockchain Security Academy & AI Mentor** – hệ sinh thái học tập và rèn luyện kỹ năng Web3, lập trình hợp đồng thông minh (Smart Contract) và an ninh mạng Blockchain tiêu chuẩn cao. Dự án được thiết kế tối ưu với phong cách **Cyberpunk Dark Mode** kết hợp cùng mô hình **LangGraph Agentic RAG** (Zero-Hallucination) và **Hệ thống Chấm điểm Sandbox Bảo mật Đa tầng (Multi-Layer Hardened Sandbox Engine)**.

---

## 🌟 Đột Phá Kiến Trúc & Công Nghệ Cốt Lõi

### 1. ⚡ Hệ Thống Chấm Điểm Chuẩn Chung (Universal Sandbox & Grader Engine)
* **Tốc độ thần tốc & Chi phí 0$:** Thay thế hoàn toàn cơ chế chấm bài bằng AI lặp đi lặp lại tốn kém sang hệ thống thực thi kiểm thử tự động (Unit Test & Static Analysis) với tốc độ phản hồi trung bình **< 0.05s/bài**.
* **Phủ sóng đa ngôn ngữ & Đa chuẩn:**
  * **Python Labs (`lesson-01`, `08`, `09`, `10`, `12` + `lesson-99`):** Sử dụng bộ `PYTHON_TEST_SUITES` thực thi mã nguồn trong môi trường cô lập, kiểm tra đầu ra logic, xử lý ngoại lệ và khả năng chịu tải với hợp đồng an toàn (`safe_code`).
  * **Solidity Labs (`lesson-02` đến `07`, `11`, `13` đến `16` + `lesson-88`):** Sử dụng bộ `SOLIDITY_TEST_RULES` kết hợp engine phân tích ngữ nghĩa tĩnh (`validate_solidity_semantics`) phát hiện chính xác lỗ hổng bảo mật (Reentrancy, SafeMath/Overflow, Access Control, Signature Replay, Storage Collision).
* **Khả năng tự động mở rộng (Future-Proof):** Các bài lab tương lai (như `lesson-99` cho Python hay `lesson-88` cho Solidity) được tự động nhận diện theo ngôn ngữ (`run_generic_python_test` / `run_generic_solidity_test`) mà không cần viết lại mã chấm điểm.

### 2. 🛡️ Bảo Mật Đa Tầng Chống Gian Lận (Multi-Layer Security Guards & Red Team Hardening)
Hệ thống được thiết kế và kiểm định theo tiêu chuẩn an ninh mạng khắt khe nhất để chống lại các hành vi gian lận hoặc can thiệp hệ thống của học viên am hiểu kỹ thuật:
* **Tầng 1 – Security Guard (Anti-System Tampering):** Vô hiệu hóa mọi nỗ lực can thiệp tiến trình hoặc ghi đè thư viện hệ thống như Monkeypatching `unittest.TestCase.assertTrue`, ghi đè `sys.modules`, `sys.settrace` hay `hashlib.sha256 = lambda...`.
* **Tầng 2 – Logic & AST Static Guard:** Phân tích cây cú pháp trừu tượng (AST) Python để ngăn chặn các thủ đoạn lách luật tinh vi như:
  * Tạo class gian lận Duck Typing (`__getattr__ = lambda self, name: lambda *a, **kw: True`).
  * Trả về kết quả cố định (`['vulnerability']`, `'rug'`, `'phishing flag'`) bất kể mã đầu vào.
  * Lách bằng cú pháp Ternary nông (`return ... if ... else ...` mà không kiểm tra thực chất logic).
* **Tầng 3 – Comment Stripper & Semantic Guard (`strip_sol_comments_and_strings`):** Tiêu diệt triệt để các thủ đoạn giấu từ khóa yêu cầu của đề bài vào trong comment (`/* nonces[signer]++ */`) hoặc để trong các hàm rỗng, biểu thức vô nghĩa (`COLLATERAL_RATIO;`, `uint x = maxBorrow;`).
* **Tầng 4 – Route Switching Guard (`REQUIRED_LANGUAGE_MAP`):** Ngăn chặn hoàn toàn việc gửi mã nguồn Python vào bài lab Solidity (hoặc ngược lại) để lách cấu hình kiểm tra.

### 3. 🧠 Trợ Lý AI Tutor & Security Mentor (LangGraph Agentic RAG)
* **Quy trình lập luận tự sửa lỗi (Self-Correcting RAG):**
  * **`classify` (Router):** Phân loại câu hỏi. Nếu học viên hỏi ngoài chủ đề blockchain, hệ thống lập tức chuyển hướng sang `reject` để nhắc nhở.
  * **`retrieve` & `generate`:** Tìm kiếm ngữ nghĩa tài liệu trong Qdrant Vector DB (CodeBERT embeddings 768 chiều) và tạo câu trả lời chuyên sâu bằng tiếng Việt.
  * **`grade` (Zero-Hallucination):** Kiểm định độ chính xác của câu trả lời. Nếu phát hiện thông tin ảo giác hoặc sai lệch so với giáo trình, tiến trình tự động sửa lỗi (`Self-Correction`) được kích hoạt để tinh chỉnh câu trả lời đạt độ chuẩn xác 100%.
* **🤖 AI Mentor / Phân Tích Lỗi Nhắm Mục Tiêu (`POST /api/lab/ai_mentor`):** Khi học viên chạy code không pass (`score < 100`), nút **AI Mentor / Phân tích lỗi** sẽ tự động nhấp nháy trên giao diện. Khi học viên bấm vào, hệ thống mới truyền mã nguồn kèm `traceback` chi tiết sang Gemini để gợi ý hướng sửa lỗi sư phạm, giúp tối ưu chi phí và tài nguyên API.

---

## ⚔️ Thành Tích Kiểm Định & Đối Chứng Tuyệt Đối (302 Mẫu Code)

Hệ thống chấm điểm chuẩn chung đã trải qua quá trình kiểm thử Red Team khắc nghiệt và đạt độ chính xác tuyệt đối trên 3 bộ mẫu thử nghiệm độc lập:

| Bộ Kiểm Định | Số Mẫu | Kết Quả Thực Thi | Tỷ Lệ Chính Xác / Chặn Đứng | Ý Nghĩa Kiểm Định |
| :--- | :---: | :---: | :---: | :--- |
| **🎯 Student Valid/Invalid Suite** (`test_100_samples.py`) | 100 | 100 Pass/Fail đúng kỳ vọng | **100/100 (100.0%)** | Đảm bảo 100% bài làm hợp lệ của học viên được công nhận (Score 100), các lỗi cú pháp, code rỗng, lặp vô hạn (Timeout) bị bắt chính xác. |
| **🛡️ Red Team Bypass Suite** (`redteam_100_bypass_samples.py`) | 102 | 102 mẫu tấn công bị vô hiệu hóa | **102/102 (100.0%)** | Chặn 100% các thủ đoạn Monkeypatching `unittest`, ghi đè `sys.modules`, lambda wrapper, dead code injection, hardcode dummy outputs. |
| **🔬 Architecture Suite** (`test.md` 150 Payloads) | 150 | 114 mẫu lách rào kiến trúc bị chặn | **114/150 (76.0%)** | Vô hiệu hóa toàn bộ 100% các lỗ hổng Route Switching, Hooking, Magic Class. 24% còn lại là các logic chuỗi hoàn toàn hợp lệ theo yêu cầu bài lab. |

---

## 👥 Vai Trò Trong Hệ Thống (User Roles)

### 1. Học Viên (Student / User)
* **Bản đồ lộ trình bài học (Visual Roadmap Graph):** Theo dõi tiến trình học tập dạng sơ đồ cây trực quan với **React Flow**, hiển thị rõ ràng các bài tiên quyết từ Cơ bản đến Nâng cao.
* **Tự kiểm tra kiến thức (Interactive Quizzes):** Làm bài trắc nghiệm củng cố lý thuyết sau mỗi bài học, tự động lưu tiến trình trên MongoDB.
* **Tương tác trực tiếp với AI Tutor:** Thảo luận, đặt câu hỏi về công nghệ Web3, DeFi, AMM, Merkle Tree với giải thích trực quan, dễ hiểu.
* **Lab Workspace & Smart Contract Scanner:**
  * Soạn thảo code trực tiếp với **Monaco Editor** (hỗ trợ Solidity/Python Syntax Highlighting).
  * **Tích hợp Explorer API:** Nhập địa chỉ Smart Contract và tải nhanh mã nguồn thực tế từ mạng Ethereum/BNB Chain (Etherscan/BscScan API).
  * Thực thi kiểm thử (`RUN CODE`) và nhận báo cáo lỗi chi tiết tại dòng nào, mức độ nghiêm trọng và so sánh `Before/After`.

### 2. Quản Trị Viên (Admin)
* **Quản trị học viên:** Danh sách người dùng, theo dõi tiến độ từng học viên, khóa/mở khóa tài khoản, phân quyền Admin.
* **Quản trị nội dung (Roadmap Management):** Tạo mới, chỉnh sửa chi tiết bài học (tiêu đề, mô tả, nội dung Markdown, câu hỏi trắc nghiệm, cấu trúc lab) hoặc xóa bài học trực tiếp trên giao diện Cyberpunk.

---

## 📚 Danh Sách 16 Bài Lab Tiêu Chuẩn & Khả Năng Mở Rộng

| Lesson ID | Tên Bài Học & Chủ Đề | Ngôn Ngữ | Tiêu Điểm Kiểm Thử & Lỗi Bảo Mật |
| :--- | :--- | :---: | :--- |
| **`lesson-01`** | Blockchain Basics & Hashing | Python | Kiểm tra cấu trúc Class `Block`, hàm `calculate_hash()`, tính toàn vẹn chuỗi. |
| **`lesson-02`** | Cryptography & Keccak256 | Solidity | Kiểm tra hàm `hashData()`, cấm lưu trữ mật khẩu nhạy cảm (`private password`). |
| **`lesson-03`** | Reentrancy Attack & Defense | Solidity | Phát hiện tấn công tái nhập (`fallback` gọi `bank.withdraw()`) & cờ bảo vệ `nonReentrant`. |
| **`lesson-04`** | SafeMath & Integer Overflow | Solidity | Kiểm tra sử dụng `SafeMath` / compiler `>= 0.8.0`, cấm khối `unchecked {...}`. |
| **`lesson-05`** | Access Control & Phishing | Solidity | Cấm tuyệt đối `tx.origin` gây rủi ro Phishing, yêu cầu `msg.sender == owner`. |
| **`lesson-06`** | Flash Loan & DeFi Risk | Solidity | Kiểm tra logic kiểm chứng số dư trước/sau vay trả (`balanceAfter >= balanceBefore`). |
| **`lesson-07`** | Price Oracle & TWAP | Solidity | Kiểm tra giá trị trung bình theo thời gian `timeElapsed > 0` chống thao túng giá trong block. |
| **`lesson-08`** | MEV & Sandwich Attack Analysis | Python | Phát hiện giao dịch bị chèn ép giá (`analyze_mempool`), tính toán độ trượt giá trần. |
| **`lesson-09`** | Phishing & Malicious Approval | Python | Phát hiện hợp đồng chứa lời gọi `approve` / `setApprovalForAll` tới địa chỉ lạ. |
| **`lesson-10`** | Smart Contract Static Audit | Python | Bộ quét mã tĩnh phát hiện `block.timestamp` (Weak Randomness) và hàm thiếu bảo vệ. |
| **`lesson-11`** | DeFi Lending Liquidation Risk | Solidity | Kiểm tra hệ số sức khỏe `healthFactor < LIQUIDATION_THRESHOLD` để thanh lý tài sản. |
| **`lesson-12`** | Rug Pull & Tokenomics Analyzer | Python | Phát hiện cờ `liquidity_locked == False`, thuế mua/bán `buy_tax/sell_tax > 20%`. |
| **`lesson-13`** | Vault CEI & Read-Only Reentrancy | Solidity | Đảm bảo nguyên tắc **Checks-Effects-Interactions (CEI)** và cờ khóa `require(!locked)`. |
| **`lesson-14`** | Proxy Storage Collision | Solidity | Kiểm tra khe lưu trữ theo chuẩn ERC-1967 (`Slot 0: implementation`, `Slot 1: owner`). |
| **`lesson-15`** | Signature Replay Vulnerability | Solidity | Xác minh chữ ký hợp lệ và cơ chế chống phát lại bằng `nonces[signer]++`. |
| **`lesson-16`** | Cross-Chain Bridge Replay | Solidity | Kiểm tra cờ `processedMessages[msgHash] = true` trước khi phát hành token (`mintToken`). |
| **`lesson-99`** | *Generic Future Python Lab* | Python | Tự động nhận dạng bài lab Python mới, kiểm tra thực thi an toàn trong môi trường Sandbox. |
| **`lesson-88`** | *Generic Future Solidity Lab* | Solidity | Tự động nhận dạng hợp đồng Solidity mới, kiểm tra cú pháp và cấu trúc cơ bản. |

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### 1. Backend API (FastAPI - Python 3.10+)
* **Framework:** FastAPI, SlowAPI (Rate Limiting chống DDoS/Spam).
* **Database & Vector Store:**
  * **MongoDB:** Quản lý người dùng, lộ trình bài học, lịch sử chat.
  * **Qdrant DB:** Vector DB chuyên dụng lưu trữ CodeBERT Embeddings (768 dimensions).
  * **FAISS & BM25:** Hệ thống Hybrid Search dự phòng chạy offline tốc độ cao.
* **AI Orchestration & LLM:** LangGraph (`StateGraph`), Google GenAI SDK (Gemini 3.5 Flash).
* **Sandbox Grader:** Core `test_runner.py` chạy tiến trình con Python cô lập và phân tích ngữ nghĩa Solidity.

### 2. Frontend Client (React 18 - Vite)
* **Core:** React 18, Vite, Vanilla CSS (**Cyberpunk Dark Mode** với neon glow, animations mượt mà).
* **Chức năng kỹ thuật cao:**
  * **Monaco Editor React:** `@monaco-editor/react` cho trải nghiệm lập trình IDE thực tế.
  * **React Flow:** `@xyflow/react` vẽ sơ đồ cây lộ trình học tập tương tác.
  * **Markdown & Syntax Highlighting:** `react-markdown`, `react-syntax-highlighter`.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
genai-blockchain-security/
├── backend/                       # API Server FastAPI (Python 3.10+)
│   ├── api/                       # Các Endpoints API
│   │   ├── admin.py               # Quản trị viên (Users, Lessons CRUD)
│   │   ├── auth.py                # Xác thực JWT, Google OAuth, Profile
│   │   ├── chat.py                # Chatbot & SSE Streaming Websocket
│   │   ├── contract.py            # Explorer API import (Etherscan/BscScan)
│   │   ├── lab.py                 # Chấm điểm Sandbox (`/grade`) & AI Mentor (`/ai_mentor`)
│   │   └── roadmap.py             # Lấy lộ trình học tập và nộp Quiz
│   ├── middleware/                # JWT Auth Middleware & Rate Limiter
│   ├── models/                    # Pydantic Schemas & MongoDB Models
│   ├── services/                  # Logic nghiệp vụ cốt lõi
│   │   ├── test_runner.py         # ⚡ Universal Sandbox Engine & Multi-Layer Guards
│   │   ├── rag_service.py         # LangGraph Agentic RAG Orchestrator
│   │   ├── vector_store.py        # Qdrant & CodeBERT Embedding wrapper
│   │   └── blockchain_service.py  # Etherscan/BscScan Explorer integration
│   └── main.py                    # Khởi tạo FastAPI application & CORS
├── frontend/                      # Web Client React 18 (Vite)
│   ├── src/
│   │   ├── components/            # Các UI Components
│   │   │   ├── LabWorkspace.jsx   # Monaco Editor, Run Code Sandbox & AI Mentor
│   │   │   ├── RoadmapFlow.jsx    # React Flow Visual Roadmap Tree
│   │   │   └── ...                # Navbar, ChatBox, LessonDetail, AdminPanel
│   │   ├── context/               # AuthContext & State Management
│   │   ├── services/              # Axios API clients
│   │   └── index.css              # Cyberpunk Dark Theme CSS Design System
│   ├── package.json               # Dependencies & Vite configuration
│   └── index.html                 # Main entry HTML
├── src/                           # Pipeline xử lý dữ liệu & AI Engine offline
│   ├── agent_rag.py               # Node definition cho LangGraph StateGraph
│   ├── rag_qa.py                  # Pipeline FAISS/BM25 Hybrid Search offline
│   ├── ingest_qdrant.py           # Nạp dữ liệu giáo trình vào Qdrant DB
│   └── data_preprocessing.py      # Làm sạch dữ liệu lỗ hổng Smart Contract
├── data/                          # Dữ liệu raw, processed và giáo trình JSON
├── docker-compose.yml             # Cấu hình Docker (Backend, Frontend, MongoDB, Qdrant)
├── requirements.txt               # Python backend dependencies
└── README.md                      # Tài liệu tổng quan dự án
```

---

## ⚡ Hướng Dẫn Cài Đặt & Vận Hành

### 1. Khởi Chạy Nhanh Với Docker Compose (Khuyến nghị)
Yêu cầu hệ thống đã cài đặt **Docker** và **Docker Compose**.
```bash
# 1. Clone dự án về máy
git clone https://github.com/your-username/genai-blockchain-security.git
cd genai-blockchain-security

# 2. Tạo file biến môi trường từ mẫu
cp .env.example .env
# Chỉnh sửa biến môi trường GEMINI_API_KEY trong file .env

# 3. Khởi chạy toàn bộ hệ thống (MongoDB, Qdrant, Backend, Frontend)
docker-compose up -d --build
```
Sau khi khởi chạy thành công:
* **Frontend Web Application:** `http://localhost:3000`
* **Backend API Swagger Documentation:** `http://localhost:8000/docs`
* **Qdrant Vector Dashboard:** `http://localhost:6333/dashboard`

### 2. Cài Đặt Và Chạy Thủ Công (Local Development)

#### Bước 1: Cài đặt và chạy Backend (FastAPI)
```bash
# Tạo và kích hoạt môi trường ảo Python
python -m venv .venv
# Trên Windows:
.venv\Scripts\activate
# Trên Linux/macOS:
source .venv/bin/activate

# Cài đặt các gói thư viện
pip install -r requirements.txt

# Khởi chạy máy chủ FastAPI ở cổng 8000
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Bước 2: Cài đặt và chạy Frontend (React + Vite)
```bash
cd frontend

# Cài đặt các gói thư viện Node.js
npm install

# Khởi chạy máy chủ phát triển Vite ở cổng 3000
npm run dev
```

---

## 🛡️ Cam Kết Chất Lượng & Bản Quyền
Dự án được xây dựng với mục tiêu sư phạm chất lượng cao, tuân thủ nghiêm ngặt các nguyên tắc bảo mật, không có thông tin ảo giác và đảm bảo trải nghiệm lập trình tối ưu nhất cho người học.

* **Bản quyền © 2026 Blockchain Security Academy.** All rights reserved.
