import os
import sys
import io
import json
import pandas as pd
from glob import glob
import re
from typing import Tuple, Optional
import hashlib

def _get_api_key_from_file() -> Optional[str]:
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_file):
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if 'OPENAI_API_KEY' in line and '=' in line:
                        parts = line.split('=', 1)
                        if len(parts) == 2:
                            key_part = parts[0].strip()
                            if key_part == 'OPENAI_API_KEY':
                                value = parts[1].strip().strip('"').strip("'")
                                return value
        except Exception as e:
            pass
    config_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.json')
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config.get('openai_api_key') or config.get('OPENAI_API_KEY')
        except Exception:
            pass
    return None
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print('⚠️  OpenAI không khả dụng, sẽ sử dụng phương pháp regex fallback')
RAW_DIR = 'data/raw'
OUT_CSV = 'data/processed/findings.csv'
_extraction_cache = {}
_api_key_warning_shown = False
_llm_error_shown = False
_llm_disabled = False

def extract_code_with_llm(content: str, use_cache: bool=True) -> Tuple[str, str, str]:
    global _api_key_warning_shown, _llm_error_shown, _llm_disabled
    if _llm_disabled:
        return extract_contract_info_fallback(content)
    if not content or not OPENAI_AVAILABLE:
        return extract_contract_info_fallback(content)
    content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()
    if use_cache and content_hash in _extraction_cache:
        return _extraction_cache[content_hash]
    try:
        api_key = os.getenv('OPENAI_API_KEY') or os.getenv('OPENAI_KEY') or _get_api_key_from_file()
        if not api_key:
            if not _api_key_warning_shown:
                print('⚠️  OPENAI_API_KEY không được thiết lập, sử dụng fallback')
                print("   💡 Để sử dụng LLM, thiết lập biến môi trường: export OPENAI_API_KEY='your-key'")
                _api_key_warning_shown = True
            return extract_contract_info_fallback(content)
        client = OpenAI(api_key=api_key)
        content_truncated = content[:8000] if len(content) > 8000 else content
        prompt = f'Phân tích nội dung sau và trích xuất thông tin về smart contract code. \nNếu có code Solidity hoặc code liên quan, hãy trích xuất:\n1. Contract name (tên contract chính, ví dụ: SVFHook, CredibleAccountModule)\n2. Function name (tên function chính được đề cập, ví dụ: addLiquidity, configure)\n3. Code blocks (tất cả các đoạn code trong markdown code blocks ```)\n\nNếu KHÔNG có code, trả về JSON với các giá trị rỗng.\n\nTrả về JSON format:\n{{\n    "contract_name": "tên contract hoặc rỗng",\n    "function_name": "tên function hoặc rỗng", \n    "code": "toàn bộ code blocks nối lại bằng \\n\\n hoặc rỗng nếu không có code"\n}}\n\nNội dung cần phân tích:\n{content_truncated}\n\nChỉ trả về JSON, không có text thêm.'
        response = client.chat.completions.create(model='gpt-4o-mini', messages=[{'role': 'system', 'content': 'Bạn là một chuyên gia phân tích smart contract code. Trả về JSON chính xác.'}, {'role': 'user', 'content': prompt}], temperature=0.1, max_tokens=2000)
        result_text = response.choices[0].message.content.strip()
        if result_text.startswith('```'):
            result_text = re.sub('^```(?:json)?\\s*\\n', '', result_text)
            result_text = re.sub('\\n```\\s*$', '', result_text)
        result = json.loads(result_text)
        contract_name = result.get('contract_name', '').strip()
        function_name = result.get('function_name', '').strip()
        code = result.get('code', '').strip()
        if use_cache:
            _extraction_cache[content_hash] = (contract_name, function_name, code)
        return (contract_name, function_name, code)
    except json.JSONDecodeError as e:
        if not _llm_error_shown:
            print(f'⚠️  Lỗi parse JSON từ LLM: {e}')
            _llm_error_shown = True
        return extract_contract_info_fallback(content)
    except Exception as e:
        error_msg = str(e)
        is_critical_error = '429' in error_msg or 'insufficient_quota' in error_msg.lower() or 'quota' in error_msg.lower() or ('rate_limit' in error_msg.lower()) or ('too_many_requests' in error_msg.lower())
        if is_critical_error:
            _llm_disabled = True
            if not _llm_error_shown:
                print(f'⚠️  Lỗi nghiêm trọng khi gọi LLM: {error_msg}')
                print('   → Đã vượt quá quota/rate limit của OpenAI API')
                print('   → Tự động chuyển sang phương pháp regex fallback cho tất cả files còn lại...')
                print('   💡 Để sử dụng LLM, vui lòng:')
                print('      - Kiểm tra quota tại: https://platform.openai.com/account/billing')
                print('      - Hoặc đợi một lúc rồi thử lại')
                _llm_error_shown = True
        elif not _llm_error_shown:
            print(f'⚠️  Lỗi khi gọi LLM: {error_msg}')
            if '401' in error_msg or 'invalid_api_key' in error_msg or 'Incorrect API key' in error_msg:
                print('   💡 Vui lòng kiểm tra lại OPENAI_API_KEY trong file .env')
                print("   💡 OpenAI API key thường bắt đầu bằng 'sk-'")
                print('   💡 Lấy API key tại: https://platform.openai.com/account/api-keys')
            print('   → Đang sử dụng phương pháp regex fallback cho file này...')
            _llm_error_shown = True
        return extract_contract_info_fallback(content)

