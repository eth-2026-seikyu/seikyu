// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Faucet-style mock USDC used across demo and tests. Six decimals,
/// like real USDC, and a public mint capped per-call so the faucet can't be
/// used to grief the demo.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) public {
        require(amount <= 1_000_000e6);
        _mint(to, amount);
    }
}
