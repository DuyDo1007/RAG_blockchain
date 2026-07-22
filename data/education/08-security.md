---
lesson_id: security
title: "Bài 8: Bảo Mật Smart Contract — Các Lỗ Hổng Kinh Điển & Cách Phòng Chống"
difficulty: advanced
duration_minutes: 50
prerequisites: ["smart-contracts", "defi"]
---

# Bài 8: Bảo Mật Smart Contract — Các Lỗ Hổng Kinh Điển & Cách Phòng Chống

Do đặc thù **Bất biến (Immutable)** của Blockchain, một khi Smart Contract đã được triển khai (Deploy), bạn **không thể nhấn nút sửa lỗi** như trên máy chủ Web truyền thống. Chỉ một lỗ hổng logic nhỏ có thể khiến toàn bộ số tiền hàng trăm triệu USD trong hợp đồng bị Hacker bốc hơi chỉ trong vài giây. Trong bài này, chúng ta sẽ mổ xẻ 3 lỗ hổng bảo mật khét tiếng nhất lịch sử Web3.

---

## 1. Lỗ Hổng Reentrancy (Tấn Công Tái Nhập) — Vụ Hack The DAO 50 Triệu USD

**Reentrancy** là lỗ hổng nổi tiếng nhất, từng phá hủy quỹ The DAO năm 2016 khiến Ethereum phải phân tách chuỗi (Hard Fork) thành ETH và ETC.

### Nguyên lý tấn công:
Xảy ra khi hợp đồng nạn nhân **chuyển tiền ETH cho người dùng trước khi cập nhật lại số dư** của họ trong bộ nhớ. Hacker lợi dụng hàm `fallback() / receive()` của contract tấn công để gọi ngược lại hàm rút tiền liên tục trước khi số dư bị trừ về 0!

```solidity
// ==========================================
// ❌ CONTRACT BỊ LỖI REENTRANCY (VULNERABLE)
// ==========================================
contract VulnerableBank {
    mapping(address => uint256) public balances;

    function withdraw() public {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "Khong co so du");

        // ⚠️ LỖI CHÍNH Ở ĐÂY: Gửi ETH đi TRƯỚC KHI trừ số dư!
        (bool sent, ) = msg.sender.call{value: bal}("");
        require(sent, "Gui ETH that bai");

        // Khi dòng gửi tiền ở trên chạy, contract của Hacker sẽ chặn lấy
        // và gọi lại hàm withdraw() thêm 10 lần nữa trước khi dòng dưới kịp chạy!
        balances[msg.sender] = 0;
    }
}
```

### Cách phòng chống (Best Practices):
1.  **Quy tắc Checks-Effects-Interactions (CEI):** Luôn kiểm tra điều kiện (`Checks`) $ightarrow$ Cập nhật số dư trong bộ nhớ (`Effects`) $ightarrow$ Cuối cùng mới chuyển tiền ra bên ngoài (`Interactions`).
2.  **Sử dụng `ReentrancyGuard` của OpenZeppelin:** Thêm modifier `nonReentrant` vào hàm rút tiền để khóa mutex, ngăn chặn mọi nỗ lực gọi lặp.

```solidity
// ==========================================
// ✅ CONTRACT ĐÃ ĐƯỢC VÁ LỖI (SECURE)
// ==========================================
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureBank is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function withdraw() public nonReentrant {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "Khong co so du");

        // 1. Cập nhật số dư về 0 TRƯỚC KHI chuyển tiền (CEI)
        balances[msg.sender] = 0;

        // 2. Chuyển tiền sau cùng
        (bool sent, ) = msg.sender.call{value: bal}("");
        require(sent, "Gui ETH that bai");
    }
}
```

---

## 2. Lỗ Hổng Integer Overflow / Underflow (Tràn Số)

Trước phiên bản Solidity `0.8.0`, kiểu dữ liệu `uint8` có thể lưu các số từ `0` đến `255`.
*   Nếu bạn lấy `255 + 1` $ightarrow$ Kết quả sẽ bị tràn về **`0`**!
*   Nếu bạn lấy `0 - 1` (Underflow) $ightarrow$ Kết quả sẽ nhảy vọt lên con số khổng lồ **`255`**!

> [!TIP]
> **Cách khắc phục:** Từ phiên bản **Solidity `0.8.0` trở đi**, trình biên dịch đã tự động tích hợp tính năng kiểm tra tràn số an toàn (tương tự thư viện `SafeMath`). Nếu xảy ra `0 - 1`, giao dịch sẽ tự động bị báo lỗi revert ngay lập tức! Luôn sử dụng `pragma solidity ^0.8.x`.

---

## 3. Lỗ Hổng Kiểm Soát Truy Cập (Access Control Vulnerabilities)

Rất nhiều vụ hack hàng chục triệu USD xảy ra không phải do thuật toán phức tạp, mà đơn giản do lập trình viên... **quên phân quyền ai được phép gọi hàm nhạy cảm**!

```solidity
// ❌ LỖI NGỚ NGẨN: Quên để modifier onlyOwner!
function setOwner(address newOwner) public {
    // Bất kỳ ai trên thế giới cũng có thể gọi hàm này và biến thành chủ hợp đồng!
    owner = newOwner; 
}

// ✅ SỬA ĐÚNG:
function setOwner(address newOwner) public onlyOwner {
    owner = newOwner;
}
```

---

## 4. Front-Running (Chạy Trước Giao Dịch) & MEV

Vì mọi giao dịch gửi lên Ethereum đều phải nằm chờ trong phòng chờ công khai gọi là **Mempool** trước khi được thợ mỏ đóng vào Block, các Hacker/Bot có thể theo dõi Mempool 24/7:
1.  Bot phát hiện bạn sắp mua một lượng lớn token X trên Uniswap làm giá tăng cao.
2.  Bot lập tức gửi một giao dịch mua token X với **phí Gas cao hơn** của bạn để thợ mỏ ưu tiên xử lý trước (Front-run).
3.  Khi giao dịch của bạn chạy làm giá tăng vọt, Bot bán ngay token X vừa mua để ăn chênh lệch. Bạn bị trượt giá nặng nề!

---

## 5. Tóm tắt & Câu hỏi ôn tập

> [!TIP]
> **Tóm tắt bài học:**
> * **Reentrancy** xảy ra khi chuyển tiền trước khi cập nhật số dư $ightarrow$ Áp dụng quy tắc Checks-Effects-Interactions và `nonReentrant`.
> * Luôn sử dụng Solidity từ `^0.8.0` để tự động chống tràn số Overflow/Underflow.
> * Kiểm tra kỹ lưỡng modifier phân quyền cho các hàm rút tiền, đổi chủ sở hữu (`Access Control`).

### Câu hỏi suy ngẫm cho AI Tutor:
1. *"Tại sao việc dùng `tx.origin == msg.sender` để kiểm tra quyền truy cập lại là một lỗ hổng bảo mật cực kỳ nguy hiểm?"*
2. *"Tấn công Flash Loan Attack kết hợp thao túng giá oracle (Oracle Manipulation) hoạt động ra sao trong các vụ hack DeFi?"*
3. *"Quy trình Audit một Smart Contract chuyên nghiệp trong các công ty bảo mật gồm những bước nào?"*
