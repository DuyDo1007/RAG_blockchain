"""
Universal Dynamic Test Runner Service for Lab Submissions (Python & Solidity/EVM Sandbox)
Executes student code against standardized unit tests and structural security rules without calling AI by default.
"""
import sys
import os
import ast
import re
import tempfile
import subprocess
from typing import Dict, Any

PYTHON_TEST_SUITES = {
    "lesson-01": """
import unittest
import hashlib
from datetime import datetime

# Execute student code above, then run unit tests below:
class TestLabSubmission(unittest.TestCase):
    def test_01_calculate_hash(self):
        try:
            b = Block(1, "test_data", "0")
        except NameError:
            self.fail("Không tìm thấy lớp `Block`. Bạn có xóa khai báo lớp Block không?")
        
        self.assertIsNotNone(b.hash, "Thuộc tính `self.hash` đang là None. Bạn đã viết lệnh trả về hash trong `calculate_hash()` chưa?")
        self.assertIsInstance(b.hash, str, f"Mã băm trả về phải là chuỗi (str), hiện tại nhận được {type(b.hash).__name__}")
        self.assertEqual(len(b.hash), 64, f"Mã băm SHA-256 phải có độ dài đúng 64 ký tự hex, hiện nhận được {len(b.hash)} ký tự ('{str(b.hash)[:15]}...')")
        
        expected_string = f"{b.index}{b.timestamp}{b.data}{b.previous_hash}"
        expected_hash = hashlib.sha256(expected_string.encode()).hexdigest()
        self.assertEqual(b.hash, expected_hash, f"Mã băm tính được ('{str(b.hash)[:15]}...') không khớp với công thức SHA-256 chuẩn")

    def test_02_add_block(self):
        try:
            bc = Blockchain()
        except NameError:
            self.fail("Không tìm thấy lớp `Blockchain`.")
            
        initial_len = len(bc.chain)
        bc.add_block("Transaction 1")
        self.assertEqual(len(bc.chain), initial_len + 1, f"Hàm `add_block()` phải thêm 1 block vào `self.chain`, độ dài mong muốn: {initial_len + 1}, nhận được: {len(bc.chain)}")
        last_block = bc.chain[-1]
        self.assertEqual(last_block.data, "Transaction 1", "Block mới thêm vào không chứa đúng dữ liệu data truyền vào")
        self.assertEqual(last_block.index, initial_len, f"Chỉ số index của block mới phải là {initial_len}")
        self.assertEqual(last_block.previous_hash, bc.chain[-2].hash, "Thuộc tính previous_hash của block mới phải bằng hash của block liền trước")

    def test_03_is_chain_valid(self):
        bc = Blockchain()
        bc.add_block("Data 1")
        bc.add_block("Data 2")
        self.assertTrue(bc.is_chain_valid(), "Hàm `is_chain_valid()` phải trả về True khi chuỗi block nguyên vẹn hợp lệ")
        
        # Tamper with block data using dynamic random string to prevent hardcoded bypasses
        import uuid
        tamper_str = f"Corrupt_{uuid.uuid4().hex}"
        bc.chain[1].data = tamper_str
        self.assertFalse(bc.is_chain_valid(), "Hàm `is_chain_valid()` phải phát hiện dữ liệu block bị sửa đổi bậy và trả về False")
        
        # Tamper with previous_hash connection
        bc.chain[1].data = "Data 1"
        bc.chain[1].hash = bc.chain[1].calculate_hash()
        bc.chain[2].previous_hash = f"Broken_{uuid.uuid4().hex}"
        self.assertFalse(bc.is_chain_valid(), "Hàm `is_chain_valid()` phải phát hiện liên kết previous_hash bị đứt gãy và trả về False")
        
        # Tamper with previous block hash directly to verify current.previous_hash == previous.hash logic
        bc2 = Blockchain()
        bc2.add_block("B1")
        bc2.chain[0].hash = f"FakeGen_{uuid.uuid4().hex}"
        self.assertFalse(bc2.is_chain_valid(), "Hàm `is_chain_valid()` phải kiểm tra liên kết `current.previous_hash == previous.hash` giữa block hiện tại và block liền trước")

if __name__ == '__main__':
    unittest.main(verbosity=2)
""",
    "lesson-08": """
import unittest
import uuid

class TestLesson08MEV(unittest.TestCase):
    def test_01_function_defined(self):
        self.assertTrue('detect_sandwich_attack' in globals() or 'analyze_mempool' in globals(), "Không tìm thấy hàm `detect_sandwich_attack(tx_list)`. Bạn đã đổi tên hoặc xóa hàm?")
    
    def test_02_sandwich_detection_logic(self):
        att = f"0xAtt_{uuid.uuid4().hex[:6]}"
        vic = f"0xVic_{uuid.uuid4().hex[:6]}"
        txs = [
            {"hash": "0x1", "sender": att, "gas_price": 100, "type": "buy"},
            {"hash": "0x2", "sender": vic, "gas_price": 50, "type": "buy"},
            {"hash": "0x3", "sender": att, "gas_price": 40, "type": "sell"}
        ]
        func = globals().get('detect_sandwich_attack') or globals().get('analyze_mempool')
        res = func(txs)
        self.assertIsNotNone(res, "Hàm `detect_sandwich_attack` trả về None khi có mẫu tấn công rõ ràng.")
        res_str = str(res)
        self.assertTrue(att in res_str or 'front_runner' in res_str.lower() or 'victim' in res_str.lower() or 'sandwich' in res_str.lower() or (isinstance(res, (list, tuple)) and len(res) > 0 and isinstance(res[0], dict) and res[0].get('front_runner') == txs[0]), "Không phát hiện chính xác mẫu tấn công Sandwich Attack.")

    def test_03_no_false_positive_and_anti_shortcut(self):
        func = globals().get('detect_sandwich_attack') or globals().get('analyze_mempool')
        # Check safe 2-item list
        safe_txs = [
            {"hash": "0x1", "sender": "0xA", "gas_price": 10, "type": "buy"},
            {"hash": "0x2", "sender": "0xB", "gas_price": 10, "type": "buy"}
        ]
        res = func(safe_txs)
        self.assertTrue(res is None or len(res) == 0 or res is False, "Hàm báo động nhầm với danh sách giao dịch bình thường.")
        
        # Anti-bypass fuzzing: Check safe 3-item list where gas prices or senders do NOT form a sandwich
        safe_3_txs = [
            {"hash": "0xa", "sender": "0xUser1", "gas_price": 10, "type": "buy"},
            {"hash": "0xb", "sender": "0xUser2", "gas_price": 12, "type": "buy"},
            {"hash": "0xc", "sender": "0xUser3", "gas_price": 8, "type": "sell"}
        ]
        res_fuzz = func(safe_3_txs)
        self.assertTrue(res_fuzz is None or len(res_fuzz) == 0 or res_fuzz is False, "Phát hiện lách luật: Hàm tự động báo cáo tấn công chỉ dựa vào độ dài list (`len == 3`) mà không kiểm tra logic Sandwich thực tế.")

if __name__ == '__main__':
    unittest.main(verbosity=2)
""",
    "lesson-09": """
import unittest
import uuid

class TestLesson09Phishing(unittest.TestCase):
    def test_01_function_defined(self):
        self.assertTrue('analyze_contract' in globals() or 'detect_phishing' in globals(), "Không tìm thấy hàm phân tích phishing (`analyze_contract` hoặc `detect_phishing`).")
    
    def test_02_approval_detection(self):
        rand_amt = f"9999{uuid.uuid4().int % 100000000}"
        mock_code = f"function exploit_phish(address token) public {{ IERC20(token).approve(msg.sender, {rand_amt}); setApprovalForAll(owner, true); }}"
        func = globals().get('analyze_contract') or globals().get('detect_phishing')
        res = func(mock_code)
        self.assertIsNotNone(res, "Hàm phân tích trả về None.")
        res_str = str(res).lower()
        self.assertTrue('approve' in res_str or 'approval' in res_str or 'phishing' in res_str or 'warning' in res_str or 'flag' in res_str or 'scam' in res_str, "Không phát hiện cảnh báo với hành vi gọi `approve` hoặc `setApprovalForAll` nguy hiểm.")

    def test_03_safe_contract_and_comment_fuzzing(self):
        safe_code = "contract Safe { function deposit() public payable {} }"
        func = globals().get('analyze_contract') or globals().get('detect_phishing')
        res = func(safe_code)
        self.assertTrue(res is None or len(res) == 0, "Hàm báo động nhầm khi hợp đồng an toàn không chứa hàm approve/setApprovalForAll.")
        
        # Anti-bypass check: approve word inside safe comments should not trigger naive `in` check if tested properly or ensure robust check
        safe_with_comment = "contract Safe { // remember never to approve unknown addresses\\n function withdraw() public {} }"
        res_c = func(safe_with_comment)
        # If student checks literally `"approve" in code`, flag bypass if also triggers UniversalBypasser
        if isinstance(func, type) or str(type(func)).find('Universal') != -1:
            self.fail("Phát hiện sử dụng Magic Class / Universal Callable lách luật.")

if __name__ == '__main__':
    unittest.main(verbosity=2)
""",
    "lesson-10": """
import unittest
import uuid

class TestLesson10Audit(unittest.TestCase):
    def test_01_audit_function(self):
        func = globals().get('audit_contract') or globals().get('run_audit')
        self.assertIsNotNone(func, "Không tìm thấy hàm `audit_contract`.")
        
    def test_02_detects_vulnerabilities_and_fuzzing(self):
        rand_cls = f"InsecureVault_{uuid.uuid4().hex[:6]}"
        mock_code_ts = f"contract {rand_cls} {{ function guess_dice() public {{ uint r = uint(keccak256(abi.encodePacked(block.timestamp))); }} }}"
        mock_code_ac = f"contract {rand_cls}_2 {{ function drain_vault() public {{ msg.sender.transfer(address(this).balance); }} }}"
        func = globals().get('audit_contract') or globals().get('run_audit')
        
        res1 = func(mock_code_ts)
        res1_str = str(res1).lower()
        self.assertTrue('timestamp' in res1_str or 'random' in res1_str or 'vulnerability' in res1_str, "Thiếu logic phát hiện lỗi Weak Randomness (`block.timestamp`).")
        # Anti-UniversalBypasser check: mock_code_ts must NOT report onlyowner/transfer when neither exists
        self.assertFalse('onlyowner' in res1_str or 'transfer' in res1_str, "Phát hiện lách luật (Universal Return/Shallow Shortcut): Trả về gộp cả lỗi Access Control cho hợp đồng chỉ bị lỗi Weak Randomness.")
        
        res2 = func(mock_code_ac)
        res2_str = str(res2).lower()
        self.assertTrue('onlyowner' in res2_str or 'access' in res2_str or 'vulnerability' in res2_str or 'transfer' in res2_str, "Thiếu logic phát hiện lỗi Access Control (`msg.sender.transfer` không bảo vệ).")

if __name__ == '__main__':
    unittest.main(verbosity=2)
""",
    "lesson-12": """
import unittest
import uuid

class TestLesson12RugPull(unittest.TestCase):
    def test_01_analyzer_exists(self):
        func = globals().get('analyze_token') or globals().get('check_rug_pull')
        self.assertIsNotNone(func, "Không tìm thấy hàm `analyze_token`.")
        
    def test_02_rug_pull_flags_and_fuzzing(self):
        func = globals().get('analyze_token') or globals().get('check_rug_pull')
        
        # Test case 1: High buy tax when liquidity is locked
        meta_high_tax = {
            "liquidity_locked": True,
            "owner_can_mint": False,
            "buy_tax": 95,
            "sell_tax": 5
        }
        res1 = func(meta_high_tax)
        self.assertIsNotNone(res1, "Hàm phân tích trả về None khi buy_tax cao.")
        self.assertTrue(any('tax' in str(r).lower() or 'buy' in str(r).lower() or 'scam' in str(r).lower() or 'rug' in str(r).lower() for r in res1), "Không phát hiện rủi ro khi buy_tax = 95%.")
        
        # Test case 2: Owner can mint when tax is normal
        meta_mint = {
            "liquidity_locked": True,
            "owner_can_mint": True,
            "buy_tax": 2,
            "sell_tax": 2
        }
        res2 = func(meta_mint)
        self.assertIsNotNone(res2, "Hàm phân tích trả về None khi owner_can_mint = True.")
        self.assertTrue(any('mint' in str(r).lower() or 'owner' in str(r).lower() or 'flag' in str(r).lower() for r in res2), "Không cắm cờ (red flag) khi owner_can_mint=True.")

    def test_03_safe_token_and_anti_universal(self):
        safe_meta = {
            "liquidity_locked": True,
            "owner_can_mint": False,
            "buy_tax": 2,
            "sell_tax": 2
        }
        func = globals().get('analyze_token') or globals().get('check_rug_pull')
        res = func(safe_meta)
        self.assertTrue(res is None or len(res) == 0, "Hàm báo động nhầm (false positive) với token an toàn.")
        # Check against UniversalBypasser / Duck Typing return all
        if str(res).lower().find('scam') != -1 or str(res).lower().find('rug') != -1:
            self.fail("Phát hiện lách luật bằng đối tượng Universal Return trả về từ khóa cho mọi input.")

if __name__ == '__main__':
    unittest.main(verbosity=2)
"""
}


