// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console2} from "forge-std/console2.sol";

import {ETH_NODE, Grant, ResolverRoles, State, Status} from "../../src/interfaces/ens/EnsV2Types.sol";
import {IPermissionedResolver} from "../../src/interfaces/ens/IPermissionedResolver.sol";
import {ITextResolver} from "../../src/interfaces/ens/ITextResolver.sol";
import {IUserRegistry} from "../../src/interfaces/ens/IUserRegistry.sol";
import {IVerifiableFactory} from "../../src/interfaces/ens/IVerifiableFactory.sol";

import {ForkBase, RegistrarStub} from "./ForkBase.sol";

/// @notice GO/NO-GO for the per-invoice ENSv2 design against the live Sepolia deployment (tag sepolia-deployment-2026-09-15).
contract GoNoGoForkTest is ForkBase {
    uint256 internal constant GAS_BUDGET = 2_500_000;

    address internal issuer = makeAddr("issuer");
    address internal accountant = makeAddr("accountant");

    string internal constant LABEL = "inv-1";

    bytes internal dnsName;
    bytes32 internal node;
    IPermissionedResolver internal resolver;
    uint64 internal expiry;
    string[7] internal keys = ["amount", "currency", "debtor", "dueDate", "status", "tokenId", "issuer"];
    string[7] internal values;

    /// @dev Per-invoice resolver: our stub gets ROLE_SET_TEXT (+ admin, to delegate `ack`), 7 records are written,
    ///      `ack` is delegated to the accountant, then `inv-1` is registered with owner roleBitmap 0.
    function test_fork_perInvoiceResolver_initialize_setText_grantSetter() public {
        dnsName = dnsEncode("inv-1.seikyu.eth");
        node = namehash(dnsName);
        assertEq(namehash(dnsEncode("eth")), ETH_NODE, "namehash(eth)");
        assertEq(node, keccak256(abi.encodePacked(namehash(dnsEncode("seikyu.eth")), bytes32(labelhash(LABEL)))));
        values = [
            "1000000000",
            "USDC",
            vm.toString(makeAddr("debtor")),
            vm.toString(block.timestamp + 30 days),
            "listed",
            "1",
            vm.toString(issuer)
        ];
        expiry = uint64(block.timestamp + 100);

        uint256 totalGas = _deployResolver();
        totalGas += _writeRecordsAndRegister();
        console2.log("gas TOTAL per invoice:", totalGas);
        assertLt(totalGas, GAS_BUDGET, "per-invoice gas over budget");

        _assertRegistryAndRoles();
        _assertAckDelegation();
        _assertPathRRead();
    }

    function _deployResolver() internal returns (uint256 gasDeploy) {
        Grant[] memory grants = new Grant[](1);
        grants[0] = Grant({
            account: address(registrarStub),
            roleBitmap: ResolverRoles.ROLE_SET_TEXT | ResolverRoles.ROLE_SET_TEXT_ADMIN
        });
        bytes memory init = abi.encodeCall(IPermissionedResolver.initialize, (grants, new bytes[](0)));
        bytes memory ret;
        (ret, gasDeploy) = registrarStub.exec(
            address(FACTORY),
            abi.encodeCall(IVerifiableFactory.deployProxy, (PERMISSIONED_RESOLVER_IMPL, uint256(keccak256(abi.encode(1))), init))
        );
        resolver = IPermissionedResolver(abi.decode(ret, (address)));
        vm.label(address(resolver), "PermissionedResolver(inv-1)");
        console2.log("gas deployProxy+initialize:", gasDeploy);
    }

    function _writeRecordsAndRegister() internal returns (uint256 total) {
        RegistrarStub.Call[] memory calls = new RegistrarStub.Call[](9);
        for (uint256 i; i < 7; ++i) {
            calls[i] = RegistrarStub.Call(
                address(resolver), abi.encodeCall(IPermissionedResolver.setText, (dnsName, keys[i], values[i]))
            );
        }
        calls[7] = RegistrarStub.Call(
            address(resolver),
            abi.encodeCall(
                IPermissionedResolver.grantSetterRoles,
                (abi.encodeCall(IPermissionedResolver.setText, (bytes(""), "ack", "")), accountant)
            )
        );
        calls[8] = RegistrarStub.Call(
            address(registry),
            abi.encodeCall(IUserRegistry.register, (LABEL, issuer, address(0), address(resolver), 0, expiry))
        );
        (, uint256[] memory gasUsed) = registrarStub.execBatch(calls);

        uint256 gasSetText;
        for (uint256 i; i < 7; ++i) {
            gasSetText += gasUsed[i];
        }
        console2.log("gas 7x setText:", gasSetText);
        console2.log("gas grantSetterRoles(ack):", gasUsed[7]);
        console2.log("gas register:", gasUsed[8]);
        total = gasSetText + gasUsed[7] + gasUsed[8];
    }

    function _assertRegistryAndRoles() internal view {
        State memory st = registry.getState(labelhash(LABEL));
        assertEq(uint8(st.status), uint8(Status.REGISTERED), "status");
        assertEq(st.expiry, expiry, "expiry");
        assertEq(registry.ownerOf(st.tokenId), issuer, "owner");
        assertEq(registry.getResolver(LABEL), address(resolver), "resolver");

        assertTrue(resolver.hasRootRoles(ResolverRoles.ROLE_SET_TEXT, address(registrarStub)), "stub root SET_TEXT");
        assertFalse(resolver.hasRootRoles(ResolverRoles.ROLE_SET_TEXT, accountant), "accountant must not be root");
        assertTrue(
            resolver.hasRoles(ResolverRoles.textResource("ack"), ResolverRoles.ROLE_SET_TEXT, accountant), "ack scope"
        );
    }

    function _assertAckDelegation() internal {
        vm.prank(accountant);
        resolver.setText(dnsName, "ack", "acknowledged");

        vm.expectRevert(
            abi.encodeWithSelector(
                IPermissionedResolver.EACUnauthorizedAccountRoles.selector,
                ResolverRoles.textResource("amount"),
                ResolverRoles.ROLE_SET_TEXT,
                accountant
            )
        );
        vm.prank(accountant);
        resolver.setText(dnsName, "amount", "1");
    }

    /// @dev Path R: one `resolve(name, multicall(8x text(node, key)))` read.
    function _assertPathRRead() internal view {
        string[8] memory readKeys = ["amount", "currency", "debtor", "dueDate", "status", "ack", "tokenId", "issuer"];
        string[8] memory expected =
            [values[0], values[1], values[2], values[3], values[4], "acknowledged", values[5], values[6]];
        bytes[] memory reads = new bytes[](8);
        for (uint256 i; i < 8; ++i) {
            reads[i] = abi.encodeCall(ITextResolver.text, (node, readKeys[i]));
        }
        bytes[] memory results =
            abi.decode(resolver.resolve(dnsName, abi.encodeCall(ITextResolver.multicall, (reads))), (bytes[]));
        assertEq(results.length, 8, "multicall length");
        for (uint256 i; i < 8; ++i) {
            assertEq(abi.decode(results[i], (string)), expected[i], readKeys[i]);
        }
    }

    /// @dev Expired names read as AVAILABLE, cannot be unregistered, and are revived by a root ROLE_RENEW holder.
    function test_fork_userRegistry_registerExpireRevive() public {
        string memory label = "foo";
        uint256 id = labelhash(label);
        address owner = makeAddr("fooOwner");
        uint256 t0 = vm.getBlockTimestamp();

        registrarStub.exec(
            address(registry), abi.encodeCall(IUserRegistry.register, (label, owner, address(0), address(0), 0, uint64(t0 + 100)))
        );
        State memory st = registry.getState(id);
        assertEq(uint8(st.status), uint8(Status.REGISTERED), "registered");
        assertEq(registry.ownerOf(st.tokenId), owner, "owner");

        vm.warp(t0 + 100);
        st = registry.getState(id);
        assertEq(uint8(st.status), uint8(Status.AVAILABLE), "expired => AVAILABLE");
        assertEq(registry.ownerOf(st.tokenId), address(0), "expired => ownerOf 0");
        assertEq(st.latestOwner, owner, "latestOwner kept");

        vm.expectRevert(abi.encodeWithSelector(IUserRegistry.LabelExpired.selector, st.tokenId));
        registrarStub.exec(address(registry), abi.encodeCall(IUserRegistry.unregister, (id)));

        uint64 newExpiry = uint64(t0 + 1000);
        registrarStub.exec(address(registry), abi.encodeCall(IUserRegistry.renew, (id, newExpiry)));
        st = registry.getState(id);
        assertEq(uint8(st.status), uint8(Status.REGISTERED), "revived");
        assertEq(st.expiry, newExpiry, "new expiry");
        assertEq(registry.ownerOf(st.tokenId), owner, "same owner after revive");
    }
}
