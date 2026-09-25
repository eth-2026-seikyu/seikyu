// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {InvoiceMarket} from "../src/InvoiceMarket.sol";
import {IInvoiceRegistrarOverdue, InvoiceRegistrar} from "../src/InvoiceRegistrar.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {IInvoiceRegistrar} from "../src/interfaces/IInvoiceRegistrar.sol";
import {RegistryRoles, State, Status} from "../src/interfaces/ens/EnsV2Types.sol";

import {ForkBase} from "./fork/ForkBase.sol";

/// @notice `markOverdue`: a funded invoice past its due date revives its expired ENS name with `status = overdue`.
/// @dev Run with `--fork-url <sepolia> --fork-block-number 11781431`.
contract OverdueForkTest is ForkBase {
    uint128 internal constant FACE_VALUE = 1_000e6;
    uint128 internal constant PRICE = 950e6;
    uint256 internal constant USDC_GRANT = 100_000e6;

    address internal registrarAdmin = makeAddr("registrarAdmin");
    address internal sme = makeAddr("sme");
    address internal debtor = makeAddr("debtor");
    address internal debtorAP = makeAddr("debtorAP");
    address internal investorA = makeAddr("investorA");
    address internal operator = makeAddr("operator");
    address internal keeper = makeAddr("keeper");

    MockUSDC internal usdc;
    InvoiceRegistrar internal registrar;
    InvoiceMarket internal market;
    uint64 internal dueDate;

    function setUp() public override {
        super.setUp();
        usdc = new MockUSDC();
        registrar = new InvoiceRegistrar(registry, FACTORY, PERMISSIONED_RESOLVER_IMPL, "seikyu", registrarAdmin);
        market = new InvoiceMarket(IERC20(address(usdc)), registrar, 3, operator);
        vm.prank(testDeployer);
        registry.grantRootRoles(RegistryRoles.REGISTRAR_ROOT, address(registrar));
        vm.prank(registrarAdmin);
        registrar.setMarket(address(market));

        usdc.mint(investorA, USDC_GRANT);
        usdc.mint(debtor, USDC_GRANT);
        vm.prank(investorA);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(debtor);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(operator);
        market.setVerified(investorA, keccak256("investorA-nullifier"));

        dueDate = uint64(block.timestamp + 7 days);

        vm.label(address(usdc), "MockUSDC");
        vm.label(address(registrar), "InvoiceRegistrar");
        vm.label(address(market), "InvoiceMarket");
    }

    function test_markOverdue_revivesNameWithOverdueStatus() public {
        uint256 id = _createAndBuy();
        uint256 labelId = labelhash(registrar.labelOf(id));

        uint256 warpTime = uint256(dueDate) + 1;
        vm.warp(warpTime);
        assertFalse(registrar.isLive(id), "expired");
        assertEq(uint8(registry.getState(labelId).status), uint8(Status.AVAILABLE), "expired => AVAILABLE");

        uint64 newExpiry = uint64(warpTime + 30 days);
        vm.expectEmit(address(registrar));
        emit IInvoiceRegistrarOverdue.InvoiceNameRevived(id, newExpiry);
        vm.expectEmit(address(registrar));
        emit IInvoiceRegistrar.InvoiceStatusSet(id, "overdue");
        vm.expectEmit(address(market));
        emit InvoiceMarket.InvoiceOverdue(id, newExpiry);
        vm.prank(keeper);
        market.markOverdue(id);

        assertTrue(registrar.isLive(id), "revived");
        State memory st = registry.getState(labelId);
        assertEq(uint8(st.status), uint8(Status.REGISTERED), "registered");
        assertEq(st.expiry, newExpiry, "expiry == warpTime + 30 days");
        assertEq(registry.ownerOf(st.tokenId), sme, "same owner");
        assertEq(registry.getResolver(registrar.labelOf(id)), registrar.resolverOf(id), "registry resolver back");
        assertEq(registrar.statusOf(id), "overdue");
        assertEq(registrar.recordsOf(id)[4], "overdue", "recordsOf status");
        assertEq(uint8(_state(id)), uint8(InvoiceMarket.State.Funded), "still Funded");

        uint256 investorBefore = usdc.balanceOf(investorA);
        vm.expectEmit(address(registrar));
        emit IInvoiceRegistrar.InvoiceNameClosed(id, "paid", true);
        vm.prank(debtor);
        market.settle(id);

        assertEq(usdc.balanceOf(investorA), investorBefore + FACE_VALUE, "investor repaid");
        assertEq(uint8(_state(id)), uint8(InvoiceMarket.State.Paid), "Paid");
        assertEq(registrar.statusOf(id), "paid");
        assertFalse(registrar.isLive(id), "not live");
        assertEq(uint8(registry.getState(labelId).status), uint8(Status.AVAILABLE), "unregistered");
    }

    function test_markOverdue_beforeDueDate_reverts() public {
        uint256 id = _createAndBuy();
        vm.warp(uint256(dueDate) - 1);

        vm.expectRevert(InvoiceMarket.NotYetDue.selector);
        vm.prank(keeper);
        market.markOverdue(id);
    }

    function test_markOverdue_notFunded_reverts() public {
        vm.prank(sme);
        uint256 id = market.createInvoice(debtor, debtorAP, FACE_VALUE, PRICE, dueDate);
        vm.warp(uint256(dueDate) + 1);

        vm.expectRevert(abi.encodeWithSelector(InvoiceMarket.InvalidState.selector, InvoiceMarket.State.Listed));
        vm.prank(keeper);
        market.markOverdue(id);
    }

    function test_markOverdue_whileLive_reverts() public {
        uint256 id = _createAndBuy();
        vm.warp(uint256(dueDate) + 1);
        vm.prank(keeper);
        market.markOverdue(id);

        vm.expectRevert(InvoiceMarket.NameStillLive.selector);
        vm.prank(keeper);
        market.markOverdue(id);
    }

    function _createAndBuy() internal returns (uint256 id) {
        vm.prank(sme);
        id = market.createInvoice(debtor, debtorAP, FACE_VALUE, PRICE, dueDate);
        vm.prank(investorA);
        market.buy(id);
    }

    function _state(uint256 id) internal view returns (InvoiceMarket.State state) {
        (,,,,, state) = market.invoices(id);
    }
}
