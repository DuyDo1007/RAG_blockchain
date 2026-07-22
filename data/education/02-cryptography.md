---
lesson_id: cryptography
title: "Bài 2: Mật Mã Học Trong Blockchain — Hash, Khoá Công Khai & Chữ Ký Số"
difficulty: beginner
duration_minutes: 35
prerequisites: ["blockchain-basics"]
---

# Bài 2: Mật Mã Học Trong Blockchain — Hash, Khoá Công Khai & Chữ Ký Số

Ở Bài 1, chúng ta biết Blockchain an toàn và bất biến nhờ "mật mã học". Nhưng cụ thể mật mã học hoạt động ra sao? Trong bài học này, chúng ta sẽ tìm hiểu 3 trụ cột mật mã học bảo vệ tài sản của bạn: **Hàm băm (Hash Function)**, **Mật mã bất đối xứng (Public/Private Key)** và **Chữ ký số (Digital Signature)**.

---

## 1. Hàm Băm (Hash Function) — Máy Xay Dữ Liệu Một Chiều

**Hàm băm (Hash Function)** là một thuật toán toán học nhận vào một dữ liệu có kích thước bất kỳ (một dòng chữ, một cuốn sách hay một video 4K) và biến nó thành một chuỗi ký tự có độ dài **cố định**.

Trong Bitcoin và nhiều Blockchain, hàm băm phổ biến nhất là **SHA-256** (Secure Hash Algorithm 256-bit).

### Ví dụ minh hoạ SHA-256:
*   Đầu vào: `"Xin chào Blockchain"` 
    $ightarrow$ Đầu ra: `0x4e8d2e...9f1a` (độ dài đúng 64 ký tự hex)
*   Đầu vào: `"Xin chào Blockchain!"` *(chỉ thêm 1 dấu chấm than)*
    $ightarrow$ Đầu ra: `0x8b11c3...4a72` *(thay đổi hoàn toàn - Hiệu ứng thác đổ Avalanche Effect)*

### 3 Đặc tính tối quan trọng của Hàm băm:
1.  **Một chiều (One-way):** Từ chuỗi `0x4e8d2e...`, bạn **không thể suy ngược** ra câu gốc `"Xin chào Blockchain"`. Giống như khi bạn xay thịt thành xúc xích, bạn không thể biến xúc xích ngược lại thành miếng thịt nguyên ban đầu!
2.  **Tính duy nhất (Collision Resistance):** Gần như không thể tìm thấy 2 nội dung khác nhau mà cho ra cùng một mã Hash.
3.  **Tốc độ siêu nhanh:** Máy tính có thể tính Hash của hàng triệu giao dịch chỉ trong vài mili giây.

---

## 2. Mật Mã Bất Đối Xứng: Khoá Công Khai (Public Key) & Khoá Riêng Tư (Private Key)

Trong cuộc sống truyền thống, bạn dùng một chiếc chìa khoá duy nhất để vừa mở vừa khoá nhà (Mật mã đối xứng). Nhưng trong Blockchain, chúng ta sử dụng **Mật mã bất đối xứng (Asymmetric Cryptography)** với một **cặp khoá sinh đôi**:

```
+---------------------------------------------------------------+
|                      CẶP KHOÁ BLOCKCHAIN                      |
+---------------------------------------------------------------+
|  Khoá Công Khai (Public Key / Địa Chỉ Ví):                    |
|  - Giống như: Số Tài Khoản Ngân Hàng / Hòm Thư                |
|  - Công dụng: Ai cũng có thể biết để gửi tiền cho bạn         |
|  - Ví dụ: 0x71C...892B                                        |
+---------------------------------------------------------------+
|  Khoá Riêng Tư (Private Key / Secret Key):                    |
|  - Giống như: Mật Khẩu Két Sắt / Chìa Khoá Vàng               |
|  - Công dụng: Ký xác nhận để tiêu tiền hoặc chuyển tiền đi   |
|  - Ví dụ: 0xe4a2...119c (TUYỆT ĐỐI KHÔNG TIẾT LỘ CHO AI!)     |
+---------------------------------------------------------------+
```

> [!CAUTION]
> **Quy tắc vàng của Web3: "Not Your Keys, Not Your Coins"**
> Nếu bạn để lộ **Private Key** (hoặc 12 từ khoá khôi phục - Seed Phrase), bất kỳ ai cũng có thể toàn quyền rút sạch tiền trong ví của bạn. Ngược lại, nếu bạn làm mất Private Key, không một ngân hàng hay công ty nào trên thế giới có thể khôi phục lại tiền cho bạn!

---

## 3. Chữ Ký Số (Digital Signature) — Cách xác minh chủ sở hữu tiền

Khi bạn muốn chuyển 10 USDT từ ví của bạn sang ví của bạn bè, làm thế nào mạng lưới Blockchain biết chắc chắn giao dịch đó do chính bạn tạo ra chứ không phải kẻ gian giả mạo? Câu trả lời là **Chữ ký số (Digital Signature)**.

Quy trình ký và xác minh diễn ra trong 3 bước tự động:

```
[Bước 1: Tạo Giao Dịch]
Bạn viết: "Chuyển 10 USDT cho ví B"
          │
          ▼
[Bước 2: Ký bằng Private Key]
Giao dịch + Private Key của bạn  ──>  [ Chữ Ký Số (Signature: 0x3f...9d) ]
          │
          ▼
[Bước 3: Mạng Lưới Xác Minh]
Mạng lưới lấy: Giao dịch + Chữ Ký Số + Public Key của bạn
          │
          ▼
Kết quả: TRUE (Hợp lệ, tiến hành chuyển tiền) / FALSE (Giả mạo, hủy bỏ!)
```

### Điều kỳ diệu của Toán học:
Mạng lưới có thể **xác minh 100% chính xác** rằng chữ ký `0x3f...9d` được tạo ra từ Private Key của bạn thông qua Public Key, **mà không cần bạn phải tiết lộ Private Key cho mạng lưới!**

---

## 4. Tóm tắt & Câu hỏi ôn tập

> [!TIP]
> **Tóm tắt bài học:**
> * **Hàm băm SHA-256** giúp mã hoá dữ liệu thành chuỗi cố định một chiều, bảo vệ tính toàn vẹn của Block.
> * **Public Key** là địa chỉ nhận tiền công khai, **Private Key** là chìa khoá bí mật tuyệt đối để kiểm soát tiền.
> * **Chữ ký số** cho phép chứng minh bạn là chủ sở hữu hợp pháp của giao dịch mà không cần lộ Private Key.

### Câu hỏi suy ngẫm cho AI Tutor:
Hãy thử hỏi AI Tutor của bạn những câu sau để hiểu sâu hơn:
1. *"Tại sao từ Private Key có thể suy ra Public Key, nhưng từ Public Key lại không thể suy ngược ra Private Key?"*
2. *"Sự khác nhau giữa Private Key và Seed Phrase (12/24 từ khôi phục) là gì?"*
3. *"Thuật toán chữ ký số phổ biến trên Ethereum là gì và nó hoạt động thế nào?"*
