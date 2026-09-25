// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console2} from "forge-std/Script.sol";

import {MockUSDC} from "../src/MockUSDC.sol";

/// @notice Funds the demo accounts: gas ETH from the deployer and mUSDC for the investors and the debtor.
/// @dev Needs `.mockUsdc` from `Deploy`. Env: DEPLOYER_PRIVATE_KEY, SME_ADDRESS, OPERATOR_ADDRESS, INVESTOR_A,
///      INVESTOR_A2, DEBTOR_ADDRESS, DEBTOR_AP_ADDRESS, optional DEPLOYMENTS_JSON (required off Sepolia).
contract Seed is Script {
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 internal constant SME_ETH = 0.2 ether;
    uint256 internal constant ACTOR_ETH = 0.05 ether;
    uint256 internal constant USDC_GRANT = 100_000e6;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address sme = vm.envAddress("SME_ADDRESS");
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        address investorA = vm.envAddress("INVESTOR_A");
        address investorA2 = vm.envAddress("INVESTOR_A2");
        address debtor = vm.envAddress("DEBTOR_ADDRESS");
        address debtorAP = vm.envAddress("DEBTOR_AP_ADDRESS");

        MockUSDC usdc = MockUSDC(vm.parseJsonAddress(vm.readFile(_deploymentsPath()), ".mockUsdc"));
        require(address(usdc).code.length > 0, "Seed: .mockUsdc not deployed; run Deploy first");

        vm.startBroadcast(pk);
        _sendEth(sme, SME_ETH);
        _sendEth(operator, ACTOR_ETH);
        _sendEth(investorA, ACTOR_ETH);
        _sendEth(investorA2, ACTOR_ETH);
        _sendEth(debtor, ACTOR_ETH);
        _sendEth(debtorAP, ACTOR_ETH);
        usdc.mint(investorA, USDC_GRANT);
        usdc.mint(investorA2, USDC_GRANT);
        usdc.mint(debtor, USDC_GRANT);
        vm.stopBroadcast();

        console2.log("minted 100,000 mUSDC to investorA, investorA2, debtor");
        console2.log("mockUsdc        :", address(usdc));
    }

    /// @dev Skips accounts that already hold `amount`, so a re-run does not send ETH twice.
    function _sendEth(address to, uint256 amount) internal {
        if (to.balance >= amount) {
            console2.log("skip ETH, already funded:", to);
            return;
        }
        (bool ok,) = payable(to).call{value: amount}("");
        require(ok, "Seed: ETH transfer failed");
        console2.log("sent ETH (wei)  :", to, amount);
    }

    /// @dev Defaults to deployments/sepolia.json, which is only allowed on Sepolia so fork runs never overwrite it.
    function _deploymentsPath() internal view returns (string memory path) {
        path = vm.envOr("DEPLOYMENTS_JSON", string(""));
        if (bytes(path).length == 0) {
            require(block.chainid == SEPOLIA_CHAIN_ID, "set DEPLOYMENTS_JSON to a scratch copy when not on Sepolia");
            path = string.concat(vm.projectRoot(), "/deployments/sepolia.json");
        }
    }
}
