// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MockERC20.sol";

/// @notice Mock Uniswap V2 Router for testing
/// @dev Configurable exchange rates to simulate different DEX prices
contract MockRouter {
    // tokenOut per tokenIn rate (scaled by 1e18)
    mapping(address => mapping(address => uint256)) public exchangeRates;
    
    // Slippage factor in bps (e.g., 50 = 0.5%)
    uint256 public slippageBps = 50;
    
    address public WETH;
    
    constructor(address _weth) {
        WETH = _weth;
    }
    
    /// @notice Set the exchange rate for a token pair
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param rate Amount of tokenOut per 1e18 of tokenIn
    function setExchangeRate(address tokenIn, address tokenOut, uint256 rate) external {
        exchangeRates[tokenIn][tokenOut] = rate;
    }
    
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        require(path.length == 2, "Invalid path");
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        
        uint256 rate = exchangeRates[path[0]][path[1]];
        require(rate > 0, "No liquidity");
        
        amounts[1] = amountIn * rate / 1e18;
    }
    
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external returns (uint256[] memory amounts) {
        require(path.length == 2, "Invalid path");
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        
        uint256 rate = exchangeRates[path[0]][path[1]];
        require(rate > 0, "No liquidity");
        
        uint256 amountOut = amountIn * rate / 1e18;
        require(amountOut >= amountOutMin, "Insufficient output amount");
        
        amounts[1] = amountOut;
        
        // Transfer tokens
        MockERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        MockERC20(path[1]).transfer(to, amountOut);
    }
}
