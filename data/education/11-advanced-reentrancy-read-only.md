---
lesson_id: lesson-13
title: Read-Only Reentrancy & Cross-Function Attacks
category: vulnerabilities
difficulty: advanced
duration_minutes: 55
prerequisites: ["lesson-03", "lesson-08"]
---

# Read-Only Reentrancy & Cross-Function Attacks

## 1. Tổng quan về Read-Only Reentrancy
Trong các cuộc tấn công **Reentrancy truyền thống** (như vụ hack The DAO 2016), kẻ tấn công re-enter vào một hàm thay đổi trạng thái (state-changing function) để rút tiền nhiều lần trước khi số dư được cập nhật.

Tuy nhiên, **Read-Only Reentrancy** là một biến thể nâng cao và tinh vi hơn rất nhiều. Ở đây:
- Hàm bị re-enter **không làm thay đổi trạng thái** (thường là một hàm `view` hoặc `pure` như `getPrice()`, `getVirtualPrice()`, `getPoolBalance()`).
- Kẻ tấn công kích hoạt một hàm thay đổi trạng thái ở Hợp đồng A (ví dụ: rút thanh khoản khỏi Bể AMM).
- Trong khi Hợp đồng A đang ở trạng thái tạm thời chưa nhất quán (chưa kịp cập nhật tổng số dư hoặc chỉ số cổ phần), Hợp đồng A thực hiện external call tới kẻ tấn công.
- Kẻ tấn công lợi dụng điểm dừng này để gọi hàm `view` của Hợp đồng A từ Hợp đồng B (ví dụ: Lending Protocol).
- Hợp đồng B tin tưởng báo cáo giá/tỷ giá từ Hợp đồng A (vẫn đang mang giá trị cũ chưa cập nhật) và cho phép kẻ tấn công vay vượt mức tài sản thế chấp (undercollateralized loan), dẫn đến cạn kiệt tài sản.

```solidity
// Tình huống Read-Only Reentrancy trong Bể Thanh Khoản (Vault / AMM Pool)

contract VulnerablePool {
    uint256 public totalShares;
    uint256 public totalAssets;

    function withdraw(uint256 shareAmount) external {
        uint256 amountToReturn = (shareAmount * totalAssets) / totalShares;
        
        // 1. Chuyển tiền ra ngoài TRƯỚC khi cập nhật totalAssets / totalShares
        (bool ok, ) = msg.sender.call{value: amountToReturn}("");
        require(ok, "Transfer failed");

        // 2. Cập nhật state QUÁ MUỘN!
        totalShares -= shareAmount;
        totalAssets -= amountToReturn;
    }

    // Hàm VIEW bị khai thác bởi các Protocol bên ngoài
    function getSharePrice() public view returns (uint256) {
        if (totalShares == 0) return 1e18;
        return (totalAssets * 1e18) / totalShares;
    }
}
```

## 2. Kịch bản Khai thác Thực tế (Real-World Case Study)
Vụ hack nổi tiếng liên quan tới Read-Only Reentrancy bao gồm cuộc tấn công vào **Curve Finance / Sentiment Protocol** năm 2023:

1. Hacker gửi tiền vào Bể AMM và nhận về Cổ phần (LP Tokens).
2. Hacker thực hiện lệnh rút thanh khoản `remove_liquidity`.
3. Bể AMM trả lại ETH cho Hacker và gọi hàm `fallback()` của Hacker. Lúc này, tổng số dư ETH trong bể đã giảm, nhưng tổng lượng LP Token chưa bị burn (state tạm thời bị lệch).
4. Trong hàm `fallback()`, Hacker gọi sang Lending Protocol (nơi dùng `getVirtualPrice()` của Bể AMM làm Oracle định giá tài sản thế chấp LP Token).
5. Do `getVirtualPrice()` trả về giá trị định giá LP Token cao hơn thực tế (vì lượng LP Token chưa kịp giảm tương ứng với ETH đã rút out), Lending Protocol tính toán tài sản thế chấp của Hacker cao gấp nhiều lần.
6. Hacker vay tối đa các tài sản khác (USDC/USDT) từ Lending Protocol rồi biến mất.

## 3. Các Mô hình Phòng thủ Nâng cao

### A. Áp dụng ReentrancyGuard cho cả Hàm View (View Reentrancy Guard)
Mặc dù hàm `view` không ghi dữ liệu vào Storage, chúng ta vẫn có thể dùng modifier kiểm tra cờ Reentrancy lock (chú ý: hàm kiểm tra Reentrancy lock trên hàm view phải kiểm tra trạng thái lock của hợp đồng chính).

```solidity
// Solc 0.8.24+ hỗ trợ Transient Storage (EIP-1153: TSTORE / TLOAD)
contract SecurePool {
    bool private _locked;

    modifier nonReentrant() {
        require(!_locked, "REENTRANCY_DETECTED");
        _locked = true;
        _;
        _locked = false;
    }

    // Đánh dấu modifier nonReentrant View để ngăn các hợp đồng bên ngoài đọc giá khi đang trong quá trình ghi
    function getSharePrice() public view returns (uint256) {
        require(!_locked, "READ_ONLY_REENTRANCY");
        return (totalAssets * 1e18) / totalShares;
    }
}
```

### B. Tuân thủ Nghiêm ngặt Checks-Effects-Interactions (CEI) Pattern
Luôn đảm bảo mọi thay đổi State (trừ bớt totalShares, totalAssets) phải được thực hiện hoàn tất **trước khi** gửi bất kỳ external call (ETH, ERC20 transfer, callback) nào ra ngoài.

```solidity
function withdrawSecure(uint256 shareAmount) external nonReentrant {
    uint256 amountToReturn = (shareAmount * totalAssets) / totalShares;

    // 1. CHECKS
    require(shareAmount > 0, "Invalid amount");

    // 2. EFFECTS (Cập nhật trạng thái trước)
    totalShares -= shareAmount;
    totalAssets -= amountToReturn;

    // 3. INTERACTIONS (Tương tác bên ngoài sau cùng)
    (bool ok, ) = msg.sender.call{value: amountToReturn}("");
    require(ok, "Transfer failed");
}
```

---

## 4. Tóm tắt Kiểm toán (Auditor Checklist)
- [ ] Kiểm tra xem các hàm `view` có được gọi bởi các protocol bên ngoài (như Lending/Borrowing, Synthetic Asset) làm Oracle hay không.
- [ ] Rà soát toàn bộ các điểm xuất hiện `call{value: ...}` hoặc `safeTransfer` để xem có state variable nào chưa kịp sync trước lệnh call hay không.
- [ ] Khuyến nghị sử dụng **Transient Storage (EIP-1153)** trong Solidity 0.8.24+ để tối ưu phí gas cho Reentrancy Guard.
