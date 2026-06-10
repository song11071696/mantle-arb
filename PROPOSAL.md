# MantleArb — Project Proposal

> Mantle Turing Test Hackathon 2026 | Track: AI Strategy | Prize Pool: $120,000+

---

## 1. Project Background

### The Problem

Mantle Network's DeFi ecosystem is growing rapidly, with multiple DEXes operating simultaneously:

- **Merchant Moe** — Native Mantle DEX
- **FusionX** — Cross-chain DEX
- **Agni Finance** — Yield-focused DEX
- **CyberSwap** — AMM DEX
- **Helix** — Order book DEX
- **iZiSwap** — Concentrated liquidity DEX

However, **price inconsistencies** across these DEXes create arbitrage opportunities that are:

1. **Hard to detect manually** — Traders must monitor 6+ platforms simultaneously
2. **Time-sensitive** — Price gaps close within seconds
3. **Capital-intensive** — Traditional arbitrage requires large upfront capital
4. **Gas-inefficient** — Multiple transactions reduce profitability

### The Opportunity

Mantle's **low gas costs** (10-100x cheaper than Ethereum) and **fast block times** make it an ideal environment for automated arbitrage. The growing ecosystem means new token pairs and liquidity pools are constantly being added, creating persistent price dislocations.

---

## 2. Technical Solution

### Overview

MantleArb is a **smart contract + AI agent** system that:

1. **Monitors** prices across 6 Mantle DEXes in real-time
2. **Detects** arbitrage opportunities with AI-powered analysis
3. **Executes** profitable trades using Flash Loans (zero upfront capital)
4. **Manages** risk with multi-layer controls

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Strategy Layer                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Price Feed   │  │ GPT-4o-mini  │  │ Risk Engine  │  │
│  │ Aggregator   │  │ Evaluator    │  │              │  │
│  │              │  │              │  │ • Spread     │  │
│  │ 6 DEX feeds  │  │ • EV calc    │  │ • Liquidity  │  │
│  │ Real-time    │  │ • Confidence │  │ • Gas cost   │  │
│  │              │  │ • Decision   │  │ • Slippage   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └─────────────────┼─────────────────┘           │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Smart Contract Layer                 │   │
│  │                                                   │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  MantleArb.sol (Solidity 0.8.19)           │  │   │
│  │  │                                             │  │   │
│  │  │  • executeArbitrage()      — Regular swap   │  │   │
│  │  │  • executeFlashLoanArb()   — Balancer/Aave  │  │   │
│  │  │  • executeFlashLoan()      — Aave simple    │  │   │
│  │  │  • findBestArbitrage()     — Auto-discover  │  │   │
│  │  │  • getAllPrices()          — Price oracle    │  │   │
│  │  │                                             │  │   │
│  │  │  Security: ReentrancyGuard + Pausable       │  │   │
│  │  │  Access:   OnlyOwner + OnlyOperator         │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Mantle Network (L2)                  │   │
│  │                                                   │   │
│  │  DEXes:          Flash Loan Providers:            │   │
│  │  • Merchant Moe  • Balancer Vault (0% fee)       │   │
│  │  • FusionX       • Aave V3 Pool (0.09% fee)     │   │
│  │  • Agni Finance                                  │   │
│  │  • CyberSwap     Oracle:                         │   │
│  │  • Helix         • Chainlink / TWAP              │   │
│  │  • iZiSwap                                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### How It Works

#### Step 1: Price Discovery
The AI agent continuously fetches prices from all 6 DEXes for major token pairs (MNT/USDC, WETH/USDC, etc.) using the contract's `getAllPrices()` function.

#### Step 2: Opportunity Detection
The AI strategy engine calculates spreads between DEX pairs. When the spread exceeds the minimum threshold (default 0.5%), it evaluates the opportunity:

- **Expected value (EV)** calculation: `EV = spread × amount - gas_cost - slippage_estimate`
- **Confidence scoring**: Based on liquidity depth, historical volatility, and oracle agreement
- **Risk assessment**: Checks daily limits, position sizing, and market conditions

#### Step 3: Execution
If the opportunity passes all checks, the contract executes:

**Regular Arbitrage (with capital):**
1. Buy tokenB on the cheaper DEX
2. Sell tokenB on the more expensive DEX
3. Collect the profit

