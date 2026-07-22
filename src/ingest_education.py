import os
import sys
import asyncio
import re
from typing import List, Dict, Any

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src.rag_qa import encode_query
from backend.services.vector_store import QdrantVectorStore

def parse_markdown_with_frontmatter(file_path: str) -> Dict[str, Any]:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    frontmatter = {}
    body = content

    # Check YAML frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            fm_text = parts[1].strip()
            body = parts[2].strip()
            for line in fm_text.split("\n"):
                if ":" in line:
                    key, val = line.split(":", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key in ["duration_minutes"]:
                        frontmatter[key] = int(val) if val.isdigit() else val
                    elif key == "prerequisites":
                        if val.startswith("[") and val.endswith("]"):
                            val = val[1:-1].strip()
                            frontmatter[key] = [v.strip().strip('"').strip("'") for v in val.split(",") if v.strip()]
                        else:
                            frontmatter[key] = []
                    else:
                        frontmatter[key] = val

    return {
        "frontmatter": frontmatter,
        "body": body
    }

def chunk_markdown(lesson_meta: Dict[str, Any], body: str) -> List[Dict[str, Any]]:
    chunks = []
    # Split by H2 headers (## )
    sections = re.split(r'\n(?=## \d+\.|\n## [A-Z0-9])', body)
    
    lesson_id = lesson_meta.get("lesson_id", "")
    lesson_title = lesson_meta.get("title", "")
    difficulty = lesson_meta.get("difficulty", "beginner")

    for idx, section in enumerate(sections):
        section_text = section.strip()
        if not section_text:
            continue

        # Extract title from first line of section
        lines = section_text.split("\n")
        section_heading = lines[0].strip("# ").strip() if lines[0].startswith("#") else f"Section {idx+1}"
        
        # Extract any code block in this section
        code_snippets = []
        for match in re.finditer(r'```(?:\w+)?\n(.*?)\n```', section_text, re.DOTALL):
            code_snippets.append(match.group(1).strip())
        code_str = "\n\n".join(code_snippets) if code_snippets else ""

        # Remove code blocks from main content text or keep them as context
        # We keep full text inside content for context
        chunks.append({
            "id": f"{lesson_id}_sec_{idx}",
            "lesson_id": lesson_id,
            "title": f"{lesson_title} - {section_heading}",
            "content": section_text,
            "code": code_str,
            "dangerous_apis": "",
            "difficulty": difficulty
        })
    return chunks

async def main():
    print("[Ingest] Starting Education Content Ingestion into Qdrant...")
    edu_dir = os.path.join(BASE_DIR, "data", "education")
    if not os.path.exists(edu_dir):
        print(f"[Ingest] Error: Directory {edu_dir} does not exist!")
        return

    files = sorted([f for f in os.listdir(edu_dir) if f.endswith(".md")])
    if not files:
        print("[Ingest] Error: No markdown files found in data/education!")
        return

    all_chunks = []
    for file_name in files:
        file_path = os.path.join(edu_dir, file_name)
        parsed = parse_markdown_with_frontmatter(file_path)
        chunks = chunk_markdown(parsed["frontmatter"], parsed["body"])
        all_chunks.extend(chunks)
        print(f"[Ingest] Parsed {file_name}: {len(chunks)} chunks generated.")

    print(f"[Ingest] Total chunks across all lessons: {len(all_chunks)}")
    
    # Generate vectors using CodeBERT
    print("[Ingest] Generating CodeBERT 768-dim embeddings...")
    vectors = []
    for i, chunk in enumerate(all_chunks):
        text_to_encode = f"Title: {chunk['title']}\nContent: {chunk['content']}"
        vec = encode_query(text_to_encode).astype('float32').tolist()
        vectors.append(vec)
        if (i + 1) % 10 == 0 or (i + 1) == len(all_chunks):
            print(f"[Ingest] Encoded {i + 1}/{len(all_chunks)} chunks...")

    # Upsert to Qdrant
    qdrant = QdrantVectorStore.get_instance()
    
    # Check Qdrant connection
    is_healthy = await qdrant.health_check()
    if not is_healthy:
        print("[Ingest] Warning: Cannot connect to Qdrant server right now. Make sure Qdrant is running on http://localhost:6333.")
        return

    # Recreate collection to ensure clean state
    await qdrant.delete_collection("blockchain_education")
    await qdrant.create_collection("blockchain_education", vector_size=768)

    print("[Ingest] Upserting points into Qdrant collection 'blockchain_education'...")
    await qdrant.upsert_documents(
        documents=all_chunks,
        vectors=vectors,
        collection_name="blockchain_education"
    )
    print("[Ingest] Ingestion completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
