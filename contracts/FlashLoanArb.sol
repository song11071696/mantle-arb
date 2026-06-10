// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IFlashLoanReceiver
 * @notice AAVE V3 flash loan receiver interface
 */
interface IFlashLoanReceiver {
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

/**
 * @title IPool
 * @notice AAVE V3 Pool interface
 */
interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;

    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

/**
 * @title IDexRouter
 * @notice Generic DEX router interface for swaps
 */
interface IDexRouter {
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
}

/**
 * @title FlashLoanArb
 * @notice AAVE V3 flash loan powered arbitrage contract
 * @dev Executes cross-DEX arbitrage using flash loans for capital
 */
contract FlashLoanArb is IFlashLoanReceiver, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── State ───────────────────────────────────────────────

    /// @notice AAVE V3 Pool address
    IPool public immutable aavePool;

    /// @notice Supported DEX routers
    mapping(address => bool) public approvedRouters;

    /// @notice Supported tokens
    mapping(address => bool) public approvedTokens;

    /// @notice Accumulated protocol profits
    uint256 public protocolProfits;

    /// @notice Protocol fee in basis points (100 = 1%)
    uint256 public protocolFeeBps = 100;

    /// @notice Minimum profit threshold in basis points
    uint256 public minProfitBps = 50; // 0.5%

    /// @notice Maximum single loan size per token
    mapping(address => uint256) public maxLoanSize;

    /// @notice Emergency withdraw timelock request
    mapping(address => uint256) public emergencyWithdrawRequest;

    /// @notice Emergency withdraw delay (24 hours)
    uint256 public constant EMERGENCY_DELAY = 24 hours;

    /// @notice Whether contract is paused
    bool public paused;

    /// @notice Total number of executed arbitrage trades
    uint256 public totalTrades;

    /// @notice Accumulated total profit
    uint256 public totalProfit;

    // ─── Events ──────────────────────────────────────────────

    event ArbitrageExecuted(
        address indexed token,
        uint256 loanAmount,
        uint256 profit,
        address routerA,
        address routerB
    );

    event RouterApproved(address indexed router, bool approved);
    event TokenApproved(address indexed token, bool approved);
    event ProfitWithdrawn(address indexed token, uint256 amount);
    event MaxLoanSizeSet(address indexed token, uint256 size);
    event MinProfitBpsSet(uint256 bps);
    event EmergencyWithdraw(address indexed token, uint256 amount);
    // ⬇️ 新增：时间锁相关事件
    event EmergencyWithdrawRequested(address indexed token, uint256 unlockTime);
    event EmergencyWithdrawCancelled(address indexed token);

    // ─── Modifiers ───────────────────────────────────────────

    modifier whenNotPaused() {
        require(!paused, "FlashLoanArb: paused");
        _;
    }

