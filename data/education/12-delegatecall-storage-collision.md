---
lesson_id: lesson-14
title: Delegatecall Hazards & Proxy Storage Collision
category: vulnerabilities
difficulty: advanced
duration_minutes: 60
prerequisites: ["lesson-02", "lesson-05"]
---

# Delegatecall Hazards & Proxy Storage Collision

## 1. Cơ chế Hoạt động của Delegatecall trong EVM
Trong Solidity, `delegatecall` là một lệnh đặc biệt cho phép Hợp đồng A (Proxy) thực thi mã nguồn của Hợp đồng B (Implementation) nhưng với **ngữ cảnh thực thi (context) của Hợp đồng A**:
- **Storage**: Mọi thao tác đọc/ghi dữ liệu đều diễn ra trực tiếp trên bộ nhớ Storage của **Hợp đồng A**.
- **msg.sender & msg.value**: Được giữ nguyên giá trị của người gọi ban đầu.
- **address(this)**: Trả về địa chỉ của **Hợp đồng A**.

`delegatecall` là trái tim của mô hình **Upgradeable Smart Contracts** (như Transparent Proxy, UUPS Proxy) và các thư viện Diamond Standard (EIP-2535).

```solidity
// Mô hình Proxy cơ bản sử dụng delegatecall

contract Proxy {
    address public implementation; // Slot 0
    address public owner;          // Slot 1

    constructor(address _impl) {
        implementation = _impl;
        owner = msg.sender;
    }

    fallback() external payable {
        address impl = implementation;
        assembly {
            // Forward call tới implementation bằng delegatecall
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
```

## 2. Nguy cơ Storage Collision (Xung đột Slot Bộ nhớ)

### A. Nguyên nhân gây nên Xung đột Slot
Máy ảo EVM sắp xếp các biến trạng thái (State Variables) vào các ô nhớ (Storage Slots) có độ dài 32 bytes bắt đầu từ Slot 0, Slot 1, Slot 2,...

Nếu **Hợp đồng Proxy** và **Hợp đồng Implementation** khai báo các biến trạng thái không hoàn toàn khớp nhau theo đúng thứ tự slot, hiện tượng **Storage Collision** sẽ xảy ra.

```solidity
// MINH HỌA LỖ HỔNG XUNG ĐỘT STORAGE SLOT

contract ProxyVulnerable {
    address public implementation; // Slot 0: Địa chỉ logic contract
    address public owner;          // Slot 1: Địa chỉ admin
}

contract ImplementationV1 {
    uint256 public count;          // Slot 0: Trùng slot với `implementation` trong Proxy!
    address public userAddress;    // Slot 1: Trùng slot với `owner` trong Proxy!

    function setCount(uint256 _count) public {
        count = _count; // LỖ HỔNG: Ghi đè địa chỉ implementation trong Proxy thành số _count!
    }
}
```

### B. Hậu quả
1. **Ghi đè dữ liệu quản trị (Privilege Escalation)**: Kẻ tấn công có thể thay đổi biến `owner` của Proxy thành địa chỉ ví của mình.
2. **Biến contract thành rác (Bricking Contract)**: Ghi đè địa chỉ `implementation` bằng một giá trị không hợp lệ (như `0x0`), làm cạn khả năng fallback của Proxy.
3. **Phá hủy hợp đồng qua Uninitialized Logic Contract**: Nếu hợp đồng Implementation chứa hàm `selfdestruct` hoặc initializer chưa được khởi tạo, kẻ tấn công có thể gọi trực tiếp `initialize()` trên Implementation contract và hủy nó vĩnh viễn.

## 3. Giải pháp Chuẩn mực Bảo mật (Security Mitigation)

### A. Sử dụng EIP-1967 Standard Storage Slots
EIP-1967 lưu trữ các biến quản trị của Proxy (như `implementation` và `admin`) tại các vị trí Slot ngẫu nhiên cố định có độ băm cao, tránh hoàn toàn Slot 0 hay Slot 1 của Implementation.

```solidity
// EIP-1967 Implementation Slot calculation:
// bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
bytes32 private constant IMPL_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

function _getImplementation() internal view returns (address impl) {
    bytes32 slot = IMPL_SLOT;
    assembly {
        impl := sload(slot)
    }
}
```

### B. Quy tắc Nâng cấp Storage Gap (`__gap`)
Khi kế thừa các hợp đồng cơ sở trong mô hình Upgradeable, luôn khai báo mảng dự phòng `uint256[50] private __gap;` ở cuối contract để dành ô nhớ cho các biến mới trong tương lai.

```solidity
contract BaseImplementation {
    uint256 public value;
    uint256[49] private __gap; // Dự phòng 49 slot cho nâng cấp sau này
}
```

### C. Khóa Khởi tạo Implementation Contract (`_disableInitializers()`)
Trong Constructor của Implementation contract, luôn gọi `_disableInitializers()` để ngăn chặn hacker gọi hàm `initialize()` trên bản sao gốc.

---

## 4. Tóm tắt Kiểm toán (Auditor Checklist)
- [ ] Kiểm tra thứ tự và kiểu dữ liệu của biến trạng thái giữa Proxy và Implementation có đồng nhất 100% không.
- [ ] Xác minh Hợp đồng Proxy có tuân thủ **EIP-1967** hay không.
- [ ] Kiểm tra xem hàm Constructor của Implementation contract có gọi `_disableInitializers()` để chống chiếm quyền khởi tạo không.
- [ ] Chạy các công cụ kiểm tra tự động như `Slither` (`slither-check-upgradeability`) để phát hiện Storage Collision tự động.
