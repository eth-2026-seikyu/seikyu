// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {InvoiceMarket} from "../src/InvoiceMarket.sol";
import {InvoiceRegistrar} from "../src/InvoiceRegistrar.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {RegistryRoles} from "../src/interfaces/ens/EnsV2Types.sol";
import {IUserRegistry} from "../src/interfaces/ens/IUserRegistry.sol";
import {IVerifiableFactory} from "../src/interfaces/ens/IVerifiableFactory.sol";

/// @notice E3/E4: deploys MockUSDC, InvoiceRegistrar and InvoiceMarket, gives the registrar its root roles on our
///         UserRegistry and wires the market into the registrar.
/// @dev Needs `.userRegistry` and `.parentName` from `DeployUserRegistry` + `RegisterParent`.
///      Env: DEPLOYER_PRIVATE_KEY, OPERATOR_ADDRESS, PARENT_LABEL, optional DEPLOYMENTS_JSON (required off Sepolia).
contract Deploy is Script {
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 internal constant MAX_OPEN_POSITIONS = 3;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        string memory parentLabel = vm.envString("PARENT_LABEL");

        string memory path = _deploymentsPath();
        string memory json = vm.readFile(path);
        IUserRegistry registry = IUserRegistry(vm.parseJsonAddress(json, ".userRegistry"));
        IVerifiableFactory factory = IVerifiableFactory(vm.parseJsonAddress(json, ".verifiableFactory"));
        address resolverImpl = vm.parseJsonAddress(json, ".permissionedResolverImpl");
        require(
            keccak256(bytes(vm.parseJsonString(json, ".parentName")))
                == keccak256(bytes(string.concat(parentLabel, ".eth"))),
            "Deploy: PARENT_LABEL does not match .parentName; run RegisterParent first"
        );
        require(address(registry).code.length > 0, "Deploy: .userRegistry not deployed");
        require(vm.parseJsonAddress(json, ".invoiceMarket").code.length == 0, "Deploy: .invoiceMarket already deployed");
        require(
            registry.hasRootRoles(RegistryRoles.DEPLOYER_ADMIN_ONLY, deployer), "Deploy: deployer lacks registry admin"
        );

        vm.startBroadcast(pk);
        MockUSDC usdc = new MockUSDC();
        InvoiceRegistrar registrar = new InvoiceRegistrar(registry, factory, resolverImpl, parentLabel, deployer);
        InvoiceMarket market = new InvoiceMarket(IERC20(address(usdc)), registrar, MAX_OPEN_POSITIONS, operator);
        registry.grantRootRoles(RegistryRoles.REGISTRAR_ROOT, address(registrar));
        registrar.setMarket(address(market));
        vm.stopBroadcast();

        require(registry.hasRootRoles(RegistryRoles.REGISTRAR_ROOT, address(registrar)), "Deploy: registrar roles");
        require(registrar.market() == address(market), "Deploy: market not wired");

        vm.writeJson(vm.toString(address(registrar)), path, ".invoiceRegistrar");
        vm.writeJson(vm.toString(address(market)), path, ".invoiceMarket");
        vm.writeJson(vm.toString(address(usdc)), path, ".mockUsdc");
        // Simulation runs at the latest block, so this is a safe lower bound for log queries.
        vm.writeJson(vm.toString(block.number), path, ".deployBlock");
        console2.log("mockUsdc         ", address(usdc));
        console2.log("invoiceRegistrar ", address(registrar));
        console2.log("invoiceMarket    ", address(market));
        console2.log("deployBlock      ", block.number);
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