    modifier onlyApprovedRouter(address router) {
        require(approvedRouters[router], "FlashLoanArb: unapproved router");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────

    constructor(address _aavePool, address _owner) Ownable() {
        require(_aavePool != address(0), "FlashLoanArb: zero pool");
        require(_owner != address(0), "FlashLoanArb: zero owner");
        aavePool = IPool(_aavePool);
        if (_owner != msg.sender) {
            _transferOwnership(_owner);
        }
    }

    // ─── Admin Functions ─────────────────────────────────────

    function approveRouter(address router, bool approved) external onlyOwner {
        approvedRouters[router] = approved;
        emit RouterApproved(router, approved);
    }

    function approveToken(address token, bool approved) external onlyOwner {
        approvedTokens[token] = approved;
        emit TokenApproved(token, approved);
    }

    function setMaxLoanSize(address token, uint256 size) external onlyOwner {
        maxLoanSize[token] = size;
        emit MaxLoanSizeSet(token, size);
    }

    function setMinProfitBps(uint256 bps) external onlyOwner {
        require(bps <= 1000, "FlashLoanArb: bps too high"); // Max 10%
        minProfitBps = bps;
        emit MinProfitBpsSet(bps);
    }

    function setProtocolFee(uint256 bps) external onlyOwner {
        require(bps <= 500, "FlashLoanArb: fee too high"); // Max 5%
        protocolFeeBps = bps;
    }

    function pause(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function withdrawProfit(address token, uint256 amount) external onlyOwner {
        require(amount <= IERC20(token).balanceOf(address(this)), "FlashLoanArb: insufficient balance");
        IERC20(token).safeTransfer(owner(), amount);
        emit ProfitWithdrawn(token, amount);
    }

    /// @notice 请求紧急提取（第一步）
    function requestEmergencyWithdraw(address token) external onlyOwner {
        emergencyWithdrawRequest[token] = block.timestamp + EMERGENCY_DELAY;
        emit EmergencyWithdrawRequested(token, block.timestamp + EMERGENCY_DELAY);
    }

    /// @notice 执行紧急提取（第二步，需等待时间锁）
    function executeEmergencyWithdraw(address token) external onlyOwner {
        uint256 unlockTime = emergencyWithdrawRequest[token];
        require(unlockTime > 0, "FlashLoanArb: no pending request");
        require(block.timestamp >= unlockTime, "FlashLoanArb: timelock active");

        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "FlashLoanArb: zero balance");

        emergencyWithdrawRequest[token] = 0;
        IERC20(token).safeTransfer(owner(), balance);
        emit EmergencyWithdraw(token, balance);
    }

    /// @notice 取消紧急提取请求
    function cancelEmergencyWithdraw(address token) external onlyOwner {
        require(emergencyWithdrawRequest[token] > 0, "FlashLoanArb: no pending request");
        emergencyWithdrawRequest[token] = 0;
        emit EmergencyWithdrawCancelled(token);
    }

    // ─── Core Arbitrage ──────────────────────────────────────

    /**
     * @notice Execute arbitrage with single-asset flash loan
     * @param token Borrowed token address
     * @param amount Loan amount
     * @param routerA First DEX router (buy leg)
     * @param routerB Second DEX router (sell leg)
     * @param pathA Swap path for router A
     * @param pathB Swap path for router B
     * @param minProfit Minimum acceptable profit
     */
    function executeArbitrage(
        address token,
        uint256 amount,
        address routerA,
        address routerB,
        address[] calldata pathA,
        address[] calldata pathB,
        uint256 minProfit,
        uint256 minAmountOutA,   // ← 新增：第一腿最小输出量
        uint256 minAmountOutB    // ← 新增：第二腿最小输出量
    ) external whenNotPaused onlyApprovedRouter(routerA) onlyApprovedRouter(routerB) nonReentrant {
        require(approvedTokens[token], "FlashLoanArb: unapproved token");
        require(pathA.length >= 2, "FlashLoanArb: invalid pathA");
        require(pathB.length >= 2, "FlashLoanArb: invalid pathB");

        if (maxLoanSize[token] > 0) {
            require(amount <= maxLoanSize[token], "FlashLoanArb: exceeds max loan");
        }

        // 新增：将 minAmountOut 参数编码传入回调
        bytes memory params = abi.encode(routerA, routerB, pathA, pathB, minProfit, minAmountOutA, minAmountOutB);

        aavePool.flashLoanSimple(
            address(this),
            token,
            amount,
            params,
            0
        );
    }

    /**
     * @notice Execute arbitrage with multi-asset flash loan
     * @dev Borrow multiple tokens for complex arbitrage routes
     */
    function executeMultiAssetArbitrage(
        address[] calldata tokens,
        uint256[] calldata amounts,
        address[] calldata routers,
        bytes calldata routeData,
        uint256 minProfit
    ) external whenNotPaused nonReentrant {
        // ✅ 禁用未实现的功能
        revert("FlashLoanArb: multi-asset not implemented, use executeArbitrage instead");
    }

    // ─── AAVE Callback ───────────────────────────────────────

    /**
     * @notice AAVE flash loan callback
     * @dev Called by AAVE Pool after loan is received
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override nonReentrant returns (bool) {
        require(msg.sender == address(aavePool), "FlashLoanArb: caller must be pool");
        require(initiator == address(this), "FlashLoanArb: invalid initiator");
        // ✅ 新增数组长度校验
        require(assets.length == amounts.length, "FlashLoanArb: length mismatch");
        require(assets.length == premiums.length, "FlashLoanArb: premium mismatch");
        require(assets.length > 0, "FlashLoanArb: empty arrays");

        if (assets.length == 1) {
            // Single-asset arbitrage
            _executeSingleAssetOp(assets[0], amounts[0], premiums[0], params);
        } else {
            // Multi-asset arbitrage
            _executeMultiAssetOp(assets, amounts, premiums, params);
        }

        return true;
    }

    /**
     * @dev Execute single-asset arbitrage callback
     */
    function _executeSingleAssetOp(
        address token,
        uint256 amount,
        uint256 premium,
        bytes calldata params
    ) internal {
        (
            address routerA,
            address routerB,
            address[] memory pathA,
            address[] memory pathB,
            uint256 minProfit,
            uint256 minAmountOutA,   // ← 新增
            uint256 minAmountOutB    // ← 新增
        ) = abi.decode(params, (address, address, address[], address[], uint256, uint256, uint256));

        // ✅ Validate decoded parameters
        require(approvedRouters[routerA], "FlashLoanArb: unapproved routerA in callback");
        require(approvedRouters[routerB], "FlashLoanArb: unapproved routerB in callback");
        require(routerA != routerB, "FlashLoanArb: same router");

        // Step 1: Swap on routerA (token -> intermediate)
        IERC20(token).forceApprove(routerA, amount);
        uint256 intermediateAmount = IDexRouter(routerA).swapExactTokensForTokens(
            amount,
            minAmountOutA,  // ✅ 链下预计算的最小输出量
            pathA,
            address(this),
            block.timestamp + 300
        )[pathA.length - 1];

        // Step 2: Swap back on routerB (intermediate -> token)
        address intermediateToken = pathA[pathA.length - 1];
        IERC20(intermediateToken).forceApprove(routerB, intermediateAmount);
        uint256 finalAmount = IDexRouter(routerB).swapExactTokensForTokens(
            intermediateAmount,
            minAmountOutB,  // ✅ 链下预计算的最小输出量
            pathB,
            address(this),
            block.timestamp + 300
        )[pathB.length - 1];

        // Step 2.5: 清理剩余授权（联动修改7）
        IERC20(token).forceApprove(routerA, 0);
        IERC20(intermediateToken).forceApprove(routerB, 0);

        // Step 3: Verify repayment and profit
        uint256 repayment = amount + premium;
        require(finalAmount >= repayment, "FlashLoanArb: insufficient return");

        uint256 profit = finalAmount - repayment;

        // Apply minimum profit check (in bps)
        uint256 minProfitAmount = (amount * minProfitBps) / 10000;
        if (minProfit > minProfitAmount) {
            minProfitAmount = minProfit;
        }
        require(profit >= minProfitAmount, "FlashLoanArb: profit below threshold");

        // Take protocol fee
        uint256 fee = (profit * protocolFeeBps) / 10000;
        protocolProfits += fee;

        // Approve repayment to pool
        IERC20(token).forceApprove(address(aavePool), repayment);

        // Update stats
        totalTrades++;
        totalProfit += profit;

        emit ArbitrageExecuted(token, amount, profit, routerA, routerB);
    }

    /**
     * @dev Execute multi-asset arbitrage callback
     */
    function _executeMultiAssetOp(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        bytes calldata params
    ) internal {
        (address[] memory routers, bytes memory routeData, uint256 minProfit) =
            abi.decode(params, (address[], bytes, uint256));

        // Execute custom routing logic
        uint256 arbProfit = 0;
        uint256 totalRepayment = 0;

        for (uint256 i = 0; i < assets.length; i++) {
            uint256 repayment = amounts[i] + premiums[i];
            totalRepayment += repayment;

            // Approve repayment
            IERC20(assets[i]).forceApprove(address(aavePool), repayment);
        }

        // Verify overall profitability
        uint256 totalBalance = 0;
        for (uint256 i = 0; i < assets.length; i++) {
            totalBalance += IERC20(assets[i]).balanceOf(address(this));
        }

        require(totalBalance >= totalRepayment + minProfit, "FlashLoanArb: multi-asset unprofitable");

        totalTrades++;
        totalProfit += (totalBalance - totalRepayment);

        emit ArbitrageExecuted(assets[0], amounts[0], totalBalance - totalRepayment, routers[0], address(0));
    }

    // ─── View Functions ──────────────────────────────────────

    /**
     * @notice Check if an arbitrage opportunity is profitable
     */
    function estimateProfit(
        address token,
        uint256 amount,
        address routerA,
        address routerB,
        address[] calldata pathA,
        address[] calldata pathB
    ) external view returns (uint256 estimatedProfit, bool profitable) {
        try IDexRouter(routerA).getAmountsOut(amount, pathA) returns (uint256[] memory amountsA) {
            uint256 intermediateAmount = amountsA[amountsA.length - 1];
            try IDexRouter(routerB).getAmountsOut(intermediateAmount, pathB) returns (uint256[] memory amountsB) {
                uint256 finalAmount = amountsB[amountsB.length - 1];
                uint256 premium = (amount * 9) / 10000; // AAVE 0.09% fee
                uint256 repayment = amount + premium;

                if (finalAmount > repayment) {
                    estimatedProfit = finalAmount - repayment;
                    profitable = estimatedProfit >= (amount * minProfitBps) / 10000;
                }
            } catch {
                return (0, false);
            }
        } catch {
            return (0, false);
        }
    }

    /**
     * @notice Get contract token balance
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