def run_python_lab_tests(lesson_id: str, code: str, starter_code: str = "") -> Dict[str, Any]:
    """
    Dynamically executes Python code + test suite inside a safe subprocess.
    Returns standard result dict with pass status and full traceback if failed.
    """
    # 1. Check syntax first via ast
    try:
        ast.parse(code)
    except SyntaxError as se:
        return {
            "passed": False,
            "score": 0,
            "security_review": f"[FAIL] Lỗi cú pháp Python (SyntaxError): {se.msg} tại dòng {se.lineno}",
            "logs": [
                {"msg": f"[Syntax Error] Dòng {se.lineno}: {se.msg}", "type": "error"},
                {"msg": "💡 Nhấn nút 'AI Mentor / Phân tích lỗi' bên dưới để được hướng dẫn sửa lỗi cú pháp!", "type": "warning"}
            ],
            "traceback": f"SyntaxError: {se.msg} (line {se.lineno})"
        }

    # 1.5. Check for adversarial Scope Poisoning / Monkeypatching & illegal overrides
    forbidden_py_patterns = [
        'unittest.TestCase', 'unittest.', 'TestCase.', 'sys.settrace', 'sys.modules', 
        'hashlib.sha256 =', 'hashlib.sha256=', 'TestLabSubmission', '__eq__ = lambda', '__eq__=lambda',
        'UniversalPythonBypasser', 'UniversalMeta', 'UniversalAuditResult', 'UniversalRugResult',
        'AlwaysMatchString', 'RugDetector', 'builtins.', 'setattr(sys', 'setattr(hashlib', 
        'inspect.stack()', 'metaclass=', '__import__(', '.__call__'
    ]
    if any(p in code for p in forbidden_py_patterns):
        return {
            "passed": False,
            "score": 0,
            "security_review": "[FAIL Security Check] Phát hiện mã nguồn chứa hành vi can thiệp/đầu độc bộ kiểm thử hoặc sử dụng Magic Class lách luật.",
            "logs": [{"msg": "[Security Guard] Phát hiện nỗ lực can thiệp bộ kiểm thử (Metaprogramming/Monkeypatching).", "type": "error"}],
            "traceback": "SecurityError: Attempted to monkeypatch or use metaprogramming bypass hooks."
        }

    # 1.6. Check for hardcoded test inputs / dummy output overrides & shallow string shortcuts
    forbidden_hardcodes = [
        '0xAttacker', '999999999999', 'contract Vuln', 'attack(address token)', 'transfer(address(this).balance)', 
        "buy_tax') == 25", "buy_tax')==25", "sell_tax') == 50", "'attacker': 'dummy'", "'front_runner': None", 
        "is_chain_valid = lambda", "detect_sandwich_attack = lambda", "analyze_contract = lambda", 
        "audit_contract = lambda", "analyze_token = lambda", "is_chain_valid(self): return True", 
        "return ['timestamp']", "return ['vulnerability']", "return ['liquidity']", "return ['rug']", 
        "return ['phishing detected']", "phishing warning: approve detected", "tax rug mint flag",
        "timestamp vulnerability access onlyowner transfer"
    ]
    if any(k in code for k in forbidden_hardcodes):
        return {
            "passed": False,
            "score": 0,
            "security_review": "[FAIL Logic Check] Phát hiện mã nguồn hardcode hằng số kiểm thử hoặc trả về kết quả giả lập cố định.",
            "logs": [{"msg": "[Logic Guard] Phát hiện hành vi hardcode đáp án kiểm thử.", "type": "error"}],
            "traceback": "LogicError: Code hardcodes test outputs instead of implementing real check."
        }

    # 1.7 Check for AST shallowness (1-line ternary shortcut avoiding actual logic parsing)
    try:
        parsed_ast = ast.parse(code)
        for node in ast.walk(parsed_ast):
            if isinstance(node, ast.FunctionDef) and node.name in ['detect_sandwich_attack', 'analyze_mempool', 'analyze_contract', 'detect_phishing', 'audit_contract', 'run_audit', 'analyze_token', 'check_rug_pull']:
                # If function body only contains 1 return statement with simple if/else expression returning constants
                if len(node.body) == 1 and isinstance(node.body[0], ast.Return):
                    ret_val = node.body[0].value
                    if isinstance(ret_val, ast.IfExp) and isinstance(ret_val.body, (ast.Constant, ast.Dict, ast.List)):
                        # Flag single-line ternary guessing without any real loop/processing
                        if any(scam_word in code for scam_word in ['if len(', 'in code', 'in meta']):
                            return {
                                "passed": False,
                                "score": 0,
                                "security_review": "[FAIL Logic Check] Phát hiện triển khai shortcut 1 dòng lách luật (Shallow Ternary Return) thay vì phân tích mã nguồn/dữ liệu thực tế.",
                                "logs": [{"msg": "[AST Guard] Chặn giải pháp lách luật bằng cú pháp rút gọn phi logic.", "type": "error"}],
                                "traceback": "LogicError: Shallow ternary return detected without real analysis logic."
                            }
    except Exception:
        pass

    # 2. Check if unmodified or unfinished TODO
    clean_c = re.sub(r'\s+', '', code)
    clean_s = re.sub(r'\s+', '', starter_code) if starter_code else ""
    if (clean_s and clean_c == clean_s and len(clean_s) > 5) or '#TODO' in clean_c.upper() or clean_c in ['defsolution():pass', 'defsolve():pass', 'pass', 'classBlock:passclassBlockchain:pass']:
        return {
            "passed": False,
            "score": 10,
            "security_review": "[FAIL] Mã nguồn chưa thay đổi so với Starter Code hoặc chỉ chứa khung hàm rỗng (`pass`). Hãy viết logic sửa lỗi!",
            "logs": [{"msg": "[Sanity Check] Mã nguồn chưa chỉnh sửa hoặc chưa hoàn thiện logic.", "type": "error"}],
            "traceback": "Error: Code is unmodified or unfinished TODO."
        }

    test_script = PYTHON_TEST_SUITES.get(lesson_id)
    if not test_script:
        # Generic Python test runner for any lesson-XX not mapped explicitly
        test_script = """
import unittest
class TestGenericPythonLab(unittest.TestCase):
    def test_code_compiles_and_runs(self):
        self.assertTrue(True, "Code compiled and executed cleanly.")
if __name__ == '__main__':
    unittest.main(verbosity=2)
"""

    combined = code + "\n\n" + test_script
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as tf:
        tf.write(combined)
        temp_path = tf.name

    try:
        env = dict(os.environ)
        env["PYTHONIOENCODING"] = "utf-8"
        result = subprocess.run(
            [sys.executable, temp_path],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=env,
            timeout=10
        )

        passed = (result.returncode == 0)
        output = result.stdout + "\n" + result.stderr
        clean_output = output.replace(temp_path, "submission.py")

        if passed:
            logs = [
                {"msg": "[Sandbox Runner] Khởi chạy bộ kiểm thử Unit Test cho mã nguồn Python...", "type": "info"},
                {"msg": "[PASS] Chúc mừng! Toàn bộ các testcase kiểm định đều vượt qua thành công!", "type": "success"}
            ]
            review = "Mã nguồn xuất sắc! Bạn đã triển khai chính xác tất cả các yêu cầu logic của bài lab."
            score = 100
        else:
            lines = [l.strip() for l in clean_output.split("\n") if l.strip()]
            summary_err = "Lỗi kiểm thử Unit Test Python"
            for line in lines:
                if any(line.startswith(prefix) for prefix in ["FAIL:", "ERROR:", "AssertionError:", "SyntaxError:", "IndentationError:", "NameError:", "TypeError:", "AttributeError:"]):
                    summary_err = line
                    break

            logs = [
                {"msg": "[Sandbox Runner] Khởi chạy bộ kiểm thử Unit Test...", "type": "info"},
                {"msg": f"[FAIL Testcase] {summary_err}", "type": "error"},
                {"msg": "💡 Nhấn nút 'AI Mentor / Phân tích lỗi' bên dưới để nhờ giảng viên AI giải thích chi tiết lý do và hướng dẫn sửa đổi!", "type": "warning"}
            ]
            review = f"Mã nguồn chưa vượt qua bộ kiểm thử Unit Test: {summary_err}"
            score = 0

        return {
            "passed": passed,
            "score": score,
            "security_review": review,
            "logs": logs,
            "traceback": clean_output.strip() if not passed else ""
        }

    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "score": 0,
            "security_review": "[FAIL] Thời gian thực thi vượt quá giới hạn (Timeout 10s). Có thể mã của bạn bị lặp vô hạn.",
            "logs": [
                {"msg": "[Timeout Error] Mã nguồn chạy quá 10 giây và bị buộc dừng.", "type": "error"}
            ],
            "traceback": "TimeoutExpired: Quá thời gian thực thi tối đa 10 giây. Vui lòng kiểm tra lại vòng lặp while/for."
        }
    except Exception as e:
        return {
            "passed": False,
            "score": 0,
            "security_review": f"[System Error] Lỗi hệ thống kiểm thử: {str(e)}",
            "logs": [
                {"msg": f"[System Error] {str(e)}", "type": "error"}
            ],
            "traceback": str(e)
        }
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


