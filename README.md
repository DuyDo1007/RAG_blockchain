# GenAI for Blockchain Security

## Dự án sử dụng Generative AI và RAG (Retrieval-Augmented Generation) tiên tiến để hỗ trợ hỏi đáp, học tập và phân tích lỗ hổng bảo mật trong Smart Contract Blockchain.

## Cấu trúc thư mục dự án

```text
genai-blockchain-security/
├── backend/                       # Máy chủ FastAPI (Python)
│   ├── api/                       # API Endpoints (Chat, Roadmap)
│   ├── models/                    # Pydantic v2 Schemas & Database Manager
│   ├── services/                  # RAG Services (chạy đa luồng an toàn)
│   └── main.py                    # Điểm khởi chạy FastAPI
├── frontend/                      # Ứng dụng client React Vite (Javascript)
│   ├── src/
│   │   ├── components/            # UI Components (ChatWindow, Sidebar, v.v.)
│   │   ├── App.jsx                # Giao diện chính đồng bộ
│   │   └── index.css              # Custom Dark Cyberpunk Styling
│   └── package.json
├── data/
│   ├── raw/                       # File lỗ hổng JSON gốc
│   ├── processed/                 # Dữ liệu index FAISS/Parquet/BM25 (Đã ignore)
│   └── local_db/                  # Database JSON dự phòng cục bộ (Đã ignore)
├── src/                           # RAG Core & Mô hình nhúng
│   ├── data_preprocessing.py
│   ├── ingest_to_vectorstore.py   # Vector hóa dữ liệu
│   └── rag_qa.py                  # Công cụ hỏi đáp, prompt và Gemini API
├── .env.example                   # File mẫu cấu hình biến môi trường
├── requirements.txt               # Dependencies của Backend
└── docker-compose.yml             # Cấu hình khởi chạy Docker Compose
```

---

## Cấu hình biến môi trường

Tạo file `.env` tại thư mục gốc của dự án với các thông tin sau:

```env
# Gemini API Key (Bắt buộc cho Mentor AI)
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB Atlas URL (Nếu không kết nối được sẽ tự động dùng JSON Database cục bộ)
MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/
MONGO_DB=genai_blockchain

# Cấu hình server chạy
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
ENV=development
```

---

## Hướng dẫn khởi chạy hệ thống

### Cách 1: Khởi chạy trực tiếp (Khuyến nghị trên Windows)

#### 1. Khởi chạy Backend (FastAPI):

Yêu cầu Python 3.10 trở lên.

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
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

_Backend sẽ khởi chạy tại: `http://localhost:8000`_

#### 2. Khởi chạy Frontend (React Vite):

Yêu cầu Node.js v18 trở lên.

```bash
cd frontend
npm install
npm run dev
```

_Frontend sẽ khởi chạy tại: `http://localhost:5173`_

---

### Cách 2: Khởi chạy bằng Docker Compose

Đảm bảo bạn đã khởi động Docker Desktop.

```bash
docker-compose up --build -d
```

Hệ thống sẽ tự động cấu hình mạng và khởi chạy 3 container:

- `genai-blockchain-mongo`: Cơ sở dữ liệu MongoDB Local.
- `genai-blockchain-backend`: API Server FastAPI.
- `genai-blockchain-frontend`: React Client.

---
