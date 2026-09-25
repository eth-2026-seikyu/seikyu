// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
interface IInvoiceRegistrar {
    event InvoiceNameRegistered(uint256 indexed invoiceId, string label, address resolver, uint64 expiry);
    event InvoiceStatusSet(uint256 indexed invoiceId, string status);
    event InvoiceNameClosed(uint256 indexed invoiceId, string finalStatus, bool unregistered);
    function registerInvoice(uint256 invoiceId, address issuer, address accountant, uint64 dueDate,
                             string[] calldata keys, string[] calldata values) external returns (address resolver); // onlyMarket
    function setStatus(uint256 invoiceId, string calldata status) external;           // onlyMarket
    function closeInvoice(uint256 invoiceId, string calldata finalStatus) external;   // onlyMarket: setStatus then unregister only if isLive
    function isLive(uint256 invoiceId) external view returns (bool);                  // getState(labelhash): REGISTERED && now < expiry
    function statusOf(uint256 invoiceId) external view returns (string memory);       // path R (stored resolver, resolve())
    function ackOf(uint256 invoiceId) external view returns (string memory);          // path R
    function recordsOf(uint256 invoiceId) external view returns (string[8] memory);   // path R, one multicall: amount,currency,debtor,dueDate,status,ack,tokenId,issuer
    function resolverOf(uint256 invoiceId) external view returns (address);
    function labelOf(uint256 invoiceId) external pure returns (string memory);        // "inv-<id>"
    function nameOf(uint256 invoiceId) external view returns (string memory);         // "inv-<id>.<parent>.eth"
    function dnsNameOf(uint256 invoiceId) external view returns (bytes memory);
    function nodeOf(uint256 invoiceId) external view returns (bytes32);
}
