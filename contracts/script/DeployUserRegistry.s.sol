// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console2} from "forge-std/Script.sol";

import {Grant, RegistryRoles} from "../src/interfaces/ens/EnsV2Types.sol";
import {IUserRegistry} from "../src/interfaces/ens/IUserRegistry.sol";
import {IVerifiableFactory} from "../src/interfaces/ens/IVerifiableFactory.sol";

/// @notice E2: deploys our UserRegistry proxy through the ENSv2 VerifiableFactory and records it as `.userRegistry`.
/// @dev Must run before `RegisterParent`, because the parent commitment binds `subregistry = userRegistry`.
///      Env: DEPLOYER_PRIVATE_KEY, optional DEPLOYER_ADDRESS (cross-check), optional DEPLOYMENTS_JSON (required off Sepolia).
contract DeployUserRegistry is Script {
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 internal constant SALT = uint256(keccak256("seikyu-user-registry-v1"));

    function run() external returns (IUserRegistry registry) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        if (vm.envExists("DEPLOYER_ADDRESS")) {
            require(vm.envAddress("DEPLOYER_ADDRESS") == deployer, "DeployUserRegistry: DEPLOYER_ADDRESS != key");
        }

        string memory path = _deploymentsPath();
        string memory json = vm.readFile(path);
        IVerifiableFactory factory = IVerifiableFactory(vm.parseJsonAddress(json, ".verifiableFactory"));
        address impl = vm.parseJsonAddress(json, ".userRegistryImpl");
        address existing = vm.parseJsonAddress(json, ".userRegistry");
        require(existing.code.length == 0, "DeployUserRegistry: .userRegistry already deployed; clear it to redeploy");
        require(address(factory).code.length > 0 && impl.code.length > 0, "DeployUserRegistry: ENSv2 contracts missing");

        Grant[] memory grants = new Grant[](1);
        grants[0] = Grant({account: deployer, roleBitmap: RegistryRoles.DEPLOYER_ADMIN_ONLY});

        vm.startBroadcast(pk);
        registry = IUserRegistry(factory.deployProxy(impl, SALT, abi.encodeCall(IUserRegistry.initialize, (grants))));
        vm.stopBroadcast();

        require(factory.verifyContract(address(registry)) == impl, "DeployUserRegistry: proxy impl mismatch");
        require(
            registry.roles(0, deployer) == RegistryRoles.DEPLOYER_ADMIN_ONLY,
            "DeployUserRegistry: deployer root roles != DEPLOYER_ADMIN_ONLY"
        );

        vm.writeJson(vm.toString(address(registry)), path, ".userRegistry");
        console2.log("deployer     ", deployer);
        console2.log("userRegistry ", address(registry));
        console2.log("written to   ", path);
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