def run_solidity_lab_tests(lesson_id: str, code: str, starter_code: str = "") -> Dict[str, Any]:
    """
    Standardized Structural & Security Verification Engine for Solidity/EVM Labs.
    Performs deterministic check on contract structure and security patterns without calling AI.
    """
    def strip_sol_comments_and_strings(text: str) -> str:
        # Remove multi-line comments /* ... */
        text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
        # Remove single-line comments // ...
        text = re.sub(r'//.*', '', text)
        # Replace string literals with empty strings to prevent string evasion
        text = re.sub(r'".*?"', '""', text)
        text = re.sub(r"'.*?'", "''", text)
        return text

    clean_raw = strip_sol_comments_and_strings(code)
    clean = re.sub(r'\s+', '', clean_raw)
    clean_starter = re.sub(r'\s+', '', starter_code) if starter_code else ""

    # 1. Basic Syntax / Brace matching check
    open_braces = code.count('{')
    close_braces = code.count('}')
    if open_braces != close_braces:
        return {
            "passed": False,
            "score": 0,
            "security_review": f"[FAIL] Lỗi cú pháp Solidity: Số lượng ngoặc nhọn mở ({open_braces}) và đóng ({close_braces}) không khớp nhau.",
            "logs": [
                {"msg": "[Compiler Error] Mất cân bằng dấu ngoặc nhọn `{}`.", "type": "error"},
                {"msg": "💡 Nhấn nút 'AI Mentor / Phân tích lỗi' bên dưới để nhờ giảng viên AI kiểm tra cú pháp!", "type": "warning"}
            ],
            "traceback": f"SyntaxError: Unbalanced braces (open: {open_braces}, close: {close_braces})"
        }

    if not any(k in clean for k in ['contract', 'library', 'interface']):
        return {
            "passed": False,
            "score": 0,
            "security_review": "[FAIL] Lỗi cú pháp Solidity: Không tìm thấy khai báo `contract`, `library` hay `interface`.",
            "logs": [{"msg": "[Compiler Error] Thiếu từ khóa định nghĩa hợp đồng thông minh.", "type": "error"}],
            "traceback": "SyntaxError: Missing contract/library/interface definition."
        }

    # 2. Check unmodified starter code
    if (clean_starter and clean == clean_starter and len(clean_starter) > 5) or clean in ['contractStarter{}', 'contract{}', 'contractNewFutureLab{}', 'contractAttack{}'] or len(clean) < 25:
        return {
            "passed": False,
            "score": 10,
            "security_review": "[FAIL] Mã nguồn chưa thay đổi so với Starter Code hoặc chưa có logic. Bạn cần vá lỗ hổng hoặc viết logic bài lab!",
            "logs": [{"msg": "[Sanity Check] Mã nguồn chưa chỉnh sửa so với đề bài ban đầu.", "type": "error"}],
            "traceback": "Error: Code is unmodified from starter template."
        }

    # 2.5. Check if student left TODO comments or incomplete stubs inside the code
    if '//TODO' in code or '/*TODO*/' in code or '#TODO' in code or '// TODO' in code:
        return {
            "passed": False,
            "score": 10,
            "security_review": "[FAIL] Vẫn còn phần TODO chưa được hoàn thiện trong mã nguồn.",
            "logs": [{"msg": "[Compiler Check] Phát hiện comment TODO chưa thay thế bằng logic thực tế.", "type": "error"}],
            "traceback": "AssertionError: Vẫn còn phần TODO chưa được hoàn thiện trong hợp đồng."
        }

    # 2.7. Check universal logic evasion & dead/unsafe patterns across Solidity
    if any(bad in clean for bad in ['||true', '||1==1', '!=owner', 'require(true)', 'return0;']):
        return {
            "passed": False,
            "score": 0,
            "security_review": "[FAIL Security Guard] Phát hiện điều kiện logic lách luật (`|| true`, `!= owner` hoặc trả về rỗng).",
            "logs": [{"msg": "[Security Check] Phát hiện biểu thức logic lách luật trong hợp đồng.", "type": "error"}],
            "traceback": "SecurityError: Evasive logic pattern detected."
        }

    # 2.8. Solidity Semantic & Structural Check Engine (`Sample 66 - Sample 110`)
    # Extract function definitions: function foo(...) [modifiers/visibility] { body }
    func_matches = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\([^\)]*\)[^\{]*\{([^\}]*)\}', clean_raw)
    for fname, fbody in func_matches:
        bclean = re.sub(r'\s+', '', fbody)
        # If function is critical and body is empty
        if fname in ['set', 'get', 'withdraw', 'attack', 'buy', 'borrow', 'liquidate', 'receiveMessage', 'upgrade', 'deposit'] and not bclean:
            return {
                "passed": False,
                "score": 0,
                "security_review": f"[FAIL Solc Semantic Check] Hàm `{fname}` có phần thân rỗng (empty body), không thực thi bất kỳ logic nào.",
                "logs": [{"msg": f"[Solc Semantic Check] Hàm `{fname}` rỗng phi logic.", "type": "error"}],
                "traceback": f"SemanticError: Function {fname} has empty body."
            }
        # Check if body only has a dead expression (e.g. `storedValue;`, `COLLATERAL_RATIO;`, `!processedMessages[msgHash];`)
        if bclean and not any(op in bclean for op in ['=', 'require(', 'return', 'emit', 'revert(', 'transfer(', 'send(', 'call{', 'deposit{', '.withdraw(', '.flashLoan(', '++', '--', '+=', '-=']):
            return {
                "passed": False,
                "score": 0,
                "security_review": f"[FAIL Solc Semantic Check] Hàm `{fname}` chứa câu lệnh vô nghĩa không có tác dụng (`{fbody.strip()}`).",
                "logs": [{"msg": f"[Solc Semantic Check] Phát hiện biểu thức vô nghĩa (No-op expression) trong `{fname}`.", "type": "error"}],
                "traceback": f"SemanticError: Function {fname} has dead expression."
            }

    # 3. Lesson-specific exact verification rules
    errors = []
    if lesson_id == "lesson-02":
        if not ('address' in clean and 'owner' in clean and ('addressowner' in clean or 'addresspublicowner' in clean or 'addressprivateowner' in clean)):
            errors.append("AssertionError: [Lesson 02] Thiếu khai báo biến trạng thái `address public owner;`.")
        if not re.search(r'functionset\([^\)]*\)[^\{]*((onlyOwner)|(\{require\(msg\.sender==owner\)))', clean):
            errors.append("AssertionError: [Lesson 02] Hàm `set(uint256)` chưa áp dụng modifier `onlyOwner` hoặc `require(msg.sender == owner)`.")
        if not ('functionget()' in clean and 'returnstoredValue' in clean):
            errors.append("AssertionError: [Lesson 02] Hàm `get()` chưa trả về `storedValue`.")
        if 'uint256storedValue=' in clean or 'uintstoredValue=' in clean:
            errors.append("AssertionError: [Lesson 02] Phát hiện khai báo cục bộ (`uint256 storedValue`) che khuất (shadowing) biến trạng thái.")
        if not ('modifieronlyOwner()' in clean and 'msg.sender==owner' in clean):
            errors.append("AssertionError: [Lesson 02] Modifier `onlyOwner` chưa định nghĩa điều kiện `require(msg.sender == owner)`.")
        if not ('storedValue=_value' in clean or 'storedValue=value' in clean or 'storedValue=v' in clean or ('storedValue=' in clean and 'functionset(' in clean)):
            errors.append("AssertionError: [Lesson 02] Hàm `set()` chưa gán giá trị vào biến `storedValue`.")

    elif lesson_id == "lesson-03":
        fb_idx = clean.find('fallback()externalpayable')
        if fb_idx != -1:
            if 'bank.withdraw()' not in clean[fb_idx:] and 'withdraw()' not in clean[fb_idx:]:
                errors.append("AssertionError: [Lesson 03] Hàm `fallback()` chưa gọi lại `bank.withdraw()` để kích hoạt tấn công tái nhập (Reentrancy).")
            if not ('bank.deposit{' in clean or 'deposit{' in clean):
                errors.append("AssertionError: [Lesson 03] Hàm `attack()` thiếu lệnh gửi tiền (`deposit`) vào ngân hàng trước khi rút.")
            if 'address(0)' in clean or 'value:0' in clean or 'revert(' in clean[fb_idx:]:
                errors.append("AssertionError: [Lesson 03] Phát hiện lời gọi hàm tới địa chỉ 0, value 0 hoặc revert sai logic trong fallback.")
            if not ('balance>0' in clean[fb_idx:] or 'balance>=' in clean[fb_idx:] or 'bank.balance' in clean[fb_idx:]):
                errors.append("AssertionError: [Lesson 03] Hàm `fallback()` chưa kiểm tra số dư (`balance > 0`) trước khi gọi `bank.withdraw()` để tránh lặp vô hạn.")
        else:
            if not ('require(!locked' in clean or 'require(locked==false' in clean or 'locked=true' in clean or '_status==1' in clean):
                errors.append("AssertionError: [Lesson 03] Modifier `nonReentrant` chưa có cơ chế khóa (`require(!locked)` và `locked = true`).")
            if not re.search(r'functionwithdraw\(.*\)publicnonReentrant', clean) and not re.search(r'functionwithdraw\(.*\)externalnonReentrant', clean) and not re.search(r'functionwithdraw\(.*\)nonReentrant', clean):
                errors.append("AssertionError: [Lesson 03] Hàm `withdraw()` chưa được gắn chính xác modifier `nonReentrant`.")

    elif lesson_id == "lesson-04":
        if not ('SafeMath' in clean or 'usingSafeMathfor' in clean or '0.8.' in clean or 'mul(' in clean or 'add(' in clean):
            errors.append("AssertionError: [Lesson 04] Mã nguồn chưa áp dụng SafeMath hoặc compiler >= 0.8.0 để chống tràn số (Integer Overflow).")
        if 'unchecked{' in clean or ('0.4.' in clean and 'SafeMath' not in clean):
            errors.append("AssertionError: [Lesson 04] Vẫn còn khối `unchecked { ... }` hoặc compiler cũ vô hiệu hóa bảo vệ chống tràn số.")
        buy_idx = clean.find('functionbuy(')
        if buy_idx != -1 and not ('0.8.' in clean) and not ('.mul(' in clean[buy_idx:] or 'mul(' in clean[buy_idx:]):
            errors.append("AssertionError: [Lesson 04] Hàm `buy` chưa sử dụng hàm `.mul()` của SafeMath khi nhân số lượng.")

    elif lesson_id == "lesson-05":
        if any(bad in clean for bad in ['tx.origin', 'origin()', 'caller()']):
            errors.append("AssertionError: [Lesson 05] Vẫn còn sử dụng `tx.origin` hoặc assembly `origin()` nguy hiểm.")
        if not re.search(r'functionwithdraw\([^\)]*\)[^\{]*((onlyOwner)|(\{require\(msg\.sender==owner\)))', clean):
            errors.append("AssertionError: [Lesson 05] Hàm `withdraw()` chưa được bảo vệ quyền truy cập bằng `msg.sender == owner` hoặc `onlyOwner`.")

    elif lesson_id == "lesson-06":
        if not ('lender.flashLoan(' in clean or 'flashLoan(' in clean):
            errors.append("AssertionError: [Lesson 06] Thiếu lời gọi hàm `lender.flashLoan()` để khởi tạo vay nhanh.")
        if not ('onFlashLoan' in clean and 'ERC3156' in code) or 'WRONG_MAGIC_VALUE' in code:
            errors.append("AssertionError: [Lesson 06] Thiếu callback `onFlashLoan` hoặc trả về sai magic value (`keccak256(...)`).")
        if 'address(0)' in clean or 'revert(' in clean or 'Keeps money' in code or 'no repayment' in code:
            errors.append("AssertionError: [Lesson 06] Phát hiện lời gọi địa chỉ 0, revert hoặc thiếu bước hoàn trả tiền vay trong flash loan.")

    elif lesson_id == "lesson-07":
        if not (('cumulativePrice' in clean or 'price0Cumulative' in clean or 'priceAverage' in clean) and ('/timeElapsed' in clean or '/period' in clean)):
            errors.append("AssertionError: [Lesson 07] Công thức tính TWAP trung bình theo thời gian chưa chính xác hoặc thiếu chia cho `timeElapsed`.")
        if 'timeElapsed=0' in clean or '/0' in clean or 'timeElapsed/cumulativePrice' in clean or 'timeElapsed/price0Cumulative' in clean or 'unchecked{' in clean:
            errors.append("AssertionError: [Lesson 07] Phát hiện lỗi chia cho 0, khối unchecked hoặc đảo ngược công thức TWAP.")
        pa_idx = clean.find('priceAverage=')
        if pa_idx == -1 or not ('/timeElapsed' in clean[pa_idx:pa_idx+150] or '/period' in clean[pa_idx:pa_idx+150]):
            errors.append("AssertionError: [Lesson 07] Biến `priceAverage` chưa được gán giá trị chính xác từ công thức `cumulativePrice / timeElapsed`.")

    elif lesson_id == "lesson-11":
        bor_idx = clean.find('functionborrow(')
        liq_idx = clean.find('functionliquidate(')
        if bor_idx == -1 or not ('maxBorrow' in clean[bor_idx:] or 'COLLATERAL_RATIO' in clean[bor_idx:]):
            errors.append("AssertionError: [Lesson 11] Hàm `borrow` chưa kiểm tra hạn mức vay dựa trên tỷ lệ tài sản thế chấp (Collateral Ratio).")
        if liq_idx == -1 or not ('LIQUIDATION_THRESHOLD' in clean[liq_idx:] or 'healthFactor' in clean[liq_idx:]):
            errors.append("AssertionError: [Lesson 11] Hàm `liquidate` chưa kiểm tra điều kiện `healthFactor < LIQUIDATION_THRESHOLD` trước khi thanh lý.")
        if any(bad in clean for bad in ['amount>=maxBorrow', 'amount>maxBorrow', 'healthFactor(user)>LIQUIDATION_THRESHOLD', 'healthFactor>LIQUIDATION_THRESHOLD', 'COLLATERAL_RATIO=1000']):
            errors.append("AssertionError: [Lesson 11] Phát hiện bất phương trình đảo ngược logic hoặc hạn mức thế chấp sai lệch.")

    elif lesson_id == "lesson-13":
        call_idx = clean.find('msg.sender.call')
        shares_idx = clean.find('totalShares-=') if 'totalShares-=' in clean else clean.find('balance-=')
        if not (shares_idx != -1 and call_idx != -1 and shares_idx < call_idx):
            errors.append("AssertionError: [Lesson 13] Vi phạm Checks-Effects-Interactions: Vẫn gửi ETH trước khi trừ số dư/shares, dễ bị Reentrancy.")
        if not ('require(!locked' in clean and 'locked=true' in clean):
            errors.append("AssertionError: [Lesson 13] Thiếu cơ chế bảo vệ `require(!locked)` hoặc không gán `locked = true` trong `withdraw()`.")
        if 'locked=false' in clean and clean.find('locked=false') < call_idx:
            errors.append("AssertionError: [Lesson 13] Khóa reentrancy bị mở (`locked = false`) trước khi gọi external call.")

    elif lesson_id == "lesson-14":
        proxy_idx = clean.find('contractProxyStorage{')
        imp_idx = clean.find('addresspublicimplementation', proxy_idx)
        own_idx = clean.find('addresspublicowner', proxy_idx)
        if proxy_idx == -1 or imp_idx == -1 or own_idx == -1 or imp_idx > own_idx:
            errors.append("AssertionError: [Lesson 14] Thứ tự biến Storage Layout trong ProxyStorage bị sai lệch (`owner` đứng trước `implementation` gây Storage Collision).")
        if 'structS{' in clean or 'functionsetup()' in clean or ('delegatecall' in clean and 'implementation=' not in clean):
            errors.append("AssertionError: [Lesson 14] Khai báo biến sai vị trí hoặc sử dụng delegatecall không an toàn.")
        upg_idx = clean.find('functionupgrade(')
        if upg_idx != -1 and not ('onlyOwner' in clean[upg_idx:upg_idx+150] or 'msg.sender==owner' in clean[upg_idx:upg_idx+150]):
            errors.append("AssertionError: [Lesson 14] Hàm `upgrade()` chưa được bảo vệ bằng `onlyOwner` hoặc `msg.sender == owner`.")

    elif lesson_id == "lesson-15":
        if not ('nonces[signer]++' in clean or ('nonces[' in clean and '+=1' in clean)):
            errors.append("AssertionError: [Lesson 15] Thiếu lệnh cập nhật `nonces[signer]++` để vô hiệu hóa chữ ký sau khi dùng (chống Signature Replay).")
        if 'nonces[address(0)]' in clean or 'nonces[signer]--' in clean or ('recover(' in clean and 'nonces[signer]++' not in clean[clean.find('recover('):]):
            errors.append("AssertionError: [Lesson 15] Lệnh cập nhật nonce sai địa chỉ hoặc bị trừ ngược (`nonces[signer]--`).")
        if not ('signer!=address(0)' in clean or 'recover(sig)!=address(0)' in clean or '!=address(0)' in clean):
            errors.append("AssertionError: [Lesson 15] Hàm `verify()` chưa kiểm tra `signer != address(0)` sau khi khôi phục chữ ký.")

    elif lesson_id == "lesson-16":
        rec_idx = clean.find('functionreceiveMessage(')
        if rec_idx == -1 or not ('!processedMessages[' in clean[rec_idx:] or 'processedMessages[msgHash]==false' in clean[rec_idx:]):
            errors.append("AssertionError: [Lesson 16] Hàm `receiveMessage()` chưa kiểm tra `require(!processedMessages[msgHash])` trước khi xử lý.")
        if rec_idx == -1 or not ('processedMessages[msgHash]=true' in clean[rec_idx:] or 'processedMessages[' in clean[rec_idx:]):
            errors.append("AssertionError: [Lesson 16] Hàm `receiveMessage()` chưa cập nhật `processedMessages[msgHash] = true`.")
        proc_idx = clean.find('processedMessages[msgHash]=true')
        mint_idx = clean.find('mintToken()')
        if proc_idx == -1 or (mint_idx != -1 and proc_idx > mint_idx):
            errors.append("AssertionError: [Lesson 16] Thiếu lệnh đánh dấu `processedMessages[msgHash] = true` hoặc đánh dấu sau khi mintToken().")
        if 'processedMessages[msgHash]=false' in clean or 'bool[]memoryprocessedMessages' in clean:
            errors.append("AssertionError: [Lesson 16] Phát hiện lệnh reset trạng thái processedMessages hoặc che khuất bằng biến cục bộ.")

    else:
        # Generic Solidity security & structural check for any future lesson-XX
        if '//TODO' in code or '/*TODO*/' in code or '#TODO' in code or '// TODO' in code:
            errors.append("AssertionError: Vẫn còn phần TODO chưa được thực hiện hoàn chỉnh trong hợp đồng.")
        if not func_matches or len(clean) < 50:
            errors.append("AssertionError: Hợp đồng thông minh chưa định nghĩa đầy đủ các hàm hoặc logic quá ngắn.")

    if errors:
        first_err = errors[0]
        return {
            "passed": False,
            "score": 0,
            "security_review": f"[FAIL] Mã nguồn Solidity chưa đạt yêu cầu: {first_err}",
            "logs": [
                {"msg": "[Solc Sandbox] Khởi chạy bộ kiểm tra tĩnh cho mã nguồn Solidity...", "type": "info"},
                {"msg": f"[FAIL Testcase] {first_err}", "type": "error"},
                {"msg": "💡 Nhấn nút 'AI Mentor / Phân tích lỗi' bên dưới để nhờ giảng viên AI giải thích lý do và hướng dẫn sửa đổi!", "type": "warning"}
            ],
            "traceback": "\n".join(errors)
        }

    return {
        "passed": True,
        "score": 100,
        "security_review": "Mã nguồn Solidity xuất sắc! Bạn đã triển khai chính xác các yêu cầu và bảo mật của bài lab.",
        "logs": [
            {"msg": "[Solc Sandbox] Khởi chạy kiểm tra cấu trúc & bảo mật mã nguồn Solidity...", "type": "info"},
            {"msg": "[PASS] Chúc mừng! Hợp đồng thông minh đã vượt qua toàn bộ các tiêu chí kiểm định bảo mật!", "type": "success"}
        ],
        "traceback": ""
    }


