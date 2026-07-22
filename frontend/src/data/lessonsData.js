// 12 Blockchain Security lessons with lab configurations
// Used as fallback when API is unavailable (e.g., guest mode)

export const lessonsData = [
  {
    id: 'lesson-01',
    title: 'Blockchain Fundamentals',
    description: 'Tìm hiểu cơ bản về công nghệ Blockchain: cấu trúc dữ liệu chuỗi khối, hàm băm (hash), Merkle Tree, consensus mechanisms và cách chúng đảm bảo tính bất biến.',
    difficulty: 'beginner',
    duration_minutes: 30,
    category: 'fundamentals',
    icon: '🔗',
    labEnabled: true,
    labType: 'code',
    labTitle: 'Xây dựng Blockchain đơn giản bằng Python',
    labDescription: 'Viết code tạo block, tính hash SHA-256, và liên kết các block thành chuỗi.',
    labStarterCode: `# Lab: Xây dựng Blockchain đơn giản
import hashlib
import json
from datetime import datetime

class Block:
    def __init__(self, index, data, previous_hash):
        self.index = index
        self.timestamp = str(datetime.now())
        self.data = data
        self.previous_hash = previous_hash
        self.hash = self.calculate_hash()
    
    def calculate_hash(self):
        # TODO: Tính hash SHA-256 của block (Gợi ý: băm chuỗi JSON biểu diễn block bằng hashlib.sha256)
        pass

class Blockchain:
    def __init__(self):
        self.chain = [self.create_genesis_block()]
    
    def create_genesis_block(self):
        return Block(0, "Genesis Block", "0")
    
    def add_block(self, data):
        # TODO: Thêm block mới vào chuỗi self.chain (Gợi ý: lấy hash của block cuối cùng làm previous_hash)
        pass
    
    def is_chain_valid(self):
        # TODO: Kiểm tra tính toàn vẹn của chuỗi (trả về True nếu hợp lệ, False nếu phát hiện gian lận)
        return False
`,

    quiz_questions: [
      {
        question: 'Hàm băm SHA-256 tạo ra output có độ dài bao nhiêu bit?',
        options: ['128 bit', '256 bit', '512 bit', '1024 bit'],
        correct: 1
      },
      {
        question: 'Merkle Tree được sử dụng trong blockchain để làm gì?',
        options: ['Mã hóa dữ liệu', 'Xác minh tính toàn vẹn giao dịch', 'Tạo khóa riêng', 'Mining'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-02',
    title: 'Smart Contract & Solidity Basics',
    description: 'Giới thiệu Solidity, ngôn ngữ lập trình Smart Contract trên Ethereum. Tìm hiểu cú pháp, kiểu dữ liệu, functions, modifiers và cách deploy contract.',
    difficulty: 'beginner',
    duration_minutes: 45,
    category: 'smart-contracts',
    icon: '📜',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Viết Smart Contract đầu tiên',
    labDescription: 'Tạo một contract SimpleStorage với hàm get/set và event logging.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private storedValue;
    address public owner;
    
    event ValueChanged(uint256 oldValue, uint256 newValue, address changedBy);
    
    constructor() {
        owner = msg.sender;
    }
    
    // TODO: Viết hàm set() để lưu storedValue và phát ra event ValueChanged
    function set(uint256 _value) public {
        
    }
    
    // TODO: Viết hàm get() để trả về storedValue
    function get() public view returns (uint256) {
        
    }
    
    // TODO: Thêm modifier onlyOwner để giới hạn quyền truy cập chỉ dành cho owner
    modifier onlyOwner() {
        
        _;
    }
}
`,

    quiz_questions: [
      {
        question: 'Modifier trong Solidity dùng để làm gì?',
        options: ['Tạo biến', 'Thêm điều kiện kiểm tra cho function', 'Khai báo event', 'Deploy contract'],
        correct: 1
      },
      {
        question: 'msg.sender trong Solidity là gì?',
        options: ['Địa chỉ contract', 'Địa chỉ người gọi hàm hiện tại', 'Địa chỉ miner', 'Giá gas'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-03',
    title: 'Reentrancy Attack',
    description: 'Phân tích cuộc tấn công Reentrancy nổi tiếng (The DAO Hack 2016). Hiểu cơ chế gọi lại hàm trước khi cập nhật state và cách phòng tránh.',
    difficulty: 'intermediate',
    duration_minutes: 50,
    category: 'vulnerabilities',
    icon: '🔄',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Khai thác lỗ hổng Reentrancy',
    labDescription: 'Viết contract tấn công khai thác lỗ hổng reentrancy trong VulnerableBank.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Contract ngân hàng có lỗ hổng
contract VulnerableBank {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        require(msg.value > 0, "Deposit must be > 0");
        balances[msg.sender] += msg.value;
    }

    function withdraw() public {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");
        
        // LỖ HỔNG: Gọi chuyển tiền trước khi cập nhật số dư
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Failed to send Ether");
        balances[msg.sender] = 0;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

// TODO: Viết contract Attack khai thác lỗ hổng reentrancy
contract Attack {
    VulnerableBank public bank;
    
    constructor(address _bankAddress) {
        bank = VulnerableBank(_bankAddress);
    }
    
    // Hàm fallback - sẽ được tự động gọi khi nhận được Ether từ ngân hàng lỗi
    fallback() external payable {
        // CODE CỦA BẠN: Viết lệnh rút tiếp tiền từ ngân hàng lỗi để tạo vòng lặp tái nhập
        
    }
    
    // Hàm attack để gửi deposit 1 ether và thực hiện đợt rút tiền đầu tiên
    function attack() external payable {
        // CODE CỦA BẠN: Gửi deposit 1 ether vào ngân hàng, sau đó gọi withdraw()
        
    }
}
`,

    quiz_questions: [
      {
        question: 'Reentrancy attack xảy ra khi nào?',
        options: ['Khi contract hết gas', 'Khi hàm bên ngoài được gọi lại trước khi state được cập nhật', 'Khi mật khẩu bị lộ', 'Khi contract bị overflow'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-04',
    title: 'Integer Overflow & Underflow',
    description: 'Tìm hiểu lỗ hổng tràn số (overflow/underflow) trong Solidity phiên bản cũ. Cách SafeMath library và Solidity 0.8+ giải quyết vấn đề này.',
    difficulty: 'intermediate',
    duration_minutes: 35,
    category: 'vulnerabilities',
    icon: '🔢',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Khai thác Integer Overflow',
    labDescription: 'Demo overflow trên Solidity 0.7 và sửa lỗi bằng SafeMath.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

// Thư viện SafeMath ngăn ngừa overflow/underflow
library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }
}

contract TokenSale {
    using SafeMath for uint256;
    mapping(address => uint256) public balances;
    uint256 public constant PRICE = 1 ether;
    
    // TODO: Sửa hàm buy() để sử dụng thư viện SafeMath ngăn chặn lỗi tràn số (overflow)
    function buy(uint256 amount) public payable {
        // Gợi ý: Thay thế phép tính trực tiếp bằng hàm mul() và add() của SafeMath
        require(msg.value == amount * PRICE, "Wrong ETH amount");
        balances[msg.sender] += amount;
    }
}
`,

    quiz_questions: [
      {
        question: 'Solidity version nào tự động kiểm tra overflow/underflow?',
        options: ['0.5.0', '0.6.0', '0.7.0', '0.8.0+'],
        correct: 3
      }
    ]
  },
  {
    id: 'lesson-05',
    title: 'Access Control Vulnerabilities',
    description: 'Phân tích các lỗ hổng kiểm soát quyền truy cập: thiếu modifier, tx.origin vs msg.sender, và role-based access control patterns.',
    difficulty: 'intermediate',
    duration_minutes: 40,
    category: 'vulnerabilities',
    icon: '🔐',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Phòng thủ Access Control',
    labDescription: 'Viết hệ thống phân quyền Role-Based Access Control cho smart contract.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureVault {
    address public owner;
    mapping(address => bool) public admins;
    mapping(address => uint256) public balances;
    
    // TODO: Sửa lỗi bảo mật - sử dụng msg.sender thay vì tx.origin để phân quyền truy cập an toàn
    modifier onlyOwner() {
        require(tx.origin == owner, "Not owner");
        _;
    }

    
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Not admin");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }
    
    function addAdmin(address _admin) public onlyOwner {
        admins[_admin] = true;
    }
    
    function removeAdmin(address _admin) public onlyOwner {
        require(_admin != owner, "Cannot remove owner");
        admins[_admin] = false;
    }
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    // Chỉ admin mới được rút tiền của người khác
    function adminWithdraw(address _user, uint256 _amount) public onlyAdmin {
        require(balances[_user] >= _amount, "Insufficient balance");
        balances[_user] -= _amount;
        payable(msg.sender).transfer(_amount);
    }
}
`,
    quiz_questions: [
      {
        question: 'Tại sao không nên dùng tx.origin để xác thực?',
        options: ['Quá chậm', 'Có thể bị phishing qua contract trung gian', 'Tốn gas', 'Không hỗ trợ ERC-20'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-06',
    title: 'Flash Loan Attacks',
    description: 'Tìm hiểu Flash Loan - khoản vay không cần thế chấp trong DeFi, và cách chúng bị lợi dụng để thao túng giá, khai thác oracle và arbitrage.',
    difficulty: 'advanced',
    duration_minutes: 55,
    category: 'defi-security',
    icon: '⚡',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Mô phỏng Flash Loan Attack',
    labDescription: 'Tạo một Flash Loan từ Aave và thực hiện arbitrage giữa 2 DEX.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Giao diện đơn giản hóa
interface IFlashLoanProvider {
    function flashLoan(uint256 amount) external;
}

interface IDEX {
    function swap(address tokenIn, address tokenOut, uint256 amountIn) external returns (uint256);
    function getPrice(address token) external view returns (uint256);
}

contract FlashLoanArbitrage {
    IFlashLoanProvider public lender;
    IDEX public dexA;
    IDEX public dexB;
    address public token;
    
    constructor(address _lender, address _dexA, address _dexB, address _token) {
        lender = IFlashLoanProvider(_lender);
        dexA = IDEX(_dexA);
        dexB = IDEX(_dexB);
        token = _token;
    }
    
    // TODO: Implement callback khi nhận flash loan
    function executeFlashLoan(uint256 amount) external {
        // Bước 1: Vay flash loan
        lender.flashLoan(amount);
    }
    
    // Callback - được gọi bởi flash loan provider
    function onFlashLoan(uint256 amount) external {
        // Bước 2: Mua token trên DEX A (giá thấp)
        // Bước 3: Bán token trên DEX B (giá cao)
        // Bước 4: Trả lại flash loan + phí
        // Bước 5: Giữ lợi nhuận
    }
}
`,
    quiz_questions: [
      {
        question: 'Flash Loan có đặc điểm gì?',
        options: ['Cần thế chấp lớn', 'Phải vay và trả trong cùng 1 transaction', 'Lãi suất cao', 'Thời hạn 1 ngày'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-07',
    title: 'Oracle Manipulation',
    description: 'Phân tích cách các price oracle (Chainlink, TWAP, Uniswap) hoạt động và các phương pháp tấn công thao túng giá oracle trong DeFi.',
    difficulty: 'advanced',
    duration_minutes: 45,
    category: 'defi-security',
    icon: '🔮',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Tấn công Oracle và Phòng thủ',
    labDescription: 'Xây dựng oracle an toàn với TWAP và so sánh với spot price oracle.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Oracle không an toàn - dùng spot price
contract UnsafeOracle {
    // TODO: Hiểu tại sao spot price dễ bị manipulate
    function getPrice(address pair) external view returns (uint256) {
        // Spot price = reserve0 / reserve1 -> dễ bị thao túng
        // Attacker có thể dùng flash loan để thay đổi reserves
        return 0; // Simplified
    }
}

// Oracle an toàn hơn - dùng TWAP
contract TWAPOracle {
    struct Observation {
        uint256 timestamp;
        uint256 cumulativePrice;
    }
    
    Observation[] public observations;
    
    // TODO: Implement TWAP calculation
    function getTWAP(uint256 period) external view returns (uint256) {
        require(observations.length >= 2, "Not enough observations");
        // TWAP tính trung bình giá theo thời gian -> khó manipulate hơn
        Observation memory latest = observations[observations.length - 1];
        Observation memory oldest = observations[0];
        
        uint256 timeElapsed = latest.timestamp - oldest.timestamp;
        require(timeElapsed >= period, "Period too short");
        
        return (latest.cumulativePrice - oldest.cumulativePrice) / timeElapsed;
    }
}
`,
    quiz_questions: [
      {
        question: 'TWAP oracle an toàn hơn spot price vì?',
        options: ['Nhanh hơn', 'Tính trung bình giá theo thời gian, khó thao túng trong 1 block', 'Miễn phí', 'Không cần Chainlink'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-08',
    title: 'Front-Running & MEV',
    description: 'Tìm hiểu về Front-running, Sandwich attacks, và Maximal Extractable Value (MEV). Cách miners/validators khai thác thứ tự giao dịch.',
    difficulty: 'advanced',
    duration_minutes: 40,
    category: 'defi-security',
    icon: '🏃',
    labEnabled: true,
    labType: 'code',
    labTitle: 'Phát hiện MEV & Front-running',
    labDescription: 'Phân tích mempool để phát hiện các giao dịch sandwich attack tiềm năng.',
    labStarterCode: `# Lab: Phân tích MEV patterns
# Mô phỏng mempool monitoring

class Transaction:
    def __init__(self, sender, tx_type, token, amount, gas_price):
        self.sender = sender
        self.tx_type = tx_type  # 'swap', 'approve', 'transfer'
        self.token = token
        self.amount = amount
        self.gas_price = gas_price

class MEVDetector:
    def __init__(self):
        self.pending_txs = []
    
    def add_pending_tx(self, tx):
        self.pending_txs.append(tx)
    
    def detect_sandwich(self):
        """Phát hiện sandwich attack pattern"""
        # Pattern: Buy (high gas) -> Victim Swap -> Sell (high gas)
        # TODO: Implement detection logic
        suspicious = []
        for i in range(len(self.pending_txs) - 2):
            tx1 = self.pending_txs[i]
            tx2 = self.pending_txs[i + 1]
            tx3 = self.pending_txs[i + 2]
            
            if (tx1.tx_type == 'swap' and 
                tx2.tx_type == 'swap' and 
                tx3.tx_type == 'swap' and
                tx1.sender == tx3.sender and 
                tx1.sender != tx2.sender and
                tx1.gas_price > tx2.gas_price):
                suspicious.append({
                    'attacker': tx1.sender,
                    'victim': tx2.sender,
                    'token': tx2.token,
                    'victim_amount': tx2.amount
                })
        return suspicious

# Test
detector = MEVDetector()
detector.add_pending_tx(Transaction("0xAttacker", "swap", "WETH", 100, 200))
detector.add_pending_tx(Transaction("0xVictim", "swap", "WETH", 50, 50))
detector.add_pending_tx(Transaction("0xAttacker", "swap", "WETH", 100, 200))

results = detector.detect_sandwich()
for r in results:
    print(f"⚠ Sandwich detected! Attacker: {r['attacker']}, Victim: {r['victim']}")
`,
    quiz_questions: [
      {
        question: 'Sandwich attack hoạt động như thế nào?',
        options: ['Đánh cắp private key', 'Đặt lệnh mua trước và bán sau giao dịch của nạn nhân', 'DoS attack node', 'Fork blockchain'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-09',
    title: 'Phishing & Social Engineering trong Web3',
    description: 'Các kỹ thuật lừa đảo phổ biến: giả mạo DApp, approval scam, signature phishing (EIP-712), airdrop scam và cách nhận biết.',
    difficulty: 'beginner',
    duration_minutes: 30,
    category: 'web3-security',
    icon: '🎣',
    labEnabled: true,
    labType: 'code',
    labTitle: 'Phân tích Phishing Contract',
    labDescription: 'Kiểm tra và phát hiện các dấu hiệu đáng ngờ trong smart contract.',
    labStarterCode: `# Lab: Phát hiện Phishing Contract
# Kiểm tra các dấu hiệu nghi ngờ

# Mô phỏng ABI của contract đáng ngờ
suspicious_contract = {
    "name": "FreeAirdropToken",
    "functions": [
        {"name": "claim", "inputs": [], "stateMutability": "nonpayable"},
        {"name": "approve", "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ], "stateMutability": "nonpayable"},
        {"name": "setApprovalForAll", "inputs": [
            {"name": "operator", "type": "address"},
            {"name": "approved", "type": "bool"}
        ], "stateMutability": "nonpayable"},
        {"name": "transferFrom", "inputs": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ], "stateMutability": "nonpayable"},
    ],
    "hidden_calls": ["approve(attacker, MAX_UINT256)"]
}

def analyze_contract(contract):
    """Phân tích contract tìm dấu hiệu phishing"""
    warnings = []
    
    # TODO: Thêm các kiểm tra
    for func in contract["functions"]:
        if func["name"] in ["approve", "setApprovalForAll"]:
            warnings.append(f"⚠ Hàm {func['name']} có thể cấp quyền unlimited cho attacker")
    
    if "hidden_calls" in contract:
        for call in contract["hidden_calls"]:
            warnings.append(f"🚨 Phát hiện hidden call: {call}")
    
    if "Free" in contract["name"] or "Airdrop" in contract["name"]:
        warnings.append(f"⚠ Tên contract có dấu hiệu lừa đảo: {contract['name']}")
    
    return warnings

results = analyze_contract(suspicious_contract)
print("=== KẾT QUẢ PHÂN TÍCH ===")
for w in results:
    print(w)
`,
    quiz_questions: [
      {
        question: 'Approval scam là gì?',
        options: ['Tấn công DDoS', 'Lừa user approve unlimited token cho attacker', 'Giả mạo node', 'Mining attack'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-10',
    title: 'Smart Contract Auditing Process',
    description: 'Quy trình audit smart contract chuyên nghiệp: manual review, automated tools (Slither, Mythril, Echidna), writing audit reports.',
    difficulty: 'intermediate',
    duration_minutes: 50,
    category: 'auditing',
    icon: '🔍',
    labEnabled: true,
    labType: 'code',
    labTitle: 'Audit Smart Contract với AI',
    labDescription: 'Sử dụng AI để phân tích và phát hiện lỗ hổng trong smart contract.',
    labStarterCode: `# Lab: AI-Powered Smart Contract Audit
# Phân tích contract tìm vulnerabilities

vulnerable_code = """
pragma solidity ^0.8.0;

contract Lottery {
    address public owner;
    address[] public players;
    
    function enter() public payable {
        require(msg.value >= 0.1 ether);
        players.push(msg.sender);
    }
    
    function pickWinner() public {
        // Lỗ hổng 1: Không có access control
        // Lỗ hổng 2: Randomness không an toàn
        uint index = uint(keccak256(abi.encodePacked(block.timestamp, players.length))) % players.length;
        address winner = players[index];
        payable(winner).transfer(address(this).balance);
        players = new address[](0);
    }
}
"""

def audit_contract(code):
    """Phân tích tìm lỗ hổng"""
    findings = []
    
    # Kiểm tra access control
    if "onlyOwner" not in code and "require(msg.sender" not in code:
        if "transfer" in code or "call{value" in code:
            findings.append({
                "severity": "HIGH",
                "type": "Access Control",
                "description": "Hàm chuyển tiền thiếu kiểm soát quyền truy cập"
            })
    
    # Kiểm tra randomness
    if "block.timestamp" in code or "block.difficulty" in code:
        findings.append({
            "severity": "HIGH",
            "type": "Weak Randomness",
            "description": "Sử dụng block.timestamp/difficulty cho random - miners có thể thao túng"
        })
    
    # Kiểm tra reentrancy
    if ".call{value" in code:
        findings.append({
            "severity": "MEDIUM",
            "type": "Potential Reentrancy",
            "description": "Sử dụng low-level call - cần kiểm tra Checks-Effects-Interactions pattern"
        })
    
    return findings

results = audit_contract(vulnerable_code)
print("=== AUDIT REPORT ===")
for f in results:
    print(f"[{f['severity']}] {f['type']}: {f['description']}")
`,
    quiz_questions: [
      {
        question: 'Tool nào dùng để phân tích static analysis smart contract?',
        options: ['React', 'Slither', 'Docker', 'Webpack'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-11',
    title: 'DeFi Protocol Security',
    description: 'Bảo mật các DeFi protocols: AMM (Uniswap), Lending (Aave, Compound), Staking. Phân tích các vụ hack DeFi lớn và bài học rút ra.',
    difficulty: 'advanced',
    duration_minutes: 60,
    category: 'defi-security',
    icon: '🏦',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Xây dựng Lending Protocol an toàn',
    labDescription: 'Thiết kế simple lending protocol với các biện pháp bảo mật.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureLending {
    struct LoanPosition {
        uint256 collateral;
        uint256 borrowed;
        uint256 lastInterestUpdate;
    }
    
    mapping(address => LoanPosition) public positions;
    uint256 public constant COLLATERAL_RATIO = 150; // 150%
    uint256 public constant INTEREST_RATE = 5; // 5% per year
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 120%
    
    // Oracle giá (đơn giản hóa)
    uint256 public collateralPrice = 2000e18; // ETH = $2000
    
    // Gửi collateral
    function depositCollateral() external payable {
        positions[msg.sender].collateral += msg.value;
    }
    
    // TODO: Implement vay an toàn
    function borrow(uint256 amount) external {
        LoanPosition storage pos = positions[msg.sender];
        uint256 maxBorrow = (pos.collateral * collateralPrice * 100) / (COLLATERAL_RATIO * 1e18);
        require(pos.borrowed + amount <= maxBorrow, "Exceeds collateral ratio");
        pos.borrowed += amount;
        pos.lastInterestUpdate = block.timestamp;
    }
    
    // TODO: Implement liquidation
    function liquidate(address borrower) external {
        LoanPosition storage pos = positions[borrower];
        uint256 collateralValue = (pos.collateral * collateralPrice) / 1e18;
        uint256 healthFactor = (collateralValue * 100) / pos.borrowed;
        require(healthFactor < LIQUIDATION_THRESHOLD, "Position is healthy");
        // Liquidation logic here
    }
}
`,
    quiz_questions: [
      {
        question: 'Tỉ lệ collateral 150% có nghĩa gì?',
        options: ['Lãi suất 150%', 'Phải gửi tài sản thế chấp trị giá 150% khoản vay', 'Thời hạn 150 ngày', 'Phí 150 wei'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-12',
    title: 'NFT & Token Security',
    description: 'Bảo mật NFT và Token: ERC-20/ERC-721 vulnerabilities, metadata spoofing, rug pull detection, và cách bảo vệ tài sản số.',
    difficulty: 'intermediate',
    duration_minutes: 40,
    category: 'web3-security',
    icon: '🖼️',
    labEnabled: true,
    labType: 'code',
    labTitle: 'Phát hiện Rug Pull Token',
    labDescription: 'Xây dựng tool phân tích ERC-20 token tìm dấu hiệu rug pull.',
    labStarterCode: `# Lab: Rug Pull Detection Tool
# Phát hiện token có dấu hiệu scam

class TokenAnalyzer:
    def __init__(self):
        self.red_flags = []
    
    def analyze(self, token_info):
        """Phân tích token tìm dấu hiệu rug pull"""
        self.red_flags = []
        
        # Kiểm tra ownership
        if token_info.get("owner_can_mint", False):
            self.red_flags.append({
                "severity": "HIGH",
                "flag": "Owner có quyền mint unlimited token"
            })
        
        # Kiểm tra tax
        if token_info.get("buy_tax", 0) > 10 or token_info.get("sell_tax", 0) > 10:
            self.red_flags.append({
                "severity": "HIGH",
                "flag": f"Tax quá cao: Buy {token_info['buy_tax']}% / Sell {token_info['sell_tax']}%"
            })
        
        # Kiểm tra liquidity lock
        if not token_info.get("liquidity_locked", False):
            self.red_flags.append({
                "severity": "CRITICAL",
                "flag": "Liquidity KHÔNG bị lock - Owner có thể rút bất cứ lúc nào"
            })
        
        # Kiểm tra honeypot
        if token_info.get("can_sell", True) == False:
            self.red_flags.append({
                "severity": "CRITICAL",
                "flag": "HONEYPOT: Không thể bán token!"
            })
        
        # Kiểm tra holder concentration
        top_holder_pct = token_info.get("top_holder_percentage", 0)
        if top_holder_pct > 50:
            self.red_flags.append({
                "severity": "HIGH",
                "flag": f"Top holder nắm {top_holder_pct}% supply - rủi ro dump"
            })
        
        return self.red_flags
    
    def risk_score(self):
        score = 0
        for flag in self.red_flags:
            if flag["severity"] == "CRITICAL": score += 40
            elif flag["severity"] == "HIGH": score += 25
            elif flag["severity"] == "MEDIUM": score += 10
        return min(score, 100)

# Test
analyzer = TokenAnalyzer()
scam_token = {
    "name": "SafeMoonElonDoge",
    "owner_can_mint": True,
    "buy_tax": 5,
    "sell_tax": 30,
    "liquidity_locked": False,
    "can_sell": True,
    "top_holder_percentage": 60
}

flags = analyzer.analyze(scam_token)
print(f"=== PHÂN TÍCH TOKEN: {scam_token['name']} ===")
for f in flags:
    print(f"  [{f['severity']}] {f['flag']}")
print(f"\\nRisk Score: {analyzer.risk_score()}/100")
print("KHUYẾN NGHỊ:", "🚨 RẤT NGUY HIỂM" if analyzer.risk_score() > 60 else "⚠ CẨN THẬN")
`,
    quiz_questions: [
      {
        question: 'Dấu hiệu quan trọng nhất của rug pull token?',
        options: ['Logo đẹp', 'Liquidity không bị lock', 'Có website', 'Trên CoinGecko'],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-13',
    title: 'Read-Only Reentrancy & Cross-Function Attacks',
    description: 'Phân tích cuộc tấn công Read-Only Reentrancy (Curve/Sentiment hack). Cách kẻ tấn công lợi dụng hàm view chưa cập nhật state để thao túng Oracle.',
    difficulty: 'advanced',
    duration_minutes: 55,
    category: 'vulnerabilities',
    icon: '🛡️',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Phòng thủ Read-Only Reentrancy',
    labDescription: 'Áp dụng Reentrancy Guard cho hàm view và tuân thủ Checks-Effects-Interactions.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableVault {
    uint256 public totalAssets;
    uint256 public totalShares;
    bool private locked;

    modifier nonReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    // TODO: Sửa hàm withdraw để cập nhật totalAssets và totalShares TRƯỚC khi gửi tiền
    function withdraw(uint256 shareAmount) external nonReentrant {
        uint256 amountToReturn = (shareAmount * totalAssets) / totalShares;
        
        (bool ok, ) = msg.sender.call{value: amountToReturn}("");
        require(ok, "Transfer failed");

        totalShares -= shareAmount;
        totalAssets -= amountToReturn;
    }

    // TODO: Ngăn ngừa Read-Only Reentrancy khi đọc giá
    function getSharePrice() public view returns (uint256) {
        if (totalShares == 0) return 1e18;
        return (totalAssets * 1e18) / totalShares;
    }
}
`,
    quiz_questions: [
      {
        question: 'Read-Only Reentrancy khác Reentrancy truyền thống ở điểm nào?',
        options: [
          'Tấn công vào hàm view không làm thay đổi trạng thái nhưng bị đọc sai dữ liệu chưa cập nhật',
          'Không sử dụng hàm fallback',
          'Chỉ xảy ra trên mạng Bitcoin',
          'Không tốn phí gas'
        ],
        correct: 0
      }
    ]
  },
  {
    id: 'lesson-14',
    title: 'Delegatecall Hazards & Storage Collision',
    description: 'Tìm hiểu cơ chế delegatecall trong EVM, rủi ro xung đột bộ nhớ Storage Slots và chuẩn EIP-1967 cho Upgradeable Proxy.',
    difficulty: 'advanced',
    duration_minutes: 60,
    category: 'vulnerabilities',
    icon: '⚙️',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Phát hiện Storage Collision trong Proxy',
    labDescription: 'Sửa lỗi xung đột Storage Slot giữa Proxy và Implementation Contract.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// TODO: Cấu hình Storage Layout đồng nhất để ngăn chặn Storage Collision
contract ProxyContract {
    address public implementation; // Slot 0
    address public owner;          // Slot 1
    
    constructor(address _impl) {
        implementation = _impl;
        owner = msg.sender;
    }
}

contract LogicContract {
    // Sửa thứ tự biến để khớp với Proxy (Slot 0 và Slot 1)
    address public implementation; // Slot 0
    address public owner;          // Slot 1
    uint256 public count;          // Slot 2
    
    function initialize(address _owner) public {
        owner = _owner;
    }
}
`,
    quiz_questions: [
      {
        question: 'Khi sử dụng delegatecall, mã nguồn thực thi ở đâu và dữ liệu lưu ở đâu?',
        options: [
          'Thực thi ở hợp đồng đích, dữ liệu lưu ở hợp đồng đích',
          'Thực thi mã nguồn hợp đồng đích, nhưng dữ liệu ghi trực tiếp vào hợp đồng gọi (Proxy)',
          'Thực thi ở client side',
          'Không ghi dữ liệu vào blockchain'
        ],
        correct: 1
      }
    ]
  },
  {
    id: 'lesson-15',
    title: 'EIP-712 Signature Security & Replay Attacks',
    description: 'Bảo mật chữ ký số ECDSA, chuẩn EIP-712 Typed Structured Data, chống Replay attacks bằng Domain Separator và Nonce.',
    difficulty: 'intermediate',
    duration_minutes: 50,
    category: 'vulnerabilities',
    icon: '✍️',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Xây dựng Chữ Ký EIP-712 Chống Replay',
    labDescription: 'Tạo hàm verifySignature tích hợp chainId, verifyingContract và nonces.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureSignatureVerifier {
    mapping(address => uint256) public nonces;
    bytes32 public DOMAIN_SEPARATOR;

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("SecureApp")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // TODO: Viết hàm kiểm tra chữ ký không bị replay
    function verify(address signer, uint256 amount, uint256 nonce, bytes memory signature) public view returns (bool) {
        require(nonce == nonces[signer], "Invalid nonce");
        return true;
    }
}
`,
    quiz_questions: [
      {
        question: 'Domain Separator trong EIP-712 giúp ngăn ngừa điều gì?',
        options: [
          'Ngăn ngừa Replay Attack giữa các chuỗi (chainId) hoặc các hợp đồng khác nhau (verifyingContract)',
          'Tăng giá ETH',
          'Tự động trả phí gas',
          'Giấu địa chỉ người ký'
        ],
        correct: 0
      }
    ]
  },
  {
    id: 'lesson-16',
    title: 'Cross-Chain Bridge Security & Message Relays',
    description: 'Bảo mật cầu nối cross-chain: Merkle Proof verification, validator multisig security, replay protection và rate limiting.',
    difficulty: 'advanced',
    duration_minutes: 65,
    category: 'auditing',
    icon: '🌉',
    labEnabled: true,
    labType: 'solidity',
    labTitle: 'Audit Hợp đồng Cầu nối Cross-Chain',
    labDescription: 'Thêm kiểm tra chống replay message và circuit breaker cho bridge contract.',
    labStarterCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CrossChainBridge {
    mapping(bytes32 => bool) public processedMessages;
    address public admin;
    bool public paused;

    modifier whenNotPaused() {
        require(!paused, "Bridge paused");
        _;
    }

    // TODO: Đánh dấu processedMessages[msgHash] = true để chống Replay
    function processMessage(bytes32 msgHash, address recipient, uint256 amount) external whenNotPaused {
        require(!processedMessages[msgHash], "Message already processed");
        processedMessages[msgHash] = true;
        
        payable(recipient).transfer(amount);
    }
}
`,
    quiz_questions: [
      {
        question: 'Nguyên nhân chính dẫn tới hầu hết các vụ hack Bridge lớn (như Nomad, Wormhole) là gì?',
        options: [
          'Lỗi logic kiểm tra Merkle Proof / message validation và lộ khóa multisig validator',
          'Do thợ đào Ethereum ngừng hoạt động',
          'Do người dùng quên mật khẩu ví',
          'Do Solidity không hỗ trợ mảng'
        ],
        correct: 0
      }
    ]
  }
]

// Lab exercises that can be accessed independently
export const standaloneLabsData = [
  {
    id: 'lab-reentrancy',
    title: 'Lab: Reentrancy Attack Playground',
    description: 'Khai thác lỗ hổng Reentrancy trong VulnerableBank contract. Viết contract Attack và thực hiện drain funds.',
    difficulty: 'intermediate',
    category: 'attack',
    relatedLessonId: 'lesson-03',
    icon: '🔄',
    estimatedMinutes: 30,
  },
  {
    id: 'lab-flash-loan',
    title: 'Lab: Flash Loan Arbitrage',
    description: 'Thực hiện Flash Loan arbitrage giữa 2 DEX. Tìm cơ hội chênh lệch giá và khai thác.',
    difficulty: 'advanced',
    category: 'defi',
    relatedLessonId: 'lesson-06',
    icon: '⚡',
    estimatedMinutes: 45,
  },
  {
    id: 'lab-audit',
    title: 'Lab: Smart Contract Audit Challenge',
    description: 'Audit một contract hoàn chỉnh, tìm tất cả lỗ hổng và viết báo cáo.',
    difficulty: 'advanced',
    category: 'audit',
    relatedLessonId: 'lesson-10',
    icon: '🔍',
    estimatedMinutes: 60,
  },
  {
    id: 'lab-token-analysis',
    title: 'Lab: Token Scam Detector',
    description: 'Xây dựng tool phát hiện scam token, kiểm tra honeypot, rug pull.',
    difficulty: 'intermediate',
    category: 'analysis',
    relatedLessonId: 'lesson-12',
    icon: '🕵️',
    estimatedMinutes: 35,
  },
  {
    id: 'lab-access-control',
    title: 'Lab: Xây dựng RBAC Contract',
    description: 'Thiết kế hệ thống phân quyền hoàn chỉnh cho DApp.',
    difficulty: 'intermediate',
    category: 'defense',
    relatedLessonId: 'lesson-05',
    icon: '🔐',
    estimatedMinutes: 40,
  },
  {
    id: 'lab-phishing',
    title: 'Lab: Web3 Phishing Detector',
    description: 'Phân tích và phát hiện các kỹ thuật phishing trong Web3.',
    difficulty: 'beginner',
    category: 'analysis',
    relatedLessonId: 'lesson-09',
    icon: '🎣',
    estimatedMinutes: 25,
  },
  {
    id: 'lab-read-only-reentrancy',
    title: 'Lab: Read-Only Reentrancy Prevention',
    description: 'Bảo vệ Oracle và hàm view khỏi lỗ hổng Read-Only Reentrancy.',
    difficulty: 'advanced',
    category: 'defense',
    relatedLessonId: 'lesson-13',
    icon: '🛡️',
    estimatedMinutes: 30,
  },
  {
    id: 'lab-storage-collision',
    title: 'Lab: Storage Collision Detector',
    description: 'Khắc phục xung đột ô nhớ Storage Slots trong Upgradeable Proxy.',
    difficulty: 'advanced',
    category: 'audit',
    relatedLessonId: 'lesson-14',
    icon: '⚙️',
    estimatedMinutes: 35,
  },
  {
    id: 'lab-eip712-signature',
    title: 'Lab: EIP-712 Replay Protection',
    description: 'Xây dựng cơ chế xác thực chữ ký EIP-712 chống Replay Attack.',
    difficulty: 'intermediate',
    category: 'defense',
    relatedLessonId: 'lesson-15',
    icon: '✍️',
    estimatedMinutes: 30,
  },
  {
    id: 'lab-bridge-audit',
    title: 'Lab: Cross-Chain Bridge Audit',
    description: 'Audit logic xử lý tin nhắn và chống Replay cho hợp đồng Cầu nối.',
    difficulty: 'advanced',
    category: 'audit',
    relatedLessonId: 'lesson-16',
    icon: '🌉',
    estimatedMinutes: 40,
  }
]
