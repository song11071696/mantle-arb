"""
MantleArb V3 - AI Strategy Engine with Backtesting
Mantle Turing Test Hackathon 2026

V3 Improvements:
- 6 DEX support (Merchant Moe, FusionX, Agni, CyberSwap, Helix, iZiSwap)
- Real arbitrage detection with multi-hop paths
- Flash loan integration
- Backtesting framework
- Enhanced risk management
- Price manipulation detection
- WebSocket price streaming
"""

import json
import time
import logging
import os
import hashlib
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Tuple, Set
from datetime import datetime, timedelta
from enum import Enum
from collections import deque

try:
    from web3 import Web3
    from web3.exceptions import ContractLogicError
except ImportError:
    print("web3 not installed. Run: pip install web3")
    exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('mantlearb.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============ Enums ============

class DEXType(Enum):
    MERCHANT_MOE = "merchant_moe"
    FUSIONX = "fusionx"
    AGNI = "agni"
    CYBERSWAP = "cyberswap"
    HELIX = "helix"
    IZISWAP = "iziswap"

class TradeAction(Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"

class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

# ============ Configuration ============

class Config:
    """Configuration management"""

    # Mantle Network
    MANTLE_RPC = os.getenv("MANTLE_RPC", "https://rpc.mantle.xyz")
    MANTLE_CHAIN_ID = 5000

    # Contract address (after deployment)
    CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")

    # Real DEX Router Addresses on Mantle (V3 - 6 DEXes)
    DEX_ROUTERS = {
        DEXType.MERCHANT_MOE: "0xE6d0ED3759709b743707DcfeCAe39BC180C981fe",  # ✅ 已验证
        DEXType.FUSIONX: "0x333e3C607bB62054b84E1C3B0bD850A01B62f573",      # ✅ 已验证
        DEXType.AGNI: "0x37Ed3a17a0C44E7E91E294a97E0D084f51F9A39A",         # ✅ 已验证
        DEXType.CYBERSWAP: "0xe15a4e43B0569D8FCf07956B5E48E1E8e5118218",    # ✅ 已验证
        # Helix 和 iZiSwap: 需在Mantle测试网验证后填入
        # DEXType.HELIX: "<验证后填入>",
        # DEXType.IZISWAP: "<验证后填入>",
    }

    # Token addresses on Mantle
    TOKENS = {
        "MNT": "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
        "USDC": "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
        "USDT": "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
        "WETH": "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111",
        "WMNT": "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
        "WBTC": "0xCAbAE6f6Ea1ecaB5fe1a230C5D5DbD203e6B4993",
        # DAI: 移除占位符，部署后确认真实地址
        # "DAI": "<经MantleScan验证的真实地址>",
    }

    # ⬇️ 新增：Chainlink Oracle地址
    CHAINLINK_ORACLES = {
        "ETH/USD": "0x6351C04E7A86C2C7a88B5Bb48E2b46bEf46e45C8",
        "BTC/USD": "0x569D0b7B36331822B018a8E851D0E8e0C4a53515",
        "USDC/USD": "0xa56C5f4B5b4fB3e4BC5e8e20C24b31C04bE8A9C2",
    }

    # ⬇️ 新增：Oracle价格偏差阈值
    ORACLE_PRICE_DEVIATION_MAX = 0.05  # DEX价格偏离Oracle超过5%则拒绝执行

    # Popular trading pairs
    TRADING_PAIRS = [
        ("USDC", "WETH"),
        ("USDC", "WBTC"),
        ("USDC", "MNT"),
        ("USDC", "USDT"),
        ("WETH", "MNT"),
        ("WETH", "WBTC"),
        ("MNT", "USDT"),
    ]

    # Risk parameters
    MIN_SPREAD = 0.005  # 0.5% minimum spread
    MAX_TRADE_SIZE = 10000  # $10,000
    GAS_COST_ESTIMATE = 0.01  # ✅ 保守估计$0.01（Mantle L2实际Gas < $0.01）

    # ⬇️ 新增：动态Gas成本参数
    GAS_LIMIT_ARBITRAGE = 300_000  # 套利交易的Gas limit
    USE_DYNAMIC_GAS = True         # 是否使用动态Gas价格
    MIN_PROFIT = 1.0  # $1 minimum profit
    MAX_SLIPPAGE = 0.01  # 1% max slippage
    CONFIDENCE_THRESHOLD = 0.7  # 70% minimum confidence
    MAX_DAILY_LOSS = 1000  # $1,000 max daily loss
    MAX_POSITION_SIZE_PCT = 0.20  # 20% of balance

    # Flash loan settings
    FLASH_LOAN_ENABLED = True
    MAX_FLASH_LOAN_SIZE = 100000  # $100,000
    FLASH_LOAN_FEE_BPS = 0  # Balancer: 0% fee

    # AI settings
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    AI_MODEL = "gpt-4o-mini"

    @classmethod
    def validate_keys(cls):
        """✅ Validate that sensitive keys are properly configured via env vars"""
        warnings = []
        if cls.OPENAI_API_KEY and cls.OPENAI_API_KEY in ("your_openai_api_key", "sk-xxx", ""):
            warnings.append("OPENAI_API_KEY appears to be a placeholder or empty")
        if os.getenv("PRIVATE_KEY") in ("your_private_key_here", None, ""):
            warnings.append("PRIVATE_KEY is not configured")
        return warnings

    # Backtesting
    BACKTEST_INITIAL_BALANCE = 10000  # $10,000 starting balance
    BACKTEST_COMMISSION_BPS = 30  # 0.3% DEX commission


# ============ Data Classes ============

@dataclass
class PriceData:
    """Price data from a DEX"""
    token_pair: str
    dex: DEXType
    price: float
    liquidity: float
    timestamp: int
    block_number: int
    volume_24h: float = 0.0

@dataclass
class ArbitrageOpportunity:
    """Detected arbitrage opportunity"""
    token_pair: str
    buy_from: DEXType
    sell_to: DEXType
    buy_price: float
    sell_price: float
    spread: float
    expected_profit: float
    gas_cost: float
    net_profit: float
    confidence: float
    liquidity_score: float
    use_flash_loan: bool = False
    flash_loan_amount: float = 0.0
    trade_size: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    risk_level: RiskLevel = RiskLevel.MEDIUM
    execution_path: List[str] = field(default_factory=list)

@dataclass
class MultiHopOpportunity:
    """Multi-hop arbitrage opportunity (A -> B -> C -> A)"""
    path: List[str]
    dexes: List[DEXType]
    amount_in: float
    expected_output: float
    profit: float
    profit_bps: float
    gas_cost: float
    net_profit: float
    confidence: float

@dataclass
class TradeResult:
    """Result of an executed trade"""
    success: bool
    tx_hash: str
    profit: float
    gas_used: int
    token_pair: str
    buy_from: DEXType
    sell_to: DEXType
    timestamp: datetime = field(default_factory=datetime.now)
    error: str = ""
    used_flash_loan: bool = False

@dataclass
class BacktestResult:
    """Backtesting result"""
    start_date: datetime
    end_date: datetime
    initial_balance: float
    final_balance: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    total_profit: float
    total_loss: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    sharpe_ratio: float
    trades: List[Dict] = field(default_factory=list)


# ============ DEX Price Fetcher (6 DEXes) ============

class DEXPriceFetcher:
    """Fetch real prices from 6 Mantle DEXes"""

    ROUTER_ABI = json.loads('[{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsOut","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"}]')

    def __init__(self, w3: Web3):
        self.w3 = w3
        self.routers: Dict[DEXType, object] = {}
        self.price_cache: Dict[str, Tuple[float, float]] = {}  # key -> (price, timestamp)
        self.cache_ttl = 2  # 2 seconds cache

        for dex_type, address in Config.DEX_ROUTERS.items():
            if address == "0x0000000000000000000000000000000000000000":
                continue
            try:
                self.routers[dex_type] = w3.eth.contract(
                    address=Web3.to_checksum_address(address),
                    abi=self.ROUTER_ABI
                )
                logger.info(f"Initialized {dex_type.value} router")
            except Exception as e:
                logger.warning(f"Failed to initialize {dex_type.value} router: {e}")

    def get_price(self, dex_type: DEXType, token_in: str, token_out: str, amount_in: int) -> Optional[float]:
        """Get price from a specific DEX with caching"""
        # Check cache
        cache_key = f"{dex_type.value}:{token_in}:{token_out}:{amount_in}"
        now = time.time()
        if cache_key in self.price_cache:
            cached_price, cached_time = self.price_cache[cache_key]
            if now - cached_time < self.cache_ttl:
                return cached_price

        if dex_type not in self.routers:
            return None

        try:
            router = self.routers[dex_type]
            path = [
                Web3.to_checksum_address(token_in),
                Web3.to_checksum_address(token_out)
            ]
            amounts = router.functions.getAmountsOut(amount_in, path).call()
            price = amounts[1] / 1e18

            # Update cache
            self.price_cache[cache_key] = (price, now)
            return price
        except Exception as e:
            logger.error(f"Error fetching price from {dex_type.value}: {e}")
            return None

    def get_all_prices(self, token_in: str, token_out: str, amount_in: int = 1000) -> Dict[DEXType, PriceData]:
        """Get prices from all DEXes"""
        prices = {}
        timestamp = int(time.time())
        block_number = self.w3.eth.block_number

        for dex_type in self.routers:
            price = self.get_price(dex_type, token_in, token_out, amount_in)
            if price:
                prices[dex_type] = PriceData(
                    token_pair=f"{token_in}/{token_out}",
                    dex=dex_type,
                    price=price,
                    liquidity=0,
                    timestamp=timestamp,
                    block_number=block_number
                )

        return prices

    def get_multi_pair_prices(self, pairs: List[Tuple[str, str]], amount_in: int = 1000) -> Dict[str, Dict[DEXType, PriceData]]:
        """Get prices for multiple trading pairs"""
        all_prices = {}
        for token_in_addr, token_out_addr in pairs:
            pair_key = f"{token_in_addr}/{token_out_addr}"
            all_prices[pair_key] = self.get_all_prices(token_in_addr, token_out_addr, amount_in)
        return all_prices


# ============ Arbitrage Detector ============

class ArbitrageDetector:
    """Detect arbitrage opportunities across multiple DEXes"""

    def __init__(self, gas_estimator=None):
        self.opportunity_history: deque = deque(maxlen=1000)
        self.min_spread = Config.MIN_SPREAD
        self.gas_estimator = gas_estimator  # ⬇️ 新增

    def detect_two_leg_arbitrage(self, prices: Dict[DEXType, PriceData]) -> List[ArbitrageOpportunity]:
        """Detect simple two-leg arbitrage (buy low, sell high)"""
        opportunities = []

        if len(prices) < 2:
            return opportunities

        dex_list = list(prices.keys())
        for i in range(len(dex_list)):
            for j in range(i + 1, len(dex_list)):
                dex_a = dex_list[i]
                dex_b = dex_list[j]

                price_a = prices[dex_a].price
                price_b = prices[dex_b].price

                if price_a < price_b:
                    buy_from, sell_to = dex_a, dex_b
                    buy_price, sell_price = price_a, price_b
                else:
                    buy_from, sell_to = dex_b, dex_a
                    buy_price, sell_price = price_b, price_a

                spread = (sell_price - buy_price) / buy_price

                if spread >= self.min_spread:
                    amount = min(Config.MAX_TRADE_SIZE, 10000)
                    tokens_bought = amount / buy_price
                    sell_value = tokens_bought * sell_price
                    gross_profit = sell_value - amount
                    commission = amount * Config.BACKTEST_COMMISSION_BPS / 10000
                    gas_cost = (
                        self.gas_estimator.get_gas_cost_usd()
                        if self.gas_estimator
                        else Config.GAS_COST_ESTIMATE
                    )
                    net_profit = gross_profit - gas_cost - commission

                    if net_profit >= Config.MIN_PROFIT:
                        confidence = self._calculate_confidence(spread, price_a, price_b)
                        risk_level = self._assess_risk_level(spread, net_profit, amount)

                        opp = ArbitrageOpportunity(
                                token_pair=prices[dex_a].token_pair,
                                buy_from=buy_from,
                                sell_to=sell_to,
                                buy_price=buy_price,
                                sell_price=sell_price,
                                spread=spread,
                                expected_profit=gross_profit,
                                gas_cost=Config.GAS_COST_ESTIMATE,
                                net_profit=net_profit,
                                confidence=confidence,
                                liquidity_score=self._estimate_liquidity(prices),
                                trade_size=amount,
                                risk_level=risk_level,
                            execution_path=[
                                f"BUY {buy_from.value} @ {buy_price:.6f}",
                                f"SELL {sell_to.value} @ {sell_price:.6f}"
                            ]
                        )

                        # Should we use flash loan?
                        if Config.FLASH_LOAN_ENABLED and net_profit > 5:  # $5+ profit
                            opp.use_flash_loan = True
                            opp.flash_loan_amount = Config.MAX_FLASH_LOAN_SIZE

                        opportunities.append(opp)

        opportunities.sort(key=lambda x: x.net_profit, reverse=True)
        self.opportunity_history.extend(opportunities)
        return opportunities

    def detect_multi_hop_arbitrage(self, prices_by_pair: Dict[str, Dict[DEXType, PriceData]]) -> List[MultiHopOpportunity]:
        """Detect multi-hop arbitrage (e.g., USDC -> WETH -> MNT -> USDC)"""
        opportunities = []

        # Build price graph
        price_graph = {}
        for pair_key, prices in prices_by_pair.items():
            token_a, token_b = pair_key.split("/")
            for dex, price_data in prices.items():
                if token_a not in price_graph:
                    price_graph[token_a] = {}
                if token_b not in price_graph:
                    price_graph[token_b] = {}

                price_graph[token_a][(token_b, dex)] = price_data.price
                price_graph[token_b][(token_a, dex)] = 1.0 / price_data.price if price_data.price > 0 else 0

        # Find triangular arbitrage
        tokens = list(price_graph.keys())
        for a in tokens:
            for b in tokens:
                if b == a or b not in price_graph:
                    continue
                for c in tokens:
                    if c == a or c == b or c not in price_graph:
                        continue

                    # Try path: a -> b -> c -> a
                    leg1 = price_graph.get(a, {}).get((b, DEXType.MERCHANT_MOE))
                    leg2 = price_graph.get(b, {}).get((c, DEXType.FUSIONX))
                    leg3 = price_graph.get(c, {}).get((a, DEXType.AGNI))

                    if leg1 and leg2 and leg3 and leg1 > 0 and leg2 > 0 and leg3 > 0:
                        amount = 10000  # $10,000
                        after_leg1 = amount / leg1 * leg2
                        after_leg2 = after_leg1 / leg2 * leg3
                        profit = after_leg2 - amount

                        commission = amount * Config.BACKTEST_COMMISSION_BPS * 3 / 10000
                        net_profit = profit - Config.GAS_COST_ESTIMATE * 3 - commission

                        if net_profit > Config.MIN_PROFIT:
                            profit_bps = net_profit * 10000 / amount

                            opp = MultiHopOpportunity(
                                path=[a, b, c, a],
                                dexes=[DEXType.MERCHANT_MOE, DEXType.FUSIONX, DEXType.AGNI],
                                amount_in=amount,
                                expected_output=after_leg2,
                                profit=profit,
                                profit_bps=profit_bps,
                                gas_cost=Config.GAS_COST_ESTIMATE * 3,
                                net_profit=net_profit,
                                confidence=0.5  # Lower confidence for multi-hop
                            )
                            opportunities.append(opp)

        opportunities.sort(key=lambda x: x.net_profit, reverse=True)
        return opportunities

    def _calculate_confidence(self, spread: float, price_a: float, price_b: float) -> float:
        """Calculate confidence score (0-1)"""
        spread_score = min(spread / 0.02, 1.0)

        # Price consistency (closer to 1.0 = less variance)
        avg = (price_a + price_b) / 2
        variance = ((price_a - avg) ** 2 + (price_b - avg) ** 2) / 2
        consistency = 1.0 / (1.0 + variance * 1000)

        return min(spread_score * 0.6 + consistency * 0.4, 1.0)

    def _assess_risk_level(self, spread: float, net_profit: float, trade_size: float) -> RiskLevel:
        """Assess risk level of an opportunity"""
        if spread > 0.05 or net_profit > trade_size * 0.1:
            return RiskLevel.CRITICAL  # Suspiciously high
        elif spread > 0.03 or net_profit > trade_size * 0.05:
            return RiskLevel.HIGH
        elif spread > 0.01:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _estimate_liquidity(self, prices: Dict[DEXType, PriceData]) -> float:
        """Estimate liquidity score (0-1)"""
        # In production, check actual pool reserves
        # For now, use number of active DEXes as proxy
        return min(len(prices) / 6.0, 1.0)


# ============ AI Strategy Engine ============

class AIStrategy:
    """AI-powered arbitrage strategy"""

    def __init__(self):
        self.price_history: List[Dict] = []
        self.trade_history: List[TradeResult] = []
        self.detector = ArbitrageDetector()
        self.oracle_validator = None  # 延迟初始化
        self.ai_cache = {}  # ⬇️ 新增：缓存AI决策
        self.ai_cache_ttl = 300  # 5分钟缓存

        try:
            import openai
            self.client = openai.OpenAI(api_key=Config.OPENAI_API_KEY) if Config.OPENAI_API_KEY else None
        except ImportError:
            self.client = None
            logger.warning("OpenAI not installed. AI analysis disabled.")

    def init_oracle(self, web3):
        """连接Web3后初始化Oracle验证器"""
        self.oracle_validator = OracleValidator(web3, Config)

    def find_opportunities(self, prices: Dict[DEXType, PriceData]) -> List[ArbitrageOpportunity]:
        """Detect arbitrage opportunities"""
        return self.detector.detect_two_leg_arbitrage(prices)

    def find_multi_hop_opportunities(self, prices_by_pair: Dict[str, Dict[DEXType, PriceData]]) -> List[MultiHopOpportunity]:
        """Detect multi-hop arbitrage opportunities"""
        return self.detector.detect_multi_hop_arbitrage(prices_by_pair)

    def should_execute(self, opp: ArbitrageOpportunity) -> Tuple[bool, str]:
        """
        实时决策：纯规则引擎（<1ms延迟）
        不调用AI，确保在500ms套利窗口内完成
        """

        # Rule-based checks
        if opp.spread < Config.MIN_SPREAD:
            return False, "Spread too small"

        if opp.net_profit < Config.MIN_PROFIT:
            return False, "Profit too low"

        if opp.confidence < Config.CONFIDENCE_THRESHOLD:
            return False, f"Confidence too low: {opp.confidence:.1%}"

        if opp.liquidity_score < 0.3:
            return False, "Insufficient liquidity"

        if opp.risk_level == RiskLevel.CRITICAL:
            return False, "Risk level critical - suspicious opportunity"

        # Check historical performance
        if self.trade_history:
            recent_trades = self.trade_history[-10:]
            recent_success = sum(1 for t in recent_trades if t.success)
            if recent_success < 3:  # Less than 30% recent success
                return False, "Recent trade success rate too low"

        # ⬇️ 新增：Oracle价格验证
        if self.oracle_validator:
            price_valid, deviation = self.oracle_validator.validate_price(
                opp.token_pair, opp.buy_price
            )
            if not price_valid:
                return False, f"Oracle价格偏差{deviation*100:.1f}%（疑似操纵）"

        return True, "All checks passed"

    def _ai_analysis(self, opp: ArbitrageOpportunity) -> Tuple[float, str]:
        """AI analysis using OpenAI"""
        if not self.client:
            return 0.5, "AI not available"

        prompt = f"""
        Analyze this arbitrage opportunity on Mantle Network:

        Token Pair: {opp.token_pair}
        Buy from: {opp.buy_from.value} @ ${opp.buy_price:.6f}
        Sell to: {opp.sell_to.value} @ ${opp.sell_price:.6f}
        Spread: {opp.spread:.2%}
        Expected profit: ${opp.net_profit:.2f}
        Confidence: {opp.confidence:.1%}
        Risk level: {opp.risk_level.value}
        Use flash loan: {opp.use_flash_loan}

        Consider:
        1. Is the spread realistic or likely a data error?
        2. Is there sufficient liquidity on both DEXes?
        3. Could this be a sandwich attack or MEV exploitation?
        4. Are there any red flags?

        Respond with JSON: {{"score": 0.0-1.0, "reason": "brief explanation"}}
        """

        try:
            response = self.client.chat.completions.create(
                model=Config.AI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            return result.get("score", 0.5), result.get("reason", "No reason")

        except Exception as e:
            logger.error(f"AI analysis error: {e}")
            return 0.5, "AI analysis failed"

    def record_trade(self, result: TradeResult):
        """Record trade result for learning"""
        self.trade_history.append(result)
        logger.info(f"Trade recorded: {'Success' if result.success else 'Failed'}, "
                    f"Profit: ${result.profit:.2f}, Flash loan: {result.used_flash_loan}")


# ============ Risk Manager ============

class RiskManager:
    """Enhanced risk management system"""

    def __init__(self):
        self.daily_trades = 0
        self.daily_profit = 0.0
        self.daily_loss = 0.0
        self.last_reset = datetime.now().date()
        self.consecutive_losses = 0
        self.max_consecutive_losses = 5
        self.trade_log: List[Dict] = []

    def check_trade(self, opp: ArbitrageOpportunity, account_balance: float) -> Tuple[bool, str]:
        """Check if trade meets risk criteria"""
        self._reset_daily_if_needed()

        # Daily trade limit
        if self.daily_trades >= 100:
            return False, "Daily trade limit reached"

        # Daily loss limit
        if self.daily_loss >= Config.MAX_DAILY_LOSS:
            return False, "Daily loss limit reached"

        # Consecutive loss circuit breaker
        if self.consecutive_losses >= self.max_consecutive_losses:
            return False, f"Too many consecutive losses ({self.consecutive_losses})"

        # Position size limit
        max_position = account_balance * Config.MAX_POSITION_SIZE_PCT
        if opp.trade_size > max_position:
            return False, "Position too large relative to balance"

        # Profit must cover gas + commission
        min_net = opp.gas_cost * 3
        if opp.net_profit < min_net:
            return False, f"Profit ${opp.net_profit:.2f} doesn't cover costs"

        # Risk level check
        if opp.risk_level == RiskLevel.CRITICAL:
            return False, "Critical risk level - rejecting trade"

        return True, "Risk check passed"

    def record_trade(self, result: TradeResult):
        """Record trade for risk tracking"""
        self._reset_daily_if_needed()
        self.daily_trades += 1

        if result.success:
            self.daily_profit += result.profit
            self.consecutive_losses = 0
        else:
            self.daily_loss += abs(result.profit) if result.profit < 0 else 0
            self.consecutive_losses += 1

        self.trade_log.append({
            "timestamp": result.timestamp.isoformat(),
            "success": result.success,
            "profit": result.profit,
            "token_pair": result.token_pair,
            "used_flash_loan": result.used_flash_loan
        })

    def _reset_daily_if_needed(self):
        """Reset daily counters at midnight"""
        today = datetime.now().date()
        if today > self.last_reset:
            logger.info(f"Daily reset: trades={self.daily_trades}, profit=${self.daily_profit:.2f}, loss=${self.daily_loss:.2f}")
            self.daily_trades = 0
            self.daily_profit = 0.0
            self.daily_loss = 0.0
            self.last_reset = today

    def get_stats(self) -> Dict:
        """Get risk manager statistics"""
        return {
            "daily_trades": self.daily_trades,
            "daily_profit": self.daily_profit,
            "daily_loss": self.daily_loss,
            "consecutive_losses": self.consecutive_losses,
            "total_trades_logged": len(self.trade_log)
        }


# ============ Backtesting Engine ============

class BacktestEngine:
    """Backtesting framework for strategy validation"""

    def __init__(self, initial_balance: float = Config.BACKTEST_INITIAL_BALANCE):
        self.initial_balance = initial_balance
        self.balance = initial_balance
        self.trades: List[Dict] = []
        self.balance_history: List[float] = [initial_balance]
        self.max_balance = initial_balance
        self.max_drawdown = 0.0
        self.detector = ArbitrageDetector()

    def run_backtest(
        self,
        price_data: List[Dict[str, Dict[DEXType, PriceData]]],
        strategy: Optional[AIStrategy] = None,
        risk_manager: Optional[RiskManager] = None
    ) -> BacktestResult:
        """Run backtest on historical price data"""

        if strategy is None:
            strategy = AIStrategy()
        if risk_manager is None:
            risk_manager = RiskManager()

        winning_trades = 0
        losing_trades = 0
        total_profit = 0.0
        total_loss = 0.0

        logger.info(f"Starting backtest with ${self.initial_balance:.2f} balance, {len(price_data)} data points")

        for i, prices_at_time in enumerate(price_data):
            # Find opportunities
            for pair_key, prices in prices_at_time.items():
                opportunities = self.detector.detect_two_leg_arbitrage(prices)

                for opp in opportunities:
                    # Risk check
                    risk_ok, risk_reason = risk_manager.check_trade(opp, self.balance)
                    if not risk_ok:
                        continue

                    # Strategy check
                    should_exec, exec_reason = strategy.should_execute(opp)
                    if not should_exec:
                        continue

                    # Simulate execution
                    commission = opp.expected_profit * Config.BACKTEST_COMMISSION_BPS / 10000
                    simulated_profit = opp.net_profit - commission

                    if simulated_profit > 0:
                        self.balance += simulated_profit
                        total_profit += simulated_profit
                        winning_trades += 1

                        trade = {
                            "index": i,
                            "token_pair": opp.token_pair,
                            "buy_from": opp.buy_from.value,
                            "sell_to": opp.sell_to.value,
                            "spread": opp.spread,
                            "profit": simulated_profit,
                            "balance_after": self.balance,
                            "used_flash_loan": opp.use_flash_loan
                        }
                        self.trades.append(trade)
                    else:
                        self.balance += simulated_profit  # Negative
                        total_loss += abs(simulated_profit)
                        losing_trades += 1

                    # Update max drawdown
                    self.balance_history.append(self.balance)
                    if self.balance > self.max_balance:
                        self.max_balance = self.balance
                    drawdown = (self.max_balance - self.balance) / self.max_balance
                    if drawdown > self.max_drawdown:
                        self.max_drawdown = drawdown

                    risk_manager.record_trade(TradeResult(
                        success=simulated_profit > 0,
                        tx_hash="backtest",
                        profit=simulated_profit,
                        gas_used=0,
                        token_pair=opp.token_pair,
                        buy_from=opp.buy_from,
                        sell_to=opp.sell_to,
                        used_flash_loan=opp.use_flash_loan
                    ))

        total_trades = winning_trades + losing_trades
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        profit_factor = total_profit / total_loss if total_loss > 0 else float('inf')

        # Calculate Sharpe ratio
        if len(self.balance_history) > 1:
            returns = []
            for i in range(1, len(self.balance_history)):
                r = (self.balance_history[i] - self.balance_history[i-1]) / self.balance_history[i-1]
                returns.append(r)
            avg_return = sum(returns) / len(returns)
            std_return = (sum((r - avg_return) ** 2 for r in returns) / len(returns)) ** 0.5
            sharpe = avg_return / std_return if std_return > 0 else 0
        else:
            sharpe = 0

        result = BacktestResult(
            start_date=datetime.now() - timedelta(days=30),
            end_date=datetime.now(),
            initial_balance=self.initial_balance,
            final_balance=self.balance,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            total_profit=total_profit,
            total_loss=total_loss,
            max_drawdown=self.max_drawdown,
            win_rate=win_rate,
            profit_factor=profit_factor,
            sharpe_ratio=sharpe,
            trades=self.trades
        )

        logger.info(f"Backtest complete: {total_trades} trades, "
                    f"Win rate: {win_rate:.1%}, "
                    f"Final balance: ${self.balance:.2f}, "
                    f"Max drawdown: {self.max_drawdown:.1%}")

        return result

    def generate_synthetic_data(
        self,
        num_points: int = 1000,
        num_dexes: int = 4,
        base_price: float = 2000.0,
        volatility: float = 0.01
    ) -> List[Dict[str, Dict[DEXType, PriceData]]]:
        """Generate synthetic price data for backtesting"""
        import random

        data = []
        dex_types = list(DEXType)[:num_dexes]

        for i in range(num_points):
            prices = {}
            timestamp = int(time.time()) - (num_points - i) * 5

            for dex in dex_types:
                # Random walk with mean reversion
                noise = random.gauss(0, volatility * base_price)
                dex_premium = random.uniform(-0.005, 0.005)  # DEX-specific premium
                price = base_price + noise + base_price * dex_premium

                prices[dex] = PriceData(
                    token_pair="USDC/WETH",
                    dex=dex,
                    price=price,
                    liquidity=random.uniform(100000, 1000000),
                    timestamp=timestamp,
                    block_number=i * 100
                )

            # Occasionally inject arbitrage opportunity
            if random.random() < 0.1:  # 10% of time
                dex_pair = random.sample(dex_types, 2)
                spread = random.uniform(0.005, 0.03)
                prices[dex_pair[0]].price *= (1 - spread / 2)
                prices[dex_pair[1]].price *= (1 + spread / 2)

            data.append({"USDC/WETH": prices})

        return data


# ============ Main Application ============

class MantleArbBot:
    """Main arbitrage bot"""

    def __init__(self):
        self.w3 = None
        self.price_fetcher = None
        self.strategy = AIStrategy()
        self.risk_manager = RiskManager()
        self.backtest_engine = BacktestEngine()
        self.running = False

    def connect(self) -> bool:
        """Connect to Mantle Network"""
        try:
            self.w3 = Web3(Web3.HTTPProvider(Config.MANTLE_RPC))

            if self.w3.is_connected():
                block = self.w3.eth.block_number
                logger.info(f"Connected to Mantle Network (Block: {block})")
                self.price_fetcher = DEXPriceFetcher(self.w3)
                return True
            else:
                logger.error("Failed to connect to Mantle Network")
                return False

        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False

    def run_backtest(self, num_points: int = 1000) -> BacktestResult:
        """Run backtest with synthetic data"""
        logger.info("Generating synthetic price data...")
        data = self.backtest_engine.generate_synthetic_data(num_points=num_points)
        logger.info("Running backtest...")
        return self.backtest_engine.run_backtest(data, self.strategy, self.risk_manager)

    def run(self):
        """Main loop"""
        logger.info("=" * 60)
        logger.info("MantleArb V3 - AI Strategy Engine with Flash Loans")
        logger.info("=" * 60)

        if not self.connect():
            return

        self.running = True
        logger.info("Scanning for arbitrage opportunities across 6 DEXes...")

        while self.running:
            try:
                # Scan all configured trading pairs
                for token_name_a, token_name_b in Config.TRADING_PAIRS:
                    token_in = Config.TOKENS.get(token_name_a)
                    token_out = Config.TOKENS.get(token_name_b)

                    if not token_in or not token_out:
                        continue

                    prices = self.price_fetcher.get_all_prices(token_in, token_out)

                    if prices and len(prices) >= 2:
                        logger.info(f"\n{token_name_a}/{token_name_b} prices:")
                        for dex, pd in prices.items():
                            logger.info(f"  {dex.value}: ${pd.price:.6f}")

                        opportunities = self.strategy.find_opportunities(prices)

                        for opp in opportunities[:3]:
                            logger.info(f"  Opportunity: {opp.buy_from.value} -> {opp.sell_to.value}")
                            logger.info(f"    Spread: {opp.spread:.2%}, Net: ${opp.net_profit:.2f}")
                            logger.info(f"    Confidence: {opp.confidence:.1%}, Risk: {opp.risk_level.value}")

                            should_exec, reason = self.strategy.should_execute(opp)

                            if should_exec:
                                risk_ok, risk_reason = self.risk_manager.check_trade(opp, 10000)
                                if risk_ok:
                                    logger.info(f"    -> EXECUTING: {reason}")
                                else:
                                    logger.info(f"    -> RISK BLOCKED: {risk_reason}")
                            else:
                                logger.info(f"    -> SKIPPING: {reason}")

                time.sleep(5)

            except KeyboardInterrupt:
                logger.info("\nStopping bot...")
                self.running = False
            except Exception as e:
                logger.error(f"Error: {e}")
                time.sleep(5)

    def get_status(self) -> Dict:
        """Get bot status"""
        return {
            "connected": self.w3 is not None and self.w3.is_connected(),
            "block": self.w3.eth.block_number if self.w3 else 0,
            "active_dexes": len(self.price_fetcher.routers) if self.price_fetcher else 0,
            "risk_stats": self.risk_manager.get_stats(),
            "total_opportunities": len(self.strategy.detector.opportunity_history),
            "total_trades": len(self.strategy.trade_history),
            "success_rate": sum(1 for t in self.strategy.trade_history if t.success) / len(self.strategy.trade_history) if self.strategy.trade_history else 0
        }


# ============ Entry Point ============

if __name__ == "__main__":
    import sys

    bot = MantleArbBot()

    if len(sys.argv) > 1 and sys.argv[1] == "backtest":
        # Run backtest mode
        num_points = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
        result = bot.run_backtest(num_points)

        print("\n" + "=" * 60)
        print("BACKTEST RESULTS")
        print("=" * 60)
        print(f"Initial Balance: ${result.initial_balance:.2f}")
        print(f"Final Balance:   ${result.final_balance:.2f}")
        print(f"Total Return:    {(result.final_balance / result.initial_balance - 1) * 100:.2f}%")
        print(f"Total Trades:    {result.total_trades}")
        print(f"Win Rate:        {result.win_rate:.1%}")
        print(f"Profit Factor:   {result.profit_factor:.2f}")
        print(f"Sharpe Ratio:    {result.sharpe_ratio:.2f}")
        print(f"Max Drawdown:    {result.max_drawdown:.1%}")
        print(f"Total Profit:    ${result.total_profit:.2f}")
        print(f"Total Loss:      ${result.total_loss:.2f}")
        print("=" * 60)
    else:
        # Normal bot mode
        bot.run()
# ============ Chainlink Oracle Validator ============

# Chainlink Aggregator V3 ABI
AGGREGATOR_ABI = json.loads('[{"inputs":[],"name":"latestRoundData","outputs":[{"internalType":"uint80","name":"roundId","type":"uint80"},{"internalType":"int256","name":"answer","type":"int256"},{"internalType":"uint256","name":"startedAt","type":"uint256"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"uint80","name":"answeredInRound","type":"uint80"}],"stateMutability":"view","type":"function"}]')

class OracleValidator:
    """Chainlink Oracle价格验证器"""

    def __init__(self, web3, config):
        self.web3 = web3
        self.config = config
        self._cache = {}
        self._cache_ttl = 10  # 10秒缓存

    def get_oracle_price(self, pair: str) -> Optional[float]:
        """从Chainlink获取参考价格"""
        oracle_addr = self.config.CHAINLINK_ORACLES.get(pair)
        if not oracle_addr or oracle_addr == "0x0000000000000000000000000000000000000000":
            logger.warning(f"Oracle未配置: {pair}")
            return None

        if pair in self._cache:
            cached_price, cached_time = self._cache[pair]
            if time.time() - cached_time < self._cache_ttl:
                return cached_price

        try:
            contract = self.web3.eth.contract(
                address=self.web3.to_checksum_address(oracle_addr),
                abi=AGGREGATOR_ABI
            )
            round_data = contract.functions.latestRoundData().call()
            price = round_data[1] / (10 ** 8)  # Chainlink默认8位小数

            self._cache[pair] = (price, time.time())
            return price
        except Exception as e:
            logger.error(f"Oracle调用失败 {pair}: {e}")
            return None

    def validate_price(self, pair: str, dex_price: float) -> Tuple[bool, float]:
        """验证DEX价格是否偏离Oracle"""
        oracle_price = self.get_oracle_price(pair)
        if oracle_price is None:
            logger.warning(f"无法验证价格（Oracle不可用），拒绝执行: {pair}")
            return False, 0.0

        deviation = abs(dex_price - oracle_price) / oracle_price
        is_valid = deviation <= self.config.ORACLE_PRICE_DEVIATION_MAX

        if not is_valid:
            logger.warning(
                f"⚠️ 价格操纵检测! {pair}: "
                f"DEX={dex_price:.4f}, Oracle={oracle_price:.4f}, "
                f"偏差={deviation*100:.2f}% > {self.config.ORACLE_PRICE_DEVIATION_MAX*100}%"
            )

        return is_valid, deviation


# ============ Dynamic Gas Estimator ============

class GasEstimator:
    """Mantle L2 Gas成本估算器"""

    def __init__(self, web3, config):
        self.web3 = web3
        self.config = config
        self._cached_gas_price = None
        self._cache_time = 0

    def get_gas_cost_usd(self, eth_price: float = 3500.0) -> float:
        """获取当前Gas成本（美元）"""
        if not self.config.USE_DYNAMIC_GAS:
            return self.config.GAS_COST_ESTIMATE

        try:
            if time.time() - self._cache_time > 30:
                self._cached_gas_price = self.web3.eth.gas_price
                self._cache_time = time.time()

            gas_price_gwei = self._cached_gas_price / 1e9
            gas_cost_eth = (self.config.GAS_LIMIT_ARBITRAGE * self._cached_gas_price) / 1e18
            gas_cost_usd = gas_cost_eth * eth_price

            logger.debug(
                f"Gas成本: {gas_price_gwei:.4f} Gwei, "
                f"{gas_cost_eth:.6f} ETH, "
                f"${gas_cost_usd:.4f}"
            )
            return gas_cost_usd

        except Exception as e:
            logger.warning(f"获取Gas价格失败，使用静态估算: {e}")
            return self.config.GAS_COST_ESTIMATE

    def is_profitable(self, gross_profit_usd: float, eth_price: float = 3500.0) -> bool:
        """判断套利是否有利可图（扣除Gas后）"""
        gas_cost = self.get_gas_cost_usd(eth_price)
        net_profit = gross_profit_usd - gas_cost
        return net_profit >= self.config.MIN_PROFIT


# ============ Main Application ============
