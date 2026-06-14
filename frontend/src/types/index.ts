// Core types for MantleArb frontend

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

export interface DEX {
  id: string;
  name: string;
  routerAddress: string;
  factoryAddress: string;
  chainId: number;
  logoUrl?: string;
}

export interface PriceQuote {
  dex: string;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  price: number;
  gasEstimate: number;
  timestamp: number;
}

export interface ArbitrageOpportunity {
  id: string;
  tokenA: Token;
  tokenB: Token;
  buyDex: DEX;
  sellDex: DEX;
  amountIn: string;
  expectedProfit: string;
  profitBps: number;
  gasCost: number;
  netProfit: number;
  status: 'hot' | 'warm' | 'expired' | 'executing';
  timestamp: number;
}

export interface Trade {
  id: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  strategy: string;
  tokenA: Token;
  tokenB: Token;
  amountIn: string;
  amountOut: string;
  profit: string;
  gasUsed: number;
  gasCost: string;
  buyDex: string;
  sellDex: string;
  usedFlashLoan: boolean;
  status: 'success' | 'failed' | 'pending';
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  status: 'active' | 'paused' | 'stopped';
  parameters: Record<string, number | string | boolean>;
  stats: StrategyStats;
  createdAt: number;
  updatedAt: number;
}

export type StrategyType = 'triangular' | 'cross-dex' | 'flash-loan' | 'statistical' | 'momentum';

export interface StrategyStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: string;
  totalLosses: string;
  netProfit: string;
  winRate: number;
  avgProfitPerTrade: string;
  maxDrawdown: number;
  sharpeRatio: number;
  lastTradeTimestamp: number;
}

export interface RiskParameters {
  maxTradeSize: number;
  minProfitBps: number;
  maxSlippageBps: number;
  dailyTradeLimit: number;
  maxFlashLoanSize: number;
  maxPriceDeviationBps: number;
}

export interface BacktestConfig {
  strategyId: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  pair: string;
  interval: string;
}

export interface BacktestResult {
  id: string;
  config: BacktestConfig;
  totalProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  avgProfit: number;
  equityCurve: { time: string; value: number }[];
  trades: Trade[];
  createdAt: number;
}

export interface Alert {
  id: string;
  type: 'opportunity' | 'risk' | 'trade' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
}

export interface SystemStatus {
  api: 'operational' | 'degraded' | 'down';
  websocket: 'operational' | 'degraded' | 'down';
  blockchain: 'operational' | 'degraded' | 'down';
  uptime: number;
  latency: number;
  lastBlock: number;
}

export interface WebSocketMessage {
  type: 'price_update' | 'trade_update' | 'opportunity' | 'alert' | 'system';
  data: any;
  timestamp: number;
}
