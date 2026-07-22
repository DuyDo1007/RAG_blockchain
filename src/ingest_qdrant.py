"""
Qdrant Ingestion & Migration Script from CSV/FAISS
"""
import os
import sys
import asyncio
import pandas as pd
import numpy as np
import torch
from pathlib import Path
from transformers import AutoTokenizer, AutoModel

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.services.vector_store import QdrantVectorStore
import re

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
        impact = str(row.get('impact', 'MEDIUM'))
        contract_name = str(row.get('contract_name', 'Unknown'))
        function_name = str(row.get('function_name', 'Unknown'))
        
        base_chunk = {
            'id': f'{row_id}_parent', 
            'parent_id': row_id, 
            'title': title, 
            'content': content, 
            'code': '', 
            'vulnerability_label': vuln_label, 
            'dangerous_apis': ','.join(extract_dangerous_apis(content)), 
            'chunk_type': 'parent',
            'impact': impact,
            'contract_name': contract_name,
            'function_name': function_name
        }
        chunks.append(base_chunk)
        if code and code.strip() and (code != 'nan'):
            parts = re.split('(?m)^(?:function|contract|def|class)\\s+', code)
            for i, part in enumerate(parts):
                part = part.strip()
                if not part:
                    continue
                func_name_match = re.match('([a-zA-Z0-9_]+)', part)
                func_name = func_name_match.group(1) if func_name_match else f'snippet_{i}'
                child_chunk = {
                    'id': f'{row_id}_child_{i}', 
                    'parent_id': row_id, 
                    'title': title, 
                    'content': f'Code snippet from {title} (Function: {func_name})', 
                    'code': part, 
                    'vulnerability_label': vuln_label, 
                    'dangerous_apis': ','.join(extract_dangerous_apis(part)), 
                    'chunk_type': 'child',
                    'impact': impact,
                    'contract_name': contract_name,
                    'function_name': func_name
                }
                chunks.append(child_chunk)
    result_df = pd.DataFrame(chunks)
    print(f'✓ Đã chia {len(df)} records thành {len(result_df)} chunks')
    return result_df

DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
CSV_PATH = DATA_DIR / "findings.csv"
MODEL_NAME = "microsoft/codebert-base"


def get_embeddings_batch(texts: list[str], tokenizer, model, device, batch_size=32) -> list[list[float]]:
    """Generate mean-pooled CodeBERT embeddings in batches"""
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        inputs = tokenizer(
            batch_texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt"
        ).to(device)

        with torch.no_grad():
            outputs = model(**inputs)
            # Mean pooling across attention mask
            attention_mask = inputs["attention_mask"].unsqueeze(-1)
            token_embeddings = outputs[0]
            sum_embeddings = torch.sum(token_embeddings * attention_mask, dim=1)
            sum_mask = torch.clamp(attention_mask.sum(dim=1), min=1e-9)
            mean_pooled = (sum_embeddings / sum_mask).cpu().numpy()
            all_embeddings.extend(mean_pooled.tolist())

    return all_embeddings


async def main():
    print("=" * 60)
    print("🚀 STARTING MIGRATION: CSV/FAISS -> QDRANT VECTOR STORE")
    print("=" * 60)

    if not CSV_PATH.exists():
        print(f"[Error] CSV file not found at {CSV_PATH}")
        return

    print(f"[Ingest] Reading raw audit findings from: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"[Ingest] Loaded {len(df)} records.")

    # Apply semantic chunking
    chunked_df = ast_aware_chunking(df)
    chunked_df = chunked_df.fillna("")

    # Setup PyTorch device and model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Ingest] Loading CodeBERT ({MODEL_NAME}) on device: {device} ...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModel.from_pretrained(MODEL_NAME).to(device)
    model.eval()

    # Prepare texts to embed
    texts_to_embed = []
    documents = []
    for idx, row in chunked_df.iterrows():
        title = str(row.get("title", ""))
        content = str(row.get("content", ""))
        code = str(row.get("code", ""))
        embed_text = f"{title}. {content}. {code[:300]}"
        texts_to_embed.append(embed_text)
        
        doc_payload = {
            "id": str(row.get("id", f"doc_{idx}")),
            "title": title,
            "content": content,
            "code": code,
            "impact": str(row.get("impact", "MEDIUM")),
            "chunk_type": str(row.get("chunk_type", "general")),
            "contract_name": str(row.get("contract_name", "Unknown")),
            "function_name": str(row.get("function_name", "Unknown"))
        }
        documents.append(doc_payload)

    print(f"[Ingest] Generating embeddings for {len(texts_to_embed)} chunks ...")
    vectors = get_embeddings_batch(texts_to_embed, tokenizer, model, device, batch_size=32)

    # Initialize Qdrant and Upsert
    qdrant = QdrantVectorStore.get_instance()
    print("[Ingest] Connecting to Qdrant & Creating Collection ...")
    await qdrant.create_collection(vector_size=768)

    print("[Ingest] Upserting points into Qdrant ...")
    await qdrant.upsert_documents(documents, vectors)

    print("=" * 60)
    print("✅ MIGRATION TO QDRANT COMPLETED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
