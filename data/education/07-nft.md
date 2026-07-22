---
lesson_id: nft
title: "Bài 7: NFT & Tiêu Chuẩn Token — ERC-20, ERC-721, ERC-1155 & Ứng Dụng"
difficulty: intermediate
duration_minutes: 35
prerequisites: ["smart-contracts"]
---

# Bài 7: NFT & Tiêu Chuẩn Token — ERC-20, ERC-721, ERC-1155 & Ứng Dụng

Khi nhắc đến Token trên Blockchain, nhiều người chỉ nghĩ đến Bitcoin hay ETH. Tuy nhiên, Ethereum có bộ tiêu chuẩn chuẩn hoá giúp ai cũng có thể phát hành Token của riêng mình chỉ trong vài dòng code. Chúng ta sẽ cùng phân biệt **Fungible Token (Tiền tệ)** và **Non-Fungible Token (NFT - Tài sản độc bản)**.

---

## 1. Fungible vs. Non-Fungible: Khác Nhau Ở Đâu?

### 1. Fungible Token (Có thể thay thế lẫn nhau)
*   **Ẩn dụ:** Bạn có tờ tiền 100,000 VNĐ. Bạn đổi nó lấy tờ 100,000 VNĐ khác của bạn bè. Giá trị hoàn toàn tương đương, không ai quan tâm đó là tờ số seri nào.
*   **Trên Blockchain:** Tiêu chuẩn **ERC-20**. Ví dụ: USDT, LINK, UNI. 1 USDT trong ví bạn hoàn toàn giống và có thể hoán đổi 1:1 với 1 USDT trong ví của tôi.

### 2. Non-Fungible Token (NFT - Không thể thay thế / Độc bản)
*   **Ẩn dụ:** Bức tranh **Mona Lisa** bản gốc trong bảo tàng Louvre. Bạn không thể đổi bức Mona Lisa lấy một bức tranh phong cảnh thông thường vì nó là **duy nhất (Unique)** và có lịch sử sở hữu riêng biệt.
*   **Trên Blockchain:** Tiêu chuẩn **ERC-721** hoặc **ERC-1155**. NFT là bằng chứng sở hữu kỹ thuật số không thể làm giả đối với một tài sản cụ thể (tranh nghệ thuật, vật phẩm game, vé xem phim, sổ đỏ nhà đất...).

---

## 2. Tiêu Chuẩn ERC-20 — Chuẩn Token Đồng Nhất

**ERC-20** là bộ quy tắc tiêu chuẩn định nghĩa các hàm bắt buộc mà một hợp đồng tiền tệ phải có để các sàn giao dịch (DEX) và ví (MetaMask) có thể tự động đọc và giao dịch được:

```solidity
// Các hàm cốt lõi bắt buộc trong chuẩn ERC-20
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
```

> [!NOTE]
> **Cơ chế `approve()` và `transferFrom()`:** Khi bạn muốn đổi token ERC-20 trên sàn Uniswap, trước hết bạn phải gọi hàm `approve()` để cấp quyền cho Smart Contract của Uniswap được phép tiêu một lượng token nhất định trong ví của bạn. Sau đó Uniswap mới gọi `transferFrom()` để rút token đi và chuyển ETH về cho bạn.

---

## 3. Tiêu Chuẩn ERC-721 & ERC-1155 (NFT)

### 1. ERC-721 (Mỗi token là một ID duy nhất)
Mỗi NFT trong chuẩn ERC-721 được định danh bằng một số `tokenId` duy nhất trong hợp đồng:
`mapping(uint256 => address) private _owners; // tokenId => Địa chỉ chủ sở hữu`

### 2. ERC-1155 (Chuẩn đa token Multi-Token cho GameFI)
Trong một tựa game Web3, nếu bạn có **100 bình máu giống hệt nhau** và **1 thanh kiếm độc bản Huyền thoại**:
*   Nếu dùng ERC-721: Bạn phải tạo ra 100 token ID khác nhau cho 100 bình máu $ightarrow$ tốn rất nhiều Gas!
*   **ERC-1155 giải quyết:** Cho phép gom cả Token đồng nhất (bình máu - số lượng 100) và Token độc bản (thanh kiếm - số lượng 1) vào **cùng 1 Smart Contract duy nhất**, giúp chuyển nhiều vật phẩm trong 1 giao dịch để tiết kiệm Gas tối đa.

---

## 4. Metadata và Nơi Lưu Trữ Hình Ảnh NFT

Có một sự thật ít người mới biết: **Hình ảnh của NFT thường KHÔNG được lưu trực tiếp trên Blockchain!**

Do chi phí lưu trữ ảnh/video vài Megabyte trên Ethereum có thể tốn hàng nghìn USD tiền Gas, Smart Contract ERC-721 chỉ lưu một đường dẫn chuỗi gọi là `tokenURI`:

```json
// Ví dụ nội dung của một file JSON Metadata (tokenURI)
{
  "name": "Bored Ape #1234",
  "description": "Một chú khỉ độc bản trong bộ sưu tập BAYC",
  "image": "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/1234.png",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Eyes", "value": "Laser" }
  ]
}
```

*   **Lưu trữ phi tập trung (IPFS / Arweave):** Thay vì lưu file ảnh trên máy chủ Amazon AWS (có thể bị công ty chủ quản xóa bặt vô âm tín), ảnh và metadata của NFT chuẩn sẽ được lưu trên mạng lưới lưu trữ phân tán **IPFS** để đảm bảo tồn tại vĩnh viễn cùng Blockchain.

---

## 5. Tóm tắt & Câu hỏi ôn tập

> [!TIP]
> **Tóm tắt bài học:**
> * **ERC-20** dành cho tiền tệ có thể thay thế lẫn nhau (Fungible Token).
> * **ERC-721** dành cho tài sản độc bản duy nhất; **ERC-1155** tối ưu đa token cho game Web3.
> * Hình ảnh và thông tin của NFT (`tokenURI`) được lưu trên IPFS để tiết kiệm phí Gas và đảm bảo phi tập trung.

### Câu hỏi suy ngẫm cho AI Tutor:
1. *"Soulbound Token (SBT) là gì? Nó khác biệt thế nào so với NFT thông thường và ứng dụng ra sao trong danh tính số?"*
2. *"Điều gì sẽ xảy ra với NFT của bạn nếu máy chủ IPFS lưu trữ file `image` bị nghẽn hoặc mất kết nối?"*
3. *"Làm thế nào để viết Smart Contract cho phép thu tiền bản quyền (Royalty Fee) tự động mỗi khi NFT được mua bán lại?"*
