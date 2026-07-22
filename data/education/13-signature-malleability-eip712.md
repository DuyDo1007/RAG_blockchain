---
lesson_id: lesson-15
title: EIP-712 Typed Data Signing & Signature Security
category: vulnerabilities
difficulty: intermediate
duration_minutes: 50
prerequisites: ["lesson-02", "lesson-05"]
---

# EIP-712 Typed Data Signing & Signature Security

## 1. Giới thiệu EIP-712 Structured Data Signing
Trong Web3, việc ký thông điệp bằng chữ ký số ECDSA (khóa riêng tư của ví) rất phổ biến trong các tính năng:
- **Gasless Transactions (Permit / Meta-transactions)**: Người dùng ký message off-chain, relayer gửi lên chain để trả phí gas thay.
- **Off-chain Order Books (NFT Marketplace / DEX)**: Ký lệnh mua/bán off-chain.

Trước khi EIP-712 ra đời, người dùng phải ký các chuỗi byte khó hiểu (raw bytes hex) thông qua `eth_sign`, dẫn đến rủi ro ký nhầm các giao dịch độc hại mà không thể đọc được nội dung.

**EIP-712** ra đời nhằm định dạng dữ liệu ký dưới dạng **Typed Structured Data** hiển thị rõ ràng trên ví (MetaMask) và tích hợp cơ chế **Domain Separator** phòng chống tấn công Replay.

```solidity
// Cấu trúc Domain Separator EIP-712

struct EIP712Domain {
    string name;              // Tên dApp/Protocol (ví dụ: "Uniswap")
    string version;           // Phiên bản contract (ví dụ: "1")
    uint256 chainId;          // ID mạng lưới (ví dụ: 1 cho Ethereum Mainnet, 137 cho Polygon)
    address verifyingContract; // Địa chỉ Hợp đồng xác thực chữ ký
}
```

## 2. Các Lỗ Hổng Bảo Mật Liên Quan Đến Chữ Ký

### A. Tấn công Cross-Chain & Cross-Contract Replay Attack
Nếu Hợp đồng xác thực chữ ký không đưa `chainId` hoặc `verifyingContract` vào trong **Domain Separator**:
- Một chữ ký người dùng ký để chuyển 100 USDC trên Polygon có thể bị kẻ tấn công lấy lại (replay) và gửi lên Ethereum Mainnet để rút thêm 100 USDC!
- Một chữ ký dành cho Contract A có thể bị phát lại trên Contract B nếu cả hai hợp đồng dùng chung cấu trúc message mà không phân biệt `verifyingContract`.

### B. Signature Malleability (Tính Biến Đổi của Chữ Ký ECDSA)
Chữ ký ECDSA trên đường cong elliptic secp256k1 gồm 3 thành phần `(r, s, v)`.

Do tính chất đối xứng của đường cong Elliptic, đối với bất kỳ chữ ký hợp lệ `(r, s, v)` nào cho thông điệp $M$, ta luôn có thể tạo ra một chữ ký thứ hai `(r, s', v')` hợp lệ cho cùng thông điệp $M$ mà không cần biết Private Key!

```solidity
// Ví dụ lỗ hổng Signature Malleability do lưu vết bằng chính Signature Bytes

mapping(bytes => bool) public executedSignatures;

function executeWithSignature(bytes memory signature, bytes memory data) external {
    // LỖ HỔNG: Sử dụng mảng bytes của chữ ký làm ID đánh dấu đã dùng
    require(!executedSignatures[signature], "Signature already used");
    
    address signer = recoverSigner(data, signature);
    require(signer == owner, "Invalid signer");

    executedSignatures[signature] = true; // Kẻ tấn công có thể biến đổi s -> s' để tạo signature mới và vượt qua kiểm tra!
    // ...
}
```

### C. Signature Replay thiếu Nonce / Deadline
Nếu thông điệp không chứa giá trị **Nonce** (đếm số thứ tự) hoặc **Deadline** (thời hạn hết hiệu lực), kẻ tấn công có thể giữ lại chữ ký cũ và thực thi lại nhiều lần trong tương lai.

## 3. Thực Tiễn Tốt Nhất Phòng Thụ (Best Practices)

### A. Sử dụng Thư viện OpenZeppelin ECDSA & EIP712
Thư viện `ECDSA.sol` của OpenZeppelin tự động kiểm tra và từ chối các chữ ký có giá trị `s` thuộc nửa trên của đường cong Elliptic (Lower-S enforcement), loại bỏ hoàn toàn lỗ hổng Signature Malleability.

```solidity
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract SecurePermit is EIP712 {
    using ECDSA for bytes32;

    mapping(address => uint256) public nonces;

    constructor() EIP712("SecureToken", "1") {}

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        bytes memory signature
    ) external {
        require(block.timestamp <= deadline, "Signature expired");

        // Tạo hash thông điệp chuẩn EIP-712
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                value,
                nonces[owner]++,
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address recoveredAddress = hash.recover(signature);

        require(recoveredAddress != address(0) && recoveredAddress == owner, "Invalid signature");
        
        // Cấp quyền spender...
    }
}
```

---

## 4. Tóm tắt Kiểm toán (Auditor Checklist)
- [ ] Xác minh Domain Separator có chứa cả `block.chainid` (hoặc `getChainId()`) và `address(this)` hay không.
- [ ] Đảm bảo chữ ký được bảo vệ chống Replay bằng **Nonce** tăng dần cho từng tài khoản và có thời hạn **Deadline**.
- [ ] Không bao giờ lưu vết chữ ký bằng chuỗi `bytes signature` thô. Luôn lưu bằng `nonce` hoặc `hash` của thông điệp.
- [ ] Luôn kiểm tra địa chỉ khôi phục `recoveredAddress != address(0)` (vì `ecrecover` trả về `0x0` nếu signature bị lỗi).
