// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal stand-in for the real InvoiceMarket's World ID
/// verification surface. Used only to exercise POST /api/world/verify
/// against a local anvil node (AC-10). C2 will swap this for the generated
/// ABI once the real InvoiceMarket contract exists.
contract MockInvoiceMarket {
    mapping(address => bool) public isVerified;
    mapping(bytes32 => address) public nullifierOwner;
    address public operator;

    error NullifierAlreadyUsed(address boundTo);
    error NotOperator();

    event InvestorVerified(address indexed investor, bytes32 indexed nullifier);

    constructor(address op) {
        operator = op;
    }

    function setVerified(address investor, bytes32 n) external {
        if (msg.sender != operator) revert NotOperator();

        address boundTo = nullifierOwner[n];
        if (boundTo != address(0) && boundTo != investor) {
            revert NullifierAlreadyUsed(boundTo);
        }

        isVerified[investor] = true;
        nullifierOwner[n] = investor;

        emit InvestorVerified(investor, n);
    }
}
