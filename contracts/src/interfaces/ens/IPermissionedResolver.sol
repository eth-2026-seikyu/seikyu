// SPDX-License-Identifier: MIT
// Generated from ensdomains/contracts-v2 tag sepolia-deployment-2026-09-15 (f2f0a05e) deployments/sepolia/PermissionedResolverImpl.json
pragma solidity ^0.8.26;

import {Grant} from "./EnsV2Types.sol";

/// @dev Subset of PermissionedResolver used by Seikyu. There is no `text()` getter: reads go through `resolve(name, data)`.
interface IPermissionedResolver {
    error EACUnauthorizedAccountRoles(uint256 resource, uint256 roleBitmap, address account);
    error EACCannotGrantRoles(uint256 resource, uint256 roleBitmap, address account);
    error EACMaxAssignees(uint256 resource, uint256 role);
    error DNSDecodingFailed(bytes dns);
    error UnsupportedResolverProfile(bytes4 selector);

    /// @dev Grants run on the root resource; `calls` are multicalled with role checks skipped while initializing.
    function initialize(Grant[] calldata grants, bytes[] calldata calls) external;

    /// @dev Stores under `namehash(name)`; requires ROLE_SET_TEXT on `keccak256(bytes(key))` or on root.
    function setText(bytes calldata name, string calldata key, string calldata value) external;

    /// @dev `setter` is an ABI-encoded setter call; only its selector and key argument are used (the name is ignored).
    function grantSetterRoles(bytes calldata setter, address account) external returns (bool);

    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory);
    function multicall(bytes[] calldata calls) external returns (bytes[] memory results);

    function hasRootRoles(uint256 roleBitmap, address account) external view returns (bool);
    function hasRoles(uint256 resource, uint256 roleBitmap, address account) external view returns (bool);
    function roles(uint256 resource, address account) external view returns (uint256);
    function revokeRoles(uint256 resource, uint256 roleBitmap, address account) external returns (bool);
    function getRecordId(bytes32 node) external view returns (uint256);
}
