// SPDX-License-Identifier: MIT
// Generated from ensdomains/contracts-v2 tag sepolia-deployment-2026-09-15 (f2f0a05e) deployments/sepolia/UserRegistryImpl.json
pragma solidity ^0.8.26;

import {Grant, State, Status} from "./EnsV2Types.sol";

/// @dev Subset of UserRegistry (PermissionedRegistry + EnhancedAccessControl + ERC1155Singleton) used by Seikyu.
///      `anyId` accepts a labelhash, tokenId or resource. Expiry is absolute and a name is expired when `block.timestamp >= expiry`.
interface IUserRegistry {
    error CannotReduceExpiry(uint64 oldExpiry, uint64 newExpiry);
    error CannotSetPastExpiry(uint64 expiry);
    error EACCannotGrantRoles(uint256 resource, uint256 roleBitmap, address account);
    error EACCannotRevokeRoles(uint256 resource, uint256 roleBitmap, address account);
    error EACUnauthorizedAccountRoles(uint256 resource, uint256 roleBitmap, address account);
    error LabelAlreadyRegistered(string label);
    error LabelAlreadyReserved(string label);
    error LabelExpired(uint256 tokenId);
    error TransferDisallowed(uint256 tokenId, address from);

    function initialize(Grant[] calldata grants) external;

    function register(
        string calldata label,
        address owner,
        address registry,
        address resolver,
        uint256 roleBitmap,
        uint64 expiry
    ) external returns (uint256 tokenId);
    function renew(uint256 anyId, uint64 newExpiry) external;
    function unregister(uint256 anyId) external;
    function setResolver(uint256 anyId, address resolver) external;
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;

    function grantRootRoles(uint256 roleBitmap, address account) external returns (bool);
    function revokeRootRoles(uint256 roleBitmap, address account) external returns (bool);
    function hasRootRoles(uint256 roleBitmap, address account) external view returns (bool);
    function roles(uint256 anyId, address account) external view returns (uint256);

    function getState(uint256 anyId) external view returns (State memory);
    function getStatus(uint256 anyId) external view returns (Status);
    function getExpiry(uint256 anyId) external view returns (uint64);
    function getResolver(string calldata label) external view returns (address);
    function getSubregistry(string calldata label) external view returns (address);
    function getTokenId(uint256 anyId) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function latestOwnerOf(uint256 tokenId) external view returns (address);
}
