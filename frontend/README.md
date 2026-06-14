# MantleArb Frontend

AI-Powered DEX Arbitrage Trading Dashboard for Mantle Network.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: SWR
- **Charts**: Recharts + Custom SVG
- **Blockchain**: ethers.js v6

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Dashboard (home)
│   │   ├── welcome/            # Landing page
│   │   ├── login/              # Wallet connection
│   │   ├── strategies/         # Strategy management
│   │   │   ├── page.tsx        # Strategy list
│   │   │   ├── create/         # Create new strategy
│   │   │   └── [id]/           # Strategy detail
│   │   ├── trades/             # Trade history
│   │   │   ├── page.tsx        # Trade list
│   │   │   └── [id]/           # Trade detail
│   │   ├── monitoring/         # Live monitoring
│   │   ├── analytics/          # Performance analytics
│   │   ├── backtesting/        # Strategy backtesting
│   │   ├── alerts/             # Alert management
│   │   ├── settings/           # Risk & notification settings
│   │   └── api/                # API routes
│   │       └── v1/             # REST API endpoints
│   │           ├── strategies/
│   │           ├── trades/
│   │           ├── prices/
│   │           ├── monitoring/
│   │           ├── alerts/
│   │           ├── risk/
│   │           ├── contract/
│   │           └── backtesting/
│   ├── components/             # React components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── ui/                 # Reusable UI components
│   │       ├── Cards.tsx
│   │       ├── Charts.tsx
│   │       ├── DataTable.tsx
│   │       ├── LiveMonitor.tsx
│   │       └── PriceFeed.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAPI.ts
│   │   └── useWebSocket.ts
│   ├── lib/                    # Utility libraries
│   │   ├── api.ts
│   │   └── store.ts
│   └── types/                  # TypeScript types
│       └── index.ts
├── public/                     # Static assets
├── .env.local.example          # Environment template
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Real-time arbitrage overview with stats, charts, and live monitor |
| Welcome | `/welcome` | Landing page with features and project overview |
| Login | `/login` | Wallet connection (MetaMask, WalletConnect, Coinbase) |
| Strategies | `/strategies` | Strategy list with filtering (active/paused/stopped) |
| Create Strategy | `/strategies/create` | Step-by-step strategy creation wizard |
| Strategy Detail | `/strategies/[id]` | Strategy overview, trades, and configuration |
| Trade History | `/trades` | Complete trade log with filtering and statistics |
| Trade Detail | `/trades/[id]` | Detailed trade execution information |
| Live Monitor | `/monitoring` | Real-time price feeds across all DEXes |
| Analytics | `/analytics` | Performance metrics and charts |
| Backtesting | `/backtesting` | Historical strategy testing |
| Alerts | `/alerts` | System notifications and trade alerts |
| Settings | `/settings` | Risk parameters and notification preferences |

## API Endpoints

All API routes are served at `/api/v1/`:

- `GET /api/v1/strategies` - List all strategies
- `POST /api/v1/strategies` - Create new strategy
- `GET /api/v1/trades` - List trades (with optional filters)
- `GET /api/v1/prices?tokenIn=X&tokenOut=Y` - Get DEX prices
- `GET /api/v1/prices/best?tokenIn=X&tokenOut=Y&amount=Z` - Get best price
- `GET /api/v1/monitoring/status` - System health status
- `GET /api/v1/monitoring/opportunities` - Live arbitrage opportunities
- `GET /api/v1/alerts` - System alerts
- `GET /api/v1/risk/parameters` - Risk configuration
- `PUT /api/v1/risk/parameters` - Update risk parameters
- `GET /api/v1/contract/stats` - Smart contract statistics
- `POST /api/v1/backtesting/run` - Run backtest
- `GET /api/v1/backtesting/run` - List backtest results

## Environment Variables

See `.env.local.example` for all configuration options.

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:3001/ws` |
| `NEXT_PUBLIC_MANTLE_CHAIN_ID` | Mantle chain ID | `5000` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Arb contract address | - |
| `NEXT_PUBLIC_REFRESH_INTERVAL` | Data refresh interval (ms) | `5000` |
