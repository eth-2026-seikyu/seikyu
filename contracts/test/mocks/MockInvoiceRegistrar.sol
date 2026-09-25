// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IInvoiceRegistrar} from "../../src/interfaces/IInvoiceRegistrar.sol";

/// @notice Unit-test stand-in for the real ENSv2-backed InvoiceRegistrar.
/// Stores the same 8 records in plain storage instead of ENS text records,
/// so InvoiceMarket unit tests can drive `ack`/`live` directly without a
/// fork.
contract MockInvoiceRegistrar is IInvoiceRegistrar {
    address public market;

    mapping(uint256 => mapping(bytes32 => string)) private _values;
    mapping(uint256 => string) private _status;
    mapping(uint256 => string) private _ack;
    mapping(uint256 => bool) private _live;
    mapping(uint256 => address) private _resolver;

    error OnlyMarket();

    modifier onlyMarket() {
        if (msg.sender != market) revert OnlyMarket();
        _;
    }

    function setMarket(address market_) external {
        market = market_;
    }

    function registerInvoice(
        uint256 invoiceId,
        address, /* issuer */
        address, /* accountant */
        uint64 dueDate,
        string[] calldata keys,
        string[] calldata values
    ) external onlyMarket returns (address resolver) {
        for (uint256 i = 0; i < keys.length; i++) {
            _values[invoiceId][keccak256(bytes(keys[i]))] = values[i];
        }
        _status[invoiceId] = "listed";
        _ack[invoiceId] = "";
        _live[invoiceId] = true;

        resolver = address(uint160(uint256(keccak256(abi.encodePacked("resolver", invoiceId)))));
        _resolver[invoiceId] = resolver;

        emit InvoiceNameRegistered(invoiceId, labelOf(invoiceId), resolver, dueDate);
    }

    function setStatus(uint256 invoiceId, string calldata status) external onlyMarket {
        _status[invoiceId] = status;
        emit InvoiceStatusSet(invoiceId, status);
    }

    function closeInvoice(uint256 invoiceId, string calldata finalStatus) external onlyMarket {
        _status[invoiceId] = finalStatus;
        if (_live[invoiceId]) {
            _live[invoiceId] = false;
            emit InvoiceNameClosed(invoiceId, finalStatus, true);
        } else {
            emit InvoiceNameClosed(invoiceId, finalStatus, false);
        }
    }

    function isLive(uint256 invoiceId) external view returns (bool) {
        return _live[invoiceId];
    }

    function statusOf(uint256 invoiceId) external view returns (string memory) {
        return _status[invoiceId];
    }

    function ackOf(uint256 invoiceId) external view returns (string memory) {
        return _ack[invoiceId];
    }

    function recordsOf(uint256 invoiceId) external view returns (string[8] memory records) {
        records[0] = _values[invoiceId][keccak256("amount")];
        records[1] = _values[invoiceId][keccak256("currency")];
        records[2] = _values[invoiceId][keccak256("debtor")];
        records[3] = _values[invoiceId][keccak256("dueDate")];
        records[4] = _status[invoiceId];
        records[5] = _ack[invoiceId];
        records[6] = _values[invoiceId][keccak256("tokenId")];
        records[7] = _values[invoiceId][keccak256("issuer")];
    }

    function resolverOf(uint256 invoiceId) external view returns (address) {
        return _resolver[invoiceId];
    }

    function labelOf(uint256 invoiceId) public pure returns (string memory) {
        return string.concat("inv-", Strings.toString(invoiceId));
    }

    function nameOf(uint256 invoiceId) public pure returns (string memory) {
        return string.concat(labelOf(invoiceId), ".seikyu.eth");
    }

    function dnsNameOf(uint256 invoiceId) external pure returns (bytes memory) {
        return bytes(nameOf(invoiceId));
    }

    function nodeOf(uint256 invoiceId) external pure returns (bytes32) {
        return keccak256(bytes(nameOf(invoiceId)));
    }

    /// @dev Test helper: force the accountant's ack value for an invoice.
    function setAck(uint256 invoiceId, string calldata ack) external {
        _ack[invoiceId] = ack;
    }

    /// @dev Test helper: force the live flag for an invoice (e.g. to
    /// simulate expiry without waiting for `dueDate`).
    function setLive(uint256 invoiceId, bool live) external {
        _live[invoiceId] = live;
    }
}
