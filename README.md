# MantleArb — AI-Assisted Arbitrage Agent

## ⚠️ 免责声明 (Disclaimer)

> **本项目仅供学习和测试 purposes，不构成投资建议。**
>
> **套利交易存在风险，可能导致资金损失。**
>
> **使用本项目需自行承担风险。**
>
> 本项目的开发者不对因使用本项目而产生的任何损失承担责任。

> **Mantle Turing Test Hackathon 2026** | Track: AI Strategy | Prize Pool: $120,000+

## 🏆 Mantle 链首个公开套利 Bot

MantleArb 是 **Mantle Network 上首个开源的 AI 套利代理**，充分利用 Mantle 链的 **低 Gas 费 (0.02 Gwei)** 和 **高 TPS (200+)** 优势，实现高频低成本的跨 DEX 套利。

### 🔥 核心优势

| 优势 | 说明 |
|------|------|
| **低 Gas 成本** | Mantle L2 Gas 仅 0.02 Gwei，单笔套利交易成本 < $0.01 |
| **高 TPS 支持** | 200+ TPS 支持 500ms 高频轮询，抢占套利窗口 |
| **首个公开 Bot** | Mantle 生态首个开源套利 Bot，覆盖 6 大 DEX |
| **零前置资金** | Flash Loan 套利，无需本金即可参与 |

### 📊 Mantle 生态 DEX 覆盖

| DEX | 手续费 | 特色 |
|-----|--------|------|
| **Merchant Moe** | 0.3% | Mantle 原生 DEX，流动性最深 |
| **Agni Finance** | 0.25% | 低手续费，新兴 DEX |
| **FusionX** | 0.3% | 多功能 DeFi 平台 |
| **CyberSwap** | 0.3% | 跨链桥接支持 |
| **Helix** | 0.3% | 订单簿模式 |
| **iZiSwap** | 0.3% | 集中流动性 |

MantleArb is an AI-assisted arbitrage agent deployed on **Mantle Network** that automatically detects price differences across multiple DEXes and executes profitable trades using Flash Loans — no upfront capital required. It leverages persistent agent memory to learn from past trades and continuously improve DEX selection and risk management.

---

## 🚀 Deployment Proof

### Testnet Deployment

