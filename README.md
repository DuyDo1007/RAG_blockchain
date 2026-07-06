# GenAI for Blockchain Security

Dự án sử dụng Generative AI để phân tích và phát hiện các vấn đề bảo mật trong smart contracts blockchain.

## Tính năng

1. **RAG (Retrieval-Augmented Generation) QA**: Hệ thống hỏi đáp dựa trên tài liệu về smart contract security
2. **Anomaly Detection**: Phát hiện các findings bất thường trong smart contracts sử dụng Isolation Forest
3. **Data Processing**: Xử lý và chuẩn hóa dữ liệu từ JSON files
4. **Vector Store**: Lưu trữ embeddings trong FAISS để tìm kiếm nhanh

## Cấu trúc dự án

```
genai-blockchain-security/
├── data/
│   ├── raw/                        # Dữ liệu JSON gốc (912 files)
│   ├── processed/                  # Dữ liệu sau khi xử lý
│   └── synthetic/                  # Dữ liệu sinh thêm bởi GenAI
├── notebooks/
│   ├── 01_data_exploration.ipynb   # Khám phá dữ liệu
│   ├── 02_data_preprocessing.ipynb # Làm sạch, chuẩn hóa
│   └── 03_model_training.ipynb    # Huấn luyện mô hình AI
├── models/
│   ├── trained_if.pkl              # Mô hình Isolation Forest đã train
│   └── autoencoder_model.h5        # (nếu dùng deep learning)
├── src/
│   ├── __init__.py
│   ├── app.py                      # Web demo (Streamlit)
│   ├── data_preprocessing.py       # Code xử lý dữ liệu
│   ├── genai_data_generator.py     # Sinh dữ liệu giả bằng GenAI
│   ├── model_training.py           # Huấn luyện mô hình phát hiện bất thường
│   ├── evaluate_model.py           # Đánh giá mô hình
│   ├── ingest_to_vectorstore.py    # Tạo FAISS index từ embeddings
│   └── rag_qa.py                   # RAG QA functions
├── requirements.txt
├── README.md
└── run_demo.sh                     # Script chạy nhanh toàn hệ thống
```

## Cài đặt

### Yêu cầu hệ thống

- **Python**: 3.9, 3.10, hoặc 3.11 (khuyến nghị **Python 3.10**)
  - Python 3.9: Tối thiểu
  - Python 3.10: Khuyến nghị (ổn định nhất)
  - Python 3.11: Được hỗ trợ nhưng có thể có vấn đề với TensorFlow
  - Python 3.12+: Không được hỗ trợ (TensorFlow chưa hỗ trợ)

**Kiểm tra Python version:**

```bash
python --version
# hoặc
python3 --version
```

**Tải Python:**

- Windows: https://www.python.org/downloads/
- Linux/Mac: Thường đã có sẵn, hoặc dùng package manager

### Tạo môi trường Python ảo (Khuyến nghị)

**Cách 1: Sử dụng script tự động (Khuyến nghị)**

```bash
# Linux/Mac/Windows (Git Bash)
bash setup_venv.sh
```

Script này sẽ tự động:

- Tạo virtual environment trong thư mục `.venv/`
- Cài đặt tất cả dependencies từ `requirements.txt`
- Nâng cấp pip, setuptools, wheel

**Cách 2: Tạo thủ công**

```bash
# Tạo virtual environment
python -m venv .venv

# Kích hoạt virtual environment
# Linux/Mac:
source .venv/bin/activate

# Windows (Git Bash):
source .venv/Scripts/activate

# Windows (CMD):
.venv\Scripts\activate

# Cài đặt dependencies
pip install -r requirements.txt
```

**Lưu ý:** Sau khi tạo virtual environment, luôn nhớ kích hoạt nó trước khi chạy các lệnh Python:

```bash
source .venv/bin/activate  # Linux/Mac
# hoặc
source .venv/Scripts/activate  # Windows (Git Bash)
```

### Cài đặt dependencies (nếu không dùng virtual environment)

```bash
pip install -r requirements.txt
```

2. **Chuẩn bị dữ liệu:**

```bash
# Xử lý dữ liệu từ JSON sang CSV
python src/data_preprocessing.py
```

3. **Tạo vector store (FAISS index):**

```bash
# Tạo embeddings và FAISS index cho RAG
python src/ingest_to_vectorstore.py
```

4. **Train model:**

```bash
# Train Isolation Forest model cho anomaly detection
python src/model_training.py
```

5. **Đánh giá mô hình (tùy chọn):**

