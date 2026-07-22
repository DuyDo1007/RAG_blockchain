---
lesson_id: ethereum
title: "Bài 4: Ethereum & Máy Ảo EVM — Chiếc Máy Tính Của Toàn Thế Giới"
difficulty: intermediate
duration_minutes: 40
prerequisites: ["consensus"]
---

# Bài 4: Ethereum & Máy Ảo EVM — Chiếc Máy Tính Của Toàn Thế Giới

Nếu Bitcoin được coi là **"Vàng kỹ thuật số" (Digital Gold)** giúp lưu trữ giá trị đơn thuần, thì **Ethereum** chính là một bước tiến hoá vượt bậc: **"Chiếc máy tính phi tập trung của toàn cầu" (World Computer)**. Trong bài này, chúng ta sẽ khám phá cách Ethereum mở ra kỷ nguyên Web3 và Smart Contract.

---

## 1. Khác Biệt Cốt Lõi: Bitcoin vs. Ethereum

Sự khác biệt lớn nhất giữa Bitcoin và Ethereum nằm ở **khả năng lập trình (Programmability)**:

*   **Bitcoin (máy tính bỏ túi Casio):** Chỉ thiết kế chuyên biệt cho 1 công việc duy nhất: Ghi nhận giao dịch chuyển tiền từ A sang B một cách an toàn. Bạn không thể cài game hay ứng dụng lên máy tính Casio.
*   **Ethereum (điện thoại thông minh Smartphone):** Có một hệ điều hành phi tập trung bên trong. Bạn có thể tự do viết code, triển khai các **Hợp đồng thông minh (Smart Contract)** để chạy bất kỳ ứng dụng nào: Ngân hàng số, Game, Mạng xã hội, sàn giao dịch... mà không ai có thể tắt hay chặn được!

---

## 2. Máy Ảo Ethereum (EVM - Ethereum Virtual Machine)

Làm sao hàng nghìn máy tính chạy Windows, macOS, Linux khác nhau lại có thể chạy cùng một đoạn code Smart Contract và cho ra kết quả giống hệt nhau từng byte? Câu trả lời là **EVM (Ethereum Virtual Machine)**.

```
+---------------------------------------------------------------+
|                    KIẾN TRÚC THỰC THI EVM                     |
+---------------------------------------------------------------+
|  Code Solidity (Người lập trình viết):                        |
|  function transfer(address to, uint amount) public { ... }    |
+---------------------------------------------------------------+
                                │
                        (Trình biên dịch solc)
                                ▼
+---------------------------------------------------------------+
|  Bytecode (Dãy số 0x6080604052... mà máy ảo hiểu):            |
|  PUSH1 0x80 PUSH1 0x40 MSTORE CALLVALUE DUP1 ...              |
+---------------------------------------------------------------+
                                │
                      (Chạy trên hàng nghìn Node)
                                ▼
+---------------------------------------------------------------+
|  EVM (Máy ảo hợp nhất):                                       |
|  Cập nhật trạng thái số dư, biến trong bộ nhớ toàn cầu       |
+---------------------------------------------------------------+
```

EVM đóng vai trò như một "nhà máy xử lý" cách ly hoàn toàn với máy chủ vật lý, giúp thực hiện các lệnh toán học và logic một cách an toàn tuyệt đối.

---

## 3. Hai Loại Tài Khoản Trên Ethereum

Trên Ethereum, không phải tài khoản nào cũng giống nhau. Có 2 loại tài khoản chính:

### 1. Externally Owned Account (EOA - Tài khoản sở hữu bên ngoài)
*   **Là gì?** Là tài khoản do **con người** kiểm soát bằng **Private Key** (ví dụ: ví MetaMask, Trust Wallet của bạn).
*   **Đặc điểm:** Có số dư ETH, có thể chủ động khởi tạo giao dịch chuyển tiền hoặc gọi hàm Smart Contract. **EOA không chứa bất kỳ đoạn code nào.**

### 2. Contract Account (CA - Tài khoản hợp đồng)
*   **Là gì?** Là tài khoản do **đoạn mã code (Smart Contract)** kiểm soát.
*   **Đặc điểm:** Có số dư ETH, **chứa đoạn code logic bên trong**. CA không có Private Key và **không thể tự động chủ động khởi tạo giao dịch**! Nó chỉ thức dậy và thực hiện lệnh khi được một EOA (hoặc một contract khác) gọi đến.

---

## 4. Phí Gas (Gas Fee) — Nhiên Liệu Của Mạng Lưới

Tại sao mỗi lần chuyển tiền hay tương tác trên Ethereum bạn đều phải trả một khoản phí gọi là **Gas**?

### Ẩn dụ thực tế: Chuyến xe taxi
Khi bạn đi xe taxi, quãng đường càng xa và xe chạy càng nhanh thì tiền xăng (Gas) bạn trả cho tài xế càng nhiều.

Trong Ethereum, mỗi lệnh tính toán (cộng, trừ, lưu dữ liệu vào bộ nhớ) đều tiêu tốn một lượng **Gas** nhất định:
*   Phép cộng đơn giản (`ADD`): Tốn ~3 Gas.
*   Lưu một biến mới vào bộ nhớ vĩnh viễn (`SSTORE`): Tốn ~20,000 Gas!

```
[ Tổng Phí Giao Dịch ] = [ Lượng Gas Tiêu Thụ (Gas Used) ] x [ Giá Gas (Gas Price tính bằng Gwei) ]
*(1 Gwei = 0.000000001 ETH)*
```

### 2 Lý do bắt buộc phải có Gas Fee:
1.  **Chống tấn công Spam / Lặp vô hạn (Infinite Loop):** Nếu không có phí Gas, một Hacker có thể viết một đoạn code lặp vô hạn `while(true) {}` và gửi lên mạng lưới khiến toàn bộ các máy tính EVM trên thế giới bị treo vĩnh viễn! Nhờ phí Gas, khi tiền Gas trong giao dịch bị trừ hết (`Out of Gas`), EVM sẽ lập tức dừng lệnh và khôi phục trạng thái ban đầu.
2.  **Trả công cho Validator:** Khuyến khích các thợ mỏ/người xác thực duy trì mạng lưới.

---

## 5. Tóm tắt & Câu hỏi ôn tập

> [!TIP]
> **Tóm tắt bài học:**
> * Ethereum mở ra khả năng lập trình phi tập trung với hệ điều hành toàn cầu EVM.
> * Mạng lưới gồm tài khoản con người (EOA) và tài khoản code (Contract Account).
> * Phí Gas là nhiên liệu bắt buộc để ngăn chặn tấn công lặp vô hạn và trả thưởng cho Validator.

### Câu hỏi suy ngẫm cho AI Tutor:
1. *"Tại sao việc lưu trữ dữ liệu (SSTORE) trên Ethereum lại đắt gấp hàng nghìn lần so với việc tính toán cộng trừ?"*
2. *"Sự khác biệt giữa Gas Limit, Gas Used và Base Fee trong bản cập nhật EIP-1559 là gì?"*
3. *"Nếu một giao dịch bị lỗi `Out of Gas` giữa chừng, số tiền Gas bạn đã trả có được hoàn lại không?"*
