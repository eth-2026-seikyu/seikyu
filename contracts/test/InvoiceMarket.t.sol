// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {InvoiceMarket} from "../src/InvoiceMarket.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {IInvoiceRegistrar} from "../src/interfaces/IInvoiceRegistrar.sol";
import {MockInvoiceRegistrar} from "./mocks/MockInvoiceRegistrar.sol";

contract InvoiceMarketTest is Test {
    InvoiceMarket market;
    MockUSDC usdc;
    MockInvoiceRegistrar registrar;

    address operator = makeAddr("operator");
    address issuer = makeAddr("issuer");
    address debtor = makeAddr("debtor");
    address accountant = makeAddr("accountant");
    address investor = makeAddr("investor");
    address investor2 = makeAddr("investor2");
    address investor3 = makeAddr("investor3");
    address investor4 = makeAddr("investor4");
    address unverified = makeAddr("unverified");

    uint128 constant FACE_VALUE = 1_000e6;
    uint128 constant PRICE = 950e6;
    uint64 dueDate;

    function setUp() public {
        usdc = new MockUSDC();
        registrar = new MockInvoiceRegistrar();
        market = new InvoiceMarket(IERC20(address(usdc)), IInvoiceRegistrar(address(registrar)), 3, operator);
        registrar.setMarket(address(market));

        dueDate = uint64(block.timestamp + 10 minutes);

        usdc.mint(investor, 1_000_000e6);
        usdc.mint(investor2, 1_000_000e6);
        usdc.mint(investor3, 1_000_000e6);
        usdc.mint(investor4, 1_000_000e6);
        usdc.mint(debtor, 1_000_000e6);

        vm.prank(investor);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(investor2);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(investor3);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(investor4);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(debtor);
        usdc.approve(address(market), type(uint256).max);
    }

    function _createInvoice() internal returns (uint256 id) {
        vm.prank(issuer);
        id = market.createInvoice(debtor, accountant, FACE_VALUE, PRICE, dueDate);
    }

    function _verify(address who, bytes32 nullifier) internal {
        vm.prank(operator);
        market.setVerified(who, nullifier);
    }

    function _fundedInvoice(address buyer) internal returns (uint256 id) {
        id = _createInvoice();
        vm.prank(buyer);
        market.buy(id);
    }

    // 1
    function test_createInvoice_mintsToEscrow_andRegistersName() public {
        uint256 id = _createInvoice();

        assertEq(market.ownerOf(id), address(market));

        (address invIssuer, address invDebtor, uint128 faceValue, uint128 price, uint64 due, InvoiceMarket.State state)
        = market.invoices(id);
        assertEq(invIssuer, issuer);
        assertEq(invDebtor, debtor);
        assertEq(faceValue, FACE_VALUE);
        assertEq(price, PRICE);
        assertEq(due, dueDate);
        assertEq(uint8(state), uint8(InvoiceMarket.State.Listed));

        assertEq(registrar.nameOf(id), "inv-1.seikyu.eth");
        assertEq(registrar.statusOf(id), "listed");
        assertTrue(registrar.isLive(id));

        string[8] memory records = registrar.recordsOf(id);
        assertEq(records[0], "1000000000");
        assertEq(records[2], Strings.toHexString(debtor));
        assertEq(records[4], "listed");
        assertEq(records[6], "1");
        assertEq(records[7], Strings.toHexString(issuer));
    }

    // 2
    function test_createInvoice_priceNotBelowFace_reverts() public {
        vm.prank(issuer);
        vm.expectRevert(InvoiceMarket.InvalidTerms.selector);
        market.createInvoice(debtor, accountant, FACE_VALUE, FACE_VALUE, dueDate);
    }

    // 3
    function test_createInvoice_dueDateTooSoon_reverts() public {
        vm.prank(issuer);
        vm.expectRevert(InvoiceMarket.InvalidTerms.selector);
        market.createInvoice(debtor, accountant, FACE_VALUE, PRICE, uint64(block.timestamp + 30));
    }

    // 4
    function test_createInvoice_accountantIsIssuer_reverts() public {
        vm.prank(issuer);
        vm.expectRevert(InvoiceMarket.InvalidTerms.selector);
        market.createInvoice(debtor, issuer, FACE_VALUE, PRICE, dueDate);
    }

    // 5
    function test_setVerified_onlyOperator_reverts() public {
        vm.prank(issuer);
        vm.expectRevert(InvoiceMarket.NotOperator.selector);
        market.setVerified(investor, keccak256("n1"));
    }

    // 6
    function test_setVerified_nullifierBoundToOtherWallet_reverts() public {
        bytes32 nullifier = keccak256("n1");
        _verify(investor, nullifier);

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(InvoiceMarket.NullifierAlreadyUsed.selector, investor));
        market.setVerified(investor2, nullifier);
    }

    // 7
    function test_buy_unverified_reverts() public {
        uint256 id = _createInvoice();

        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(InvoiceMarket.NotVerifiedInvestor.selector, investor));
        market.buy(id);
    }

    // 8
    function test_buy_happyPath_paysIssuer_transfersToken_setsFunded() public {
        uint256 id = _createInvoice();
        _verify(investor, keccak256("n1"));

        uint256 issuerBalanceBefore = usdc.balanceOf(issuer);

        vm.expectEmit(true, true, false, true, address(market));
        emit InvoiceMarket.InvoiceFunded(id, investor, PRICE);

        vm.prank(investor);
        market.buy(id);

        assertEq(usdc.balanceOf(issuer), issuerBalanceBefore + PRICE);
        assertEq(market.ownerOf(id), investor);
        (,,,,, InvoiceMarket.State state) = market.invoices(id);
        assertEq(uint8(state), uint8(InvoiceMarket.State.Funded));
        assertEq(registrar.statusOf(id), "funded");
    }

    // 9
    function test_buy_afterDueDate_reverts() public {
        uint256 id = _createInvoice();
        _verify(investor, keccak256("n1"));

        vm.warp(dueDate + 1);

        vm.prank(investor);
        vm.expectRevert(InvoiceMarket.DueDatePassed.selector);
        market.buy(id);
    }

    // 10
    function test_buy_nameNotLive_reverts() public {
        uint256 id = _createInvoice();
        _verify(investor, keccak256("n1"));
        registrar.setLive(id, false);

        vm.prank(investor);
        vm.expectRevert(InvoiceMarket.NameNotLive.selector);
        market.buy(id);
    }

    // 11
    function test_buy_ackDisputed_reverts() public {
        uint256 id = _createInvoice();
        _verify(investor, keccak256("n1"));
        registrar.setAck(id, "disputed");

        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(InvoiceMarket.PurchaseBlockedByAck.selector, "disputed"));
        market.buy(id);
    }

    // 12
    function test_buy_ackUnknownValue_reverts() public {
        uint256 id = _createInvoice();
        _verify(investor, keccak256("n1"));
        registrar.setAck(id, "garbage");

        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(InvoiceMarket.PurchaseBlockedByAck.selector, "garbage"));
        market.buy(id);
    }

    // 13
    function test_buy_ackAcknowledged_succeeds() public {
        uint256 id = _createInvoice();
        _verify(investor, keccak256("n1"));
        registrar.setAck(id, "acknowledged");

        vm.prank(investor);
        market.buy(id);

        assertEq(market.ownerOf(id), investor);
    }

    // 14
    function test_buy_positionCap_reverts() public {
        _verify(investor, keccak256("n1"));

        _fundedInvoice(investor);
        _fundedInvoice(investor);
        _fundedInvoice(investor);
        assertEq(market.balanceOf(investor), 3);

        uint256 id4 = _createInvoice();
        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(InvoiceMarket.PositionCapReached.selector, investor));
        market.buy(id4);
    }

    // 15
    function test_transferToUnverified_reverts() public {
        _verify(investor, keccak256("n1"));
        uint256 id = _fundedInvoice(investor);

        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(InvoiceMarket.NotVerifiedInvestor.selector, unverified));
        market.safeTransferFrom(investor, unverified, id);
    }

    // 16
    function test_transferToMarket_reverts() public {
        _verify(investor, keccak256("n1"));
        uint256 id = _fundedInvoice(investor);

        vm.prank(investor);
        vm.expectRevert(abi.encodeWithSelector(InvoiceMarket.NotVerifiedInvestor.selector, address(market)));
        market.safeTransferFrom(investor, address(market), id);
    }

    // 17
    function test_settle_paysHolderFaceValue_burns_closesName() public {
        _verify(investor, keccak256("n1"));
        uint256 id = _fundedInvoice(investor);

        uint256 investorBalanceBefore = usdc.balanceOf(investor);

        vm.expectEmit(true, false, false, true, address(registrar));
        emit IInvoiceRegistrar.InvoiceNameClosed(id, "paid", true);

        vm.prank(debtor);
        market.settle(id);

        assertEq(usdc.balanceOf(investor), investorBalanceBefore + FACE_VALUE);
        vm.expectRevert();
        market.ownerOf(id);
        (,,,,, InvoiceMarket.State state) = market.invoices(id);
        assertEq(uint8(state), uint8(InvoiceMarket.State.Paid));
        assertEq(registrar.statusOf(id), "paid");
    }

    // 18
    function test_settle_notFunded_reverts() public {
        uint256 id = _createInvoice();

        vm.expectRevert(abi.encodeWithSelector(InvoiceMarket.InvalidState.selector, InvoiceMarket.State.Listed));
        market.settle(id);
    }

    // 19
    function test_cancel_onlyIssuer_closesName() public {
        uint256 id = _createInvoice();

        vm.prank(debtor);
        vm.expectRevert(InvoiceMarket.NotIssuer.selector);
        market.cancel(id);

        vm.expectEmit(true, false, false, true, address(registrar));
        emit IInvoiceRegistrar.InvoiceNameClosed(id, "cancelled", true);

        vm.prank(issuer);
        market.cancel(id);

        (,,,,, InvoiceMarket.State state) = market.invoices(id);
        assertEq(uint8(state), uint8(InvoiceMarket.State.Cancelled));
        assertEq(registrar.statusOf(id), "cancelled");
    }

    // 20
    function test_setOperator_onlyOwner() public {
        address newOperator = makeAddr("newOperator");

        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, issuer));
        market.setOperator(newOperator);

        market.setOperator(newOperator);
        assertEq(market.operator(), newOperator);
    }

    // 21
    function test_pause_blocksBuyButNotSettle() public {
        _verify(investor, keccak256("n1"));
        uint256 fundedId = _fundedInvoice(investor);
        uint256 listedId = _createInvoice();

        market.pause();

        vm.prank(investor);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        market.buy(listedId);

        vm.prank(debtor);
        market.settle(fundedId);

        (,,,,, InvoiceMarket.State state) = market.invoices(fundedId);
        assertEq(uint8(state), uint8(InvoiceMarket.State.Paid));
    }

    // 22
    function test_revokeVerification_onlyOwner_clearsBinding() public {
        bytes32 nullifier = keccak256("n1");
        _verify(investor, nullifier);

        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, issuer));
        market.revokeVerification(investor, nullifier);

        market.revokeVerification(investor, nullifier);

        assertFalse(market.isVerified(investor));
        assertEq(market.nullifierOwner(nullifier), address(0));
    }
}
