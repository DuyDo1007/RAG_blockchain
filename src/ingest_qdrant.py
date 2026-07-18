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
from src.semantic_chunker import semantic_chunk

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
    chunked_df = semantic_chunk(df)
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
