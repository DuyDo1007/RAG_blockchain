---
lesson_id: blockchain-basics
title: "Bài 1: Blockchain Là Gì? Căn Bản Về Chuỗi Khối & Sổ Cái Phi Tập Trung"
difficulty: beginner
duration_minutes: 30
prerequisites: []
---

# Bài 1: Blockchain Là Gì? Căn Bản Về Chuỗi Khối & Sổ Cái Phi Tập Trung

Chào mừng bạn đến với Lộ trình học Blockchain từ con số 0! Trong bài học đầu tiên này, chúng ta sẽ khám phá nền tảng core của toàn bộ công nghệ Web3: **Blockchain (Chuỗi khối)**.

---

## 1. Ẩn dụ thực tế: Sổ Cái Công Khai vs. Ngân Hàng Truyền Thống

Hãy tưởng tượng bạn cùng 4 người bạn đi du lịch và cần ghi lại các khoản chi tiêu chung. Có hai cách để làm điều này:

### Cách 1: Giao cho một người giữ sổ (Mô hình Tập trung - Centralized)
Bạn chọn bạn **An** làm thủ quỹ và ghi sổ. Mọi người muốn kiểm tra tiền đều phải hỏi An.
*   **Rủi ro:** Nếu sổ của An bị mất, bị rách, hoặc An cố tình "ghi khống" thêm số tiền để lợi dụng, 4 người còn lại không hề hay biết hoặc không có bằng chứng để đối chiếu. Đây là vấn đề **Điểm lỗi đơn lẻ (Single Point of Failure)** và **Sự phụ thuộc vào bên thứ ba (Trust Issue)**.

### Cách 2: Tất cả cùng giữ một bản sao sổ (Mô hình Phi tập trung - Decentralized/Blockchain)
Thay vì chỉ An ghi, **cả 5 người đều có một cuốn sổ giống hệt nhau**. 
Khi bạn **Bình** trả 200,000 VNĐ tiền ăn trưa, Bình hô to: *"Tôi vừa trả 200k tiền cơm!"*
Cả 4 người còn lại lấy sổ ra kiểm tra, xác nhận và đồng loạt ghi vào sổ của mình dòng chữ: *"Bình chi 200k cho cả nhóm"*.
*   **Kết quả:** Nếu An muốn sửa trộm sổ của mình thành *"Bình chỉ chi 100k"*, khi đối chiếu, 4 cuốn sổ còn lại sẽ ngay lập tức phát hiện và **bác bỏ bản ghi giả mạo** của An.

> [!IMPORTANT]
> **Khái niệm cốt lõi:** Blockchain chính là cuốn **"Sổ cái công khai phân tán" (Distributed Public Ledger)** như ở Cách 2. Nó được lưu trữ trên hàng nghìn máy tính (gọi là các **Node**) khắp thế giới, đảm bảo dữ liệu **minh bạch, không thể làm giả hay tẩy xoá**.

---

## 2. Cấu Trúc Khối (Block) và Chuỗi (Chain)

Tại sao lại gọi là **Block-Chain (Chuỗi-Khối)**?

Mỗi trang trong cuốn sổ cái phi tập trung được gọi là một **Khối (Block)**. Khi một trang (Block) đã được ghi đầy các giao dịch, nó sẽ được "đóng dấu" và khoá lại bằng mật mã học, sau đó nối vào các trang trước đó tạo thành một **Chuỗi (Chain)** liền mạch theo thời gian.

Cấu trúc bên trong của một **Block** bao gồm 3 phần chính:

```
+-------------------------------------------------------+
|                       BLOCK #102                      |
+-------------------------------------------------------+
|  1. Dữ liệu (Data):                                   |
|     - Giao dịch: A chuyển cho B 5 BTC                 |
|     - Thời gian: 2026-07-19 14:00:00                 |
+-------------------------------------------------------+
|  2. Mã băm hiện tại (Current Hash):                   |
|     0x8a9f...3c21  (Dấu vân tay số của khối này)      |
+-------------------------------------------------------+
|  3. Mã băm khối trước (Previous Hash):                |
|     0x7b1e...9d44  (Dấu vân tay số của khối #101)     |
+-------------------------------------------------------+
```

