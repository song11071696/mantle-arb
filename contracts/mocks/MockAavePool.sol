// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MockERC20.sol";

/// @notice Callback interface matching MantleArb.executeOperationSimple
interface IMantleArbSimple {
    function executeOperationSimple(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

/// @notice Callback interface matching MantleArb.executeOperation (multi-asset)
interface IMantleArbMulti {
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

/// @notice Mock Aave V3 Pool for testing flash loans
contract MockAavePool {
    uint256 public premiumBps = 9; // 0.09% = 9 bps

    function setPremiumBps(uint256 _premiumBps) external {
        premiumBps = _premiumBps;
    }

    /// @notice Flash loan simple — calls MantleArb.executeOperationSimple
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 /* referralCode */
    ) external {
        uint256 premium = amount * premiumBps / 10000;

        // Transfer asset to receiver
        MockERC20(asset).transfer(receiverAddress, amount);

        // Call receiver's executeOperationSimple
        bool success = IMantleArbSimple(receiverAddress).executeOperationSimple(
            asset,
            amount,
            premium,
            receiverAddress,
            params
        );
        require(success, "Flash loan operation failed");

        // Verify repayment
        uint256 balance = MockERC20(asset).balanceOf(address(this));
        require(balance >= amount + premium, "Aave: insufficient repayment");
    }

    /// @notice Flash loan multi-asset — calls MantleArb.executeOperation
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata /* interestRateModes */,
        address /* onBehalfOf */,
        bytes calldata params,
        uint16 /* referralCode */
    ) external {
        uint256[] memory premiums = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            premiums[i] = amounts[i] * premiumBps / 10000;
            MockERC20(assets[i]).transfer(receiverAddress, amounts[i]);
        }

        // Call receiver's executeOperation (multi-asset)
        bool success = IMantleArbMulti(receiverAddress).executeOperation(
            assets,
            amounts,
            premiums,
            receiverAddress,
            params
        );
        require(success, "Flash loan operation failed");

        // Verify repayment
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = MockERC20(assets[i]).balanceOf(address(this));
            require(balance >= amounts[i] + premiums[i], "Aave: insufficient repayment");
        }
    }
}
