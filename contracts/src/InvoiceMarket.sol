// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IInvoiceRegistrar} from "./interfaces/IInvoiceRegistrar.sol";

/// @notice ERC-721 receivable market. Each invoice is minted to escrow
/// (this contract) at creation, sold once to a verified investor at a
/// discount, and settled at face value by whoever pays (usually the
/// debtor). The ENS name registered for the invoice (via `REGISTRAR`) is
/// the public record and purchase gate: `buy()` only succeeds while the
/// name is live and the debtor's accountant hasn't disputed it.
contract InvoiceMarket is ERC721("Seikyu Receivable", "SKR"), Ownable, Pausable {
    using SafeERC20 for IERC20;

    enum State {
        None,
        Listed,
        Funded,
        Paid,
        Cancelled
    }

    struct Invoice {
        address issuer;
        address debtor;
        uint128 faceValue;
        uint128 price;
        uint64 dueDate;
        State state;
    }

    bytes32 constant ACK_EMPTY = keccak256("");
    bytes32 constant ACK_OK = keccak256("acknowledged");

    IERC20 public immutable STABLE;
    IInvoiceRegistrar public immutable REGISTRAR;
    uint256 public immutable MAX_OPEN_POSITIONS;
    uint64 public constant MIN_TENOR = 60;

    address public operator;
    uint256 public invoiceCount;

    mapping(uint256 => Invoice) public invoices;
    mapping(address => bool) public isVerified;
    mapping(bytes32 => address) public nullifierOwner;

    event InvoiceCreated(
        uint256 indexed id,
        address indexed issuer,
        address indexed debtor,
        uint128 faceValue,
        uint128 price,
        uint64 dueDate,
        string name,
        address resolver
    );
    event InvestorVerified(address indexed investor, bytes32 indexed nullifier);
    event InvestorVerificationRevoked(address indexed investor, bytes32 indexed nullifier);
    event InvoiceFunded(uint256 indexed id, address indexed investor, uint128 price);
    event InvoiceSettled(uint256 indexed id, address indexed payer, address indexed holder, uint128 faceValue);
    event InvoiceCancelled(uint256 indexed id);

    error NotOperator();
    error NotIssuer();
    error NotVerifiedInvestor(address who);
    error NullifierAlreadyUsed(address boundTo);
    error PositionCapReached(address who);
    error InvalidState(State actual);
    error InvalidTerms();
    error DueDatePassed();
    error NameNotLive();
    error PurchaseBlockedByAck(string ack);

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(IERC20 stable, IInvoiceRegistrar registrar, uint256 maxOpenPositions, address operator_)
        Ownable(msg.sender)
    {
        STABLE = stable;
        REGISTRAR = registrar;
        MAX_OPEN_POSITIONS = maxOpenPositions;
        operator = operator_;
    }

    function createInvoice(address debtor, address accountant, uint128 faceValue, uint128 price, uint64 dueDate)
        external
        whenNotPaused
        returns (uint256 id)
    {
        if (
            price >= faceValue || price == 0 || dueDate < block.timestamp + MIN_TENOR || debtor == address(0)
                || accountant == address(0) || debtor == msg.sender || accountant == msg.sender
        ) {
            revert InvalidTerms();
        }

        id = ++invoiceCount;
        invoices[id] = Invoice({
            issuer: msg.sender,
            debtor: debtor,
            faceValue: faceValue,
            price: price,
            dueDate: dueDate,
            state: State.Listed
        });

        _mint(address(this), id);

        string[] memory keys = new string[](7);
        keys[0] = "amount";
        keys[1] = "currency";
        keys[2] = "debtor";
        keys[3] = "dueDate";
        keys[4] = "status";
        keys[5] = "tokenId";
        keys[6] = "issuer";

        string[] memory values = new string[](7);
        values[0] = Strings.toString(faceValue);
        values[1] = IERC20Metadata(address(STABLE)).symbol();
        values[2] = Strings.toHexString(debtor);
        values[3] = Strings.toString(dueDate);
        values[4] = "listed";
        values[5] = Strings.toString(id);
        values[6] = Strings.toHexString(msg.sender);

        address resolver = REGISTRAR.registerInvoice(id, msg.sender, accountant, dueDate, keys, values);

        emit InvoiceCreated(id, msg.sender, debtor, faceValue, price, dueDate, REGISTRAR.nameOf(id), resolver);
    }

    function setVerified(address investor, bytes32 nullifier) external whenNotPaused onlyOperator {
        if (investor == address(0) || investor == address(this)) revert InvalidTerms();

        address boundTo = nullifierOwner[nullifier];
        if (boundTo != address(0) && boundTo != investor) revert NullifierAlreadyUsed(boundTo);

        nullifierOwner[nullifier] = investor;
        isVerified[investor] = true;

        emit InvestorVerified(investor, nullifier);
    }

    function revokeVerification(address investor, bytes32 nullifier) external onlyOwner {
        isVerified[investor] = false;
        if (nullifierOwner[nullifier] == investor) delete nullifierOwner[nullifier];
        emit InvestorVerificationRevoked(investor, nullifier);
    }

    function setOperator(address newOperator) external onlyOwner {
        operator = newOperator;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function buy(uint256 id) external whenNotPaused {
        Invoice storage inv = invoices[id];
        if (inv.state != State.Listed) revert InvalidState(inv.state);
        if (!isVerified[msg.sender]) revert NotVerifiedInvestor(msg.sender);
        if (block.timestamp >= inv.dueDate) revert DueDatePassed();
        if (!REGISTRAR.isLive(id)) revert NameNotLive();

        string memory ack = REGISTRAR.ackOf(id);
        bytes32 h = keccak256(bytes(ack));
        if (h != ACK_EMPTY && h != ACK_OK) revert PurchaseBlockedByAck(ack);

        STABLE.safeTransferFrom(msg.sender, inv.issuer, inv.price);
        _transfer(address(this), msg.sender, id);
        inv.state = State.Funded;
        REGISTRAR.setStatus(id, "funded");

        emit InvoiceFunded(id, msg.sender, inv.price);
    }

    function settle(uint256 id) external {
        Invoice storage inv = invoices[id];
        if (inv.state != State.Funded) revert InvalidState(inv.state);

        address holder = ownerOf(id);
        STABLE.safeTransferFrom(msg.sender, holder, inv.faceValue);
        _burn(id);
        inv.state = State.Paid;
        REGISTRAR.closeInvoice(id, "paid");

        emit InvoiceSettled(id, msg.sender, holder, inv.faceValue);
    }

    function cancel(uint256 id) external {
        Invoice storage inv = invoices[id];
        if (msg.sender != inv.issuer) revert NotIssuer();
        if (inv.state != State.Listed) revert InvalidState(inv.state);

        _burn(id);
        inv.state = State.Cancelled;
        REGISTRAR.closeInvoice(id, "cancelled");

        emit InvoiceCancelled(id);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        bool isMint = _ownerOf(tokenId) == address(0);
        bool isBurn = to == address(0);
        if (!isMint && !isBurn) {
            if (!isVerified[to]) revert NotVerifiedInvestor(to);
            if (balanceOf(to) >= MAX_OPEN_POSITIONS) revert PositionCapReached(to);
        }
        return super._update(to, tokenId, auth);
    }
}
