"""
Solidity-Aware Semantic Chunker
Extracts functions, modifiers, events, and preserves full logical context.
"""
import re
import pandas as pd
from typing import List, Dict, Any


def extract_solidity_functions(code: str) -> List[Dict[str, Any]]:
    """Parse Solidity code into logical boundaries (functions, modifiers, events)"""
    if not isinstance(code, str) or not code.strip():
        return []

    chunks = []
    lines = code.split("\n")
    current_chunk = []
    chunk_type = "general"
    chunk_name = "global"
    brace_count = 0
    in_unit = False
    start_line = 1

    # Pattern for Solidity block starts
    func_pattern = re.compile(r"^\s*(function|modifier|event|constructor)\s+([a-zA-Z0-9_]*)\s*\(")

    for idx, line in enumerate(lines):
        match = func_pattern.match(line)
        if match and not in_unit:
            in_unit = True
            start_line = idx + 1
            chunk_type = match.group(1)
            chunk_name = match.group(2) or "constructor"
            current_chunk = [line]
            brace_count = line.count("{") - line.count("}")
            continue

        if in_unit:
            current_chunk.append(line)
            brace_count += line.count("{") - line.count("}")
            if brace_count <= 0 and ("{" in "".join(current_chunk) or chunk_type == "event"):
                in_unit = False
                body = "\n".join(current_chunk).strip()
                if body:
                    chunks.append({
                        "name": chunk_name,
                        "type": chunk_type,
                        "code": body,
                        "start_line": start_line,
                        "end_line": idx + 1
                    })
                current_chunk = []
                brace_count = 0
        else:
            # Accumulate global/contract header code
            current_chunk.append(line)
            if len(current_chunk) >= 50:
                body = "\n".join(current_chunk).strip()
                if body:
                    chunks.append({
                        "name": "contract_header",
                        "type": "header",
                        "code": body,
                        "start_line": start_line,
                        "end_line": idx + 1
                    })
                current_chunk = []
                start_line = idx + 2

    # Flush remaining
    if current_chunk:
        body = "\n".join(current_chunk).strip()
        if body:
            chunks.append({
                "name": chunk_name if in_unit else "contract_footer",
                "type": chunk_type if in_unit else "footer",
                "code": body,
                "start_line": start_line,
                "end_line": len(lines)
            })

    return chunks


def semantic_chunk(df: pd.DataFrame) -> pd.DataFrame:
    """Apply semantic chunking to audit findings DataFrame"""
    print("[SemanticChunker] Processing DataFrame with Solidity AST rules...")
    chunked_rows = []

    for _, row in df.iterrows():
        title = str(row.get("title", ""))
        content = str(row.get("content", ""))
        code = str(row.get("code", ""))
        finding_id = row.get("id", "unknown")
        impact = str(row.get("impact", "MEDIUM"))
        contract_name = str(row.get("contract_name", "Unknown"))
        function_name = str(row.get("function_name", "Unknown"))

        # Parent chunk (Finding text explanation)
        parent_chunk = {
            "id": f"{finding_id}_parent",
            "title": title,
            "content": content[:1500],
            "code": code[:1000] if code else "",
            "chunk_type": "vulnerability_explanation",
            "impact": impact,
            "contract_name": contract_name,
            "function_name": function_name
        }
        chunked_rows.append(parent_chunk)

        # Child chunks (Semantic code blocks)
        if code and len(code.strip()) > 50:
            functions = extract_solidity_functions(code)
            if functions:
                for idx, func in enumerate(functions):
                    child_chunk = {
                        "id": f"{finding_id}_code_{idx}",
                        "title": f"{title} - {func['type']} {func['name']}",
                        "content": f"Mã nguồn [{func['type']}]: {func['name']} trong contract {contract_name}. {content[:300]}",
                        "code": func["code"],
                        "chunk_type": func["type"],
                        "impact": impact,
                        "contract_name": contract_name,
                        "function_name": func["name"]
                    }
                    chunked_rows.append(child_chunk)
            else:
                # Sliding window fallback for long unparsed code
                words = code.split()
                window_size = 250
                overlap = 50
                for i in range(0, len(words), window_size - overlap):
                    snippet = " ".join(words[i:i + window_size])
                    chunked_rows.append({
                        "id": f"{finding_id}_window_{i}",
                        "title": f"{title} - snippet",
                        "content": f"Đoạn mã contract {contract_name}. {content[:300]}",
                        "code": snippet,
                        "chunk_type": "code_snippet",
                        "impact": impact,
                        "contract_name": contract_name,
                        "function_name": function_name
                    })

    result_df = pd.DataFrame(chunked_rows)
    print(f"[SemanticChunker] Generated {len(result_df)} semantic chunks from {len(df)} original records.")
    return result_df
