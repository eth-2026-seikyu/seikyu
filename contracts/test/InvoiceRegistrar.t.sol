// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IInvoiceRegistrar} from "../src/interfaces/IInvoiceRegistrar.sol";
import {RegistryRoles, ResolverRoles, State, Status} from "../src/interfaces/ens/EnsV2Types.sol";
import {IPermissionedResolver} from "../src/interfaces/ens/IPermissionedResolver.sol";
import {IUserRegistry} from "../src/interfaces/ens/IUserRegistry.sol";
import {InvoiceRegistrar} from "../src/InvoiceRegistrar.sol";

import {ForkBase} from "./fork/ForkBase.sol";

/// @notice InvoiceRegistrar against the live ENSv2 Sepolia deployment (tag sepolia-deployment-2026-09-15).
/// @dev Run with `--fork-url <sepolia> --fork-block-number 11781431`.
contract InvoiceRegistrarTest is ForkBase {
    uint256 internal constant ID = 1;

    address internal admin = makeAddr("admin");
    address internal market = makeAddr("market");
    address internal issuer = makeAddr("issuer");
    address internal accountant = makeAddr("accountant");
    address internal debtor = makeAddr("debtor");
    address internal other = makeAddr("other");

    InvoiceRegistrar internal registrar;
    uint64 internal dueDate;

    /// @dev `IPermissionedRegistry` error at the tag; not part of the vendored IUserRegistry subset.
    error TransferUnsafeUntilRegistryIsEmancipated();

    function setUp() public override {
        super.setUp();
        registrar = new InvoiceRegistrar(registry, FACTORY, PERMISSIONED_RESOLVER_IMPL, "seikyu", admin);
        vm.prank(testDeployer);
        registry.grantRootRoles(RegistryRoles.REGISTRAR_ROOT, address(registrar));
        vm.prank(admin);
        registrar.setMarket(market);
        dueDate = uint64(block.timestamp + 30 days);
        vm.label(address(registrar), "InvoiceRegistrar");
    }

    function test_registerInvoice_expiryEqualsDueDate() public {
        _register(ID, dueDate);

        State memory st = registry.getState(_labelId(ID));
        assertEq(st.expiry, dueDate, "expiry == dueDate");
        assertEq(uint8(st.status), uint8(Status.REGISTERED), "status");
        assertEq(registry.ownerOf(st.tokenId), issuer, "owner");
        assertEq(registry.getResolver(registrar.labelOf(ID)), registrar.resolverOf(ID), "registry resolver");
        assertTrue(registrar.isLive(ID), "live");
    }

    function test_registerInvoice_setsRecords() public {
        _register(ID, dueDate);
        (, string[] memory values) = _records();

        string[8] memory records = registrar.recordsOf(ID);
        string[8] memory expected =
            [values[0], values[1], values[2], values[3], values[4], "", values[5], values[6]];
        for (uint256 i; i < 8; ++i) {
            assertEq(records[i], expected[i]);
        }
        assertEq(registrar.statusOf(ID), "listed", "statusOf");
        assertEq(registrar.ackOf(ID), "", "ackOf");

        assertEq(registrar.labelOf(ID), "inv-1");
        assertEq(registrar.nameOf(ID), "inv-1.seikyu.eth");
        assertEq(registrar.dnsNameOf(ID), dnsEncode("inv-1.seikyu.eth"), "dnsNameOf");
        assertEq(registrar.nodeOf(ID), namehash(registrar.dnsNameOf(ID)), "nodeOf == namehash(dnsNameOf)");
    }

    function test_registerInvoice_onlyMarket_reverts() public {
        (string[] memory keys, string[] memory values) = _records();
        vm.expectRevert(InvoiceRegistrar.NotMarket.selector);
        vm.prank(issuer);
        registrar.registerInvoice(ID, issuer, accountant, dueDate, keys, values);

        _register(ID, dueDate);
        vm.expectRevert(InvoiceRegistrar.NotMarket.selector);
        vm.prank(issuer);
        registrar.setStatus(ID, "paid");
        vm.expectRevert(InvoiceRegistrar.NotMarket.selector);
        vm.prank(issuer);
        registrar.closeInvoice(ID, "paid");
    }

    function test_accountantCanSetAck() public {
        _register(ID, dueDate);
        IPermissionedResolver resolver = _resolver(ID);
        bytes memory dnsName = registrar.dnsNameOf(ID);

        vm.prank(accountant);
        resolver.setText(dnsName, "ack", "acknowledged");

        assertEq(registrar.ackOf(ID), "acknowledged");
        assertEq(registrar.recordsOf(ID)[5], "acknowledged", "recordsOf ack");
    }

    function test_accountantCannotSetAmount_reverts() public {
        _register(ID, dueDate);
        IPermissionedResolver resolver = _resolver(ID);
        bytes memory dnsName = registrar.dnsNameOf(ID);

        vm.expectRevert(_unauthorized("amount"));
        vm.prank(accountant);
        resolver.setText(dnsName, "amount", "1");
    }

    function test_accountantCannotSetStatus_reverts() public {
        _register(ID, dueDate);
        IPermissionedResolver resolver = _resolver(ID);
        bytes memory dnsName = registrar.dnsNameOf(ID);

        vm.expectRevert(_unauthorized("status"));
        vm.prank(accountant);
        resolver.setText(dnsName, "status", "paid");
        assertEq(registrar.statusOf(ID), "listed");
    }

    function test_nameExpiredAtDueDate() public {
        _register(ID, dueDate);
        vm.warp(dueDate);

        State memory st = registry.getState(_labelId(ID));
        assertFalse(registrar.isLive(ID), "isLive");
        assertEq(uint8(st.status), uint8(Status.AVAILABLE), "status");
        assertEq(registry.ownerOf(st.tokenId), address(0), "ownerOf");
    }

    function test_nameLiveOneSecondBeforeDueDate() public {
        _register(ID, dueDate);
        vm.warp(dueDate - 1);

        assertTrue(registrar.isLive(ID));
        State memory st = registry.getState(_labelId(ID));
        assertEq(registry.ownerOf(st.tokenId), issuer, "ownerOf");
    }

    /// @dev After expiry the registry no longer returns the resolver, but the stored one still reads and writes.
    function test_statusOf_afterExpiry() public {
        _register(ID, dueDate);
        vm.warp(uint256(dueDate) + 1 days);

        assertEq(registry.getResolver(registrar.labelOf(ID)), address(0), "registry drops resolver");
        assertEq(registrar.statusOf(ID), "listed");

        vm.prank(market);
        registrar.setStatus(ID, "paid");
        assertEq(registrar.statusOf(ID), "paid");
        assertEq(registrar.recordsOf(ID)[4], "paid", "recordsOf status");
    }

    function test_closeInvoice_unregistersLiveName() public {
        _register(ID, dueDate);

        vm.expectEmit(address(registrar));
        emit IInvoiceRegistrar.InvoiceNameClosed(ID, "paid", true);
        vm.prank(market);
        registrar.closeInvoice(ID, "paid");

        State memory st = registry.getState(_labelId(ID));
        assertEq(uint8(st.status), uint8(Status.AVAILABLE), "status");
        assertEq(registry.ownerOf(st.tokenId), address(0), "ownerOf");
        assertFalse(registrar.isLive(ID), "isLive");
        assertEq(registrar.statusOf(ID), "paid");
    }

    function test_closeInvoice_afterExpiry_skipsUnregister() public {
        _register(ID, dueDate);
        vm.warp(uint256(dueDate) + 1);

        vm.expectEmit(address(registrar));
        emit IInvoiceRegistrar.InvoiceNameClosed(ID, "cancelled", false);
        vm.prank(market);
        registrar.closeInvoice(ID, "cancelled");

        assertEq(registrar.statusOf(ID), "cancelled");
    }

    function test_issuerCannotSetResolver_reverts() public {
        _register(ID, dueDate);
        uint256 labelId = _labelId(ID);
        State memory st = registry.getState(labelId);

        vm.expectRevert(
            abi.encodeWithSelector(
                IUserRegistry.EACUnauthorizedAccountRoles.selector, st.resource, RegistryRoles.ROLE_SET_RESOLVER, issuer
            )
        );
        vm.prank(issuer);
        registry.setResolver(labelId, other);
    }

    /// @dev Two independent guards. While any root account holds `ROLE_UNREGISTER` (the registrar
    ///      always does), the registry is not emancipated and every safe transfer reverts first.
    ///      With the registry emancipated, the issuer's empty roleBitmap still blocks the transfer.
    function test_issuerCannotTransferName_reverts() public {
        _register(ID, dueDate);
        State memory st = registry.getState(_labelId(ID));

        vm.expectRevert(TransferUnsafeUntilRegistryIsEmancipated.selector);
        vm.prank(issuer);
        registry.safeTransferFrom(issuer, other, st.tokenId, 1, "");

        vm.startPrank(testDeployer);
        registry.revokeRootRoles(RegistryRoles.ROLE_UNREGISTER, address(registrar));
        registry.revokeRootRoles(RegistryRoles.ROLE_UNREGISTER, address(registrarStub));
        registry.revokeRootRoles(RegistryRoles.ROLE_UNREGISTER_ADMIN, testDeployer);
        vm.stopPrank();

        vm.expectRevert(abi.encodeWithSelector(IUserRegistry.TransferDisallowed.selector, st.tokenId, issuer));
        vm.prank(issuer);
        registry.safeTransferFrom(issuer, other, st.tokenId, 1, "");
    }

    function test_resolver_noUpgradeRoleGranted() public {
        _register(ID, dueDate);
        IPermissionedResolver resolver = _resolver(ID);

        assertFalse(resolver.hasRootRoles(ResolverRoles.ROLE_UPGRADE, address(registrar)), "registrar UPGRADE");
        assertFalse(resolver.hasRootRoles(ResolverRoles.ROLE_UPGRADE_ADMIN, address(registrar)), "registrar UPGRADE_ADMIN");
        assertTrue(resolver.hasRootRoles(ResolverRoles.ROLE_SET_TEXT, address(registrar)), "registrar SET_TEXT");
        assertTrue(resolver.hasRootRoles(ResolverRoles.ROLE_SET_TEXT_ADMIN, address(registrar)), "registrar SET_TEXT_ADMIN");
        assertFalse(resolver.hasRootRoles(ResolverRoles.ROLE_SET_TEXT, accountant), "accountant not root");
    }

    function _register(uint256 id, uint64 due) internal returns (address resolver) {
        (string[] memory keys, string[] memory values) = _records();
        vm.prank(market);
        resolver = registrar.registerInvoice(id, issuer, accountant, due, keys, values);
    }

    /// @dev The 7 records InvoiceMarket writes at creation (everything except `ack`).
    function _records() internal view returns (string[] memory keys, string[] memory values) {
        keys = new string[](7);
        keys[0] = "amount";
        keys[1] = "currency";
        keys[2] = "debtor";
        keys[3] = "dueDate";
        keys[4] = "status";
        keys[5] = "tokenId";
        keys[6] = "issuer";
        values = new string[](7);
        values[0] = "1000000000";
        values[1] = "mUSDC";
        values[2] = vm.toString(debtor);
        values[3] = vm.toString(uint256(dueDate));
        values[4] = "listed";
        values[5] = vm.toString(ID);
        values[6] = vm.toString(issuer);
    }

    function _resolver(uint256 id) internal view returns (IPermissionedResolver) {
        return IPermissionedResolver(registrar.resolverOf(id));
    }

    function _labelId(uint256 id) internal view returns (uint256) {
        return labelhash(registrar.labelOf(id));
    }

    function _unauthorized(string memory key) internal view returns (bytes memory) {
        return abi.encodeWithSelector(
            IPermissionedResolver.EACUnauthorizedAccountRoles.selector,
            ResolverRoles.textResource(key),
            ResolverRoles.ROLE_SET_TEXT,
            accountant
        );
    }
}
