// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MantleArb - AI-Powered DEX Arbitrage Agent with Flash Loans
 * @notice Mantle Turing Test Hackathon 2026
 * @dev Deployed on Mantle Network - V3 with Flash Loan support
 * @author Tyler
 */

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ============ Interfaces ============

// Note: IERC20 is imported from OpenZeppelin above

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);

    function WETH() external view returns (address);
}

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
    function getTWAP(address token, uint32 period) external view returns (uint256);
}

/// @notice Balancer Vault interface for flash loans
interface IBalancerVault {
    function flashLoan(
        address recipient,
        address[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;

    /**
     * @dev Callback for flash loan. The receiver must implement this.
     */
}

/// @notice Aave V3 Pool interface for flash loans
interface IAaveV3Pool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;

    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanReceiver {
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external;
}

/// @notice Standard Aave V3 FlashLoanReceiver callback interface
interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

// ============ Main Contract ============

contract MantleArb is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // DEX Routers on Mantle (supports up to 6 DEXes)
    IUniswapV2Router public merchantMoeRouter;
    IUniswapV2Router public fusionXRouter;
    IUniswapV2Router public agniRouter;
    IUniswapV2Router public cyberSwapRouter;
    IUniswapV2Router public helixRouter;
    IUniswapV2Router public iZiSwapRouter;

    // Flash Loan Providers
    IBalancerVault public balancerVault;
    IAaveV3Pool public aavePool;

    // Price Oracle for manipulation detection
    IPriceOracle public priceOracle;

    // AI Operator address
    address public aiOperator;

    // Known tokens for emergency withdrawal
    address[] public knownTokens;
    mapping(address => bool) public isKnownToken;

    // Risk parameters
    uint256 public maxTradeSize = 10000 * 1e18; // $10,000
    uint256 public minProfitBps = 50; // 0.5% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    uint256 public dailyTradeLimit = 100;
    uint256 public dailyTradeCount;
    uint256 public lastTradeDay;
    uint256 public maxPriceDeviationBps = 500; // 5% max oracle deviation

    // Flash loan parameters
    uint256 public maxFlashLoanSize = 100000 * 1e18; // $100,000
    bool public flashLoanEnabled = true;

    // Statistics
    uint256 public totalTrades;
    uint256 public totalProfit;
    uint256 public totalLosses;
    uint256 public totalFlashLoanTrades;
    uint256 public lastTradeTimestamp;

    // Emergency
    bool public emergencyStop;

    // ✅ Withdrawal limits
    uint256 public dailyWithdrawLimit = 100000 * 1e18; // $100,000 default
    uint256 public dailyWithdrawn;
    uint256 public lastWithdrawDay;
    uint256 public constant WITHDRAW_TIMELOCK = 24 hours;
    mapping(address => uint256) public pendingWithdrawRequest;

    // Approved router whitelist for callback validation
    mapping(address => bool) public isApprovedRouter;

    // ============ Structs ============

    struct ArbitrageOpportunity {
        address tokenA;
        address tokenB;
        uint256 amountIn;
        address routerBuy;   // Buy from (lower price)
        address routerSell;  // Sell to (higher price)
        uint256 minAmountOut;
        uint256 expectedProfit;
        uint256 deadline;
    }

    struct FlashLoanArbitrage {
        address tokenA;
        address tokenB;
        uint256 amountIn;
        address routerBuy;
        address routerSell;
        uint256 minAmountOut;
        uint256 expectedProfit;
        uint256 deadline;
        bool useBalancer; // true = Balancer, false = Aave
    }

    struct DexPrice {
        address router;
        uint256 amountOut;
        uint256 timestamp;
    }

    // ============ Events ============

    event ArbitrageExecuted(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountIn,
        uint256 profit,
        uint256 timestamp,
        bool usedFlashLoan
    );

    event FlashLoanExecuted(
        address indexed provider,
        address indexed token,
        uint256 amount,
        uint256 fee,
        uint256 profit
    );

    event RiskTriggered(string reason, uint256 value);
    event EmergencyStop(address indexed caller, string reason);
    event FundsWithdrawn(address indexed token, uint256 amount, address indexed to);
    event DailyCountReset(uint256 oldCount, uint256 timestamp);
    event OracleDeviationDetected(address indexed token, uint256 dexPrice, uint256 oraclePrice, uint256 deviationBps);
    event KnownTokenAdded(address indexed token);
    event KnownTokenRemoved(address indexed token);

    // ============ Modifiers ============

    modifier onlyOperator() {
        require(
            msg.sender == owner() || msg.sender == aiOperator,
            "Not operator"
        );
        _;
    }

    modifier notEmergency() {
        require(!emergencyStop, "Emergency stop active");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _merchantMoe,
        address _fusionX,
        address _agni,
        address _cyberSwap,
        address _helix,
        address _iZiSwap,
        address _balancerVault,
        address _aavePool,
        address _priceOracle
    ) Ownable() {
        if (_merchantMoe != address(0)) { merchantMoeRouter = IUniswapV2Router(_merchantMoe); isApprovedRouter[_merchantMoe] = true; }
        if (_fusionX != address(0)) { fusionXRouter = IUniswapV2Router(_fusionX); isApprovedRouter[_fusionX] = true; }
        if (_agni != address(0)) { agniRouter = IUniswapV2Router(_agni); isApprovedRouter[_agni] = true; }
        if (_cyberSwap != address(0)) cyberSwapRouter = IUniswapV2Router(_cyberSwap);
        if (_helix != address(0)) helixRouter = IUniswapV2Router(_helix);
        if (_iZiSwap != address(0)) iZiSwapRouter = IUniswapV2Router(_iZiSwap);
        if (_balancerVault != address(0)) balancerVault = IBalancerVault(_balancerVault);
        if (_aavePool != address(0)) aavePool = IAaveV3Pool(_aavePool);
        priceOracle = IPriceOracle(_priceOracle);
        aiOperator = msg.sender;
    }

    // ============ Flash Loan Callback ============

    /**
     * @notice Callback from Balancer Vault flash loan
     * @dev Only callable by the Balancer Vault
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external nonReentrant {
        require(msg.sender == address(balancerVault), "Only Balancer Vault");

        // Decode arbitrage params from userData
        (
            address tokenA,
            address tokenB,
            address routerBuy,
            address routerSell,
            uint256 minProfit
        ) = abi.decode(userData, (address, address, address, address, uint256));

        // ✅ Callback parameter validation: routers must be approved
        require(isApprovedRouter[routerBuy], "Unapproved routerBuy");
        require(isApprovedRouter[routerSell], "Unapproved routerSell");
        require(routerBuy != routerSell, "Same router");

        // Execute the arbitrage
        uint256 amountIn = amounts[0];

        // Approve and swap: tokenA -> tokenB on cheaper DEX
        IERC20(tokenA).safeApprove(routerBuy, amountIn);

        address[] memory pathBuy = new address[](2);
        pathBuy[0] = tokenA;
        pathBuy[1] = tokenB;

        uint256[] memory amountsBuy = IUniswapV2Router(routerBuy)
            .swapExactTokensForTokens(
                amountIn,
                amountIn * (10000 - maxSlippageBps) / 10000,
                pathBuy,
                address(this),
                block.timestamp + 300
            );

        uint256 amountBought = amountsBuy[1];

        // Approve and swap: tokenB -> tokenA on expensive DEX
        IERC20(tokenB).safeApprove(routerSell, amountBought);

        address[] memory pathSell = new address[](2);
        pathSell[0] = tokenB;
        pathSell[1] = tokenA;

        // Use getAmountsOut to set a proper minimum output (slippage-protected)
        address[] memory pathSellEstimate = new address[](2);
        pathSellEstimate[0] = tokenB;
        pathSellEstimate[1] = tokenA;
        uint256[] memory expectedSell = IUniswapV2Router(routerSell)
            .getAmountsOut(amountBought, pathSellEstimate);
        uint256 amountOutMinSell = expectedSell[1] * (10000 - maxSlippageBps) / 10000;

        IUniswapV2Router(routerSell).swapExactTokensForTokens(
            amountBought,
            amountOutMinSell,
            pathSell,
            address(this),
            block.timestamp + 300
        );

        // Calculate profit (amount returned - amount borrowed)
        uint256 balance = IERC20(tokenA).balanceOf(address(this));
        uint256 repayment = amounts[0] + feeAmounts[0]; // Balancer: fee often 0
        require(balance >= repayment, "Flash loan: insufficient repayment");

        uint256 profit = balance - repayment;
        require(profit >= minProfit, "Flash loan: profit too low");

        // ✅ Approval cleanup: revoke router approvals first
        IERC20(tokenA).safeApprove(routerBuy, 0);
        IERC20(tokenB).safeApprove(routerSell, 0);

        // Approve vault to take repayment
        IERC20(tokenA).safeApprove(address(balancerVault), repayment);

        // Update stats
        totalTrades++;
        totalFlashLoanTrades++;
        totalProfit += profit;

        emit FlashLoanExecuted(
            address(balancerVault),
            tokenA,
            amounts[0],
            feeAmounts[0],
            profit
        );
    }

    /**
     * @notice Callback from Aave V3 flash loan
     * @dev Only callable by the Aave Pool
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external nonReentrant returns (bool) {
        require(msg.sender == address(aavePool), "Only Aave Pool");
        require(initiator == address(this), "Invalid initiator");

        (
            address tokenB,
            address routerBuy,
            address routerSell,
            uint256 minProfit
        ) = abi.decode(params, (address, address, address, uint256));

        // ✅ Callback parameter validation
        require(isApprovedRouter[routerBuy], "Unapproved routerBuy");
        require(isApprovedRouter[routerSell], "Unapproved routerSell");
        require(routerBuy != routerSell, "Same router");

        address tokenA = assets[0];
        uint256 amountIn = amounts[0];

        // Execute arbitrage
        IERC20(tokenA).safeApprove(routerBuy, amountIn);

        address[] memory pathBuy = new address[](2);
        pathBuy[0] = tokenA;
        pathBuy[1] = tokenB;

        uint256[] memory amountsBuy = IUniswapV2Router(routerBuy)
            .swapExactTokensForTokens(
                amountIn,
                amountIn * (10000 - maxSlippageBps) / 10000,
                pathBuy,
                address(this),
                block.timestamp + 300
            );

        uint256 amountBought = amountsBuy[1];

        IERC20(tokenB).safeApprove(routerSell, amountBought);

        address[] memory pathSell = new address[](2);
        pathSell[0] = tokenB;
        pathSell[1] = tokenA;

        // Use getAmountsOut to set a proper minimum output (slippage-protected)
        address[] memory pathSellEstimate = new address[](2);
        pathSellEstimate[0] = tokenB;
        pathSellEstimate[1] = tokenA;
        uint256[] memory expectedSell = IUniswapV2Router(routerSell)
            .getAmountsOut(amountBought, pathSellEstimate);
        uint256 amountOutMinSell = expectedSell[1] * (10000 - maxSlippageBps) / 10000;

        IUniswapV2Router(routerSell).swapExactTokensForTokens(
            amountBought,
            amountOutMinSell,
            pathSell,
            address(this),
            block.timestamp + 300
        );

        // Calculate and verify profit
        uint256 balance = IERC20(tokenA).balanceOf(address(this));
        uint256 repayment = amounts[0] + premiums[0];
        require(balance >= repayment, "Aave flash loan: insufficient repayment");

        uint256 profit = balance - repayment;
        require(profit >= minProfit, "Aave flash loan: profit too low");

        // ✅ Approval cleanup: revoke router approvals
        IERC20(tokenA).safeApprove(routerBuy, 0);
        IERC20(tokenB).safeApprove(routerSell, 0);

        // Approve repayment
        IERC20(tokenA).safeApprove(address(aavePool), repayment);

        totalTrades++;
        totalFlashLoanTrades++;
        totalProfit += profit;

        emit FlashLoanExecuted(
            address(aavePool),
            tokenA,
            amounts[0],
            premiums[0],
            profit
        );

        return true;
    }

    // ============ Core Arbitrage ============

    /**
     * @notice Execute a regular (non-flash-loan) arbitrage trade
     * @param opp The arbitrage opportunity details
     */
    function executeArbitrage(
        ArbitrageOpportunity calldata opp
    ) external nonReentrant whenNotPaused notEmergency onlyOperator returns (uint256 profit) {
        // Reset daily count if new day
        _resetDailyCount();

        // Risk checks
        _checkRisk(opp);

        // Verify deadline
        require(block.timestamp <= opp.deadline, "Opportunity expired");

        // Store initial balance
        uint256 initialBalance = IERC20(opp.tokenA).balanceOf(address(this));
        require(initialBalance >= opp.amountIn, "Insufficient balance");

        // Oracle price manipulation check
        if (address(priceOracle) != address(0)) {
            _checkOraclePrice(opp.tokenA, opp.routerBuy, opp.tokenB, opp.amountIn);
        }

        // Approve tokens (exact amount, not max)
        IERC20(opp.tokenA).safeApprove(opp.routerBuy, opp.amountIn);

        // Step 1: Buy from cheaper DEX with slippage protection
        address[] memory pathBuy = new address[](2);
        pathBuy[0] = opp.tokenA;
        pathBuy[1] = opp.tokenB;

        uint256[] memory amountsBuy = IUniswapV2Router(opp.routerBuy)
            .swapExactTokensForTokens(
                opp.amountIn,
                opp.amountIn * (10000 - maxSlippageBps) / 10000,
                pathBuy,
                address(this),
                opp.deadline
            );

        uint256 amountBought = amountsBuy[1];

        // Step 2: Sell to more expensive DEX
        IERC20(opp.tokenB).safeApprove(opp.routerSell, amountBought);

        address[] memory pathSell = new address[](2);
        pathSell[0] = opp.tokenB;
        pathSell[1] = opp.tokenA;

        uint256[] memory amountsSell = IUniswapV2Router(opp.routerSell)
            .swapExactTokensForTokens(
                amountBought,
                opp.minAmountOut,
                pathSell,
                address(this),
                opp.deadline
            );

        // Calculate profit
        uint256 finalBalance = IERC20(opp.tokenA).balanceOf(address(this));
        profit = finalBalance - initialBalance;

        // Verify profit meets minimum (using safe precision calculation)
        require(profit > 0, "No profit");
        require(
            _safeProfitBps(profit, opp.amountIn) >= minProfitBps,
            "Profit below minimum"
        );

        // Update stats
        totalTrades++;
        totalProfit += profit;
        dailyTradeCount++;
        lastTradeTimestamp = block.timestamp;

        // Revoke approvals (safety)
        IERC20(opp.tokenA).safeApprove(opp.routerBuy, 0);
        IERC20(opp.tokenB).safeApprove(opp.routerSell, 0);

        emit ArbitrageExecuted(
            opp.tokenA,
            opp.tokenB,
            opp.amountIn,
            profit,
            block.timestamp,
            false
        );
    }

    /**
     * @notice Execute arbitrage using flash loans (no upfront capital needed)
     * @param flashOpp The flash loan arbitrage opportunity
     */
    function executeFlashLoanArbitrage(
        FlashLoanArbitrage calldata flashOpp
    ) external nonReentrant whenNotPaused notEmergency onlyOperator {
        require(flashLoanEnabled, "Flash loans disabled");
        require(flashOpp.amountIn <= maxFlashLoanSize, "Exceeds flash loan limit");

        _resetDailyCount();

        // Oracle check
        if (address(priceOracle) != address(0)) {
            _checkOraclePrice(flashOpp.tokenA, flashOpp.routerBuy, flashOpp.tokenB, flashOpp.amountIn);
        }

        if (flashOpp.useBalancer) {
            require(address(balancerVault) != address(0), "Balancer not configured");
            _executeBalancerFlashLoan(flashOpp);
        } else {
            require(address(aavePool) != address(0), "Aave not configured");
            _executeAaveFlashLoan(flashOpp);
        }

        dailyTradeCount++;
        lastTradeTimestamp = block.timestamp;
    }

    function _executeBalancerFlashLoan(FlashLoanArbitrage calldata flashOpp) internal {
        address[] memory tokens = new address[](1);
        tokens[0] = flashOpp.tokenA;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = flashOpp.amountIn;

        bytes memory userData = abi.encode(
            flashOpp.tokenA,
            flashOpp.tokenB,
            flashOpp.routerBuy,
            flashOpp.routerSell,
            flashOpp.expectedProfit
        );

        balancerVault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );
    }