| Field | Value |
|-------|-------|
| **Network** | Mantle Testnet (Sepolia), chainId 5001 |
| **Contract Address** | _See `deployments/mantleTestnet-latest.json` after deployment_ |
| **Block Explorer** | [MantleScan Testnet](https://sepolia.mantlescan.xyz) |

### Mainnet Deployment

| Field | Value |
|-------|-------|
| **Network** | Mantle Mainnet, chainId 5000 |
| **Contract Address** | _See `deployments/mantle-latest.json` after deployment_ |
| **Block Explorer** | [MantleScan](https://mantlescan.xyz) |

> **How to verify deployment:** After running the deploy script, check the `deployments/` directory for the JSON file containing contract address, tx hash, block number, and gas used. Verify the contract on [MantleScan](https://mantlescan.xyz) by searching for the contract address.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MantleArb System                              │
│                                                                       │
│  ┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐  │
│  │  Price Monitor   │────▶│  AI Strategy    │────▶│  Arbitrage    │  │
│  │                  │     │  Engine         │     │  Executor     │  │
│  │ • Merchant Moe   │     │                 │     │               │  │
│  │ • FusionX        │     │ • Spread calc   │     │ • Buy low     │  │
│  │ • Agni Finance   │     │ • Risk assess   │     │ • Sell high   │  │
│  │ • CyberSwap      │     │ • Gas estimate  │     │ • Collect $   │  │
│  │ • Helix          │     │ • Profit check  │     │               │  │
│  │ • iZiSwap        │     │                 │     └───────┬───────┘  │
│  └─────────────────┘     └─────────────────┘             │          │
│                                                           ▼          │
│  ┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐  │
│  │ Flash Loan      │────▶│  Risk Manager   │◀────│  Smart        │  │
│  │ Providers        │     │                 │     │  Contract     │  │
│  │                  │     │ • Trade limits  │     │               │  │
│  │ • Balancer (0%)  │     │ • Slippage      │     │ • Reentrancy  │  │
│  │ • Aave V3 (0.09%)│     │ • Oracle check  │     │   Guard       │  │
│  │                  │     │ • Emergency stop│     │ • Pausable     │  │
│  └─────────────────┘     └─────────────────┘     │ • Ownable     │  │
│                                                    └───────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Mantle Network (L2)                        │    │
│  │  Low Gas  •  Fast Blocks  •  Growing DeFi Ecosystem          │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Flow Diagram

```
   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
   │  Detect  │────▶│ Evaluate │────▶│ Execute  │────▶│  Profit  │
   │  Spread  │     │  Risk    │     │  Swap    │     │  Collect │
   └──────────┘     └──────────┘     └──────────┘     └──────────┘
        │                │                │                 │
        ▼                ▼                ▼                 ▼
   Get prices      Check limits    Buy on DEX-A       Update stats
   from 6 DEXes    Oracle check    Sell on DEX-B      Revoke approvals
                   Gas estimate    (Flash Loan)       Emit event
```

---

## Features

### Core Arbitrage
| Feature | Description |
|---------|-------------|
| **Multi-DEX Support** | 6 DEXes: Merchant Moe, FusionX, Agni, CyberSwap, Helix, iZiSwap |
| **Real-time Price Monitoring** | Fetch prices from all DEXes simultaneously |
| **Best Pair Discovery** | `findBestArbitrage()` — auto-find the most profitable pair |
| **Profit Calculator** | `calculateProfit()` — factor in gas costs for net profit |

### Flash Loans
| Feature | Description |
|---------|-------------|
| **Balancer Flash Loans** | 0% fee flash loans via Balancer Vault |
| **Aave V3 Flash Loans** | 0.09% premium via Aave V3 Pool |
| **Single-Asset Loan** | `executeFlashLoan()` — borrow one asset |
| **Multi-Asset Loan** | `executeFlashLoanMulti()` — borrow multiple assets |
| **No Upfront Capital** | Execute arbitrage with borrowed funds |

### Risk Management
| Feature | Description |
|---------|-------------|
| **Trade Size Limit** | Max $10,000 per trade (configurable) |
| **Slippage Protection** | Max 1% slippage (configurable, up to 5%) |
| **Min Profit Threshold** | Min 0.5% profit per trade (configurable) |
| **Daily Trade Limit** | Max 100 trades per day (configurable) |
| **Oracle Price Check** | Detects price manipulation via oracle deviation |
| **Flash Loan Limit** | Max $100,000 per flash loan (configurable) |

### Security
| Feature | Description |
|---------|-------------|
| **ReentrancyGuard** | Prevents reentrancy attacks |
| **Pausable** | Emergency pause via OpenZeppelin |
| **Emergency Stop** | Owner-triggered full stop |
| **Approval Revocation** | Revoke token approvals after each trade |
| **OnlyOperator** | Only owner or AI operator can execute trades |
| **Emergency Withdraw** | Withdraw all funds + revoke approvals |

---

## Project Structure

```
mantle-arb/
├── contracts/
│   ├── MantleArb.sol              # Main arbitrage contract (V3)
│   └── mocks/
│       ├── MockERC20.sol          # Mock ERC20 token for testing
│       ├── MockRouter.sol         # Mock DEX router for testing
│       ├── MockPriceOracle.sol    # Mock price oracle for testing
│       ├── MockBalancerVault.sol  # Mock Balancer flash loan vault
│       └── MockAavePool.sol       # Mock Aave V3 flash loan pool
├── test/
│   ├── MantleArb.test.js          # Comprehensive test suite (67 tests)
│   └── unit/
│       └── hummingbot-modules.test.js
├── scripts/
│   └── deploy.js                  # Deployment script (testnet + mainnet)
├── deployments/                   # Auto-generated deployment records
│   ├── mantleTestnet-latest.json  # Latest testnet deployment info
│   └── mantle-latest.json         # Latest mainnet deployment info
├── src/
│   ├── strategy.py                # AI strategy engine (Python)
│   ├── monitoring/
│   │   └── mantle-monitor.js      # Mantle DEX 价格监控 (Merchant Moe / Agni)
│   ├── strategy/
│   │   └── mantle-arb.js          # Mantle 链专属套利策略 + 低 gas 优化
│   ├── api/
│   │   └── server.js              # REST API server
│   └── ...                        # See src/ for full module list
├── hardhat.config.js              # Hardhat configuration
├── AUDIT_REPORT.md                # Security audit report
├── PROPOSAL.md                    # Project proposal
└── README.md                      # This file
```

---

## Quick Start

### Prerequisites
- Node.js >= 18
- npm or yarn
- Python 3.10+ (for AI strategy)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/song11071696/mantle-arb.git
cd mantle-arb

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required for deployment
PRIVATE_KEY=your_wallet_private_key_here

# Optional: for contract verification on MantleScan
MANTLESCAN_API_KEY=your_mantlescan_api_key

# Contract address (filled automatically after deployment)
CONTRACT_ADDRESS=0x...

# AI Strategy (optional)
OPENAI_API_KEY=your_openai_api_key
```

### 2. Get Testnet Tokens (Faucet)

Before deploying to Mantle Testnet, you need testnet MNT/ETH for gas:

| Faucet | URL | Notes |
|--------|-----|-------|
| **Mantle Testnet Faucet** | [https://faucet.testnet.mantle.xyz](https://faucet.testnet.mantle.xyz) | Official Mantle testnet faucet |
| **Alchemy Mantle Faucet** | [https://www.alchemy.com/faucets/mantle-testnet](https://www.alchemy.com/faucets/mantle-testnet) | Requires Alchemy account |
| **Chainlink Faucet** | [https://faucets.chain.link](https://faucets.chain.link) | Select Mantle Sepolia network |

> **Tip:** You need at least 0.01 MNT for deployment gas fees on testnet.

### 3. Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Downloading compiler 0.8.19
Compiled 6 Solidity files successfully
```

### 4. Run Tests

```bash
npx hardhat test
```

Expected output:
```
  MantleArb
    Deployment (7 tests)
      ✔ Should set the right owner
      ✔ Should set merchantMoe router
      ✔ Should set fusionX router
      ✔ Should set agni router
      ✔ Should set price oracle
      ✔ Should set deployer as AI operator
      ✔ Should have correct risk parameters
    Admin Functions (16 tests)
      ✔ Should allow owner to set AI operator
      ✔ Should allow owner to set max trade size
      ✔ Should allow owner to set min profit bps
      ...
    Arbitrage Execution (7 tests)
      ✔ Should execute arbitrage with correct profit
      ✔ Should emit ArbitrageExecuted event
      ...
    Flash Loan Arbitrage (5 tests)
      ✔ Should execute Balancer flash loan
      ✔ Should execute Aave flash loan
      ...
    Emergency Functions (6 tests)
      ✔ Should allow owner to pause
      ✔ Should allow emergency stop
      ...
    Withdrawal Functions (6 tests)
      ✔ Should withdraw ERC20 tokens
      ✔ Should withdraw ETH
      ...
    Router Management (3 tests)
    Known Tokens (7 tests)
    Daily Trade Limits (2 tests)
    Statistics (2 tests)
    Price Oracle (2 tests)
    ReentrancyGuard (1 test)
    Receive ETH (1 test)

  67 passing
```

### 5. Deploy to Testnet

```bash
# Ensure .env has your PRIVATE_KEY and MANTLESCAN_API_KEY
npx hardhat run scripts/deploy.js --network mantleTestnet
```

Expected output:
```
============================================================
           MantleArb - Deployment Script
============================================================

  Network   : mantleTestnet (chainId 5001)
  Deployer  : 0xYourWalletAddress
  Balance   : 1.5 MNT

-- Deployment Parameters ----------------------------------
  Network         : Mantle Testnet (Sepolia)
  MerchantMoe     : 0xE6d0ED3759709b743707DcfeCAe39BC180C981fe
  FusionX         : 0x333e3C607bB62054b84E1C3B0bD850A01B62f573
  Agni            : 0x37Ed3a17a0C44E7E91E294a97E0D084f51F9A39A
  PriceOracle     : 0x0000000000000000000000000000000000000000

Deploying MantleArb contract...
  OK  MantleArb deployed to: 0xContractAddress

Waiting for 5 block confirmations...
  Block       : 12345678
  Gas used    : 1234567
  Gas price   : 0.01 gwei
  Tx hash     : 0xTransactionHash

Verifying contract on block explorer...
  OK  Contract verified!
  Explorer URL: https://sepolia.mantlescan.xyz/address/0xContractAddress

Deployment info saved to: deployments/deployment-mantleTestnet-1717700000000.json
Latest deployment saved to: deployments/mantleTestnet-latest.json

============================================================
              Deployment Complete!
============================================================
  Contract : 0xContractAddress
  Network  : Mantle Testnet (Sepolia)
  Explorer : https://sepolia.mantlescan.xyz/address/0xContractAddress
  Next steps:
    1. Update .env: CONTRACT_ADDRESS=0xContractAddress
    2. Verify on explorer (if not auto-verified)
    3. Run: npm start   (to start the API server)
============================================================

Deployment succeeded: 0xContractAddress
```

### 6. Deploy to Mainnet

```bash
npx hardhat run scripts/deploy.js --network mantle
```

> **Warning:** Mainnet deployment costs real MNT. Ensure you have sufficient funds.

### 7. Run AI Strategy Engine

```bash
pip install -r requirements.txt
python3 src/strategy.py
```

### 8. Start Backend API Server

```bash
# From project root
npm start
# or directly
node src/api/server.js
```

Expected output:
```
[INFO] Database initialized
[INFO] WebSocket server initialized
[INFO] MantleArb API Server running on 0.0.0.0:3001
```

The API server starts at `http://localhost:3001`. Verify with:
```bash
curl http://localhost:3001/health
```

```json
{
  "status": "healthy",
  "uptime": 1.234,
  "timestamp": "2026-06-06T12:00:00Z",
  "version": "1.0.0"
}
```

### 9. Start Frontend Dashboard

```bash
# In a new terminal, from project root
cd frontend

# Install frontend dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Start development server
npm run dev
```

Expected output:
```
  ▲ Next.js 14.x
  - Local:   http://localhost:3000
  - Network: http://192.168.x.x:3000
```

The frontend dashboard is available at `http://localhost:3000`.

> **Note:** Make sure the backend API server (step 8) is running before starting the frontend. The frontend connects to the backend at `http://localhost:3001` by default.

---

## Running Examples

### Example: Check API Health

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2026-06-06T12:00:00Z",
  "version": "1.0.0"
}
```

### Example: Query Prices from All 6 DEXes

```bash
curl http://localhost:3001/api/v1/prices?pair=USDC/WETH
```

Response:
```json
{
  "success": true,
  "data": {
    "pair": "USDC/WETH",
    "prices": {
      "merchantMoe": { "price": 0.000312, "liquidity": 1250000 },
      "fusionX":     { "price": 0.000315, "liquidity": 980000 },
      "agni":        { "price": 0.000310, "liquidity": 750000 },
      "cyberSwap":   { "price": 0.000314, "liquidity": 420000 },
      "helix":       { "price": 0.000311, "liquidity": 310000 },
      "iZiSwap":     { "price": 0.000313, "liquidity": 560000 }
    },
    "bestBuy":  { "dex": "agni", "price": 0.000310 },
    "bestSell": { "dex": "fusionX", "price": 0.000315 },
    "spread": 0.0161,
    "timestamp": "2026-06-06T12:00:00Z"
  }
}
```

### Example: Find Arbitrage Opportunities

```bash
curl http://localhost:3001/api/v1/monitoring/opportunities
```

Response:
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "pair": "USDC/WETH",
        "buyFrom": "agni",
        "sellTo": "fusionX",
        "spread": 1.61,
        "estimatedProfit": 12.50,
        "gasCost": 0.50,
        "netProfit": 12.00,
        "confidence": 0.85,
        "riskLevel": "low",
        "useFlashLoan": false
      }
    ],
    "totalOpportunities": 1,
    "timestamp": "2026-06-06T12:00:00Z"
  }
}
```

### Example: Execute an Arbitrage Trade (API)

```bash
curl -X POST http://localhost:3001/api/v1/trades/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ***" \
  -d '{
    "pair": "USDC/WETH",
    "amount": 1000,
    "buyRouter": "0x37Ed3a17a0C44E7E91E294a97E0D084f51F9A39A",
    "sellRouter": "0x333e3C607bB62054b84E1C3B0bD850A01B62f573",
    "useFlashLoan": false
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "txHash": "0xabc123...",
    "pair": "USDC/WETH",
    "profit": 12.50,
    "gasUsed": 245000,
    "blockNumber": 12345678,
    "timestamp": "2026-06-06T12:00:30Z"
  }
}
```

### Example: Get Contract Statistics

```bash
curl http://localhost:3001/api/v1/contract/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "totalTrades": 147,
    "totalProfit": 2340.50,
    "totalLosses": 120.00,
    "netProfit": 2220.50,
    "totalFlashLoanTrades": 23,
    "dailyTradeCount": 12,
    "winRate": 0.78
  }
}
```

### NPM Script Shortcuts

| Command | Description |
|---------|-------------|
| `npm start` | Start backend API server (port 3001) |
| `npm run compile` | Compile Solidity contracts |
| `npm run deploy:testnet` | Deploy to Mantle Testnet |
| `npm run deploy:mainnet` | Deploy to Mantle Mainnet |
| `npm test` | Run smart contract tests (67 tests) |
| `npm run test:unit` | Run unit tests for modules |
| `npm run strategy` | Run Python AI strategy engine |

---

## Screenshot Guide & Expected Output

### Frontend Dashboard (http://localhost:3000)

When you open the frontend, you'll see:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🟢 MantleArb Dashboard                              [Settings] 🔔 │
├──────────┬──────────────────────────────────────────────────────────┤
│          │                                                          │
│  📊 Overview    │  Total Profit:  $2,340.50  (+1.2% today)         │
│  📈 Monitoring  │  Net Profit:    $2,220.50                        │
│  🔄 Trades      │  Win Rate:      78%                              │
│  📋 Strategies  │  Total Trades:  147                              │
│  🧪 Backtest    │  Daily Trades:  12 / 100                         │
│  ⚙️ Settings    │  Active Alerts: 3                                │
│          │                                                          │
│          │  ┌─────────────────────────────────────────────────┐    │
│          │  │  Price Monitor (Live)                           │    │
│          │  │  USDC/WETH                                       │    │
│          │  │  MerchantMoe: 0.000312 ████████████░░           │    │
│          │  │  FusionX:     0.000315 █████████████░           │    │
│          │  │  Agni:        0.000310 ████████████░░           │    │
│          │  │  CyberSwap:   0.000314 █████████████░           │    │
│          │  │  Helix:       0.000311 ████████████░░           │    │
│          │  │  iZiSwap:     0.000313 █████████████░           │    │
│          │  └─────────────────────────────────────────────────┘    │
│          │                                                          │
│          │  ┌─────────────────────────────────────────────────┐    │
│          │  │  Opportunities                                  │    │
│          │  │  🟢 USDC/WETH  Agni→FusionX  +1.61%  $12.00   │    │
│          │  │  🟡 USDC/MNT   Moe→Cyber     +0.82%  $64.90   │    │
│          │  └─────────────────────────────────────────────────┘    │
├──────────┴──────────────────────────────────────────────────────────┤
│  Status: Connected | Block: 12345678 | Gas: 0.01 gwei              │
└─────────────────────────────────────────────────────────────────────┘
```

### Arbitrage Transaction Flow

```
  Step 1: Price Detection                Step 2: AI Evaluation
  ┌──────────────────────┐              ┌──────────────────────┐
  │ Fetch prices from    │              │ AI Strategy Engine    │
  │ 6 DEXes simultaneously│             │ evaluates:            │
  │                      │              │ • Spread: 1.61%       │
  │ Agni:      0.000310  │              │ • Net profit: $12.00  │
  │ FusionX:   0.000315  │   ──────▶    │ • Risk: LOW           │
  │ Moe:       0.000312  │              │ • Gas cost: $0.50     │
  │ Cyber:     0.000314  │              │ • Confidence: 85%     │
  │                      │              │ ✅ Decision: EXECUTE  │
  └──────────────────────┘              └──────────┬───────────┘
                                                   │
  Step 3: Execute Trade                  Step 4: Profit Collection
  ┌──────────────────────┐              ┌──────────────────────┐
  │ Smart Contract:      │              │ Trade Result:         │
  │                      │              │                       │
  │ 1. Transfer USDC     │              │ Tx Hash: 0xabc...     │
  │ 2. Buy WETH on Agni  │   ──────▶    │ Profit:  $12.50       │
  │ 3. Sell WETH on FX   │              │ Gas:     245,000      │
  │ 4. Verify profit     │              │ Block:   12345678     │
  │ 5. Emit event        │              │ Status:  ✅ SUCCESS   │
  └──────────────────────┘              └──────────────────────┘
```

### Flash Loan Transaction Flow

```
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Detect   │───▶│ Borrow   │───▶│ Buy Low  │───▶│ Sell High│───▶│ Repay +  │
  │ Spread   │    │ via      │    │ on DEX-A │    │ on DEX-B │    │ Profit   │
  │ > 0.5%   │    │ Balancer │    │          │    │          │    │          │
  └──────────┘    │ (0% fee) │    └──────────┘    └──────────┘    └──────────┘
                  └──────────┘
                  OR
                  ┌──────────┐
                  │ Borrow   │
                  │ via Aave │
                  │ (0.09%)  │
                  └──────────┘

  Example: Borrow $50,000 USDC via Balancer (0% fee)
  → Buy WETH on Agni at 0.000310
  → Sell WETH on FusionX at 0.000315
  → Spread: 1.61%
  → Gross profit: $805
  → Gas cost: ~$0.50
  → Net profit: ~$804.50
  → Repay $50,000 to Balancer
  → Keep $804.50 profit (no upfront capital needed!)
```

### Console Output During Active Trading

```
[2026-06-06 12:00:01] [INFO] PriceMonitor - Scanning 6 DEXes for USDC/WETH...
[2026-06-06 12:00:01] [INFO] PriceMonitor - Agni:      0.000310 (liquidity: $750K)
[2026-06-06 12:00:01] [INFO] PriceMonitor - FusionX:   0.000315 (liquidity: $980K)
[2026-06-06 12:00:01] [INFO] PriceMonitor - Moe:       0.000312 (liquidity: $1.25M)
[2026-06-06 12:00:01] [INFO] PriceMonitor - CyberSwap: 0.000314 (liquidity: $420K)
[2026-06-06 12:00:01] [INFO] PriceMonitor - Helix:     0.000311 (liquidity: $310K)
[2026-06-06 12:00:01] [INFO] PriceMonitor - iZiSwap:   0.000313 (liquidity: $560K)
[2026-06-06 12:00:01] [INFO] AIStrategy  - Spread detected: 1.61% (Agni → FusionX)
[2026-06-06 12:00:01] [INFO] AIStrategy  - Risk assessment: LOW (spread > threshold)
[2026-06-06 12:00:01] [INFO] AIStrategy  - Estimated net profit: $12.00
[2026-06-06 12:00:01] [INFO] Executor    - Executing arbitrage...
[2026-06-06 12:00:02] [INFO] Executor    - TX: 0xabc123def456...
[2026-06-06 12:00:03] [INFO] Executor    - ✅ Profit: $12.50 | Gas: 245,000 | Block: 12345678
[2026-06-06 12:00:03] [INFO] Memory      - Trade recorded. Total trades: 148 | Win rate: 78.4%
```

---

## API Documentation

### REST API Endpoints

#### Health Check

```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 12345,
  "network": "mantle",
  "contractAddress": "0x..."
}
```

#### Get Prices

```
GET /api/prices?pair=USDC/WETH
```

Response:
```json
{
  "success": true,
  "data": {
    "pair": "USDC/WETH",
    "prices": {
      "merchantMoe": { "price": 0.000312, "liquidity": 1250000 },
      "fusionX":     { "price": 0.000315, "liquidity": 980000 },
      "agni":        { "price": 0.000310, "liquidity": 750000 },
      "cyberSwap":   { "price": 0.000314, "liquidity": 420000 },
      "helix":       { "price": 0.000311, "liquidity": 310000 },
      "iZiSwap":     { "price": 0.000313, "liquidity": 560000 }
    },
    "bestBuy":  { "dex": "agni", "price": 0.000310 },
    "bestSell": { "dex": "fusionX", "price": 0.000315 },
    "spread": 0.0161,
    "timestamp": "2026-06-06T12:00:00Z"
  }
}
```

#### Get Opportunities

```
GET /api/opportunities
```

Response:
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "pair": "USDC/WETH",
        "buyFrom": "agni",
        "sellTo": "fusionX",
        "spread": 1.61,
        "estimatedProfit": 12.50,
        "gasCost": 0.50,
        "netProfit": 12.00,
        "confidence": 0.85,
        "riskLevel": "low",
        "useFlashLoan": false
      },
      {
        "pair": "USDC/MNT",
        "buyFrom": "merchantMoe",
        "sellTo": "cyberSwap",
        "spread": 0.82,
        "estimatedProfit": 65.40,
        "gasCost": 0.50,
        "netProfit": 64.90,
        "confidence": 0.72,
        "riskLevel": "medium",
        "useFlashLoan": true,
        "flashLoanProvider": "balancer",
        "flashLoanAmount": 50000
      }
    ],
    "totalOpportunities": 2,
    "timestamp": "2026-06-06T12:00:00Z"
  }
}
```

#### Get Contract Stats

```
GET /api/contract/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "totalTrades": 147,
    "totalProfit": 2340.50,
    "totalLosses": 120.00,
    "netProfit": 2220.50,
    "totalFlashLoanTrades": 23,
    "dailyTradeCount": 12,
    "lastTradeTimestamp": "2026-06-06T11:45:00Z",
    "winRate": 0.78
  }
}
```

#### Execute Trade (requires auth)

```
POST /api/trades/execute
Content-Type: application/json
Authorization: Bearer <token>

{
  "pair": "USDC/WETH",
  "amount": 1000,
  "buyRouter": "0x37Ed3a17a0C44E7E91E294a97E0D084f51F9A39A",
  "sellRouter": "0x333e3C607bB62054b84E1C3B0bD850A01B62f573",
  "useFlashLoan": false
}
```

Response:
```json
{
  "success": true,
  "data": {
    "txHash": "0xabc123...",
    "pair": "USDC/WETH",
    "profit": 12.50,
    "gasUsed": 245000,
    "blockNumber": 12345678,
    "timestamp": "2026-06-06T12:00:30Z"
  }
}
```

### Smart Contract API

#### Constructor

```solidity
constructor(
    address _merchantMoe,   // Merchant Moe router address
    address _fusionX,       // FusionX router address
    address _agni,          // Agni Finance router address
    address _priceOracle    // Price oracle address (can be zero address)
)
```

#### Core Functions

##### `executeArbitrage(ArbitrageOpportunity calldata opp)`

Execute a regular (non-flash-loan) arbitrage trade.

```solidity
struct ArbitrageOpportunity {
    address tokenA;        // Token to start with
    address tokenB;        // Token to arbitrage
    uint256 amountIn;      // Amount of tokenA to use
    address routerBuy;     // Buy from (lower price DEX)
    address routerSell;    // Sell to (higher price DEX)
    uint256 minAmountOut;  // Minimum output from sell
    uint256 expectedProfit; // Expected profit (for validation)
    uint256 deadline;      // Transaction deadline
}
```

**Returns:** `uint256 profit` — actual profit earned

**Access:** Owner or AI Operator only

##### `executeFlashLoanArbitrage(FlashLoanArbitrage calldata flashOpp)`

Execute arbitrage using flash loans (no upfront capital).

```solidity
struct FlashLoanArbitrage {
    address tokenA;
    address tokenB;
    uint256 amountIn;
    address routerBuy;
    address routerSell;
    uint256 minAmountOut;
    uint256 expectedProfit;
    uint256 deadline;
    bool useBalancer;     // true = Balancer (0% fee), false = Aave (0.09% fee)
}
```

##### `executeFlashLoan(address asset, uint256 amount, bytes calldata params)`

Execute a single-asset flash loan via Aave V3 `flashLoanSimple`.

##### `executeFlashLoanMulti(address[] calldata assets, uint256[] calldata amounts, bytes calldata params)`

Execute a multi-asset flash loan via Aave V3.

#### View Functions

##### `getAllPrices(address tokenIn, address tokenOut, uint256 amountIn)`

Get prices from all 6 DEXes simultaneously.

```solidity
returns (
    uint256 merchantMoePrice,
    uint256 fusionXPrice,
    uint256 agniPrice,
    uint256 cyberSwapPrice,
    uint256 helixPrice,
    uint256 iZiSwapPrice
)
```

##### `findBestArbitrage(address tokenIn, address tokenOut, uint256 amountIn)`

Find the most profitable arbitrage pair across all DEXes.

```solidity
returns (
    address bestBuyRouter,  // DEX to buy from
    address bestSellRouter, // DEX to sell to
    uint256 profit,         // Expected profit in tokenIn
    uint256 profitBps       // Profit in basis points
)
```

##### `calculateProfit(address tokenIn, address tokenOut, uint256 amountIn, address buyRouter, address sellRouter, uint256 gasCost)`

Calculate net profit after gas costs.

##### `getStats()`

Get contract statistics.

```solidity
returns (
    uint256 totalTrades,
    uint256 totalProfit,
    uint256 totalLosses,
    uint256 totalFlashLoanTrades,
    uint256 dailyTradeCount,
    uint256 lastTradeTimestamp
)
```

##### `getRouters()`

Get all 6 router addresses.

##### `getKnownTokens()`

Get list of known tokens for emergency withdrawal.

#### Admin Functions (Owner Only)

| Function | Description |
|----------|-------------|
| `setAIOperator(address)` | Set the AI operator address |
| `setMaxTradeSize(uint256)` | Set max single trade size |
| `setMinProfitBps(uint256)` | Set min profit in basis points (max 1000 = 10%) |
| `setMaxSlippageBps(uint256)` | Set max slippage in basis points (max 500 = 5%) |
| `setDailyTradeLimit(uint256)` | Set max daily trades |
| `setPriceOracle(address)` | Set price oracle address |
| `setMaxPriceDeviationBps(uint256)` | Set max oracle deviation (max 1000 = 10%) |
| `setFlashLoanProviders(address, address)` | Set Balancer and Aave addresses |
| `setFlashLoanEnabled(bool)` | Enable/disable flash loans |
| `setMaxFlashLoanSize(uint256)` | Set max flash loan amount |
| `setRouters(address, address, address)` | Update primary DEX routers |
| `setAdditionalRouters(address, address, address)` | Set CyberSwap, Helix, iZiSwap |
| `addKnownToken(address)` | Add token to known list |
| `removeKnownToken(address)` | Remove token from known list |
| `resetDailyTradeCount()` | Manually reset daily counter |
| `emergencyStopContract(string)` | Trigger emergency stop |
| `resumeContract()` | Resume from emergency stop |
| `withdrawToken(address, uint256)` | Withdraw specific token |
| `withdrawETH()` | Withdraw all ETH |
| `emergencyWithdrawAll(address[])` | Emergency withdraw all funds |

#### Events

```solidity
event ArbitrageExecuted(address indexed tokenA, address indexed tokenB, uint256 amountIn, uint256 profit, uint256 timestamp, bool usedFlashLoan);
event FlashLoanExecuted(address indexed provider, address indexed token, uint256 amount, uint256 fee, uint256 profit);
event RiskTriggered(string reason, uint256 value);
event EmergencyStop(address indexed caller, string reason);
event FundsWithdrawn(address indexed token, uint256 amount, address indexed to);
event DailyCountReset(uint256 oldCount, uint256 timestamp);
event OracleDeviationDetected(address indexed token, uint256 dexPrice, uint256 oraclePrice, uint256 deviationBps);
event KnownTokenAdded(address indexed token);
event KnownTokenRemoved(address indexed token);
```

---

## Risk Parameters

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `maxTradeSize` | $10,000 | — | Maximum single trade size |
| `minProfitBps` | 50 (0.5%) | 1000 (10%) | Minimum profit threshold |
| `maxSlippageBps` | 100 (1%) | 500 (5%) | Maximum allowed slippage |
| `dailyTradeLimit` | 100 | — | Maximum trades per day |
| `maxFlashLoanSize` | $100,000 | — | Maximum flash loan amount |
| `maxPriceDeviationBps` | 500 (5%) | 1000 (10%) | Max oracle price deviation |

---

## Why Mantle?

| Benefit | Description |
|---------|-------------|
| **Low Gas** | 10-100x cheaper than Ethereum mainnet |
| **Fast Blocks** | Short block times = longer opportunity windows |
| **Growing Ecosystem** | New DEXes constantly launching = more price differences |
| **L2 Security** | Inherits Ethereum security via optimistic rollup |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contract | Solidity 0.8.19 + OpenZeppelin |
| AI Strategy | Python + OpenAI GPT-4o-mini |
| Blockchain | Mantle Network (L2) |
| Framework | Hardhat |
| Testing | Hardhat + Chai + ethers.js |
| Flash Loans | Balancer Vault + Aave V3 |

---

## Security

- ✅ ReentrancyGuard on all state-changing functions
- ✅ Pausable emergency stop
- ✅ Slippage protection (configurable)
- ✅ Oracle price manipulation detection
- ✅ Approval revocation after trades
- ✅ Daily trade limits
- ✅ Trade size limits
- ✅ Emergency withdrawal with approval revocation

See [AUDIT_REPORT.md](./AUDIT_REPORT.md) for detailed security analysis.

---

## Troubleshooting

### "insufficient funds" during deployment
Get testnet tokens from [Mantle Testnet Faucet](https://faucet.testnet.mantle.xyz).

### "constructor argument count mismatch"
The contract constructor takes 4 arguments: `(merchantMoe, fusionX, agni, priceOracle)`. Make sure your deploy script passes all 4. The priceOracle can be `address(0)` if not using oracle features.

### Verification fails on MantleScan
Ensure your `MANTLESCAN_API_KEY` is set in `.env`. Get an API key from [MantleScan](https://mantlescan.xyz). You can also verify manually:
```bash
npx hardhat verify --network mantleTestnet <CONTRACT_ADDRESS> "<MERCHANT_MOE>" "<FUSIONX>" "<AGNI>" "<PRICE_ORACLE>"
```

### Tests fail with "Cannot find module"
Run `npm install` to ensure all dependencies are installed.

---

## License

MIT License

---

## ⚠️ 风险警告 (Risk Warning)

### Flash Loan 风险
- Flash Loan 要求在同一交易中完成借款和还款，任何失败都会导致交易回滚并损失 Gas 费用
- Flash Loan 协议可能变更费率或暂停服务，影响套利策略执行
- 在极端市场条件下，Flash Loan 可能无法获取足够流动性

### MEV 攻击风险
- 套利交易在内存池中可被 MEV 搜索者检测并抢跑 (Front-running)
- 三明治攻击 (Sandwich Attack) 可能导致滑点增大，侵蚀套利利润
- 区块构建者可能对交易进行重新排序，影响交易执行结果

### 智能合约风险
- 智能合约可能存在未发现的漏洞，导致资金损失
- 合约与 DEX 交互时可能受到目标 DEX 合约漏洞的影响
- 升级或迁移过程中的错误可能导致合约功能异常

> **请在充分理解以上风险后，自行决定是否使用本项目。**