REQUIRED_LANGUAGE_MAP = {
    "lesson-01": "python",
    "lesson-02": "solidity",
    "lesson-03": "solidity",
    "lesson-04": "solidity",
    "lesson-05": "solidity",
    "lesson-06": "solidity",
    "lesson-07": "solidity",
    "lesson-08": "python",
    "lesson-09": "python",
    "lesson-10": "python",
    "lesson-11": "solidity",
    "lesson-12": "python",
    "lesson-13": "solidity",
    "lesson-14": "solidity",
    "lesson-15": "solidity",
    "lesson-16": "solidity",
}

def run_lab_tests(lesson_id: str, language: str, code: str, starter_code: str = "") -> Dict[str, Any]:
    """
    Unified entrypoint for running standardized lab tests across all languages.
    Enforces strict language verification to block Cross-Language Route Switch bypasses.
    """
    lid = (lesson_id or "").lower().strip()
    lang_clean = (language or "").lower().strip()
    is_py = lang_clean in ["python", "py"]
    is_sol = lang_clean in ["solidity", "sol"]
    
    expected_lang = REQUIRED_LANGUAGE_MAP.get(lid)
    
    # 1. Check against mandatory language map
    if expected_lang == "python" and not is_py:
        return {
            "passed": False,
            "score": 0,
            "security_review": f"[FAIL] Sai ngôn ngữ lập trình cho bài lab {lesson_id}. Bài lab này bắt buộc sử dụng Python, nhưng bạn lại gửi lên {language.upper()}.",
            "logs": [
                {"msg": f"[Language Route Guard] Chặn cố gắng lách kiểm thử bằng cách đổi route ngôn ngữ ({language} -> python)", "type": "error"},
                {"msg": "💡 Vui lòng chọn đúng ngôn ngữ lập trình của bài thực hành trên giao diện!", "type": "warning"}
            ],
            "traceback": f"CrossLanguageRouteSwitchError: Expected Python for {lesson_id}, got {language}"
        }
    elif expected_lang == "solidity" and not is_sol:
        return {
            "passed": False,
            "score": 0,
            "security_review": f"[FAIL] Sai ngôn ngữ lập trình cho bài lab {lesson_id}. Bài lab này bắt buộc sử dụng Solidity, nhưng bạn lại gửi lên {language.upper()}.",
            "logs": [
                {"msg": f"[Language Route Guard] Chặn cố gắng lách kiểm thử bằng cách đổi route ngôn ngữ ({language} -> solidity)", "type": "error"},
                {"msg": "💡 Vui lòng chọn đúng ngôn ngữ lập trình của bài thực hành trên giao diện!", "type": "warning"}
            ],
            "traceback": f"CrossLanguageRouteSwitchError: Expected Solidity for {lesson_id}, got {language}"
        }
        
    # 2. Heuristic check for unknown/generic labs (e.g. lesson-XX, lesson-99, lesson-88)
    # If sent as python but contains explicit Solidity syntax keywords and no python def/import/class
    if is_py and ('contract ' in code or 'pragma solidity' in code or 'function ' in code) and not any(kw in code for kw in ['def ', 'import ', 'class ']):
        return {
            "passed": False,
            "score": 0,
            "security_review": f"[FAIL] Sai cấu trúc ngôn ngữ: Mã nguồn có cú pháp Solidity nhưng được gửi qua route Python.",
            "logs": [
                {"msg": "[Language Route Guard] Phát hiện gửi nhầm mã nguồn Solidity vào route kiểm thử Python.", "type": "error"}
            ],
            "traceback": f"CrossLanguageRouteSwitchError: Code syntax is Solidity but language parameter is {language}"
        }
    # If sent as solidity but contains explicit Python keywords and no contract/library/interface
    if is_sol and ('def ' in code or 'import ' in code or 'print(' in code or 'class ' in code) and not any(kw in code for kw in ['contract ', 'library ', 'interface ']):
        return {
            "passed": False,
            "score": 0,
            "security_review": f"[FAIL] Sai cấu trúc ngôn ngữ: Mã nguồn có cú pháp Python nhưng được gửi qua route Solidity.",
            "logs": [
                {"msg": "[Language Route Guard] Phát hiện gửi nhầm mã nguồn Python vào route kiểm thử Solidity.", "type": "error"}
            ],
            "traceback": f"CrossLanguageRouteSwitchError: Code syntax is Python but language parameter is {language}"
        }

    if is_py:
        return run_python_lab_tests(lesson_id, code, starter_code)
    elif is_sol:
        return run_solidity_lab_tests(lesson_id, code, starter_code)
    else:
        # Fallback for other languages
        return run_python_lab_tests(lesson_id, code, starter_code)
