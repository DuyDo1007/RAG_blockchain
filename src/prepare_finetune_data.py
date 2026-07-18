"""
Fine-Tune Data Preparation Script (LoRA / QLoRA JSONL Generator)
"""
import json
import hashlib
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
PROCESSED_DIR = DATA_DIR / "processed"
FINETUNE_DIR = DATA_DIR / "finetune"
CSV_PATH = PROCESSED_DIR / "findings.csv"


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    return text.strip().replace("\r\n", "\n")


def main():
    print("=" * 60)
    print("🧠 PREPARING FINE-TUNING DATASET (JSONL FORMAT)")
    print("=" * 60)

    if not CSV_PATH.exists():
        print(f"[Error] Source file not found: {CSV_PATH}")
        return

    FINETUNE_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(CSV_PATH).fillna("")
    print(f"[Prep] Loaded {len(df)} rows from {CSV_PATH}")

    samples = []
    seen_hashes = set()

    for idx, row in df.iterrows():
        title = clean_text(row.get("title", ""))
        content = clean_text(row.get("content", ""))
        code = clean_text(row.get("code", ""))
        impact = clean_text(row.get("impact", "MEDIUM"))
        contract_name = clean_text(row.get("contract_name", "Unknown"))

        if not code or len(code) < 30:
            continue

        # Deduplication using code hash
        code_hash = hashlib.md5(code.encode("utf-8")).hexdigest()
        if code_hash in seen_hashes:
            continue
        seen_hashes.add(code_hash)

        instruction = (
            f"Bạn là chuyên gia kiểm định bảo mật smart contract. Hãy phân tích lỗ hổng "
            f"và đánh giá độ nghiêm trọng cho đoạn code Solidity trong contract `{contract_name}`."
        )

        input_text = f"Mã nguồn hợp đồng:\n```solidity\n{code}\n```"

        output_text = (
            f"### Phân tích lỗ hổng: {title}\n"
            f"- **Mức độ nghiêm trọng**: {impact}\n"
            f"- **Chi tiết lỗi**: {content}\n\n"
            f"### Khuyến nghị khắc phục:\n"
            f"Kiểm tra kỹ logic kiểm soát truy cập và áp dụng Checks-Effects-Interactions pattern để ngăn chặn thao tác bất thường."
        )

        samples.append({
            "instruction": instruction,
            "input": input_text,
            "output": output_text
        })

    print(f"[Prep] Extracted {len(samples)} unique high-quality training pairs.")

    # Split Train (90%) / Eval (10%)
    split_idx = int(len(samples) * 0.9)
    train_samples = samples[:split_idx]
    eval_samples = samples[split_idx:]

    train_path = FINETUNE_DIR / "train.jsonl"
    eval_path = FINETUNE_DIR / "eval.jsonl"

    with open(train_path, "w", encoding="utf-8") as f:
        for s in train_samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    with open(eval_path, "w", encoding="utf-8") as f:
        for s in eval_samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    print(f"[Prep] Saved {len(train_samples)} training records to: {train_path}")
    print(f"[Prep] Saved {len(eval_samples)} evaluation records to: {eval_path}")
    print("=" * 60)
    print("✅ FINE-TUNING DATA PREPARATION COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    main()
