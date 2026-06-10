// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MockERC20.sol";

interface IFlashLoanReceiver {
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external;
}

/// @notice Mock Balancer Vault for testing flash loans
contract MockBalancerVault {
    uint256 public flashLoanFeeBps = 0; // Balancer has 0 fees
    
    function setFlashLoanFeeBps(uint256 _feeBps) external {
        flashLoanFeeBps = _feeBps;
    }
    
    function flashLoan(
        address recipient,
        address[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external {
        // Transfer tokens to recipient
        for (uint256 i = 0; i < tokens.length; i++) {
            MockERC20(tokens[i]).transfer(recipient, amounts[i]);
        }
        
        // Calculate fees
        uint256[] memory feeAmounts = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            feeAmounts[i] = amounts[i] * flashLoanFeeBps / 10000;
        }
        
        // Call the receiver
        IFlashLoanReceiver(recipient).receiveFlashLoan(
            tokens,
            amounts,
            feeAmounts,
            userData
        );
        
        // Verify repayment
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = MockERC20(tokens[i]).balanceOf(address(this));
            require(balance >= amounts[i], "Balancer: insufficient repayment");
        }
    }
}