```bash
# Đánh giá mô hình và tạo báo cáo
python src/evaluate_model.py
```

### Chạy nhanh với script

Sử dụng script `run_demo.sh` để chạy tất cả các bước tự động:

```bash
# Linux/Mac
bash run_demo.sh

# Windows (Git Bash)
bash run_demo.sh
```

Script này sẽ tự động:

- Tạo và kích hoạt virtual environment (nếu chưa có)
- Kiểm tra và cài đặt dependencies
- Xử lý dữ liệu
- Tạo vector store
- Train model
- Đánh giá mô hình (nếu có)

## Sử dụng

### Sử dụng Jupyter Notebooks

Các notebook trong thư mục `notebooks/` cung cấp môi trường tương tác để:

- **01_data_exploration.ipynb**: Khám phá và phân tích dữ liệu
- **02_data_preprocessing.ipynb**: Làm sạch và chuẩn hóa dữ liệu
- **03_model_training.ipynb**: Huấn luyện và đánh giá mô hình

Mở Jupyter Notebook:

```bash
jupyter notebook notebooks/
```

### Demo với Streamlit

**📖 Xem hướng dẫn chi tiết:** [DEMO_GUIDE.md](DEMO_GUIDE.md)

**Cách chạy nhanh:**

#### Windows PowerShell

1. **Chuẩn bị (chỉ cần chạy 1 lần đầu):**

```powershell
# Tạo virtual environment và cài đặt dependencies
.\setup_venv.ps1

# Chạy toàn bộ pipeline (xử lý dữ liệu, train model, v.v.)
.\run_demo.ps1
```

2. **Chạy demo Streamlit:**

```powershell
# Đảm bảo đã kích hoạt virtual environment
.\.venv\Scripts\Activate.ps1
streamlit run src/app.py
```

**Lưu ý:** Nếu gặp lỗi "execution of scripts is disabled", chạy:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Linux/Mac/Windows (Git Bash)

1. **Chuẩn bị (chỉ cần chạy 1 lần đầu):**

```bash
# Tạo virtual environment và cài đặt dependencies
bash setup_venv.sh

# Kích hoạt virtual environment
source .venv/bin/activate  # Linux/Mac
source .venv/Scripts/activate  # Windows (Git Bash)

# Chạy toàn bộ pipeline (xử lý dữ liệu, train model, v.v.)
bash run_demo.sh
```

2. **Chạy demo Streamlit:**

```bash
# Đảm bảo đã kích hoạt virtual environment
streamlit run src/app.py
```

Ứng dụng sẽ mở tại `http://localhost:8501` với 2 tính năng chính:

1. **RAG QA**: Nhập câu hỏi về smart contract security, hệ thống sẽ:

   - Tìm kiếm các documents liên quan
   - Tạo prompt với context
   - Bạn có thể copy prompt và sử dụng với OpenAI API

2. **Anomaly Detection**: Paste một finding hoặc smart contract snippet để:
   - Tính anomaly score
   - Phát hiện xem có bất thường hay không

### Sử dụng trực tiếp trong code

**RAG QA:**

```python
from src.rag_qa import retrieve, compose_prompt


docs = retrieve("reentrancy vulnerability", k=3)


prompt = compose_prompt("What is reentrancy?", docs)
print(prompt)
```

**Anomaly Detection:**

```python
import joblib
from sentence_transformers import SentenceTransformer


meta = joblib.load('models/trained_if.pkl')
clf = meta['clf']
model = SentenceTransformer(meta['emb_model_name'])


text = "Your finding text here"
emb = model.encode([text])
score = clf.decision_function(emb)[0]
is_anomaly = clf.predict(emb)[0] == -1
```

## Dữ liệu

Dữ liệu trong `data/raw/` chứa các findings từ smart contract audits với format:

- `id`: ID của finding
- `title`: Tiêu đề
- `content`: Nội dung chi tiết
- `impact`: Mức độ ảnh hưởng (LOW/MEDIUM/HIGH)
- `protocol_id`: ID của protocol
- `auditfirm_id`: ID của audit firm

## Models

- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
- **Anomaly Detection**: Isolation Forest với contamination=0.05

## Lưu ý

- Đảm bảo đã chạy `data_preprocessing.py` và `ingest_to_vectorstore.py` trước khi sử dụng RAG QA
- Đảm bảo đã train model (`model_training.py`) trước khi sử dụng Anomaly Detection
- Để sử dụng OpenAI API cho RAG, bạn cần set `OPENAI_API_KEY` environment variable

## Tác giả

Dự án GenAI for Blockchain Security
