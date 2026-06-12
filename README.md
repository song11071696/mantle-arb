# MantleArb — Open-Source Arbitrage Agent Prototype

> **Disclaimer**: This project is an **open-source arbitrage agent prototype** for educational and research purposes only. It is NOT production-ready software. Use at your own risk. See [RISK_DISCLOSURE.md](RISK_DISCLOSURE.md) for full details.

## What is MantleArb?

MantleArb is a **research prototype** that explores automated arbitrage strategies on the Mantle Network. It demonstrates how an AI-assisted agent can identify potential arbitrage opportunities across DEXs on the Mantle blockchain.

**This is NOT:**
- A guaranteed profit-making tool
- A production-grade trading system
- Financial advice of any kind

## ⚠️ Important Disclaimers

### Financial Disclaimer
This software is provided for **educational and research purposes only**. Cryptocurrency trading and arbitrage carry significant financial risk, including but not limited to: total loss of funds, smart contract exploits, impermanent loss, slippage, gas costs, and market volatility. The authors and contributors accept **no liability** for any financial losses incurred through the use of this software. **You are solely responsible for your own trading decisions and any resulting financial outcomes.**

### AI Decision Boundary
The AI components in this system operate under the following constraints:
- **AI decisions are advisory only** — all AI-generated trade recommendations are suggestions, not autonomous actions
- **Human approval is required** — no trade is executed without explicit human confirmation (or a pre-configured execution policy set by the user)
- **AI does not control funds** — the AI module never has direct access to private keys or wallet signing authority
- **AI recommendations may be wrong** — models can hallucinate, miscalculate, or be misled by market anomalies
- **Deterministic safety checks override AI** — profit threshold checks, slippage limits, and whitelist validations always take precedence over AI suggestions

## AI Architecture

```
┌─────────────────────────────────────────────────────┐
│                   MantleArb Agent                    │
├──────────┬──────────┬──────────┬────────────────────┤
│ Market   │ AI       │ Safety   │ Execution          │
│ Monitor  │ Advisor  │ Layer    │ Engine             │
│          │          │          │                    │
│ • Price  │ • LLM/   │ • Router │ • Tx Builder       │
│   Feed   │   Model  │   Whitelist│ • Gas Estimator  │
│ • Pool   │ • Signal │ • Token  │ • Nonce Manager    │
│   Scanner│   Gen    │   Whitelist│ • Retry Logic    │
│ • Depth  │ • Risk   │ • Profit │ • MEV Protection   │
│   Book   │   Score  │   Check  │                    │
├──────────┴──────────┴──────────┴────────────────────┤
│              Mantle Network (Chain RPC)              │
└─────────────────────────────────────────────────────┘
```

### Component Descriptions

| Component | Role | Autonomy Level |
|-----------|------|----------------|
| **Market Monitor** | Fetches real-time prices and pool states from DEXs | Fully automated |
| **AI Advisor** | Analyzes market data and suggests potential arbitrage routes | **Advisory only** — outputs are suggestions |
| **Safety Layer** | Validates all trades against whitelists and profit thresholds | **Hard block** — overrides all other components |
| **Execution Engine** | Constructs, signs, and submits transactions | User-configurable auto/manual mode |

### Safety Layer Details (Critical)

The Safety Layer is the **most important component** and operates independently of the AI:

1. **Router Whitelist**: Only pre-approved DEX router contracts can be interacted with
2. **Token Whitelist**: Only approved tokens can be included in arbitrage paths
3. **Profit Check**: Trades below a minimum profit threshold (configurable) are rejected
4. **Slippage Protection**: Maximum slippage is enforced per-trade
5. **Gas Limit**: Maximum gas cost is enforced to prevent unprofitable trades

## API Endpoints

All API endpoints follow a unified path structure under `/api/v1/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/v1/status` | System health and status |
| `GET`  | `/api/v1/opportunities` | List detected arbitrage opportunities |
| `POST` | `/api/v1/execute` | Execute an arbitrage trade (requires auth) |
| `GET`  | `/api/v1/config` | Get current configuration |
| `PUT`  | `/api/v1/config` | Update configuration (requires auth) |
| `GET`  | `/api/v1/history` | Trade history |
| `GET`  | `/api/v1/whitelist/routers` | Get router whitelist |
| `GET`  | `/api/v1/whitelist/tokens` | Get token whitelist |

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run in development mode (NO real trades)
npm run dev

# Run safety checks only
npm run check
```

## Configuration

See `config/default.json` for all configuration options. Key safety settings:

```json
{
  "safety": {
    "routerWhitelist": ["0x..."],
    "tokenWhitelist": ["0x..."],
    "minProfitThresholdBps": 50,
    "maxSlippageBps": 100,
    "maxGasCostWei": "100000000000000000"
  }
}
```

## Project Status

See [FEATURE_STATUS.md](FEATURE_STATUS.md) for current implementation status of all features.

## Security

See [SECURITY.md](SECURITY.md) for security policies and vulnerability reporting.

## Risk Disclosure

See [RISK_DISCLOSURE.md](RISK_DISCLOSURE.md) for full risk disclosure and financial disclaimers.

## License

MIT — See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read the security policy before submitting PRs.
