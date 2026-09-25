// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IETHRegistrar} from "../src/interfaces/ens/IETHRegistrar.sol";
import {IUserRegistry} from "../src/interfaces/ens/IUserRegistry.sol";

/// @dev ENS testnet MockUSDC (6 decimals, open mint).
interface IMintableERC20 is IERC20 {
    function mint(address to, uint256 amount) external;
}

/// @notice E1: registers `<PARENT_LABEL>.eth` on ENSv2 with our UserRegistry as its subregistry.
/// @dev Run `commit()`, wait at least MIN_COMMITMENT_AGE (60 s), run `register()`, then `verify()` (no broadcast).
///      Env: DEPLOYER_PRIVATE_KEY, PARENT_LABEL, PARENT_SECRET (bytes32), optional DEPLOYMENTS_JSON (required off Sepolia).
///      `.userRegistry` must already be written by `DeployUserRegistry`.
contract RegisterParent is Script {
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;
    uint64 internal constant DURATION = 365 days;

    struct Ctx {
        uint256 pk;
        address deployer;
        string label;
        bytes32 secret;
        string path;
        IETHRegistrar registrar;
        IUserRegistry ethRegistry;
        IMintableERC20 paymentToken;
        address userRegistry;
        bytes32 commitment;
    }

    function commit() external {
        Ctx memory c = _load();
        require(c.registrar.isAvailable(c.label), string.concat("RegisterParent: label taken, pick another: ", c.label));

        uint64 at = c.registrar.commitmentAt(c.commitment);
        if (at != 0 && at + c.registrar.MAX_COMMITMENT_AGE() > block.timestamp) {
            console2.log("commitment already live since", at, "- skipping commit");
        } else {
            vm.broadcast(c.pk);
            c.registrar.commit(c.commitment);
        }
        console2.log("label        ", c.label);
        console2.log("userRegistry ", c.userRegistry);
        console2.logBytes32(c.commitment);
        console2.log("wait >= 60s (MIN_COMMITMENT_AGE) before register()");
    }

    function register() external {
        Ctx memory c = _load();
        require(c.registrar.isAvailable(c.label), string.concat("RegisterParent: label taken, pick another: ", c.label));

        uint64 at = c.registrar.commitmentAt(c.commitment);
        require(at != 0, "RegisterParent: no commitment for these inputs; run commit() first");
        require(
            block.timestamp >= at + c.registrar.MIN_COMMITMENT_AGE(), "RegisterParent: commitment too new; wait >= 60s"
        );
        require(
            block.timestamp < at + c.registrar.MAX_COMMITMENT_AGE(),
            "RegisterParent: commitment expired; commit() again"
        );

        (uint256 base, uint256 premium) = c.registrar.getRegisterPrice(c.label, DURATION, address(c.paymentToken));
        uint256 cost = base + premium;

        vm.startBroadcast(c.pk);
        c.paymentToken.mint(c.deployer, cost);
        c.paymentToken.approve(address(c.registrar), cost);
        c.registrar
            .register(
                c.label, c.deployer, c.secret, c.userRegistry, address(0), DURATION, address(c.paymentToken), bytes32(0)
            );
        vm.stopBroadcast();

        require(c.ethRegistry.getSubregistry(c.label) == c.userRegistry, "RegisterParent: subregistry != userRegistry");
        string memory parentName = string.concat(c.label, ".eth");
        vm.writeJson(parentName, c.path, ".parentName");
        console2.log("registered   ", parentName);
        console2.log("paid (6 dp)  ", cost);
        console2.log("next: run verify() once the tx is mined");
    }

    /// @notice Read-only check against the live chain (AC-6); records a post-registration `.forkBlock`.
    function verify() external {
        Ctx memory c = _load();
        address sub = c.ethRegistry.getSubregistry(c.label);
        require(sub == c.userRegistry, "RegisterParent: subregistry != userRegistry");
        require(!c.registrar.isAvailable(c.label), "RegisterParent: parent not registered");

        vm.writeJson(string.concat(c.label, ".eth"), c.path, ".parentName");
        vm.writeJson(vm.toString(block.number), c.path, ".forkBlock");
        console2.log("AC-6 OK: getSubregistry(label) == userRegistry", sub);
        console2.log("forkBlock    ", block.number);
    }

    function _load() internal view returns (Ctx memory c) {
        c.pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        c.deployer = vm.addr(c.pk);
        c.label = vm.envString("PARENT_LABEL");
        c.secret = vm.envBytes32("PARENT_SECRET");
        require(bytes(c.label).length > 0, "RegisterParent: PARENT_LABEL empty");
        require(c.secret != bytes32(0), "RegisterParent: PARENT_SECRET empty");

        c.path = _deploymentsPath();
        string memory json = vm.readFile(c.path);
        c.registrar = IETHRegistrar(vm.parseJsonAddress(json, ".ethRegistrar"));
        c.ethRegistry = IUserRegistry(vm.parseJsonAddress(json, ".ethRegistry"));
        c.paymentToken = IMintableERC20(vm.parseJsonAddress(json, ".ensMockUsdc"));
        c.userRegistry = vm.parseJsonAddress(json, ".userRegistry");
        require(c.userRegistry.code.length > 0, "RegisterParent: .userRegistry not deployed; run DeployUserRegistry");

        c.commitment =
            c.registrar.makeCommitment(c.label, c.deployer, c.secret, c.userRegistry, address(0), DURATION, bytes32(0));
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