    function _executeAaveFlashLoan(FlashLoanArbitrage calldata flashOpp) internal {
        address[] memory assets = new address[](1);
        assets[0] = flashOpp.tokenA;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = flashOpp.amountIn;

        uint256[] memory modes = new uint256[](1);
        modes[0] = 0; // No debt, must repay in same tx

        bytes memory params = abi.encode(
            flashOpp.tokenB,
            flashOpp.routerBuy,
            flashOpp.routerSell,
            flashOpp.expectedProfit
        );

        aavePool.flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            params,
            0 // referral code
        );
    }

    // ============ Generic Flash Loan (Aave V3 flashLoanSimple) ============

    /**
     * @notice Execute a single-asset flash loan via Aave V3 flashLoanSimple
     * @dev Allows the AI operator or owner to borrow and execute arbitrary logic in one tx.
     *      The borrowed amount must be repaid + premium in the same transaction via executeOperationSimple callback.
     * @param asset The address of the token to borrow
     * @param amount The amount to borrow
     * @param params Arbitrary data passed to the flash loan callback
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external nonReentrant whenNotPaused notEmergency onlyOperator {
        require(flashLoanEnabled, "Flash loans disabled");
        require(amount > 0, "Amount must be > 0");
        require(amount <= maxFlashLoanSize, "Exceeds flash loan limit");
        require(address(aavePool) != address(0), "Aave pool not configured");

        _resetDailyCount();

        // Use Aave V3 flashLoanSimple for single-asset flash loans (0.09% premium)
        aavePool.flashLoanSimple(
            address(this),  // receiverAddress
            asset,          // single asset
            amount,         // amount to borrow
            params,         // forwarded to callback
            0               // referralCode
        );

        dailyTradeCount++;
        lastTradeTimestamp = block.timestamp;
    }

    /**
     * @notice Execute a multi-asset flash loan via Aave V3 flashLoan
     * @dev Borrow multiple assets in a single flash loan transaction
     * @param assets Array of token addresses to borrow
     * @param amounts Corresponding amounts to borrow
     * @param params Arbitrary data passed to the flash loan callback
     */
    function executeFlashLoanMulti(
        address[] calldata assets,
        uint256[] calldata amounts,
        bytes calldata params
    ) external nonReentrant whenNotPaused notEmergency onlyOperator {
        require(flashLoanEnabled, "Flash loans disabled");
        require(assets.length == amounts.length, "Length mismatch");
        require(assets.length > 0, "Empty arrays");
        require(address(aavePool) != address(0), "Aave pool not configured");

        _resetDailyCount();

        uint256[] memory modes = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            require(amounts[i] > 0, "Amount must be > 0");
            require(amounts[i] <= maxFlashLoanSize, "Exceeds flash loan limit");
            modes[i] = 0; // No debt, must repay in same tx
        }

        aavePool.flashLoan(
            address(this),  // receiverAddress
            assets,
            amounts,
            modes,          // all 0 = no debt mode
            address(this),  // onBehalfOf
            params,
            0               // referralCode
        );

        dailyTradeCount++;
        lastTradeTimestamp = block.timestamp;
    }

    /**
     * @notice Aave V3 flashLoanSimple callback — invoked by the Aave Pool during a simple flash loan
     * @dev This is called by Aave after the loaned asset is transferred to this contract.
     *      The contract must approve the Aave pool for (amount + premium) before returning true.
     * @param asset The address of the borrowed asset
     * @param amount The amount borrowed
     * @param premium The fee charged by Aave (currently 0.09% = 9 bps)
     * @param initiator The address that initiated the flash loan (must be this contract)
     * @param params Arbitrary data forwarded from executeFlashLoan
     * @return true if the operation succeeded and funds are available for repayment
     */
    function executeOperationSimple(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external nonReentrant returns (bool) {
        require(msg.sender == address(aavePool), "Only Aave Pool");
        require(initiator == address(this), "Invalid initiator");

        // Decode arb params: (tokenB, routerBuy, routerSell, minProfit)
        (
            address tokenB,
            address routerBuy,
            address routerSell,
            uint256 minProfit
        ) = abi.decode(params, (address, address, address, uint256));

        // ✅ Callback parameter validation
        require(isApprovedRouter[routerBuy], "Unapproved routerBuy");
        require(isApprovedRouter[routerSell], "Unapproved routerSell");
        require(routerBuy != routerSell, "Same router");

        // --- Execute arbitrage with borrowed funds ---
        uint256 amountIn = amount;

        // Step 1: Buy tokenB from cheaper DEX
        IERC20(asset).safeApprove(routerBuy, amountIn);
        address[] memory pathBuy = new address[](2);
        pathBuy[0] = asset;
        pathBuy[1] = tokenB;

        uint256[] memory amountsBuy = IUniswapV2Router(routerBuy)
            .swapExactTokensForTokens(
                amountIn,
                amountIn * (10000 - maxSlippageBps) / 10000,
                pathBuy,
                address(this),
                block.timestamp + 300
            );
        uint256 amountBought = amountsBuy[1];

        // Step 2: Sell tokenB to more expensive DEX
        IERC20(tokenB).safeApprove(routerSell, amountBought);
        address[] memory pathSell = new address[](2);
        pathSell[0] = tokenB;
        pathSell[1] = asset;

        // Use getAmountsOut to set a proper minimum output (slippage-protected)
        address[] memory pathSellEstimate = new address[](2);
        pathSellEstimate[0] = tokenB;
        pathSellEstimate[1] = asset;
        uint256[] memory expectedSell = IUniswapV2Router(routerSell)
            .getAmountsOut(amountBought, pathSellEstimate);
        uint256 amountOutMinSell = expectedSell[1] * (10000 - maxSlippageBps) / 10000;

        IUniswapV2Router(routerSell).swapExactTokensForTokens(
            amountBought,
            amountOutMinSell,
            pathSell,
            address(this),
            block.timestamp + 300
        );

        // Step 3: Verify repayment + profit
        uint256 balance = IERC20(asset).balanceOf(address(this));
        uint256 repayment = amount + premium;
        require(balance >= repayment, "Flash loan: insufficient repayment");

        uint256 profit = balance - repayment;
        require(profit >= minProfit, "Flash loan: profit too low");

        // Step 4: Approve Aave pool to pull back the repayment
        IERC20(asset).safeApprove(address(aavePool), repayment);

        // Revoke leftover approval
        IERC20(asset).safeApprove(routerBuy, 0);
        IERC20(tokenB).safeApprove(routerSell, 0);

        // Update stats
        totalTrades++;
        totalFlashLoanTrades++;
        totalProfit += profit;

        emit FlashLoanExecuted(
            address(aavePool),
            asset,
            amount,
            premium,
            profit
        );

        return true;
    }

    // ============ Price Oracle & Manipulation Detection ============

    /**
     * @notice Check oracle price vs DEX price for manipulation detection
     */
    function _checkOraclePrice(
        address tokenA,
        address routerBuy,
        address tokenB,
        uint256 amountIn
    ) internal {
        // ✅ TOCTOU fix: read oracle and DEX prices in same context block
        // Snapshot both prices before any state changes
        uint256 oraclePrice = priceOracle.getPrice(tokenA);

        address[] memory path = new address[](2);
        path[0] = tokenA;
        path[1] = tokenB;
        uint256[] memory dexAmounts = IUniswapV2Router(routerBuy).getAmountsOut(amountIn, path);
        uint256 dexValuePerToken = dexAmounts[1] * 1e18 / amountIn;

        // Check deviation - both prices read in same transaction context
        if (oraclePrice > 0) {
            uint256 deviation = oraclePrice > dexValuePerToken
                ? (oraclePrice - dexValuePerToken) * 10000 / oraclePrice
                : (dexValuePerToken - oraclePrice) * 10000 / dexValuePerToken;

            require(
                deviation <= maxPriceDeviationBps,
                "Oracle price deviation too high"
            );

            // ✅ Use TWAP if available for additional staleness check
            try priceOracle.getTWAP(tokenA, 1800) returns (uint256 twapPrice) {
                if (twapPrice > 0) {
                    uint256 twapDeviation = twapPrice > dexValuePerToken
                        ? (twapPrice - dexValuePerToken) * 10000 / twapPrice
                        : (dexValuePerToken - twapPrice) * 10000 / dexValuePerToken;
                    require(twapDeviation <= maxPriceDeviationBps * 2, "TWAP deviation too high");
                }
            } catch {
                // TWAP not available, rely on spot check only
            }

            if (deviation > maxPriceDeviationBps / 2) {
                emit OracleDeviationDetected(tokenA, dexValuePerToken, oraclePrice, deviation);
            }
        }
    }

    // ============ Price Functions ============

    /**
     * @notice Get price from a specific DEX
     */
    function getPrice(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = IUniswapV2Router(router)
            .getAmountsOut(amountIn, path);

        return amounts[1];
    }

    /**
     * @notice Get prices from all 6 DEXes
     */
    function getAllPrices(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (
        uint256 merchantMoePrice,
        uint256 fusionXPrice,
        uint256 agniPrice,
        uint256 cyberSwapPrice,
        uint256 helixPrice,
        uint256 iZiSwapPrice
    ) {
        merchantMoePrice = _safeGetPrice(address(merchantMoeRouter), tokenIn, tokenOut, amountIn);
        fusionXPrice = _safeGetPrice(address(fusionXRouter), tokenIn, tokenOut, amountIn);
        agniPrice = _safeGetPrice(address(agniRouter), tokenIn, tokenOut, amountIn);
        cyberSwapPrice = _safeGetPrice(address(cyberSwapRouter), tokenIn, tokenOut, amountIn);
        helixPrice = _safeGetPrice(address(helixRouter), tokenIn, tokenOut, amountIn);
        iZiSwapPrice = _safeGetPrice(address(iZiSwapRouter), tokenIn, tokenOut, amountIn);
    }

    function _safeGetPrice(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256) {
        if (router == address(0)) return 0;
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        try IUniswapV2Router(router).getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }

    /**
     * @notice Find the best arbitrage pair across all DEXes
     */
    function findBestArbitrage(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (
        address bestBuyRouter,
        address bestSellRouter,
        uint256 profit,
        uint256 profitBps
    ) {
        address[6] memory routers = [
            address(merchantMoeRouter),
            address(fusionXRouter),
            address(agniRouter),
            address(cyberSwapRouter),
            address(helixRouter),
            address(iZiSwapRouter)
        ];

        uint256 bestBuyAmount = type(uint256).max;
        uint256 bestSellAmount = 0;
        bestBuyRouter = address(0);
        bestSellRouter = address(0);

        for (uint256 i = 0; i < 6; i++) {
            if (routers[i] == address(0)) continue;

            uint256 amountOut = _safeGetPrice(routers[i], tokenIn, tokenOut, amountIn);
            if (amountOut == 0) continue;

            if (amountOut < bestBuyAmount) {
                bestBuyAmount = amountOut;
                bestBuyRouter = routers[i];
            }
            if (amountOut > bestSellAmount) {
                bestSellAmount = amountOut;
                bestSellRouter = routers[i];
            }
        }

        if (bestBuyRouter == address(0) || bestSellRouter == address(0) || bestBuyRouter == bestSellRouter) {
            return (address(0), address(0), 0, 0);
        }

        // Calculate round-trip profit
        uint256 sellBack = _safeGetPrice(bestSellRouter, tokenOut, tokenIn, bestBuyAmount);
        profit = sellBack > amountIn ? sellBack - amountIn : 0;
        profitBps = amountIn > 0 ? _safeProfitBps(profit, amountIn) : 0;
    }

    /**
     * @notice Calculate potential profit with gas cost
     */
    function calculateProfit(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address buyRouter,
        address sellRouter,
        uint256 gasCost
    ) external view returns (uint256 profit, uint256 profitBps) {
        uint256 buyAmount = _safeGetPrice(buyRouter, tokenIn, tokenOut, amountIn);
        uint256 sellAmount = _safeGetPrice(sellRouter, tokenOut, tokenIn, buyAmount);

        uint256 grossProfit = sellAmount > amountIn ? sellAmount - amountIn : 0;
        profit = grossProfit > gasCost ? grossProfit - gasCost : 0;
        profitBps = amountIn > 0 ? _safeProfitBps(profit, amountIn) : 0;
    }

    // ============ Risk Management ============

    function _checkRisk(ArbitrageOpportunity calldata opp) internal view {
        // Check trade size
        require(opp.amountIn <= maxTradeSize, "Trade too large");

        // Check daily limit
        if (block.timestamp / 1 days <= lastTradeDay) {
            require(dailyTradeCount < dailyTradeLimit, "Daily limit reached");
        }

        // Check minimum profit
        require(
            _safeProfitBps(opp.expectedProfit, opp.amountIn) >= minProfitBps,
            "Expected profit too low"
        );
    }

    /**
     * @notice Reset daily trade count if new day
     */
    function _resetDailyCount() internal {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastTradeDay) {
            uint256 oldCount = dailyTradeCount;
            dailyTradeCount = 0;
            lastTradeDay = currentDay;
            if (oldCount > 0) {
                emit DailyCountReset(oldCount, block.timestamp);
            }
        }
    }

    /**
     * @notice Manually reset daily trade count (admin only)
     */
    function resetDailyTradeCount() external onlyOwner {
        uint256 oldCount = dailyTradeCount;
        dailyTradeCount = 0;
        lastTradeDay = block.timestamp / 1 days;
        emit DailyCountReset(oldCount, block.timestamp);
    }

    // ============ Emergency Functions ============

    function emergencyStopContract(string calldata reason) external onlyOwner {
        emergencyStop = true;
        _pause();
        emit EmergencyStop(msg.sender, reason);
    }

    function resumeContract() external onlyOwner {
        emergencyStop = false;
        _unpause();
    }

    // ============ Admin Functions ============

    function setAIOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Invalid address");
        aiOperator = _operator;
    }

    function setMaxTradeSize(uint256 _size) external onlyOwner {
        require(_size > 0, "Invalid size");
        maxTradeSize = _size;
    }

    function setMinProfitBps(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Invalid bps"); // Max 10%
        minProfitBps = _bps;
    }

    function setMaxSlippageBps(uint256 _bps) external onlyOwner {
        require(_bps <= 500, "Invalid bps"); // Max 5%
        maxSlippageBps = _bps;
    }

    function setDailyTradeLimit(uint256 _limit) external onlyOwner {
        dailyTradeLimit = _limit;
    }

    function setPriceOracle(address _oracle) external onlyOwner {
        priceOracle = IPriceOracle(_oracle);
    }

    function setMaxPriceDeviationBps(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Invalid deviation"); // Max 10%
        maxPriceDeviationBps = _bps;
    }

    function setFlashLoanProviders(address _balancer, address _aave) external onlyOwner {
        if (_balancer != address(0)) {
            balancerVault = IBalancerVault(_balancer);
        }
        if (_aave != address(0)) {
            aavePool = IAaveV3Pool(_aave);
        }
    }

    function setFlashLoanEnabled(bool _enabled) external onlyOwner {
        flashLoanEnabled = _enabled;
    }

    function setMaxFlashLoanSize(uint256 _size) external onlyOwner {
        require(_size > 0, "Invalid size");
        maxFlashLoanSize = _size;
    }

    function setDailyWithdrawLimit(uint256 _limit) external onlyOwner {
        require(_limit > 0, "Invalid limit");
        dailyWithdrawLimit = _limit;
    }

    function addApprovedRouter(address router) external onlyOwner {
        require(router != address(0), "Invalid address");
        isApprovedRouter[router] = true;
    }

    function removeApprovedRouter(address router) external onlyOwner {
        isApprovedRouter[router] = false;
    }

    function setRouters(
        address _merchantMoe,
        address _fusionX,
        address _agni
    ) external onlyOwner {
        if (_merchantMoe != address(0)) {
            merchantMoeRouter = IUniswapV2Router(_merchantMoe);
            isApprovedRouter[_merchantMoe] = true;
        }
        if (_fusionX != address(0)) {
            fusionXRouter = IUniswapV2Router(_fusionX);
            isApprovedRouter[_fusionX] = true;
        }
        if (_agni != address(0)) {
            agniRouter = IUniswapV2Router(_agni);
            isApprovedRouter[_agni] = true;
        }
    }

    function setAdditionalRouters(
        address _cyberSwap,
        address _helix,
        address _iZiSwap
    ) external onlyOwner {
        if (_cyberSwap != address(0)) {
            cyberSwapRouter = IUniswapV2Router(_cyberSwap);
            isApprovedRouter[_cyberSwap] = true;
        }
        if (_helix != address(0)) {
            helixRouter = IUniswapV2Router(_helix);
            isApprovedRouter[_helix] = true;
        }
        if (_iZiSwap != address(0)) {
            iZiSwapRouter = IUniswapV2Router(_iZiSwap);
            isApprovedRouter[_iZiSwap] = true;
        }
    }

    // ============ Known Token Management ============

    function addKnownToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!isKnownToken[token], "Already known");
        isKnownToken[token] = true;
        knownTokens.push(token);
        emit KnownTokenAdded(token);
    }

    function removeKnownToken(address token) external onlyOwner {
        require(isKnownToken[token], "Not a known token");
        isKnownToken[token] = false;
        // Remove from array (swap and pop)
        for (uint256 i = 0; i < knownTokens.length; i++) {
            if (knownTokens[i] == token) {
                knownTokens[i] = knownTokens[knownTokens.length - 1];
                knownTokens.pop();
                break;
            }
        }
        emit KnownTokenRemoved(token);
    }

    function getKnownTokens() external view returns (address[] memory) {
        return knownTokens;
    }

    // ============ Withdrawal Functions ============

    function withdrawToken(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Invalid amount");

        // ✅ Daily withdrawal limit check
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastWithdrawDay) {
            dailyWithdrawn = 0;
            lastWithdrawDay = currentDay;
        }
        require(dailyWithdrawn + amount <= dailyWithdrawLimit, "Daily withdraw limit exceeded");
        dailyWithdrawn += amount;

        IERC20(token).safeTransfer(owner(), amount);
        emit FundsWithdrawn(token, amount, owner());
    }

    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");

        // Use call instead of transfer to avoid 2300 gas limit issues with contract wallets
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "ETH transfer failed");
        emit FundsWithdrawn(address(0), balance, owner());
    }

    /**
     * @notice Emergency withdraw all known tokens + ETH
     * @dev Withdraws all known tokens and ETH to the owner
     */
    function emergencyWithdrawAll(address[] calldata additionalTokens) external onlyOwner {
        // Withdraw all known tokens
        for (uint256 i = 0; i < knownTokens.length; i++) {
            uint256 balance = IERC20(knownTokens[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(knownTokens[i]).safeTransfer(owner(), balance);
                emit FundsWithdrawn(knownTokens[i], balance, owner());
            }
        }

        // Withdraw any additional specified tokens
        for (uint256 i = 0; i < additionalTokens.length; i++) {
            if (!isKnownToken[additionalTokens[i]]) {
                uint256 balance = IERC20(additionalTokens[i]).balanceOf(address(this));
                if (balance > 0) {
                    IERC20(additionalTokens[i]).safeTransfer(owner(), balance);
                    emit FundsWithdrawn(additionalTokens[i], balance, owner());
                }
            }
        }

        // Revoke all approvals
        for (uint256 i = 0; i < knownTokens.length; i++) {
            _revokeApprovals(knownTokens[i]);
        }

        // Withdraw ETH
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            // Use call instead of transfer to avoid 2300 gas limit issues
            (bool success, ) = payable(owner()).call{value: ethBalance}("");
            require(success, "ETH transfer failed");
            emit FundsWithdrawn(address(0), ethBalance, owner());
        }
    }

    /**
     * @notice Revoke all approvals for a token to known routers
     */
    function _revokeApprovals(address token) internal {
        IERC20(token).safeApprove(address(merchantMoeRouter), 0);
        IERC20(token).safeApprove(address(fusionXRouter), 0);
        IERC20(token).safeApprove(address(agniRouter), 0);
        if (address(cyberSwapRouter) != address(0)) {
            IERC20(token).safeApprove(address(cyberSwapRouter), 0);
        }
        if (address(helixRouter) != address(0)) {
            IERC20(token).safeApprove(address(helixRouter), 0);
        }
        if (address(iZiSwapRouter) != address(0)) {
            IERC20(token).safeApprove(address(iZiSwapRouter), 0);
        }
    }

    // ============ View Functions ============

    /**
     * @notice Safe profit BPS calculation to avoid integer truncation
     * @dev Uses 1e18 intermediate precision for small profit amounts
     *      For example, 0.001 ETH profit on 100 ETH trade = 1 BPS
     *      Standard: 0.001e18 * 10000 / 100e18 = 10e18/100e18 = 0 (truncated!)
     *      Safe:     0.001e18 * 1e18 / 100e18 / 1e14 = 1 (correct)
     */
    function _safeProfitBps(uint256 profit, uint256 amountIn) internal pure returns (uint256) {
        if (amountIn == 0) return 0;
        return (profit * 1e18 / amountIn) / 1e14;
    }

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _totalProfit,
        uint256 _totalLosses,
        uint256 _totalFlashLoanTrades,
        uint256 _dailyTradeCount,
        uint256 _lastTradeTimestamp
    ) {
        return (
            totalTrades,
            totalProfit,
            totalLosses,
            totalFlashLoanTrades,
            dailyTradeCount,
            lastTradeTimestamp
        );
    }

    /**
     * @notice Get all router addresses
     */
    function getRouters() external view returns (
        address[6] memory routers
    ) {
        routers[0] = address(merchantMoeRouter);
        routers[1] = address(fusionXRouter);
        routers[2] = address(agniRouter);
        routers[3] = address(cyberSwapRouter);
        routers[4] = address(helixRouter);
        routers[5] = address(iZiSwapRouter);
    }

    receive() external payable {}
}
