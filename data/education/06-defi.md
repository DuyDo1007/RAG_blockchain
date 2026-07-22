---
lesson_id: defi
title: "Bài 6: DeFi — Tài Chính Phi Tập Trung & Các Mô Hình Cốt Lõi (AMM, DEX, Lending)"
difficulty: intermediate
duration_minutes: 40
prerequisites: ["smart-contracts"]
---

# Bài 6: DeFi — Tài Chính Phi Tập Trung & Các Mô Hình Cốt Lõi (AMM, DEX, Lending)

**DeFi (Decentralized Finance - Tài chính phi tập trung)** là ứng dụng thành công và mạnh mẽ nhất của Smart Contract trên Blockchain. Trong bài học này, chúng ta sẽ tìm hiểu cách DeFi tái tạo toàn bộ hệ thống ngân hàng truyền thống (Sàn giao dịch, Cho vay, Gửi tiết kiệm) mà không cần đến bất kỳ tổ chức trung gian nào.

---

## 1. Sàn Giao Dịch Phi Tập Trung (DEX) vs. Sàn Tập Trung (CEX)

Khi bạn mua bán Bitcoin trên Binance hoặc Coinbase, bạn đang dùng **Sàn tập trung (CEX - Centralized Exchange)**:
*   Bạn phải nạp tiền vào ví của sàn (Giao quyền kiểm soát tài sản cho sàn).
*   Sàn khớp lệnh mua/bán bằng một cuốn **Sổ lệnh (Order Book)** chạy trên máy chủ tập trung của họ.

Ngược lại, **DEX (như Uniswap, PancakeSwap)** cho phép bạn giao dịch **trực tiếp từ ví cá nhân (P2P)** thông qua Smart Contract mà không cần nạp tiền cho ai!

---

## 2. AMM (Automated Market Maker) & Công Thức Hằng Số Tích $x \cdot y = k$

Làm sao Uniswap có thể cho phép người dùng đổi từ ETH sang USDT ngay lập tức 24/7 mà không cần chờ có người đặt lệnh bán đối ứng trong Sổ lệnh? Câu trả lời là **AMM (Công cụ tạo lập thị trường tự động)** và **Hồ bơi thanh khoản (Liquidity Pool)**.

### Cơ chế hoạt động của bể thanh khoản:
1.  **Nhà cung cấp thanh khoản (LP - Liquidity Provider):** Đóng góp cả 2 loại token vào một hợp đồng chung (Ví dụ: bỏ vào bể 10 ETH và 30,000 USDT).
2.  **Người giao dịch (Trader):** Khi muốn đổi USDT lấy ETH, họ nạp USDT vào bể và rút ETH ra khỏi bể theo một công thức toán học tự động điều chỉnh giá.

### Công thức kinh điển của Uniswap V2:
$$x \cdot y = k$$

Trong đó:
*   $x$: Số lượng token A trong bể (ví dụ: ETH).
*   $y$: Số lượng token B trong bể (ví dụ: USDT).
*   $k$: **Hằng số không đổi** trong suốt quá trình một giao dịch diễn ra.

```
+---------------------------------------------------------------+
|               VÍ DỤ TÍNH GIÁ AMM (x * y = k)                  |
+---------------------------------------------------------------+
| Trạng thái ban đầu trong bể:                                  |
| x = 10 ETH, y = 30,000 USDT  --->  k = 10 * 30,000 = 300,000  |
+---------------------------------------------------------------+
| Trader muốn mua ETH bằng cách nạp vào bể 3,000 USDT:          |
| -> y mới = 30,000 + 3,000 = 33,000 USDT                       |
| -> Vì k không đổi (300,000), x mới = 300,000 / 33,000 = 9.09 ETH |
+---------------------------------------------------------------+
| Số ETH Trader nhận được:                                      |
| 10 - 9.09 = 0.91 ETH (Thay vì 1.0 ETH do bị Trượt giá - Price |
| Impact khi bể có thanh khoản nhỏ!)                            |
+---------------------------------------------------------------+
```

---

## 3. Tổn Thất Tạm Thời (Impermanent Loss - IL)

Khi bạn làm người cung cấp thanh khoản (LP) để kiếm phí giao dịch, bạn phải đối mặt với rủi ro lớn mang tên **Impermanent Loss (IL)**.

> [!WARNING]
> **Impermanent Loss là gì?**
> Là khoản lỗ chênh lệch khi bạn so sánh giữa việc **bỏ token vào bể thanh khoản AMM** so với việc **chỉ giữ nguyên token trong ví (HODL)** khi giá token trên thị trường biến động mạnh. Giá càng biến động mạnh (tăng mạnh hoặc giảm mạnh), tổn thất IL của bạn càng lớn!

---

## 4. Vay và Cho Vay Phi Tập Trung (Decentralized Lending: Aave, Compound)

Trong ngân hàng truyền thống, để vay tiền bạn phải chứng minh thu nhập, thế chấp sổ đỏ và thẩm định nhiều ngày. Trong DeFi, việc vay và cho vay diễn ra trong vài giây thông qua cơ chế **Thế chấp vượt mức (Over-collateralization)**:

*   **Người cho vay (Lender):** Gửi USDT/ETH vào Smart Contract ngân hàng (như Aave) để hưởng lãi suất động theo thời gian thực (ví dụ 5%/năm).
*   **Người đi vay (Borrower):** Muốn vay 1,000 USDT? Bạn bắt buộc phải nạp tài sản thế chấp (ví dụ ETH) có giá trị cao hơn số tiền vay vào hợp đồng (Ví dụ nạp 1,500 USD ETH $ightarrow$ tỷ lệ thế chấp 150%).
*   **Thanh lý tự động (Liquidation):** Nếu thị trường sập, giá ETH bạn thế chấp giảm mạnh xuống chỉ còn trị giá 1,100 USD (chạm ngưỡng thanh lý), Smart Contract sẽ **tự động bán tháo ETH** của bạn để thu hồi lại 1,000 USDT trả cho bể, đảm bảo ngân hàng DeFi không bao giờ bị nợ xấu!

---

## 5. Tóm tắt & Câu hỏi ôn tập

> [!TIP]
> **Tóm tắt bài học:**
> * DEX cho phép giao dịch P2P không cần nạp tiền vào sàn tập trung.
> * AMM sử dụng công thức $x \cdot y = k$ và Liquidity Pool để định giá tự động 24/7.
> * Lending DeFi hoạt động an toàn không cần thẩm định nhờ cơ chế thế chấp vượt mức và thanh lý tự động.

### Câu hỏi suy ngẫm cho AI Tutor:
1. *"Vay nóng chớp nhoáng (Flash Loan) là gì? Làm thế nào một người có thể vay hàng trăm triệu USD mà không cần 1 đồng thế chấp nào trong DeFi?"*
2. *"Sự khác biệt giữa Stablecoin được bảo chứng bằng tiền mặt (USDT/USDC) và Stablecoin phi tập trung (DAI) là gì?"*
3. *"Tại sao Uniswap V3 lại ra đời cơ chế 'Thanh khoản tập trung' (Concentrated Liquidity) thay thế cho V2?"*
