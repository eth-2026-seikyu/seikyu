// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console2} from "forge-std/Script.sol";

import {RegistryRoles} from "../src/interfaces/ens/EnsV2Types.sol";
import {IUserRegistry} from "../src/interfaces/ens/IUserRegistry.sol";

/// @notice Drops every root role the deployer holds on our UserRegistry, leaving InvoiceRegistrar as the only
///         account that can register, renew or unregister invoice names. Irreversible.
/// @dev Needs `.userRegistry` and `.invoiceRegistrar`. Env: DEPLOYER_PRIVATE_KEY, optional DEPLOYMENTS_JSON.
contract Harden is Script {
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        string memory json = vm.readFile(_deploymentsPath());
        IUserRegistry registry = IUserRegistry(vm.parseJsonAddress(json, ".userRegistry"));
        address registrar = vm.parseJsonAddress(json, ".invoiceRegistrar");
        require(address(registry).code.length > 0, "Harden: .userRegistry not deployed");
        // Once the deployer's admin bits are gone nobody can grant these again.
        require(
            registry.hasRootRoles(RegistryRoles.REGISTRAR_ROOT, registrar), "Harden: registrar lacks REGISTRAR_ROOT"
        );

        uint256 held = registry.roles(0, deployer);
        console2.log("deployer                   :", deployer);
        console2.log("roles(0, deployer) before  :", held);
        if (held == 0) {
            console2.log("deployer holds no root roles; nothing to revoke");
            return;
        }

        vm.broadcast(pk);
        registry.revokeRootRoles(held, deployer);

        uint256 remaining = registry.roles(0, deployer);
        console2.log("roles(0, deployer) after   :", remaining);
        require(remaining == 0, "Harden: deployer still holds root roles");
        require(registry.hasRootRoles(RegistryRoles.REGISTRAR_ROOT, registrar), "Harden: registrar lost REGISTRAR_ROOT");
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