### Giải thích chi tiết:
1. **Dữ liệu (Data):** Chứa danh sách các giao dịch diễn ra trong khoảng thời gian khối đó được tạo (ví dụ: Ai chuyển tiền cho ai, số lượng bao nhiêu, thời gian nào).
2. **Mã băm hiện tại (Hash):** Giống như **"Dấu vân tay kỹ thuật số"** của khối. Chỉ cần thay đổi 1 ký tự nhỏ trong dữ liệu khối, mã Hash này sẽ thay đổi hoàn toàn.
3. **Mã băm khối liền trước (Previous Hash):** Đây là sợi dây xích kết nối khối hiện tại với khối ngay trước nó.

---

## 3. Tính Bất Biến (Immutability): Tại sao không thể sửa dữ liệu?

Hãy xem điều gì xảy ra nếu một Hacker (Hải) muốn hack sửa lại giao dịch trong **Block #101**:

```
[ Block #100 ] <--- [ Block #101 (Bị sửa!) ] <--- [ Block #102 ]
Hash: 0x1111        Hash cũ: 0x7b1e             PrevHash: 0x7b1e (Lỗi nối!)
                    Hash mới: 0x9999 (Thay đổi)
```

1. Khi Hải sửa dữ liệu trong **Block #101**, mã Hash của khối #101 lập tức biến đổi từ `0x7b1e` thành `0x9999`.
2. Tuy nhiên, **Block #102** vẫn đang ghi nhớ `Previous Hash` là `0x7b1e`.
3. Sợi dây xích bị đứt! Toàn bộ các khối từ #102 trở đi bị coi là **không hợp lệ (Invalid)**.
4. Để hack thành công, Hải sẽ phải tính toán lại Hash cho *toàn bộ* các khối phía sau, và thực hiện điều đó trên **hơn 51% tổng số máy tính (Node)** trong mạng lưới cùng một lúc. Điều này là **gần như bất khả thi** về mặt điện năng và chi phí tính toán!

---

## 4. Đặc tính nổi bật của Blockchain

| Đặc tính | Giải thích ngắn gọn | Lợi ích cho người dùng |
| :--- | :--- | :--- |
| **Phi tập trung (Decentralized)** | Không do bất kỳ cá nhân, công ty hay chính phủ nào kiểm soát | Tránh rủi ro bị độc quyền, kiểm duyệt hoặc đình chỉ tài khoản trái phép |
| **Minh bạch (Transparent)** | Mọi giao dịch đều công khai, ai cũng có thể tra cứu trên Explorer | Chống tham nhũng, gian lận, dễ dàng kiểm toán tự động |
| **Bất biến (Immutable)** | Dữ liệu đã ghi vào khối thì không thể xoá bỏ hay sửa đổi | Đảm bảo tính toàn vẹn và lịch sử chính xác tuyệt đối |
| **Không cần tin cậy bên thứ 3 (Trustless)** | Tin vào toán học và thuật toán thay vì tin vào con người hay ngân hàng | Giảm chi phí trung gian, giao dịch trực tiếp P2P |

---

## 5. Tóm tắt & Câu hỏi ôn tập

> [!TIP]
> **Tóm tắt bài học:**
> * Blockchain là một cuốn sổ cái kỹ thuật số phân tán, minh bạch và không thể sửa đổi.
> * Các giao dịch được gom vào Block và kết nối thành Chain nhờ mã Hash của khối trước.
> * Tính chất bất biến được bảo vệ bởi mật mã học và sự đồng thuận của hàng nghìn Node.

### Câu hỏi suy ngẫm cho AI Tutor:
Bạn có thể thử nhấp vào khung chat **AI Tutor** bên phải và hỏi những câu hỏi sau:
1. *"Tại sao nói Blockchain là Trustless (không cần tin cậy) trong khi chúng ta vẫn phải tin vào mạng lưới?"*
2. *"Nếu một máy tính (Node) trong mạng lưới bị ngắt điện hoặc bị hỏng, dữ liệu Blockchain có bị mất không?"*
3. *"Sự khác biệt lớn nhất giữa Cơ sở dữ liệu truyền thống (SQL/NoSQL) và Blockchain là gì?"*
