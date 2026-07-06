import os
import pandas as pd
import json
from typing import List, Dict
OUT_CSV = 'data/synthetic/gen_synthetic_findings.csv'
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print('⚠️  OpenAI không được cài đặt. Sử dụng local model.')
try:
    from transformers import pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print('⚠️  Transformers không được cài đặt.')
PROMPT_TEMPLATE = 'Generate a realistic smart contract security finding in JSON format with the following structure:\n{\n  "title": "Short title of the vulnerability",\n  "content": "Detailed description of the vulnerability (2-4 sentences). Include contract name, function name, and code snippet if relevant.",\n  "impact": "LOW or MEDIUM or HIGH",\n  "contract_name": "Name of the contract",\n  "function_name": "Name of the vulnerable function",\n  "code": "Code snippet showing the vulnerability",\n  "vulnerability_label": "Type of vulnerability (e.g., REENTRANCY, OVERFLOW, ACCESS_CONTROL)"\n}\n\nFocus on common smart contract vulnerabilities like:\n- Reentrancy attacks\n- Integer overflow/underflow\n- Access control issues\n- Unchecked external calls\n- Front-running vulnerabilities\n- Gas optimization issues\n\nGenerate only the JSON object, no additional text.'

def generate_with_openai(n=50, model='gpt-3.5-turbo'):
    if not OPENAI_AVAILABLE:
        raise ImportError('OpenAI package không được cài đặt')
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError('OPENAI_API_KEY environment variable chưa được set')
    openai.api_key = api_key
    outputs = []
    print(f'Đang sinh {n} samples bằng OpenAI {model}...')
    for i in range(n):
        try:
            response = openai.ChatCompletion.create(model=model, messages=[{'role': 'system', 'content': 'You are an expert in smart contract security.'}, {'role': 'user', 'content': PROMPT_TEMPLATE}], temperature=0.8, max_tokens=500)
            generated_text = response.choices[0].message.content.strip()
            try:
                if generated_text.startswith('```'):
                    generated_text = generated_text.split('```')[1]
                    if generated_text.startswith('json'):
                        generated_text = generated_text[4:]
                finding = json.loads(generated_text)
                finding['id'] = 90000 + i
                finding['protocol_id'] = 9999
                finding['auditfirm_id'] = 99
                outputs.append(finding)
            except json.JSONDecodeError:
                print(f'⚠️  Không parse được JSON từ sample {i + 1}, bỏ qua')
                continue
        except Exception as e:
            print(f'⚠️  Lỗi khi sinh sample {i + 1}: {e}')
            continue
    print(f'✓ Đã sinh {len(outputs)} samples thành công')
    return outputs

def generate_local(n=50):
    if not TRANSFORMERS_AVAILABLE:
        raise ImportError('Transformers package không được cài đặt')
    print(f'Đang tải model GPT-2...')
    gen = pipeline('text-generation', model='gpt2', device=-1)
    outputs = []
    print(f'Đang sinh {n} samples bằng local model...')
    for i in range(n):
        try:
            prompt = f'Smart contract vulnerability finding: {PROMPT_TEMPLATE[:100]}'
            o = gen(prompt, max_length=300, num_return_sequences=1, temperature=0.8, do_sample=True)[0]['generated_text']
            finding = {'id': 90000 + i, 'title': f'Synthetic Vulnerability {i + 1}', 'content': o[len(prompt):].strip()[:500], 'impact': ['LOW', 'MEDIUM', 'HIGH'][i % 3], 'contract_name': f'Contract_{i + 1}', 'function_name': f'function_{i + 1}', 'code': f'// Synthetic code snippet {i + 1}', 'vulnerability_label': ['REENTRANCY', 'OVERFLOW', 'ACCESS_CONTROL'][i % 3], 'protocol_id': 9999, 'auditfirm_id': 99}
            outputs.append(finding)
        except Exception as e:
            print(f'⚠️  Lỗi khi sinh sample {i + 1}: {e}')
            continue
    print(f'✓ Đã sinh {len(outputs)} samples thành công')
    return outputs

def generate_synthetic_data(n=50, use_openai=True, model='gpt-3.5-turbo'):
    if use_openai and OPENAI_AVAILABLE:
        outputs = generate_with_openai(n, model)
    elif TRANSFORMERS_AVAILABLE:
        print('⚠️  Sử dụng local model (chất lượng thấp hơn OpenAI)')
        outputs = generate_local(n)
    else:
        raise ImportError('Cần cài đặt OpenAI hoặc transformers package')
    if not outputs:
        raise ValueError('Không sinh được samples nào')
    df = pd.DataFrame(outputs)
    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    df.to_csv(OUT_CSV, index=False, encoding='utf-8')
    print(f'✓ Đã lưu {len(df)} synthetic samples vào {OUT_CSV}')
    return df
if __name__ == '__main__':
    use_openai = OPENAI_AVAILABLE and os.getenv('OPENAI_API_KEY') is not None
    if use_openai:
        print('Sử dụng OpenAI API...')
        generate_synthetic_data(n=50, use_openai=True)
    else:
        print('Sử dụng local model (GPT-2)...')
        generate_synthetic_data(n=50, use_openai=False)