**Flash Loan Arbitrage (zero capital):**
1. Borrow tokenA via Flash Loan (Balancer: 0% fee / Aave: 0.09% fee)
2. Buy tokenB on the cheaper DEX
3. Sell tokenB on the more expensive DEX
4. Repay the loan + fee
5. Keep the profit

#### Step 4: Risk Management
Every trade is checked against:
- Maximum trade size ($10,000 default)
- Minimum profit threshold (0.5% default)
- Maximum slippage (1% default)
- Daily trade limit (100 default)
- Oracle price deviation (5% max)
- Emergency stop status

---

## 3. Innovation Points

### 3.1 AI-Powered Decision Making
Unlike traditional arbitrage bots that use simple threshold rules, MantleArb integrates **GPT-4o-mini** for intelligent opportunity evaluation:

- **Contextual analysis**: Considers market conditions, not just price spreads
- **Dynamic sizing**: Adjusts trade size based on confidence level
- **Risk scoring**: Assigns risk scores to each opportunity
- **Learning**: Can improve over time with feedback loops

### 3.2 Flash Loan Integration
Two flash loan providers for maximum flexibility:

| Provider | Fee | Best For |
|----------|-----|----------|
| Balancer Vault | **0%** | Large trades, maximum profit |
| Aave V3 | **0.09%** | Reliability, wide token support |

This enables **zero-capital arbitrage** — anyone can deploy the contract and start earning without initial funds.

### 3.3 Multi-DEX Coverage
Supporting 6 DEXes (vs. typical 2-3) dramatically increases opportunity frequency:

- More price pairs = more dislocations
- Cross-DEX arbitrage (same pair, different prices)
- Triangular arbitrage potential (A→B→C→A)

### 3.4 Oracle-Based Manipulation Protection
Real-time price comparison against oracles prevents:
- Sandwich attacks
- Flash loan price manipulation
- Whale-driven temporary dislocations

### 3.5 Production-Grade Security
- **ReentrancyGuard**: All state-changing functions protected
- **Pausable**: Emergency stop capability
- **Approval Revocation**: Token approvals revoked after every trade
- **Emergency Withdrawal**: One-click fund recovery with approval cleanup
- **67 comprehensive tests** covering all edge cases

---

## 4. Roadmap

### Phase 1: Hackathon (Current) ✅
- [x] Smart contract development (V3 with Flash Loans)
- [x] Multi-DEX support (6 DEXes)
- [x] Flash Loan integration (Balancer + Aave V3)
- [x] Risk management system
- [x] Comprehensive test suite (67 tests)
- [x] Security audit
- [x] AI strategy engine (Python + OpenAI)
- [x] Documentation and proposal

### Phase 2: Testnet Deployment (Week 1-2)
- [ ] Deploy to Mantle testnet
- [ ] Integration testing with real DEXes
- [ ] Performance benchmarking
- [ ] Gas optimization
- [ ] Bug bounty program

### Phase 3: Mainnet Beta (Week 3-4)
- [ ] Deploy to Mantle mainnet
- [ ] Limited capital allocation ($5,000)
- [ ] Monitor for 1 week
- [ ] Collect performance metrics
- [ ] Adjust risk parameters

### Phase 4: Full Launch (Month 2)
- [ ] Increase capital allocation
- [ ] Add more token pairs
- [ ] Frontend dashboard (React + Viem)
- [ ] Performance analytics
- [ ] Community feedback

### Phase 5: Expansion (Month 3+)
- [ ] Cross-chain arbitrage (Mantle ↔ Ethereum)
- [ ] MEV protection (Flashbots-style)
- [ ] Yield farming integration
- [ ] Governance token
- [ ] DAO-based parameter management

---

## 5. Expected Performance

| Metric | Conservative | Optimistic |
|--------|-------------|------------|
| Daily trades | 5-10 | 20-50 |
| Average profit per trade | $2-10 | $10-50 |
| Daily profit | $10-100 | $200-2,500 |
| Monthly ROI | 5-15% | 30-100% |
| Win rate | >80% | >90% |

*Note: Performance depends on market conditions, liquidity, and competition.*

---

## 6. Team

**Tyler** — Full-Stack Developer & AI Agent Expert
- 5+ years crypto trading experience
- AI/ML development experience
- Smart contract security focus
- Hermes Agent contributor

---

## 7. Links

- **GitHub**: https://github.com/song11071696/mantle-arb
- **Twitter**: @zelin1107
- **Telegram**: @zelin111199
- **DoraHacks**: [Submission Link]

---

*Built for the Mantle Turing Test Hackathon 2026*
