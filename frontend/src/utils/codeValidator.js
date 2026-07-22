import * as solidityParser from '@solidity-parser/parser';
const parser = solidityParser.default || solidityParser;

/**
 * Structural & AST Code Validator (Option 3)
 * Validates syntax, structure, contract definitions, and prevents anti-cheat/TODO shortcuts before or during grading.
 */
export function validateCodeStructure(code, language, starterCode = '') {
  const clean = (code || '').trim();
  const cleanStarter = (starterCode || '').trim();

  if (!clean || clean.length < 15) {
    return {
      success: false,
      logs: [{ msg: "[Syntax Error] Mã nguồn quá ngắn hoặc trống. Vui lòng nhập mã hoàn chỉnh.", type: "error" }]
    };
  }

  if (clean.replace(/\s+/g, '') === cleanStarter.replace(/\s+/g, '') && cleanStarter.length > 20) {
    return {
      success: false,
      logs: [{ msg: "[FAIL] Bạn chưa thay đổi hoặc bổ sung logic vá lỗi vào phần gợi ý ban đầu (Starter Code).", type: "error" }]
    };
  }

  // Check for unfilled TODOs
  const lines = clean.split('\n');
  const todoLines = lines.filter(l => {
    const trimmed = l.trim();
    return trimmed.includes('//TODO') || trimmed.includes('#TODO') || trimmed.includes('// TODO') || trimmed.includes('# TODO');
  });

  if (todoLines.length > 0) {
    return {
      success: false,
      logs: [
        { msg: `[FAIL] Vẫn còn ${todoLines.length} đoạn TODO chưa hoàn thành trong code của bạn:`, type: "error" },
        ...todoLines.slice(0, 3).map(l => ({ msg: `  -> ${l.trim()}`, type: "warning" }))
      ]
    };
  }

  // Solidity AST & Syntax Parsing (Option 3)
  if (language === 'solidity' || language === 'sol') {
    try {
      const ast = parser.parse(clean, { loc: true });
      let hasContract = false;
      let functionCount = 0;
      let emptyFunctions = [];
      
      parser.visit(ast, {
        ContractDefinition(node) {
          hasContract = true;
        },
        FunctionDefinition(node) {
          functionCount++;
          if (node.body && node.body.statements && node.body.statements.length === 0 && !node.isConstructor && node.visibility !== 'external' && !node.isVirtual) {
            emptyFunctions.push(node.name || 'anonymous');
          }
        }
      });

      if (!hasContract) {
        return {
          success: false,
          logs: [{ msg: "[FAIL AST Parser] Không tìm thấy định nghĩa Contract (`contract ...`) hợp lệ trong mã nguồn Solidity.", type: "error" }]
        };
      }

      return {
        success: true,
        ast: ast,
        logs: [
          { msg: `[Solc AST Parser] Phân tích cây cú pháp thành công (${functionCount} hàm trong hợp đồng). Cú pháp hợp lệ 100%.`, type: "success" }
        ]
      };
    } catch (e) {
      let errorMsg = e.message || "Lỗi cú pháp Solidity.";
      if (e.errors && e.errors.length > 0) {
        const firstErr = e.errors[0];
        errorMsg = `Dòng ${firstErr.line || '?'}: ${firstErr.message}`;
      }
      return {
        success: false,
        logs: [
          { msg: `[FAIL AST Parser] Lỗi cú pháp Solidity: ${errorMsg}`, type: "error" }
        ]
      };
    }
  }

  // Python Structural & Lexical Validation (Option 3)
  if (language === 'python' || language === 'py') {
    // 1. Check for standalone invalid syntax lines (like 'wewew' or garbage identifiers on lines without assignment or call)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(line) && !['pass', 'break', 'continue', 'return', 'True', 'False', 'None'].includes(line)) {
        return {
          success: false,
          logs: [{ msg: `[FAIL Python Parser] Lỗi cú pháp hoặc định danh không hợp lệ tại dòng ${i + 1}: '${line}' (chưa được gán giá trị hoặc gọi hàm).`, type: "error" }]
        };
      }
    }

    // 2. Check if functions still only contain 'pass' or '...'
    const passMatches = clean.match(/def\s+([a_zA_Z0_9_]+)\s*\([^)]*\)\s*:\s*(?:#[^\n]*\n\s*)*(?:pass|\.\.\.)(?:\s*#.*)?(?:$|\n)/g);
    if (passMatches && passMatches.length > 0) {
      const funcName = passMatches[0].match(/def\s+([a_zA_Z0_9_]+)/)[1];
      return {
        success: false,
        logs: [{ msg: `[FAIL Python Parser] Hàm '${funcName}()' chưa được triển khai logic (vẫn để trống hoặc chỉ chứa từ khóa 'pass'/'...').`, type: "error" }]
      };
    }

    // 3. Check for dummy returns (e.g. return False directly inside is_chain_valid without checking block hashes or looping)
    const dummyReturnMatch = clean.match(/def\s+is_chain_valid\s*\([^)]*\)\s*:\s*(?:#[^\n]*\n\s*)*return\s+(?:False|True|0|""|''|None)(?:\s*#.*)?(?:$|\n)/);
    if (dummyReturnMatch) {
      return {
        success: false,
        logs: [{ msg: "[FAIL Python Parser] Hàm 'is_chain_valid()' chỉ trả về giá trị cố định (return False/True) mà không có vòng lặp kiểm tra toàn vẹn chuỗi block.", type: "error" }]
      };
    }

    const hasDef = clean.includes('def ') || clean.includes('class ');
    if (!hasDef) {
      return {
        success: false,
        logs: [{ msg: "[FAIL Python Parser] Không tìm thấy khai báo hàm (`def`) hoặc lớp (`class`) hợp lệ trong code Python.", type: "error" }]
      };
    }

    const colons = (clean.match(/:\s*(#.*)?$/gm) || []).length;
    if (clean.includes('def ') && colons === 0) {
      return {
        success: false,
        logs: [{ msg: "[FAIL Python Parser] Lỗi cú pháp: Thiếu dấu hai chấm `:` sau khai báo hàm/lớp.", type: "error" }]
      };
    }

    return {
      success: true,
      logs: [
        { msg: "[Python 3 Structural Parser] Phân tích cấu trúc cú pháp Python hợp lệ.", type: "success" }
      ]
    };
  }

  return { success: true, logs: [] };
}
