---
lesson_id: smart-contracts
title: "Bài 5: Smart Contract Cơ Bản — Viết Hợp Đồng Thông Minh Đầu Tiên Với Solidity"
difficulty: intermediate
duration_minutes: 45
prerequisites: ["ethereum"]
---

# Bài 5: Smart Contract Cơ Bản — Viết Hợp Đồng Thông Minh Đầu Tiên Với Solidity

Chào bạn đến với thế giới lập trình Web3! Trong bài học này, chúng ta sẽ tìm hiểu ngôn ngữ lập trình phổ biến nhất trên Ethereum: **Solidity**, và cùng nhau phân tích từng dòng code của một Smart Contract hoàn chỉnh.

---

## 1. Smart Contract (Hợp Đồng Thông Minh) Là Gì?

**Smart Contract** là những đoạn mã chương trình được triển khai và lưu trữ vĩnh viễn trên Blockchain. 

### Đặc tính "Máy bán nước tự động" (Vending Machine):
Nick Szabo — cha đẻ khái niệm Smart Contract — đã so sánh hợp đồng thông minh với một chiếc **máy bán nước tự động**:
*   Bạn nhét 10,000 VNĐ vào khe thẻ + bấm nút chọn lon Coca.
*   Máy tự động kiểm tra số tiền hợp lệ $ightarrow$ nhả lon Coca ra lập tức.
*   **Hoàn toàn tự động, không cần nhân viên thu ngân đứng đối chiếu!** 

Smart Contract trên Blockchain cũng vậy: Khi các điều kiện đã được lập trình sẵn được thoả mãn, hợp đồng sẽ **tự động thực thi chính xác 100%** mà không ai có thể ngăn cản hay thay đổi kết quả.

---

## 2. Cấu Trúc Cơ Bản Của Ngôn Ngữ Solidity

Solidity là ngôn ngữ lập trình hướng đối tượng, kiểu dữ liệu tĩnh (Statically Typed), có cú pháp rất giống với **JavaScript**, **C++** và **Java**.

Hãy cùng xem và phân tích contract **"Quỹ Tiền Tiết Kiệm" (`SimpleBank.sol`)** dưới đây:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleBank {
    // 1. Biến trạng thái (State Variables) - Lưu vĩnh viễn trên Blockchain
    address public owner;
    mapping(address => uint256) public balances;

    // 2. Sự kiện (Events) - Gửi thông báo ra bên ngoài cho Frontend/Indexer
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    // 3. Modifier - BỘ lọc kiểm tra điều kiện trước khi chạy hàm
    modifier onlyOwner() {
        require(msg.sender == owner, "Loi: Ban khong phai chu hop dong!");
        _; // Tiếp tục thực hiện các lệnh bên trong hàm
    }

    // 4. Constructor - Hàm khởi tạo chỉ chạy ĐÚNG 1 LẦN khi deploy contract
    constructor() {
        owner = msg.sender; // Người deploy contract sẽ là owner
    }

    // 5. Hàm gửi tiền vào (Deposit) - Từ khóa payable cho phép nhận ETH
    function deposit() public payable {
        require(msg.value > 0, "So tien gui phai lon hon 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    // 6. Hàm rút tiền (Withdraw)
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "So du khong du!");
        
        // Trừ số dư trước khi chuyển tiền (Best Practice Checks-Effects-Interactions)
        balances[msg.sender] -= amount;

        // Chuyền ETH về ví người yêu cầu
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Chuyen ETH that bai!");

        emit Withdraw(msg.sender, amount);
    }

    // 7. Hàm kiểm tra tổng số ETH đang lưu trữ trong hợp đồng
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
```

---

## 3. Giải Thích Chi Tiết Từng Thành Phần

### 1. `pragma solidity ^0.8.20;`
Khai báo phiên bản trình biên dịch Solidity. Dấu `^` nghĩa là cho phép dùng phiên bản `0.8.20` hoặc các phiên bản mới hơn tương thích (từ `0.8.x`).

### 2. `mapping(address => uint256) public balances;`
`mapping` là bảng tra cứu (giống `Dictionary` trong Python hoặc `Object/Map` trong JS). Ở đây, nó ánh xạ từ **Địa chỉ ví (`address`)** sang **Số dư (`uint256`)**. 
Từ khóa `public` giúp Solidity tự động tạo một hàm đọc dữ liệu miễn phí để ai cũng xem được số dư của mình.

### 3. `msg.sender` và `msg.value` (Biến toàn cục quan trọng)
*   `msg.sender`: Địa chỉ ví của người đang gọi hàm này.
*   `msg.value`: Số lượng ETH (tính bằng Wei) mà người dùng gửi kèm theo giao dịch gọi hàm `deposit()`.

### 4. Từ khóa `payable`
Một hàm trong Solidity mặc định **không được phép nhận ETH**. Nếu bạn gửi ETH vào một hàm không có từ khóa `payable`, giao dịch sẽ lập tức bị báo lỗi và hoàn tác!

### 5. Từ khóa `view` và `pure` (Hàm đọc không tốn Gas)
*   `view`: Hàm chỉ đọc dữ liệu từ Blockchain (`balances`, `address(this).balance`) chứ không ghi hay sửa. Khi gọi từ Frontend, **hàm `view` hoàn toàn miễn phí (0 Gas)**.
*   `pure`: Hàm chỉ tính toán toán học thuần túy bên trong hàm, thậm chí không thèm đọc dữ liệu từ Blockchain.

---

## 4. Tóm tắt & Câu hỏi ôn tập

> [!TIP]
> **Tóm tắt bài học:**
> * Smart Contract thực thi tự động không thể đảo ngược như máy bán nước tự động.
> * Solidity sử dụng `mapping` để lưu trạng thái, `modifier` để lọc điều kiện và `event` để thông báo ra Frontend.
> * Hàm nhận tiền bắt buộc phải có từ khóa `payable`; hàm chỉ đọc dữ liệu dùng từ khóa `view` để miễn phí Gas.

### Câu hỏi suy ngẫm cho AI Tutor:
1. *"Tại sao trong hàm `withdraw()`, chúng ta phải trừ số dư `balances[msg.sender] -= amount;` TRƯỚC KHI thực hiện lệnh chuyển tiền đi?"*
2. *"Sự khác biệt giữa 3 cách chuyển tiền trong Solidity: `transfer()`, `send()` và `call()` là gì?"*
3. *"Làm thế nào để viết test và deploy contract `SimpleBank.sol` lên mạng thử nghiệm Sepolia bằng công cụ Remix IDE?"*
