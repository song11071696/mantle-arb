// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MockERC20.sol";

/// @notice Mock Aave V3 Pool compatible with FlashLoanArb.sol
contract MockAaveV3PoolForFlashLoanArb {
    uint256 public premiumBps = 9; // 0.09%

    function setPremiumBps(uint256 _premiumBps) external {
        premiumBps = _premiumBps;
    }

    /// @notice Flash loan simple - calls receiver's executeOperation (multi-asset signature)
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

        // Build arrays for the multi-asset callback signature
        address[] memory assets = new address[](1);
        assets[0] = asset;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        uint256[] memory premiums = new uint256[](1);
        premiums[0] = premium;

        // Call receiver's executeOperation
        (bool success, bytes memory returnData) = receiverAddress.call(
            abi.encodeWithSignature(
                "executeOperation(address[],uint256[],uint256[],address,bytes)",
                assets,
                amounts,
                premiums,
                receiverAddress,
                params
            )
        );
        require(success, "Flash loan operation failed");

        // Check return value
        if (returnData.length > 0) {
            require(abi.decode(returnData, (bool)), "Flash loan returned false");
        }

        // Verify repayment
        uint256 balance = MockERC20(asset).balanceOf(address(this));
        require(balance >= amount + premium, "Aave: insufficient repayment");
    }

    /// @notice Flash loan multi-asset
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

        (bool success, bytes memory returnData) = receiverAddress.call(
            abi.encodeWithSignature(
                "executeOperation(address[],uint256[],uint256[],address,bytes)",
                assets,
                amounts,
                premiums,
                receiverAddress,
                params
            )
        );
        require(success, "Flash loan operation failed");

        if (returnData.length > 0) {
            require(abi.decode(returnData, (bool)), "Flash loan returned false");
        }

        // Verify repayment
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = MockERC20(assets[i]).balanceOf(address(this));
            require(balance >= amounts[i] + premiums[i], "Aave: insufficient repayment");
        }
    }
}
