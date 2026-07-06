import os
import sys
import io
import pandas as pd
import faiss
import numpy as np
import pickle
import re
from rank_bm25 import BM25Okapi
try:
    from transformers import AutoTokenizer, AutoModel
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print('⚠️  Transformers không khả dụng.')
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
CSV_PATH = 'data/processed/findings.csv'
INDEX_PATH = 'data/processed/faiss_index.bin'
META_PATH = 'data/processed/metadf.parquet'
BM25_PATH = 'data/processed/bm25_index.pkl'
CODEBERT_MODEL = 'microsoft/codebert-base'

def extract_dangerous_apis(text):
    dangerous_list = ['execute', 'eval', 'strcpy', 'gets', 'delegatecall', 'selfdestruct', 'call.value', 'tx.origin', 'block.timestamp', 'suicide', 'exec']
    found = []
    text_lower = str(text).lower()
    for d in dangerous_list:
        if d.lower() in text_lower:
            found.append(d)
    return found

def ast_aware_chunking(df):
    chunks = []
    print('Đang thực hiện AST-aware chunking...')
    for idx, row in df.iterrows():
        row_id = row.get('id', idx)
        content = str(row.get('content', ''))
        code = str(row.get('code', ''))
        title = str(row.get('title', ''))
        vuln_label = str(row.get('vulnerability_label', ''))
        base_chunk = {'chunk_id': f'{row_id}_parent', 'parent_id': row_id, 'title': title, 'content': content, 'code': '', 'vulnerability_label': vuln_label, 'dangerous_apis': extract_dangerous_apis(content), 'chunk_type': 'parent'}
        chunks.append(base_chunk)
        if code and code.strip() and (code != 'nan'):
            parts = re.split('(?m)^(?:function|contract|def|class)\\s+', code)
            for i, part in enumerate(parts):
                part = part.strip()
                if not part:
                    continue
                func_name_match = re.match('([a-zA-Z0-9_]+)', part)
                func_name = func_name_match.group(1) if func_name_match else f'snippet_{i}'
                child_chunk = {'chunk_id': f'{row_id}_child_{i}', 'parent_id': row_id, 'title': title, 'content': f'Code snippet from {title} (Function: {func_name})', 'code': part, 'vulnerability_label': vuln_label, 'dangerous_apis': extract_dangerous_apis(part), 'chunk_type': 'child'}
                chunks.append(child_chunk)
    result_df = pd.DataFrame(chunks)
    print(f'✓ Đã chia {len(df)} records thành {len(result_df)} chunks')
    return result_df

def create_embeddings(texts, model_name=CODEBERT_MODEL, batch_size=16, max_length=512):
    if not TRANSFORMERS_AVAILABLE:
        raise ImportError('Transformers package required for CodeBERT.')
    print(f'Đang load CodeBERT model: {model_name}...')
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)
    model.eval()
    embeddings = []
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        try:
            encoded = tokenizer(batch_texts, padding=True, truncation=True, max_length=max_length, return_tensors='pt')
            encoded = {k: v.to(device) for k, v in encoded.items()}
            with torch.no_grad():
                outputs = model(**encoded)
                input_mask_expanded = encoded['attention_mask'].unsqueeze(-1).expand(outputs.last_hidden_state.size()).float()
                sum_embeddings = torch.sum(outputs.last_hidden_state * input_mask_expanded, 1)
                sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-09)
                batch_embeddings = (sum_embeddings / sum_mask).float().cpu().numpy()
            embeddings.append(batch_embeddings)
            if (i // batch_size + 1) % 10 == 0:
                print(f'  Đã xử lý {i + len(batch_texts)}/{len(texts)} chunks...')
        except Exception as e:
            print(f'Lỗi batch {i}: {e}')
            continue
    if not embeddings:
        return np.array([])
    return np.vstack(embeddings)

def build_indices(csv_path=CSV_PATH):
    print('=' * 50)
    print('XÂY DỰNG HYBRID VECTOR STORE (FAISS + BM25)')
    print('=' * 50)
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f'Không tìm thấy file CSV tại {csv_path}')
    df_raw = pd.read_csv(csv_path, engine='python', on_bad_lines='skip')
    df = ast_aware_chunking(df_raw)
    df['text_for_search'] = (df['title'].fillna('') + ' ' + df['content'].fillna('') + ' ' + df['code'].fillna('')).astype(str)
    texts = df['text_for_search'].tolist()
    print('Đang tạo BM25 Index (Keyword Search)...')
    tokenized_corpus = [doc.lower().split() for doc in texts]
    bm25 = BM25Okapi(tokenized_corpus)
    os.makedirs(os.path.dirname(BM25_PATH), exist_ok=True)
    with open(BM25_PATH, 'wb') as f:
        pickle.dump(bm25, f)
    print('✓ Đã lưu BM25 index')
    print(f'Đang tạo Embeddings bằng {CODEBERT_MODEL}...')
    embeds = create_embeddings(texts)
    print('Đang tạo FAISS index...')
    dim = embeds.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeds.astype('float32'))
    faiss.write_index(index, INDEX_PATH)
    df.drop(columns=['text_for_search'], inplace=True)
    df['dangerous_apis'] = df['dangerous_apis'].apply(lambda x: ','.join(x) if isinstance(x, list) else '')
    df.to_parquet(META_PATH, index=False)
    print(f'✓ Đã lưu FAISS index vào {INDEX_PATH}')
    print(f'✓ Đã lưu Metadata vào {META_PATH}')
if __name__ == '__main__':
    build_indices()
