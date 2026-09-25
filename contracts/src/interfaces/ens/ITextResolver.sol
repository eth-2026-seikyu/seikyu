// SPDX-License-Identifier: MIT
// Generated from ensdomains/contracts-v2 tag sepolia-deployment-2026-09-15 (f2f0a05e) deployments/sepolia/PermissionedResolverImpl.json
pragma solidity ^0.8.26;

/// @dev Encoding-only interface for `resolve(name, data)` payloads. PermissionedResolver ignores `node` and uses `namehash(name)`.
interface ITextResolver {
    function text(bytes32 node, string calldata key) external view returns (string memory);
    function multicall(bytes[] calldata calls) external returns (bytes[] memory results);
}
