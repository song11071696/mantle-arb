// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Mock price oracle for testing price manipulation detection
contract MockPriceOracle {
    mapping(address => uint256) public prices;
    
    function setPrice(address token, uint256 price) external {
        prices[token] = price;
    }
    
    function getPrice(address token) external view returns (uint256) {
        return prices[token];
    }
    
    function getTWAP(address token, uint32 /* period */) external view returns (uint256) {
        return prices[token];
    }
}
