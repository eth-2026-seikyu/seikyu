// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {InvoiceMarket} from "../src/InvoiceMarket.sol";
import {InvoiceRegistrar} from "../src/InvoiceRegistrar.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {IInvoiceRegistrar} from "../src/interfaces/IInvoiceRegistrar.sol";
import {RegistryRoles, State, Status} from "../src/interfaces/ens/EnsV2Types.sol";
import {IPermissionedResolver} from "../src/interfaces/ens/IPermissionedResolver.sol";

import {ForkBase} from "./fork/ForkBase.sol";

/// @notice InvoiceMarket + InvoiceRegistrar + MockUSDC end to end against the live ENSv2 Sepolia deployment.
/// @dev Run with `--fork-url <sepolia> --fork-block-number 11781431`.
contract IntegrationForkTest is ForkBase {
    uint128 internal constant FACE_VALUE = 1_000e6;
    uint128 internal constant PRICE = 950e6;
    uint256 internal constant USDC_GRANT = 100_000e6;

    address internal registrarAdmin = makeAddr("registrarAdmin");
    address internal sme = makeAddr("sme");
    address internal debtor = makeAddr("debtor");
    address internal debtorAP = makeAddr("debtorAP");
    address internal investorA = makeAddr("investorA");
    address internal operator = makeAddr("operator");

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

    function test_e2e_issueVerifyBuySettle_unregistersName() public {
        uint256 id = _create();
        uint256 labelId = labelhash(registrar.labelOf(id));

        assertEq(market.ownerOf(id), address(market), "escrowed");
        assertTrue(registrar.isLive(id), "live");
        State memory st = registry.getState(labelId);
        assertEq(uint8(st.status), uint8(Status.REGISTERED), "registered");
        assertEq(st.expiry, dueDate, "expiry == dueDate");
        assertEq(registry.ownerOf(st.tokenId), sme, "name owner");
        assertEq(registry.getResolver(registrar.labelOf(id)), registrar.resolverOf(id), "registry resolver");
        assertEq(registrar.nameOf(id), "inv-1.seikyu.eth");

        string[8] memory records = registrar.recordsOf(id);
        assertEq(records[0], "1000000000", "amount");
        assertEq(records[1], "mUSDC", "currency");
        assertEq(records[2], Strings.toHexString(debtor), "debtor");
        assertEq(records[3], Strings.toString(dueDate), "dueDate");
        assertEq(records[4], "listed", "status");
        assertEq(records[5], "", "ack");
        assertEq(records[6], "1", "tokenId");
        assertEq(records[7], Strings.toHexString(sme), "issuer");

        uint256 smeBefore = usdc.balanceOf(sme);
        vm.prank(investorA);
        market.buy(id);
        assertEq(usdc.balanceOf(sme), smeBefore + PRICE, "issuer paid");
        assertEq(market.ownerOf(id), investorA, "investor holds");
        assertEq(uint8(_state(id)), uint8(InvoiceMarket.State.Funded), "Funded");
        assertEq(registrar.statusOf(id), "funded");

        uint256 investorBefore = usdc.balanceOf(investorA);
        vm.expectEmit(address(registrar));
        emit IInvoiceRegistrar.InvoiceNameClosed(id, "paid", true);
        vm.prank(debtor);
        market.settle(id);

        assertEq(usdc.balanceOf(investorA), investorBefore + FACE_VALUE, "investor repaid");
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, id));
        market.ownerOf(id);
        assertEq(uint8(_state(id)), uint8(InvoiceMarket.State.Paid), "Paid");
        assertEq(registrar.statusOf(id), "paid");
        assertFalse(registrar.isLive(id), "not live");
        assertEq(uint8(registry.getState(labelId).status), uint8(Status.AVAILABLE), "unregistered");
    }

    function test_settle_afterExpiry_writesPaidViaStoredResolver() public {
        uint256 id = _create();
        vm.prank(investorA);
        market.buy(id);

        vm.warp(uint256(dueDate) + 1);
        assertFalse(registrar.isLive(id), "expired");
        assertEq(registry.getResolver(registrar.labelOf(id)), address(0), "registry drops resolver");

        uint256 investorBefore = usdc.balanceOf(investorA);
        vm.expectEmit(address(registrar));
        emit IInvoiceRegistrar.InvoiceNameClosed(id, "paid", false);
        vm.prank(debtor);
        market.settle(id);

        assertEq(usdc.balanceOf(investorA), investorBefore + FACE_VALUE, "investor repaid");
        assertEq(uint8(_state(id)), uint8(InvoiceMarket.State.Paid), "Paid");
        assertEq(registrar.statusOf(id), "paid");
        assertEq(registrar.recordsOf(id)[4], "paid", "recordsOf status");
    }

    function test_cancel_afterDueDate_succeeds() public {
        uint256 id = _create();
        vm.warp(uint256(dueDate) + 1);

        vm.expectEmit(address(registrar));
        emit IInvoiceRegistrar.InvoiceNameClosed(id, "cancelled", false);
        vm.prank(sme);
        market.cancel(id);

        assertEq(uint8(_state(id)), uint8(InvoiceMarket.State.Cancelled), "Cancelled");
        assertEq(registrar.statusOf(id), "cancelled");
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, id));
        market.ownerOf(id);
    }

    function test_e2e_buy_blockedWhenAccountantDisputes() public {
        uint256 id = _create();
        IPermissionedResolver resolver = IPermissionedResolver(registrar.resolverOf(id));
        bytes memory dnsName = registrar.dnsNameOf(id);

        vm.prank(debtorAP);
        resolver.setText(dnsName, "ack", "disputed");
        assertEq(registrar.ackOf(id), "disputed");

        vm.expectRevert(abi.encodeWithSelector(InvoiceMarket.PurchaseBlockedByAck.selector, "disputed"));
        vm.prank(investorA);
        market.buy(id);

        vm.prank(debtorAP);
        resolver.setText(dnsName, "ack", "acknowledged");

        vm.prank(investorA);
        market.buy(id);
        assertEq(market.ownerOf(id), investorA, "investor holds");
        assertEq(registrar.statusOf(id), "funded");
        assertEq(registrar.recordsOf(id)[5], "acknowledged", "recordsOf ack");
    }

    function _create() internal returns (uint256 id) {
        vm.prank(sme);
        id = market.createInvoice(debtor, debtorAP, FACE_VALUE, PRICE, dueDate);
    }

    function _state(uint256 id) internal view returns (InvoiceMarket.State state) {
        (,,,,, state) = market.invoices(id);
    }
}