def extract_contract_info_fallback(content: str) -> Tuple[str, str, str]:
    contract_name = ''
    function_name = ''
    code = ''
    if not content:
        return (contract_name, function_name, code)
    contract_match = re.search('`([A-Z][a-zA-Z0-9_]+)`|"([A-Z][a-zA-Z0-9_]+)"', content)
    if contract_match:
        contract_name = contract_match.group(1) or contract_match.group(2) or ''
    func_match = re.search('`([a-z][a-zA-Z0-9_]+)\\(\\)`|function\\s+([a-z][a-zA-Z0-9_]+)', content, re.IGNORECASE)
    if func_match:
        function_name = func_match.group(1) or func_match.group(2) or ''
    code_blocks_with_lang = re.findall('```(?:solidity|javascript|typescript|python|rust|go|java|cpp|c\\+\\+|c|shell|bash)\\s*\\n([\\s\\S]*?)```', content, re.IGNORECASE)
    all_code_blocks = re.findall('```[^\\n]*\\n([\\s\\S]*?)```', content)
    code_blocks = code_blocks_with_lang if code_blocks_with_lang else all_code_blocks
    if not code_blocks:
        raw_solidity = re.findall('(contract\\s+[A-Z][a-zA-Z0-9_]*\\s*\\{[\\s\\S]{20,2000})', content)
        if raw_solidity:
            code_blocks = raw_solidity
    if code_blocks:
        cleaned_blocks = []
        for block in code_blocks[:5]:
            cleaned = block.strip()
            if 20 <= len(cleaned) <= 10000:
                cleaned_blocks.append(cleaned)
        if cleaned_blocks:
            code = '\n\n---\n\n'.join(cleaned_blocks)
    return (contract_name, function_name, code)

def extract_contract_info(content: str, use_llm: bool=True, use_cache: bool=True) -> Tuple[str, str, str]:
    global _llm_disabled
    if use_llm and OPENAI_AVAILABLE and (not _llm_disabled):
        return extract_code_with_llm(content, use_cache)
    else:
        return extract_contract_info_fallback(content)

def jsons_to_csv(raw_dir=RAW_DIR, out_csv=OUT_CSV, use_llm: bool=True, use_cache: bool=True):
    rows = []
    files = glob(os.path.join(raw_dir, '*.json'))
    processed = 0
    for p in files:
        try:
            with open(p, 'r', encoding='utf-8') as f:
                j = json.load(f)
        except Exception as e:
            print(f'Lỗi khi đọc file {p}: {e}')
            continue
        content = j.get('content', '')
        contract_name, function_name, code = extract_contract_info(content, use_llm=use_llm, use_cache=use_cache)
        code_cleaned = code.strip() if code else ''
        if not code_cleaned:
            processed += 1
            if processed % 50 == 0:
                print(f'  Đã xử lý {processed}/{len(files)} files...')
            continue
        impact = j.get('impact', '')
        vulnerability_label = impact if impact else 'UNKNOWN'
        row = {'id': j.get('id'), 'title': j.get('title', ''), 'content': content, 'impact': impact, 'protocol_id': j.get('protocol_id'), 'auditfirm_id': j.get('auditfirm_id'), 'contract_name': contract_name, 'function_name': function_name, 'code': code_cleaned, 'vulnerability_label': vulnerability_label, 'protocol_name': j.get('protocol_name', ''), 'firm_name': j.get('firm_name', '')}
        rows.append(row)
        processed += 1
        if processed % 50 == 0:
            print(f'  Đã xử lý {processed}/{len(files)} files...')
    df = pd.DataFrame(rows)
    total_processed = processed
    total_with_code = len(df)
    skipped = total_processed - total_with_code
    if len(df) == 0:
        print(f'\n⚠️  CẢNH BÁO: Không có dòng nào có code sau khi xử lý!')
        print(f'   Đã xử lý {total_processed} files, nhưng không tìm thấy code trong bất kỳ file nào.')
        print(f'   Vui lòng kiểm tra:')
        print(f'   - OPENAI_API_KEY đã được thiết lập chưa?')
        print(f'   - Các file JSON có chứa code blocks không?')
        return df
    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    df.to_csv(out_csv, index=False, encoding='utf-8')
    print(f'\n✓ Đã ghi {len(df)} dòng CÓ CODE vào {out_csv}')
    print(f'  - Tổng số files đã xử lý: {total_processed}')
    print(f'  - Files có code: {total_with_code} ({total_with_code / total_processed * 100:.1f}%)')
    print(f'  - Files bỏ qua (không có code): {skipped} ({skipped / total_processed * 100:.1f}%)')
    print(f"  - Có contract_name: {df['contract_name'].notna().sum()} ({df['contract_name'].notna().sum() / len(df) * 100:.1f}%)")
    print(f"  - Có function_name: {df['function_name'].notna().sum()} ({df['function_name'].notna().sum() / len(df) * 100:.1f}%)")
    print(f"  - Tất cả dòng đều có code: {df['code'].notna().sum()} ({df['code'].notna().sum() / len(df) * 100:.1f}%)")
    return df
if __name__ == '__main__':
    jsons_to_csv()
