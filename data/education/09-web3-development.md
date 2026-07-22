---
lesson_id: web3-development
title: "Bài 9: Phát Triển Ứng Dụng Web3 — Kết Nối Frontend Với Smart Contract"
difficulty: advanced
duration_minutes: 45
prerequisites: ["smart-contracts"]
---

# Bài 9: Phát Triển Ứng Dụng Web3 — Kết Nối Frontend Với Smart Contract

Bạn đã biết cách viết Smart Contract bằng Solidity. Nhưng người dùng thông thường không thể mở Terminal ra để gõ lệnh gọi hàm Blockchain! Chúng ta cần xây dựng một giao diện **Frontend (React / Next.js)** kết nối với Smart Contract, tạo thành một **dApp (Decentralized Application - Ứng dụng phi tập trung)** hoàn chỉnh.

---

## 1. Kiến Trúc Của Một dApp Web3

Khác với Web2 truyền thống (Frontend $\leftrightarrow$ Backend API $\leftrightarrow$ Database SQL), ứng dụng Web3 giao tiếp trực tiếp với Blockchain thông qua một **Nhà cung cấp RPC Node (RPC Provider)** và **Ví người dùng (MetaMask)**:

```
+---------------------------------------------------------------+
|                      KIẾN TRÚC WEB3 dAPP                      |
+---------------------------------------------------------------+
|  1. Frontend (Next.js / React UI):                            |
|     Giao diện nút bấm, bảng biểu cho người dùng               |
+---------------------------------------------------------------+
                                │
          (Thư viện Ethers.js / Viem / Wagmi)
                                ▼
+---------------------------------------------------------------+
|  2. Ví MetaMask (Injected Web3 Provider):                     |
|     Quản lý Private Key + Yêu cầu người dùng bật popup ký tên |
+---------------------------------------------------------------+
                                │
               (RPC Node: Infura / Alchemy / Ankr)
                                ▼
+---------------------------------------------------------------+
|  3. Ethereum Blockchain Network:                              |
|     Smart Contract + EVM State                                |
+---------------------------------------------------------------+
```

---

## 2. ABI (Application Binary Interface) Là Gì?

Khi bạn biên dịch (`solc compile`) file `SimpleBank.sol`, trình biên dịch tạo ra 2 file:
1.  **Bytecode:** Dãy số hex để triển khai lên EVM.
2.  **ABI (JSON):** Cuốn từ điển cầu nối giải thích cho Frontend biết contract của bạn có những hàm nào, tham số đầu vào/đầu ra kiểu gì.

```json
// Ví dụ một phần của file ABI cho hàm deposit()
[
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
]
```

Để Frontend gọi được Smart Contract, bạn **bắt buộc phải có 2 thứ**:
*   **Địa chỉ Contract (Contract Address):** `0x1234...abcd`
*   **File ABI (JSON Dictionary):** Đọc từ build artifact.

---

## 3. Viết Code Kết Nối Với Thư Viện Ethers.js (v6)

Dưới đây là đoạn code mẫu trong React/Next.js giúp người dùng kết nối ví MetaMask và gọi hàm `deposit()` gửi ETH vào hợp đồng:

```javascript
import React, { useState } from 'react';
import { ethers } from 'ethers';
import SimpleBankABI from './abi/SimpleBank.json';

const CONTRACT_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

export default function BankApp() {
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');

  // 1. Hàm kết nối ví MetaMask
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Yêu cầu popup MetaMask mở ra để người dùng chọn tài khoản
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAccount(accounts[0]);
        setStatus('Đã kết nối ví thành công!');
      } catch (err) {
        setStatus(`Lỗi kết nối: ${err.message}`);
      }
    } else {
      alert('Vui lòng cài đặt tiện ích mở rộng MetaMask!');
    }
  };

  // 2. Hàm gọi Smart Contract để gửi tiền (Write Transaction - Tốn Gas)
  const handleDeposit = async () => {
    if (!account) return alert('Vui lòng kết nối ví trước!');
    
    try {
      setStatus('Đang chờ bạn xác nhận trên MetaMask...');
      
      // Khởi tạo Provider từ MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Lấy Signer (người ký giao dịch)
      const signer = await provider.getSigner();
      
      // Khởi tạo đối tượng Contract
      const bankContract = new ethers.Contract(
        CONTRACT_ADDRESS, 
        SimpleBankABI, 
        signer
      );

      // Gọi hàm deposit() kèm theo 0.01 ETH (chuyển sang Wei)
      const tx = await bankContract.deposit({
        value: ethers.parseEther("0.01")
      });

      setStatus(`Giao dịch đã gửi! Hash: ${tx.hash}. Đang chờ đào...`);
      
      // Chờ giao dịch được đưa vào Block
      await tx.wait();
      setStatus('✅ Gửi tiền thành công!');
    } catch (err) {
      setStatus(`❌ Lỗi: ${err.reason || err.message}`);
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-xl max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Web3 Bank dApp</h2>
      
      {!account ? (
        <button 
          onClick={connectWallet}
          className="bg-amber-500 text-black font-bold px-4 py-2 rounded-lg"
        >
          Kết Nối MetaMask
        </button>
      ) : (
        <div className="space-y-4">
          <p className="font-mono text-xs text-amber-400">Ví: {account}</p>
          <button 
            onClick={handleDeposit}
            className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-lg w-full"
          >
            Gửi 0.01 ETH vào Quỹ
          </button>
        </div>
      )}

      {status && <p className="mt-4 text-xs font-mono text-slate-300">{status}</p>}
    </div>
  );
}
```

---

## 4. Bộ Công Cụ Phát Triển Phổ Biến (Hardhat vs. Foundry)

Để viết, kiểm thử (Unit Test) và triển khai Smart Contract một cách chuyên nghiệp, các kỹ sư Web3 sử dụng 2 bộ framework chính:

| Tiêu chí | Hardhat | Foundry |
| :--- | :--- | :--- |
| **Ngôn ngữ viết Test** | **JavaScript / TypeScript** (Sử dụng Mocha, Chai) | **Solidity** trực tiếp |
| **Tốc độ biên dịch & chạy Test** | Trung bình | **Siêu nhanh** (Viết bằng ngôn ngữ Rust) |
| **Độ phổ biến** | Rất cao, cộng đồng lớn lâu đời | Đang tăng trưởng cực kỳ mạnh mẽ, được các pro dev ưa chuộng |

---

## 5. Tóm tắt & Câu hỏi ôn tập

> [!TIP]
> **Tóm tắt bài học:**
> * dApp kết nối Frontend với Blockchain thông qua Provider (MetaMask/Infura) và file từ điển ABI.
> * Thư viện `Ethers.js` hoặc `Viem` giúp khởi tạo `Contract instance` để gọi các hàm đọc (`view`) hoặc ghi (`transaction`).
> * Hardhat và Foundry là 2 framework tiêu chuẩn vàng để phát triển và kiểm thử Smart Contract.

### Câu hỏi suy ngẫm cho AI Tutor:
1. *"Sự khác nhau giữa `Provider` và `Signer` trong thư viện Ethers.js là gì?"*
2. *"Thư viện `Wagmi` kết hợp với `React Query` mang lại những lợi ích gì so với việc dùng `Ethers.js` thuần trong React?"*
3. *"Làm thế nào để lắng nghe các sự kiện (Events) phát ra từ Smart Contract theo thời gian thực trên Frontend?"*
